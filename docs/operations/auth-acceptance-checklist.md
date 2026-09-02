# Authentication Acceptance Checklist

This checklist validates the Payload staff identity and Supabase customer
identity boundary. Checked source-review items are confirmed in the current
repository. Runtime, integration, and production checks remain unchecked until
they are executed successfully.

## 1. Architecture and configuration

- [x] Payload staff authentication uses Payload's `public.users` collection.
- [x] Staff roles include `administrator` and `content-editor`.
- [x] Supabase customers authenticate through `/login`.
- [x] Customer profiles use `public.user_profiles`.
- [x] Payload excludes `user_profiles`, `student_profiles`, and `app_*` tables
  from schema synchronization.
- [x] The Supabase admin client imports `server-only`.
- [x] The service-role key is read from `SUPABASE_SERVICE_ROLE_KEY`.
- [x] A forward migration removes the legacy Supabase customer-admin policy,
  helper, and update RPC.
- [x] The current customer SELECT policy is strictly scoped to
  `user_profiles.id = auth.uid()`.
- [ ] Confirm `SUPABASE_SERVICE_ROLE_KEY` is configured only in server-side
  deployment settings.
- [ ] Confirm the service-role key is absent from client bundles, browser
  responses, logs, and committed files.
- [ ] Confirm production uses the intended Supabase project and database.

## 2. Payload staff access

- [x] `/users` calls `requirePayloadAdministrator()` before querying profiles.
- [x] Unauthenticated staff are redirected to `/admin/login`.
- [x] Non-administrator staff are redirected away from `/users`.
- [x] Only administrators can create or delete Payload staff accounts.
- [x] Content editors can read and update only their own Payload staff record.
- [x] Only administrators can assign or change a Payload staff role.
- [ ] Log in as a Payload `administrator` and open `/users` successfully.
- [ ] Log in as a Payload `content-editor` and confirm `/users` is denied.
- [ ] Confirm a content editor cannot open `/users/[id]` directly.
- [ ] Confirm a content editor cannot call the profile update action directly.
- [ ] Confirm a Supabase customer session does not grant access to `/users`.
- [ ] Confirm a legacy `user_profiles.role = admin` value does not grant staff
  access.

## 3. Administrator profile management

- [x] The administrator directory reads profiles with a server-only Supabase
  admin client.
- [x] The directory supports server-side pagination.
- [x] The directory supports name, email, or phone search.
- [x] The directory has desktop-table and compact mobile-list presentations.
- [ ] Verify directory totals and filters against current production data.
- [ ] Open a customer from `/users` and verify `/users/[id]` loads the expected
  profile.
- [ ] Update a dedicated test profile and verify the change persists.
- [x] Confirm administrator mutations re-check Payload authorization on every
  request.
- [ ] Confirm invalid profile IDs return a safe not-found or error state.
- [ ] Confirm privileged errors do not expose credentials or database details.

## 4. Supabase customer access

- [x] `/users/me` verifies Supabase claims before loading a profile.
- [x] The profile ID is resolved from the Supabase `sub` claim.
- [x] The customer profile query matches `user_profiles.id` to the authenticated
  user ID.
- [ ] Register a dedicated test customer with email and password.
- [ ] Confirm the registration email and callback complete successfully.
- [ ] Log in with the confirmed customer and open `/users/me`.
- [ ] Update name, optional phone, and optional guardian contact information.
- [ ] Verify the customer cannot read another profile through Supabase RLS.
- [ ] Verify the customer cannot update another profile through Supabase RLS.
- [ ] Verify the customer cannot change a staff role or obtain a Payload cookie.
- [ ] Test Google sign-in with a dedicated test account.
- [ ] Test resend-confirmation rate-limit messaging.
- [ ] Test forgot-password and reset-password flows.

## 5. Session separation

- [ ] Log in to Payload as an administrator without logging in to Supabase.
- [ ] Confirm `/users` still loads through the server-side admin client.
- [ ] Log out of Payload and confirm `/users` access is immediately removed.
- [ ] Log in to Supabase as a customer without logging in to Payload.
- [ ] Confirm `/users/me` works while `/users` remains inaccessible.
- [ ] Confirm Payload logout does not destroy the Supabase customer session.
- [ ] Confirm Supabase logout does not destroy the Payload staff session.

## 6. Automated tests

- [x] The repository documents which authentication tests create temporary
  Payload records.
- [ ] Confirm E2E tests use a disposable non-production database before they
  create staff fixtures.
- [x] Ensure the default automated tests never send real authentication emails.
- [x] Run `pnpm test:int` and confirm all integration tests pass.
- [x] Run `pnpm test`: 13 integration tests and 2 read-only E2E tests passed;
  7 database-writing E2E tests were safely skipped.
- [x] Run `pnpm test:e2e` against the local development server: 2 read-only
  tests passed and 7 database-writing tests were safely skipped.
- [ ] Add or verify an administrator fixture for Payload-authenticated tests.
- [ ] Add or verify a content-editor fixture for denial tests.
- [ ] Add or verify a dedicated Supabase customer fixture.
- [ ] Test direct access to protected pages and mutation endpoints.
- [ ] Test RLS cross-user read and update failures against a disposable test
  project.
- [ ] Confirm automated tests never use personal or customer credentials.
- [ ] Confirm screenshots, traces, and reports contain no passwords or secrets.

## 7. Production acceptance

- [ ] Confirm the intended academy administrator exists in Payload
  `public.users` with role `administrator`.
- [ ] Confirm at least one `content-editor` account has restricted access.
- [ ] Confirm the dedicated mock customer appears in `/users`.
- [ ] Verify administrator list, search, pagination, detail, and edit flows on
  desktop.
- [ ] Verify the same administrator flows on a mobile viewport.
- [ ] Verify customer login, profile view, profile edit, and logout on desktop.
- [ ] Verify customer login and profile flows on a mobile viewport.
- [ ] Confirm no browser console errors occur in the accepted flows.
- [ ] Confirm authentication failures show useful, non-sensitive messages.
- [ ] Record the deployment URL, commit SHA, date, tester, and result below.

## Acceptance record

```text
Deployment URL:
Commit SHA:
Test date:
Tester:
Result: Pending
Notes:
```

## Deferred family model

- [ ] Define `app_families` ownership and lifecycle.
- [ ] Define `app_family_members` roles and invitation flow.
- [ ] Define `app_students` independently from account holders.
- [ ] Define `app_enrollments` and class-term relationships.
- [ ] Define `app_payments` without storing sensitive payment credentials.
- [ ] Add migrations, RLS policies, staff authorization, and test coverage for
  each new table before enabling the family model in production.
