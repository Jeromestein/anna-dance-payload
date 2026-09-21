# Optional Stripe Product IDs

Date: September 21, 2026

## Behavior

New course purchases use the four local course keys, explicit lesson counts and one
administrator-entered total. Issuance no longer resolves or retrieves Stripe
Products. The eight course Product ID environment variables and their lookup
helper are removed. Merchant-account verification, test/live isolation and payment
verification remain in place.

Checkout uses an inline course/package description and charges the stored total
once. The application requires neither a preconfigured Product ID nor a Price ID.
Stripe may create its own Product/Price objects from the inline data; these are not
the identity or source of truth for local course credits.

The existing nullable `stripe_product_id` column remains for historical records.
Previously issued single-course bills with a saved Product ID preserve their
original Checkout parameters and idempotency behavior. Old itemized bills are
unchanged. Known verified Cal.com single-session payments can link one credit to
the existing appointment without a course Product ID mapping.

## Database rollout

Applied `supabase/migrations/20260922020000_optional_course_product_ids.sql` to
Supabase project `hsitmgmcekzobksgtjoj` at **2026-09-21 22:07:18 UTC**.
SHA-256: `36ba96d3c4969944ff7233940c00dddfc1d7d4da0b9dac32ce9afa6855a59f47`.

The transaction relaxed the course-item Product ID constraint and replaced the
issuance and Cal-link functions. Omitted and explicitly null Product IDs compare
equally on issuance retries. Non-null IDs still require a valid format.

A private temporary snapshot captured original rows and function/constraint
definitions. Before/after fingerprints under transaction locks confirmed the one
payment, one payment item and four schedule records were unchanged. RLS and
service-only mutation permissions were verified. No historical credits were
backfilled and no payment, refund or email was initiated.

The complete application Billing query, profile lookup and schedule query returned
HTTP 200 after migration. Apply schema before deploying this code on another
environment. This record confirms the shared database change. Application deployment is
separate; this migration record does not confirm a hosted application rollout.

## Verification

- All 204 regression tests across 28 suites passed, including the corrected
  refund-email expectations (amount only, no course details). The shared-database
  Payload API initialization suite was excluded.
- TypeScript and scoped ESLint checks passed. No production build was run.
- `tests/fixtures/optional-course-products-database.sql` passed in a fresh,
  disposable PostgreSQL 15 database. It first exercises the existing billing and
  credit fixtures, then checks unchanged history, nullable/missing Product IDs,
  replay identity, invalid-ID rejection, payment and allocation, Cal association,
  old-ID preservation and mutation permissions.
- The local authenticated Student Admin page was verified in the Codex in-app
  browser: Billing and Schedule loaded, the four course counts defaulted to zero,
  and the empty form could not proceed to review. No actual bill was submitted.
- Actual hosted Stripe Checkout/payment/webhook and email delivery for the new
  flow remain separate sandbox acceptance; mock and database tests do not prove
  external provider acceptance.

Related: [course-credit checklist](../project/stripe-course-credits-checklist-20260921.md).
