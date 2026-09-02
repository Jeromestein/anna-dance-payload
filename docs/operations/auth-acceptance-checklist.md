# Staff and Student Authentication Acceptance Checklist

This checklist validates the consolidated administration experience and the
separate Payload Staff and Supabase Student identity boundary. Checked
source-review items are confirmed in the current repository. New route and UI
items remain unchecked until implemented and verified.

## 1. Terminology and navigation

- [x] The Payload collection is labeled `Staff` in the admin interface.
- [x] The Payload collection slug and `public.users` table remain unchanged.
- [x] The Payload sidebar contains an administrator-only `Student` item.
- [x] The interface does not use `Users`, `Staff Accounts`, or
  `Student Accounts` as navigation labels.
- [x] `/admin/students` renders inside the Payload admin shell.
- [x] `/admin/students/[id]` renders inside the Payload admin shell.
- [x] The public website no longer shows an administrator `Users` navigation
  item.
- [x] `/account` is the Student self-service profile route.
- [x] `/users`, `/users/[id]`, and `/users/me` return safe not-found responses.

## 2. Architecture and configuration

- [x] Payload Staff authentication uses Payload's `public.users` collection.
- [x] Staff roles include `administrator` and `content-editor`.
- [x] Supabase Students authenticate through `/login`.
- [x] Student profiles use `public.user_profiles`.
- [x] Payload excludes `user_profiles`, `student_profiles`, and `app_*` tables
  from schema synchronization.
- [x] The Supabase admin client imports `server-only`.
- [x] The service-role key is read from `SUPABASE_SERVICE_ROLE_KEY`.
- [x] A forward migration removes the legacy Supabase customer-admin policy,
  helper, and update RPC.
- [x] The target Student SELECT policy is strictly scoped to
  `user_profiles.id = auth.uid()`.
- [x] The local environment targets production Supabase project
  `hsitmgmcekzobksgtjoj`.
- [ ] Confirm `SUPABASE_SERVICE_ROLE_KEY` is configured only in server-side
  deployment settings.
- [ ] Confirm the service-role key is absent from client bundles, browser
  responses, logs, and committed files.
- [ ] Confirm the forward RLS migration is applied to the production database.

## 3. Staff access

- [x] Only administrators can create or delete Payload Staff records.
- [x] Content editors can read and update only their own Payload Staff record.
- [x] Only administrators can assign or change a Payload Staff role.
- [x] Unauthenticated visitors to `/admin/students` are redirected to the
  Payload login page.
- [x] An administrator can open `/admin/students` using the Payload session.
- [ ] A content editor cannot see the Student navigation item.
- [ ] A content editor cannot open `/admin/students` directly.
- [ ] A content editor cannot open `/admin/students/[id]` directly.
- [ ] A content editor cannot call a Student profile mutation directly.
- [ ] A Supabase Student session does not grant access to `/admin/students`.
- [ ] A legacy `user_profiles.role = admin` value does not grant Staff access.

## 4. Administrator Student management

- [x] The existing Student directory queries profiles through a server-only
  Supabase admin client.
- [x] The existing directory supports server-side pagination.
- [x] The existing directory supports name, email, or phone search.
- [x] The existing directory has desktop-table and compact mobile-list
  presentations.
- [x] Move the directory UI into `/admin/students`.
- [x] Move Student detail and edit UI into `/admin/students/[id]`.
- [x] Verify the directory total against current production data.
- [x] Open a Student and verify the expected profile loads.
- [ ] Update a dedicated test Student and verify the change persists.
- [x] Administrator mutations re-check Payload authorization on every request.
- [x] Confirm invalid Student IDs return a safe not-found or error state.
- [ ] Confirm privileged errors do not expose credentials or database details.

## 5. Student access

- [x] The current self-service implementation verifies Supabase claims before
  loading a profile.
- [x] The profile ID is resolved from the Supabase `sub` claim.
- [x] The Student profile query matches `user_profiles.id` to the authenticated
  user ID.
- [x] Move the self-service profile UI and actions to `/account`.
- [ ] Register a dedicated test Student with email and password.
- [ ] Confirm the registration email and callback complete successfully.
- [ ] Log in with the confirmed Student and open `/account`.
- [ ] Update name, optional phone, and optional guardian contact information.
- [ ] Verify the Student cannot read another profile through Supabase RLS.
- [ ] Verify the Student cannot update another profile through Supabase RLS.
- [ ] Verify the Student cannot change a Staff role or obtain a Payload cookie.
- [ ] Test Google sign-in with a dedicated test identity.
- [ ] Test resend-confirmation rate-limit messaging.
- [ ] Test forgot-password and reset-password flows.

## 6. Session separation

- [ ] Log in to Payload as an administrator without logging in to Supabase.
- [ ] Confirm `/admin/students` loads through the server-side admin client.
- [ ] Log out of Payload and confirm Student management access is immediately
  removed.
- [ ] Log in to Supabase as a Student without logging in to Payload.
- [ ] Confirm `/account` works while `/admin/students` remains inaccessible.
- [ ] Confirm Payload logout does not destroy the Supabase Student session.
- [ ] Confirm Supabase logout does not destroy the Payload Staff session.

## 7. Automated tests

- [x] The repository documents which authentication tests create temporary
  Payload records.
- [ ] Confirm E2E tests use a disposable non-production database before they
  create Staff fixtures.
- [x] The default automated tests never send real authentication emails.
- [x] `pnpm test:int` passes.
- [x] `pnpm test` passes with database-writing E2E tests safely skipped.
- [x] `pnpm test:e2e` passes against the local development server with
  database-writing tests safely skipped.
- [x] Update route tests for `/admin/students` and `/account`.
- [ ] Add authenticated route coverage for `/admin/students/[id]` against a
  disposable test project.
- [x] Test all removed `/users` routes return not found.
- [ ] Add or verify an administrator Staff fixture.
- [ ] Add or verify a content-editor Staff fixture for denial tests.
- [ ] Add or verify a dedicated Supabase Student fixture.
- [ ] Test direct access to protected pages and mutation endpoints.
- [ ] Test RLS cross-Student read and update failures against a disposable test
  project.
- [ ] Confirm automated tests never use personal or customer credentials.
- [ ] Confirm screenshots, traces, and reports contain no passwords or secrets.

## 8. Production acceptance

- [ ] Confirm the intended academy administrator exists in Payload
  `public.users` with role `administrator`.
- [ ] Confirm at least one `content-editor` Staff member has restricted access.
- [ ] Confirm the dedicated mock Student appears in `/admin/students`.
- [ ] Verify administrator list, search, pagination, detail, and edit flows on
  desktop.
- [ ] Verify the same administrator flows on a mobile viewport.
- [ ] Verify Student login, profile view, profile edit, and logout on desktop.
- [ ] Verify Student login and profile flows on a mobile viewport.
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
- [ ] Define `app_students` independently from Student identities.
- [ ] Define `app_enrollments` and class-term relationships.
- [ ] Define `app_payments` without storing sensitive payment credentials.
- [ ] Add migrations, RLS policies, Staff authorization, and test coverage for
  each new table before enabling the family model in production.
