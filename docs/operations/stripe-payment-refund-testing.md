# Stripe payment and full-refund verification

Updated: September 17, 2026

Design and diagrams: [Payment and Billing Design](../project/account-billing.md).

## Current implementation

The website now has server-side Stripe Checkout, signed payment/refund notifications, verified historical import, and administrator-only full refunds. State lives in `app_payments`; itemized charges remain in `app_payment_items`. No invoice, refunds, or event tables were added.

Code completion is separate from provider acceptance. Stripe API and webhook credentials were configured in Vercel Production on September 17. No live transaction or refund has been initiated by this rollout. Live API reconciliation and duplicate signed delivery were verified on September 17; actual live refund acceptance remains pending. The isolated sandbox acceptance results below cover test payment and refund initiation. The production Admin view and its Stripe refresh action passed after administrator login on September 17. Do not claim live acceptance has passed until the evidence below is collected. The owner subsequently chose sandbox testing to avoid using a personal credit card. Test payment and refund initiation in the sandbox; preserve the production read-only synchronization configuration.

## Sandbox setup and acceptance — September 17

The existing **Anna Dance Academy 沙盒** account is `acct_1U02vtDKpszykgKY`. The Dashboard confirms this is an isolated sandbox. It is separate from the live merchant account and its legacy Test mode.

The restricted key **Anna Dance billing sandbox** has Accounts Read, Payment Intents Read, Charges and Refunds Write, Checkout Sessions Write, and Stripe CLI → Debugging Tools Write. The owner explicitly approved the additional CLI scope before it was saved. All other resources remain None. Account retrieval, Checkout creation/expiration, refund reads/writes, and CLI authentication passed against the sandbox account. Debugging Tools Write supports local forwarding; the application itself uses the other four permissions.

For local verification, use Stripe CLI to forward only the seven supported events to the isolated test application's `/api/integrations/stripe/webhook` route. Use the CLI listener's signing secret; it is different from the production destination secret. A localhost receiver does not require registering a public Dashboard destination. Do not forward sandbox events to the production website or start the listener against the existing development server until its database and account configuration are verified as isolated.

Keep credentials in the Git-ignored `.env.stripe-sandbox.local` file with owner-only access. This filename is deliberately not loaded automatically by Next.js. It holds sandbox Stripe settings only; do not copy production database credentials into the test environment. The isolated application and local Supabase database are now running independently from the existing development server and production database.

- [x] Locate the existing sandbox and confirm its account ID and test banner.
- [x] Prepare and inspect the four restricted-key permission selections.
- [x] Create the restricted key after approval; securely save it and verify account identity.
- [x] Configure local webhook forwarding and privately save its signing secret; verify the explicitly approved CLI-specific permission.
- [x] Configure an isolated test database and test application before forwarding events.
- [x] Complete Checkout with Stripe test cards; verify one bill/item per payment, Paid status, and authenticated Account/Admin views.
- [x] Request a full refund from Admin and from the sandbox Dashboard; verify signed notifications and final database state.
- [x] Verify declined payments, pending/failed refunds, concurrent refund requests, locally signed duplicate delivery, and wrong-user database access.
- [ ] Confirm how Cal.com can participate in isolated testing; do not treat website Checkout tests as proof of the Cal.com booking path.

### Sandbox acceptance evidence

All amounts below are simulated USD 0.50 payments in `acct_1U02vtDKpszykgKY`; no real card or live charge was used. Stripe-hosted Checkout was completed in the Codex in-app browser using public Stripe test cards. Actual signed provider notifications were delivered through Stripe CLI to the local application.

| Scenario | PaymentIntent | Verified result |
| --- | --- | --- |
| Decline, recover, website refund | `pi_3UGmJBDKpszykgKY1e6Wr3Uo` | Card ending 0002 was declined and the bill stayed Unpaid. Retrying with 4242 paid the same bill. The authenticated Admin review/confirmation created refund `re_3UGmJBDKpszykgKY1zVFxxvb`; final state is Fully refunded. |
| Dashboard refund, asynchronous success | `pi_3UGmR5DKpszykgKY0juRRUCp` | Card ending 7726 paid successfully. A full refund from the sandbox Dashboard produced `paid/pending` at 21:04:27 UTC; `refund.updated` changed it to `refunded/succeeded` at 21:06:30 UTC. Refund: `re_3UGmR5DKpszykgKY0ErIE1OB`. |
| Concurrent requests, late failure | `pi_3UGmVbDKpszykgKY0sjcE3z9` | Card ending 5126 paid successfully. Two concurrent calls to the actual refund service produced exactly one Stripe refund, `re_3UGmVbDKpszykgKY0pfa6XEN`. Initially succeeded; genuine event `evt_3UGmVbDKpszykgKY0lY4KgwS` returned HTTP 200 at 21:08:51 UTC and corrected the bill to `paid/failed`, zero refunded cents, and no completed-refund timestamp. |

