# Stripe Course Products, Lesson Credits, and Scheduling Checklist

Date: September 21, 2026

Status: Core implementation is committed and the production database migration is applied. Stripe product configuration and hosted purchase acceptance remain pending. See [production Billing recovery](../operations/course-credits-production-migration-20260921.md). See [local implementation and acceptance](../operations/course-credits-local-acceptance-20260921.md).

## Outcome

An administrator enters one negotiated total for the whole payment request, selects the included courses and their respective lesson counts, and creates a payment request for an existing student account. Once payment is verified, the administrator can allocate those lessons to dates. The student sees the purchased, scheduled, completed, and available lessons for each course.

Different customers can pay different negotiated totals for the same or different combinations of lessons. There are no fixed prices in this design, no required per-course amounts, and no calculation of lesson count from money paid.

## Agreed design

- Manage four course products in Stripe: Group Class (60 minutes), Duet Class (60 minutes), Solo Class (30 minutes), and Solo Class (60 minutes).
- Store the Stripe Product ID on each local bill item. Do not require or persist a Stripe Price ID for the application workflow.
- Use the existing `app_payments`, `app_payment_items`, and `app_schedule_entries` tables. Do not introduce a course-product or course-package table for this release.
- Save the agreed total once on the parent payment. Its course items specify the included products and lesson counts without per-course amounts. Do not divide, prorate, or allocate the total across courses.
- Keep the existing account ownership model, full-payment collection, USD amounts, stable website bill links, and provider verification.
- Keep non-course charges and historical bills readable and payable through their existing paths. Do not reinterpret ordinary quantities or camp days as lesson credits.

Stripe supports inline prices, so the application need not maintain a Price ID. A single-course request can reference that course's Product ID directly. A mixed-course request uses one descriptive package charge for the whole total, with its course entitlements retained locally; it does not invent priced Stripe lines for each included course. See [Stripe: Create an inline price](https://docs.stripe.com/products-prices/manage-prices#create-an-inline-price).

## Baseline inspected before implementation

| Area | Current behavior | Required change |
| --- | --- | --- |
| Course catalog | Payload `classes` manages website content; four booking options are defined in code | Add a small server-side mapping from the four course keys to environment-specific Stripe Product IDs and durations |
| Create payment request | Custom total, lesson package, and other itemized payment modes; course names are free text | Add one request-level total and repeatable course/count rows, with no price inputs on those rows |
| Fixed-total bill | Count and unit are embedded in the description; billing quantity is 1 | Persist a separate numeric lesson count and product reference |
| Bill storage | Parent amount is calculated from priced bill items | Add an explicit agreed-total billing mode; preserve itemized calculations for old/general bills |
| Copy payment link | Copies `/account/billing/[billId]`; does not create a Stripe Payment Link object | Retain the URL and owner login; update preview and customer wording |
| Checkout | Uses inline `price_data` with `product_data.name` from each item | One charge for the parent total; single-course Product ID or an honest mixed-course package description |
| Payment confirmation | Reconciles Stripe evidence into the existing bill | Make verified paid course items eligible for allocation, without a separate credit-grant insertion |
| Schedule | Stores dates, status, account, and optional parent `payment_id` | Link each credit-backed lesson to the precise bill item |
| Admin appointments | Filters for linked Cal.com rows only | Include Academy-created lessons and add scheduling actions |
| Student schedule | Reads future entries, capped at 50 | Preserve calendar behavior; calculate balances separately from all relevant schedule records |
| Refund | Financial status and notifications; no course-credit coordination | Freeze allocation during uncertainty and reconcile unused allocations on refund |

The inspected source is local code and migration definitions, not a fresh audit of the production database. The table above records the starting point. Local implementation status is recorded in the checklist and acceptance report; neither is proof of production deployment.

## Data design

### Parent payment: `app_payments`

- Add `pricing_mode`, with `itemized` as the compatibility default and `agreed_total` for new manually negotiated course packages.
- In `agreed_total` mode, `amount_cents` is the single administrator-entered total, validated and locked on issuance. Do not calculate it by summing course items.
- In `itemized` mode, retain existing quantity × unit amount calculations and reconciliation checks.
- Preserve account, currency, payment/refund state, environment, and transaction references. The credit model does not depend on the old nullable `lesson_count` field.

