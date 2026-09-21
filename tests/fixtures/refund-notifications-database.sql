-- Disposable database only. Never run this fixture against production or the shared sandbox.
\set ON_ERROR_STOP on
\ir billing-notifications-database.sql
\ir ../../supabase/migrations/20260921210000_refund_notifications.sql

do $$
declare
  owner_id uuid := '00000000-0000-4000-8000-000000000001';
  bill_id uuid := '70000000-0000-4000-8000-700000000001';
  b jsonb; snapshot jsonb; n jsonb; notice_id uuid;
begin
  assert (select count(*)=0 from public.app_billing_notifications where kind like 'refunded_%'),
    'Migration must not backfill historical refunds';
  perform public.app_issue_bill(owner_id,bill_id,'staff',
    '[{"description":"Two lessons","quantity":2,"unit_amount_cents":125}]',p_test_account=>'acct_refundnotices');
  b:=public.app_stripe_bill('reserve_checkout',owner_id,bill_id,'{"account":"acct_refundnotices","livemode":false}');
  snapshot:=jsonb_build_object('account','acct_refundnotices','livemode',false,'paymentIntent','pi_refundnotices',
    'checkoutKey',b->>'stripe_checkout_key','amount',250,'currency','usd','paidAt',now(),'observedAt',now(),
    'refundState','none','refundedAmount',0);
  perform public.app_stripe_bill('sync',owner_id,bill_id,snapshot);
  perform public.app_stripe_bill('start_refund',owner_id,bill_id,
    '{"account":"acct_refundnotices","livemode":false,"actor":"staff","reason":"Test"}');
  assert (select count(*)=0 from public.app_billing_notifications where payment_id=bill_id and kind like 'refunded_%');
  perform public.app_stripe_bill('sync',owner_id,bill_id,snapshot||jsonb_build_object(
    'observedAt',now()+interval '1 second','refundState','pending','refundId','re_refundmail'));
  perform public.app_stripe_bill('sync',owner_id,bill_id,snapshot||jsonb_build_object(
    'observedAt',now()+interval '2 seconds','refundState','failed','refundId','re_refundmail'));
  perform public.app_stripe_bill('sync',owner_id,bill_id,snapshot||jsonb_build_object(
    'observedAt',now()+interval '3 seconds','refundState','requires_review','refundedAmount',125,'refundId','re_refundmail'));
  assert (select count(*)=0 from public.app_billing_notifications where payment_id=bill_id and kind like 'refunded_%'),
    'Requested, pending, failed and partial refunds must not queue success';
  snapshot:=snapshot||jsonb_build_object('observedAt',now()+interval '4 seconds',
    'refundState','succeeded','refundedAmount',250,'refundId','re_refundmail','refundConfirmedAt',now());
  perform public.app_stripe_bill('sync',owner_id,bill_id,snapshot);
  perform public.app_stripe_bill('sync',owner_id,bill_id,snapshot||jsonb_build_object('observedAt',now()+interval '5 seconds'));
  assert (select count(*)=2 from public.app_billing_notifications where payment_id=bill_id and kind like 'refunded_%'),
    'A verified full refund queues exactly one notice per recipient despite replays';
  select id into notice_id from public.app_billing_notifications where payment_id=bill_id and kind='refunded_customer';
  n:=public.app_claim_billing_notice(notice_id,'{"subject":"Refund","to":["test@example.invalid"]}');
  assert n->>'status'='sending','Full refund notice must be claimable';
  assert public.app_claim_billing_notice(notice_id,'{}')->>'status'='busy','Concurrent sends must not duplicate';
  update public.app_billing_notifications set status='failed' where id=notice_id;
  n:=public.app_claim_billing_notice(notice_id,'{"to":["changed@example.invalid"]}');
  assert n->'payload'->'to'='["test@example.invalid"]'::jsonb,'Retry keeps original recipient';
  update public.app_billing_notifications set status='sent' where id=notice_id;
  assert public.app_claim_billing_notice(notice_id,'{}')->>'status'='sent','Accepted notice must not resend';
  select id into notice_id from public.app_billing_notifications where payment_id=bill_id and kind='refunded_admin';
  perform public.app_stripe_bill('sync',owner_id,bill_id,snapshot||jsonb_build_object(
    'observedAt',now()+interval '6 seconds','refundState','failed','refundedAmount',0,'failedFullRefundId','re_refundmail'));
  assert public.app_claim_billing_notice(notice_id,'{}')->>'status'='cancelled',
    'Cancel unsent success after a verified late failure';
  -- Already-refunded first imports remain silent; later refunds of imported paid bills notify.
  snapshot:=(snapshot-'checkoutKey')||jsonb_build_object('paymentIntent','pi_refundmailhistorical',
    'description','Historical refunded booking','refundId','re_refundmailhistorical');
  b:=public.app_stripe_bill('import',owner_id,gen_random_uuid(),snapshot);
  assert not exists(select 1 from public.app_billing_notifications where payment_id=(b->>'id')::uuid),
    'First import of an already-refunded booking must remain silent';
  snapshot:=(snapshot-'refundId'-'refundConfirmedAt')||jsonb_build_object(
    'paymentIntent','pi_refundmailbooking','description','Previously paid booking',
    'refundState','none','refundedAmount',0);
  b:=public.app_stripe_bill('import',owner_id,gen_random_uuid(),snapshot);
  assert not exists(select 1 from public.app_billing_notifications where payment_id=(b->>'id')::uuid);
  perform public.app_stripe_bill('sync',owner_id,(b->>'id')::uuid,snapshot||jsonb_build_object(
    'observedAt',now()+interval '7 seconds','refundState','succeeded','refundedAmount',250,
    'refundId','re_refundmailbooking','refundConfirmedAt',now()));
  assert (select count(*)=2 from public.app_billing_notifications where payment_id=(b->>'id')::uuid
    and kind like 'refunded_%'),'Later full refund of imported paid booking must notify both recipients';
  assert not has_function_privilege('authenticated','public.app_queue_refund_notices()','execute');
  assert not has_function_privilege('anon','public.app_claim_billing_notice(uuid,jsonb)','execute');
  assert not has_table_privilege('authenticated','public.app_billing_notifications','select');
end $$;
