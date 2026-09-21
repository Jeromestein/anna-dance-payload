# Course-credit migration and Billing recovery

Applied: September 21, 2026, 21:47:40 UTC.
Target: Supabase project `hsitmgmcekzobksgtjoj`.

## Incident and cause

After application commit `a92e270` was pushed, the Billing reader requested the new
course-credit columns before the matching database migration had been applied.
The exact application query returned HTTP 400 / PostgreSQL `42703`:
`column app_payment_items_1.course_key does not exist`. Independent schema probes
confirmed missing `app_payments.pricing_mode` and schedule `payment_item_id`.
The old Billing query returned HTTP 200. This was a database rollout omission.

## Applied change

Applied `supabase/migrations/20260922010000_course_credits.sql` once to the verified
production database, in one transaction with a three-second lock timeout.
The migration body was unchanged. SHA-256:
`009b8daf729c4faf80ac17fb87e07a8ca7a8cba6b37c81e5da0c8009280878db`.

A private temporary snapshot captured the existing three tables, column metadata,
grants, and triggers before execution. Under the same transaction locks, serialized
row fingerprints verified that the original payment, payment item, and four
schedule records were unchanged after excluding the newly added columns.
No course credits were backfilled and no financial transaction or email was sent.

## Verified result

- The complete current application Billing query now returns HTTP 200 with the
  existing bill, including its item and acknowledgement relationship.
- The course-schedule reader and sandbox/live credit-balance RPC both return HTTP 200.
- RLS remains enabled on all three tables. Students cannot execute schedule
  mutations or read staff audit data. Anonymous callers cannot read course balances.
- The authenticated production Student Admin detail page was checked in the Codex
  in-app browser: Billing displays `No payment due` and the existing fully refunded
  bill. The `Billing unavailable` error is absent. Schedule loads normally.

This migration is already applied; do not rerun the non-idempotent file.
Product ID configuration and hosted acceptance for new course purchases remain
separate rollout tasks. Code push alone does not apply Supabase migrations; apply
and verify schema dependencies before deploying readers that require them.