### Included course items: `app_payment_items`

| Field | Treatment |
| --- | --- |
| `id`, `payment_id`, `position` | Reuse existing identity and parent relationship |
| `stripe_product_id` | New nullable text field; required for new course-credit items |
| `credit_count` | New nullable integer, 1–100; required together with the product reference |
| `lesson_duration_minutes` | New nullable duration snapshot, 30 or 60 for the initial four courses; derived by the server |
| `description` | Preserve a readable, immutable course/count/coverage snapshot |
| `quantity` | Use 1 as a compatibility value for each included course row; `credit_count` alone means lesson count |
| `unit_amount_cents` | Allow null for included course rows under an agreed-total bill; null means no separate price, not a free course. Retain existing numeric values on itemized bills |

Keep new course fields null on legacy and general items. Enforce all-or-none course fields, valid integer ranges, and server-validated product selection. Enforce the parent-mode/item-shape relationship through the database issuance/mutation path: agreed-total rows are unpriced course entitlements, and itemized rows retain their financial values. Do not copy the parent total onto every course, allocate it to the first course, or store other courses as zero-price giveaways. A reviewed historical annotation must preserve original financial quantities and amounts.

Capture account/mode consistently for product-backed bills, including unpaid and manually settled bills. An environment mismatch must not become a usable entitlement. Update every amount consumer to branch on billing mode instead of multiplying nullable course-item amounts. Historical bills continue using their original arithmetic.

Product identity and duration are fixed when issued. Keep descriptions and durations available locally so viewing old bills or scheduling paid lessons does not require a successful Stripe catalog request. Archiving a product can disable new sales without erasing an already paid student's entitlement.

### Schedule: `app_schedule_entries`

- Add nullable `payment_item_id` referencing `app_payment_items.id` with restricted deletion, plus an index supporting item/status balance queries.
- One linked row represents one lesson for one account. A three-lesson batch creates three rows.
- Keep existing `payment_id` consistent with the linked item's parent bill. The item's owner must equal `user_profile_id`; validate both in the database mutation path.
- Keep `entry_type` as the event category. Use `class` for group and duet, and `private_lesson` for solo; the bill item identifies the exact purchased product and duration.
- Use `source = academy` for locally arranged lessons. Leave existing Cal.com rows valid with no new item relationship.
- Add private audit data for schedule operations (actor, operation, timestamp, reason, prior/new times and status). Do not expose staff-only audit data through student reads.
- Use a client-generated request UUID and immutable request checks for retry-safe creation. Batch requests must be all-or-nothing, with stable per-row IDs and no duplicate lessons after retries.

### Credit calculation

For each eligible bill item:

```text
purchased = credit_count
reserved = count(schedule status in scheduled, changed)
completed = count(schedule status = completed)
available_to_schedule = purchased - reserved - completed
remaining_to_attend = purchased - completed
```

Cancelled rows do not reserve a credit. Preserve them for history. Past scheduled lessons continue to reserve credits until staff explicitly resolves them; elapsed time alone is not attendance.

Do not persist a separately editable remaining-balance field. Compute balances in a database query/function over all linked rows, including past lessons, and expose only the authenticated owner's results. A negative balance is a data-integrity error, not a value to hide by clamping to zero.

An item is allocatable only when its bill is verified paid, belongs to the selected account, has valid course fields, has available credits, and is not under unresolved refund/provider review. Exclude sandbox bills from real balances; sandbox allocation tests must be explicitly isolated. Historical paid items with null course fields display “Course credits not configured,” not zero purchased lessons.

## Intended interface

Admin flow: **Student → Billing → Create payment request → Course purchase**.

