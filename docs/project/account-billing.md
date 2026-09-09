# Account Billing

Decision date: September 9, 2026
Status: Implementation in progress; database deployment and payment-provider verification are separate release checks.

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

Not yet completed: application of the migration to the intended Supabase database, authenticated end-to-end verification with real Staff/Student sessions, provider-confirmed booking-payment ingestion, and online checkout for manually issued bills. Account login-gate verification passed; logged-in page verification was blocked by the absence of an authenticated browser session. Manual verification timestamps indicate when Staff recorded confirmation, not necessarily the provider's original transaction date.


## Database rollout — September 9, 2026

Applied `20260909190000_add_itemized_billing.sql` to the Supabase project configured by this checkout after verifying the API/database target match and taking a private local backup of the existing payment rows, schema, indexes, policies, and grants. The payment table was empty before migration; no customer charges were created. PostgREST schema reload was requested.

Verified the actual signed-in Student Account at `http://localhost:3000/account#payments` in the user's existing Chrome session: both the overview and Billing panel show **No billing activity**, and the former load error is gone. This supersedes the earlier migration-pending and signed-in Account empty-state verification notes. Verified billing RLS is enabled, student access to the management RPC and staff audit column is denied, and service-role execution is allowed. Admin UI writes, populated bill flows, booking-payment ingestion, and checkout remain separate acceptance work.
