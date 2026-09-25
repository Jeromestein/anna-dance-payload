-- Run only in a fresh disposable PostgreSQL database.
\set ON_ERROR_STOP on
\ir course-package-sales-database.sql
alter table public.app_user_profiles
 add column name text, add column phone text, add column guardian_name text,
 add column guardian_phone text, add column created_at timestamptz, add column updated_at timestamptz,
 add column email text, add column role text, add column date_of_birth date,
 add column address_line1 text, add column address_line2 text, add column city text,
 add column state text, add column postal_code text, add column health_notes text;
\ir ../../supabase/migrations/20260924200000_student_leave_times.sql
update public.app_user_profiles set first_leave_at='2026-09-24T19:41:36Z'
 where id='00000000-0000-4000-8000-000000000001';
\ir ../../supabase/migrations/20260925120000_course_leave_times.sql
grant all on public.app_user_profiles to service_role;
grant usage on schema auth to service_role;

set role service_role;
do $$
declare
 owner_id uuid:='00000000-0000-4000-8000-000000000001';
 other_id uuid:='00000000-0000-4000-8000-000000000002';
 bill_id uuid; result jsonb; first_at timestamptz; second_at timestamptz; course_item uuid;
 item jsonb:='{"course_key":"duet","description":"Duet Monday · DUET-01","credit_count":10,"lesson_duration_minutes":60,"quantity":1,"unit_amount_cents":null}';
