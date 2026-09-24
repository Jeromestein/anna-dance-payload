begin;
-- Packages remain application configuration. Orders retain purchase-time snapshots.
alter table public.app_payments
 add column package_id text,
 add column package_catalog text,
 add column package_snapshot jsonb,
 add column payment_preference text check(payment_preference is null or payment_preference='cash'),
 add constraint app_package_shape check (
  (package_id is null and package_catalog is null and package_snapshot is null and payment_preference is null)
  or (package_id is not null and package_catalog is not null and package_snapshot is not null
   and pricing_mode='agreed_total' and stripe_livemode is not null));
grant select(package_id,package_catalog,payment_preference,package_snapshot) on public.app_payments to authenticated;
create unique index app_current_package_purchase on public.app_payments
 (user_profile_id,package_catalog,package_id,stripe_livemode)
 where package_id is not null and status<>'cancelled';

create function public.app_protect_package_bill() returns trigger language plpgsql set search_path='' as $$
begin
 if tg_op='UPDATE' and old.package_id is not null and
  (new.package_id is distinct from old.package_id or new.package_catalog is distinct from old.package_catalog
   or new.package_snapshot is distinct from old.package_snapshot or new.amount_cents<>old.amount_cents
   or new.user_profile_id<>old.user_profile_id or new.stripe_livemode is distinct from old.stripe_livemode)
 then raise exception 'Issued package details are immutable'; end if;
 if new.package_id is not null and new.payment_preference='cash' and
  (new.stripe_account_id is not null or new.stripe_checkout_key is not null
   or new.stripe_checkout_session_id is not null or new.stripe_payment_intent_id is not null)
 then raise exception 'Cash orders cannot have a Stripe checkout'; end if;
 if tg_op='UPDATE' and old.package_id is not null and new.payment_preference is distinct from old.payment_preference
   and (old.status<>'payment_due' or old.stripe_checkout_key is not null or old.stripe_checkout_session_id is not null or old.stripe_payment_intent_id is not null)
 then raise exception 'Resolve the existing payment before changing method'; end if;
 if new.package_id is not null and new.status='paid' and new.payment_channel='stripe'
  and (new.stripe_payment_intent_id is null or new.stripe_synced_at is null)
 then raise exception 'Verified Stripe payment required'; end if;
 if new.package_id is not null and new.status='paid' and new.payment_channel is distinct from 'stripe'
   and (new.payment_preference is distinct from 'cash' or new.payment_channel is distinct from 'cash')
 then raise exception 'Confirm package cash receipt or use Stripe verification'; end if;
 return new;
end $$;
create trigger app_protect_package_bill before insert or update on public.app_payments
 for each row execute function public.app_protect_package_bill();

