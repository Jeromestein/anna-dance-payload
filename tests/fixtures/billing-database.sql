-- Run only in a disposable PostgreSQL database, never against production.
\set ON_ERROR_STOP on
do $$ begin
  if not exists(select 1 from pg_roles where rolname='anon') then create role anon; end if;
  if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated; end if;
  if not exists(select 1 from pg_roles where rolname='service_role') then create role service_role bypassrls; end if;
end $$;
create schema auth;
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
grant usage on schema auth to authenticated;
grant execute on function auth.uid() to authenticated;
create table public.app_user_profiles(id uuid primary key);
create table public.app_payments (
  id uuid primary key default gen_random_uuid(),
  user_profile_id uuid not null references public.app_user_profiles(id),
  term_name text not null, class_name text not null, lesson_count integer not null,
  amount_cents integer not null check(amount_cents >= 0), currency text not null default 'usd',
  due_date date, status text not null default 'payment_due' check(status in
    ('payment_due','pending_verification','paid','partially_refunded','refunded','cancelled')),
  stripe_payment_link text, stripe_checkout_session_id text unique,
  stripe_payment_intent_id text unique, receipt_url text, paid_at timestamptz,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.app_payments enable row level security;
create policy own_bill on public.app_payments for select to authenticated
using(user_profile_id = (select auth.uid()));
grant all on public.app_payments to service_role;
grant select on public.app_payments to authenticated;
insert into public.app_user_profiles values
('00000000-0000-4000-8000-000000000001'),('00000000-0000-4000-8000-000000000002');
insert into public.app_payments(id,user_profile_id,term_name,class_name,lesson_count,amount_cents,status)
values ('10000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000001','Old term','Old lesson',1,10000,'partially_refunded');
\ir ../../supabase/migrations/20260909190000_add_itemized_billing.sql

do $$
declare
  owner_id uuid := '00000000-0000-4000-8000-000000000001';
  bill_id uuid := '20000000-0000-4000-8000-000000000001';
  new_id uuid := '20000000-0000-4000-8000-000000000002';
  fail_id uuid := '20000000-0000-4000-8000-000000000003';
  items jsonb := '[{"description":"Lesson","quantity":2,"unit_amount_cents":3500},{"description":"Materials","quantity":1,"unit_amount_cents":500}]';
  result integer;
begin
  perform public.app_manage_bill(owner_id,bill_id,'staff-1','issue',items);
  select amount_cents into result from public.app_payments where id=bill_id;
  assert result=7500, 'Item totals must be calculated server-side';
  begin
    perform public.app_manage_bill(owner_id,bill_id,'staff-1','issue',items);
    raise exception 'Duplicate issue accepted';
  exception when unique_violation then null; end;
  begin
    perform public.app_manage_bill(owner_id,fail_id,'staff-1','issue','[{"description":"Bad","quantity":1.5,"unit_amount_cents":500}]');
    raise exception 'Fractional quantity accepted';
  exception when raise_exception then
    if sqlerrm='Fractional quantity accepted' then raise; end if;
  end;
  assert not exists(select 1 from public.app_payments where id=fail_id), 'Failed issue must leave no bill';
  perform public.app_manage_bill(owner_id,bill_id,'staff-1','paid',p_channel=>'stripe',p_reference=>'pi_test_one');
  begin
    perform public.app_manage_bill(owner_id,bill_id,'staff-1','paid',p_channel=>'stripe',p_reference=>'pi_test_two');
    raise exception 'Repeated payment accepted';
  exception when raise_exception then
    if sqlerrm='Repeated payment accepted' then raise; end if;
  end;
  perform public.app_manage_bill(owner_id,new_id,'staff-1','issue',items,p_replaces=>bill_id);
  assert (select status='payment_due' and paid_amount_cents=0 from public.app_payments where id=new_id), 'Replacement must not inherit Paid';
  begin
    perform public.app_manage_bill(owner_id,new_id,'staff-1','paid',p_channel=>'stripe',p_reference=>'pi_test_one');
    raise exception 'Duplicate transaction accepted';
  exception when unique_violation then null; end;
  begin
    perform public.app_manage_bill('00000000-0000-4000-8000-000000000002',fail_id,'staff-1','issue',items,p_replaces=>bill_id);
    raise exception 'Cross-account replacement accepted';
  exception when raise_exception then
    if sqlerrm='Cross-account replacement accepted' then raise; end if;
  end;
  perform public.app_manage_bill(owner_id,bill_id,'staff-1','refunded',p_reference=>'re_test_one',p_reason=>'Replaced order');
  assert (select status='refunded' and paid_amount_cents=amount_cents and refunded_at is not null and jsonb_array_length(audit_history)=3 from public.app_payments where id=bill_id), 'Full refund and audit history required';
  begin
    perform public.app_manage_bill(owner_id,bill_id,'staff-1','paid',p_channel=>'cash',p_reference=>'again');
    raise exception 'Refunded bill revived';
  exception when raise_exception then
    if sqlerrm='Refunded bill revived' then raise; end if;
  end;
  assert (select status='partially_refunded' and paid_amount_cents is null from public.app_payments where id='10000000-0000-4000-8000-000000000001'), 'Preserve unknown historical partial refunds';
end $$;

set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000002', false);
do $$ begin
  assert (select count(id)=0 from public.app_payments), 'Other account bills must be hidden';
  assert (select count(*)=0 from public.app_payment_items), 'Other account items must be hidden';
  assert not has_function_privilege(current_user,'public.app_manage_bill(uuid,uuid,text,text,jsonb,date,uuid,text,text,text)','execute'), 'Student must not execute billing RPC';
  assert not has_column_privilege(current_user,'public.app_payments','audit_history','select'), 'Staff audit is server-only';
  assert not has_table_privilege(current_user,'public.app_payments','update'), 'Student must not mutate payments';
end $$;
select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001', false);
do $$ begin
  assert (select count(id)=3 from public.app_payments), 'Owner must see their bills';
  assert (select count(*)=5 from public.app_payment_items), 'Owner must see their line items';
end $$;
reset role;
