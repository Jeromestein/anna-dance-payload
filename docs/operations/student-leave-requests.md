# Student leave requests

Each student account has two requests per cycle, resetting on January 1 and
June 1 in `America/New_York`. Unused requests do not carry over. The quota uses
the submission time, not a class date mentioned in the message.

## Storage and access

`app_user_profiles` stores only `first_leave_at` and `second_leave_at`. There is
no stored period, request text, or scheduled reset job. Older-cycle timestamps
count as unused; the first new-cycle submission replaces the first timestamp
and clears the second. This intentionally does not retain a full leave history.

The server verifies the signed-in student's email and calls a service-only
database function. Row locking and comparison with the displayed timestamps
prevent simultaneous submissions from consuming the same balance or exceeding
two requests. Students cannot directly insert or update these timestamps.

Migration `20260924200000_student_leave_times.sql` was applied to the existing
production Supabase project on September 24, 2026. Existing profile data was
preserved. Do not manually apply the same migration a second time.

## Account, admin, and email

Account displays the remaining balance, current-cycle submission times, and a
button opening one required text field. Admin student details display the same
balance and times. Staff coordinate scheduling and makeup arrangements; the
feature does not change appointments, attendance, billing, or course credits.

Messages are emailed separately to the student's verified account address and
the administrator. The administrator address resolves from
`LEAVE_NOTIFICATION_TO`, then `STUDENT_REGISTRATION_NOTIFICATION_TO`, then
`CONTACT_TO_EMAIL`, with `annadanceacademy@gmail.com` as the fallback. Sending
also requires `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, and `PAYLOAD_SECRET`.

Missing email configuration blocks recording. If sending fails after recording,
the page offers an email-only retry without consuming another request. A signed
receipt in the current form state preserves the original email payloads and
idempotency keys for up to 22 hours. Keep the page open until retry succeeds.
There is no durable email queue: closing the page or losing the response can
lose the retry receipt, and staff must handle notification recovery. Email
provider acceptance is not proof of inbox delivery.

## Verification

The feature has 21 automated tests covering cycle boundaries, validation,
authentication, quota errors, email payloads, retry integrity, and account UI
states. Type checking and scoped linting pass. Transactional database checks
verified quota enforcement, stale submissions, rollover, and access restrictions;
test data was rolled back.

The local Account page was visually checked in the signed-in Chrome plusone
profile at desktop and 390-pixel mobile widths, including opening the form and
required-field validation. The in-app browser had no account session. Admin
visual verification was blocked by its separate login. Initial implementation
verification used mocked email transport; the subsequent live check is below.

### Live email acceptance — September 24, 2026

At the user's request, the signed-in plusone account (`errplusone@gmail.com`)
submitted `LEAVE-EMAIL-20260924-01` through the local Account form. Its English
and Chinese message explicitly stated that this was only a notification test,
with no actual absence or course changes requested.

- Account displayed successful submission and changed from two remaining
  requests to one.
- The customer Gmail Inbox received **Leave Request Recorded · Anna Dance
  Academy** at 12:41 PM PDT from `accounts@annadanceacademy.com`.
- The Academy Gmail Inbox (`annadanceacademy@gmail.com`) received **Student
  Leave Request · Anna Dance Academy** at the same time, from the same sender.
- Both opened messages contained the test marker, full bilingual request,
  student/account identity, submission time (3:41 PM EDT), and one remaining
  request. This verifies actual inbox delivery, not just provider acceptance.
- One test submission timestamp remains on the plusone account; no second
  request was submitted. Emails and the test record were retained.

This check used the current local application with the existing production
database and email service. It does not establish deployment of these changes
to the public website.
