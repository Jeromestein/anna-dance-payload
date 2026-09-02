# Dual Authentication Architecture

## Purpose

Anna Dance Academy uses Payload and Supabase in the same application and
database, but the two systems own separate identities.

The boundary is intentional:

- Payload authenticates academy staff and controls CMS permissions.
- Supabase Auth authenticates students and parents.
- Supabase business tables store customer-facing profile data.
- A Payload administrator may manage customer profiles through a server-only
  Supabase client without signing in to Supabase separately.

The systems must not synchronize passwords, sessions, or user records.

## Identity ownership

| User type | Login | Identity store | Primary access |
| --- | --- | --- | --- |
| Administrator | `/admin` | Payload `public.users` | CMS and customer profile management |
| Content editor | `/admin` | Payload `public.users` | Website content only |
| Student or parent | `/login` | Supabase `auth.users` | Own account profile only |

Customer profile data is stored in `public.user_profiles`. Its `id` matches the
corresponding Supabase Auth user ID:

```text
auth.users.id = public.user_profiles.id
```

## Staff authorization flow

```text
Payload login cookie
  -> authenticate the Payload user
  -> require role = administrator
  -> create a server-only Supabase admin client
  -> read or update public.user_profiles
```

Every page and mutation that exposes customer data must independently verify
the Payload user and require the `administrator` role. Protecting only the
page is not sufficient; server actions and route handlers must repeat the
authorization check.

The relevant implementation is located in:

- `src/lib/staff/auth.ts`
- `src/lib/supabase/admin.ts`
- `src/app/(frontend)/users/page.tsx`
- `src/app/(frontend)/users/[id]/page.tsx`
- `src/app/(frontend)/users/actions.ts`

Content editors must not be able to list, search, open, or modify customer
profiles.

## Customer authorization flow

```text
Supabase session cookie
  -> verify Supabase claims
  -> resolve auth.users.id
  -> read or update the matching public.user_profiles row
  -> enforce ownership with Supabase RLS
```

Students and parents use `/login` and manage their own profile at `/users/me`.
They never receive Payload access and cannot use the staff management routes.

Supabase RLS must restrict customer access to rows where:

```sql
id = auth.uid()
```

## Authorization sources

Payload staff permissions are determined only by the role on Payload's
`public.users` record:

- `administrator`: may manage customer profiles.
- `content-editor`: may edit approved CMS content only.

The legacy `public.user_profiles.role` field is not a staff authorization
source. A value of `admin` in that table must never grant access to `/users` or
to a staff-only mutation.

Until a dedicated migration removes or replaces the legacy field, the UI may
display it only as legacy customer-profile data. New customer records should
remain ordinary account-holder records.

## Database ownership boundary

Payload owns:

- `public.users`
- Payload CMS collections, globals, relations, and migration tables

Supabase owns:

- `auth.users`
- `public.user_profiles`
- Legacy `public.student_profiles`, while it remains present
- Business tables prefixed with `app_`

The Payload Postgres adapter must continue to exclude the Supabase business
tables:

```ts
tablesFilter: ['!user_profiles', '!student_profiles', '!app_*']
```

This prevents Payload schema synchronization from treating business tables as
obsolete CMS tables.

## Secret handling

The Supabase service-role key bypasses RLS and must remain server-only.

- Store it as `SUPABASE_SERVICE_ROLE_KEY`.
- Never expose it through a `NEXT_PUBLIC_*` variable.
- Import the admin client only from server components, server actions, or route
  handlers.
- Keep `import 'server-only'` in the admin-client module.
- Never return the key, admin client, or raw privileged error details to the
  browser.

Because the service role bypasses RLS, application-level Payload authorization
must run before every privileged query or mutation.

## Current account model

`public.user_profiles` currently represents one account holder and one set of
student or guardian contact details. It does not yet support:

- One parent managing multiple students
- Family relationships
- Enrollment and class history
- Terms, attendance, or payments

The next data-model phase should retain `user_profiles` as the account-holder
record and introduce:

```text
app_families
app_family_members
app_students
app_enrollments
app_payments
```

That phase must preserve the same authentication boundary: Payload manages
staff, Supabase Auth manages customers, and business tables reference customer
identities without merging the two login systems.

## Acceptance rule

The architecture is accepted only when all items in
`docs/operations/auth-acceptance-checklist.md` pass. Source-code presence alone
does not prove production configuration, RLS behavior, or runtime access
control.
