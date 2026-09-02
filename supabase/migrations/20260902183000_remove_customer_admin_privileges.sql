begin;

-- Staff authorization belongs to Payload. A value stored on a customer profile
-- must never allow a Supabase Auth user to read or modify another customer.
drop policy if exists "Users can view profiles allowed by their role"
on public.user_profiles;

drop policy if exists "Users can view their own profile"
on public.user_profiles;

drop function if exists public.admin_update_user_profile(
  uuid,
  text,
  text,
  text,
  text,
  text
);

drop function if exists public.is_admin();

create policy "Users can view their own profile"
on public.user_profiles
for select
to authenticated
using ((select auth.uid()) = id);

-- Reassert the intended Data API boundary. The server-only service role can
-- administer profiles for an authenticated Payload administrator.
revoke all privileges on table public.user_profiles from anon;
revoke update on table public.user_profiles from authenticated;

grant select, insert on table public.user_profiles to authenticated;

grant update (name, phone, guardian_name, guardian_phone, updated_at)
on table public.user_profiles to authenticated;

grant all privileges on table public.user_profiles to service_role;

commit;
