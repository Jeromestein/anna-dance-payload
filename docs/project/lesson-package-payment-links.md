# Lesson Package Bills and Payment Links

Updated: September 17, 2026

Status: Design only. The owner requested documentation and checklist updates, with no application code, database, permission, or deployment changes. The proposed controls and routes below are not implemented. This is the current proposal for student-specific package collection; the older generic full-term Payment Link plan is historical.

Related: [Payment and Billing Design](account-billing.md) · [Stripe operations and acceptance](../operations/stripe-payment-refund-testing.md)

## Outcome and scope

An administrator can issue one bill for several lessons, copy its payment link, and share it with the intended account holder. The customer sees the course, exact number of lessons, price per lesson, and total before making one payment. Verified payment updates the same bill in Admin and Student Account.

This purchases a stated number of lessons. It does not create bookings, assign a class, or track attendance or remaining lesson credits. Staff continue to arrange the schedule separately. Cal.com appointment payments keep their existing flow.

### First-release decisions

- Use the existing `app_payments` and `app_payment_items` model. No new invoice, package, payment-link, or refund table is planned.
- One bill belongs to one existing student account and accepts one full payment in USD. A bill can contain multiple itemized course lines.
- Copy a stable website bill URL, not a reusable generic Stripe product link. A temporary Stripe Checkout Session is obtained when the authenticated owner clicks Pay.
- Require the bill owner's existing login. This release does not introduce guest checkout or new parent/guardian access. A parent can use an already established account that owns the bill; a separate guardian login requires its own access design.
- First release uses lesson count × price per lesson. It does not add a separately editable package total, coupons, installments, subscriptions, or automatic future charges.
- Keep issued descriptions, quantities, and amounts immutable. Full refunds follow the existing policy; a replacement bill requires a separate payment.
- Sharing means **Copy payment link**. Staff send it manually. Automatic email/SMS delivery and tracking are outside this release.

## Administrator flow

Location: **Admin → Student → Billing → Create bill → Lesson package**. Keep the existing general itemized-bill option available; do not relabel every quantity as lessons.

| Field | Example | Rule |
| --- | --- | --- |
| Student | Jason | Taken from the selected student; show prominently during review |
| Course / package name | Ballet — Fall 2026 | Required; stored as an immutable charge description |
| Number of lessons | 10 | Required integer, 1–100, following the existing quantity limit |
| Price per lesson (USD) | 30.00 | Required positive amount in cents for a payable package |
| Line total | 300.00 | Calculated, not independently editable |
| Due date | Optional | Informational due date; does not silently expire the bill |

1. Enter one or more course lines. The form remains an unsaved local draft; no Draft database status is introduced.
2. Select **Review bill**. Show the student, all courses, lesson counts, unit prices, total, and due date. Explain that issuing locks the charges.
3. Confirm **Create bill** once. Persist the bill and its items atomically. Existing bill identity must make retries safe; do not create a second bill after an uncertain response without checking the first.
4. Show **Bill created**, the unpaid record, **Preview bill**, and **Copy payment link**. Copy only after the saved identity is confirmed.
5. After copying, show **Link copied**. If clipboard access fails, show a selectable URL. Do not claim the link was sent or delivered.

When online collection is disabled, creation of an ordinary unpaid bill may remain available, but do not present a usable **Copy payment link** action. Show **Online payment is not available yet**. Existing shared URLs must also display that state if collection is later disabled.

### Example review and payment summary

> **Ballet — Fall 2026**
>
> For Jason · **10 lessons**
>
> $30.00 per lesson × 10
>
> **Total: $300.00 USD**
>
> One payment covers the 10 lessons listed above. Lesson dates are arranged separately.
>
> **Pay $300.00**

For multiple courses, show the lesson count on each course line. Do not combine different courses into an unexplained single quantity. All examples are illustrative, not published academy prices or refund eligibility promises.

## Customer flow and link behavior

Proposed path: `/account/billing/[billId]` on the configured website origin.

1. The recipient opens the website link. An unauthenticated visitor signs in and returns to that bill, using a validated same-site return path.
2. The server loads the bill only for the authenticated owner. The UUID locates the bill; it does not grant access. Unknown and wrong-owner references receive a generic unavailable result without student or payment details.
3. The page shows the stored course description, **number of lessons**, per-lesson price, total, due date, and actual billing status. The customer cannot edit the lesson count or price.
4. **Pay $300.00** asks the server to obtain Checkout for that stored unpaid bill. Merely viewing, previewing, or copying a link must not create a Checkout Session or request payment.
5. Stripe Checkout shows the same lesson description, fixed quantity, unit price, currency, and total. The server supplies all amounts and the trusted bill reference. Do not add adjustable quantities or accept prices from the browser.
6. Return to the same bill after completing or closing Checkout. The return URL is navigation, not proof of payment. Show **Payment submitted — awaiting confirmation** when appropriate; never encourage a second payment while the first needs verification.
7. The signed webhook reconciles provider evidence into the existing bill. Reloading the bill then shows Paid in both customer and Admin views. An automatic live page update is not assumed; include a refresh/recheck state in the UI design.

