# Account Billing

Decision date: September 9, 2026
Status: Billing database migration applied; payment-provider synchronization and historical payment import remain required, unfinished work.

## Approved scope

Current term is hidden. Account presents Billing, Schedule, and Profile. A booking does not prove payment. Show recorded billing activity, not a default amount due. Empty and unavailable are different states.

Use two business tables: existing `app_payments` represents an issued bill plus its single successful payment; new `app_payment_items` contains immutable item descriptions, quantities, and unit prices. No separate invoice or refunds table. Keep UUID primary keys and account ownership; a unique readable bill number is a display identifier, not a user ID or authorization mechanism.

One bill accepts one full payment. No installments, combined tenders, partial refunds, tax calculation, or automated discount rules in this release. Staff enter final item prices with clear descriptions. Currency is USD for new bills; preserve historical currencies. Amounts use integer cents.

`refunded` means the full original payment has actually been returned. A refund request or pending provider refund does not qualify. To change a paid order, issue a replacement bill linked by `replaces_payment_id`, refund the original in full, and collect a new independent payment. A replacement never inherits Paid. Show the relationship and explain that refund arrival and the new charge can occur at different times. Preserve historical partially refunded records without enabling new partial refunds.

## Workflows

Administrators issue bills from the protected Student detail view, specifying itemized charges, optional deadline, and optional replacement reference. Issuing locks the charges; corrections require cancellation of an unpaid bill and a new bill. Record the administrator and timestamp for each operation inside a server-only audit column. Creation and status transitions must be atomic and reject duplicate submissions or stale status changes.

Staff may record a verified full payment with channel and unique transaction/reference number, or record a completed full refund with a distinct refund reference and reason. These controls record externally completed activity; they never charge a card or execute a refund. A browser return URL never confirms payment. Cancel only unpaid bills. Do not revive cancelled/refunded bills.

Students see only their own bills and itemized charges, totals, confirmed paid/refunded amounts, balance due, dates, and reference numbers. Do not sum different currencies. Pending verification is not confirmed debt; legacy partial refunds require reconciliation. Refunded bills have zero balance due and no new payable amount.

## Payment integration boundary

The current Cal.com webhook persists schedule records, not verified financial transactions. Do not automatically generate Paid bills from those events. Provider-confirmed payment ingestion and secure amount-bound checkout remain follow-up work. Until checkout is implemented, display a contact-the-academy message for an unpaid bill instead of reusing the unrelated test Payment Link. Existing paid booking transactions can be recorded manually after Staff verification; this does not collect payment again.

## Required payment synchronization checklist

This is the current checklist for the next billing implementation phase. The user explicitly deferred implementation for later; these items are required, not optional enhancements. Database availability and manual billing controls do not mean payment integration is complete.

### Historical payments

- [ ] Verify Jason's reported USD 0.50 payment against the actual payment provider: confirm the account, test/live mode, successful transaction, currency, original payment timestamp, and associated booking. The amount is user-reported until verified.
- [ ] Import that verified transaction into `app_payments` and `app_payment_items` as Paid, linked to the correct user and booking. Preserve the original provider reference and payment date; do not create a new amount due or request payment again. If the provider shows a completed refund, preserve that actual state instead.
- [ ] Find and reconcile other historical booking payments missing from the website database, with a review step for ambiguous ownership and a repeatable import that cannot duplicate transactions.

### Future payments and refunds

- [ ] Confirm which provider/account receives Cal.com booking payments and which verified payment events and booking references are available.
- [ ] Implement and configure signed payment notifications at the deployed endpoint so successful booking payments automatically create or update the correct user's bill and itemized charges.
- [ ] Associate transactions with a trusted user/booking or existing bill reference; route missing or conflicting associations for review rather than guessing from a name or amount.
- [ ] Validate amount, currency, payment success, and test/live mode before recording Paid. Booking creation and browser redirects alone must never confirm payment.
- [ ] Enforce transaction-level deduplication and safe handling of repeated, delayed, and out-of-order notifications. Historical imports and live notifications must use the same deduplication rules.
- [ ] Automatically record a full refund only after the provider confirms completion. Pending or failed refunds must not mark the bill Refunded. Amount changes follow the approved full-refund-plus-replacement-payment workflow; do not introduce partial-refund controls.
- [ ] Add reconciliation/backfill for missed notifications, visible sync failures, and a safe retry path; unresolved payments must not silently disappear.
- [ ] Connect manually issued bills to secure checkout with the correct bill reference and amount, then update the same bill from verified payment notifications.

### Admin refund interface and remaining TODOs

