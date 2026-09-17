-- Run only in a fresh disposable database, never against production.
\set ON_ERROR_STOP on
\ir billing-database.sql
create table public.app_schedule_entries(id uuid primary key default gen_random_uuid());
\ir ../../supabase/migrations/20260910180000_connect_stripe_billing.sql
\ir ../../supabase/migrations/20260910193000_handle_stripe_refund_reversals.sql

do $$
declare
 owner_id uuid := '00000000-0000-4000-8000-000000000001';
 other_id uuid := '00000000-0000-4000-8000-000000000002';
 bill_id uuid := '30000000-0000-4000-8000-000000000001';
 import_id uuid := '30000000-0000-4000-8000-000000000002';
 b jsonb; repeated jsonb; key text;
 context jsonb := '{"account":"acct_test","livemode":false,"actor":"staff"}';
 snapshot jsonb := '{"account":"acct_test","livemode":false,"paymentIntent":"pi_testone","amount":50,"currency":"usd","paidAt":"2026-09-09T10:00:00Z","refundedAmount":0,"refundState":"none","observedAt":"2026-09-10T10:00:00Z"}';
begin
 b:=public.app_stripe_bill('create_test',owner_id,bill_id,context);
 assert b->>'status'='payment_due' and (b->>'stripe_livemode')::boolean=false;
 perform public.app_stripe_bill('create_test',owner_id,bill_id,context);
 assert (select count(*)=1 from public.app_payment_items where payment_id=bill_id),'Duplicate create must not duplicate items';
 b:=public.app_stripe_bill('reserve_checkout',owner_id,bill_id,context);
 repeated:=public.app_stripe_bill('reserve_checkout',owner_id,bill_id,context);
 key:=b->>'stripe_checkout_key';
 assert key=repeated->>'stripe_checkout_key','Concurrent checkout uses the same request';
 perform public.app_stripe_bill('bind_checkout',owner_id,bill_id,jsonb_build_object('key',key,'session','cs_testone'));
 begin
   perform public.app_manage_bill(owner_id,bill_id,'staff','paid',p_channel=>'cash',p_reference=>'cash_one');
   raise exception 'Manual payment accepted during checkout';
 exception when raise_exception then if sqlerrm='Manual payment accepted during checkout' then raise; end if; end;
 begin
   perform public.app_stripe_bill('sync',owner_id,bill_id,snapshot||jsonb_build_object('checkoutKey','forged'));
   raise exception 'Forged checkout key accepted';
 exception when raise_exception then if sqlerrm='Forged checkout key accepted' then raise; end if; end;
 snapshot:=snapshot||jsonb_build_object('checkoutKey',key);
 b:=public.app_stripe_bill('sync',owner_id,bill_id,snapshot);
 assert b->>'status'='paid' and (b->>'paid_amount_cents')::int=50;
 assert (b->>'paid_at')::timestamptz='2026-09-09T10:00:00Z','Keep provider payment date';
 begin
   perform public.app_stripe_bill('start_refund',other_id,bill_id,context||'{"reason":"wrong owner"}');
   raise exception 'Wrong owner refund accepted';
 exception when raise_exception then if sqlerrm='Wrong owner refund accepted' then raise; end if; end;
 b:=public.app_stripe_bill('start_refund',owner_id,bill_id,context||'{"reason":"Schedule change"}');
 repeated:=public.app_stripe_bill('start_refund',owner_id,bill_id,context||'{"reason":"Changed browser reason"}');
 assert b->>'refund_request_key'=repeated->>'refund_request_key','Duplicate refund request key must be stable';
 assert repeated->>'refund_reason'='Schedule change','Idempotent parameters must be stable';
 assert b->>'status'='paid' and b->>'refund_state'='requested','Request is not completion';
 b:=public.app_stripe_bill('sync',owner_id,bill_id,snapshot||'{"observedAt":"2026-09-10T10:01:00Z","refundState":"pending","refundId":"re_testone"}');
 assert b->>'status'='paid' and b->>'refund_state'='pending','Pending is not refunded';
 begin
   perform public.app_manage_bill(owner_id,bill_id,'staff','refunded',p_reference=>'manual',p_reason=>'manual');
   raise exception 'Manual refund raced automatic request';
 exception when raise_exception then if sqlerrm='Manual refund raced automatic request' then raise; end if; end;
 b:=public.app_stripe_bill('sync',owner_id,bill_id,snapshot||'{"observedAt":"2026-09-10T10:02:00Z","refundState":"succeeded","refundedAmount":50,"refundId":"re_testone","refundConfirmedAt":"2026-09-10T10:02:00Z"}');
 assert b->>'status'='refunded' and b->>'refunded_at' is not null;
 b:=public.app_stripe_bill('sync',owner_id,bill_id,snapshot);
 assert b->>'status'='refunded','Stale success event must not resurrect a refunded payment';
 begin
   perform public.app_stripe_bill('start_refund',owner_id,bill_id,context||'{"reason":"Again"}');
   raise exception 'Repeated full refund accepted';
 exception when raise_exception then if sqlerrm='Repeated full refund accepted' then raise; end if; end;
 -- A newer ordinary success snapshot still cannot undo a completed refund.
 b:=public.app_stripe_bill('sync',owner_id,bill_id,snapshot||'{"observedAt":"2026-09-10T10:03:00Z"}');
 assert b->>'status'='refunded';
 -- A different failed refund is not proof that this full refund failed.
 b:=public.app_stripe_bill('sync',owner_id,bill_id,snapshot||'{"observedAt":"2026-09-10T10:04:00Z","refundState":"failed","failedFullRefundId":"re_other"}');
 assert b->>'status'='refunded';
 -- Current Stripe evidence for the SAME full refund may correct prior success.
 b:=public.app_stripe_bill('sync',owner_id,bill_id,snapshot||'{"observedAt":"2026-09-10T10:05:00Z","refundState":"failed","failedFullRefundId":"re_testone","refundId":"re_testone","failure":"declined"}');
 assert b->>'status'='paid' and b->>'refund_state'='failed' and b->>'refunded_at' is null,'Late refund failure must update the bill';
 assert b->'audit_history'->-1->>'operation'='stripe_refund_failed_after_success','Keep the previous completion in audit history';
 b:=public.app_stripe_bill('sync',owner_id,bill_id,snapshot||'{"observedAt":"2026-09-10T10:02:00Z","refundState":"succeeded","refundedAmount":50,"refundId":"re_testone"}');
 assert b->>'refund_state'='failed','An old successful snapshot cannot undo the later failure';
 snapshot:=(snapshot-'checkoutKey')||'{"paymentIntent":"pi_importone","description":"Historical lesson"}';
 b:=public.app_stripe_bill('import',owner_id,import_id,snapshot);
 repeated:=public.app_stripe_bill('import',owner_id,gen_random_uuid(),snapshot);
 assert b->>'id'=repeated->>'id','Repeated import must reuse the original bill';
 assert (select count(*)=1 from public.app_payment_items where payment_id=import_id);
 begin
   perform public.app_stripe_bill('import',other_id,gen_random_uuid(),snapshot);
   raise exception 'Cross owner import accepted';
 exception when raise_exception then if sqlerrm='Cross owner import accepted' then raise; end if; end;
 begin
   perform public.app_stripe_bill('sync',owner_id,import_id,snapshot||'{"livemode":true}');
   raise exception 'Test live mismatch accepted';
 exception when raise_exception then if sqlerrm='Test live mismatch accepted' then raise; end if; end;
end $$;
set role authenticated;
do $$ begin
 assert not has_function_privilege(current_user,'public.app_stripe_bill(text,uuid,uuid,jsonb)','execute'),'Stripe RPC must be server-only';
 assert not has_column_privilege(current_user,'public.app_payments','refund_request_key','select'),'Idempotency key stays server-only';
 assert has_column_privilege(current_user,'public.app_payments','refund_state','select'),'Owner may read safe refund status';
end $$;
reset role;
