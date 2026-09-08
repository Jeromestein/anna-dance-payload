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
- [x] Vercel Production Config sets
      `STUDENT_REGISTRATION_NOTIFICATION_TO=annadanceacademy@gmail.com`; the saved value requires a
      new deployment before the application can use it.
- [x] Production deployment `449f8d3` includes registration notification commit `1ee598b`.
- [x] On 2026-09-07 at 18:03 PDT, the Academy inbox received
      `New Student registration: E2E Notification Test 20260907-04` for controlled Student
      `errplusone+anna-notify-20260907-04@gmail.com`, from `accounts@annadanceacademy.com`.
- [x] The observed registration notification contained only minimal operational details and no
      password, token, or authentication secret. The Student separately received the confirmation
      email and reached My Account after opening its link.

## Google first-registration notification

Local checks and separately observed production-delivery results are recorded below.

- [x] Add a forward migration that records only new Google Auth-user INSERTs, with no historical
      backfill and no events for normal logins or identity-linking updates.
- [x] Add a cookie-authenticated, same-origin callback endpoint that uses the verified user ID,
      never browser-supplied identity or recipient fields.
- [x] Atomically claim the event before sending through the existing Academy Resend helper.
- [x] Persist sent/failed/skipped status; notification errors do not prevent sign-in.
- [x] Run 60 local automated tests (including 19 new Google endpoint/callback tests), typecheck,
      and lint. Exclude the unrelated Payload API test that initializes the shared database.
- [x] Apply and test the migration in an isolated PostgreSQL 15 cluster: first signup, name
      fallbacks, old users, email registration, Google linking, permissions, and duplicate claims.
- [x] Send two concurrent claim requests against the same local test event: returned counts were
      1 and 0. No real email was sent by these isolated tests.
- [x] Verify in the Codex in-app browser that the existing local session completes
      `/auth/callback` and renders My Account. Local unauthenticated/cross-origin endpoint checks
      returned 401/403 respectively. This is not a fresh Google OAuth signup test.
- [x] On 2026-09-07, apply `20260908020000_google_registration_notifications.sql` to production
      Supabase project `hsitmgmcekzobksgtjoj`. Verify the trigger and service-role-only claim
      function; the existing 8 Auth users remain unchanged and the ledger contains no backfill.
- [x] Deploy `93e5348` to Vercel Production (`Ready`). The canonical production endpoint returns
      401 without authentication and 403 for a cross-origin request.
- [x] With explicit user authorization, reset only `errplusone@gmail.com` and register it again
      through the live Google OAuth flow in the plusone Chrome profile. Preserve a private local
      recovery copy of its old profile, two historical test appointments, and 13 expired booking
      intents before deletion. There were no application payment records or owned storage objects.
      Other accounts and aliases were not deleted; Cal.com records were not cancelled or deleted.
- [x] At 2026-09-07 18:56 PDT, the recreated Google account reached production My Account.
      A new Auth ID was created (`707d01f4-bd50-4d91-bdf2-62739ad484e3`), and exactly one ledger
      event reached `sent`. The previous Auth ID no longer exists.
- [x] The Academy inbox actually received `New Student registration: plusone` at 18:56 PDT from
      `accounts@annadanceacademy.com`. The body identifies `errplusone@gmail.com`, Student name
      `plusone`, optional contacts as `Not provided`, and the registration timestamp
      `2026-09-08T01:56:03.559452+00:00`; no password or authentication token was included.
- [x] At 18:58 PDT, sign out and use the same Google account again. My Account opens normally,
      Auth keeps the same new user ID, and the ledger remains one event with unchanged send
      timestamps (`01:56:06` UTC). The Academy mail search still shows the single 18:56 message.
- [ ] Verify email-account-to-Google identity linking also produces no registration email in a
      separate controlled production test; the database regression test already covers updates.

This implementation permits one automatic attempt per event. There is no scheduled retry worker:
interrupted/failed/skipped sends require operator review. `sent` means Resend accepted the request,
not proof of inbox delivery. See `supabase/README.md` for rollout and recovery precautions.

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
Updated: 2026-09-07 18:58 PDT (Google first-signup delivery and repeat-login deduplication verified)
Result: Partially accepted
Verified: Signup confirmation delivery, production callback, and My Account entry; password-reset
delivery and recovery-session establishment through the editable new-password form; absence of an
Academy internal signup notification before implementation, then actual delivery after deployment;
Cal.com booking-created delivery and account calendar sync;
Stripe successful-payment Academy notification; Stripe customer email settings enabled;
Google signup My Account entry and actual Academy receipt, followed by repeat-login deduplication.
Automated: Academy registration notification new-identity gating, safe payload, recipient fallback,
and non-blocking missing-configuration and provider-failure behavior; Google registration event
claiming, endpoint authorization, callback behavior, database permissions, and concurrent claims.
Configured: Production uses STUDENT_REGISTRATION_NOTIFICATION_TO for the Academy inbox.
Pending: Confirmation resend; password submission and login with the new password; Cal.com
reschedule, reminder, no-show, cancellation, retry, and idempotency checks; Stripe customer receipt,
failure, refund, dispute, retry, and idempotency checks; production Google identity-linking check.
```
