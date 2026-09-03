# Staff and Student Authentication Architecture

## Purpose

Anna Dance Academy uses Payload and Supabase in the same application and
production database, but each system owns a different type of identity:

- Payload authenticates academy **Staff** and controls CMS permissions.
- Supabase Auth authenticates **Students** and protects their personal data.
- A Payload administrator may manage Student profiles from inside the Payload admin
  experience without signing in to Supabase separately.

The technical identity boundary remains separate, while the administration
experience is consolidated into one `/admin` interface.

The user interface must use only the labels **Staff** and **Student**. It must
not use `Users`, `Staff Accounts`, or `Student Accounts` as navigation labels.

## Identity ownership

| Identity             | Login    | Identity store         | Primary access                     |
| -------------------- | -------- | ---------------------- | ---------------------------------- |
| Administrator Staff  | `/admin` | Payload `public.users` | CMS, Staff, and Student management |
| Content editor Staff | `/admin` | Payload `public.users` | Approved website content only      |
| Student              | `/login` | Supabase `auth.users`  | Own profile only                   |

Student profile data is stored in `public.app_user_profiles`. Its `id` matches the
corresponding Supabase Auth user ID:

```text
auth.users.id = public.app_user_profiles.id
```

Passwords, sessions, and identity records are never synchronized between
Payload and Supabase.

## Target navigation

### Staff experience

All Staff work begins at `/admin` and remains inside the Payload admin shell:

```text
/admin
├── Website Content
├── Media Library
└── Administration
    ├── Student
    └── Staff
```

- **Student** opens `/admin/students`.
- Selecting a Student opens `/admin/students/[id]`.
- **Staff** continues to use Payload's existing authenticated `users`
  collection internally, but the collection label shown in the interface is
  `Staff`.
- The Staff collection slug and `public.users` table name remain unchanged to
  avoid an unnecessary database migration.

The Student section must support listing, searching, filtering, pagination,
profile detail, and profile editing without leaving the Payload admin shell.

### Student experience

Students use the public website rather than the Payload admin interface:

```text
/login
  -> Supabase authentication
  -> /account
```

`/account` allows a Student to view and update only their own name, optional
phone number, and optional parent or guardian contact.

Because the website has not launched, the previous routes are removed instead
of redirected:

- `/users`
- `/users/[id]`
- `/users/me`

These old routes must return a safe not-found response and must not expose
Student data.

## Staff authorization flow

```text
Payload login cookie
  -> authenticate the Payload Staff member
  -> require role = administrator
  -> create a server-only Supabase admin client
  -> read or update public.app_user_profiles
```

Every page and mutation that exposes Student data must independently verify
the Payload user and require the `administrator` role. Protecting only the
page is not sufficient; server actions and route handlers must repeat the
authorization check.

Content editors must not see the Student navigation item and must not be able
to list, search, open, or modify Student profiles through direct requests.

## Student authorization flow

```text
Supabase session cookie
  -> verify Supabase claims
  -> resolve auth.users.id
  -> read or update the matching public.app_user_profiles row
  -> enforce ownership with Supabase RLS
```

Students never receive Payload access. Supabase RLS must restrict Student
access to rows where:

```sql
id = auth.uid()
```

## Authorization sources

Payload Staff permissions are determined only by the role on Payload's
`public.users` record:

- `administrator`: may manage Staff and Students.
- `content-editor`: may edit approved CMS content only.

The legacy profile `role` field is not a Staff authorization
source. A value of `admin` in that table must never grant access to
`/admin/students` or to a privileged mutation.

## Database ownership boundary

Payload owns:

- `public.users`
- Payload CMS collections, globals, relations, and migration tables

Supabase owns:

- `auth.users`
- `public.app_user_profiles`
- `public.user_profiles`, retained temporarily as a rollback copy
- Legacy `public.student_profiles`, if it remains present
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

## Implementation sequence

1. Rename the visible Payload collection label from `Users` to `Staff` without
   changing its slug or database table.
2. Add administrator-only Student list and detail views inside `/admin`.
3. Move the Student self-service profile from `/users/me` to `/account`.
4. Remove the previous `/users` route family and its frontend administrator
   navigation.
5. Update authorization tests and complete desktop and mobile acceptance.

The changes should be committed in these independent modules:

```text
refactor(auth): distinguish staff and student identities
feat(admin): manage students inside Payload
refactor(profile): move student profile to account route
test(auth): verify consolidated administration access
```

## Current profile model

`public.app_user_profiles` currently represents one Student login and its profile
details. It does not yet support:

- One parent managing multiple Students
- Family relationships
- Enrollment and class history
- Terms, attendance, or payments

A future family model may introduce `app_families`, `app_family_members`,
`app_students`, `app_enrollments`, and `app_payments`. That work is outside the
current Staff and Student interface consolidation.

## Acceptance rule

The architecture is accepted only when all applicable items in
`docs/operations/auth-acceptance-checklist.md` pass. Source-code presence alone
does not prove production configuration, RLS behavior, or runtime access
control.
