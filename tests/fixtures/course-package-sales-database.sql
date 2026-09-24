-- Run in a fresh disposable local database only.
\set ON_ERROR_STOP on
\ir optional-course-products-database.sql
create temporary table before_package_sales as select id,to_jsonb(p) content from public.app_payments p;
\ir ../../supabase/migrations/20260924210000_course_package_sales.sql
do $$ begin
 assert not exists(select 1 from before_package_sales old join public.app_payments p using(id)
  where old.content is distinct from (to_jsonb(p)-'package_id'-'package_catalog'-'package_snapshot'-'payment_preference'));
 assert not has_function_privilege('authenticated','public.app_purchase_package(uuid,uuid,text,text,text,jsonb,jsonb,integer,boolean,boolean,boolean,date)','execute');
 assert not has_function_privilege('authenticated','public.app_package_payment_method(uuid,uuid,boolean)','execute');
end $$;
set role service_role;
do $$
declare
 owner_id uuid:='00000000-0000-4000-8000-000000000001';
 other_id uuid:='00000000-0000-4000-8000-000000000002';
 bill_id uuid:=gen_random_uuid(); cash_id uuid; test_id uuid; saved_item uuid; result uuid; b jsonb;
 item jsonb:='{"course_key":"group","description":"level-1 · Saturday 13:00–14:00","credit_count":10,"lesson_duration_minutes":60,"quantity":1,"unit_amount_cents":null}';
