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
- [x] At 2026-09-06 17:52-17:55 PDT, the controlled Student
      `errplusone+anna-e2e-20260907-03@gmail.com` received the confirmation email at
      `errplusone@gmail.com` from `Anna Dance Academy <no-reply@annadanceacademy.com>`.
- [x] The confirmation link's `redirect_to` targeted
      `https://www.annadanceacademy.com/auth/callback?next=%2Faccount`.
- [x] Opening the link in the same plusone Chrome profile that initiated the PKCE signup completed
      confirmation and opened that Student's My Account.
- [ ] Verify confirmation-email resend delivery and rate-limit messaging.
- [x] A forgot-password request for the controlled Student succeeded, and the reset email arrived at
      `errplusone@gmail.com` from `Anna Dance Academy <no-reply@annadanceacademy.com>`.
- [x] The reset link's `redirect_to` targeted
      `https://www.annadanceacademy.com/reset-password`; opening it established the recovery session
      and displayed the editable Choose a New Password form.
- [ ] Submit a new password, then verify the Student can log in with it.
- [x] Before implementation, searching the Academy inbox for the controlled Student's complete email
      address returned no result, establishing that production sent no internal signup notification.
- [x] The server action now requests an Academy notification only when Supabase returns a newly
      created email identity; missing configuration and provider failures cannot reverse signup.
- [x] Automated tests verify the new-identity decision, successful delivery payload, missing-key and
      missing-sender skips, provider failure, recipient fallback, and exclusion of passwords,
      tokens, and secrets.
- [ ] Configure `STUDENT_REGISTRATION_NOTIFICATION_TO` in the deployment environment, redeploy, and
      verify actual delivery to the Academy for one controlled new Student.
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
Recorded: 2026-09-06 17:55 PDT
Result: Partially accepted
Verified: Signup confirmation delivery, production callback, and My Account entry; password-reset
delivery and recovery-session establishment through the editable new-password form; absence of an
Academy internal signup notification; Cal.com booking-created delivery and account calendar sync;
Stripe successful-payment Academy notification; Stripe customer email settings enabled.
Automated: Academy registration notification new-identity gating, safe payload, recipient fallback,
and non-blocking missing-configuration and provider-failure behavior.
Pending: Confirmation resend; password submission and login with the new password; Cal.com
reschedule, reminder, no-show, cancellation, retry, and idempotency checks; Stripe customer receipt,
failure, refund, dispute, retry, and idempotency checks; Academy registration-notification deployment
configuration and actual production delivery.
```
