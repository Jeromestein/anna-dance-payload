# Student My Account, Payments, and Schedule Design

**Decision date:** September 2, 2026

**Status:** Approved design direction; implementation and external-service configuration are pending.

**Primary routes:** `/account`, `/admin/students`, and `/admin/students/:id`

## Decision Summary

- Keep `/account` as the authenticated Student-facing route and change its visible product name from
  `Profile` to `My Account`.
- Preserve the existing personal-information form as the `Profile` section inside My Account.
- Expand My Account with an overview, semester payment information, and the Student's schedule.
- Keep Staff on the protected `/admin/students/:id` detail route. Staff must not enter a Student's
  `/account` route or reuse the Student session to manage that Student.
- Use a Stripe Payment Link for one full-term payment as the approved interim payment approach.
- Let Staff assign the term, payment link, payment status, and schedule. Manual Stripe verification
  remains authoritative until a signed webhook is implemented.
- Use Cal.com for consultations, private lessons, makeup lessons, and other appointment-style
  bookings. The fixed schedule for a group class belongs to the Academy's enrollment and class
  records, not to Cal.com alone.

## Product Boundary

My Account is an Academy dashboard. It is not a Stripe dashboard or a Cal.com dashboard.

The application should display normalized, Student-safe information from each service:

| Domain                                                  | Source of truth                       | Displayed in My Account   |
| ------------------------------------------------------- | ------------------------------------- | ------------------------- |
| Login identity and editable contact details             | Supabase Auth and `app_user_profiles` | Profile                   |
| Term and class enrollment                               | Academy tables in Supabase            | Overview and Payments     |
| Amount due and internal payment status                  | Academy enrollment/payment records    | Overview and Payments     |
| Completed financial transaction                         | Stripe                                | Payments and receipt link |
| Fixed group-class sessions                              | Academy class-session records         | Schedule                  |
| Consultations, private lessons, and makeup appointments | Cal.com                               | Schedule                  |
| Combined Student calendar                               | Anna Dance Academy website            | Schedule                  |

The browser must never receive a Stripe secret key, Cal.com API key, Supabase service-role key, or
raw payment-card data.

## Student-Facing Information Architecture

```text
My Account

[ Next class ]   [ Payment status ]   [ Current term ]

Overview | Profile | Payments | Schedule
```

### Overview

The default view should answer the Student's immediate questions without requiring navigation:

- What is my next class?
- Which term and class am I enrolled in?
- Is payment due, pending verification, paid, refunded, or cancelled?
- Is there an action I need to take?

Recommended cards:

1. `Next class` — date, time, class name, location, and status.
2. `Payment` — amount due, due date, status, and `Pay now` or `View receipt` action.
3. `Current term` — term name, class name, lesson count, and date range.

### Profile

Keep the current editable fields:

- Name.
- Phone number.
- Login email as read-only.
- Parent/guardian name and phone number.

The first implementation can preserve the current one-login-to-one-profile behavior, but new
enrollment and payment tables must not assume that a login will always equal one Student. The later
family model must support a guardian managing more than one Student.

### Payments

Display one card per enrollment or term charge:

```text
Fall 2026 · Level-Based Group Class
14 lessons

Tuition             $XXX.XX
Status              Payment due
Due date            Sep XX, 2026

[ Pay with Stripe ]
```

After verified payment, replace the payment action with:

- `Paid` status.
- Paid date.
- Amount paid.
- Receipt link when available.
- Refund status and refunded amount when applicable.

Do not display full card numbers, bank details, Stripe secrets, or unverified success-page claims.

### Schedule

The schedule should combine Academy class sessions and Cal.com appointments in one Student-facing
view:

- Show the next class prominently.
- Provide an upcoming list as the primary mobile presentation.
- Provide month and list views on larger screens.
- Distinguish `Class`, `Consultation`, `Private lesson`, and `Makeup lesson` with text labels, not
  color alone.