1. Show the selected student.
2. Enter **Total to collect (USD)** once for the whole request. This is a freely entered negotiated amount, not a product-price calculation.
3. Show all four courses with lesson counts defaulting to **0**. Require at least one positive whole-number count; omit zero-count courses from the bill. Do not show course selectors or add/remove buttons. Staff do not type Product IDs or per-course prices. Due date and replacement-bill selection are under the collapsed **More options** section.
4. Review the one total followed by the included courses and their individual counts. Do not show a price beside each course, a per-lesson rate, or an allocated subtotal.
5. Create the bill; retain Preview, Copy payment link, and Send payment email.
6. After verified payment, show “3 purchased · 0 scheduled · 0 completed · 3 available to schedule,” with **Schedule lessons**.

The customer reviews the same overall total and course/count breakdown on the bill page. Keep terms acknowledgement, teacher note, login return, pending payment handling, and existing email delivery behavior.

Academy billing emails show **Total: [the saved negotiated total]**, followed by each included course's name, duration, and purchased count. For example, the course list can read “Solo Class · 30 minutes — 3 lessons” and “Group Class · 60 minutes — 6 lessons,” without an amount beside either course. Do not hard-code amounts, show course subtotals, or derive a per-lesson rate. Payment-request emails show Unpaid; verified confirmations to the customer and Academy show Paid. Refund emails show the refund amount and status without the course/count breakdown. Apply this to both HTML and plain text. These requirements concern website billing notifications; Stripe or Cal.com receipts require separate verification.

The creation form has only **Course purchase** (default) and **Other fees**. Other fees require a fee name and one total, with an optional note; they do not request lesson/day counts or grant lesson credits. Itemized and legacy package entry forms are removed from this UI while historical records and server parsing remain compatible. Due date and replacement-bill selection are collapsed under **More options**.

Scheduling flow: select a paid course item, choose a date/start time in `America/New_York`, derive the end time from its stored duration, and enter a location. Support one lesson or a reviewed weekly batch with explicit skipped dates. Show purchased, already allocated, and remaining counts before saving.

Initial scheduling is per student. Shared-class rosters, teacher availability, capacity management, and whole-class rescheduling are a separate extension; do not claim the initial implementation checks teacher/room availability. Prevent overlapping active lessons for the same student and duplicate allocations. Display group/duet lessons per participant until a shared-session model is deliberately added.

## Payment and refund rules

- For an agreed-total bill, send exactly one Stripe charge line with quantity 1, USD, and the stored parent `amount_cents`. Do not generate separate monetary lines from its included courses or fetch default prices to override the negotiated total.
- For a single included course, use its stored `price_data.product`. For multiple courses, use inline `product_data` with a clear generic package name and a description of the included courses/counts, following the application's existing inline-product mechanism. This does not require a fifth manually maintained catalog product or a new local table. Course Product IDs remain on local entitlement rows; Stripe revenue for the mixed package is not attributed separately to those products. Never mislabel the whole bundle as one of its constituent courses.
- Preserve the existing Checkout branch for legacy/general items, including old quantities. Use immutable stored item fields, never client-supplied amounts or product references at payment time.
- Retain bill metadata, owner checks, verified provider state, open-session reuse, expiration checks, and the safeguard for old ambiguous requests.
- Course credits become available from the verified bill state; a repeated webhook therefore cannot grant the same credits twice. Website returns and receipt emails do not establish payment.
- Verified manual settlement uses the same eligibility rules. General historic Stripe imports do not automatically create course credits. A verified, configured Cal.com single-session payment is linked to its existing booking as one already allocated credit; it does not create an extra available lesson.
- A refund request/review blocks new allocation. A verified full refund cancels future Academy allocations linked to the affected items and makes unused credits unavailable; completed lessons remain history. Unresolved past lessons remain visibly flagged for staff review.
- Apply refund and allocation guards transactionally with consistent lock ordering: parent bill, item, then affected schedule rows. A simultaneous refund or second scheduling request cannot overspend credits.
- Partial refunds or disputed provider states require staff resolution; never infer refunded lesson counts from refunded dollars.
- Failed or reversed refunds follow verified provider evidence. Do not silently recreate previously cancelled appointments. Record the reconciliation and expose any remaining eligible credits deliberately.
- Replacement bills start unpaid and have distinct entitlements. They never inherit the old bill's consumed or reserved credits automatically.

