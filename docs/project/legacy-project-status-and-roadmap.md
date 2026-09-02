# Anna Dance Academy Website: Status and Roadmap

**Review date:** August 16, 2026

**Reviewed revision:** `656fad8`

**Current stage:** Public marketing and lead-generation website with a working Supabase authentication/profile foundation and protected user administration. Registration, enrollment, production payments, and class-management data are not yet implemented.

**September 2 product direction:** Keep `/account`, expand its visible product from `Profile` to
`My Account`, use a full-term Stripe Payment Link plus manual Staff scheduling as the interim model,
and combine Academy class sessions with Cal.com appointment data in the Student schedule. See
[Student My Account, payments, and schedule design](student-my-account-payments-schedule-design.md)
for the approved boundaries and implementation checklist. This direction is documented but not yet
implemented.

## Executive Summary

The project has advanced materially since the August 10 review. Supabase authentication is now integrated, user profiles are stored in Postgres under Row Level Security, administrators can view and update users, and an automated authentication test framework is present.

The next architectural milestone should not add more isolated profile fields. It should separate login identities from students and introduce the relational business model that connects families, students, registrations, class schedules, Cal.com consultations, and Stripe payments.

## Latest Git Audit

- Reviewed feature baseline: `656fad8` (`docs(testing): document macOS browser sandbox issue`) on `main`.
- Latest completed feature sequence: Google OAuth, password recovery, automated auth tests, confirmation-email resend, and browser-test documentation.
- This roadmap and the root `README.md` document the reviewed baseline; documentation alone is not treated as deployed or released functionality.

Checklist convention: `[x]` means the implementation exists in the reviewed code. External-service and deployed-flow verification remains separately unchecked until it has been run against the intended environment.

## Current Feature Inventory

| Area | Status | Notes |
| --- | --- | --- |
| Public website | Implemented | Home, Classes, Schedule, Faculty, About, and Contact are responsive. |
| Consultation booking | Integrated | Cal.com embed and fallback link are live in the UI; bookings are not synchronized to Supabase. |
| Contact inquiry | Implemented | Client/server validation, honeypot, basic in-memory rate limiting, and Resend delivery. |
| Email/password auth | Implemented | Signup, confirmation callback, login, and logout. |
| Google OAuth | Implemented in code | Provider credentials, redirect allowlist, and deployed flow still require environment verification. |
| Confirmation resend | Implemented | Uses a generic response to reduce account enumeration and handles rate limiting. |
| Password recovery | Implemented | Forgot-password request, recovery-session establishment, password update, and global sign-out. |
| Session handling | Implemented | Supabase SSR clients, cookie refresh proxy, and server-side claim checks. |
| User profiles | Implemented | `user_profiles` maps one-to-one to `auth.users`; phone and guardian contacts are optional. |
| Admin user directory | Implemented | Protected list, role filtering, search, counts, and user detail pages. |
| Admin updates | Implemented | Security-definer RPC validates admin access and prevents self-role changes. |
| Unit tests | Passing | Two Vitest files, 15 tests passed again on August 16, 2026. |
| Browser tests | Implemented, not run in this review | Public/auth access tests plus optional fixed-account permission tests. |
| Stripe checkout | Test proof of concept | Hard-coded $1 test Payment Link; no server-side Checkout Session, webhook, or payment records. |
| Registration and enrollment | Not implemented | No family, student, registration, enrollment, or consent data model. |
| Class schedule data | Static only | Weekly schedule remains in `lib/site-data.ts`. |
| Parent portal | Partial foundation | Login and profile exist; students, registrations, payments, class placement, and notices do not. |
| Legal and launch operations | Incomplete | Privacy, Terms, waiver/consent, monitoring, analytics, and full SEO remain open. |

## Recently Completed

### Authentication

- [x] Supabase email/password registration and login.
- [x] Email confirmation callback handling.
- [x] Confirmation-email resend page with generic responses.
- [x] Google OAuth login component and profile support.
- [x] Forgot-password request flow.
- [x] Recovery-session validation and password update.
- [x] Global sign-out after password reset.
- [x] SSR browser/server clients and session-refresh proxy.

### Profiles and administration

- [x] Portable `user_profiles` records linked to `auth.users`.
- [x] Automatic profile creation and email synchronization triggers.
- [x] Editable self profile.
- [x] Optional user and guardian phone numbers.
- [x] Student/admin roles.
- [x] Admin-only user directory and detail routes.
- [x] Admin search and role filters.
- [x] Secure administrator profile/role update RPC.
- [x] Compatibility redirects for retired account/admin paths.

### Testing and documentation

- [x] Shared authentication validation utilities.
- [x] Vitest unit test framework.
- [x] Playwright public authentication tests.
- [x] Playwright unauthenticated access-control tests.
- [x] Optional fixed student/admin account tests.
- [x] Test data-safety and macOS browser-sandbox documentation.
- [x] Root project README.

## Important Current Limitations

### 1. Profile and student are still the same concept

