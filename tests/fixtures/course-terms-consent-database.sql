-- Run only in a fresh disposable local database.
\set ON_ERROR_STOP on
\ir card-surcharge-database.sql

set role service_role;
do $$
declare
  owner_id uuid:='00000000-0000-4000-8000-000000000001';
  item jsonb:='{"course_key":"group","description":"Terms test course","credit_count":10,"lesson_duration_minutes":60,"quantity":1,"unit_amount_cents":null}';
begin
  perform public.app_purchase_package(owner_id,'70000000-0000-4000-8000-000000000001',owner_id::text,
    'level-1','prior-course-consent','{"id":"level-1"}',item,10000,true);
  perform public.app_purchase_package(owner_id,'70000000-0000-4000-8000-000000000002','staff',
    'level-1','staff-created-bill','{"id":"level-1"}',item,10000,true);
end $$;
reset role;

\ir ../../supabase/migrations/20260929133000_reuse_course_terms_consent.sql

set role service_role;
do $$
declare
  owner_id uuid:='00000000-0000-4000-8000-000000000001';
  other_id uuid:='00000000-0000-4000-8000-000000000002';
  new_id uuid:='70000000-0000-4000-8000-000000000003';
  item jsonb:='{"course_key":"group","description":"Terms test course","credit_count":10,"lesson_duration_minutes":60,"quantity":1,"unit_amount_cents":null}';
begin
  assert exists(select 1 from public.app_bill_acknowledgements
    where payment_id='70000000-0000-4000-8000-000000000001' and note=''),
    'Existing course-page consent was not carried to the bill';
  assert not exists(select 1 from public.app_bill_acknowledgements
    where payment_id='70000000-0000-4000-8000-000000000002'),
    'Staff-created bill must still ask for terms';
  assert public.app_purchase_package_with_terms(owner_id,new_id,owner_id::text,
    'level-1','new-course-consent','{"id":"level-1"}',item,10000,true,false,
    'website-terms-2026-09-10')=new_id;
  assert (select terms_version='website-terms-2026-09-10' and note=''
    from public.app_bill_acknowledgements where payment_id=new_id);
  perform public.app_accept_bill(owner_id,new_id,'website-terms-2026-09-10','Please confirm dates.');
  assert (select note='Please confirm dates.' from public.app_bill_acknowledgements where payment_id=new_id),
    'Teacher message was not saved after course consent';
  begin
    perform public.app_accept_bill(owner_id,new_id,'website-terms-2026-09-10','Changed message');
    raise exception 'Saved teacher message was changed';
  exception when raise_exception then
    if sqlerrm='Saved teacher message was changed' then raise; end if;
  end;
  begin
    perform public.app_purchase_package_with_terms(other_id,gen_random_uuid(),owner_id::text,
      'level-1','forged-course-consent','{"id":"level-1"}',item,10000,true,false,
      'website-terms-2026-09-10');
    raise exception 'Another student accepted the terms';
  exception when raise_exception then
    if sqlerrm='Another student accepted the terms' then raise; end if;
  end;
end $$;
reset role;

do $$ begin
  assert not has_function_privilege('authenticated',
    'public.app_purchase_package_with_terms(uuid,uuid,text,text,text,jsonb,jsonb,integer,boolean,boolean,text)','execute');
end $$;
