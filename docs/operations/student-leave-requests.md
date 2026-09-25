# Student leave requests

Each student has two requests **per fixed class**, resetting on January 1 and
June 1 in `America/New_York`. Unused requests do not carry over. The quota uses
the submission time, not a class date mentioned in the message.

## Storage and eligibility

`app_student_course_leave` stores a student ID, stable `package_id`, and only
`first_leave_at` / `second_leave_at`. The student/class pair is the primary key.
There is no stored period, request text, or scheduled reset job. Older-cycle
timestamps count as unused; the first new-cycle submission replaces the first
timestamp and clears the second. This intentionally does not retain a full
leave history.

Use the fixed package ID (for example `level-1` or `DUET-01`), not broad course
type, bill ID, catalog version, or individual appointment. Renewals for the
same class share the allowance, including across catalog versions. Keep IDs
stable when renewing classes; a distinct class needs a distinct ID.

Eligible courses are live paid package purchases with no refund or payment
verification issue, and with purchased lessons not all marked completed.
Unpaid, refunded, sandbox, and exhausted purchases do not qualify. Multiple
eligible purchases for one class produce one selectable course. Legacy manual
bills without a package ID cannot identify a fixed class and do not qualify;
use the existing course package purchase/issue workflow for future enrollments.

The server verifies the signed-in student's email. A service-only database
function validates enrollment against the authenticated owner and returns the
trusted course name for email. Row locking and comparison with the displayed
timestamps prevent simultaneous submissions from consuming the same balance or
exceeding two requests. Students can read only their own records and cannot
write timestamps directly.

Migration `20260925120000_course_leave_times.sql` was applied to the existing
production Supabase project on September 25, 2026. Existing profiles, bills,
and schedules were unchanged. The old account-wide timestamps are retained
as unassigned history in Admin and are not deducted from any class. The only
such record at migration time was the September 24 email test below. The old
service-only RPC remains for compatibility during application deployment; the
new application exclusively calls `app_record_course_leave`. Do not manually
apply the migration twice.

## Account, admin, and email

Account displays the selected course's balance and current-cycle submission
times. A single course is selected automatically; multiple courses get a
selector with each course's remaining allowance. The button opens one required
text field. Admin student details list balances and times by eligible course,
with previous unassigned records in a separate collapsed section. No approval
workflow is added. Staff coordinate scheduling and makeup arrangements; leave
does not change appointments, attendance, billing, or lesson credits.

Both email subjects include the student's name and the trusted course name.
The body also identifies that course and its remaining allowance.

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

The updated feature has 25 automated tests covering cycle boundaries, validation,
authentication, course selection, quota errors, email payloads, retry integrity,
and account UI states. Type checking and scoped linting pass. The disposable
PostgreSQL fixture `tests/fixtures/course-leave-database.sql` verifies independent
allowances for two classes of the same type, renewals, enrollment ownership,
unpaid/sandbox/exhausted/refunded exclusion, rollover, RLS and write restrictions,
and preservation of legacy timestamps. A concurrent two-connection check accepted
exactly one duplicate submission and rejected the other.

The signed-in Chrome plusone Account showed its one eligible class selected
automatically. A temporary local preview using the real component also verified
switching from an exhausted class to an available class and opening its form at
desktop and 390-pixel mobile widths. No horizontal overflow was observed. The
preview was removed after verification. Local Admin visual verification remains
blocked by its separate login. Course-specific submission and inbox delivery
were then checked with live test data as described below.

### Course-specific live acceptance — September 25, 2026

The signed-in plusone account submitted a bilingual, clearly marked test request
for `level-1 · Saturday 13:00–14:00`. Account changed that course from two
remaining requests to one. Both the customer and Academy Gmail inboxes received
the message, and both subjects included `plusone` and the trusted course name.
The opened messages showed the course, one remaining request, and the full test
instruction stating that no attendance, billing, credit, or makeup changes were
requested. Database verification showed `level-1` with `first_leave_at` set and
`second_leave_at` null; the September 24 legacy account-wide record was unchanged.

To verify independent balances, a temporary paid live `DUET-02` test course was
added to the same account. The selector displayed `level-1` with one of two and
`DUET-02` with two of two remaining. Submitting a marked test request for
`DUET-02` changed only that class to one of two; `level-1` stayed at one of two.
The customer and Academy inboxes received separate messages naming `DUET-02`,
and the database held one first timestamp for each class. The temporary course,
bill, item, and `DUET-02` leave record were deleted after verification. Its test
emails remain clearly marked in both inboxes. The real `level-1` test record
remains with one request available.

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
