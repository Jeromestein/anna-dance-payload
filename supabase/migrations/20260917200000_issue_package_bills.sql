begin;

-- Retry-safe issuance for ordinary bills and explicitly marked sandbox bills.
-- No new tables or changes to provider reconciliation are needed.
create function public.app_issue_bill(
  p_owner uuid, p_id uuid, p_actor text, p_items jsonb,
  p_due date default null, p_replaces uuid default null,
  p_test_account text default null
) returns uuid language plpgsql security definer set search_path = '' as $$
declare
  b public.app_payments%rowtype;
  saved_items jsonb;
begin
  if p_actor is null or length(btrim(p_actor))=0 then raise exception 'Actor required'; end if;
  if p_test_account is not null and p_test_account !~ '^acct_[A-Za-z0-9]+$'
    then raise exception 'Invalid sandbox account'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_id::text, 0));
  select * into b from public.app_payments where id=p_id for update;
  if found then
    select jsonb_agg(jsonb_build_object('description',description,'quantity',quantity,
      'unit_amount_cents',unit_amount_cents) order by position)
      into saved_items from public.app_payment_items where payment_id=p_id;
    if b.user_profile_id is distinct from p_owner or b.due_date is distinct from p_due
      or b.replaces_payment_id is distinct from p_replaces
      or saved_items is distinct from p_items
      or (p_test_account is null and b.stripe_livemode=false)
      or (p_test_account is not null and (b.stripe_livemode is distinct from false
        or b.stripe_account_id is distinct from p_test_account))
    then raise exception 'Bill reference conflict'; end if;
    return b.id;
  end if;
  perform public.app_manage_bill(p_owner,p_id,p_actor,'issue',p_items,p_due,p_replaces);
  if p_test_account is not null then
    update public.app_payments set stripe_livemode=false,stripe_account_id=p_test_account,
      audit_history=audit_history||jsonb_build_array(jsonb_build_object(
        'operation','sandbox_bill','actor',p_actor,'at',now())) where id=p_id;
  end if;
  return p_id;
end $$;
revoke all on function public.app_issue_bill(uuid,uuid,text,jsonb,date,uuid,text)
  from public,anon,authenticated;
grant execute on function public.app_issue_bill(uuid,uuid,text,jsonb,date,uuid,text) to service_role;
notify pgrst, 'reload schema';
commit;