- Show date, local time, location, instructor when assigned, and status.
- Show cancellation or schedule-change notices visibly.
- Provide Google Calendar, Microsoft Outlook, and ICS actions when available.

The existing Cal.com booking embed remains the tool for creating a new consultation. It is not the
Student's schedule viewer.

## Staff-Facing Information Architecture

The Student name in `/admin/students` already links to `/admin/students/:id`. Keep that route and
expand the existing detail page.

Recommended list columns:

- Student.
- Contact.
- Current term/class.
- Payment status.
- Next class.
- Joined.

Recommended detail structure:

```text
Student name

[ Current term ]   [ Payment status ]   [ Next class ]

Profile | Enrollment & Payment | Schedule
```

Staff actions should include:

- Assign a Student to a term and class offering.
- Set the lesson count, tuition amount, currency, and payment deadline.
- Attach the approved Stripe Payment Link.
- Copy the Student-specific payment URL.
- Record manual payment verification with who verified it and when.
- Record refunds, cancellations, and notes without deleting transaction history.
- Assign or review the term schedule.
- Link Cal.com booking UIDs for appointment-style bookings.
- Open the matching Cal.com or Stripe record when the current Staff role is authorized.

Do not add Staff impersonation in the first release. Staff should review the same underlying records
through the admin detail page without taking over the Student session.

## Proposed Data Model

The approved first-release schema keeps one account profile per Student login:

```text
auth.users
    -> app_user_profiles
        -> app_payments
        -> app_schedule_entries
```

`app_payments` temporarily carries the term, class, lesson count, amount, and payment state for one
Student. `app_schedule_entries` stores each class or appointment date and may carry a Cal.com
booking UID. If the Academy later needs shared class rosters, multiple Students per guardian, or
installment billing, those concerns can be split into dedicated family, Student, enrollment, class,
and session tables without changing the current interface.

Every exposed table requires Row Level Security. A Student or guardian may read only records owned
by their family. Staff access must be authorized on the server and audited.

## Interim Stripe Payment-Link Flow

The approved interim flow is:

```text
Staff assigns term and tuition
    -> My Account shows Payment due
    -> Student opens Stripe Payment Link
    -> Stripe processes the full-term payment
    -> Staff verifies the Stripe record
    -> Staff marks the Academy payment record Paid
    -> My Account shows Paid and the receipt
```

Use one Stripe product and price for a specific term/class combination. The application may append a
non-sensitive `client_reference_id` containing an internal enrollment identifier to the reusable
Payment Link. Do not place a name, email, phone number, secret, or other personal information in that
URL parameter.

Stripe documents that `client_reference_id` is returned on the completed Checkout Session and can
be used for reconciliation:
<https://docs.stripe.com/payment-links/url-parameters#simplify-reconciliation-with-a-url-parameter>

Until the application receives and verifies Stripe webhooks:

- Redirecting back to the website is not proof of payment.
- The Student should see `Pending verification` after returning from Stripe.
- Only an authorized Staff member may mark the payment `Paid` after checking Stripe.
- Manual verification must record the verifier, timestamp, and Stripe transaction reference.

The later automated phase should verify `checkout.session.completed` signatures, use idempotent
processing, reconcile by the internal enrollment reference, and update payment status server-side.

## Cal.com Schedule Integration

Cal.com supports server-side booking queries filtered by attendee email, status, event type, and date
range:
<https://cal.com/docs/api-reference/v2/bookings/get-all-bookings>

It also provides add-to-calendar links for Google Calendar, Microsoft Office/Outlook, and ICS:
<https://cal.com/docs/api-reference/v2/bookings/get-add-to-calendar-links-for-a-booking>

Recommended rollout:

1. Query Cal.com only from the server using the authenticated account's verified email.
2. Treat email matching as a temporary bridge, because one guardian email may later represent
   multiple Students.