The following are proposed operating defaults, not new Academy policy: ordinary Admin cancellation releases a reserved credit; completion requires an Admin action; no automatic credit expiry, late-cancellation charge, no-show deduction, or free makeup grant. Confirm the intended cancellation/no-show handling before enabling those behaviors. Do not change published terms as part of this technical feature.

## Implementation checklist

Checked items describe implemented local code, not production deployment. Unchecked items include external configuration, historical backfill, operational policy, and hosted acceptance. See the linked acceptance report for boundaries.

### A. Product configuration and compatibility

- [ ] Inspect the existing Stripe catalog in the intended account/mode; reuse matching products or create missing ones without duplicating the catalog.
- [ ] Configure the four course-key-to-product mappings separately for sandbox and live, including display name and duration; store no fixed Price ID requirement.
- [ ] Verify product ownership, mode, activity, and required API permissions using the actual configuration; do not change the live collection switch merely to configure products.
- [ ] Keep standard Cal.com appointment prices separate from negotiated website course-package totals. Do not silently alter Cal.com checkout or public advertised prices.
- [ ] Add readiness errors for missing or wrong-mode products before issuing a course-credit request. No fallback to an unrelated product or a guessed ID.

### B. Database and server contracts

- [x] Add a forward migration for parent pricing mode, nullable unpriced course-item amounts, product/count/duration fields, schedule item reference, indexes, validation, and private audit data. Do not edit already applied migrations.
- [x] Extend `BillItem`, bill selects, read functions, serialization, and test fixtures to include the local item ID and new fields.
- [x] Extend `readItems` and `manageBill` with the dedicated `app_issue_course_bill` RPC for the separate parent total and unpriced course rows; retain the original `app_issue_bill`/`app_manage_bill` itemized paths unchanged.
- [x] Include pricing mode, parent total, products, counts, durations, and environment in immutable retry comparisons. Reject a repeated request ID with any changed commercial details.
- [x] Add service-only schedule mutations for create/batch-create, reschedule, cancel, and complete, with staff authorization, ownership checks, locks, and retry protection.
- [x] Add an owner-scoped balance query using complete history, separate from paginated calendar reads; prevent RLS bypass or student mutations.
- [x] Enforce same-owner/same-parent relationships, product-derived duration, no over-allocation, and same-student time conflict checks inside the database transaction.
- [ ] Integrate allocation blocking and refund reconciliation into all authoritative state-change paths, including Dashboard refunds observed through synchronization and manual settlement/refund paths.

### C. Payment-request creation and customer presentation

- [x] Replace course pricing inputs with one overall total and repeatable course/count selectors, plus a review step in `billing-issue.tsx`. No per-course price or subtotal input in the agreed-total flow.
- [x] Support several included courses with independent quotas under the one negotiated total. Preserve general itemized/camp billing as a separate mode; do not mix priced fee rows into this initial unpriced-course mode.
- [x] Update preview, billing records, account bill page, Admin cards, refund review, and confirmation copy to show the overall total once and the included course names, durations, and counts without course amounts.
- [x] Update HTML and plain-text payment requests and customer/Academy payment confirmations to show the saved overall total plus included courses/counts. Refund-confirmation emails show only the refund amount, without course details; distinguish unpaid requests from verified purchases. Preserve existing outbox payloads and do not resend old notifications to adopt new wording.
- [x] Keep the existing stable bill URL, owner login, copy fallback, acknowledgement, teacher notes, email actions, and pending-payment states.
- [x] Keep issued commercial details immutable. Corrections use existing safe cancellation/replacement behavior, not in-place edits to a paid bill.

### D. Stripe Checkout and reconciliation

