begin;

-- No backfill: an existing account signing in or linking Google is not a registration.
create table public.app_google_registration_notifications (
  user_id uuid primary key references auth.users(id) on delete cascade,
  student_name text not null,
  email text not null,
  registered_at timestamptz not null,
  status text not null default 'pending'
    check (status in ('pending', 'sending', 'sent', 'failed', 'skipped')),
  attempted_at timestamptz,
  completed_at timestamptz
);
alter table public.app_google_registration_notifications enable row level security;
revoke all on public.app_google_registration_notifications from public, anon, authenticated;
grant select, update on public.app_google_registration_notifications to service_role;

create function public.enqueue_google_registration_notification()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.raw_app_meta_data ->> 'provider' = 'google' and new.email is not null then
    insert into public.app_google_registration_notifications
      (user_id, student_name, email, registered_at)
    values (
      new.id,
      left(coalesce(nullif(btrim(new.raw_user_meta_data ->> 'name'), ''),
        nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''), 'New Student'), 100),
      new.email, new.created_at
    ) on conflict (user_id) do nothing;
  end if;
  return new;
end;
$$;
revoke all on function public.enqueue_google_registration_notification() from public, anon, authenticated;
create trigger on_google_student_registered
after insert on auth.users for each row
execute function public.enqueue_google_registration_notification();

-- UPDATE locks the row: concurrent callbacks cannot both claim the same event.
create function public.claim_google_registration_notification(student_id uuid)
returns setof public.app_google_registration_notifications
language sql security definer set search_path = '' as $$
  update public.app_google_registration_notifications
  set status = 'sending', attempted_at = now()
  where user_id = student_id and status = 'pending'
  returning *;
$$;
revoke all on function public.claim_google_registration_notification(uuid) from public, anon, authenticated;
grant execute on function public.claim_google_registration_notification(uuid) to service_role;

comment on table public.app_google_registration_notifications is
  'First Google registrations only. One automatic send attempt per user; failed or interrupted attempts require operator review.';
commit;