- Genuine Checkout/payment/refund notifications all returned HTTP 200. The receiver verifies the signature and reads fresh Stripe evidence before the atomic database update.
- Final inspection found exactly three bills, three items, and one provider refund per payment. The first two refunds succeeded; the third failed as intended. All records have `stripe_livemode=false` and remain excluded from real balances.
- Two **locally generated, correctly signed** duplicate payment notifications for the already-refunded first transaction each returned HTTP 200; the bill stayed refunded, with one bill and one item. These are local replay assertions, distinct from the genuine provider deliveries and the earlier production Dashboard replay.
- Authenticated Student A saw Paid with USD 0.00 due, then Fully refunded; Admin showed the same records. The late-failure case showed Paid plus the failure warning, with no repeat-refund action. In-app visual inspection passed. Student B could not read Student A's bill and received permission denial when calling the private Stripe RPC. An unsigned HTTP request to the running local receiver returned 400. Retrying the failed refund through the actual service only reconciled the existing refund; its provider count remained one.
- The seven focused billing/Stripe suites passed (40 tests), TypeScript passed, and targeted ESLint passed. No production build was run.
- Fixed a CSS Modules compilation error found while opening Account under webpack: the two page-wide mobile rules now live in global CSS, preserving their selectors and behavior. Account rendered successfully afterward, including the mobile Billing view.
- Fixed the configured-but-disabled refund message. A local component fixture verified that it explains website initiation is disabled and directs administrators to Stripe; the final refund button stays disabled. This fixture exists only in the disposable test copy.

### Local sandbox operating notes

- Application: `http://localhost:3005`; Admin student page: `/admin/students/e1dfdda1-1128-4ca9-bdb9-ea97e1059104`. The existing server on port 3000 was not restarted.
- Disposable workspace: `/private/tmp/anna-dance-billing-sandbox-20260917`. `app/` is a source copy with shared dependencies; `services/` owns the local Supabase stack. Source edits must be copied into this test app before retesting.
- Supabase API is `http://127.0.0.1:54321`, PostgreSQL is local port 54322. All repository migrations were applied to this database. Only synthetic administrator/student accounts were seeded.
- Test-only login details are stored in `test-identities.private.json`; local service credentials are in `supabase-status.private.json` and `app/.env`, with owner-only permissions. Do not commit or publish these files. No production database, email, storage, Google or Cal credentials were copied.
- Development command from `app/`: `WATCHPACK_POLLING=1000 next dev --webpack --port 3005 --hostname 127.0.0.1`, using Node 24 and the installed Next executable. Polling avoids the local file-watcher limit. Both the app and local webhook forwarder must be running to receive events.
- The official Stripe CLI uses `XDG_CONFIG_HOME=/private/tmp/anna-stripe-cli`, the sandbox key through `STRIPE_API_KEY`, and the seven documented event types, forwarding to `http://127.0.0.1:3005/api/integrations/stripe/webhook`. Its secret is never printed. Redacted delivery evidence is in `stripe-listener.log`; final record assertions are in `acceptance-results.json`.
- These local services are temporary, not a hosted staging deployment. Restart the isolated services and verify the sandbox account/local database before future tests; never reuse the production webhook secret.

## Live connection checkpoint — September 11

- Confirmed the intended Vercel project is `everlove-foundations-projects/anna-dance-payload`. Its latest listed production deployment is Ready at `c95dfe1`; the new Stripe integration is prepared locally and has not been deployed.
- A POST to the production Stripe webhook route returns HTTP 404. The new route must be deployed before hosted delivery can succeed.
- The initial Vercel check had no Stripe variables. Production now has `STRIPE_MODE=live`, the verified `STRIPE_ACCOUNT_ID`, and `STRIPE_LIVE_PAYMENTS_ENABLED=false`; the save succeeded and requires a new deployment to take effect. API and webhook secrets were added as Production-only Secret variables on September 17. Local `.env` still has no Stripe configuration and `.env.local` is absent. No secret values were revealed.
- Merchant login completed. The live Anna Dance Academy Dashboard shows Jason's original USD 0.50 payment as Succeeded with no refund activity. Cal.com metadata includes the matching student identity and booking ID; the database has exactly one matching student profile. The original transaction has now been imported after inspecting the current live charge in the authenticated Dashboard; no charge or refund was initiated.
- The approved restricted key `Anna Dance billing sync - live read only` was issued on September 17 after email and phone verification. Only Accounts Read, Payment Intents Read, and Charges and Refunds Read were selected. Its value was saved as the Production-only `STRIPE_SECRET_KEY` Secret in Vercel; it was not printed or committed. Checkout and refund write permissions remain excluded.
- The historical import used the existing atomic, transaction-deduplicating database function and recorded Dashboard verification provenance in private audit history. It retained the charge timestamp `2026-09-06T22:28:44Z`, gross USD 0.50, the original provider/booking references, and one item describing the original Cal booking payment. No card data was added to the database.
- A read using the billing UI's selected fields returned one Paid bill, one item, zero balance due, and All paid. The in-app Admin page redirects to login, so populated authenticated UI acceptance remains open.