- [x] Branch Checkout by persisted pricing mode: one overall charge for agreed-total bills versus unchanged priced lines for historical/general itemized bills. Validate the appropriate total invariant for each mode.
- [x] Use the stored Product ID for a single-course package and a descriptive inline bundle product for a mixed-course package; retain course Product IDs locally without fabricating a revenue split or fixed Price IDs.
- [ ] Preserve readable included-course counts at Checkout without mutating shared Products; verify bundle descriptions/session-level summaries against supported API limits, with the immutable website bill as the complete course breakdown.
- [x] Preserve old open/ambiguous Checkout requests and their original payloads/idempotency keys. Never retry the same Stripe key with newly changed product parameters.
- [x] Keep old unpaid bill payloads unchanged. A migrated unpaid bill must first have its previous Checkout safely resolved and any financial correction handled by replacement.
- [x] Verify server totals, account/mode, owner, and original checkout association through the existing signed reconciliation path.
- [x] Ensure imported payments, general items, test charges, and Cal.com single-session purchases do not accidentally become unallocated course credits.

### E. Allocation and schedule interface

- [x] Add per-product/per-purchase credit cards to Admin student details and Student Account; preserve the source bill when showing aggregate totals.
- [x] Add single-date and weekly batch scheduling with explicit date preview, skip dates, duration, location, and remaining-credit checks.
- [x] Add reschedule, cancel, and mark-completed actions with clear resulting balance and audit history; detect stale concurrent edits.
- [x] Prevent changing a linked lesson to another product/account by editing its label or parent bill reference.
- [x] Include Academy entries in Admin Appointments and distinguish them from Cal.com appointments. Preserve Cal seated-booking grouping.
- [x] Keep Cal.com webhook updates from modifying Academy credit rows; no automatic cross-source attachment by name, amount, or approximate time.
- [x] Show cancelled/refunded allocations and completed history without losing future-calendar usability; explicitly mark unresolved past lessons.
- [ ] Use the existing local server and Codex in-app browser to verify Admin create/review/copy flow, student bill/credits view, and schedule create/change/cancel states on desktop and mobile.

### F. Historical records and rollout

- [ ] Inventory existing paid/unpaid/refunded, sandbox/live, imported/Cal.com, and general/course-looking items read-only before applying production changes.
- [x] Leave old records unclassified by default. Never parse descriptions or divide amount by the current price to issue credits.
- [ ] Provide an audited Admin backfill operation for selected legacy purchases: verify course, purchased count, duration, payment environment, and prior usage without altering the historical amount/description/quantity.
- [ ] Reconcile previously attended and already scheduled lessons before activating legacy credits; incomplete history stays “Needs review.” Do not invent attendance dates or grant the original full count as remaining.
- [ ] Preserve old URLs, transaction references, refunds, notifications, and existing Cal.com bookings. Linking an existing appointment must reuse it, not create a second allocation.
- [ ] Validate the migration in a disposable database; deploy additive schema before code. Verify rolling compatibility with old issuance paths.
- [ ] Verify old/new code compatibility before choosing rollback: after new credits exist, disable new issuance/allocation if needed and retain capable reconciliation/reads; never roll back to code that bypasses credit/refund controls.
- [ ] Configure sandbox products and complete the end-to-end acceptance below before enabling real allocation. Sandbox credits must not enter real student balances.
- [ ] Verify live configuration and actual deployed schema separately; record deployment/migration evidence and remaining limits. This checklist itself does not perform a rollout.
- [ ] Update earlier billing/package design documents during implementation so they no longer describe new course counts as description-only. Preserve dated historical acceptance evidence.

## Required acceptance evidence

