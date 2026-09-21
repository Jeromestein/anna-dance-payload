# Course Credits — Local Implementation and Acceptance

Date: September 21, 2026

Update: The course-credit migration was subsequently applied to production at 21:47:40 UTC to restore Billing. See [production migration and recovery evidence](course-credits-production-migration-20260921.md).

Update: The Product ID requirement described in the initial evidence below has been removed. [Follow-up implementation and migration evidence](optional-course-products-20260921.md) supersedes the earlier catalog prerequisites.

## Implemented locally

- New course-payment mode: one administrator-entered total, up to four distinct course/count rows, and no per-course price allocation.
- Existing `app_payments`, `app_payment_items`, and `app_schedule_entries` are extended; no new product or package table and no stored Price ID requirement.
- Courses use local keys without catalog lookups; the selected Stripe merchant account/mode is still verified before issuance. Names, durations, counts, and total are saved as immutable bill details.
- One Stripe charge for the negotiated total. New bills use inline course/package descriptions; historical single-course bills preserve their saved Product ID for retries. Historical Product IDs remain on local rows; mixed-course revenue is not falsely assigned to an individual course.
- Bill review, account history, refund review, and HTML/plain-text payment notifications show the one total and each included course/count. Refund-confirmation emails show only the refund amount without course details. Older itemized bills keep their original arithmetic and display.
- Admin course cards support individual or weekly batch scheduling, skipped dates, rescheduling, cancellation with reason, and completion. Dates use New York time, including DST validation. Student cards are read-only.
- Quotas are derived from the full schedule history. Database transactions enforce ownership, environment, available credits, duplicate-request identity, and student time conflicts. Future lessons cannot be completed.
- Refund state blocks allocations; a verified full refund cancels future Academy allocations in the financial transaction and preserves completed history. Cal.com cancellations themselves remain managed through Cal.com.
- Known-course Cal.com single-session purchases can be linked to their existing booking as one purchased credit already allocated once. Duplicate sync does not create a second credit. A provider update cannot reactivate a cancelled booking after its credit was used elsewhere.

## Local evidence

- Automated regression suites exclude `tests/int/api.int.spec.ts`, which initializes the shared Payload database. The final run passed 199 tests across 28 suites. TypeScript type checking and scoped ESLint checks also passed.
- `tests/fixtures/course-credits-database.sql` passed in a fresh PostgreSQL 15 database on a temporary local socket. It includes existing billing/package/Stripe fixtures plus the new migration, exact negotiated total preservation, duplicate issuance, unpaid rejection, partial-batch rollback, environment isolation, stale-edit rejection, refund cleanup, RLS, Cal single-booking association/replay, and completion accounting.
- `tests/fixtures/course-credit-concurrency.py` passed against that disposable database: only one transaction spent the final credit, and a concurrent refund cancelled an in-flight reschedule after it committed.
- Codex in-app browser opened the existing Next.js server at `http://localhost:3000/admin/students` and reached the existing login screen. No credentials, application database changes, or real customer operations were performed for this check.
- Actual UI components were exercised in an isolated Vite preview at `http://127.0.0.1:3181` with mocked actions. Verified a multi-course negotiated-total review, synthetic creation with the stable bill link, weekly scheduling, independent course balance updates, and cancellation releasing only the matching reservation. A 390px mobile view showed the same single total and course/count breakdown without per-course amounts.
- Preview actions do not contact Stripe, Supabase, or email providers. This proves component rendering and interaction, not hosted end-to-end collection.
- No `pnpm build` was run. Temporary preview/database processes are stopped after checks.

## Deployment prerequisites

1. Review and apply `supabase/migrations/20260922010000_course_credits.sql` to the intended database using the established migration workflow. Completed for project `hsitmgmcekzobksgtjoj` at 21:47:40 UTC; see the production recovery evidence above. Do not reapply it.
2. Deploy all new readers, email renderers, server actions, Checkout branching, and schedule/refund guards together before issuing any agreed-total bills. Old application instances do not understand nullable course-item amounts. Do not enable issuance during a mixed old/new deployment.
3. Apply `20260922020000_optional_course_product_ids.sql` before deploying the follow-up code. No course Product or Price ID configuration is required; see the follow-up evidence above for deployment status.
4. Preserve existing live payment/refund switches. Removing the catalog requirement does not enable live collection. Restart the user's development server after environment/backend setup changes.
5. In the intended sandbox, verify Checkout presentation, payment/webhook, customer/Admin notification delivery, scheduling, and full refund. Stripe and Cal.com receipts are separate from the website's email templates.
6. Confirm ordinary cancellation policy before operational use: the implemented Admin action explicitly cancels and releases a reservation. No automatic no-show deduction, expiry, or complimentary makeup grant is implemented.
7. Verify live readiness and actual deployed schema separately. Local passing tests are not a claim of production deployment or payment enablement.

## Compatibility and limits

- Old bills, original amounts, links, Checkout request keys, and payment/refund history are not rewritten. Old unsigned descriptions and quantities do not automatically become entitlements.
- An audited general legacy-credit backfill interface is not implemented. Historical multi-course purchases with prior usage must be reconciled before enabling their balances; do not manually label them as entirely unused.
- New course bills are provider-configured and use Stripe collection. The original manual-payment controls remain for legacy non-provider-managed bills; a new course bill does not add a separate cash-settlement bypass.
- Single Cal bookings join credits only when a known local course, one verified payment item, and exactly one linked booking for the account agree. Unknown booking types preserve the existing payment/booking flow without granting a new unallocated credit. No Stripe Product ID mapping is required.
- Shared class rosters, teacher/room capacity checks, and class-wide rescheduling remain outside this per-student implementation.
- Refund failure/reversal or partial-refund review does not automatically restore cancelled bookings. Staff must reconcile provider state before allocation can resume.
- Balance calculations use all linked history; the management UI reports unavailable rather than silently truncating when its detail limit is exceeded.
- Rollback after new course bills exist must keep compatible reads and financial/schedule guards. Disable issuance/allocation if necessary; do not revert to an old build that computes their amounts as itemized lines.

## Reproducing database checks

Use a fresh disposable local PostgreSQL database named `course_test`. The concurrency script deliberately only accepts the temporary `/tmp/anna-course-pg.*` socket path used in this task. Never run these fixtures against the application database.

```sh
psql -X -v ON_ERROR_STOP=1 -h "$TEST_SOCKET" -p "$TEST_PORT" -d course_test \
  -f tests/fixtures/course-credits-database.sql
python3 tests/fixtures/course-credit-concurrency.py "$TEST_SOCKET" "$TEST_PORT" course_test
```

Related: [design and implementation checklist](../project/stripe-course-credits-checklist-20260921.md).