The current UI creates a “student account,” while `user_profiles` also contains login identity, role, contact, and guardian fields. This works for one account representing one student, but it does not model:

- One guardian managing multiple students.
- Two guardians sharing access to one family.
- A student without a personal login.
- Payment by a guardian for one of several students.

The next schema should treat `user_profiles` as account holders and create separate `families`, `family_members`, and `students` tables.

### 2. Authentication flows need deployed end-to-end verification

The code paths exist, but the following depend on Supabase, Google, DNS, and email-provider configuration:

- Google OAuth consent and callback.
- Confirmation email delivery and callback.
- Confirmation email resend.
- Password-recovery email delivery and callback.
- Fixed student and admin access-control tests.

These checks should use dedicated test accounts and must not be inferred from passing unit tests.

### 3. Stripe is still a connectivity test

- The Payment Link is hard-coded in source.
- No pending registration exists before checkout.
- No registration reference is attached to checkout.
- No signed and idempotent Stripe webhook exists.
- No payment records are stored in Supabase.
- The success URL can be opened directly and is not proof of payment.

### 4. Schedule and bookings are disconnected from users

- Public class times are static code, not database records.
- There are no class offerings, sessions, capacity, or enrollments.
- Cal.com bookings are not available in the account UI; the project has not yet chosen direct Cal.com API queries or local Supabase synchronization.
- A Profile cannot yet display its consultations or class schedule.

### 5. Production launch work remains

- Finalize real class schedule, consultation hours, tuition, term dates, faculty details, and approved photography.
- Replace placeholder Privacy and Terms links with real documents.
- Add consent/waiver handling before collecting registration or health information.
- Add production-safe rate limiting, monitoring, analytics, sitemap, robots rules, canonical metadata, Open Graph assets, favicon, and local-business structured data.

## Recommended Next Architecture

```text
auth.users
    └── user_profiles             account identity and role
            └── family_members
                    └── families
                            └── students
                                    ├── registrations
                                    │       └── payments
                                    ├── enrollments
                                    │       └── class_offerings
                                    │               └── class_sessions
                                    └── consultation_bookings (optional local mirror)
```

Every exposed table should use RLS. Browser requests should use the publishable key; service/admin secrets should remain server-only for webhooks and trusted administrative operations.

## Prioritized Roadmap

### Milestone 1 — Verify and stabilize the authentication foundation

- [ ] Confirm which Supabase project is development/staging and which project will be production.
- [ ] Confirm the latest migrations are applied to the intended Supabase project.
- [ ] Verify production Site URL and redirect allowlist.
- [ ] Verify Google OAuth from login through `/auth/callback` to `/account`.
- [ ] Verify signup confirmation email delivery and callback.
- [ ] Verify confirmation resend with an unconfirmed test account.
- [ ] Verify forgot-password delivery, recovery callback, password update, and old-password rejection.
- [ ] Run fixed student/admin Playwright tests with dedicated test accounts.
- [ ] Add CI for `pnpm typecheck` and `pnpm test`; add browser tests when the CI browser is configured.
- [ ] Review naming: decide whether the product should present “Student account,” “Parent account,” or a neutral “Account” before expanding the schema.

### Milestone 2 — Introduce families, students, and registration records

- [ ] Confirm that login accounts represent guardians/account holders rather than students.
- [ ] Define migration/backfill behavior for existing `user_profiles` records.
- [ ] Create `families`.
- [ ] Create `family_members` linking account profiles to families.
- [ ] Create separate `students` records.
- [ ] Create `classes`, `class_offerings`, and `class_sessions`.
- [ ] Move the static weekly schedule from code into Supabase.
- [ ] Create `registrations` with pending, paid, assigned, waitlisted, cancelled, and refunded states.
- [ ] Define stable internal IDs and uniqueness rules before connecting Cal.com or Stripe references.
- [ ] Create versioned `consents` for waiver, Terms, and Privacy acceptance.
- [ ] Add RLS tests for self, family, staff, and admin access.
- [ ] Verify that one guardian can access multiple students without exposing another family's records.
- [ ] Expand `/account` into My Account with Student, enrollment, payment, and upcoming schedule
  information.

### Milestone 3 — Implement verified Stripe payments

- [x] Select a full-term Stripe Payment Link plus manual Staff scheduling and verification as the
  interim operating model.
- [ ] Confirm the payment model: one-time registration, tuition installments/subscriptions, or both.
- [ ] Attach a non-sensitive enrollment `client_reference_id` to each Student-specific Payment Link
  URL for reconciliation.
- [ ] Move Stripe configuration to server-only environment variables.
- [ ] Create a pending registration before payment.
- [ ] Create Stripe Checkout Sessions on the server.
- [ ] Attach only non-sensitive registration references to Stripe metadata.
- [ ] Create `payments` with unique Stripe event/session/payment-intent identifiers.
- [ ] Add a signed Stripe webhook endpoint.
- [ ] Make webhook processing idempotent.
- [ ] Update payment and registration status only from verified server events.
- [ ] Display payment history and receipts in the account dashboard.
- [ ] Implement failed-payment, cancellation, refund, and reconciliation paths.
- [ ] Remove, protect, or mark `/payment-test` as non-indexable before production launch.

