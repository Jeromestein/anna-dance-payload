# Lesson-package payment acceptance

Updated September 21, 2026. Historical sandbox evidence is preserved below. See the
[release acceptance checkpoint](billing-release-acceptance-20260921.md) for current production
read-only checks, branded inbox receipt, and remaining launch gates.

## Provider-backed package flow — September 17

Admin issued a bill for synthetic Sandbox Student A through Create bill → Lesson package:

- Bill: `e396fc7a-ed77-46a7-a45e-66605dca7f88` / `ADA-20260917-66605DCA7F88`.
- Item: `Ballet — Fall 2026 (10 lessons)`, quantity 10, USD 30.00 each, USD 300.00 total.
- Preview and Copy payment link worked; the owner bill page and Stripe Checkout displayed matching details.
- Checkout: `cs_test_a1XHucaUofKATkBnltgkI0UpmMhHBmoVueqL8Xr48hhhbLCAesL5rvuv8z`.
- PaymentIntent: `pi_3UGpbvDKpszykgKY19k8WDse`, `livemode=false`.
- Signed `payment_intent.succeeded` event `evt_3UGpbvDKpszykgKY1ajgm9pZ` and
  `checkout.session.completed` event `evt_1UGpbxDKpszykgKYH1YqT66T` both returned HTTP 200.
- The return page first showed payment confirmation pending with no Pay action. After delivery,
  a page status refresh showed Paid. No manual Paid action or Admin Stripe reconciliation was used.
- Admin's two-step Refund payment dialog requested the full sandbox amount. Refund
  `re_3UGpbvDKpszykgKY1P3Kt5jl` succeeded. The `refund.created`, `charge.refunded`, and
  `refund.updated` deliveries all returned HTTP 200.

## Latest-code checks — September 21

- Read the persisted record: Refunded, amount 30000 cents, `refund_state=succeeded`, test mode;
  original description, quantity 10 and unit amount 3000 cents remain unchanged.
- Loaded the same owner bill on the current source from `06b6cd5`: Fully refunded, amount due
  zero, original item and refund references visible, no Pay action.
- Inspected the actual bill page in the Codex in-app browser at 390 × 844 and 1280 × 900.
  Amounts, descriptions, and long references fit and remain readable while scrolling.
- Signed-in Student A visiting a real synthetic Student B bill received the generic 404 page
  without the other student's details.
- 64 tests passed across nine focused suites: billing package, package Checkout, billing refund,
  billing actions, Stripe actions, billing presentation, Stripe webhook, Stripe service, and
  auth redirects. TypeScript check passed. No production build was run.
- Sandbox test-bill amount is editable. Tests cover arbitrary valid amounts and rejection of
  values below USD 0.50, above USD 100,000, negative amounts, and fractional cents.
- Live/unconfigured visibility tests cover absence of demo and test-creation actions, including
  failed bill loading; server-side live rejection remains in place.

## Database and environment boundary

The existing isolated local Supabase instance was used. Package issuance migration
`20260917200000_issue_package_bills.sql` was applied September 17. The current combined source also
needs `20260921200000_billing_notifications.sql`; it was applied to this local sandbox September 21
so its bill queries could be exercised. No production migration was applied by this verification.

During that earlier read-only check, the temporary app used port 3005 and local Supabase only. Its outbound email API key was removed
before startup; no request/confirmation email was sent. The user's existing port-3000 process was
not restarted. No live Stripe key, permission, webhook configuration, or payment switch was changed.

## Remaining acceptance

Mail-specific implementation gaps and delivery checks are maintained in the
[central email checklist](production-email-notification-acceptance-checklist.md#current-coverage-and-next-checks--september-21-2026).

- [x] Production migrations were applied in the [separate rollout](billing-production-migration-20260921.md).
      Latest deployment `4a596bb` is Current/Ready; the authenticated Admin billing view loads and
      hides demo/test actions. No new production bill was created.
- [ ] Verify the authenticated production Student Account and enabled live Checkout separately.
- [x] Verify a signed-out bill visit redirects to login with the original bill URL preserved.
- [x] Complete customer sign-in and return after explicit user consent to the mandatory Terms
      checkbox; verify bill acknowledgement and teacher-note persistence on the USD 3.01 bill.
- [x] Close/reopen Checkout, decline then retry successfully, and open the same bill in two tabs:
      both tabs reused one Checkout session and removed payment actions after success.
- [ ] Complete keyboard-only issuance, package-specific replacement payment, multi-course browser
      flow and expired/delayed/provider-retry scenarios. Current evidence does not cover all cases.
- [x] September 21 separate authorized email test: issue an Admin sandbox bill, send its request,
      pay through **Pay test bill**, and observe customer plus Academy confirmations at the
      designated test inbox. [Actual inbox evidence and webhook caveat](production-email-notification-acceptance-checklist.md#authorized-sandbox-inbox-acceptance--september-21-2026).
- [x] Complete the customer acknowledgement/terms route separately, followed by Admin full refund;
      inspect branded payment/refund notices in both authorized inboxes at 13:26/13:28 PDT.
      [Continuation evidence](billing-release-acceptance-20260921.md#consented-customer-flow-continuation--13231330-pdt).
- [ ] Verify hosted signed webhook redelivery after concurrent notification claims. Real sandbox
      deliveries still included 503 responses despite successful financial and mail outcomes.
- [ ] Review/approve live Checkout permission and payment enablement separately; then observe a
      genuine package payment. Sandbox success does not prove live collection readiness.

Related: [Package design and checklist](../project/lesson-package-payment-links.md),
[registered-account MVP](../project/registered-account-billing-mvp.md),
[Stripe operations](stripe-payment-refund-testing.md).
