# Production Email and Notification Acceptance Checklist

Updated: September 21, 2026 (repository audit and authorized sandbox billing email delivery test).

This is the central email checklist for the current Payload application. It records implementation,
provider configuration, and actual delivery as separate evidence levels. A checked implementation
or setting is not proof of inbox delivery. Existing dated production observations below are
preserved; they were not reverified during this source/document review. Unchecked items identify
missing implementation, delivery acceptance, or an explicitly deferred product decision.

The September 21 billing scope and remaining gaps are tracked in
[Current coverage and next checks](#current-coverage-and-next-checks--september-21-2026).
Payment/refund webhooks update financial records; they are not themselves customer emails.

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
- [x] In the 2026-09-07 controlled lifecycle test below, both attendee and Academy received
      the rescheduled email with the correct new date/time and reschedule reason.
- [ ] Verify configured reminder emails or messages at their intended delivery times.
- [ ] Verify the intended no-show workflow and any resulting notification.
- [x] Both attendee and Academy received the cancellation email for the same controlled booking,
      with the correct cancelled time and test-only cancellation reason.
- [ ] Verify webhook retry and idempotency behavior so duplicate or replayed Cal.com events do not
      create duplicate schedule entries or notifications.

### Controlled free-booking lifecycle acceptance — September 7, 2026

Test reference: `E2E-LIFECYCLE-20260907`. Attendee: `errplusone@gmail.com`, displayed booking name
`E2E Lifecycle Test 20260907`. Academy recipient: `annadanceacademy@gmail.com`. The test used the
production website, the signed-in plusone Chrome profile, and the free `trial-class-consultation`
event type. All times below are Pacific Daylight Time (`America/Los_Angeles`). No payment was made.

| Step | Booking time | Actual email receipt | My Account / database result |
| --- | --- | --- | --- |
| Create, 19:13 PDT | September 9, 09:00–09:30 | Attendee and Academy each received confirmation from `hello@cal.com`, including calendar attachments. | One linked `scheduled` entry; September 9 shows one active appointment. |
| Reschedule, 19:17 PDT | September 10, 09:30–10:00 | Both received the rescheduled message with the new time and test reason. | The same application entry becomes `changed`; September 9 has zero active appointments and September 10 has one. |
| Cancel, 19:20 PDT | September 10, 09:30–10:00 cancelled | Both received `Canceled: ...` messages with the correct time and cancellation reason. | The same entry becomes `cancelled`; zero active test bookings remain. My Account shows no upcoming appointment, no active appointments for September 10, and `Cancelled (1)`. |

The original Cal.com UID was `cv3NJ6nfbpwaGuYDuL42ZZ`; rescheduling replaced it with
`8bPjUQiqzVskzrMgGqm8VA`. Application schedule entry `8892df4f-5fe9-4db0-b0ac-a4c1899a52fa`
was preserved throughout and retained the original UID in `rescheduled_from_uid`. No duplicate
application appointment was created. The final Cal.com page visibly confirmed `This event is canceled`.

The signed webhook synchronized each change without a manual database edit. An already-open
My Account page required reload to display external Cal.com changes; realtime browser refresh
was not part of this acceptance. Existing appointments belonging to other tests/users were not
modified. This verifies one real lifecycle, not arbitrary webhook replays, retries, reminder
timing, no-show behavior, or external Google Calendar acceptance/synchronization.

## Stripe payment notifications

Payment emails and database synchronization are separate acceptance checks. The required
[payment synchronization checklist](../project/account-billing.md#required-payment-synchronization-checklist)
tracks payment/refund synchronization, deduplication, reconciliation, and Student/Admin verification.
The subsequent [package sandbox acceptance](package-payment-acceptance.md) confirms payment and full
refund state changes, but no confirmation emails were sent during that test. Follow the
[current Stripe verification guide](stripe-payment-refund-testing.md) for financial evidence.

- [x] Earlier production inspection recorded Stripe successful-payment customer emails enabled; current settings were not rechecked September 21.
- [x] Earlier production inspection recorded Stripe refund customer emails enabled; current settings were not rechecked September 21.
- [x] The Academy received the Stripe account notification for a successful payment.
- [ ] Observe the customer receipt on the next genuine live payment; verify the intended recipient
      and content. The enabled setting alone is not delivery proof; do not create an artificial
      live charge solely for this check.
- [ ] Verify customer and Academy notification behavior for payment failure.
- [ ] Verify customer and Academy notification behavior for completed full refunds. New website
      bills support full refunds only; amount changes require a replacement bill and new payment.
- [ ] Verify Academy notification behavior for disputes and the intended internal response.
- [ ] Verify Stripe event retry and idempotency behavior before any webhook-driven payment status or
      notification is treated as production-complete.

## Current coverage and next checks — September 21, 2026

Source audit against the current repository. This distinguishes our Resend messages from Supabase,
Cal.com, and Stripe provider messages, so missing website code is not mistaken for missing provider
coverage. Historical provider observations do not establish today's configuration or delivery.

| Flow | Website implementation | Delivery evidence / outstanding work |
| --- | --- | --- |
| New email registration | Supabase confirmation request and Academy signup notification are connected | Dated production delivery above; resend acceptance still open |
| First Google registration | Academy notification connected with one-event claim | Production receipt and repeat-login deduplication verified September 7; identity-linking acceptance pending |
| Password recovery | Supabase reset email connected | Email and recovery page verified; final password change/login pending |
| Contact inquiry | Sends the inquiry to the Academy only | No customer acknowledgement; Academy inbox acceptance not recorded here |
| Bill issued / payment requested | Admin must click **Send payment email**; issuing or copying a bill does not automatically send it | Implemented in `06b6cd5`; sandbox payment-request inbox receipt verified September 21 |
| Website Checkout paid | Queues customer and Academy confirmations; Stripe webhook invokes delivery | Customer received at errplusone and Academy received at annadanceacademy during September 21 sandbox acceptance; live deployment acceptance remains pending |
| Cal.com booking paid | No website confirmation queued for imported payments without a website Checkout reservation | Inspect provider receipts first; define missing coverage without duplicating Cal/Stripe emails |
| Full refund completed | Verified full Stripe refund queues customer and Academy confirmations; webhook sends them | Both Gmail inboxes verified September 21 at 12:30 PDT; production migration/deployment and live delivery remain pending |
| Refund requested/pending/failed | Status shown in Admin; no dedicated website email | Failure escalation to Academy missing; decide whether pending notices are needed |
| Manual offline payment/refund | Recording cash/transfer or a verified manual refund does not queue confirmation mail | Missing website receipt/confirmation coverage |
| Bill cancelled / replaced | No cancellation or linked replacement explanation email; new bill can be sent manually | Define cancellation notice and old/new bill references |
| Payment failure / unpaid / overdue | No website failure email, scheduled reminder, or overdue email | Provider behavior unverified; reminder policy remains deferred |
| Cal.com booking created/rescheduled/cancelled | Website syncs schedule; Cal.com sends the lifecycle messages | Both recipients verified September 7; do not add duplicate website messages |
| Delivery failed/bounced | Billing outbox records attempts; webhook/Admin can retry; no scheduled worker or delivery/bounce event receiver | Provider acceptance is shown as sent; no proactive Academy failure alert or inbox-delivery proof |

### Implemented billing mail — acceptance still required

Items below distinguish source coverage from the explicitly scoped inbox acceptance recorded afterwards.

- [x] Add a staff-authorized payment-request action addressed to the verified bill-owner email.
      Keep explicit **Send payment email** separate from issuance and copying the URL.
- [x] Queue one customer and one Academy confirmation on the verified transition to Paid for
      website Checkout bills. Do not queue historical imports by default.
- [x] Persist notice identity, recipient/content snapshot, attempt status and provider ID; use
      atomic claims and stable idempotency keys for retries.
- [x] Keep payment Paid when mail fails. Return a retryable webhook response and expose Admin retry.
- [x] Require `BILLING_EMAIL_TEST_TO` for sandbox customer messages and default Academy copies.
      Allow a separately authorized `BILLING_EMAIL_TEST_ADMIN_TO` for the Academy copy; never
      fall back to the live recipient in sandbox. Fail closed without the customer test override.
      This applies to billing mail, not every site's mail helper.
- [x] Cover recipient isolation, duplicate attempts, provider failure, stale-attempt review and
      immutable payloads in local tests. Those tests did not prove actual delivery.
- [ ] Verify production migrations, deployment and sender configuration before claiming these
      controls are live; prerequisites are in the [registered-account MVP](../project/registered-account-billing-mvp.md#rollout-prerequisites).
- [x] With the authorized sandbox recipient, run **Send payment email** and inspect the received
      bill number, course/count, exact total and authenticated bill link. This bill had no due date;
      a populated due-date email remains unchecked.
- [x] Run Admin **Pay test bill** → Stripe sandbox Checkout → signed webhook → customer and Academy
      confirmations. Both templates actually reached the test inbox; evidence below.
- [ ] Run the separate customer acknowledgement → Checkout flow after user acceptance of the
      mandatory terms. The Admin sandbox entry intentionally does not record customer acceptance.
- [x] Retry already-sent confirmations from Admin; confirm no additional outbox rows, provider IDs
      or inbox messages, and preserve Paid status.
- [ ] Verify mail failure/retry never changes financial status or duplicates accepted notices;
      check the saved bill and intended recipients after recovery.
- [ ] Verify manual **Refresh Stripe status** recovery: it can persist Paid/queue notices but does
      not itself dispatch mail; test explicit Admin retry or webhook redelivery afterwards.
- [x] Inspect actual sandbox messages: sender, subjects, itemization, amounts and link destinations
      match the bill. All three arrived in Inbox; this was not inferred from provider acceptance.
- [ ] Verify signed webhook redelivery after concurrent notification claims: the initial two
      events returned 503 even though each confirmation ultimately reached sent. Preserve claim
      protection and payment status; distinguish an active competing sender from provider failure.

### Authorized sandbox inbox acceptance — September 21, 2026

The user authorized payment-request and payment-confirmation emails to `errplusone@gmail.com`.
An isolated app at `http://localhost:3005` used local Supabase, the Stripe sandbox account
`acct_1U02vtDKpszykgKY`, and `BILLING_EMAIL_TEST_TO=errplusone@gmail.com`. Both customer and Academy
notices were deliberately routed to this one inbox. No mail was sent to the Academy inbox and no
real money moved. The existing port-3000 server and production configuration were not changed.

Bill `9214cb26-892b-46eb-b8ff-41c177c15370`, number `ADA-20260921-41C177C15370`, was created through
Admin as a custom-total bill: **Email acceptance — September 21 (2 lessons)**, USD 2.50 total. The
amount is the agreed total for two lessons, represented as one billing line; it is not USD 2.50
per lesson. No due date was set.

| Message | Actual Gmail Inbox receipt (PDT) | Resend provider ID | Verified body |
| --- | --- | --- | --- |
| Payment request | September 21, 11:57 | `01a0c554-f99b-743e-8997-3bc215b00bf6` | Correct bill, two lessons, USD 2.50 and authenticated account bill link |
| Customer confirmation | September 21, 11:59 | `01a0c556-816b-715f-a6ee-cd80390eb401` | Customer confirmation, itemization, total, paid timestamp and transaction reference |
| Academy confirmation | September 21, 11:59 | `01a0c556-81ea-7814-abb6-834414bd2c65` | Separate Academy wording, synthetic owner email, same payment details and Admin student link |

All messages came from `Anna Dance Academy <accounts@annadanceacademy.com>` with `[SANDBOX]` in
the subject and an explicit no-real-money notice. Gmail grouped the two payment confirmations
into one conversation; both distinct message bodies were opened and inspected. Links correctly
use the isolated localhost origin and are not public production payment links.

Stripe Checkout reported `livemode=false`, USD 250 minor units, before submission with the
standard successful test card. PaymentIntent `pi_3UICR3DKpszykgKY1N7mrGRM` was recorded at
`2026-09-21T18:59:30Z`. The signed `checkout.session.completed` event
`evt_1UICR4DKpszykgKYHBrTYiEn` and `payment_intent.succeeded` event
`evt_3UICR3DKpszykgKY1x7bct2n` arrived concurrently through Stripe CLI. They automatically persisted
Paid and sent the two confirmations, but both HTTP responses were 503 due to competing notice
claims. This response/replay acceptance remains an explicit follow-up above, not a clean HTTP-200
webhook assertion. No manual financial-status edit or manual email recovery was needed.

After receipt, **Retry pending confirmation emails** returned the already-sent result. The outbox
remained exactly three sent rows with unchanged provider IDs and sent timestamps; the bill stayed
Paid with USD 0.00 due. The Admin paid bill and send statuses were also inspected visually in the
Codex in-app browser. This verifies Admin-triggered sandbox email delivery, not customer terms/
acknowledgement acceptance, mail-provider failure recovery, production routing, or refund emails.
The temporary port-3005 server and Stripe CLI listener were stopped after verification; the
temporary app's email API key was removed again. The sandbox bill remains Paid for audit evidence.

### Separate Academy inbox acceptance — September 21, 2026

The user subsequently specified `annadanceacademy@gmail.com` as the required Admin recipient.
A new optional server-only `BILLING_EMAIL_TEST_ADMIN_TO` override now permits this explicit sandbox
recipient while retaining the customer override. Without it, sandbox Academy notices still go to
`BILLING_EMAIL_TEST_TO`; they never silently fall back to the live Academy address. Live recipient
selection is unchanged, with `BILLING_NOTIFICATION_TO` taking precedence and the existing default
Academy address `annadanceacademy@gmail.com`. Production environment overrides were not changed
or independently reverified during this local test.

- [x] Configure the isolated sandbox customer inbox as `errplusone@gmail.com` and the separately
      authorized Admin test inbox as `annadanceacademy@gmail.com`.
- [x] Create fresh bill `8d4083b8-1518-463c-bd4c-eca9a5602c4f`, number
      `ADA-20260921-ECA9A5602C4F`, through Admin: two lessons, USD 2.50 agreed total.
      Preserve the earlier bill's immutable sent records; do not reset or resend its notices.
- [x] Click **Send payment email**, then use **Pay test bill** and the Stripe successful test card.
      Checkout explicitly reported `livemode=false`; PaymentIntent
      `pi_3UICZbDKpszykgKY14zHL0EM` automatically set the bill to Paid.
- [x] Open the actual Academy Gmail Inbox message at **12:08 PDT**, from
      `accounts@annadanceacademy.com`: `Payment confirmed · [SANDBOX] ADA-20260921-ECA9A5602C4F`.
      Confirm the Academy wording, synthetic owner email, two lessons, USD 2.50 total, payment
      timestamp, transaction reference and localhost Admin record link.
- [x] Verify the customer Gmail Inbox contains the request at 12:07 PDT and customer confirmation
      at 12:08 PDT; the Academy Inbox contains only its separate confirmation for this bill.
- [x] Verify the outbox stores separate customer/Admin recipients and exactly three sent notices.
- [x] Run all 16 billing-notification tests, typecheck and scoped ESLint successfully.

| Notice | Saved recipient | Resend provider ID | Accepted timestamp (UTC) |
| --- | --- | --- | --- |
| Request | `errplusone@gmail.com` | `01a0c55d-6691-70ac-bf0d-82b77b74980a` | `2026-09-21T19:07:07.916Z` |
| Customer paid | `errplusone@gmail.com` | `01a0c55e-93b9-7c89-af08-cf7d99f92f57` | `2026-09-21T19:08:24.973Z` |
| Academy paid | `annadanceacademy@gmail.com` | `01a0c55e-93bd-713d-9742-6d37126b064e` | `2026-09-21T19:08:24.981Z` |

Signed event `evt_3UICZbDKpszykgKY1WBGxB5F` returned HTTP 200. The concurrent
`evt_1UICZcDKpszykgKY4f50KB9o` returned 503 while the other sender held notification claims;
all notices ultimately reached sent without manual recovery. The existing concurrent-redelivery
follow-up remains open. This verifies the website's automatic sandbox Admin confirmation at the
real Academy inbox, not live-money payment readiness or new production deployment. The temporary
server and listener were stopped after acceptance, and the temporary email API key was removed.

### Full-refund inbox acceptance — September 21, 2026

- [x] Add `refunded_customer` and `refunded_admin` to the existing service-only outbox. No new
      refunds table. Queue only an existing paid/partially-refunded Stripe bill transitioning to
      a verified full refund (`succeeded`, full amount, provider reference).
- [x] Preserve request/payment notices, stable provider idempotency, saved recipients and Admin
      retry. Show both refund notice statuses on the refunded bill. Unsent success notices are
      cancelled if current verified refund evidence changes to failure.
- [x] Suppress pending/failed/partial success, historical backfill and first imports that are already
      refunded. A later full refund of an imported paid booking does notify both recipients.
- [x] Apply the forward migration only to local sandbox, then refund the existing USD 2.50 test
      bill `ADA-20260921-ECA9A5602C4F` through Admin review, reason and confirmation controls.
      Bill ID: `8d4083b8-1518-463c-bd4c-eca9a5602c4f`; Stripe `livemode=false`.
- [x] Stripe confirmed refund `re_3UICZbDKpszykgKY1hgkBJ0t` against
      `pi_3UICZbDKpszykgKY14zHL0EM` at `2026-09-21T19:30:35.370Z`. Database is `refunded`,
      refund state `succeeded`, refunded amount 250 cents. No real money moved.
- [x] Both Gmail Inboxes received **Full refund confirmed · [SANDBOX] ADA-20260921-ECA9A5602C4F**
      at **12:30 PDT**, from `accounts@annadanceacademy.com`. Opened and checked both bodies:
      two lessons, USD 2.50 full amount, refund timestamp/reference, original payment method,
      bank-processing caveat, original payment reference and authenticated localhost record link.
      Academy copy also contains the synthetic account email and Admin link; private refund reason
      and teacher note are excluded.

| Recipient | Notice | Resend provider ID |
| --- | --- | --- |
| `errplusone@gmail.com` | Customer refund confirmation | `01a0c572-ecb1-733e-a331-98d2d5dad438` |
| `annadanceacademy@gmail.com` | Academy refund confirmation | `01a0c572-ecb5-769c-a1a1-2c8ca35e7961` |

- [x] Codex in-app browser visually verified the refunded Admin bill, both provider-accepted
      notice labels, and **Retry pending confirmation emails**. Retrying reports no duplicates;
      exactly two refund rows retain the same provider IDs and timestamps, and the bill remains
      fully refunded. The three previous request/payment notices are preserved.
- [x] Four targeted test files passed (40 tests), typecheck and scoped ESLint passed. The disposable
      PostgreSQL fixture `tests/fixtures/refund-notifications-database.sql` also passed, covering
      verified transitions, replay, claim contention, immutable retries, late-failure suppression,
      imported payments and permissions. Never run that fixture against shared/production data.
- [ ] Concurrent webhook retry acceptance remains open: `refund.created` returned 503 while a
      competing sender held a claim; `charge.refunded` and `refund.updated` returned 200 and both
      notices reached sent. No duplicates were observed. This is the existing contention caveat,
      not a refund failure; test signed redelivery before marking operational recovery complete.

The temporary port-3005 server and Stripe listener were stopped after acceptance and its temporary
Resend key removed. Production configuration and the user's port-3000 server were unchanged.
Manual offline refunds, failed-refund alerts (including later reversals of an already-sent success),
and optional pending notices remain unchecked below. The website notice is a business confirmation;
Stripe may also send its own receipt under the separately configured provider settings.

### Missing coverage — priorities and decisions

These items are not implemented. The checklist update does not send mail, change provider
configuration, or authorize bulk/historical notifications.

- [x] **Priority 1 — full refund confirmation:** website business confirmations now notify both
      recipients after a verified full Stripe refund, with bill, full amount, date, original payment
      destination and refund reference. Sandbox inbox delivery is verified above. No bank-settlement
      promise, historical backfill, or duplicate website notice on retries. Stripe's own receipt
      settings are unchanged; its separate bank/payment receipt remains a provider acceptance item.
- [ ] Deploy `20260921210000_refund_notifications.sql` after the billing-notification migration,
      deploy the matching application, and verify the next authorized genuine refund notification.
      Only local sandbox rollout has been completed.
- [ ] **Priority 1 — failed refund alert:** add an Academy alert and clear recovery path when the
      verified refund fails. Distinguish requested/pending from completed; never send a success
      notice just because Admin clicked Refund. Define handling if a completed refund later fails.
- [ ] **Priority 1 — Cal.com paid booking coverage:** inspect booking confirmation versus payment
      receipt contents/recipients. If website confirmation is needed, support verified booking
      payments without accidentally notifying historical imports or replaying old receipts.
- [ ] **Priority 2 — manual payment/refund:** define and implement confirmations for administrator-
      verified offline transactions; do not imply Stripe processed a cash or transfer payment.
- [ ] **Priority 2 — bill cancellation/replacement:** define when to notify the owner that an unpaid
      bill was cancelled, and how a replacement request explains the old refund and separate new
      amount. Refunds must never automatically charge the replacement.
- [ ] **Priority 2 — delivery recovery:** add delivered/bounced handling and an Academy escalation
      mechanism that still works if outbound email itself fails; document operator review and
      safe retry without resetting old idempotency keys.
- [ ] **Decision — pending-refund messages:** choose whether users need a submitted/pending notice
      in addition to the final result. Do not describe pending money as already refunded.
- [ ] **Decision — payment failure and overdue reminders:** inspect provider behavior, then agree
      recipients, timing and retry limits before adding automatic messages.
- [ ] **Decision — inquiry acknowledgement/welcome:** decide whether to add a contact-form receipt
      and separate welcome message. Existing signup verification and Academy notices already work;
      absence of a welcome message is not a broken verification flow.
- [ ] Complete existing auth resend, Cal reminder/no-show and provider-specific delivery tasks in
      the earlier sections; retain their observed historical results.

Source map: `src/lib/email/billing-notifications.server.ts`, `src/actions/billing-notifications.ts`,
`src/actions/billing.ts`, `src/actions/stripe-billing.ts`,
`src/app/(frontend)/api/integrations/stripe/webhook/route.ts`,
`supabase/migrations/20260921200000_billing_notifications.sql`,
`supabase/migrations/20260921210000_refund_notifications.sql`, registration helpers,
`src/app/(frontend)/api/contact/route.ts`, and the Cal webhook receiver.

## Acceptance record — historical September 7 checkpoint

```text
Production URL: https://www.annadanceacademy.com
Recorded: 2026-09-06 17:55 PDT
Updated: 2026-09-07 (Google signup and free-booking create/reschedule/cancel delivery verified)
Result: Partially accepted
Verified: Signup confirmation delivery, production callback, and My Account entry; password-reset
delivery and recovery-session establishment through the editable new-password form; absence of an
Academy internal signup notification before implementation, then actual delivery after deployment;
Cal.com create/reschedule/cancel delivery to both participants, account calendar sync after reload,
one preserved application entry, and zero active bookings left by the controlled lifecycle test;
Stripe successful-payment Academy notification; Stripe customer email settings enabled;
Google signup My Account entry and actual Academy receipt, followed by repeat-login deduplication.
Automated: Academy registration notification new-identity gating, safe payload, recipient fallback,
and non-blocking missing-configuration and provider-failure behavior; Google registration event
claiming, endpoint authorization, callback behavior, database permissions, and concurrent claims.
Configured: Production uses STUDENT_REGISTRATION_NOTIFICATION_TO for the Academy inbox.
Pending: Confirmation resend; password submission and login with the new password; Cal.com
reminder, no-show, webhook retry, and replay-idempotency checks; Stripe customer receipt,
failure, refund, dispute, retry, and idempotency checks; production Google identity-linking check.
```

### September 21 audit update

Documentation and source review only; no new email sent, provider setting changed, or historical
production receipt reverified. Preserved the September 7 Cal.com lifecycle and signup delivery
results. Added current website billing mail implementation/acceptance, refund/Cal-payment/offline
coverage gaps, delivery recovery and optional-message decisions. The September 17 USD 300 sandbox
payment and refund proved financial synchronization, not confirmation-mail delivery.
