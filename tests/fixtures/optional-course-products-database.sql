-- Disposable course_test database only. Preserve existing IDs across the migration.
\set ON_ERROR_STOP on
\ir course-credits-database.sql
create temporary table existing_course_rows as
select 'payments' kind, id, to_jsonb(t) content from public.app_payments t
union all select 'items',id,to_jsonb(t) from public.app_payment_items t
union all select 'schedule',id,to_jsonb(t) from public.app_schedule_entries t;
\ir ../../supabase/migrations/20260922020000_optional_course_product_ids.sql
do $$ begin
 assert not exists (
   (select * from existing_course_rows except
    (select 'payments',id,to_jsonb(t) from public.app_payments t union all
     select 'items',id,to_jsonb(t) from public.app_payment_items t union all
     select 'schedule',id,to_jsonb(t) from public.app_schedule_entries t))
 ),'Migration changed existing records';
 assert not has_function_privilege('authenticated','public.app_issue_course_bill(uuid,uuid,text,jsonb,integer,text,boolean,date,uuid)','execute');
 assert not has_function_privilege('authenticated','public.app_link_cal_course_credit(uuid,uuid,text,text)','execute');
end $$;
set role service_role;
do $$
declare
 owner_id uuid:='00000000-0000-4000-8000-000000000001';
 bill_id uuid:='50000000-0000-4000-8000-000000000100';
 course_item_id uuid;
 items jsonb:='[{"course_key":"solo30","description":"Solo Class · 30 minutes","credit_count":3,"lesson_duration_minutes":30,"quantity":1,"unit_amount_cents":null},{"course_key":"group","description":"Group Class · 60 minutes","stripe_product_id":null,"credit_count":6,"lesson_duration_minutes":60,"quantity":1,"unit_amount_cents":null}]';
 b jsonb;
begin
 perform public.app_issue_course_bill(owner_id,bill_id,'staff',items,17329,'acct_course',true);
 -- Missing and explicit null must represent the same immutable bill on a retry.
 items:=jsonb_set(items,'{0,stripe_product_id}','null');
 perform public.app_issue_course_bill(owner_id,bill_id,'staff',items,17329,'acct_course',true);
 assert (select count(*)=2 and bool_and(stripe_product_id is null) from public.app_payment_items where payment_id=bill_id);
 select id into course_item_id from public.app_payment_items where payment_id=bill_id and course_key='solo30';
 begin
  perform public.app_issue_course_bill(owner_id,gen_random_uuid(),'staff',jsonb_set(items,'{0,stripe_product_id}','"invalid"'),17329,'acct_course',true);
  raise exception 'Invalid optional product accepted';
 exception when raise_exception then if sqlerrm='Invalid optional product accepted' then raise; end if; end;
 begin
  perform public.app_issue_course_bill(owner_id,bill_id,'staff',jsonb_set(items,'{0,credit_count}','4'),17329,'acct_course',true);
  raise exception 'Changed credits accepted';
 exception when raise_exception then if sqlerrm='Changed credits accepted' then raise; end if; end;
 b:=public.app_stripe_bill('reserve_checkout',owner_id,bill_id,'{"account":"acct_course","livemode":true}');
 perform public.app_stripe_bill('sync',owner_id,bill_id,jsonb_build_object('account','acct_course','livemode',true,
 'paymentIntent','pi_withoutproduct','checkoutKey',b->>'stripe_checkout_key','amount',17329,'currency','usd','paidAt',now(),
 'observedAt',now(),'refundState','none','refundedAmount',0));
 perform public.app_manage_course_schedule(owner_id,course_item_id,'staff','create',jsonb_build_array(jsonb_build_object('id',gen_random_uuid(),'starts_at',now()+interval '100 days')));
 assert (select available=2 and reserved=1 from public.app_course_balances(owner_id) where app_course_balances.item_id=course_item_id);
end $$;

do $$
declare
 owner_id uuid:='00000000-0000-4000-8000-000000000002';
 bill_id uuid:='50000000-0000-4000-8000-000000000101';
 course_item_id uuid;
begin
 insert into public.app_schedule_entries(id,user_profile_id,cal_booking_id,cal_event_type_slug,entry_type,title,
 starts_at,ends_at,status,source,match_status,timezone)
 values(gen_random_uuid(),owner_id,98766,'solo-class-30min','private_lesson','Solo booking',now()+interval '110 days',now()+interval '110 days 30 minutes','scheduled','cal_com','linked','America/New_York');
 perform public.app_stripe_bill('import',owner_id,bill_id,jsonb_build_object('account','acct_course','livemode',true,
 'paymentIntent','pi_calnoproduct','amount',3781,'currency','usd','description','Solo booking','calBookingId',98766,
 'paidAt',now(),'observedAt',now(),'refundState','none','refundedAmount',0));
 perform public.app_link_cal_course_credit(owner_id,bill_id,'solo30');
 perform public.app_link_cal_course_credit(owner_id,bill_id,'solo30',null);
 select id into course_item_id from public.app_payment_items where payment_id=bill_id;
 assert (select stripe_product_id is null and credit_count=1 from public.app_payment_items where id=course_item_id);
 assert (select reserved=1 and available=0 from public.app_course_balances(owner_id) where app_course_balances.item_id=course_item_id);
 -- Reconciliation of an older already-linked booking must retain its historical ID.
 perform public.app_link_cal_course_credit(owner_id,'50000000-0000-4000-8000-000000000002','solo30',null);
 assert (select stripe_product_id='prod_solo' from public.app_payment_items where payment_id='50000000-0000-4000-8000-000000000002');
end $$;
reset role;
