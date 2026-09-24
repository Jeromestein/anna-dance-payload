# Required student profile details

Applied to Supabase project `hsitmgmcekzobksgtjoj` on September 24, 2026.
The `plusone` Chrome profile's Supabase dashboard and local database connection
were checked against the same project before applying the migration.

## Database

Migration: `supabase/migrations/20260924180000_student_required_details.sql`.
SHA-256: `a947f5b4881547674d8dd74b26863dfb49f35d4d975c1040000780f546fa90df`.
This migration has already been applied. Do not rerun it.

Adds date of birth, street address, optional apartment/unit, city, state,
ZIP/postal code, health notes, and a generated profile-completion flag to
`app_user_profiles`. Completed profiles require a valid phone number and all
required enrollment details. The student and guardian phone numbers may match.
Health notes must be entered by the family; `N/A` is accepted but never prefilled.

Existing and newly created OAuth profiles can remain incomplete until the account
holder fills in the required fields. No dates, addresses, or health answers were
backfilled. All eight existing profiles retained their original values, verified
by comparing row fingerprints inside the migration transaction.

Existing owner-only RLS and administrator access are preserved. Authenticated
account holders receive update permission on their own new fields. The generated
completion flag is not directly editable. Student directory queries select only
that flag, not health-note contents.

## Application behavior

Registration, Account Profile, and Admin Student Profile share the enrollment
fields and server validation. Health notes, address, and date of birth are saved
only to the profile table, not Auth metadata/JWTs or registration email notices.
Email signup saves enrollment details after Auth creates the profile. If this
second step fails, the account remains recoverable and the family is directed to
complete its Profile. Existing completed profiles are not overwritten by signup.

Google callback checks the completion flag and directs incomplete accounts to
Account. Account shows a completion notice and opens the Profile tab on mobile.
Administrators see a completion indicator in desktop and mobile student lists.
Privacy copy now describes the dedicated enrollment/Profile collection fields.

## Verification

- Transactional dry run, followed by application with a three-second lock timeout.
- Real database checks: explicit N/A, matching student/guardian phones, required
  values, whitespace-only health notes, future dates, invalid phones, own-profile
  update, cross-account denial, unchanged original data, and RLS enabled. All test
  profile changes were rolled back before committing schema changes.
- REST schema probe succeeded for all new fields (206, total eight profiles);
  anonymous access was denied (401 / PostgreSQL 42501).
- 38 focused tests passed, including validation, signup data separation,
  duplicate-account behavior, profile-save recovery, administrator authorization,
  cross-account protection, and Google callback routing.
- TypeScript and scoped ESLint checks passed. No production build was run.
- Registration desktop layout inspected in the Codex in-app browser. Its viewport
  override did not affect the existing tab, so mobile registration was checked
  with the project's Playwright CLI wrapper at 390px. Content width was 390px;
  required fields and manually entered N/A rendered correctly.
- Live Account and Admin visual/save verification is pending user login to the
  local site in Chrome profile `plusone`. Neither had an authenticated session.
  No live registration, email, or existing-profile edit was submitted for UI QA.

Database schema changes were applied before the application release and remain
compatible with the previous application version. Consult Git history for the
application commit; production deployment verification is separate from the
local checks recorded above.
