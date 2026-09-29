begin;

-- Keep the first teacher message immutable, but let a course-page consent
-- (which has no message yet) receive one when the student opens Checkout.
create or replace function public.app_accept_bill(p_owner uuid,p_id uuid,p_terms text,p_note text)
returns void language plpgsql security definer set search_path='' as $$
declare existing public.app_bill_acknowledgements%rowtype;
begin
  perform 1 from public.app_payments where id=p_id and user_profile_id=p_owner
    and status='payment_due' for update;
  if not found then raise exception 'Payable bill not found'; end if;
  if p_terms is null or length(p_terms)=0 or p_note is null or length(p_note)>500 then
    raise exception 'Invalid acknowledgement'; end if;
  select * into existing from public.app_bill_acknowledgements where payment_id=p_id for update;
  if found then
    if existing.user_profile_id is distinct from p_owner or
       (existing.note<>'' and existing.note is distinct from p_note) then
      raise exception 'Confirmation already saved; reload the bill'; end if;
    update public.app_bill_acknowledgements
      set terms_version=p_terms,
          note=case when existing.note='' then p_note else existing.note end,
          accepted_at=case when existing.terms_version is distinct from p_terms then now() else accepted_at end
      where payment_id=p_id;
  else
    insert into public.app_bill_acknowledgements(payment_id,user_profile_id,terms_version,note)
      values(p_id,p_owner,p_terms,p_note);
  end if;
end $$;

-- A self-service course choice saves the existing checkbox consent in the
-- same transaction as bill creation. Staff-created bills use the original RPC.
create function public.app_purchase_package_with_terms(
  p_owner uuid,p_id uuid,p_actor text,p_package text,p_catalog text,p_snapshot jsonb,
  p_item jsonb,p_total integer,p_live boolean,p_cash boolean,p_terms text
) returns uuid language plpgsql security definer set search_path='' as $$
declare bill_id uuid;
begin
  if p_actor is distinct from p_owner::text or p_terms is distinct from 'website-terms-2026-09-10'
    then raise exception 'Student terms confirmation required'; end if;
  bill_id:=public.app_purchase_package(p_owner,p_id,p_actor,p_package,p_catalog,p_snapshot,
    p_item,p_total,p_live,p_cash,false,null);
  perform public.app_accept_bill(p_owner,bill_id,p_terms,'');
  return bill_id;
end $$;
revoke all on function public.app_purchase_package_with_terms(uuid,uuid,text,text,text,jsonb,jsonb,integer,boolean,boolean,text)
  from public,anon,authenticated;
grant execute on function public.app_purchase_package_with_terms(uuid,uuid,text,text,text,jsonb,jsonb,integer,boolean,boolean,text)
  to service_role;

-- Existing self-service course bills were created only after the course-page
-- checkbox was required. Backfill their saved consent without touching staff
-- bills, test bills created by staff, or previously saved acknowledgements.
insert into public.app_bill_acknowledgements(payment_id,user_profile_id,terms_version,note)
select b.id,b.user_profile_id,'website-terms-2026-09-10',''
from public.app_payments b
where b.package_id is not null
  and exists (
    select 1 from jsonb_array_elements(b.audit_history) entry
    where entry->>'operation'='issue_package'
      and entry->>'actor'=b.user_profile_id::text
      and entry->>'admin'='false'
  )
on conflict(payment_id) do nothing;

notify pgrst, 'reload schema';
commit;
