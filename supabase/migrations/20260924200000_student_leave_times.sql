begin;
set local lock_timeout = '3s';

alter table public.app_user_profiles
  add column first_leave_at timestamptz,
  add column second_leave_at timestamptz,
  add constraint app_leave_time_order check (
    second_leave_at is null or (first_leave_at is not null and second_leave_at > first_leave_at)
  );

-- Derive the cycle; never persist a separate period or clear records with a cron job.
create function public.app_leave_period_start(p_at timestamptz)
returns date language sql immutable strict set search_path='' as $$
  select make_date(extract(year from p_at at time zone 'America/New_York')::int,
    case when extract(month from p_at at time zone 'America/New_York') < 6 then 1 else 6 end,1)
$$;

-- Called only by the authenticated server action. Expected values serialize
-- duplicate submissions without adding a request-id column to the profile.
create function public.app_record_student_leave(
  p_owner uuid,p_expected_first timestamptz,p_expected_second timestamptz
) returns jsonb language plpgsql security definer set search_path='' as $$
declare p public.app_user_profiles%rowtype; submitted timestamptz; period date; used integer;
begin
  select * into p from public.app_user_profiles where id=p_owner for update;
  if not found then raise exception 'Student profile not found'; end if;
  if p.first_leave_at is distinct from p_expected_first or p.second_leave_at is distinct from p_expected_second
    then raise exception 'Leave balance changed; refresh before submitting'; end if;
  submitted:=clock_timestamp();
  period:=public.app_leave_period_start(submitted);
  used:=(case when public.app_leave_period_start(p.first_leave_at)=period then 1 else 0 end)
       +(case when public.app_leave_period_start(p.second_leave_at)=period then 1 else 0 end);
  if used>=2 then raise exception 'No leave requests remain in this period'; end if;
  if used=0 then
    update public.app_user_profiles set first_leave_at=submitted,second_leave_at=null where id=p_owner;
  else
    update public.app_user_profiles set second_leave_at=submitted where id=p_owner;
  end if;
  return jsonb_build_object('submitted_at',submitted,'remaining',1-used);
end $$;

-- Keep the new timestamps out of customer-writable fields, including profile fallback inserts.
revoke insert on public.app_user_profiles from authenticated;
grant insert(id,name,phone,guardian_name,guardian_phone,created_at,updated_at,email,role,
  date_of_birth,address_line1,address_line2,city,state,postal_code,health_notes)
  on public.app_user_profiles to authenticated;
revoke all on function public.app_leave_period_start(timestamptz) from public,anon,authenticated;
revoke all on function public.app_record_student_leave(uuid,timestamptz,timestamptz) from public,anon,authenticated;
grant execute on function public.app_leave_period_start(timestamptz) to service_role;
grant execute on function public.app_record_student_leave(uuid,timestamptz,timestamptz) to service_role;
comment on column public.app_user_profiles.first_leave_at is 'First submission in the most recently used January/June New York cycle.';
comment on column public.app_user_profiles.second_leave_at is 'Second submission in the same cycle; no leave text is stored.';
notify pgrst, 'reload schema';
commit;