begin
 bill_id:=public.app_purchase_package(owner_id,gen_random_uuid(),'staff','DUET-01','leave-test','{"id":"DUET-01"}',item,31000,true,true);
 begin
  perform public.app_record_course_leave(owner_id,'DUET-01',null,null);
  raise exception 'Unpaid accepted';
 exception when raise_exception then assert sqlerrm='Choose an enrolled course with lessons remaining'; end;
 perform public.app_manage_bill(owner_id,bill_id,'staff','paid',p_channel=>'cash',p_reference=>'LEAVE-TEST-CASH');
 result:=public.app_record_course_leave(owner_id,'DUET-01',null,null);
 first_at:=(result->>'submitted_at')::timestamptz;
 assert result->>'remaining'='1' and result->>'course_name'='Duet Monday · DUET-01';
 begin
  perform public.app_record_course_leave(owner_id,'DUET-01',null,null);
  raise exception 'Duplicate accepted';
 exception when raise_exception then assert sqlerrm='Leave balance changed; refresh before submitting'; end;
 result:=public.app_record_course_leave(owner_id,'DUET-01',first_at,null);
 second_at:=(result->>'submitted_at')::timestamptz;
 assert result->>'remaining'='0';
 begin
  perform public.app_record_course_leave(owner_id,'DUET-01',first_at,second_at);
  raise exception 'Third accepted';
 exception when raise_exception then assert sqlerrm='No leave requests remain in this period'; end;
 -- A different fixed class of the SAME broad course type has its own allowance.
 bill_id:=public.app_purchase_package(owner_id,gen_random_uuid(),'staff','DUET-02','leave-test','{"id":"DUET-02"}',item,31000,true,true);
 perform public.app_manage_bill(owner_id,bill_id,'staff','paid',p_channel=>'cash',p_reference=>'LEAVE-TEST-CASH-2');
 assert public.app_record_course_leave(owner_id,'DUET-02',null,null)->>'remaining'='1';
 begin
  perform public.app_record_course_leave(other_id,'DUET-01',null,null);
  raise exception 'Other owner accepted';
 exception when raise_exception then assert sqlerrm='Choose an enrolled course with lessons remaining'; end;
 bill_id:=public.app_purchase_package(owner_id,gen_random_uuid(),'staff','DUET-01','leave-renewal','{"id":"DUET-01"}',item,31000,true,true);
 perform public.app_manage_bill(owner_id,bill_id,'staff','paid',p_channel=>'cash',p_reference=>'LEAVE-RENEWAL');
 assert (select count(*)=1 from public.app_student_leave_courses(owner_id) where package_id='DUET-01');
 begin
  perform public.app_record_course_leave(owner_id,'DUET-01',first_at,second_at);
  raise exception 'Renewal reset allowance';
 exception when raise_exception then assert sqlerrm='No leave requests remain in this period'; end;
 update public.app_student_course_leave set first_leave_at='2025-01-02Z',second_leave_at='2025-01-03Z'
 where user_profile_id=owner_id and package_id='DUET-01';
 assert public.app_record_course_leave(owner_id,'DUET-01','2025-01-02Z','2025-01-03Z')->>'remaining'='1';
 assert (select second_leave_at is null from public.app_student_course_leave where user_profile_id=owner_id and package_id='DUET-01');
 assert (select first_leave_at='2026-09-24T19:41:36Z' from public.app_user_profiles where id=owner_id),'Legacy timestamps retained';
 -- Sandbox payments do not create leave entitlement.
 bill_id:=public.app_purchase_package(owner_id,gen_random_uuid(),'staff','DUET-03','leave-test','{"id":"DUET-03"}',item,31000,false,true);
 perform public.app_manage_bill(owner_id,bill_id,'staff','paid',p_channel=>'cash',p_reference=>'LEAVE-SANDBOX');
 assert not exists(select 1 from public.app_student_leave_courses(owner_id) where package_id='DUET-03');
 -- A completed or refunded class no longer qualifies, without erasing its quota history.
 bill_id:=public.app_purchase_package(owner_id,gen_random_uuid(),'staff','DUET-04','leave-test','{"id":"DUET-04"}',jsonb_set(item,'{credit_count}','1'),31000,true,true);
 perform public.app_manage_bill(owner_id,bill_id,'staff','paid',p_channel=>'cash',p_reference=>'LEAVE-COMPLETED');
 select id into course_item from public.app_payment_items where payment_id=bill_id;
 insert into public.app_schedule_entries(id,user_profile_id,payment_id,payment_item_id,entry_type,title,starts_at,ends_at,status,source)
 values(gen_random_uuid(),owner_id,bill_id,course_item,'class','Completed test class',now()-interval '2 hours',now()-interval '1 hour','completed','academy');
 assert not exists(select 1 from public.app_student_leave_courses(owner_id) where package_id='DUET-04');
 perform public.app_manage_bill(owner_id,bill_id,'staff','refunded',p_reference=>'LEAVE-REFUND',p_reason=>'Test refund');
 assert not exists(select 1 from public.app_student_leave_courses(owner_id) where package_id='DUET-04');
 assert public.app_leave_period_start('2027-01-01 04:59:59Z')='2026-06-01';
 assert public.app_leave_period_start('2027-01-01 05:00:00Z')='2027-01-01';
 assert public.app_leave_period_start('2027-06-01 03:59:59Z')='2027-01-01';
 assert public.app_leave_period_start('2027-06-01 04:00:00Z')='2027-06-01';
end $$;
reset role;
set role authenticated;
set request.jwt.claim.sub='00000000-0000-4000-8000-000000000002';
do $$ begin
 assert not exists(select 1 from public.app_student_course_leave),'Other student cannot read leave';
 begin
  perform public.app_student_leave_courses('00000000-0000-4000-8000-000000000001');
  raise exception 'Other balance read';
 exception when raise_exception then assert sqlerrm='Not authorized'; end;
 assert not has_table_privilege('authenticated','public.app_student_course_leave','INSERT');
 assert not has_table_privilege('authenticated','public.app_student_course_leave','UPDATE');
 assert not has_function_privilege('authenticated','public.app_record_course_leave(uuid,text,timestamptz,timestamptz)','EXECUTE');
end $$;
set request.jwt.claim.sub='00000000-0000-4000-8000-000000000001';
do $$ begin
 assert (select count(*)=2 from public.app_student_course_leave),'Owner sees both courses';
 assert exists(select 1 from public.app_student_leave_courses(auth.uid()) where package_id='DUET-01');
end $$;
reset role;