- [x] Complete merchant login and locate the original transaction with matching student identity.
- [x] Save production account/mode settings with live initiation disabled.
- [x] Complete Stripe identity verification and save the approved read-only key in Vercel Production.
- [x] Register webhook destination `we_1UGlEfDRBUG2kOngMZHPyKVn`: own account, snapshot payload, API version `2026-07-29.dahlia`, seven accepted events, and the production `/api/integrations/stripe/webhook` URL. Its signing secret is saved as a Production-only Secret in Vercel. The destination was enabled after deployment on September 17 and is Active.
- [x] Deploy the integration code, enable the registered destination, and verify signed payment delivery plus API read access. Refund and authenticated UI acceptance remain separate checks.

### September 17 configuration and production verification

- Vercel now has all five Stripe variables in Production: `STRIPE_MODE`, `STRIPE_ACCOUNT_ID`, `STRIPE_LIVE_PAYMENTS_ENABLED`, `STRIPE_SECRET_KEY`, and `STRIPE_WEBHOOK_SECRET`. Both secret saves returned success; they are now active in the production deployment.
- The user pushed `3f6b67d` (Stripe integration) and `ca8e406` (subsequent portrait change). Vercel lists `ca8e406` as Production Ready, including the payment integration. The September 11 deployment and HTTP 404 observations above are historical.
- September 17 revalidation: all 44 tests across seven focused billing, Stripe, and Cal booking suites passed; TypeScript passed. Signed-in Student Account and real refund acceptance remain TODO; payment delivery and Admin evidence follows.

### Production acceptance evidence — September 17, 2026

- An unsigned POST to the production webhook returned HTTP 400 with `Invalid signature.`; the route is deployed and rejects unsigned payloads.
- Enabled destination `we_1UGlEfDRBUG2kOngMZHPyKVn`. It subscribes to the seven documented events from the academy account.
- Replayed the existing genuine `payment_intent.succeeded` event `evt_3UCoX3DRBUG2kOng0WrgkATZ` twice using Stripe Workbench Shell (`stripe events resend` with that destination). This did not create a payment or refund.
- Stripe Event deliveries showed two successful HTTP 200 responses, zero failed deliveries, and response body `{"status":"synchronized"}`. This exercised the hosted signature check, account identity check, restricted-key reads of the current payment/charge/refunds, and atomic database synchronization.
- After both deliveries, the database still contained exactly one matching bill and one item for `pi_3UCoX3DRBUG2kOng0aJ1GrLV`: gross USD 0.50, paid USD 0.50, status `paid`, refund state `none`, and no sync error. The second observed sync time was `2026-09-17T20:06:22.984Z`, with the same event ID recorded.
- After administrator login in the Codex in-app browser, Jason's production Admin page showed All paid, one itemized USD 0.50 Paid bill, USD 0.00 due, the original September 6 payment date, and the correct PaymentIntent. Clicking Refresh Stripe status returned `Payment and refund status refreshed from Stripe.` The full-refund review opened with the same student, transaction, item, and USD 0.50 amount; it was canceled without a request. Visual inspection passed. Student Account ownership/display, new Cal booking association, and actual intended full refunds remain open.
- `STRIPE_LIVE_PAYMENTS_ENABLED=false` and read-only key permissions remain unchanged. Website Checkout/refund initiation is not enabled by these tests.

## Configure the live environment

Use the merchant account that actually owns the payment. The integration uses that account's own API key and verifies `/v1/account` against `STRIPE_ACCOUNT_ID`. It does not impersonate Cal.com's Connect platform or guess a connected account. Verify access to the academy's actual payments before accepting the integration.

