# Production billing migration — September 21, 2026

Applied at 2026-09-21 19:48:46 UTC to the documented production Supabase project
`hsitmgmcekzobksgtjoj`. The configured PostgreSQL and Supabase API targets were verified
to match before execution.

## Incident

The Student Admin billing query failed with `PGRST200` because it joined
`app_bill_acknowledgements`, which did not exist in PostgreSQL. The notification table
and `app_issue_bill` function were also absent. This was a missing database rollout,
not only a stale API schema cache. The database has no Supabase migration ledger, so
presence of actual objects was checked directly.

## Applied migrations

The following existing files were applied, in order, within one transaction:

1. `supabase/migrations/20260917200000_issue_package_bills.sql`
2. `supabase/migrations/20260921200000_billing_notifications.sql`
3. `supabase/migrations/20260921210000_refund_notifications.sql`

The individual outer transaction statements were replaced by one encompassing
transaction. Migration bodies were unchanged. A short lock timeout was used, and
PostgREST schema reload notifications were delivered on commit. Do not reapply these
non-idempotent migrations to this project.

Before applying, a private temporary snapshot captured existing payment rows,
items, related schema metadata, functions, triggers, policies, and table grants.
The single existing payment and item were verified byte-for-byte unchanged through
serialized-row fingerprints before commit. No historical notification or
acknowledgement rows were created.

## Verification

- The complete `tests/fixtures/refund-notifications-database.sql` fixture passed in
  a fresh, disposable PostgreSQL 15 database, including its billing, Stripe,
  package issuance, and notification dependencies. The temporary database server
  was stopped after verification.
- All six new functions exist. Both new tables have RLS enabled. The notification
  table is not readable by student accounts. The server role can issue bills;
  student accounts cannot issue bills, and anonymous callers cannot claim notices.
- The exact application billing query for the reported student returned HTTP 200
  with zero bills, replacing the earlier `PGRST200` error.
- Both new table endpoints returned HTTP 200. The refreshed service-role API schema
  exposes issue, request, claim, and acknowledgement functions.
- The in-app browser reached the production administrator login page. Authenticated
  Student Admin rendering was not verified in this session.

No production bill was created, payment or refund initiated, or email sent as part
of this rollout. Stripe settings and deployment configuration were unchanged.
This verifies database readiness, not live checkout or email delivery. No build
was run. Unrelated working-tree changes were left untouched.
