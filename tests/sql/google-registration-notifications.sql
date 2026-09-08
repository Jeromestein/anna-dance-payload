\set ON_ERROR_STOP on
-- Run only against an empty, disposable PostgreSQL cluster, never the shared Supabase project.
-- Existing roles/schema intentionally cause this fixture to stop before the migration runs.
create role anon;
create role authenticated;
create role service_role bypassrls;
create schema auth;
create table auth.users (
  id uuid primary key,
  email text,
  created_at timestamptz not null default now(),
  raw_app_meta_data jsonb,
  raw_user_meta_data jsonb
);

insert into auth.users (id, email, raw_app_meta_data) values
  ('00000000-0000-0000-0000-000000000001', 'existing@example.com', '{"provider":"google"}');

\ir ../../supabase/migrations/20260908020000_google_registration_notifications.sql

insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data) values
  ('00000000-0000-0000-0000-000000000002', 'new@example.com', '{"provider":"google"}', '{"name":" Google Student "}'),
  ('00000000-0000-0000-0000-000000000003', 'email@example.com', '{"provider":"email"}', '{"provider":"google"}'),
  ('00000000-0000-0000-0000-000000000004', 'fallback@example.com', '{"provider":"google"}', '{"name":" ","full_name":"Fallback Student"}'),
  ('00000000-0000-0000-0000-000000000005', 'unnamed@example.com', '{"provider":"google"}', null),
  ('00000000-0000-0000-0000-000000000006', null, '{"provider":"google"}', null);

-- Subsequent logins and Google linking are updates, not registrations.
update auth.users set raw_app_meta_data = '{"provider":"google","providers":["email","google"]}'
where id in ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003');

do $$
declare claimed integer;
begin
  assert (select count(*) from public.app_google_registration_notifications) = 3,
    'Only three newly inserted Google accounts with email should be queued';
  assert (select student_name from public.app_google_registration_notifications
    where email = 'new@example.com') = 'Google Student';
  assert (select student_name from public.app_google_registration_notifications
    where email = 'fallback@example.com') = 'Fallback Student';
  assert (select student_name from public.app_google_registration_notifications
    where email = 'unnamed@example.com') = 'New Student';
  select count(*) into claimed from public.claim_google_registration_notification('00000000-0000-0000-0000-000000000002');
  assert claimed = 1, 'First callback must claim one event';
  select count(*) into claimed from public.claim_google_registration_notification('00000000-0000-0000-0000-000000000002');
  assert claimed = 0, 'Repeated callback must not reclaim an event';
  assert (select status = 'sending' and attempted_at is not null
    from public.app_google_registration_notifications where email = 'new@example.com');
  assert not has_table_privilege('anon', 'public.app_google_registration_notifications', 'SELECT');
  assert not has_table_privilege('authenticated', 'public.app_google_registration_notifications', 'SELECT');
  assert not has_table_privilege('authenticated', 'public.app_google_registration_notifications', 'UPDATE');
  assert not has_function_privilege('authenticated', 'public.claim_google_registration_notification(uuid)', 'EXECUTE');
  assert not has_function_privilege('anon', 'public.claim_google_registration_notification(uuid)', 'EXECUTE');
  assert has_function_privilege('service_role', 'public.claim_google_registration_notification(uuid)', 'EXECUTE');
  assert (select relrowsecurity from pg_class where oid = 'public.app_google_registration_notifications'::regclass);
end;
$$;

set role service_role;
select user_id from public.claim_google_registration_notification('00000000-0000-0000-0000-000000000004');
update public.app_google_registration_notifications set status = 'sent', completed_at = now()
where user_id = '00000000-0000-0000-0000-000000000004' and status = 'sending';
reset role;

do $$
begin
  assert (select status from public.app_google_registration_notifications
    where email = 'fallback@example.com') = 'sent', 'Service role must persist delivery status';
  assert (select count(*) from public.claim_google_registration_notification('00000000-0000-0000-0000-000000000004')) = 0;
end;
$$;

-- Leave the unnamed account pending for the concurrent-claim test.
select 'Google registration migration assertions passed' as result;
