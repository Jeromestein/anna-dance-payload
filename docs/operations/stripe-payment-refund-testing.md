# Stripe live payment and full-refund verification

Updated: September 11, 2026

Design and diagrams: [Payment and Billing Design](../project/account-billing.md).

## Current implementation

The website now has server-side Stripe Checkout, signed payment/refund notifications, verified historical import, and administrator-only full refunds. State lives in `app_payments`; itemized charges remain in `app_payment_items`. No invoice, refunds, or event tables were added.

Code completion is separate from provider acceptance. Stripe API and webhook credentials were configured in Vercel Production on September 17. No provider transaction or refund has been executed by this rollout, and live API reconciliation has not yet been verified. Local Admin also requires a fresh login. Do not claim live acceptance has passed until the evidence below is collected. The owner chose live operational verification; a sandbox round trip is not a prerequisite.

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
- [x] Register webhook destination `we_1UGlEfDRBUG2kOngMZHPyKVn`: own account, snapshot payload, API version `2026-07-29.dahlia`, seven accepted events, and the production `/api/integrations/stripe/webhook` URL. Its signing secret is saved as a Production-only Secret in Vercel. The destination is Disabled pending code deployment.
- [ ] Deploy the reviewed integration code, enable the registered destination, and verify signed delivery plus API access before marking live acceptance complete.

### September 17 recheck

- Vercel now has all five Stripe variables in Production: `STRIPE_MODE`, `STRIPE_ACCOUNT_ID`, `STRIPE_LIVE_PAYMENTS_ENABLED`, `STRIPE_SECRET_KEY`, and `STRIPE_WEBHOOK_SECRET`. Both secret saves returned success; a new deployment is still required. No existing deployment was redeployed.
- The Stripe implementation is prepared for a local commit; production deployment remains pending. The deployment revision and webhook HTTP result above are September 11 evidence, not a new production acceptance check.
- September 17 revalidation: all 44 tests across seven focused billing, Stripe, and Cal booking suites passed; TypeScript passed. Provider delivery and signed-in Account/Admin acceptance remain TODO.

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

Keep account and mode checks enabled. Historical sandbox records must remain labeled and excluded from real balances, even though sandbox acceptance is not part of this rollout.

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

Jason's original live USD 0.50 was located and its identity checked in the Dashboard on September 11. The original record has since been imported from current Dashboard evidence with audit provenance; API-based reconciliation remains pending configuration. In **Import an existing Stripe payment**, supply its `pi_...` ID and a meaningful charge description, then confirm ownership. The server retrieves current payment/refund evidence and requires a provider payer email matching the student's profile if there is no existing trusted association. It preserves the provider charge timestamp and deduplicates imports. An email mismatch must be resolved before importing; do not guess a user or create another charge.

For automatic Cal.com payments, the server requires Stripe metadata `identifier=cal.com`, `bookingId`, and `bookerEmail`, matching exactly one linked, signed Cal schedule record with `cal_booking_id` and the same attendee email. The signed Cal webhook now stores `payload.bookingId`. For old schedule rows this field remains null until a provider event is replayed. If the payment arrives first or the association is ambiguous, the Stripe endpoint returns a retryable error and logs the event ID. Replay the event after the schedule arrives or perform a verified import. No financial status is inferred from Cal booking creation alone.

## Recovery and limits

- **Refresh Stripe status** retrieves the current provider payment and refunds; it never creates a refund or charges a card. Stripe Dashboard refunds use the same notification/reconciliation path.
- Full refund requests reserve a database key before calling Stripe. Repeated submissions use the same key and stored reason. After an ambiguous failure, check Stripe first. Requests older than 23 hours are never automatically recreated because Stripe may discard idempotency keys after 24 hours.
- Existing pending, failed, canceled, or partially completed refunds are reconciled rather than automatically replaced with a new request. A failed request that needs another refund attempt requires manual provider review; automatic retry with a new key is not implemented.
- Checkout reuses its saved session/key. A provider-confirmed expired session can be replaced; an unknown session older than 23 hours needs manual reconciliation. Do not mark it paid/canceled manually while checkout is active.
- Disputed payments, incomplete captures, mismatched totals/currencies, wrong account/mode, and unusually large refund histories stop automated processing for review.
- Verified Stripe bills cannot be manually marked paid/refunded. Manual controls remain for externally handled records without provider synchronization.
- Unassociated events remain visible as delivery failures in Stripe Workbench and structured server logs. A separate website-wide unmatched-payment inbox, bulk backfill tool, and scheduled reconciliation worker are not implemented.
- Local tests use mocks and a disposable PostgreSQL instance. They do not prove Cal.com production metadata, API permissions, hosted webhook delivery, customer email delivery, or bank settlement.

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
- [ ] Configure the merchant's live credentials and endpoint signing secret; verify API access/account identity.
- [ ] Sign in to Admin, import an existing genuine live payment, and verify reconciliation. Verify full refund submission only for an intended actual refund.
- [ ] Verify live notification delivery, replay, intended Dashboard-initiated refunds, and both Account/Admin displays. Pending/failure and wrong-user cases have local automated coverage; confirm operational behavior when those cases occur without manufacturing live transactions.
- [ ] Verify actual Cal.com booking metadata, signed booking ID delivery, and a payment-before-booking replay.
- [x] Locate Jason's original successful live payment and match the Dashboard identity to his student profile.
- [x] Save Jason's original transaction through the atomic database import, preserving its actual payment/refund state and recording the current Dashboard evidence source.
- [ ] Reconcile the imported record through the API after read-only credentials are configured, and verify authenticated Account/Admin displays.
- [ ] Deploy code and live webhook configuration; verify account/endpoint settings and existing-record reconciliation before enabling intended live payment/refund initiation. No sandbox acceptance gate is required.

References: [Stripe refunds](https://docs.stripe.com/api/refunds/create), [webhook verification and retries](https://docs.stripe.com/webhooks), [live-mode testing restriction and late refund failures](https://docs.stripe.com/testing), [Cal.com payment metadata and direct charges](https://github.com/calcom/cal.diy/blob/main/packages/app-store/stripepayment/lib/PaymentService.ts).