-- Trusted server supplies the shared catalog snapshot and price, never the student browser.
create function public.app_purchase_package(
 p_owner uuid,p_id uuid,p_actor text,p_package text,p_catalog text,p_snapshot jsonb,
 p_item jsonb,p_total integer,p_live boolean,p_cash boolean default false,p_admin boolean default false,
 p_due date default null
) returns uuid language plpgsql security definer set search_path='' as $$
declare b public.app_payments%rowtype;
begin
 if p_owner is null or p_id is null or length(btrim(coalesce(p_actor,'')))=0
  or coalesce(p_package,'') !~ '^(level-[123]|DUET-0[1-4]|SOLO-0[12])$'
  or length(coalesce(p_catalog,'')) not between 1 and 80 or jsonb_typeof(p_snapshot) is distinct from 'object'
  or p_snapshot->>'id' is distinct from p_package or p_live is null or p_cash is null or p_admin is null
  or p_total is null or p_total not between 50 and 10000000
  or p_item->>'course_key' is null or p_item->>'course_key' not in ('group','duet','solo30','solo60')
  or coalesce(p_item->>'credit_count','') !~ '^[0-9]+$' or (p_item->>'credit_count')::int not between 1 and 100
  or coalesce(p_item->>'lesson_duration_minutes','') !~ '^[0-9]+$'
  or (p_item->>'lesson_duration_minutes')::int<>(case when p_item->>'course_key'='solo30' then 30 else 60 end)
  or length(btrim(coalesce(p_item->>'description',''))) not between 1 and 200
  or p_item->>'quantity' is distinct from '1' or p_item->>'unit_amount_cents' is not null
 then raise exception 'Invalid package purchase'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_owner::text||':'||p_catalog||':'||p_package||':'||p_live::text,7));
 -- A retried request ID must never become a new purchase after cancellation/refund.
 select * into b from public.app_payments where id=p_id for update;
 if found then
  if b.user_profile_id is distinct from p_owner or b.package_id is distinct from p_package
   or b.package_catalog is distinct from p_catalog or b.stripe_livemode is distinct from p_live
   or b.amount_cents is distinct from p_total then raise exception 'Purchase reference conflict'; end if;
  return b.id;
 end if;
 select * into b from public.app_payments where user_profile_id=p_owner and package_id=p_package
  and package_catalog=p_catalog and stripe_livemode=p_live and status<>'cancelled' for update;
 if found then
  -- Preserve an Admin quote even when the self-service request supplies list price.
  if p_admin and (b.amount_cents<>p_total or b.due_date is distinct from p_due)
   then raise exception 'An existing package bill must be resolved before issuing a different amount'; end if;
  return b.id;
 end if;
 insert into public.app_payments(id,user_profile_id,bill_number,amount_cents,currency,status,
  paid_amount_cents,pricing_mode,stripe_livemode,package_id,package_catalog,package_snapshot,payment_preference,due_date,audit_history)
 values(p_id,p_owner,'ADA-'||upper(replace(p_id::text,'-','')),p_total,'usd','payment_due',0,'agreed_total',p_live,
  p_package,p_catalog,p_snapshot,case when p_cash then 'cash' end,p_due,
  jsonb_build_array(jsonb_build_object('operation','issue_package','actor',p_actor,'at',now(),'admin',p_admin)));
 insert into public.app_payment_items(payment_id,position,description,quantity,unit_amount_cents,
  course_key,credit_count,lesson_duration_minutes)
 values(p_id,1,p_item->>'description',1,null,p_item->>'course_key',(p_item->>'credit_count')::int,
  (p_item->>'lesson_duration_minutes')::int);
 return p_id;
end $$;

create function public.app_package_payment_method(p_owner uuid,p_id uuid,p_cash boolean)
returns uuid language plpgsql security definer set search_path='' as $$
declare b public.app_payments%rowtype;
begin
 select * into b from public.app_payments where id=p_id and user_profile_id=p_owner for update;
 if not found or b.package_id is null or p_cash is null or b.status<>'payment_due'
  or b.stripe_checkout_key is not null or b.stripe_checkout_session_id is not null
  or b.stripe_payment_intent_id is not null or coalesce(b.paid_amount_cents,0)<>0
 then raise exception 'Resolve the existing payment before changing method'; end if;
 update public.app_payments set payment_preference=case when p_cash then 'cash' end,
  stripe_account_id=case when p_cash then null else stripe_account_id end,
  audit_history=audit_history||jsonb_build_array(jsonb_build_object('operation','choose_payment_method','actor',p_owner,
   'cash',p_cash,'at',now())) where id=p_id;
 return p_id;
end $$;

-- Cancel only an unstarted package order. A reserved Checkout needs provider reconciliation.
create function public.app_cancel_package(p_owner uuid,p_id uuid,p_actor text)
returns uuid language plpgsql security definer set search_path='' as $$
declare b public.app_payments%rowtype; previous_write text:=current_setting('app.stripe_write',true);
begin
 select * into b from public.app_payments where id=p_id and user_profile_id=p_owner for update;
 if not found or b.package_id is null or b.status<>'payment_due' or length(btrim(coalesce(p_actor,'')))=0
  or b.stripe_checkout_key is not null or b.stripe_checkout_session_id is not null or b.stripe_payment_intent_id is not null
 then raise exception 'Resolve the existing payment before cancellation'; end if;
 perform set_config('app.stripe_write','yes',true);
 perform public.app_manage_bill(p_owner,p_id,p_actor,'cancelled');
 perform set_config('app.stripe_write',coalesce(previous_write,''),true);
 return p_id;
end $$;
revoke all on function public.app_purchase_package(uuid,uuid,text,text,text,jsonb,jsonb,integer,boolean,boolean,boolean,date) from public,anon,authenticated;
revoke all on function public.app_package_payment_method(uuid,uuid,boolean) from public,anon,authenticated;
revoke all on function public.app_cancel_package(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.app_purchase_package(uuid,uuid,text,text,text,jsonb,jsonb,integer,boolean,boolean,boolean,date) to service_role;
grant execute on function public.app_package_payment_method(uuid,uuid,boolean) to service_role;
grant execute on function public.app_cancel_package(uuid,uuid,text) to service_role;
notify pgrst,'reload schema';
commit;