Set these server-only values in the deployment environment and `.env.local` for local verification. Never paste credentials into chat or commit them:

```dotenv
STRIPE_MODE=live
STRIPE_SECRET_KEY=rk_live_...
STRIPE_ACCOUNT_ID=acct_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_LIVE_PAYMENTS_ENABLED=false
NEXT_PUBLIC_SITE_URL=https://www.annadanceacademy.com
```

The live initiation flag can remain false while importing existing payments and reconciling status. Set it to true when actual website payment/refund initiation is intended and configuration has been verified. This is an operational switch, not a sandbox acceptance requirement. For local checkout return URLs use `http://localhost:3000` instead of the production origin.

Configure the live webhook endpoint at `https://www.annadanceacademy.com/api/integrations/stripe/webhook` after deploying this route. Subscribe to `payment_intent.succeeded`, `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `charge.refunded`, `refund.created`, `refund.updated`, and `refund.failed`. Use that endpoint's own signing secret. A local forwarder has a separate signing secret. Restart the existing development server in VS Code after environment or server-route changes. Do not run a production build for local verification.

Keep account and mode checks enabled. Sandbox records must remain labeled and excluded from real balances. New sandbox tests use an isolated test database.

## Verify with existing real payments

Stripe prohibits testing in live mode using real payment details. Do not create an artificial $0.50 purchase just to exercise refunds. Use existing real transactions for reconciliation and only issue a refund when it is actually intended. See [Stripe's testing guidance](https://docs.stripe.com/testing).

1. Sign in to `/admin`; open **Student → Jason → Billing → Stripe payments & testing**. Locate the original reported USD 0.50 transaction in the merchant's live account. If it exists only in test mode, do not relabel or import it as real money.
2. Use **Import an existing Stripe payment** with the verified PaymentIntent and charge description. Confirm the original amount, timestamp, payer ownership, and current refund state in both Admin and Student Account.
3. Use **Refresh Stripe status** to confirm reconciliation is repeatable and does not duplicate the bill. This action neither charges a card nor requests a refund.
4. For a paid bill that genuinely needs a full refund, enable live initiation, select **Refund payment**, enter the actual reason, review the full amount, and confirm once. This sends real money back; repeated submissions must reuse the original request.
5. Check Stripe and the website. A requested/pending refund retains Paid with Refund processing. Provider-confirmed completion sets Fully refunded. A later provider failure for the same full refund must correct the website to Paid with Refund failed and preserve the earlier observation in the audit history.
6. Verify signed delivery and the same final bill in Account and Admin. Refreshing or replaying an old payment event must not undo a refund; current provider evidence determines the state.
7. Verify automatic payment ingestion when the next genuine booking or bill payment occurs. The checkout return page alone must not mark the bill Paid. Do not create a new artificial purchase for acceptance.

## Existing payments and Cal.com

Jason's original live USD 0.50 was located and its identity checked in the Dashboard on September 11. The original record was imported from Dashboard evidence with audit provenance and subsequently reconciled through the API and genuine signed event replay on September 17. In **Import an existing Stripe payment**, supply its `pi_...` ID and a meaningful charge description, then confirm ownership. The server retrieves current payment/refund evidence and requires a provider payer email matching the student's profile if there is no existing trusted association. It preserves the provider charge timestamp and deduplicates imports. An email mismatch must be resolved before importing; do not guess a user or create another charge.

For automatic Cal.com payments, the server requires Stripe metadata `identifier=cal.com`, `bookingId`, and `bookerEmail`, matching exactly one linked, signed Cal schedule record with `cal_booking_id` and the same attendee email. The signed Cal webhook now stores `payload.bookingId`. For old schedule rows this field remains null until a provider event is replayed. If the payment arrives first or the association is ambiguous, the Stripe endpoint returns a retryable error and logs the event ID. Replay the event after the schedule arrives or perform a verified import. No financial status is inferred from Cal booking creation alone.

The hosted Cal.com booking flow has not been verified to support a merchant-selectable Stripe sandbox. Configuring test credentials in this website does not change Cal.com's connected payment environment. Do not require a new paid booking just for testing. Use the existing payment and booking evidence, isolated association/retry tests, and verification of the next genuine booking; retain full hosted Cal.com acceptance as pending until it is actually observed.

## Recovery and limits

- **Refresh Stripe status** retrieves the current provider payment and refunds; it never creates a refund or charges a card. Stripe Dashboard refunds use the same notification/reconciliation path.
- Full refund requests reserve a database key before calling Stripe. Repeated submissions use the same key and stored reason. After an ambiguous failure, check Stripe first. Requests older than 23 hours are never automatically recreated because Stripe may discard idempotency keys after 24 hours.
- Existing pending, failed, canceled, or partially completed refunds are reconciled rather than automatically replaced with a new request. A failed request that needs another refund attempt requires manual provider review; automatic retry with a new key is not implemented.
- Checkout reuses its saved session/key. A provider-confirmed expired session can be replaced; an unknown session older than 23 hours needs manual reconciliation. Do not mark it paid/canceled manually while checkout is active.
- Disputed payments, incomplete captures, mismatched totals/currencies, wrong account/mode, and unusually large refund histories stop automated processing for review.
- Verified Stripe bills cannot be manually marked paid/refunded. Manual controls remain for externally handled records without provider synchronization.
- Unassociated events remain visible as delivery failures in Stripe Workbench and structured server logs. A separate website-wide unmatched-payment inbox, bulk backfill tool, and scheduled reconciliation worker are not implemented.
- Automated tests use mocks and disposable databases. The additional sandbox acceptance above proves actual test-mode API permissions, Checkout, refunds, and signed local forwarding. It does not prove Cal.com booking integration, production write permissions, customer email delivery, or bank settlement. Hosted production delivery was verified separately using the existing genuine payment event.

## Acceptance checklist

- [x] Add official Stripe SDK, server-only environment/account checks, and an explicit live-money enable flag.
- [x] Add Checkout based on immutable server-side bill amounts and reserved checkout tokens.
- [x] Add signed notifications, trusted student association, verified import, and current-state reconciliation.
- [x] Add full-refund requests with admin authorization, stable idempotency, database locking, and persisted pending/failed/completed states.
- [x] Keep test bills visibly marked and out of real balances; add the Admin $0.50 test entry.
- [x] Apply migration `20260910180000_connect_stripe_billing.sql` to the intended Supabase project after disposable-database validation. There were zero payments before and after; no test or real payment was inserted there.
- [x] Apply corrective migration `20260910193000_handle_stripe_refund_reversals.sql` after disposable PostgreSQL assertions passed. A verified later failure of the same full refund now corrects prior success while retaining audit history. Production payment count remained zero; authenticated clients cannot call the private Stripe RPC.
- [x] Verify focused local tests, TypeScript, targeted ESLint, and actual PostgreSQL 15 constraints, including two concurrent refund reservations producing one key and one stored reason.
- [x] Verify Admin test/import controls and refund confirmation/error handling in desktop and 390px Codex in-app component previews. The actual Admin page redirects to login; authenticated/provider-backed acceptance remains pending. The actual local Stripe webhook returns HTTP 503 when credentials are absent.
- [x] Configure the merchant's live credentials and endpoint signing secret; verify API access/account identity through successful hosted reconciliation.
- [ ] Sign in to Admin, import an existing genuine live payment, and verify reconciliation. Verify full refund submission only for an intended actual refund.
- [ ] Verify live notification delivery, replay, intended Dashboard-initiated refunds, and both Account/Admin displays. Pending/failure and wrong-user cases have local automated coverage; confirm operational behavior when those cases occur without manufacturing live transactions.
- [ ] Verify actual Cal.com booking metadata, signed booking ID delivery, and a payment-before-booking replay.
- [x] Locate Jason's original successful live payment and match the Dashboard identity to his student profile.
- [x] Save Jason's original transaction through the atomic database import, preserving its actual payment/refund state and recording the current Dashboard evidence source.
- [x] Reconcile the imported record through the API with read-only credentials; replay the same genuine event twice without duplicate bills/items.
- [x] Verify the authenticated Admin display and Refresh Stripe status action for the reconciled record in the Codex in-app browser.
- [ ] Verify the Student Account display while signed in as the actual student.
- [x] Improve and visually verify the refund-unavailable message for a configured read-only integration: explain that website initiation is disabled and administrators can refund in Stripe, then refresh.
- [x] Deploy code and enable the live webhook; verify account/endpoint settings and existing-record reconciliation.
- [x] Complete sandbox website Checkout/refund acceptance, including provider asynchronous outcomes, before deciding whether to enable live website initiation under a separately approved permission scope. Cal.com sandbox integration remains a separate TODO.

References: [Stripe refunds](https://docs.stripe.com/api/refunds/create), [webhook verification and retries](https://docs.stripe.com/webhooks), [live-mode testing restriction and late refund failures](https://docs.stripe.com/testing), [Cal.com payment metadata and direct charges](https://github.com/calcom/cal.diy/blob/main/packages/app-store/stripepayment/lib/PaymentService.ts).
