begin;

create table if not exists public.app_booking_intents (
  id uuid primary key,
  user_profile_id uuid not null references public.app_user_profiles(id) on delete cascade,
  expected_email text not null check (char_length(expected_email) between 3 and 254),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  cal_booking_uid text unique,
  created_at timestamptz not null default now(),
  check (expires_at > created_at)
);

alter table public.app_schedule_entries
  alter column user_profile_id drop not null;

alter table public.app_schedule_entries
  add column if not exists source text not null default 'academy',
  add column if not exists match_status text not null default 'linked',
  add column if not exists attendee_name text,
  add column if not exists attendee_email text,
  add column if not exists candidate_user_profile_id uuid references public.app_user_profiles(id)
    on delete set null,
  add column if not exists booking_intent_id uuid references public.app_booking_intents(id)
    on delete set null,
  add column if not exists cal_event_type_id bigint,
  add column if not exists cal_event_type_slug text,
  add column if not exists rescheduled_from_uid text,
  add column if not exists last_synced_at timestamptz,
  add column if not exists matched_at timestamptz,
  add column if not exists matched_by_staff_id text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'app_schedule_entries_source_check'
      and conrelid = 'public.app_schedule_entries'::regclass
  ) then
    alter table public.app_schedule_entries
      add constraint app_schedule_entries_source_check
      check (source in ('academy', 'cal_com'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'app_schedule_entries_match_status_check'
      and conrelid = 'public.app_schedule_entries'::regclass
  ) then
    alter table public.app_schedule_entries
      add constraint app_schedule_entries_match_status_check
      check (match_status in ('linked', 'unmatched', 'needs_review'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'app_schedule_entries_linked_owner_check'
      and conrelid = 'public.app_schedule_entries'::regclass
  ) then
    alter table public.app_schedule_entries
      add constraint app_schedule_entries_linked_owner_check
      check (match_status <> 'linked' or user_profile_id is not null);
  end if;
end
$$;

create index if not exists app_booking_intents_user_profile_id_idx
on public.app_booking_intents (user_profile_id, created_at desc);

create index if not exists app_schedule_entries_match_status_idx
on public.app_schedule_entries (match_status, starts_at desc);

create index if not exists app_schedule_entries_candidate_profile_idx
on public.app_schedule_entries (candidate_user_profile_id)
where candidate_user_profile_id is not null;

create unique index if not exists app_schedule_entries_booking_intent_unique
on public.app_schedule_entries (booking_intent_id)
where booking_intent_id is not null;

alter table public.app_booking_intents enable row level security;

drop policy if exists "Account holders can create their own booking intent"
on public.app_booking_intents;
create policy "Account holders can create their own booking intent"
on public.app_booking_intents
for insert
to authenticated
with check (
  (select auth.uid()) = user_profile_id
  and lower(expected_email) = lower(coalesce((select auth.jwt()) ->> 'email', ''))
  and expires_at <= now() + interval '24 hours'
  and expires_at > now()
  and consumed_at is null
  and cal_booking_uid is null
);

revoke all privileges on table public.app_booking_intents from anon, authenticated, service_role;
grant insert on table public.app_booking_intents to authenticated;
grant all privileges on table public.app_booking_intents to service_role;

comment on table public.app_booking_intents is
  'Short-lived, single-use account context passed to Cal.com booking metadata.';
comment on column public.app_schedule_entries.match_status is
  'Whether a provider appointment is linked to an account or needs Staff review.';

commit;
