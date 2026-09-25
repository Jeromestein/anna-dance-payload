# Full-term course package sales

Status: implemented in the working tree. The database migration was applied on September 24, 2026; application deployment remains pending.

## Configuration and purchase flow

- `src/lib/billing/packages.ts` is the shared nine-package catalog, reconciled against `舞蹈课程与费用汇总_2026-09-24.csv`. All prices are USD per student for the full stated lesson count.
- Group IDs stay `level-1`, `level-2`, `level-3`. Duet IDs are `DUET-01`–`DUET-04`; solo IDs are `SOLO-01` and `SOLO-02`.
- `packageCatalog = '2026-09-24'` identifies this sale. It is not a semester start date. Assign a new identifier for the next term before selling it; do not change it for a price correction during the same sale.
- Guests see Free Placement links to `/schedule`. Course purchase routes and actions require a student session.
- Signed-in course links open `/classes/[packageId]`. A new purchase shows the student, time, duration, included lessons and full-term price, then offers Pay Online / Pay in Cash.
- The online choice prepares the bill, where the student confirms the saved amount and website terms before the existing Stripe Checkout opens. No charge occurs merely by selecting a package.
- Existing non-cancelled purchases open their saved bill, including Admin quotes, paid bills and refunded bills. Refunded orders retain their identity so a delayed refund reversal cannot collide with a second purchase of the same sale. Contact staff for exceptions.
- Cash remains unpaid until staff records verified receipt and a receipt reference. The student cannot confirm receipt or edit the amount. There is no cash discount calculator.

## Admin and existing records

The existing Create payment link form now defaults to a full-term package. Selecting a package populates its full price and fixed lesson count. Staff can change the total without changing the lessons, then use the existing copy-link and email controls.

If a different amount is needed after issuance, cancel the unpaid package bill and issue a new one. Cancellation first expires an open Stripe session and verifies that payment has not completed. Paid bills follow the existing refund process. An in-flight Checkout whose session ID has not yet been bound cannot be cancelled or changed blindly; wait for creation/status reconciliation.

The Admin payment-type menu offers only full-term course packages and other fees. Custom lesson counts is hidden from new payment requests. Historical four-category course bills are preserved and are not guessed into one of the nine package IDs.

The nine packages do not require manual Stripe Product setup. The existing one-time Checkout builds inline product details and collects the saved bill amount. Existing email and payment/refund reconciliation remain in use; this implementation task sends no emails or real payments.

## Additive database migration

`supabase/migrations/20260924210000_course_package_sales.sql` was applied to the configured Supabase project `hsitmgmcekzobksgtjoj` at 2026-09-24 20:11:51 UTC, after verifying the course-credit prerequisites. Do not reapply this non-idempotent migration. Its SHA-256 is `5e4dffe35a22cacdf4a49662ad877ec8448e11056be0bf7f78ce5ea9d92aba31`. The transaction used a three-second lock timeout and verified unchanged serialized-row fingerprints for the existing payment, payment item, and four schedule records before commit. RLS remains enabled and purchase RPC access remains server-only.

There is **no new course-package table**. Existing `app_payments` gains:

- `package_id` and `package_catalog` for identity and duplicate prevention;
- `package_snapshot` for the purchase-time name, schedule, duration, lessons and catalog price;
- `payment_preference` for cash selection, separate from confirmed `payment_channel`.

Each order retains one existing `app_payment_items` credit item. `amount_cents` is the immutable agreed total. Legacy course keys remain for scheduling compatibility. Existing credit availability derives from verified paid status; no separate repeatable credit-grant action is added.

Server-only RPCs issue/reuse purchases, select payment method and cancel unpaid packages. Student identity comes from verified claims. Catalog price and lesson count come from server configuration; only authorized staff may supply a different agreed amount.

A unique index plus a transaction lock prevents simultaneous purchases from duplicating orders. Cash orders cannot reserve Stripe checkout. Provider sessions must be expired before switching to cash; database locks reject a competing reservation. Package identity, snapshot, mode and amount cannot be rewritten after issuance. Sandbox purchases remain excluded from real credit balances.

Until migration, confirmation pages fail closed with an availability message. Historical billing reads fall back only for missing package columns, never for permission or connectivity errors. Migration must precede production purchase acceptance.

## Verification

- TypeScript and targeted ESLint pass; `pnpm build` was not run.
- Focused integration coverage includes catalog-to-CSV parity, Admin discounts preserving lessons, authentication/ownership, saved-price checkout, method-switch expiration and failure, and historical billing compatibility.
- Disposable local PostgreSQL 15 checks preserve historical rows, enforce RPC privileges/ownership, preserve Admin prices, keep unpaid cash credits unavailable, enable credits after receipt, isolate sandbox credits, reject unverified Stripe confirmation, and protect paid purchases from duplicate orders.
- Twelve concurrent requests return one bill and one credit item. A competing cash/online selection has one winner.
- Browser checks use the existing development server on port 3000: guest Classes / Schedule / login protection in Codex's in-app browser, and the existing authenticated Chrome session for nine course links and confirmation-page layout.
- After migration, the signed-in `/classes/level-1` page displays its confirmation checkbox and both payment choices. The unavailable enrollment message is gone. Cash selection is enabled; Pay Online is disabled because the existing port-3000 environment does not load Stripe configuration. The in-app browser still redirects guests to login. Isolated sandbox acceptance is recorded below; production purchase acceptance is still pending.

