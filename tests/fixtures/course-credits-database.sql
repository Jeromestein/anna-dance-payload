-- Disposable database only. Extends the existing billing regression fixtures.
\set ON_ERROR_STOP on
\ir package-billing-database.sql
alter table public.app_schedule_entries
 add column user_profile_id uuid references public.app_user_profiles(id),
 add column payment_id uuid references public.app_payments(id),
 add column entry_type text, add column title text,
 add column starts_at timestamptz, add column ends_at timestamptz,
 add column timezone text, add column location text, add column status text,
 add column source text, add column match_status text, add column cal_event_type_slug text,
 add column created_at timestamptz default now(), add column updated_at timestamptz default now();
alter table public.app_schedule_entries enable row level security;
create policy own_schedule on public.app_schedule_entries for select to authenticated using(user_profile_id=auth.uid());
grant all on public.app_schedule_entries to service_role;
\ir ../../supabase/migrations/20260922010000_course_credits.sql

set role service_role;
do $$
declare
 owner_id uuid:='00000000-0000-4000-8000-000000000001';
 bill_id uuid:='50000000-0000-4000-8000-000000000001';
 course_id uuid;
 entries jsonb;
 items jsonb:='[{"course_key":"solo30","description":"Solo Class · 30 minutes","stripe_product_id":"prod_solo","credit_count":3,"lesson_duration_minutes":30,"quantity":1,"unit_amount_cents":null},{"course_key":"group","description":"Group Class · 60 minutes","stripe_product_id":"prod_group","credit_count":6,"lesson_duration_minutes":60,"quantity":1,"unit_amount_cents":null}]';
 b jsonb;
begin
 perform public.app_issue_course_bill(owner_id,bill_id,'staff',items,17329,'acct_course',true);
 perform public.app_issue_course_bill(owner_id,bill_id,'staff',items,17329,'acct_course',true);
 assert (select count(*)=2 from public.app_payment_items where payment_id=bill_id);
 assert (select amount_cents=17329 from public.app_payments where id=bill_id);
 assert (select bool_and(unit_amount_cents is null) from public.app_payment_items where payment_id=bill_id);
 begin
  perform public.app_issue_course_bill(owner_id,bill_id,'staff',items,17330,'acct_course',true);
  raise exception 'Changed total accepted';
 exception when raise_exception then if sqlerrm='Changed total accepted' then raise; end if; end;
 select id into course_id from public.app_payment_items where payment_id=bill_id and course_key='solo30';
 entries:=jsonb_build_array(jsonb_build_object('id','60000000-0000-4000-8000-000000000001','starts_at',now()+interval '10 days','location','Studio'));
 begin
  perform public.app_manage_course_schedule(owner_id,course_id,'staff','create',entries);
  raise exception 'Unpaid allocation accepted';
 exception when raise_exception then if sqlerrm='Unpaid allocation accepted' then raise; end if; end;
 b:=public.app_stripe_bill('reserve_checkout',owner_id,bill_id,'{"account":"acct_course","livemode":true}');
 perform public.app_stripe_bill('sync',owner_id,bill_id,jsonb_build_object('account','acct_course','livemode',true,
  'paymentIntent','pi_course','checkoutKey',b->>'stripe_checkout_key','amount',17329,'currency','usd','paidAt',now(),
  'observedAt',now(),'refundState','none','refundedAmount',0));
 perform public.app_manage_course_schedule(owner_id,course_id,'staff','create',entries);
 perform public.app_manage_course_schedule(owner_id,course_id,'staff','create',entries);
 assert (select available=2 and reserved=1 from public.app_course_balances(owner_id) where item_id=course_id);
 begin
  perform public.app_manage_course_schedule(owner_id,course_id,'staff','create',jsonb_build_array(
   jsonb_build_object('id',gen_random_uuid(),'starts_at',now()+interval '11 days'),
   jsonb_build_object('id',gen_random_uuid(),'starts_at',now()+interval '11 days')));
  raise exception 'Conflicting batch accepted';
 exception when raise_exception then if sqlerrm='Conflicting batch accepted' then raise; end if; end;
 assert (select count(*)=1 from public.app_schedule_entries where payment_item_id=course_id),'Batch must roll back';
 begin
  perform public.app_manage_course_schedule(owner_id,course_id,'staff','create',entries,true);
  raise exception 'Wrong environment accepted';
 exception when raise_exception then if sqlerrm='Wrong environment accepted' then raise; end if; end;
 perform public.app_manage_course_schedule(owner_id,course_id,'staff','reschedule',jsonb_build_array(
  jsonb_build_object('id','60000000-0000-4000-8000-000000000001','revision',0,'starts_at',now()+interval '12 days')));
 assert (select available=2 from public.app_course_balances(owner_id) where item_id=course_id);
 begin
  perform public.app_manage_course_schedule(owner_id,course_id,'staff','cancel',jsonb_build_array(
   jsonb_build_object('id','60000000-0000-4000-8000-000000000001','revision',0,'reason','stale')));
  raise exception 'Stale edit accepted';
 exception when raise_exception then if sqlerrm='Stale edit accepted' then raise; end if; end;
 perform public.app_stripe_bill('sync',owner_id,bill_id,jsonb_build_object('account','acct_course','livemode',true,
  'paymentIntent','pi_course','checkoutKey',b->>'stripe_checkout_key','amount',17329,'currency','usd','paidAt',now(),
  'observedAt',now()+interval '1 second','refundState','succeeded','refundedAmount',17329,'refundId','re_course','refundConfirmedAt',now()));
 assert (select status='cancelled' from public.app_schedule_entries where id='60000000-0000-4000-8000-000000000001');
 assert (select not allocatable from public.app_course_balances(owner_id) where item_id=course_id);
