begin;

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  profile_name text := coalesce(
    nullif(btrim(new.raw_user_meta_data ->> 'name'), ''),
    nullif(btrim(new.raw_user_meta_data ->> 'student_name'), ''),
    nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(btrim(new.raw_user_meta_data ->> 'preferred_username'), ''),
    split_part(new.email, '@', 1)
  );
  profile_phone text := coalesce(
    nullif(btrim(new.raw_user_meta_data ->> 'phone'), ''),
    nullif(btrim(new.raw_user_meta_data ->> 'student_phone'), '')
  );
begin
  if new.email is null then
    return new;
  end if;

  insert into public.user_profiles (
    id,
    email,
    role,
    name,
    phone,
    guardian_name,
    guardian_phone
  )
  values (
    new.id,
    lower(new.email),
    'student',
    profile_name,
    profile_phone,
    nullif(btrim(new.raw_user_meta_data ->> 'guardian_name'), ''),
    nullif(btrim(new.raw_user_meta_data ->> 'guardian_phone'), '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

commit;
