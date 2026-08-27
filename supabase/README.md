# Supabase Student Authentication Schema

The SQL files in `migrations/` were migrated from the original Anna Dance Academy application and
applied in timestamp order to the shared `anna-dance-payload-poc` Supabase project on August 27, 2026.

They create and evolve `public.user_profiles`, enable Row Level Security, add policies for
self-service profile access, and install Auth triggers that create profiles and synchronize email
changes. The final schema supports email/password and Google-created Auth users.

Payload staff and Supabase Auth users remain separate:

- `public.users` contains Payload administrator and content-editor accounts.
- `auth.users` contains student and parent login identities.
- `public.user_profiles` contains student and parent profile details keyed to `auth.users.id`.

Do not re-run only a later migration against a blank database. Apply every file in timestamp order.
The first migration creates `student_profiles`; a later migration renames it to `user_profiles`.

The application's server-only Supabase secret bypasses RLS for the Payload-administrator student
directory. Never expose it through a `NEXT_PUBLIC_*` variable or commit it to Git.

Payload and application tables share the `public` schema, so table ownership is explicit. The
Payload Postgres adapter excludes `user_profiles`, the legacy `student_profiles` name, and every
`app_*` table from development schema synchronization. New operational tables must use the `app_`
prefix (unless their exact name is also added to the adapter filter) so CMS schema changes cannot
drop them.

The Data API is enabled for student self-service access, but its database roles are intentionally
restricted. `authenticated` receives only the row-level access required by `user_profiles`, and the
server-only `service_role` can administer that table. Payload tables are not granted to `anon`,
`authenticated`, or `service_role`; Payload reaches them through its direct PostgreSQL connection.
Default Data API grants are also disabled for future tables and functions.
