begin;

create table if not exists public.app_user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 100),
  phone text check (phone is null or char_length(phone) between 7 and 24),
  guardian_name text check (guardian_name is null or char_length(guardian_name) <= 100),
  guardian_phone text check (
    guardian_phone is null or char_length(guardian_phone) between 7 and 24
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  email text not null check (char_length(email) between 3 and 254),
  role text not null default 'student' check (role in ('student', 'admin'))
);

create unique index if not exists app_user_profiles_email_unique
on public.app_user_profiles (lower(email));

insert into public.app_user_profiles (
  id,
  name,
  phone,
  guardian_name,
  guardian_phone,
  created_at,
  updated_at,
  email,
  role
)
select
  id,
  name,
  phone,
  guardian_name,
  guardian_phone,
  created_at,
  updated_at,
  email,
  role
from public.user_profiles
on conflict (id) do nothing;

create table if not exists public.app_payments (
  id uuid primary key default gen_random_uuid(),
  user_profile_id uuid not null references public.app_user_profiles(id) on delete cascade,
  term_name text not null check (char_length(term_name) between 1 and 120),
  class_name text not null check (char_length(class_name) between 1 and 160),
  lesson_count integer not null check (lesson_count between 1 and 100),
  amount_cents integer not null check (amount_cents >= 0),
  currency text not null default 'usd' check (currency = lower(currency) and char_length(currency) = 3),
  due_date date,
  status text not null default 'payment_due' check (
    status in (
      'payment_due',
      'pending_verification',
      'paid',
      'partially_refunded',
      'refunded',
      'cancelled'
    )
  ),
  stripe_payment_link text,
  stripe_checkout_session_id text unique,
  stripe_payment_intent_id text unique,
  receipt_url text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists app_payments_user_profile_id_idx
on public.app_payments (user_profile_id);

create table if not exists public.app_schedule_entries (
  id uuid primary key default gen_random_uuid(),
  user_profile_id uuid not null references public.app_user_profiles(id) on delete cascade,
  payment_id uuid references public.app_payments(id) on delete set null,
  entry_type text not null check (
    entry_type in ('class', 'consultation', 'private_lesson', 'makeup')
  ),
  title text not null check (char_length(title) between 1 and 160),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  timezone text not null default 'America/New_York',
  location text,
  status text not null default 'scheduled' check (
    status in ('scheduled', 'changed', 'cancelled', 'completed')
  ),
  cal_booking_uid text unique,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create index if not exists app_schedule_entries_user_starts_at_idx
on public.app_schedule_entries (user_profile_id, starts_at);

alter table public.app_user_profiles enable row level security;
alter table public.app_payments enable row level security;
alter table public.app_schedule_entries enable row level security;

drop policy if exists "Account holders can view their own profile"
on public.app_user_profiles;
create policy "Account holders can view their own profile"
on public.app_user_profiles
for select
to authenticated
using ((select auth.uid()) = id);

drop policy if exists "Account holders can create their own profile"
on public.app_user_profiles;
create policy "Account holders can create their own profile"
on public.app_user_profiles
for insert
to authenticated
with check (
  (select auth.uid()) = id
  and role = 'student'
  and lower(email) = lower(coalesce((select auth.jwt()) ->> 'email', ''))
);

drop policy if exists "Account holders can update their own profile"
on public.app_user_profiles;
create policy "Account holders can update their own profile"
on public.app_user_profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

drop policy if exists "Account holders can view their own payments"
on public.app_payments;
create policy "Account holders can view their own payments"
on public.app_payments
for select
to authenticated
using ((select auth.uid()) = user_profile_id);

drop policy if exists "Account holders can view their own schedule"
on public.app_schedule_entries;
create policy "Account holders can view their own schedule"
on public.app_schedule_entries
for select
to authenticated
using ((select auth.uid()) = user_profile_id);

-- Keep the legacy table as a safe rollback copy. Its old profile role must not
-- grant access to any other customer record.
drop policy if exists "Users can view profiles allowed by their role"
on public.user_profiles;
drop policy if exists "Users can view their own profile"
on public.user_profiles;
create policy "Users can view their own profile"
on public.user_profiles
for select
to authenticated
using ((select auth.uid()) = id);

drop function if exists public.admin_update_user_profile(
  uuid,
  text,
  text,
  text,
  text,
  text
);
drop function if exists public.is_admin();

revoke all privileges on table public.app_user_profiles from anon, authenticated, service_role;
revoke all privileges on table public.app_payments from anon, authenticated, service_role;
revoke all privileges on table public.app_schedule_entries from anon, authenticated, service_role;

grant select, insert on table public.app_user_profiles to authenticated;
grant update (name, phone, guardian_name, guardian_phone, updated_at)
on table public.app_user_profiles to authenticated;
grant select on table public.app_payments to authenticated;
grant select on table public.app_schedule_entries to authenticated;

grant all privileges on table public.app_user_profiles to service_role;
grant all privileges on table public.app_payments to service_role;
grant all privileges on table public.app_schedule_entries to service_role;

-- Retain rollback access on the legacy table while matching the hardened
-- customer boundary used by the application table.
revoke all privileges on table public.user_profiles from anon;
revoke update on table public.user_profiles from authenticated;
grant select, insert on table public.user_profiles to authenticated;
grant update (name, phone, guardian_name, guardian_phone, updated_at)
on table public.user_profiles to authenticated;
grant all privileges on table public.user_profiles to service_role;

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

  insert into public.app_user_profiles (
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

create or replace function public.sync_user_profile_email()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is distinct from old.email and new.email is not null then
    update public.app_user_profiles
    set email = lower(new.email), updated_at = now()
    where id = new.id;
  end if;

  return new;
end;
$$;

revoke all on function public.handle_new_user_profile() from public, anon, authenticated;
revoke all on function public.sync_user_profile_email() from public, anon, authenticated;

comment on table public.app_user_profiles is
  'Application account profiles keyed to Supabase Auth users.';
comment on table public.app_payments is
  'Semester payment records displayed in My Account.';
comment on table public.app_schedule_entries is
  'Student class and appointment entries displayed in My Account.';

commit;