end $$;
reset role;
set role authenticated;
set request.jwt.claim.sub='00000000-0000-4000-8000-000000000001';
select * from public.app_course_balances('00000000-0000-4000-8000-000000000001');
do $$ begin
 begin
  perform public.app_course_balances('00000000-0000-4000-8000-000000000002');
  raise exception 'Other owner accepted';
 exception when raise_exception then if sqlerrm='Other owner accepted' then raise; end if; end;
 assert not has_column_privilege('authenticated','public.app_schedule_entries','staff_audit','select');
 assert not has_function_privilege('authenticated','public.app_manage_course_schedule(uuid,uuid,text,text,jsonb,boolean)','execute');
end $$;
reset role;

set role service_role;
do $$
declare owner_id uuid:='00000000-0000-4000-8000-000000000002';
 bill_id uuid:='50000000-0000-4000-8000-000000000002';
 schedule_id uuid:='60000000-0000-4000-8000-000000000002'; course_id uuid;
begin
 insert into public.app_schedule_entries(id,user_profile_id,cal_booking_id,cal_event_type_slug,entry_type,title,
 starts_at,ends_at,status,source,match_status,timezone)
 values(schedule_id,owner_id,98765,'solo-class-30min','private_lesson','Single solo',now()+interval '1 day',now()+interval '1 day 30 minutes','scheduled','cal_com','linked','America/New_York');
 perform public.app_stripe_bill('import',owner_id,bill_id,jsonb_build_object('account','acct_course','livemode',true,
 'paymentIntent','pi_calcourse','amount',3781,'currency','usd','description','Single solo','calBookingId',98765,
 'paidAt',now(),'observedAt',now(),'refundState','none','refundedAmount',0));
 perform public.app_link_cal_course_credit(owner_id,bill_id,'solo30','prod_solo');
 perform public.app_link_cal_course_credit(owner_id,bill_id,'solo30','prod_solo');
 select id into course_id from public.app_payment_items where payment_id=bill_id;
 assert (select credit_count=1 and reserved=1 and available=0 from public.app_course_balances(owner_id) where item_id=course_id),'Single booking must already occupy its one credit';
 update public.app_schedule_entries set status='cancelled' where id=schedule_id;
 assert (select available=1 from public.app_course_balances(owner_id) where item_id=course_id);
 perform public.app_manage_course_schedule(owner_id,course_id,'staff','create',jsonb_build_array(jsonb_build_object(
   'id','60000000-0000-4000-8000-000000000003','starts_at',now()+interval '2 days')));
 begin
   update public.app_schedule_entries set status='changed' where id=schedule_id;
   raise exception 'Cal replay overspent credits';
 exception when raise_exception then if sqlerrm='Cal replay overspent credits' then raise; end if; end;
 update public.app_schedule_entries set starts_at=now()-interval '1 day',ends_at=now()-interval '23 hours 30 minutes'
   where id='60000000-0000-4000-8000-000000000003';
 perform public.app_manage_course_schedule(owner_id,course_id,'staff','complete',jsonb_build_array(jsonb_build_object(
   'id','60000000-0000-4000-8000-000000000003','revision',0)));
 assert (select completed=1 and reserved=0 and available=0 from public.app_course_balances(owner_id) where item_id=course_id);
end $$;
reset role;
