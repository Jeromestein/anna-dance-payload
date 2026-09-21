# Billing release acceptance — September 21, 2026

## Scope and release decision

Checks began against `4a596bb`. This is a release-readiness check, not authorization to collect
live money. Production work was read-only. Financial test records remain in the isolated local
Supabase/Stripe sandbox. The user's existing port-3000 development server was not restarted.

**Decision: do not hand over unsupervised package collection yet.** The customer sandbox flow is
now verified; live Checkout enablement/permission verification and concurrent-webhook retry
acceptance remain open. Existing production
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
- At the initial checkpoint, bill `a50426e8-725a-4545-aaca-d1a1945e5c61`, number `ADA-20260921-D1A1945E5C61`, was
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

- [x] Explicit consent received; complete synthetic Student A's login return, bill acknowledgement,
      note persistence, Checkout close/reopen, decline/success, two-tab session reuse, signed
      webhook synchronization and customer/Admin displays. See continuation evidence below.
- [x] Verify new branded payment and full-refund confirmations in both authorized Gmail inboxes.
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

The isolated port-3005 app and Stripe forwarder were stopped after the initial checkpoint; its temporary
Resend key was removed. The sandbox bill remains available for resuming after consent, without
recreating the bill or repeating its payment-request email. No commit or push was performed.

## Consented customer-flow continuation — 13:23–13:30 PDT

The user explicitly approved the sandbox login and bill terms confirmation. The existing USD 3.01
bill was resumed without issuing a second bill or resending its request. The isolated app used the
working-source snapshot based on `2aa20bb`, including the concurrent uncommitted email changes that
remove refund timestamps/references from email bodies. Those source files were not edited by this
test. No live key, live payment, production setting or production database record was changed.

- The emailed bill destination redirected to email/password login and returned to the exact bill
  after consent. Student A acknowledged `website-terms-2026-09-10` at `20:23:37Z`. The saved teacher
  note was preserved through reload, Checkout reopening, payment and refund, and appeared in Admin
  and the Academy payment email.
- Stripe displayed Sandbox, the three-lesson description and USD 3.01. Its order summary also
  reported `livemode=false` and 301 cents. Closing Checkout returned to an unpaid bill with a clear
  recovery message; reopening and a second browser tab reused the same Checkout session:
  `cs_test_a1eISsAEp6vEPWLLkmuL0QmHH7dRiIYz12Vh1VJx3EwluV8CxgX5mNryPR`.
- The [official Stripe decline test card](https://docs.stripe.com/testing) showed a declined-card
  error. The bill remained `payment_due`, zero paid, with only its existing request notice.
  Retrying with Stripe's success test card completed payment at 13:26 PDT.
- PaymentIntent `pi_3UIDmVDKpszykgKY2ybk4v0f` updated the same bill to Paid, 301 cents, through actual
  signed sandbox events forwarded by Stripe CLI. The return page initially withheld the Pay action
  while confirmation was pending; **Check payment status** showed Paid and zero due. The second
  bill tab also removed its Checkout action, and Admin showed Paid. No manual Paid or Admin
  reconciliation action was used.
- Admin **Refund payment → Review full refund → reason → Review confirmation → acknowledgement →
  Refund $3.01** completed refund `re_3UIDmVDKpszykgKY2cuU79vb` at 13:28 PDT. The database showed
  `refunded`, `refund_state=succeeded`, 301 cents refunded, `stripe_livemode=false`. Customer and
  Admin pages showed Fully refunded, zero due and intact three-lesson details; the bill was removed
  from the refundable selector. The customer link had no Pay action.
- Both authorized Gmail inboxes contained the branded payment messages at 13:26 and full-refund
  messages at 13:28. Inspected bodies/screenshots verified the dancer logo, Academy wordmark,
  three lessons, USD 3.01, correct customer/Admin record links, sandbox warning and **Call Us**
  footer. Payment/refund timestamps and provider references were absent from these email bodies.
  The Academy payment notice contained the persisted teacher note. Receipt was inspected in Gmail,
  not inferred from provider acceptance.

| Notice | Recipient | Resend provider ID |
| --- | --- | --- |
| Payment confirmation | `errplusone@gmail.com` | `01a0c5a5-c74a-7125-ab06-72cd844f8e61` |
| Payment confirmation | `annadanceacademy@gmail.com` | `01a0c5a5-c754-797f-bb8a-4f3856915308` |
| Full refund confirmation | `errplusone@gmail.com` | `01a0c5a7-fd81-7412-bac0-7b4698d29086` |
| Full refund confirmation | `annadanceacademy@gmail.com` | `01a0c5a7-fd8a-76cb-8162-c56bdf09afed` |

The bill has exactly five sent outbox rows: the original request and these four confirmations.

### Remaining findings from this continuation

- [ ] Resolve/verify concurrent notice-claim recovery without removing duplicate-send protection.
      `payment_intent.succeeded` (`evt_3UIDmVDKpszykgKY2QXOUuPm`) returned 200 while
      `checkout.session.completed` (`evt_1UIDmtDKpszykgKYHL5ZXBwB`) returned 503. During refund,
      `charge.refunded` (`evt_3UIDmVDKpszykgKY25F70Amu`) returned 200; `refund.created`
      (`evt_3UIDmVDKpszykgKY2dyq0HYU`) and `refund.updated` (`evt_3UIDmVDKpszykgKY28f75llX`)
      returned 503. Financial updates and all four emails succeeded, but this is not clean
      all-200 webhook acceptance or proof of hosted redelivery.
- [ ] Improve asynchronous status feedback: the customer used **Check payment status** after
      returning from Checkout. Admin initially showed pending refund emails even after Gmail
      receipt; a page reload correctly displayed all five notices as accepted by the provider.
      Do not mistake a stale screen for failed financial synchronization or failed mail delivery.
- [ ] Reproduce and investigate the local development hydration warning for an expanded native
      bill `<details>` element (`open` attribute mismatch). The bill remained usable and its
      financial state was verified; this warning is not proof of a production failure.
- [ ] Multi-course and replacement-bill browser payment, full keyboard-only issuance, expired
      Checkout and delayed/provider-managed retry scenarios remain separately tracked.

After verification, the temporary port-3005 app and Stripe forwarder were stopped and the temporary
Resend key was removed from the isolated app. The sandbox records were retained. No commit or push
was performed by this continuation.
