# Billing release acceptance — September 21, 2026

## Scope and release decision

Checks began against `4a596bb`. This is a release-readiness check, not authorization to collect
live money. Production work was read-only. Financial test records remain in the isolated local
Supabase/Stripe sandbox. The user's existing port-3000 development server was not restarted.

**Decision: do not hand over unsupervised package collection yet.** Customer consent/login/Checkout
acceptance and live Checkout enablement/permission verification remain open. Existing production
migration evidence supersedes older checklist statements that migrations are local-only.

## Verified

- 26 test files / 180 tests passed; excluded `tests/int/api.int.spec.ts`, which initializes the
  shared Payload database. TypeScript passed. No `pnpm build` was run.
- Vercel deployment `E8WjuXXX4tZ7GFtv1WLFW863ns67`, commit `4a596bb`, is Ready, Production,
  Current, and assigned to `www.annadanceacademy.com` (observed about 13:07 PDT).
- The authenticated production Admin student page loaded billing without an unavailable error.
  The current UI displays **Create payment link** and **Refund payment**. The creation form can
  be opened. No demo, test creation, or test-payment control was present in this inspected view.
  No production bill was created and no live financial action was submitted.
- The September 21 database rollout is documented separately in
  [production migration evidence](billing-production-migration-20260921.md). Do not reapply its
  non-idempotent migrations. This turn did not reread production database internals.
- Production logo `/images/branding/anna-dance-academy-mark.png` returned HTTP 200 `image/png`;
  `/api/dev/email-preview` returned 404; unsigned POST to the Stripe webhook returned 400
  `Invalid signature.` No event was processed by that rejected request.
- The latest Admin UI in the in-app browser created a sandbox custom-total bill with three
  lessons, an exact USD 3.01 total, and September 28 due date after review/confirmation.
- Bill `a50426e8-725a-4545-aaca-d1a1945e5c61`, number `ADA-20260921-D1A1945E5C61`, remains
  `payment_due`, 301 cents, `stripe_livemode=false`. It is not a real student charge.
- **Send payment email** delivered the branded React Email payment request to
  `errplusone@gmail.com` at 13:10 PDT. Resend ID `01a0c597-5021-7c67-8d0d-e0d052da2612`.
  Gmail body and screenshot verified the dancer logo, Academy wordmark, itemized three-lesson
  description, exact total, due date, sandbox warning and **Review and Pay** link to this local
  bill. This establishes real inbox rendering, not just provider acceptance.
- A signed-out customer opened that bill and was redirected to login with the exact bill URL
  retained in `next`. The flow stopped at the mandatory Website Terms of Use checkbox; it was
  not checked or bypassed without explicit confirmation.
- Two concurrent **locally generated signed test envelopes** for a prior payment succeeded with
  HTTP 200/200. The handler retrieved current real sandbox Stripe evidence: the already-refunded
  USD 2.50 bill stayed refunded/succeeded, 250 cents refunded, with all five existing notification
  rows, provider IDs and sent timestamps unchanged. This does not establish hosted Stripe retry.
  Invalid signature and live/test mismatch envelopes each returned 400.

## Pending and limitations

- [ ] Explicit consent for synthetic Student A's local login and USD 3.01 bill acknowledgement;
      then complete customer login return, note persistence, Checkout close/reopen, decline and
      success, duplicate-tab handling, signed webhook and both account/Admin displays.
- [ ] Verify this new branded payment/refund flow reaches both authorized inboxes after payment.
      Previous plain-text payment/refund receipts are separately verified; do not conflate them.
- [ ] Verify live Checkout enablement, restricted-key Checkout permission, trusted origin and
      mail recipients. Opening Vercel Environment Variables was blocked by automatic approval
      review because the page could expose production credentials. Read-only permission to inspect
      configuration presence and non-secret settings, without revealing keys, was requested.
- [ ] Inspect the authenticated production Student Account. It currently redirects to login;
      the Admin session does not establish a student session.
- [ ] Replay the actual Stripe-hosted failed delivery. The sandbox restricted key cannot retrieve
      Events (403 / `more_permissions_required`); no permissions were expanded. The synthetic local
      replay above is useful integration evidence, not a substitute for provider-managed retries.
- [ ] Run an authorized live-business acceptance after configuration is verified. Do not manufacture
      live charges to replace sandbox tests.
- [ ] Failure/bounce escalation, scheduled notification recovery, manual offline receipts and
      Cal.com paid-booking email coverage remain as tracked in the central email checklist.

Concurrent work committed `c4d4197` (email footer contact change) after this run started. The actual
13:10 email and isolated app were rendered from the earlier `4a596bb` snapshot; their receipt is not
an assertion about that later footer revision. No unrelated source changes were edited by this run.

The isolated port-3005 app and Stripe forwarder were stopped after this checkpoint; its temporary
Resend key was removed. The sandbox bill remains available for resuming after consent, without
recreating the bill or repeating its payment-request email. No commit or push was performed.
