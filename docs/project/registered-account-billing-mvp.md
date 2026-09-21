# Registered-account billing MVP

Implementation: September 21, 2026. Local implementation and isolated verification only;
production rollout and provider delivery acceptance are still pending.

## Operator and account-holder flow

1. A family registers using the existing Student account flow. Existing email and Google
   registration notifications now include a direct Admin account link. Email signup notification
   still occurs on signup submission; the account email must be verified before billing email
   can be sent. This release retains the existing one-student-per-login data model.
2. Admin opens **Students → student → Billing → Create bill**. The default **Custom total ·
   classes or camp** requires a course name, 1–100 lessons or days, a final USD total, and a
   description of dates/coverage/discounts. Existing per-lesson and general itemized billing
   remain available. Review and confirmation precede issuance.
3. A custom total is one immutable charge. Lesson/day count is included in its description;
   $100.01 covering three lessons stays exactly $100.01, without rounding a per-lesson rate.
4. Admin clicks **Send payment email** after creating the bill. The owner sees the pending bill
   immediately in My Account even if email fails. Copy-link and preview controls remain available.
5. Email links target `NEXT_PUBLIC_SITE_URL/account/billing/<bill-id>`. Login preserves this
   destination. Only the authenticated owner can view or pay the bill. The server derives owner
   identity from the session and prices from the saved bill.
6. The account holder reviews the bill, agrees to the existing Website Terms of Use, optionally
   leaves a teacher message, and opens Stripe Checkout. This acknowledgement is stored once per
   bill. On subsequent visits the saved message is read-only. The existing full enrollment
   agreement and liability waiver must still be signed separately before participation.
7. A signed Stripe webhook reads provider evidence, updates the existing financial record, and
   sends separate payment confirmations to the verified account email and Academy inbox. The
   account dashboard and Admin use that saved status; a browser redirect never marks a bill paid.
   Already-open dashboards need refresh. No paid Stripe invoice feature is enabled.

## Notification integrity and recovery

- `app_billing_notifications` is a service-only outbox. The verified transition to Paid enqueues
  both confirmations in the same database transaction. It excludes historical imports without a
  website Checkout reservation. Existing payments are not backfilled or emailed by this migration.
- Each bill has one request, one account-holder confirmation, and one Academy confirmation.
  Atomic claims, a two-minute lease, stored message/recipient snapshots, and Resend idempotency keys
  protect duplicate clicks, concurrent webhooks, timeouts, and retries.
- Provider acceptance is shown in Admin; it is not a claim of inbox delivery. Repeated clicks do
  not send another copy of an already accepted notice. The buttons retry unsent notices rather
  than acting as repeated reminders.
- Payment stays Paid if email fails. The webhook returns 503 to request a retry. Admin can also
  use **Retry pending confirmation emails**. There is no scheduled background worker.
- After 23 hours from an ambiguous first send attempt, the notice becomes `review`. Check Resend
  delivery history using the saved provider ID/idempotency key before operator recovery; do not
  delete the row or automatically create a new key. Resend's idempotency retention is 24 hours:
  [provider documentation](https://resend.com/docs/dashboard/emails/idempotency-keys).
- A request for a no-longer-unpaid bill, or a pending success confirmation after a refund, is
  suppressed at claim time. Email payloads and teacher messages are not public data.

## Rollout prerequisites

Apply migrations before deploying this code; bill queries now include the acknowledgement relation:

1. `20260917200000_issue_package_bills.sql` (existing pending package-billing migration).
2. `20260921200000_billing_notifications.sql` (new outbox, acknowledgement, permissions, and functions).

Configuration:

| Setting                                                | Purpose                                                                                                     |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL`                                 | Trusted website origin used in email links                                                                  |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL`                  | Existing email transport and verified sender                                                                |
| `BILLING_NOTIFICATION_TO`                              | Optional Academy payment confirmation recipient; falls back to signup/contact recipient, then Academy email |
| `BILLING_EMAIL_TEST_TO`                                | Required recipient override for every sandbox billing notice, including school notices                      |
| Existing Stripe mode, account, API key, webhook secret | Must belong to the same environment                                                                         |
| `STRIPE_LIVE_PAYMENTS_ENABLED`                         | Existing explicit live-Checkout switch; not changed in this task                                            |

Confirm Checkout write permissions and webhook configuration separately before enabling live
collection. Environment/server-route changes require restarting the user's local dev server.
No production database, Stripe settings, deployment, or real emails were changed during this work.

## Verification

- 158 automated tests passed (25 suites). Excluded the existing Payload API suite that initializes
  the shared database. Covered amount accuracy, owner/staff authorization, Checkout session reuse,
  confirmation persistence, provider failure, duplicate notification claims, and sandbox routing.
- New migration and prior billing migrations passed real PostgreSQL tests in a disposable local
  database, including owner isolation, immutable retry payloads, stale-attempt handling, atomic
  payment outbox insertion, replay deduplication, and RLS for teacher notes.
- Typecheck passed. Lint passed with two existing warnings in an older ignored preview fixture.
  No production build was run.
- Codex in-app browser checked the actual UI components using an isolated preview: custom-total
  creation/review, email-button feedback, account bill form, Paid dashboard record, and 390px
  mobile layout. Synthetic actions did not call Stripe, send mail, or write to the shared database.
  The existing local Next.js server also preserved the individual bill destination when redirecting
  an unauthenticated visitor to login.
- Still pending: deployed migrations, authenticated full-stack acceptance, real Stripe sandbox
  Checkout plus signed webhook, and actual delivery to the intended customer and Academy inboxes.

The earlier lesson-package core has separate [sandbox acceptance evidence](../operations/package-payment-acceptance.md): September 17 Checkout and Admin full refund completed with signed HTTP 200 deliveries and preserved 10-lesson detail. September 21 current-source checks verified the refunded bill layout and wrong-owner denial. These checks do not complete the new acknowledgement and notification end-to-end flow above.