begin
 result:=public.app_purchase_package(owner_id,bill_id,'staff','level-1','sale-one','{"id":"level-1"}',item,28000,true,false,true);
 assert result=bill_id;
 result:=public.app_purchase_package(owner_id,gen_random_uuid(),owner_id::text,'level-1','sale-one','{"id":"level-1"}',item,31000,true);
 assert result=bill_id,'Self-service must reuse discount';
 assert (select amount_cents=28000 from public.app_payments where id=bill_id);
 select id into saved_item from public.app_payment_items where payment_id=bill_id;
 assert (select credit_count=10 from public.app_payment_items where id=saved_item),'Discount preserves credits';
 assert (select not allocatable from public.app_course_balances(owner_id) where app_course_balances.item_id=saved_item);
 begin
  perform public.app_package_payment_method(other_id,bill_id,true);
  raise exception 'Wrong owner accepted';
 exception when raise_exception then if sqlerrm='Wrong owner accepted' then raise; end if; end;
 begin
  perform public.app_manage_bill(owner_id,bill_id,'staff','paid',p_channel=>'stripe',p_reference=>'pi_forged');
  raise exception 'Unverified Stripe confirmation accepted';
 exception when raise_exception then if sqlerrm='Unverified Stripe confirmation accepted' then raise; end if; end;
 perform public.app_package_payment_method(owner_id,bill_id,true);
 begin
  perform public.app_stripe_bill('reserve_checkout',owner_id,bill_id,'{"account":"acct_course","livemode":true}');
  raise exception 'Cash checkout accepted';
 exception when raise_exception then if sqlerrm='Cash checkout accepted' then raise; end if; end;
 perform public.app_package_payment_method(owner_id,bill_id,false);
 b:=public.app_stripe_bill('reserve_checkout',owner_id,bill_id,'{"account":"acct_course","livemode":true}');
 begin
  perform public.app_package_payment_method(owner_id,bill_id,true);
  raise exception 'Active checkout switched to cash';
 exception when raise_exception then if sqlerrm='Active checkout switched to cash' then raise; end if; end;
 begin
  perform public.app_cancel_package(owner_id,bill_id,'staff');
  raise exception 'Active checkout cancelled';
 exception when raise_exception then if sqlerrm='Active checkout cancelled' then raise; end if; end;
 perform public.app_stripe_bill('sync',owner_id,bill_id,jsonb_build_object('account','acct_course','livemode',true,
 'paymentIntent','pi_packagesale','checkoutKey',b->>'stripe_checkout_key','amount',28000,'currency','usd','paidAt',now(),
 'observedAt',now(),'refundState','none','refundedAmount',0));
 assert (select allocatable and available=10 from public.app_course_balances(owner_id) where app_course_balances.item_id=saved_item);
 result:=public.app_purchase_package(owner_id,gen_random_uuid(),owner_id::text,'level-1','sale-one','{"id":"level-1"}',item,31000,true);
 assert result=bill_id,'Paid purchase cannot be bought twice';
 begin
  update public.app_payments set amount_cents=29000 where id=bill_id;
  raise exception 'Issued amount changed';
 exception when raise_exception then if sqlerrm='Issued amount changed' then raise; end if; end;
 cash_id:=public.app_purchase_package(owner_id,gen_random_uuid(),owner_id::text,'level-2','sale-one','{"id":"level-2"}',item,31000,true,true);
 select id into saved_item from public.app_payment_items where payment_id=cash_id;
 assert (select not allocatable from public.app_course_balances(owner_id) where app_course_balances.item_id=saved_item);
 perform public.app_manage_bill(owner_id,cash_id,'staff','paid',p_channel=>'cash',p_reference=>'CASH-RECEIPT-1');
 assert (select allocatable and available=10 from public.app_course_balances(owner_id) where app_course_balances.item_id=saved_item);
 begin
  perform public.app_manage_bill(owner_id,cash_id,'staff','paid',p_channel=>'cash',p_reference=>'CASH-RECEIPT-1');
  raise exception 'Repeated cash confirmation accepted';
 exception when raise_exception then if sqlerrm='Repeated cash confirmation accepted' then raise; end if; end;
 assert (select count(*)=1 from public.app_payment_items where payment_id=cash_id);
 test_id:=public.app_purchase_package(owner_id,gen_random_uuid(),owner_id::text,'level-2','sale-one','{"id":"level-2"}',item,31000,false,true);
 perform public.app_manage_bill(owner_id,test_id,'staff','paid',p_channel=>'cash',p_reference=>'TEST-CASH');
 assert not exists(select 1 from public.app_course_balances(owner_id) where payment_id=test_id),'Sandbox credits cannot become real credits';
 assert exists(select 1 from public.app_course_balances(owner_id,true) where payment_id=test_id and allocatable);
 result:=public.app_purchase_package(owner_id,gen_random_uuid(),owner_id::text,'level-1','next-sale','{"id":"level-1"}',item,31000,true);
 assert result<>bill_id,'Next term is a separate purchase';
 perform public.app_cancel_package(owner_id,result,'staff');
 assert (select status='cancelled' from public.app_payments where id=result);
 -- Once a provider session has been verified expired, switching to cash clears
 -- only the account binding, not the sandbox/live marker or the saved amount.
 test_id:=public.app_purchase_package(owner_id,gen_random_uuid(),owner_id::text,'level-3','expiry-sale','{"id":"level-3"}',item,31000,false);
 b:=public.app_stripe_bill('reserve_checkout',owner_id,test_id,'{"account":"acct_course","livemode":false}');
 perform public.app_stripe_bill('bind_checkout',owner_id,test_id,jsonb_build_object('key',b->>'stripe_checkout_key','session','cs_expiredpackage'));
 perform public.app_stripe_bill('expire_checkout',owner_id,test_id,'{"session":"cs_expiredpackage"}');
 perform public.app_package_payment_method(owner_id,test_id,true);
 assert (select stripe_account_id is null and stripe_livemode=false and payment_preference='cash' from public.app_payments where id=test_id);
 perform public.app_cancel_package(owner_id,test_id,'staff');

 assert public.app_purchase_package(owner_id,result,owner_id::text,'level-1','next-sale','{"id":"level-1"}',item,31000,true)=result,'Cancelled request retry must not recreate';
end $$;
reset role;
set role authenticated;
set request.jwt.claim.sub='00000000-0000-4000-8000-000000000002';
do $$ begin
 assert not exists(select 1 from public.app_payments where package_id is not null),'Other student cannot read package orders';
end $$;
reset role;