- [x] Show **Refund payment** and **Try refund demo** at the top of Admin Billing, including empty and unavailable billing states. Do not require a historical payment import just to find the controls or test the interface.
- [x] Provide an isolated $10 demo with reason, confirmation, and a clearly labeled demo-complete result. It uses a sample customer, never calls a server action, never changes student records, and never presents itself as a completed real refund.
- [x] Add a full-refund review interface to paid bills, showing Student, bill number, original transaction reference, itemized charges, and fixed full amount.
- [x] Add reason entry, a separate confirmation step, back/cancel controls, and an explicit notice that the review is not saved and no refund has been requested.
- [x] Keep the actual refund submission disabled until provider integration is ready; require a verified full Stripe payment to open the review flow.
- [x] Separate the existing manual “Record completed refund” action from a future actual refund request. Recording must explicitly state that it does not send money.
- [x] Add presentation components for pending, completed, and failed refunds. Pending and failed states are not yet backed by database/provider data; a click must never simulate success.
- [x] Verify refund review in component previews and the empty-state demo through confirmation in the Codex in-app browser, with synthetic records and all provider calls disconnected. Seventeen focused tests, typecheck, and targeted ESLint checks pass. The actual local Admin route redirects to login in both browsers; authenticated refund-flow acceptance remains pending.
- [ ] TODO: Confirm the Stripe account/Connect context and API permissions for Cal.com payments before enabling website refunds.
- [ ] TODO: Add server-side refund initiation with administrator authorization, a fresh provider check of the original transaction, full-amount/currency verification, and an idempotency key. Do not accept client-supplied refund amounts as authoritative.
- [ ] TODO: Persist refund request ID, pending/failed/completed state, failure information, initiator, and timestamps on `app_payments`; no separate refunds table is required. Separate request time from confirmed completion.
- [ ] TODO: Connect the confirmation button to that endpoint only after the database and provider configuration are deployed. On ambiguous timeouts, reconcile the existing request before offering retry.
- [ ] TODO: Connect signed refund events and reconciliation to the status components; keep manual recording from conflicting with an in-flight automatic refund. A pending or failed refund must not mark the bill Refunded.
- [ ] TODO: Verify refunds initiated in Stripe also update website records, including duplicate notifications and out-of-order delivery.
- [ ] TODO: Run authenticated Admin end-to-end tests in Stripe test mode, covering success, pending, failure, duplicate clicks, stale data, permissions, and replacement bills. No real refund is authorized by a UI test.

#### How to test the frontend

1. Use the updated local site at `http://localhost:3000/admin`, sign in as staff, then open **Student → Jason → Billing**. These changes are local until committed and deployed; the production site will not show them yet.
2. **Refund payment** stays visible even with no bills. With no paid records, it explains why a real payment cannot be selected.
3. Click **Try refund demo → Review full refund**, enter a reason, then click **Review confirmation**.
4. Select the confirmation checkbox and click **Finish demo — no money moves**. Expect **Demo complete — no refund sent**. The sample $10 payment does not belong to Jason and is never saved.
5. Use **Restart demo** to repeat. For actual refunds, use Stripe until the server integration and signed reconciliation TODOs above are complete. **Record completed refund** only records money already returned externally.

### Acceptance

- [ ] Verify Jason's reconciled record appears correctly in both Student Account and Admin Billing with its original amount, item description, payment date, reference, and actual payment/refund state.
- [ ] Verify a new controlled booking payment appears automatically in both interfaces without manual confirmation.
- [ ] Test duplicate delivery, delayed success, wrong-account association, failed payment, completed full refund, replacement payment, and recovery of a missed notification.
- [ ] Verify student data isolation and test/live separation using provider-backed records.
- [ ] Mark this phase complete only after the deployed event configuration and end-to-end database/UI results have been verified. Sending a receipt email alone is not proof of database synchronization.

## Release checks

- Apply the forward migration to the intended database after reviewing existing rows and making a backup.
- Verify own-account read access and denial of writes by students and content editors.
- Verify item totals, duplicate references, concurrent transitions, replacement ownership, and full-refund rules.
- Verify signed-in Account and administrator billing screens on desktop/mobile.
- Verify existing authentication, Profile, Schedule, and Cal.com tests remain green.
- Do not run `pnpm build`.
- Do not claim live rollout, payment collection, refunds, or automatic booking-payment sync based on local code checks.

## Implementation checkpoint — September 9, 2026

Implemented locally:

- Forward migration `20260909190000_add_itemized_billing.sql`; historical records and legacy partial-refund status are preserved. Existing provider transaction references are copied when available.
- Account and Staff detail pages read real bills and items; removed the unused mock account module.
- Staff itemized issuance, manual full-payment verification, full-refund verification, cancellation of unpaid bills, and replacement links.
- Service-role-only atomic RPC, owner-scoped student reads, and audit history excluded from student column privileges.
- Desktop/mobile component verification in the Codex in-app browser, using isolated synthetic fixtures. Item addition and total calculation checked visually.
- 38 targeted tests pass; the migration and database assertions pass in disposable PostgreSQL 15. The fixture is `tests/fixtures/billing-database.sql` and must only run in an empty disposable database.

At this initial local checkpoint, database rollout and authenticated verification were pending; the rollout below records the subsequent migration and signed-in empty-state verification. Historical payment import, provider-confirmed booking-payment ingestion, populated Staff/Student end-to-end flows, and online checkout for manually issued bills remain incomplete. Manual verification timestamps indicate when Staff recorded confirmation, not necessarily the provider's original transaction date.

## Database rollout — September 9, 2026

Applied `20260909190000_add_itemized_billing.sql` to the Supabase project configured by this checkout after verifying the API/database target match and taking a private local backup of the existing payment rows, schema, indexes, policies, and grants. The payment table was empty before migration; no customer charges were created. PostgREST schema reload was requested.

Verified the actual signed-in Student Account at `http://localhost:3000/account#payments` in the user's existing Chrome session: both the overview and Billing panel show **No billing activity**, and the former load error is gone. This supersedes the earlier migration-pending and signed-in Account empty-state verification notes. Verified billing RLS is enabled, student access to the management RPC and staff audit column is denied, and service-role execution is allowed. Admin UI writes, populated bill flows, booking-payment ingestion, and checkout remain separate acceptance work.