| Case | Expected result |
| --- | --- |
| Same product, different negotiated totals and counts | Amounts come from each saved request; no fixed course price, inferred quota, or local Price ID requirement |
| Total not evenly divisible by lesson count | Charge the exact entered total once; retain the explicit count without rounding a per-lesson price |
| Multiple courses under one total | Each course retains its own Product ID and quota; Checkout charges the total once with no invented course-price allocation |
| Multi-course request and notification emails | Admin review, customer bill, and HTML/plain-text emails show the same one total and included course/count list, with no course subtotals; requests do not claim payment has succeeded |
| General itemized or camp bill | Existing amount calculations remain intact; ordinary quantities/day counts do not grant lesson credits |
| Unpaid, pending, wrong owner, or sandbox in real mode | No real allocation permitted |
| Duplicate issue/payment notifications | One bill/item identity; original credit count stays unchanged |
| Two Admins allocate the final credit | Exactly one succeeds; the other receives current availability |
| Batch contains one invalid/conflicting date | No partial set of allocations is saved |
| Reschedule/cancel/complete | Reschedule preserves one reservation; cancellation releases it; completion moves reserved to consumed |
| Past incomplete lesson | Remains reserved and flagged; never auto-completed or silently returned |
| Refunding concurrently with scheduling | Cannot allocate against refunded/blocked funds; future allocations reconciled; history preserved |
| Refund pending/failed/partial/reversed | Clearly blocked or reconciled per verified state; no automatic lesson-count calculation or booking recreation |
| Historical old-format/open Checkout | Same amounts, original parameters, working link and refund flow; no retroactive credits |
| Legacy backfill with prior lessons | Reconciliation accounts for past usage before availability appears; repeated backfill cannot double-count |
| Cal.com paid appointment webhook/replay | Existing booking/payment sync remains intact; no second entitlement or duplicate lesson |
| Product renamed/archived or Stripe catalog unavailable | History and eligible paid credit views remain readable; new-sale readiness is explicit |
| Authorization | Student A cannot see/use Student B's credits; anonymous/student clients cannot call staff mutation functions |
| Time zones and weekly repeats | New York local time preserved across DST; ambiguous/nonexistent local times are handled explicitly |

- [ ] Extend focused billing/package/Checkout/snapshot/webhook/notification tests and real PostgreSQL tests for constraints, RLS, concurrency, and rollback on partial failure.
- [ ] Run typecheck and appropriate lint/tests after implementation. Avoid integration suites that mutate a shared database; do not run `pnpm build`.
- [ ] Capture actual in-app browser verification of affected pages/states. If the local server must restart after configuration/backend changes, use the user's existing server workflow.
- [ ] Record sandbox provider evidence separately from local mocks and production acceptance; no real customer payment or outbound message is implied by this planning document.

## Source map and implementation order

| Area | Existing files |
| --- | --- |
| Creation and request sharing | `src/components/billing-issue.tsx`, `billing-share-tools.tsx`, `src/actions/billing.ts` |
| Bill model and reads | `src/lib/billing/model.ts`, `src/lib/billing/load.ts` |
| Checkout and payment actions | `src/lib/stripe/billing.ts`, `src/lib/stripe/config.ts`, `src/actions/stripe-billing.ts` |
| Payment synchronization | `src/app/(frontend)/api/integrations/stripe/webhook/route.ts`, Stripe billing migrations |
| Bill/refund display | `src/components/billing-records.tsx`, `billing-refund.tsx`, `src/app/(frontend)/account/billing/[billId]/page.tsx` |
| Email summaries | `src/lib/email/billing-notifications.server.ts` and its HTML email templates |
| Admin and student scheduling | `src/components/admin/StudentAdminViews.tsx`, `AppointmentAdminView.tsx`, `src/components/student-account-dashboard.tsx`, `student-schedule-calendar.tsx`, `src/lib/account/schedule.ts`, `src/app/(frontend)/account/page.tsx` |
| Existing booking catalog | `src/lib/cal/booking-options.ts`, `src/collections/Classes.ts` |
| Database | `supabase/migrations/20260903170000_create_app_account_tables.sql`, `20260909190000_add_itemized_billing.sql`, `20260917200000_issue_package_bills.sql`, later Stripe/notification migrations |
| Existing test coverage | `tests/int/billing-package.int.spec.ts`, `package-checkout.int.spec.ts`, billing/Stripe/Cal suites, `tests/fixtures/*billing*.sql` |

Recommended order: **A + B → C + D → E → F and end-to-end acceptance**. Keep allocation disabled until balance checks and refund coordination are both ready. First validate exact custom-total billing with structured lesson counts, then expose scheduling against those paid records.

Related context: [Existing package/payment-link design](lesson-package-payment-links.md), [Registered-account billing MVP](registered-account-billing-mvp.md), [Billing design](account-billing.md), and [dated release evidence](../operations/billing-release-acceptance-20260921.md).