The website URL remains the stable reference. Stripe Checkout Sessions expire, so the website must retrieve/reuse an open session or replace one only after confirmed expiration. Stripe currently allows a Session lifetime of 30 minutes to 24 hours, defaulting to 24 hours. See [Create a Checkout Session](https://docs.stripe.com/api/checkout/sessions/create).

```mermaid
flowchart TD
    A[Admin selects student] --> B[Enter course, lesson count, unit price]
    B --> C[Review and issue one itemized bill]
    C --> D[(Existing payments and payment items)]
    C --> E[Copy stable website bill link]
    E --> F[Customer signs in as bill owner]
    F --> G[Review lessons and total]
    G --> H[Pay: server validates bill and reuses or creates Checkout]
    H --> I[Stripe collects one full payment]
    I --> J[Signed webhook verifies current provider result]
    J --> D
    D --> K[Admin and customer see the same paid bill]
    I -.-> L[Return to bill: await confirmation]
    L --> K
```

## Data mapping and price rules

| Value | Existing storage or behavior |
| --- | --- |
| Student owner, bill identity, status, total, due date | `app_payments` |
| Course and billing-period snapshot | `app_payment_items.description` |
| Purchased lesson count | `app_payment_items.quantity` |
| Price per lesson in integer cents | `app_payment_items.unit_amount_cents` |
| Checkout identity, request key, payment/refund references | Existing Stripe fields on `app_payments` |
| Shareable URL | Derived from configured origin and bill ID; no stored public access token |

For lesson-package lines, construct an explicit description such as `Ballet — Fall 2026 (10 lessons)`, with quantity `10` and unit amount `3000`. The reviewed name and lesson count must agree; do not silently truncate the final description beyond the existing 200-character limit. The website can render the stored item generically as description plus quantity × unit price, while still clearly exposing the number of lessons. Historical non-lesson items retain generic quantity labels; do not parse their descriptions into new lesson entitlements.

The server recalculates the total from stored integer-cent values and requires it to match the bill. Ten lessons at $30.00 produces $300.00. A three-lesson package advertised as exactly $100.00 cannot be represented by rounding a per-lesson price: that would change the charge. Such fixed-total pricing needs a later explicit design; do not silently round or use a negative adjustment. Existing validation and line-count limits still apply.

No schema migration is planned for this scope. Implementation must verify the current RPC and ownership constraints; any necessary constraint/function change should be separately documented rather than introducing new tables by default.

## Status, retry, and refund behavior

| Situation | Customer/Admin behavior |
| --- | --- |
| Unpaid, no unresolved payment | Show the bill and Pay action when online collection is enabled |
| Open Checkout already exists | Reuse that session; concurrent clicks must not create duplicate sessions |
| Checkout expired | Verify expiration before obtaining a replacement session for the same unpaid bill |
| Checkout completed, result not reconciled | Show payment confirmation pending; no new payment request |
| Card declined or customer closes Checkout | Do not mark Paid or cancel the bill; allow the existing verified retry flow |
| Unknown provider result or stale request key | Require reconciliation; retain the existing 23-hour safeguard against blindly recreating an unknown request |
| Paid | Show Paid and original lesson details; remove the Pay action |
| Full refund processing | Show refund processing; no replacement charge or new Pay action |
| Fully refunded | Show refunded amount and original purchased lessons as history; old link cannot collect again |
| Cancelled | Show Cancelled; no Pay action |
| Overdue but still unpaid | Show overdue status without inventing fees or changing lesson quantity |
| Wrong account or missing bill | Generic unavailable result; no billing information revealed |

Before issuance, staff may edit freely. An issued bill with an error must be cancelled and replaced only when cancellation is safe. Existing provider-managed bills block manual status edits; this design does not promise new cancellation support for an active or unresolved Checkout. Staff must reconcile provider state first. An incomplete payment or session must not remain payable behind a cancelled website record.

After a completed payment, retain the agreed policy: refund the full original amount, then issue a separate replacement bill for revised content. Link it using the existing replacement mechanism; it starts unpaid. This bill is a charge record, not a remaining-lessons balance, and refunding does not automatically change the schedule.

## Current foundation versus missing work

Verified against repository code on September 17:

| Foundation already present | Required work for this design |
| --- | --- |
| Admin itemized bill creation, descriptions, quantity, unit price, due date | Lesson-package form wording, preview, and explicit lesson-count review |
| Account displays own bills | Dedicated owner-protected bill URL and login return handling |
| Checkout sends stored descriptions, quantity, and price to Stripe | Copy-link control, bill-specific return routes, and all page states |
| Checkout reservation, idempotency and expiration checks | End-to-end link reuse, repeated-click, and concurrency acceptance |
| Signed payment/refund reconciliation into the existing bill | Package-specific tests proving lesson details survive payment and refund |
| Sandbox payment/refund acceptance | Package flow desktop/mobile and authenticated access verification |

The Admin action currently opens Checkout only for staff sandbox testing; customer Checkout uses the authenticated owner. The proposed Admin copy-link action does not require allowing staff to initiate a live customer Checkout.

At the last verified live setup, Accounts and Payment Intents had Read access, Charges and Refunds had Write, Checkout Sessions had None, and `STRIPE_LIVE_PAYMENTS_ENABLED=false`. The refund switch was enabled independently. Before live package collection, verify the actual restricted key supports the required Checkout Session operations and inline pricing in the sandbox; propose only demonstrated necessary permission changes. Apply any live access changes and enablement through a separate explicit rollout, not as part of this design-only task. See the [operational checklist](../operations/stripe-payment-refund-testing.md).

## Implementation and acceptance checklist

### Design completed in this document

- [x] Specify one payment for itemized lesson packages and exact lesson-count presentation.
- [x] Reuse the two existing tables and ownership model; define no new public access token.
- [x] Define the stable website link, authenticated payment flow, and distinct Stripe Session lifetime.
- [x] Document full refunds, replacements, pricing limits, parent-account limits, and scheduling boundaries.

### Phase 1 — Admin and customer interface

Prerequisite: complete the [production demo/test visibility cleanup](../operations/stripe-payment-refund-testing.md#demo-and-test-surface-audit--before-package-implementation). The owner requested this audit before package implementation; the audit is complete, while hiding the controls remains TODO.

- [ ] Hide production refund demos and remove testing wording from live payment tools; preserve sandbox coverage, real transaction records, and operational import/refresh/refund controls.

- [ ] Add the lesson-package option without changing generic item quantity semantics.
- [ ] Add review-before-issue with student, course, lesson count, unit price, total, due date, and immutable-charge notice.
- [ ] Return the confirmed saved bill identity and expose Preview bill / Copy payment link with clipboard fallback.
- [ ] Add the owner-protected individual bill page and safe login return path; deny other users without disclosure.
- [ ] Clearly display course and lesson count on every payment and historical bill view; lock quantities and prices at payment time.
- [ ] Add disabled-collection, unpaid, pending confirmation, paid, refunded, cancelled, missing, and error states.

### Phase 2 — Payment integration

- [ ] Reuse the existing stored-bill Checkout path and trusted metadata; update success/cancel navigation to the individual bill.
- [ ] Confirm session reuse/expiration behavior and prevent duplicate issuance or collection on repeated clicks, retries, or tabs.
- [ ] Revalidate the new bill route after payment/refund reconciliation as well as Account and Admin.
- [ ] Preserve purchased lesson descriptions and quantities through webhook updates and full refunds.
- [ ] Verify paid, refunded, cancelled, completed-but-unverified, and wrong-owner bills cannot obtain a fresh payable session.

### Phase 3 — Sandbox acceptance

- [ ] Create a synthetic 10 × $30 bill; verify course, 10 lessons, $30 unit price, and $300 total in Admin, website bill, and Stripe Checkout.
- [ ] Verify multi-course lines, lesson-count validation, integer-cent totals, and rejection of an unsupported fixed-total rounding shortcut.
- [ ] Verify copied links, login return, wrong-account denial, mobile layout, keyboard access, and copy failure fallback.
- [ ] Pay once in sandbox and prove webhook-driven update of the same bill without manual Paid or Refresh Stripe status actions; capture delivery evidence and item preservation.
- [ ] Exercise declined payment, closing Checkout, delayed webhook, duplicate/out-of-order event, open/expired session, stale request, and concurrent pay attempts.
- [ ] Perform a sandbox full refund; verify the old link remains historical and a replacement bill requires a separate payment.
- [ ] Run focused tests, type checks, and in-app desktop/mobile verification; do not run `pnpm build`.

### Phase 4 — Controlled release

- [ ] Obtain implementation/release authorization; this document alone does not authorize code or configuration changes.
- [ ] Verify the intended merchant/mode and minimum required Checkout permissions in sandbox, then obtain the required live permission approval.
- [ ] Enable the independent live payment switch only for the approved rollout; retain existing refund behavior.
- [ ] Verify the deployed page and payment-link controls using non-financial viewing/copy actions.
- [ ] Observe the next genuine package payment and signed delivery; confirm identical lesson details in Account/Admin and receipt delivery where applicable. Do not create an artificial live purchase solely for acceptance.

## Deferred work

Guest payment links; separate parent/guardian permissions; registration before account creation; class capacity and enrollment; scheduling; attendance and remaining credits; fixed-total packages that cannot be divided into cents per lesson; coupons; subscriptions/installments; automatic reminders or link delivery; downloadable invoice PDFs; reusable package catalogs. These require their own scope rather than being implied by a paid bill.

## Source map

- Existing behavior: `src/components/billing-admin.tsx`, `src/components/billing-records.tsx`, `src/components/stripe-billing-controls.tsx`, `src/actions/billing.ts`, `src/actions/stripe-billing.ts`, `src/lib/billing/model.ts`, `src/lib/billing/load.ts`, `src/lib/stripe/billing.ts`.
- Data integrity: existing billing and Stripe migrations under `supabase/migrations/`.
- Stripe fields and session expiration: [Create a Checkout Session](https://docs.stripe.com/api/checkout/sessions/create), checked September 17, 2026. Provider capabilities do not imply that these proposed website features are implemented.