3. Save the Cal.com booking UID against the intended Student or enrollment when Staff assigns an
   appointment.
4. Add signed Cal.com webhooks for created, rescheduled, and cancelled bookings.
5. Normalize Cal.com data before returning it to the browser.
6. If Cal.com is unavailable, continue showing the last safely synchronized schedule and label its
   refresh status.

Do not embed an organizer calendar or expose all Academy bookings. The Student must see only their
own linked appointments.

## Status Vocabulary

Use a small, explicit status vocabulary across Staff and Student interfaces:

### Enrollment

- `Pending`
- `Active`
- `Waitlisted`
- `Completed`
- `Cancelled`

### Payment

- `Payment due`
- `Pending verification`
- `Paid`
- `Partially refunded`
- `Refunded`
- `Cancelled`

### Schedule entry

- `Scheduled`
- `Changed`
- `Cancelled`
- `Completed`

## Implementation Checklist

Checklist convention: `[x]` records an existing baseline or an approved decision. `[ ]` means the
work is not yet implemented or externally verified.

### A. Approved direction and current baseline

- [x] Keep the authenticated Student route at `/account`.
- [x] Use `My Account` as the planned visible page and navigation label.
- [x] Preserve the current personal-information form under a Profile section.
- [x] Keep Staff Student management at `/admin/students` and `/admin/students/:id`.
- [x] Use one full-term Stripe Payment Link plus manual scheduling as the interim operating model.
- [x] Use Cal.com for appointment-style scheduling, not as the sole source of the group-class term
      calendar.
- [x] Keep Staff and Student authentication contexts separate.

### B. Business decisions required before implementation

- [ ] Decide whether the login owner is presented as a Student, parent/guardian, or neutral account
      holder.
- [ ] Approve the first real term, class offering, lesson dates, lesson count, tuition, currency, and
      payment deadline.
- [ ] Approve cancellation, withdrawal, refund, makeup, and schedule-change rules.
- [ ] Decide whether the first release supports one Student per login or must immediately support
      multiple Students per family.
- [ ] Decide which appointment types remain in Cal.com: consultation, private lesson, makeup lesson,
      or all three.

### C. Data and authorization foundation

- [x] Create and apply the first-release `app_user_profiles`, `app_payments`, and
      `app_schedule_entries` migration while retaining `user_profiles` as a rollback copy.
- [x] Define stable UUIDs and uniqueness rules before attaching Stripe or Cal.com references.
- [x] Store money in integer minor units with an explicit currency.
- [ ] Add payment verification source, verifier, and timestamp fields.
- [ ] Add audit history for payment, enrollment, and schedule-status changes.
- [x] Add RLS policies for account ownership.
- [ ] Add server-side Staff authorization for every administrative query and mutation.
- [x] Verify with a disposable authenticated account that one Student cannot read or update another
      Student's profile.
- [x] Confirm the Supabase service-role secret remains server-only in the implemented profile flow.
- [ ] Confirm future Stripe and Cal.com secrets remain server-only when those integrations are
      implemented.

### D. Staff Student directory and detail page

- [ ] Add current term/class, payment status, and next class to the desktop directory.
- [ ] Add the same summary information to the compact mobile Student list.
- [ ] Add overview summary cards to `/admin/students/:id`.
- [ ] Add Profile, Enrollment & Payment, and Schedule sections or tabs.
- [ ] Add an enrollment-assignment form.
- [ ] Add tuition amount, currency, due date, and Stripe Payment Link fields.
- [ ] Generate a Student-specific payment URL with a non-sensitive enrollment reference.
- [ ] Add manual `Pending verification`, `Paid`, `Refunded`, and `Cancelled` actions.
- [ ] Require a Stripe transaction reference before manual confirmation as Paid.
- [ ] Record who changed a payment status and when.
- [ ] Add class-session assignment and Cal.com booking-UID management.
- [ ] Verify content editors and Students cannot access Staff payment controls.

