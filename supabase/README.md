# Supabase Student Authentication Schema

The SQL files in `migrations/` were migrated from the original Anna Dance Academy application and
applied in timestamp order to the shared `anna-dance-payload-poc` Supabase project on August 27, 2026.

They create and evolve the legacy `public.user_profiles` table, then copy its records into
`public.app_user_profiles`. Row Level Security protects self-service profile, payment, and schedule
access. Auth triggers create new app profiles and synchronize email changes. The final schema
supports email/password and Google-created Auth users.

Payload staff and Supabase Auth users remain separate:

- `public.users` contains Payload administrator and content-editor accounts.
- `auth.users` contains student and parent login identities.
- `public.app_user_profiles` contains student and parent profile details keyed to `auth.users.id`.
- `public.user_profiles` is retained temporarily as a rollback copy and is not used by the app.

Do not re-run only a later migration against a blank database. Apply every file in timestamp order.
The first migration creates `student_profiles`; a later migration renames it to `user_profiles`.
The current forward migration creates `app_user_profiles`, backfills it, and switches the Auth
triggers without deleting either historical table name from the migration chain.

The application's server-only Supabase secret bypasses RLS for the Payload-administrator student
directory. Never expose it through a `NEXT_PUBLIC_*` variable or commit it to Git.

Payload and application tables share the `public` schema, so table ownership is explicit. The
Payload Postgres adapter excludes `user_profiles`, the legacy `student_profiles` name, and every
`app_*` table from development schema synchronization. New operational tables must use the `app_`
prefix (unless their exact name is also added to the adapter filter) so CMS schema changes cannot
drop them.

The Data API is enabled for student self-service access, but its database roles are intentionally
restricted. `authenticated` receives only the row-level access required by `app_user_profiles` and
read-only access to its own `app_payments` and `app_schedule_entries`. The server-only
`service_role` administers those tables. Payload tables are not granted to `anon`, `authenticated`,
or `service_role`; Payload reaches them through its direct PostgreSQL connection. Default Data API
grants are also disabled for future tables and functions.

The legacy `user_profiles.role = admin` authorization path is removed by the forward migrations.
Customer sessions can read only their own profile, regardless of the stored legacy role. Staff
authorization is determined exclusively by the Payload `public.users.role` field, and administrator
profile management uses the server-only Supabase service role after Payload authorization succeeds.
