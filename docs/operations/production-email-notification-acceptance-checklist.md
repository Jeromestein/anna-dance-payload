# Production Email and Notification Acceptance Checklist

This checklist records production configuration and observed delivery behavior for the current
Payload application. It does not inherit completion claims from legacy roadmaps. A checked item
means that the configuration or delivery outcome was observed in production; enabled provider
settings alone do not prove end-to-end delivery.

## Supabase Student authentication

- [x] Vercel Production Config sets
      `NEXT_PUBLIC_SITE_URL=https://www.annadanceacademy.com`.
- [x] The deployment created after the Vercel environment update reached `Ready`.
- [x] Supabase Site URL uses `https://www.annadanceacademy.com`.
- [x] Supabase permits the production authentication callback and reset-password redirect URLs.
- [x] A new email/password Student received the confirmation email.
- [x] The confirmation link targeted the production `/auth/callback` route.
- [x] Opening the link in the same browser that initiated the PKCE signup completed confirmation
      and opened My Account.
- [ ] Verify confirmation-email resend delivery and rate-limit messaging.
- [ ] Verify password-recovery email delivery, recovery-session establishment, and password reset.
- [ ] Implement an Academy internal notification when a new Student registers.
- [ ] Verify any future registration notification contains only the minimum operational details and
      no password, token, or authentication secret.

## Cal.com consultation notifications

- [x] For a controlled free-consultation booking, the attendee received the booking-created email.
- [x] `annadanceacademy@gmail.com` received the booking-created email.
- [x] The controlled booking synchronized to the attendee's My Account calendar.
- [ ] Verify attendee and Academy emails for a rescheduled booking.
- [ ] Verify configured reminder emails or messages at their intended delivery times.
- [ ] Verify the intended no-show workflow and any resulting notification.
- [ ] Verify cancellation notifications if cancellation email behavior is enabled.
- [ ] Verify webhook retry and idempotency behavior so duplicate or replayed Cal.com events do not
      create duplicate schedule entries or notifications.

## Stripe payment notifications

- [x] Stripe customer emails for successful payments are enabled.
- [x] Stripe customer emails for refunds are enabled.
- [x] The Academy received the Stripe account notification for a successful payment.
- [ ] During the next controlled payment, verify that the customer actually receives the successful
      payment receipt; the enabled setting alone is not accepted as delivery proof.
- [ ] Verify customer and Academy notification behavior for payment failure.
- [ ] Verify customer and Academy notification behavior for full and partial refunds.
- [ ] Verify Academy notification behavior for disputes and the intended internal response.
- [ ] Verify Stripe event retry and idempotency behavior before any webhook-driven payment status or
      notification is treated as production-complete.

## Acceptance record

```text
Production URL: https://www.annadanceacademy.com
Recorded: 2026-09-06
Result: Partially accepted
Verified: Signup confirmation and callback; Cal.com booking-created delivery and account calendar
sync; Stripe successful-payment Academy notification; Stripe customer email settings enabled.
Pending: Confirmation resend; password recovery; Cal.com reschedule, reminder, no-show,
cancellation, retry, and idempotency checks; Stripe customer receipt, failure, refund, dispute,
retry, and idempotency checks; Academy internal new-registration notification.
```
