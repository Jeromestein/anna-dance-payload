begin;

-- A seated Cal.com event can emit one webhook per attendee while reusing the
-- same booking UID for the shared session. Keep one schedule row per attendee
-- instead of treating the provider UID as globally unique.
alter table public.app_schedule_entries
  drop constraint if exists app_schedule_entries_cal_booking_uid_key;

alter table public.app_booking_intents
  drop constraint if exists app_booking_intents_cal_booking_uid_key;

alter table public.app_schedule_entries
  add column if not exists cal_session_key text,
  add column if not exists seat_capacity integer;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'app_schedule_entries_seat_capacity_check'
      and conrelid = 'public.app_schedule_entries'::regclass
  ) then
    alter table public.app_schedule_entries
      add constraint app_schedule_entries_seat_capacity_check
      check (seat_capacity is null or seat_capacity between 1 and 500);
  end if;
end
$$;

create index if not exists app_schedule_entries_cal_booking_attendee_idx
on public.app_schedule_entries (cal_booking_uid, lower(attendee_email))
where cal_booking_uid is not null;

create index if not exists app_schedule_entries_cal_session_key_idx
on public.app_schedule_entries (cal_session_key, starts_at)
where cal_session_key is not null;

create index if not exists app_booking_intents_cal_booking_uid_idx
on public.app_booking_intents (cal_booking_uid)
where cal_booking_uid is not null;

comment on column public.app_schedule_entries.cal_session_key is
  'Deterministic Cal.com event-type and start-time key used to group attendee seats.';
comment on column public.app_schedule_entries.seat_capacity is
  'Maximum seats for the Cal.com event when the webhook supplies a seated-event capacity.';

commit;
