begin;
set local lock_timeout = '3s';

-- Stable class IDs survive renewals and catalog changes. Request text stays in email.
create table public.app_student_course_leave (
  user_profile_id uuid not null references public.app_user_profiles(id) on delete cascade,
  package_id text not null check (length(btrim(package_id)) between 1 and 100),
  first_leave_at timestamptz,
  second_leave_at timestamptz,
  primary key (user_profile_id, package_id),
  check (second_leave_at is null or (first_leave_at is not null and second_leave_at > first_leave_at))
);
alter table public.app_student_course_leave enable row level security;
create policy student_read_own_course_leave on public.app_student_course_leave
  for select to authenticated using (user_profile_id = auth.uid());
revoke all on public.app_student_course_leave from anon, authenticated;
grant select on public.app_student_course_leave to authenticated;
grant all on public.app_student_course_leave to service_role;

-- Only verified live purchases with lessons left qualify. Renewals share a class ID.
create function public.app_student_leave_courses(p_owner uuid)
returns table(package_id text,course_name text,first_leave_at timestamptz,second_leave_at timestamptz)
language plpgsql stable security definer set search_path='' as $$
begin
  if current_setting('role',true)<>'service_role' and auth.uid() is distinct from p_owner
    then raise exception 'Not authorized'; end if;
  return query
  select distinct on (b.package_id) b.package_id,i.description,l.first_leave_at,l.second_leave_at
  from public.app_payments b join public.app_payment_items i on i.payment_id=b.id
  left join public.app_student_course_leave l on l.user_profile_id=b.user_profile_id and l.package_id=b.package_id
  where b.user_profile_id=p_owner and b.package_id is not null and b.stripe_livemode=true
    and b.status='paid' and b.refund_state='none' and b.stripe_sync_error is null
    and i.credit_count > (select count(*) from public.app_schedule_entries s
      where s.payment_item_id=i.id and s.status='completed')
  order by b.package_id,b.created_at desc,b.id,i.position;
end $$;

create function public.app_record_course_leave(
  p_owner uuid,p_package text,p_expected_first timestamptz,p_expected_second timestamptz
) returns jsonb language plpgsql security definer set search_path='' as $$
declare c record; submitted timestamptz; period date; used integer;
begin
  -- Serialize both the initial insert and updates, including concurrent renewals.
  perform 1 from public.app_user_profiles where id=p_owner for update;
  if not found then raise exception 'Student profile not found'; end if;
  select * into c from public.app_student_leave_courses(p_owner) where package_id=p_package;
  if not found then raise exception 'Choose an enrolled course with lessons remaining'; end if;
  if c.first_leave_at is distinct from p_expected_first or c.second_leave_at is distinct from p_expected_second
    then raise exception 'Leave balance changed; refresh before submitting'; end if;
  submitted:=clock_timestamp();
  period:=public.app_leave_period_start(submitted);
  used:=(case when public.app_leave_period_start(c.first_leave_at)=period then 1 else 0 end)
       +(case when public.app_leave_period_start(c.second_leave_at)=period then 1 else 0 end);
  if used>=2 then raise exception 'No leave requests remain in this period'; end if;
  insert into public.app_student_course_leave(user_profile_id,package_id,first_leave_at,second_leave_at)
    values(p_owner,p_package,submitted,null)
  on conflict(user_profile_id,package_id) do update set
    first_leave_at=case when used=0 then submitted else c.first_leave_at end,
    second_leave_at=case when used=0 then null else submitted end;
  return jsonb_build_object('submitted_at',submitted,'remaining',1-used,'course_name',c.course_name);
end $$;

-- Keep old account-wide timestamps and the old service-only RPC for rollout compatibility.
-- The updated app uses only the course RPC; legacy records stay unassigned in Admin.
revoke all on function public.app_student_leave_courses(uuid) from public,anon,authenticated;
grant execute on function public.app_student_leave_courses(uuid) to service_role,authenticated;
revoke all on function public.app_record_course_leave(uuid,text,timestamptz,timestamptz) from public,anon,authenticated;
grant execute on function public.app_record_course_leave(uuid,text,timestamptz,timestamptz) to service_role;
notify pgrst,'reload schema';
commit;
