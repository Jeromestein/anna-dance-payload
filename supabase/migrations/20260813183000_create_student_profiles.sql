begin;

create table if not exists public.student_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  student_name text not null check (char_length(student_name) between 2 and 100),
  student_phone text not null check (char_length(student_phone) between 7 and 24),
  guardian_name text check (guardian_name is null or char_length(guardian_name) <= 100),
  guardian_phone text check (guardian_phone is null or char_length(guardian_phone) between 7 and 24),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.student_profiles enable row level security;

revoke all on table public.student_profiles from anon;
grant select, insert, update on table public.student_profiles to authenticated;

drop policy if exists "Users can view their own student profile" on public.student_profiles;
create policy "Users can view their own student profile"
on public.student_profiles
for select
to authenticated
using ((select auth.uid()) = id);

drop policy if exists "Users can update their own student profile" on public.student_profiles;
create policy "Users can update their own student profile"
on public.student_profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

drop policy if exists "Users can create their own student profile" on public.student_profiles;
create policy "Users can create their own student profile"
on public.student_profiles
for insert
to authenticated
with check ((select auth.uid()) = id);

create or replace function public.handle_new_student_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if nullif(btrim(new.raw_user_meta_data ->> 'student_name'), '') is null then
    return new;
  end if;

  insert into public.student_profiles (
    id,
    student_name,
    student_phone,
    guardian_name,
    guardian_phone
  )
  values (
    new.id,
    btrim(new.raw_user_meta_data ->> 'student_name'),
    btrim(new.raw_user_meta_data ->> 'student_phone'),
    nullif(btrim(new.raw_user_meta_data ->> 'guardian_name'), ''),
    nullif(btrim(new.raw_user_meta_data ->> 'guardian_phone'), '')
  );

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_create_student_profile on auth.users;
create trigger on_auth_user_created_create_student_profile
  after insert on auth.users
  for each row execute procedure public.handle_new_student_user();

commit;
