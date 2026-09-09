begin;

-- Preserve historical semester fields and partially refunded rows.
alter table public.app_payments
  alter column term_name drop not null,
  alter column class_name drop not null,
  alter column lesson_count drop not null,
  add column bill_number text unique,
  add column paid_amount_cents integer,
  add column refunded_at timestamptz,
  add column refund_reference text unique,
  add column refund_reason text,
  add column payment_channel text,
  add column transaction_reference text,
  add column replaces_payment_id uuid references public.app_payments(id),
  add column audit_history jsonb not null default '[]'::jsonb;

update public.app_payments
set transaction_reference = coalesce(stripe_payment_intent_id, stripe_checkout_session_id),
    payment_channel = case when coalesce(stripe_payment_intent_id, stripe_checkout_session_id) is not null then 'stripe' else null end,
    bill_number = 'ADA-' || upper(replace(id::text, '-', '')),
    paid_amount_cents = case
      when status in ('paid', 'refunded') then amount_cents
      when status in ('payment_due', 'cancelled') then 0
      else null end;
alter table public.app_payments alter column bill_number set not null;
alter table public.app_payments add constraint app_payments_paid_amount_valid
  check (paid_amount_cents is null or paid_amount_cents between 0 and amount_cents);
create unique index app_payments_channel_reference_unique
  on public.app_payments(payment_channel, transaction_reference)
  where transaction_reference is not null;

create table public.app_payment_items (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null references public.app_payments(id) on delete restrict,
  position integer not null check (position between 1 and 20),
  description text not null check (char_length(btrim(description)) between 1 and 200),
  quantity integer not null check (quantity between 1 and 100),
  unit_amount_cents integer not null check (unit_amount_cents between 0 and 2147483647),
  unique(payment_id, position)
);
insert into public.app_payment_items(payment_id, position, description, quantity, unit_amount_cents)
select id, 1, left(coalesce(class_name, 'Historical charge') ||
  coalesce(' · ' || term_name, ''), 200), 1, amount_cents
from public.app_payments;

alter table public.app_payment_items enable row level security;
create policy "Account holders can view their own payment items"
on public.app_payment_items for select to authenticated
using (exists (select 1 from public.app_payments p
  where p.id = payment_id and p.user_profile_id = (select auth.uid())));
revoke all on public.app_payment_items from anon, authenticated;
grant select on public.app_payment_items to authenticated;
grant all on public.app_payment_items to service_role;

-- Exclude staff audit details from student API access.
revoke select on public.app_payments from authenticated;
grant select (id, user_profile_id, bill_number, amount_cents, currency, due_date,
  status, paid_amount_cents, paid_at, created_at, refunded_at, refund_reference,
  refund_reason, payment_channel, transaction_reference, replaces_payment_id)
on public.app_payments to authenticated;

