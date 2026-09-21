-- Disposable database only. Exercises real locks, permissions, and event deduplication.
\set ON_ERROR_STOP on
\ir package-billing-database.sql
\ir ../../supabase/migrations/20260921200000_billing_notifications.sql

do $$
declare
  owner_id uuid := '00000000-0000-4000-8000-000000000001';
  other_id uuid := '00000000-0000-4000-8000-000000000002';
  bill_id uuid := '60000000-0000-4000-8000-000000006001';
  notice_id uuid;
  b jsonb;
  n jsonb;
begin
  perform public.app_issue_bill(owner_id,bill_id,'staff',
    '[{"description":"December ballet (3 lessons) — Dec 5–19, after credit","quantity":1,"unit_amount_cents":10001}]',
    p_test_account=>'acct_notices');
  begin
    perform public.app_queue_bill_request(other_id,bill_id);
    raise exception 'Wrong owner accepted';
  exception when raise_exception then if sqlerrm='Wrong owner accepted' then raise; end if; end;
  begin
    perform public.app_accept_bill(other_id,bill_id,'terms-v1','hello');
    raise exception 'Wrong owner acknowledgement accepted';
  exception when raise_exception then if sqlerrm='Wrong owner acknowledgement accepted' then raise; end if; end;
  perform public.app_accept_bill(owner_id,bill_id,'terms-v1','Saturday please');
  perform public.app_accept_bill(owner_id,bill_id,'terms-v1','Saturday please');
  assert (select count(*)=1 from public.app_bill_acknowledgements where payment_id=bill_id);
  perform public.app_queue_bill_request(owner_id,bill_id);
  perform public.app_queue_bill_request(owner_id,bill_id);
  assert (select count(*)=1 from public.app_billing_notifications where payment_id=bill_id);
  select id into notice_id from public.app_billing_notifications where payment_id=bill_id;
  n:=public.app_claim_billing_notice(notice_id,'{"subject":"Original","to":["test@example.invalid"]}');
  assert n->>'status'='sending';
  assert public.app_claim_billing_notice(notice_id,'{"subject":"changed"}')->>'status'='busy';
  update public.app_billing_notifications set status='failed' where id=notice_id;
  n:=public.app_claim_billing_notice(notice_id,'{"subject":"Changed on retry"}');
  assert n->'payload'->>'subject'='Original','Retries must keep the original body and recipient';
  update public.app_billing_notifications set status='failed',first_attempt_at=now()-interval '24 hours' where id=notice_id;
  assert public.app_claim_billing_notice(notice_id,'{}')->>'status'='review','Old ambiguous attempts require review';
  update public.app_billing_notifications set status='sent' where id=notice_id;
  assert public.app_claim_billing_notice(notice_id,'{}')->>'status'='sent','Sent notices must not be sent again';
  b:=public.app_stripe_bill('reserve_checkout',owner_id,bill_id,'{"account":"acct_notices","livemode":false}');
  perform public.app_stripe_bill('sync',owner_id,bill_id,jsonb_build_object('account','acct_notices','livemode',false,
    'paymentIntent','pi_notices','checkoutKey',b->>'stripe_checkout_key','amount',10001,'currency','usd',
    'paidAt',now(),'observedAt',now(),'refundState','none','refundedAmount',0));
  assert (select count(*)=3 from public.app_billing_notifications where payment_id=bill_id),'Both confirmations queued atomically';
  update public.app_payments set status='paid' where id=bill_id;
  assert (select count(*)=3 from public.app_billing_notifications where payment_id=bill_id),'Webhook replay must not duplicate';
  update public.app_billing_notifications set status='review' where id=notice_id;
  assert public.app_claim_billing_notice(notice_id,'{}')->>'status'='cancelled','An obsolete request must not block paid confirmations';
  assert (select amount_cents=10001 from public.app_payments where id=bill_id),'Negotiated total preserved exactly';
  select id into notice_id from public.app_billing_notifications where payment_id=bill_id and kind='paid_admin';
  perform public.app_stripe_bill('sync',owner_id,bill_id,jsonb_build_object('account','acct_notices','livemode',false,
    'paymentIntent','pi_notices','checkoutKey',b->>'stripe_checkout_key','amount',10001,'currency','usd',
    'paidAt',now(),'observedAt',now()+interval '1 second','refundState','succeeded','refundedAmount',10001,'refundId','re_notices'));
  assert public.app_claim_billing_notice(notice_id,'{}')->>'status'='cancelled','Do not send stale success after refund';
  assert not has_table_privilege('authenticated','public.app_billing_notifications','select');
  assert not has_function_privilege('authenticated','public.app_queue_bill_request(uuid,uuid)','execute');
  assert not has_function_privilege('anon','public.app_claim_billing_notice(uuid,jsonb)','execute');
  assert not has_function_privilege('authenticated','public.app_accept_bill(uuid,uuid,text,text)','execute');
end $$;

set role authenticated;
set request.jwt.claim.sub='00000000-0000-4000-8000-000000000002';
do $$ begin
  assert (select count(*)=0 from public.app_bill_acknowledgements),'Other accounts cannot read teacher notes';
end $$;
reset role;
