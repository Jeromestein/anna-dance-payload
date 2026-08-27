begin;

create or replace function public.admin_update_user_profile(
  target_user_id uuid,
  target_name text,
  target_phone text,
  target_guardian_name text,
  target_guardian_phone text,
  target_role text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  existing_role text;
begin
  if not public.is_admin() then
    raise exception 'Admin access required' using errcode = '42501';
  end if;

  if target_role not in ('student', 'admin') then
    raise exception 'Invalid user role' using errcode = '22023';
  end if;

  select role
  into existing_role
  from public.user_profiles
  where id = target_user_id;

  if not found then
    raise exception 'User profile not found' using errcode = 'P0002';
  end if;

  if target_user_id = (select auth.uid()) and target_role <> existing_role then
    raise exception 'Admins cannot change their own role' using errcode = '42501';
  end if;

  update public.user_profiles
  set
    name = btrim(target_name),
    phone = btrim(target_phone),
    guardian_name = nullif(btrim(target_guardian_name), ''),
    guardian_phone = nullif(btrim(target_guardian_phone), ''),
    role = target_role,
    updated_at = now()
  where id = target_user_id;
end;
$$;

revoke all on function public.admin_update_user_profile(uuid, text, text, text, text, text) from public;
grant execute on function public.admin_update_user_profile(uuid, text, text, text, text, text) to authenticated;

commit;