### E. Student My Account

- [ ] Change the visible page and header navigation label from `Profile` to `My Account`.
- [ ] Add Overview, Profile, Payments, and Schedule navigation.
- [ ] Add Next class, Payment status, and Current term summary cards.
- [ ] Keep all existing profile editing behavior and validation working.
- [ ] Show each enrollment's term, class, lesson count, tuition, and payment deadline.
- [ ] Show `Pay with Stripe` only for an active amount due.
- [ ] Show `Pending verification` after a payment return until payment is verified.
- [ ] Show verified paid date, amount, and receipt link.
- [ ] Show group-class sessions and Cal.com appointments in one schedule.
- [ ] Make the upcoming list the primary mobile schedule view.
- [ ] Add accessible month/list controls for larger screens.
- [ ] Add visible empty, loading, unavailable, and error states.
- [ ] Ensure status meaning is not communicated by color alone.

### F. Stripe Payment Link setup and manual operations

- [ ] Create a real Stripe product and price in test mode for the approved term/class.
- [ ] Create the test Payment Link and configure the approved post-payment destination.
- [ ] Add a non-sensitive `client_reference_id` based on the enrollment ID.
- [ ] Confirm the completed Stripe Session includes the expected reference.
- [ ] Document the Staff reconciliation procedure.
- [ ] Test successful, abandoned, duplicate, refunded, and disputed payments.
- [ ] Confirm a website success URL cannot mark a payment Paid.
- [ ] Obtain explicit approval before switching from Stripe test mode to live mode.
- [ ] Replace or remove the existing hard-coded `$1` connection-test flow before launch.

### G. Cal.com integration

- [ ] Confirm the Cal.com account and plan support the required API and webhook access.
- [ ] Add a server-only Cal.com client and timeout/error handling.
- [ ] Query upcoming bookings using the authenticated verified email only as the first bridge.
- [ ] Filter returned bookings again before rendering Student data.
- [ ] Store and use Cal.com booking UIDs for stable Student ownership.
- [ ] Add signed webhooks for created, rescheduled, and cancelled bookings.
- [ ] Make webhook handling idempotent.
- [ ] Add Google Calendar, Outlook, and ICS actions where Cal.com provides them.
- [ ] Confirm no Student can discover another attendee or Academy booking.
- [ ] Document the fallback when Cal.com is unavailable.

### H. Verification and release

- [ ] Run `pnpm typecheck`.
- [ ] Run the relevant unit and integration tests.
- [ ] Run `git diff --check`.
- [ ] Verify Staff directory and detail pages with administrator and content-editor sessions.
- [ ] Verify My Account with dedicated Student test accounts.
- [ ] Verify cross-account and direct-route denial cases.
- [ ] Verify Stripe payment flows in test mode before any live transaction.
- [ ] Verify Cal.com query and webhook behavior with dedicated test bookings.
- [ ] Visually verify desktop and mobile states in the Codex in-app browser.
- [ ] Verify keyboard navigation, focus visibility, labels, status announcements, and contrast.
- [ ] Confirm no keys, payment credentials, or other sensitive values appear in HTML, browser logs,
      screenshots, or committed files.
- [ ] Do not run `pnpm build`; the repository instructions prohibit it.

## Definition of Done

The first My Account release is complete only when:

- A signed-in Student can see only their own profile, enrollment, payment, and schedule data.
- An administrator can assign a term, payment link, payment state, and schedule from the protected
  Student detail page.
- A Stripe redirect alone cannot mark an enrollment Paid.
- Every displayed payment has a defined verification source and reconciliation path.
- Every displayed Cal.com appointment is linked to the correct Student and has a safe fallback.
- Group-class sessions are represented once and inherited through enrollment rather than duplicated
  as one Cal.com booking per Student.
- Desktop, mobile, accessibility, authorization, and external-service tests pass in the intended
  environment.
