-- Run only in a fresh disposable local database.
\set ON_ERROR_STOP on
\ir course-package-sales-database.sql
\ir ../../supabase/migrations/20260921200000_billing_notifications.sql
\ir ../../supabase/migrations/20260921210000_refund_notifications.sql
create temporary table before_surcharge as select id,to_jsonb(p) content from public.app_payments p;
\ir ../../supabase/migrations/20260929120000_credit_card_surcharge.sql
do $$ begin
  assert not exists(select 1 from before_surcharge old join public.app_payments p using(id)
    where old.content is distinct from (to_jsonb(p)-'card_surcharge_cents'-'card_payment_kind'));
  assert not has_function_privilege('authenticated','public.app_stripe_bill(text,uuid,uuid,jsonb)','execute');
  assert has_column_privilege('authenticated','public.app_payments','card_surcharge_cents','select');
end $$;
set role service_role;
do $$
declare
  owner_id uuid:='00000000-0000-4000-8000-000000000001';
  bill_id uuid:=gen_random_uuid(); other_id uuid:=gen_random_uuid(); b jsonb; repeated jsonb; snapshot jsonb;
  context jsonb:='{"account":"acct_surcharge","livemode":false,"cardKind":"stripe"}';
  item jsonb:='{"course_key":"group","description":"Fee test course","credit_count":10,"lesson_duration_minutes":60,"quantity":1,"unit_amount_cents":null}';
begin
  begin
    insert into public.app_payments(user_profile_id,bill_number,amount_cents,currency,status,paid_amount_cents,card_surcharge_cents)
      values(owner_id,'INVALID-FEE-'||gen_random_uuid()::text,10300,'usd','payment_due',0,300);
    raise exception 'Fee without a Stripe policy accepted';
  exception when check_violation then null; end;
  perform public.app_purchase_package(owner_id,bill_id,'staff','level-1','surcharge-test','{"id":"level-1"}',item,10000,false);
  b:=public.app_stripe_bill('reserve_checkout',owner_id,bill_id,context);
  assert (b->>'amount_cents')::integer=10300 and (b->>'card_surcharge_cents')::integer=300;
  repeated:=public.app_stripe_bill('reserve_checkout',owner_id,bill_id,context);
  assert repeated->>'stripe_checkout_key'=b->>'stripe_checkout_key' and repeated->>'amount_cents'='10300','Retries must not add the fee twice';
  assert public.app_purchase_package(owner_id,bill_id,'staff','level-1','surcharge-test','{"id":"level-1"}',item,10000,false)=bill_id,'Purchase identity uses original course price';
  repeated:=public.app_stripe_bill('reserve_checkout',owner_id,bill_id,context-'cardKind');
  assert repeated->>'card_payment_kind'='stripe','Active quote cannot change until expiration';
  perform public.app_stripe_bill('bind_checkout',owner_id,bill_id,jsonb_build_object('key',b->>'stripe_checkout_key','session','cs_feecredit'));
  b:=public.app_stripe_bill('expire_checkout',owner_id,bill_id,'{"session":"cs_feecredit"}');
  assert b->>'amount_cents'='10000' and b->>'card_surcharge_cents'='0';
  b:=public.app_stripe_bill('reserve_checkout',owner_id,bill_id,context-'cardKind');
  assert b->>'amount_cents'='10000' and b->>'card_surcharge_cents'='0';
  perform public.app_stripe_bill('bind_checkout',owner_id,bill_id,jsonb_build_object('key',b->>'stripe_checkout_key','session','cs_feedebit'));
  perform public.app_stripe_bill('expire_checkout',owner_id,bill_id,'{"session":"cs_feedebit"}');
  perform public.app_package_payment_method(owner_id,bill_id,true);
  assert (select amount_cents=10000 and card_surcharge_cents=0 from public.app_payments where id=bill_id),'Cash must not retain a fee';
  perform public.app_package_payment_method(owner_id,bill_id,false);
  b:=public.app_stripe_bill('reserve_checkout',owner_id,bill_id,context);
  snapshot:=context||jsonb_build_object('checkoutKey',b->>'stripe_checkout_key','paymentIntent','pi_surcharge',
    'amount',10300,'currency','usd','paidAt','2026-09-29T10:00:00Z','observedAt','2026-09-29T10:00:01Z',
    'refundedAmount',0,'refundState','none');
  begin
    perform public.app_stripe_bill('sync',owner_id,bill_id,snapshot||'{"amount":10000}');
    raise exception 'Missing fee accepted';
  exception when raise_exception then if sqlerrm='Missing fee accepted' then raise; end if; end;
  b:=public.app_stripe_bill('sync',owner_id,bill_id,snapshot);
  assert b->>'status'='paid' and b->>'paid_amount_cents'='10300';
  assert (select credit_count=10 from public.app_payment_items where payment_id=bill_id),'Fee must not alter lesson credits';
  b:=public.app_stripe_bill('start_refund',owner_id,bill_id,context||'{"actor":"staff","reason":"Full refund including fee"}');
  assert b->>'amount_cents'='10300','Full refund must include the fee';
  b:=public.app_stripe_bill('sync',owner_id,bill_id,snapshot||'{"observedAt":"2026-09-29T10:01:00Z","refundedAmount":10000,"refundState":"requires_review"}');
  assert b->>'status'='partially_refunded','Refunding only tuition is not a full refund';
  b:=public.app_stripe_bill('sync',owner_id,bill_id,snapshot||'{"observedAt":"2026-09-29T10:02:00Z","refundedAmount":10300,"refundState":"succeeded","refundId":"re_surcharge"}');
  assert b->>'status'='refunded' and b->>'card_surcharge_cents'='300';
  assert (select count(*)=2 from public.app_billing_notifications where payment_id=bill_id and kind like 'refunded_%'),'Refund receipts include the gross refund';
  perform public.app_purchase_package(owner_id,other_id,'staff','level-1','surcharge-legacy','{"id":"level-1"}',item,10000,false);
  b:=public.app_stripe_bill('reserve_checkout',owner_id,other_id,context-'cardKind');
  assert b->>'amount_cents'='10000' and b->>'card_surcharge_cents'='0','Feature-off checkout is unchanged';
end $$;
reset role;
