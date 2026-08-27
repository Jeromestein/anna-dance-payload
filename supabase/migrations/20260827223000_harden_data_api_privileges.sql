begin;

-- Payload owns the remaining public tables through its direct PostgreSQL connection.
-- Supabase Data API roles only need access to the student profile table.
revoke all privileges on all tables in schema public
from anon, authenticated, service_role;

revoke all privileges on all sequences in schema public
from anon, authenticated, service_role;

revoke execute on all functions in schema public from public;

alter default privileges for role postgres in schema public
  revoke all privileges on tables from anon, authenticated, service_role;

alter default privileges for role postgres in schema public
  revoke all privileges on sequences from anon, authenticated, service_role;

alter default privileges for role postgres in schema public
  revoke execute on functions from public;

grant select, insert on table public.user_profiles to authenticated;

grant update (name, phone, guardian_name, guardian_phone, updated_at)
on table public.user_profiles to authenticated;

grant all privileges on table public.user_profiles to service_role;

grant execute on function public.is_admin()
to authenticated, service_role;

grant execute on function public.admin_update_user_profile(
  uuid,
  text,
  text,
  text,
  text,
  text
) to authenticated, service_role;

commit;