### Isolated Stripe sandbox acceptance — September 24, 2026

Executed the current application in `/tmp/anna-dance-billing-sandbox-20260917/app` on port 3005, with local Supabase on ports 54321/54322 and the configured Stripe sandbox account. Only synthetic student/staff identities were used. The existing port-3000 server and production environment were not changed during this test.

| Scenario | Observed result |
| --- | --- |
| Student purchases level-1 at $310 | Stripe hosted Checkout displayed $310 and 10 lessons. Public decline card was rejected; order remained unpaid and credits were not allocatable. Retrying with the public success card paid the same order. Signed Stripe events reconciled it to Paid, $0 due and 10 allocatable lessons. |
| Admin offers level-2 at $280 | Actual Admin Create payment link form saved $280 with 10 lessons. The student's `/classes/level-2` link redirected to that saved quote. Stripe charged the sandbox $280, and the paid order retained all 10 lessons. |
| Student selects cash for SOLO-01 | The $360 / 9 × 30-minute package displayed Awaiting cash payment, without a Stripe session or allocatable credits. Admin recorded the synthetic cash receipt; the student's bill then displayed Paid, cash, $0 due and the receipt reference. All 9 lessons became allocatable. |
| Reopen paid course | `/classes/level-1` redirected to the original paid bill without another payment button or duplicate order. |
| Ownership and environment | A second synthetic student could read zero rows belonging to the first student and could not call the payment-method mutation RPC (42501). All three orders had `stripe_livemode=false`; real course balances remained empty. |
| Callback replay and validation | Two locally signed replays referencing the verified Stripe payment both returned 200 without duplicate orders, credits or notices. Missing signature and mismatched live mode returned 400. |
| Payment-request and paid notices | Five outgoing email payloads were captured locally, including the $280 request and its correct bill link, plus two customer/staff payment-notice pairs. All recipients were synthetic. No email was delivered externally. |

The initial level-1 payment-intent event returned a retryable 503 while concurrent notification delivery was in progress; the companion Checkout event returned 200. Both notices completed once, and subsequent replays returned 200. Both level-2 provider events returned 200.

Browser testing exposed a return-page delay: the bill could continue displaying Awaiting payment confirmation after the webhook had saved payment. `BillingPaymentStatus` now refreshes pending bills every five seconds for up to twelve checks and retains a manual Check payment status button. It unmounts on the paid view. The discounted payment's return page reached Paid without a manual reload in the Codex in-app browser. Two focused timer/cleanup tests and ten related purchase/page tests passed; TypeScript and targeted ESLint passed.

Local evidence: `course-acceptance-20260924.json`, `course-stripe-listener.log`, and `course-mail-capture.jsonl` under the isolated temporary directory. These are test evidence, not production records. Native browser inspection verified student paid/cash pages and Admin quote/receipt forms. This run covers representative shared payment paths, not nine separate Stripe purchases. Live money, actual email delivery, bank settlement, and new refund initiation were not tested in this run.

The temporary port-3005 application and Stripe CLI listener were stopped after verification. The user's existing port-3000 server remains running. The pre-existing local Supabase service and synthetic evidence records were retained.

Reproduce SQL tests only in a fresh disposable local database:

```sh
psql -X -v ON_ERROR_STOP=1 -h "$TEST_SOCKET" -p "$TEST_PORT" -d package_test \
  -f tests/fixtures/course-package-sales-database.sql
python3 tests/fixtures/course-package-sales-concurrency.py "$TEST_SOCKET" "$TEST_PORT" package_test
```

The concurrency script accepts only temporary `/tmp/anna-package-pg.*` sockets and `package_test*` databases. Never run these fixtures against the application database.

Before production acceptance, deploy the code and verify deployment-specific configuration and real email delivery to an approved test recipient. Keep the configured live-payment opt-in unchanged until a deliberate release.

### Student cancellation of unpaid orders

Students can select **Cancel order** from an expanded Billing record or its detail page, then confirm or keep the order. Only their own unpaid course-package orders are eligible. Paid, refunded, and payment-verification records do not offer cancellation. Cancelled orders have no balance due and appear in a collapsed **Cancelled orders** history; students can select the course again from Classes. Cancellation also discards any previously agreed discounted price for that order.

The server verifies ownership, reconciles or expires any existing Stripe Checkout, and calls the existing locked `app_cancel_package` RPC. A completed payment, unresolved checkout reservation, or concurrent status change prevents cancellation. This feature requires no additional database migration.

Verified in the Codex in-app browser using synthetic local records on port 3005: cancelling an unpaid cash order, reopening the same course to create a new order, and cancelling that new unpaid online order after opening Stripe sandbox Checkout. Both orders reached Cancelled with $0 due; Stripe independently reported the former session as `expired` and `unpaid`. Billing displayed both records inside its initially collapsed cancellation history. No live payment or production record was changed. Focused regression tests, TypeScript, and targeted ESLint passed.
