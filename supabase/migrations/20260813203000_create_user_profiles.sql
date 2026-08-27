begin;

alter table public.student_profiles rename to user_profiles;
alter table public.user_profiles rename column student_name to name;
alter table public.user_profiles rename column student_phone to phone;

alter table public.user_profiles
  add column email text,
  add column role text not null default 'student'
    check (role in ('student', 'admin'));

update public.user_profiles as profile
set email = lower(auth_user.email)
from auth.users as auth_user
where profile.id = auth_user.id;

alter table public.user_profiles
  alter column email set not null,
  add constraint user_profiles_email_length
    check (char_length(email) between 3 and 254);

create unique index user_profiles_email_unique
on public.user_profiles (lower(email));

drop policy if exists "Users can view their own student profile" on public.user_profiles;
drop policy if exists "Users can update their own student profile" on public.user_profiles;
drop policy if exists "Users can create their own student profile" on public.user_profiles;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_profiles
    where id = (select auth.uid())
      and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

create policy "Users can view profiles allowed by their role"
on public.user_profiles
for select
to authenticated
using ((select auth.uid()) = id or (select public.is_admin()));

create policy "Users can update their own profile"
on public.user_profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy "Users can create their own student profile"
on public.user_profiles
for insert
to authenticated
with check (
  (select auth.uid()) = id
  and role = 'student'
  and lower(email) = lower(coalesce((select auth.jwt()) ->> 'email', ''))
);

revoke all on table public.user_profiles from anon;
revoke update on table public.user_profiles from authenticated;
grant select, insert on table public.user_profiles to authenticated;
grant update (name, phone, guardian_name, guardian_phone, updated_at)
on table public.user_profiles to authenticated;

drop trigger if exists on_auth_user_created_create_student_profile on auth.users;
drop function if exists public.handle_new_student_user();

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  profile_name text := coalesce(
    nullif(btrim(new.raw_user_meta_data ->> 'name'), ''),
    nullif(btrim(new.raw_user_meta_data ->> 'student_name'), '')
  );
  profile_phone text := coalesce(
    nullif(btrim(new.raw_user_meta_data ->> 'phone'), ''),
    nullif(btrim(new.raw_user_meta_data ->> 'student_phone'), '')
  );
begin
  if profile_name is null or profile_phone is null or new.email is null then
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

drop trigger if exists on_auth_user_created_create_user_profile on auth.users;
create trigger on_auth_user_created_create_user_profile
  after insert on auth.users
  for each row execute function public.handle_new_user_profile();

create or replace function public.sync_user_profile_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is distinct from old.email and new.email is not null then
    update public.user_profiles
    set email = lower(new.email), updated_at = now()
    where id = new.id;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_email_changed_sync_profile on auth.users;
create trigger on_auth_user_email_changed_sync_profile
  after update of email on auth.users
  for each row execute function public.sync_user_profile_email();

commit;
