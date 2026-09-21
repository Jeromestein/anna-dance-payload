begin;

alter table public.app_billing_notifications drop constraint app_billing_notifications_kind_check;
alter table public.app_billing_notifications add constraint app_billing_notifications_kind_check
  check (kind in ('request','paid_customer','paid_admin','refunded_customer','refunded_admin'));

-- Only an existing paid record transitioning to a verified full Stripe refund.
-- No historical backfill, first-import receipts, partial refunds, or manual refunds.
create function public.app_queue_refund_notices()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if old.status in ('paid','partially_refunded') and new.status='refunded'
    and new.payment_channel='stripe' and new.stripe_payment_intent_id is not null
    and new.refund_state='succeeded' and new.stripe_refunded_amount_cents=new.amount_cents
    and new.refund_reference is not null then
    insert into public.app_billing_notifications(payment_id,kind)
      values(new.id,'refunded_customer'),(new.id,'refunded_admin')
      on conflict(payment_id,kind) do nothing;
  end if;
  return new;
end $$;
create trigger app_refund_confirmation_outbox after update on public.app_payments
for each row execute function public.app_queue_refund_notices();
revoke all on function public.app_queue_refund_notices() from public,anon,authenticated;

create or replace function public.app_claim_billing_notice(p_id uuid,p_payload jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare n public.app_billing_notifications%rowtype; b public.app_payments%rowtype;
begin
  select * into n from public.app_billing_notifications where id=p_id for update;
  if not found then raise exception 'Notice not found'; end if;
  if n.status in ('sent','cancelled') then return to_jsonb(n); end if;
  select * into b from public.app_payments where id=n.payment_id;
  if (n.kind='request' and b.status<>'payment_due') or
     (n.kind in ('paid_customer','paid_admin') and b.status<>'paid') or
     (n.kind in ('refunded_customer','refunded_admin') and (
       b.status<>'refunded' or b.refund_state<>'succeeded' or b.payment_channel is distinct from 'stripe' or
       b.stripe_refunded_amount_cents<>b.amount_cents or b.refund_reference is null)) then
    update public.app_billing_notifications set status='cancelled',error_code='bill_changed'
      where id=p_id returning * into n;
    return to_jsonb(n);
  end if;
  if n.status='review' then return to_jsonb(n); end if;
  if n.status='sending' and n.claimed_at>now()-interval '2 minutes' then
    return jsonb_build_object('status','busy');
  end if;
  -- Resend retains idempotency keys for 24h. Never silently re-send an ambiguous
  -- attempt beyond that window; staff must review delivery at the provider.
  if n.first_attempt_at<now()-interval '23 hours' then
    update public.app_billing_notifications set status='review',error_code='delivery_review'
      where id=p_id returning * into n;
    return to_jsonb(n);
  end if;
  if n.payload is null and (p_payload is null or jsonb_typeof(p_payload)<>'object') then
    raise exception 'Email payload required';
  end if;
  update public.app_billing_notifications set status='sending',
    payload=coalesce(payload,p_payload),first_attempt_at=coalesce(first_attempt_at,now()),
    claimed_at=now(),claim_token=gen_random_uuid(),error_code=null
    where id=p_id returning * into n;
  return to_jsonb(n);
end $$;

notify pgrst, 'reload schema';
commit;
