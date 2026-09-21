# Registered-account billing MVP

> September 21 course-credit extension: a new locally implemented mode uses one negotiated total with separate included-course counts. See the [course-credit checklist](stripe-course-credits-checklist-20260921.md) and [local acceptance/rollout limits](../operations/course-credits-local-acceptance-20260921.md). The earlier modes and evidence below remain historical context.

Implementation: September 21, 2026. Production migrations and deployment are now recorded;
the consented customer sandbox payment/refund flow and branded emails are verified. Live Checkout
enablement and concurrent-webhook retry acceptance remain pending. See the
[release checkpoint](../operations/billing-release-acceptance-20260921.md).

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

Track actual delivery acceptance and remaining refund-failure/booking/offline notices in the existing
[central email checklist](../operations/production-email-notification-acceptance-checklist.md#current-coverage-and-next-checks--september-21-2026).

- `app_billing_notifications` is a service-only outbox. The verified transition to Paid enqueues
  both confirmations in the same database transaction. It excludes historical imports without a
  website Checkout reservation. Existing payments are not backfilled or emailed by this migration.
- Each bill has at most one request, one payment confirmation per recipient, and one full-refund
  confirmation per recipient. Verified full Stripe refunds of existing paid records queue customer
  and Academy notices, including previously imported paid bookings. Already-refunded first imports
  and historical records are not backfilled; manual offline refunds are outside this flow.
  Atomic claims, a two-minute lease, stored message/recipient snapshots, and Resend idempotency keys
  protect duplicate clicks, concurrent webhooks, timeouts, and retries.
- Provider acceptance is shown in Admin; it is not a claim of inbox delivery. Repeated clicks do
  not send another copy of an already accepted notice. The buttons retry unsent notices rather
  than acting as repeated reminders.
- Financial status stays Paid or Refunded if email fails. The webhook returns 503 to request a retry. Admin can also
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
3. `20260921210000_refund_notifications.sql` (full-refund outbox trigger and claim guards).

Configuration:

| Setting                                                | Purpose                                                                                                     |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL`                                 | Trusted website origin used in email links                                                                  |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL`                  | Existing email transport and verified sender                                                                |
| `BILLING_NOTIFICATION_TO`                              | Optional Academy payment/refund confirmation recipient; falls back to signup/contact recipient, then Academy email |
| `BILLING_EMAIL_TEST_TO`                                | Required sandbox customer recipient; also the default sandbox Academy recipient                             |
| `BILLING_EMAIL_TEST_ADMIN_TO`                          | Optional explicitly authorized sandbox Academy recipient; falls back to `BILLING_EMAIL_TEST_TO`, never the live recipient |
| Existing Stripe mode, account, API key, webhook secret | Must belong to the same environment                                                                         |
| `STRIPE_LIVE_PAYMENTS_ENABLED`                         | Existing explicit live-Checkout switch; not changed in this task                                            |

Confirm Checkout write permissions and webhook configuration separately before enabling live
collection. Environment/server-route changes require restarting the user's local dev server.
The original implementation did not change production databases, Stripe settings or deployment.
The subsequent authorized sandbox email test below sent three real emails to the designated test inbox.

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
- September 21 authorized delivery acceptance: Admin issued a USD 2.50 / two-lesson sandbox bill,
  sent its request, and completed **Pay test bill** with a Stripe test card. Signed events saved Paid;
  the request plus customer and Academy confirmations all arrived at `errplusone@gmail.com` via
  the sandbox override. Admin retry preserved the three existing provider IDs without duplicates.
  See the [inbox evidence and concurrent-webhook caveat](../operations/production-email-notification-acceptance-checklist.md#authorized-sandbox-inbox-acceptance--september-21-2026).
- A subsequent authorized sandbox payment delivered the Academy confirmation to
  `annadanceacademy@gmail.com`, with customer notices separately routed to `errplusone@gmail.com`.
  The new optional sandbox Admin override and its isolation checks passed 16 tests, typecheck and
  scoped ESLint. [Separate inbox evidence](../operations/production-email-notification-acceptance-checklist.md#separate-academy-inbox-acceptance--september-21-2026).
- The consented USD 3.01 customer flow subsequently completed login return, teacher-note storage,
  close/reopen, decline/success, two-tab session reuse, signed financial synchronization and Admin
  full refund. Branded payment and refund emails reached both authorized Gmail inboxes at
  13:26/13:28 PDT. [Current evidence](../operations/billing-release-acceptance-20260921.md).
- Still pending: live Checkout configuration and live email acceptance, plus hosted signed event
  redelivery after concurrent notice-claim 503 responses. Production migrations are recorded in the
  [separate rollout](../operations/billing-production-migration-20260921.md).

The earlier lesson-package core has separate [sandbox acceptance evidence](../operations/package-payment-acceptance.md): September 17 Checkout and Admin full refund completed with signed HTTP 200 deliveries and preserved 10-lesson detail. September 21 current-source checks verified the refunded bill layout and wrong-owner denial. These checks do not complete the new acknowledgement and notification end-to-end flow above.

### Full-refund mail acceptance — September 21, 2026

Customer and Academy refund notices were verified in separate Gmail inboxes after Admin refunded
a USD 2.50 sandbox bill. The refunded Admin UI and duplicate-safe retry were verified in-app.
The migration was subsequently applied in the [production rollout](../operations/billing-production-migration-20260921.md); live refund-mail delivery remains pending. See the
[refund acceptance record](../operations/production-email-notification-acceptance-checklist.md#full-refund-inbox-acceptance--september-21-2026)
for recipients, provider references, tests and the concurrent-webhook retry caveat.
