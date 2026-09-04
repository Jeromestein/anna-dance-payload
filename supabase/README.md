# Supabase Student Authentication Schema

The SQL files in `migrations/` were migrated from the original Anna Dance Academy application and
applied in timestamp order to the shared `anna-dance-payload-poc` Supabase project on August 27, 2026.

They create and evolve the legacy `public.user_profiles` table, then copy its records into
`public.app_user_profiles`. Row Level Security protects self-service profile, payment, and schedule
access. Auth triggers create new app profiles and synchronize email changes. The final schema
supports email/password and Google-created Auth users.

`20260904153000_add_cal_booking_sync.sql` adds short-lived booking intents and extends schedule
entries with Cal.com synchronization and review fields. The active website flow stores only
account-linked appointments; the additional match states remain available for historical safety.
The migration was applied to the shared project on September 4, 2026, before enabling the Cal.com
webhook.

Payload staff and Supabase Auth users remain separate:

- `public.users` contains Payload administrator and content-editor accounts.
- `auth.users` contains student and parent login identities.
- `public.app_user_profiles` contains student and parent profile details keyed to `auth.users.id`.
- `public.user_profiles` was the legacy profile table and has been removed.

## Deprecated tables

| Table                     | Production state | Status                                                                                      | Replacement                | Removal action                                                                                                 |
| ------------------------- | ---------------- | ------------------------------------------------------------------------------------------- | -------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `public.user_profiles`    | Removed          | Deprecated legacy table; removed after its records and Auth flows moved to the replacement. | `public.app_user_profiles` | Completed by `20260904111500_drop_legacy_user_profiles.sql`.                                                   |
| `public.student_profiles` | Does not exist   | Historical migration name; it was renamed to `public.user_profiles`.                        | `public.app_user_profiles` | No table needs to be dropped. Keep its Payload filter entry while the historical migration chain is supported. |

No other production table is currently marked as deprecated.

### `public.user_profiles` removal checklist

- [x] Switch application profile reads and writes to `public.app_user_profiles`.
- [x] Switch new-user and email-synchronization Auth triggers to `public.app_user_profiles`.
- [x] Verify a production Student profile read/update/restore round trip leaves
      `public.user_profiles` unchanged.
- [x] Confirm no application code, database function, policy, scheduled job, or external
      integration still depends on `public.user_profiles`.
- [x] Confirm every legacy profile ID exists in `public.app_user_profiles` before removal.
- [x] Add and apply a forward migration that drops `public.user_profiles`. Do not
      delete or rewrite the historical migrations that created it.
- [x] After the production drop is verified, remove the exact
      `!user_profiles` Payload filter and update documentation that describes the rollback copy.

Do not re-run only a later migration against a blank database. Apply every file in timestamp order.
The first migration creates `student_profiles`; a later migration renames it to `user_profiles`.
The current forward migration creates `app_user_profiles`, backfills it, and switches the Auth
triggers without deleting either historical table name from the migration chain.

The application's server-only Supabase secret bypasses RLS for the Payload-administrator student
directory. Never expose it through a `NEXT_PUBLIC_*` variable or commit it to Git.

Payload and application tables share the `public` schema, so table ownership is explicit. The
Payload Postgres adapter excludes the historical `student_profiles` name and every `app_*` table
from development schema synchronization. New operational tables must use the `app_` prefix (unless
their exact name is also added to the adapter filter) so CMS schema changes cannot drop them.

The Data API is enabled for student self-service access, but its database roles are intentionally
restricted. `authenticated` receives only the row-level access required by `app_user_profiles` and
read-only access to its own `app_payments` and `app_schedule_entries`. An authenticated account may
insert only its own short-lived `app_booking_intents` record and cannot read booking intents. The
server-only `service_role` administers those tables and processes signed Cal.com webhooks. Payload
tables are not granted to `anon`, `authenticated`, or `service_role`; Payload reaches them through
its direct PostgreSQL connection. Default Data API grants are also disabled for future tables and
functions.

## Cal.com webhook setup

The application endpoint is `/api/integrations/cal/webhook`. Configure the deployment with:

- `CAL_WEBHOOK_SECRET`: a new random secret used only by this webhook.
- `CAL_ALLOWED_EVENT_TYPE_SLUGS`: a comma-separated allowlist. The default is
  `trial-class-consultation`.

Use the same secret in the Cal.com webhook settings. Subscribe to booking created, rescheduled,
cancelled, confirmed, rejected, and completed events. Keep Cal.com's default payload shape so the
handler receives booking UID, attendee, metadata, event type, timing, and status fields. The
subscriber URL must be the deployed HTTPS URL; Cal.com Cloud does not send webhooks to localhost.

The browser never receives the webhook secret or Supabase service-role key. A client-side booking
success event is informational only; the signed webhook is the only automatic synchronization
authority. The website does not render the Cal.com booking form for signed-out visitors, and
webhooks without a valid account booking intent are acknowledged but not stored.

The Cal.com Event Type remains public until the Academy chooses to hide it. A person with its direct
Cal.com URL can therefore still book outside the website, but that booking will remain in Cal.com
only and will not be imported into an Academy account without valid website account context.

The legacy `user_profiles.role = admin` authorization path and table were removed by forward
migrations. Staff authorization is determined exclusively by the Payload `public.users.role` field,
and administrator profile management uses the server-only Supabase service role after Payload
authorization succeeds.
