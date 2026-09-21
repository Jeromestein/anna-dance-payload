begin;

-- Service-only outbox. Email delivery never controls the financial status.
create table public.app_billing_notifications (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.app_payments(id) on delete cascade,
  kind text not null check (kind in ('request','paid_customer','paid_admin')),
  status text not null default 'pending' check (status in ('pending','sending','sent','failed','review','cancelled')),
  payload jsonb,
  first_attempt_at timestamptz,
  claimed_at timestamptz,
  claim_token uuid,
  sent_at timestamptz,
  provider_id text,
  error_code text,
  created_at timestamptz not null default now(),
  unique(payment_id,kind)
);
alter table public.app_billing_notifications enable row level security;
revoke all on public.app_billing_notifications from public,anon,authenticated;
grant all on public.app_billing_notifications to service_role;

create function public.app_queue_bill_request(p_owner uuid,p_id uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
  perform 1 from public.app_payments where id=p_id and user_profile_id=p_owner
    and status='payment_due' for update;
  if not found then raise exception 'Payable bill not found'; end if;
  insert into public.app_billing_notifications(payment_id,kind) values(p_id,'request')
    on conflict(payment_id,kind) do nothing;
end $$;

create function public.app_queue_paid_notices()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  -- Website Checkout bills only: do not send new receipts for historical imports.
  if new.status='paid' and old.status is distinct from 'paid'
    and new.payment_channel='stripe' and new.stripe_checkout_key is not null then
    insert into public.app_billing_notifications(payment_id,kind)
      values(new.id,'paid_customer'),(new.id,'paid_admin')
      on conflict(payment_id,kind) do nothing;
  end if;
  return new;
end $$;
create trigger app_payment_confirmation_outbox after update on public.app_payments
for each row execute function public.app_queue_paid_notices();

create function public.app_claim_billing_notice(p_id uuid,p_payload jsonb)
returns jsonb language plpgsql security definer set search_path='' as $$
declare n public.app_billing_notifications%rowtype; b public.app_payments%rowtype;
begin
  select * into n from public.app_billing_notifications where id=p_id for update;
  if not found then raise exception 'Notice not found'; end if;
  if n.status in ('sent','cancelled') then return to_jsonb(n); end if;
  select * into b from public.app_payments where id=n.payment_id;
  if (n.kind='request' and b.status<>'payment_due') or
     (n.kind<>'request' and b.status<>'paid') then
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

create table public.app_bill_acknowledgements (
  payment_id uuid primary key references public.app_payments(id) on delete cascade,
  user_profile_id uuid not null references public.app_user_profiles(id) on delete cascade,
  terms_version text not null,
  note text not null default '' check (length(note)<=500),
  accepted_at timestamptz not null default now()
);
alter table public.app_bill_acknowledgements enable row level security;
revoke all on public.app_bill_acknowledgements from public,anon,authenticated;
grant all on public.app_bill_acknowledgements to service_role;
grant select on public.app_bill_acknowledgements to authenticated;
create policy own_bill_acknowledgement on public.app_bill_acknowledgements for select
to authenticated using(user_profile_id=(select auth.uid()));

create function public.app_accept_bill(p_owner uuid,p_id uuid,p_terms text,p_note text)
returns void language plpgsql security definer set search_path='' as $$
begin
  perform 1 from public.app_payments where id=p_id and user_profile_id=p_owner
    and status='payment_due' for update;
  if not found then raise exception 'Payable bill not found'; end if;
  if p_terms is null or length(p_terms)=0 or p_note is null or length(p_note)>500 then
    raise exception 'Invalid acknowledgement'; end if;
  if exists(select 1 from public.app_bill_acknowledgements where payment_id=p_id
    and (note is distinct from p_note or terms_version is distinct from p_terms)) then
    raise exception 'Confirmation already saved; reload the bill';
  end if;
  insert into public.app_bill_acknowledgements(payment_id,user_profile_id,terms_version,note)
    values(p_id,p_owner,p_terms,p_note) on conflict(payment_id) do nothing;
end $$;

revoke all on function public.app_queue_bill_request(uuid,uuid) from public,anon,authenticated;
revoke all on function public.app_queue_paid_notices() from public,anon,authenticated;
revoke all on function public.app_claim_billing_notice(uuid,jsonb) from public,anon,authenticated;
revoke all on function public.app_accept_bill(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.app_queue_bill_request(uuid,uuid) to service_role;
grant execute on function public.app_claim_billing_notice(uuid,jsonb) to service_role;
grant execute on function public.app_accept_bill(uuid,uuid,text,text) to service_role;
notify pgrst, 'reload schema';
commit;