-- Only the server may call this RPC after authenticating a Payload administrator.
-- A row lock makes status checks and writes atomic; the caller UUID prevents
-- duplicate bill creation when a form is submitted twice.
create function public.app_manage_bill(
  p_owner uuid, p_id uuid, p_actor text, p_operation text,
  p_items jsonb default '[]', p_due date default null,
  p_replaces uuid default null, p_channel text default null,
  p_reference text default null, p_reason text default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  bill public.app_payments%rowtype;
  item jsonb;
  item_count integer;
  total bigint := 0;
  position_value integer := 0;
  quantity_value integer;
  unit_value integer;
  event jsonb;
begin
  if p_actor is null or length(btrim(p_actor)) = 0 then raise exception 'Actor required'; end if;
  event := jsonb_build_object('actor', p_actor, 'operation', p_operation, 'at', now(),
    'reference', p_reference, 'reason', p_reason);
  if p_operation = 'issue' then
    item_count := jsonb_array_length(p_items);
    if item_count < 1 or item_count > 20 then raise exception 'Invalid items'; end if;
    if p_replaces is not null and not exists (
      select 1 from public.app_payments where id = p_replaces and user_profile_id = p_owner
    ) then raise exception 'Replacement must belong to the same account'; end if;
    for item in select value from jsonb_array_elements(p_items) loop
      if jsonb_typeof(item->'quantity') <> 'number'
        or jsonb_typeof(item->'unit_amount_cents') <> 'number'
        or (item->>'quantity') !~ '^[0-9]+$'
        or (item->>'unit_amount_cents') !~ '^[0-9]+$'
        or item->>'description' is null
        or length(btrim(item->>'description')) not between 1 and 200
      then raise exception 'Invalid item'; end if;
      quantity_value := (item->>'quantity')::integer;
      unit_value := (item->>'unit_amount_cents')::integer;
      if quantity_value not between 1 and 100 or unit_value not between 0 and 10000000
      then raise exception 'Invalid item amount'; end if;
      total := total + quantity_value::bigint * unit_value;
    end loop;
    if total not between 1 and 10000000 then raise exception 'Invalid total'; end if;
    insert into public.app_payments(id, user_profile_id, bill_number, amount_cents,
      currency, status, paid_amount_cents, due_date, replaces_payment_id, audit_history)
    values(p_id, p_owner, 'ADA-' || to_char(now() at time zone 'America/New_York', 'YYYYMMDD') || '-' || upper(right(replace(p_id::text, '-', ''), 12)), total::integer,
      'usd', 'payment_due', 0, p_due, p_replaces, jsonb_build_array(event));
    for item in select value from jsonb_array_elements(p_items) loop
      position_value := position_value + 1;
      insert into public.app_payment_items(payment_id, position, description, quantity, unit_amount_cents)
      values(p_id, position_value, btrim(item->>'description'),
        (item->>'quantity')::integer, (item->>'unit_amount_cents')::integer);
    end loop;
  else
    select * into bill from public.app_payments
      where id = p_id and user_profile_id = p_owner for update;
    if not found then raise exception 'Bill not found'; end if;
    if p_operation in ('paid', 'refunded') and
      (p_reference is null or length(btrim(p_reference)) not between 1 and 200)
    then raise exception 'Verified transaction reference required'; end if;
    if p_operation = 'paid' and bill.status in ('payment_due', 'pending_verification') then
      if p_channel is null or p_channel not in ('stripe', 'cash', 'bank_transfer', 'other')
      then raise exception 'Payment channel required'; end if;
      if p_channel = 'stripe' and p_reference !~ '^pi_[A-Za-z0-9_]+$'
      then raise exception 'Use the Stripe PaymentIntent reference'; end if;
      if p_channel = 'stripe' and exists (
        select 1 from public.app_payments where id <> p_id and
          (stripe_payment_intent_id = p_reference or stripe_checkout_session_id = p_reference)
      ) then raise exception 'Transaction already recorded'; end if;
      update public.app_payments set status = 'paid', paid_amount_cents = amount_cents,
        paid_at = now(), payment_channel = p_channel, transaction_reference = btrim(p_reference)
      where id = p_id;
    elsif p_operation = 'refunded' and bill.status = 'paid' then
      if p_reason is null or length(btrim(p_reason)) not between 1 and 500
      then raise exception 'Refund reason required'; end if;
      update public.app_payments set status = 'refunded', refunded_at = now(),
        refund_reference = btrim(p_reference), refund_reason = btrim(p_reason)
      where id = p_id;
    elsif p_operation = 'cancelled' and bill.status = 'payment_due' then
      update public.app_payments set status = 'cancelled' where id = p_id;
    else
      raise exception 'Invalid or stale transition';
    end if;
    update public.app_payments set updated_at = now(), audit_history = audit_history || jsonb_build_array(event)
    where id = p_id;
  end if;
  return p_id;
end;
$$;
revoke all on function public.app_manage_bill(uuid, uuid, text, text, jsonb, date, uuid, text, text, text)
from public, anon, authenticated;
grant execute on function public.app_manage_bill(uuid, uuid, text, text, jsonb, date, uuid, text, text, text)
to service_role;
commit;
