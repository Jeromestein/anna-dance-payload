begin;

-- Correct a provider-confirmed full refund that subsequently fails.
create or replace function public.app_stripe_bill(p_operation text, p_owner uuid, p_id uuid, p_data jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare
  verified_refund_reversal boolean := false;
  previous_write text := current_setting('app.stripe_write',true);
  b public.app_payments%rowtype;
  pi text := p_data->>'paymentIntent';
  account_id text := p_data->>'account';
  live boolean := (p_data->>'livemode')::boolean;
  observed timestamptz := (p_data->>'observedAt')::timestamptz;
  refunded integer := (p_data->>'refundedAmount')::integer;
  incoming_state text := p_data->>'refundState';
begin
  perform set_config('app.stripe_write','yes',true);
  if p_operation='create_test' then
    if live is distinct from false or account_id is null or account_id !~ '^acct_[A-Za-z0-9]+$' or p_data->>'actor' is null
      then raise exception 'Test environment required'; end if;
    insert into public.app_payments(id,user_profile_id,bill_number,amount_cents,currency,status,paid_amount_cents,stripe_account_id,stripe_livemode,audit_history)
    values(p_id,p_owner,'TEST-'||upper(replace(p_id::text,'-','')),50,'usd','payment_due',0,account_id,false,
      jsonb_build_array(jsonb_build_object('operation','test_bill','actor',p_data->>'actor','at',now()))) on conflict(id) do nothing;
    select * into b from public.app_payments where id=p_id and user_profile_id=p_owner for update;
    if not found or b.stripe_livemode is distinct from false or b.amount_cents<>50 or b.stripe_account_id<>account_id
      then raise exception 'Test bill reference conflict'; end if;
    insert into public.app_payment_items(payment_id,position,description,quantity,unit_amount_cents)
    values(p_id,1,'Stripe test payment - no real charge',1,50) on conflict(payment_id,position) do nothing;
    perform set_config('app.stripe_write',coalesce(previous_write,''),true);
    return to_jsonb(b);
  end if;
  if p_operation in ('import','sync') then
    if pi is null or pi !~ '^pi_[A-Za-z0-9]+$' or account_id is null or account_id !~ '^acct_[A-Za-z0-9]+$' or live is null
    then raise exception 'Invalid provider reference'; end if;
    perform pg_advisory_xact_lock(hashtextextended(pi,0));
  end if;
  if p_operation='import' then
    select * into b from public.app_payments where stripe_payment_intent_id=pi or (payment_channel='stripe' and transaction_reference=pi) for update;
    if found then
      if b.user_profile_id<>p_owner then raise exception 'Transaction belongs to another account'; end if;
      p_id:=b.id;
    else
      if (p_data->>'amount')::integer not between 1 and 10000000 or length(btrim(p_data->>'description')) not between 1 and 200
      then raise exception 'Invalid imported charge'; end if;
      insert into public.app_payments(id,user_profile_id,bill_number,amount_cents,currency,status,paid_amount_cents,
        payment_channel,transaction_reference,stripe_payment_intent_id,stripe_account_id,stripe_livemode,cal_booking_id,audit_history)
      values(p_id,p_owner,'ADA-'||upper(replace(p_id::text,'-','')),(p_data->>'amount')::integer,p_data->>'currency','pending_verification',0,
        'stripe',pi,pi,account_id,live,(p_data->>'calBookingId')::bigint,
        jsonb_build_array(jsonb_build_object('operation','stripe_import','actor',p_data->>'actor','at',now())));
      insert into public.app_payment_items(payment_id,position,description,quantity,unit_amount_cents)
      values(p_id,1,btrim(p_data->>'description'),1,(p_data->>'amount')::integer);
    end if;
    p_operation:='sync';
  end if;
  select * into b from public.app_payments where id=p_id and user_profile_id=p_owner for update;
  if not found then raise exception 'Bill not found'; end if;
  if p_operation='reserve_checkout' then
    if b.status<>'payment_due' or b.amount_cents<50 or b.currency<>'usd' or (b.paid_amount_cents is not null and b.paid_amount_cents<>0)
      then raise exception 'This bill cannot be paid online'; end if;
    if account_id is null or live is null or (b.stripe_account_id is not null and (b.stripe_account_id<>account_id or b.stripe_livemode is distinct from live))
      then raise exception 'Payment environment mismatch'; end if;
    -- Never silently turn a real bill into a test bill. Test bills are explicitly
    -- created by Staff through the test-only operation below.
    if live=false and b.stripe_livemode is distinct from false then raise exception 'Use a dedicated test bill'; end if;
    update public.app_payments set stripe_checkout_key=coalesce(stripe_checkout_key,gen_random_uuid()),
      stripe_checkout_started_at=coalesce(stripe_checkout_started_at,now()),stripe_account_id=account_id,stripe_livemode=live where id=p_id;
  elsif p_operation='bind_checkout' then
    if b.stripe_checkout_key::text is distinct from p_data->>'key' or (b.stripe_checkout_session_id is not null and b.stripe_checkout_session_id<>p_data->>'session')
      then raise exception 'Checkout changed'; end if;
    update public.app_payments set stripe_checkout_session_id=p_data->>'session' where id=p_id;
  elsif p_operation='expire_checkout' then
    if b.status<>'payment_due' or b.stripe_checkout_session_id is distinct from p_data->>'session' then raise exception 'Checkout changed'; end if;
    update public.app_payments set stripe_checkout_key=null,stripe_checkout_started_at=null,stripe_checkout_session_id=null where id=p_id;
  elsif p_operation='start_refund' then
    if b.status<>'paid' or b.paid_amount_cents<>b.amount_cents or b.stripe_payment_intent_id is null or
      b.stripe_account_id is distinct from account_id or b.stripe_livemode is distinct from live or b.stripe_refunded_amount_cents<>0
      then raise exception 'Verified full Stripe payment required'; end if;
    if b.refund_state not in ('none','requested') then raise exception 'Reconcile the existing refund first'; end if;
    if b.refund_request_key is null then
      if length(btrim(p_data->>'reason')) not between 1 and 500 or p_data->>'actor' is null then raise exception 'Reason and actor required'; end if;
      update public.app_payments set refund_request_key=gen_random_uuid(),refund_state='requested',refund_requested_at=now(),
        refund_reason=btrim(p_data->>'reason'),refund_requested_by=p_data->>'actor',
        audit_history=audit_history||jsonb_build_array(jsonb_build_object('operation','stripe_refund_requested','actor',p_data->>'actor','at',now())) where id=p_id;
    end if;
  elsif p_operation='sync' then
    if b.amount_cents is distinct from (p_data->>'amount')::integer or b.currency is distinct from p_data->>'currency' or
      (b.stripe_account_id is not null and (b.stripe_account_id<>account_id or b.stripe_livemode is distinct from live)) or
      (b.transaction_reference is not null and b.transaction_reference<>pi) or b.status='cancelled' or
      (b.stripe_checkout_key is not null and b.stripe_checkout_key::text is distinct from p_data->>'checkoutKey')
      then raise exception 'Payment does not match the bill'; end if;
    if observed is null or refunded is null or refunded not between 0 and b.amount_cents or
      incoming_state not in ('none','pending','succeeded','failed','requires_review') or
      (incoming_state='succeeded' and refunded<>b.amount_cents) or p_data->>'paidAt' is null
      then raise exception 'Invalid verified snapshot'; end if;
    -- An old event cannot undo newer evidence. A full refund can, however,
    -- genuinely fail after Stripe initially reported success. Accept that
    -- correction only for the same provider-verified full refund, freshly read
    -- from Stripe; a missing refund or ordinary payment event is not evidence.
    if b.stripe_synced_at is not null and b.stripe_synced_at>=observed then
      perform set_config('app.stripe_write',coalesce(previous_write,''),true);
      return to_jsonb(b);
    end if;
    verified_refund_reversal := coalesce(
      b.status='refunded' and b.refund_state='succeeded' and
      b.stripe_refunded_amount_cents=b.amount_cents and refunded=0 and incoming_state='failed' and
      b.refund_reference is not null and b.refund_reference=p_data->>'failedFullRefundId', false);
    if (refunded<b.stripe_refunded_amount_cents or (b.status='refunded' and refunded<>b.amount_cents)) and not verified_refund_reversal then
      perform set_config('app.stripe_write',coalesce(previous_write,''),true);
      return to_jsonb(b);
    end if;
    update public.app_payments set
      stripe_account_id=account_id,stripe_livemode=live,stripe_payment_intent_id=pi,transaction_reference=pi,payment_channel='stripe',
      paid_amount_cents=amount_cents,paid_at=(p_data->>'paidAt')::timestamptz,
      status=case when refunded=amount_cents then 'refunded' when refunded>0 then 'partially_refunded' else 'paid' end,
      refund_state=case when incoming_state='none' and refund_request_key is not null then 'requested' else incoming_state end,
      stripe_refunded_amount_cents=refunded,
      refund_reference=coalesce(p_data->>'refundId',refund_reference),
      refund_requested_at=coalesce(refund_requested_at,(p_data->>'refundRequestedAt')::timestamptz),
      refunded_at=case when refunded=amount_cents then coalesce(refunded_at,(p_data->>'refundConfirmedAt')::timestamptz,now()) when verified_refund_reversal then null else refunded_at end,
      refund_failure=p_data->>'failure',stripe_synced_at=observed,stripe_last_event_id=p_data->>'eventId',stripe_sync_error=null,
      audit_history=audit_history || case when verified_refund_reversal then jsonb_build_array(jsonb_build_object(
        'operation','stripe_refund_failed_after_success','at',observed,'refund_reference',b.refund_reference,
        'previously_observed_completed_at',b.refunded_at,'event_id',p_data->>'eventId')) else '[]'::jsonb end,
      updated_at=now() where id=p_id;
  elsif p_operation='sync_error' then
    update public.app_payments set stripe_sync_error='Provider verification needs attention. Check Stripe before retrying.' where id=p_id;
  else raise exception 'Unknown Stripe operation'; end if;
  select * into b from public.app_payments where id=p_id;
  perform set_config('app.stripe_write',coalesce(previous_write,''),true);
  return to_jsonb(b);
end $$;
revoke all on function public.app_stripe_bill(text,uuid,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.app_stripe_bill(text,uuid,uuid,jsonb) to service_role;
commit;