### Milestone 4 — Integrate consultation bookings

- [x] Keep Cal.com focused on consultations and appointment-style bookings; use Academy
  class-session records for the fixed group-class term schedule.
- [ ] Define the account requirement: upcoming bookings only, or searchable history/reporting linked to students and staff workflows.
- [ ] Choose one source strategy:
  - Direct Cal.com API queries for a simpler read-only view with Cal.com as the source of truth.
  - Supabase synchronization when durable history, RLS, analytics, student links, or cross-system reporting are required.
- [ ] For direct queries: use a server-only Cal.com client, match only verified account data, handle rate limits/outages, and avoid exposing API credentials.
- [ ] For synchronization: create `consultation_bookings`, verify webhook signatures, and upsert created/rescheduled/cancelled/no-show events by Cal.com booking UID.
- [ ] Define how an email-only booking is safely linked to a verified profile/student.
- [ ] Display upcoming consultations in `/account` using the selected strategy.
- [ ] Document reconciliation and fallback behavior when Cal.com is unavailable.

### Milestone 5 — Staff operations and public launch

- [ ] Expand roles from student/admin to account holder, staff, and admin as needed.
- [ ] Add staff views for registrations, class capacity, waitlists, placement, and payments.
- [ ] Add audit logs for role, registration, placement, and payment changes.
- [ ] Complete legal pages and versioned consent text.
- [ ] Complete accessibility and responsive visual QA for every public/authenticated route.
- [ ] Verify contact and Cal.com flows end to end on the deployed domain.
- [ ] Add production monitoring, analytics, and conversion events.
- [ ] Complete SEO and local-business metadata.

## Immediate Next Sprint Checklist

Complete these in order; do not begin production Stripe work before the first three checkpoints are closed.

### Checkpoint A — Repository and deployed-auth baseline

- [x] Commit the reviewed `README.md`, roadmap, and `.gitignore` updates.
- [ ] Push the local commit(s) when the documentation is approved.
- [ ] Confirm Supabase migration state and production redirect configuration.
- [ ] Complete real signup confirmation, resend, Google OAuth, password recovery, and fixed-role access tests.

**Exit condition:** all authentication paths work in the intended environment and the fixed student/admin authorization tests pass.

### Checkpoint B — Product identity decision

- [ ] Approve “Parent/Guardian account” (recommended) or another account label.
- [ ] Decide whether existing student-like profiles will be converted to account holders or linked to newly created students.
- [ ] Approve the minimum registration fields, consent requirements, and student data-retention rules.

**Exit condition:** the meaning of an account, student, family, and registration is unambiguous before schema changes begin.

### Checkpoint C — Supabase business schema

- [ ] Draft and review migrations for families, family members, students, classes, offerings, sessions, registrations, and consents.
- [ ] Draft and review RLS policies plus self/family/admin access tests.
- [ ] Backfill existing profiles safely and keep a rollback path.
- [ ] Migrate the approved class schedule from `lib/site-data.ts` into Supabase.
- [ ] Upgrade `/account` to My Account and show the account's Students, enrollments, payments, and
  combined schedule.

**Exit condition:** account holders can see only their own family/student records, admins can support them, and automated checks pass.

### Checkpoint D — External records

- [ ] Choose direct Cal.com API queries or Supabase booking synchronization based on the approved dashboard/reporting requirements.
- [ ] Implement registration-linked Stripe Checkout only after registrations have stable IDs.
- [ ] Verify signed, idempotent Stripe event handling before any payment status is shown as paid.

**Exit condition:** every displayed booking/payment has a defined source of truth, secure ownership, and recovery/reconciliation path.

## Verification Record

- [x] Git history through `656fad8` reviewed on August 16, 2026.
- [x] Repository status and documentation changes reviewed before commit.
- [x] Supabase migrations, authentication routes, profile routes, admin routes, and tests reviewed.
- [x] `pnpm typecheck` passed on August 16, 2026.
- [x] `pnpm test` passed on August 16, 2026: 2 test files and 15 tests.
- [ ] Playwright tests were not run in this review because the configured local Chrome launch requires the approved external path or the user's terminal on macOS.
- [ ] Live Google OAuth was not completed in this review.
- [ ] Real confirmation or recovery emails were not sent in this review.
- [ ] Stripe test checkout and Cal.com booking were not completed in this review.
- [ ] Production build verification was not run; project instructions prohibit `pnpm build`.

## Definition of Done

The authentication foundation is complete when all email and Google flows pass against the intended deployed environment, fixed student/admin access tests pass, and migrations are confirmed applied.

The site is ready for enrollment payments only when a registration exists before checkout, a signed and idempotent Stripe webhook stores a payment and updates the matching registration, RLS protects all family/student/payment records, and staff can reconcile every payment to a student and account holder.
