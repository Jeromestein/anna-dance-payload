# Stripe processing fee

Prepared September 29, 2026. Local implementation; production collection remains disabled.

## Customer experience

With `STRIPE_CARD_SURCHARGE_ENABLED=true`, every website-generated Stripe bill
checkout adds 3% to the original subtotal, including debit and prepaid cards.
There is no card-type selector or funding-type restriction. Cash has no added fee.

A $100.00 bill displays a $3.00 **Stripe processing fee (3%)** and a $103.00 total,
including on the payment button. The disclosure is:

> A 3% processing fee applies to all payments made through Stripe.

Stripe receives the fee as a separate line item and the same disclosure. The fee
is rounded down to a whole cent. It is a fixed merchant fee, not a representation
of Stripe's actual cost.

## Amounts and records

`card_surcharge_cents` stores the fee and `card_payment_kind='stripe'` identifies
the universal fee policy; these internal field names are retained for consistency.
`amount_cents` is the gross total. Subtract the fee to obtain the original price.
The server selects the policy; form input cannot opt out or override the amount.

Reservations freeze the quote. Retries cannot add the fee twice. An open session
with an older quote must be verified expired at Stripe before replacement.
Completed or ambiguous payments require reconciliation before a new charge.
Cash switching restores the original subtotal. Lesson credits and historical
paid records are unchanged. Payment/refund records and emails show the stored fee;
full refunds include it. Importing an already-paid payment never charges again.

## Activation and scope

Apply `20260929120000_credit_card_surcharge.sql` after preceding migrations and
keep the flag false until production activation. This migration has not been
applied to production. Existing database reads tolerate missing new fields;
fee-enabled checkout fails closed without the saved policy.

The requested universal fee conflicts with Visa's prohibition on debit/prepaid
surcharges. The implementation is not confirmation that Stripe or card networks
permit this policy. Resolve the applicable payment-provider requirements before
live activation. No notification or approval has been obtained in this task.

This change covers website-generated Stripe Checkout sessions, including Admin
Create payment link, copied bill URLs, and payment request emails. Admin enters
the original price; review, bill previews, and emails calculate the same 3% fee
before a Checkout session exists. Only reservation persists the fee, avoiding
double additions. Cal.com payment
settings and manually created Stripe Payment Links are separate external flows;
they have not been modified. The flag remains false by default.

## Verification

Fee UI, checkout retry, database-rollout, billing notification, and refund tests
pass. The disposable PostgreSQL fixture passes, including exact gross settlement
and full refunds. The in-app browser confirms $100 + $3 = $103 and no card selector. A complete
paid sandbox transaction, webhook, email, and refund remains a release check.
Production deployment and real collection have not been performed.

## References

- [Visa surcharge FAQ](https://usa.visa.com/content/dam/VCOM/global/support-legal/documents/merchant-surcharging-qa-for-web.pdf)
- [Stripe service terms](https://stripe.com/legal/ssa-service-terms)
