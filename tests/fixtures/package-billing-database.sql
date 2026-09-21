-- Run only in a fresh disposable database, never against production.
\set ON_ERROR_STOP on
\ir stripe-billing-database.sql
\ir ../../supabase/migrations/20260917200000_issue_package_bills.sql

do $$
declare
  owner_id uuid := '00000000-0000-4000-8000-000000000001';
  other_id uuid := '00000000-0000-4000-8000-000000000002';
  bill_id uuid := '40000000-0000-4000-8000-000000004001';
  items jsonb := '[{"description":"Ballet (10 lessons)","quantity":10,"unit_amount_cents":3000}]';
  b jsonb;
begin
  perform public.app_issue_bill(owner_id,bill_id,'staff',items,p_test_account=>'acct_package');
  perform public.app_issue_bill(owner_id,bill_id,'staff',items,p_test_account=>'acct_package');
  assert (select count(*)=1 from public.app_payment_items where payment_id=bill_id),'No duplicate items';
  assert (select amount_cents=30000 and stripe_livemode=false and status='payment_due' from public.app_payments where id=bill_id),'Correct sandbox total';
  begin
    perform public.app_issue_bill(other_id,bill_id,'staff',items,p_test_account=>'acct_package');
    raise exception 'Wrong owner accepted';
  exception when raise_exception then if sqlerrm='Wrong owner accepted' then raise; end if; end;
  begin
    perform public.app_issue_bill(owner_id,bill_id,'staff',items||'{"description":"extra","quantity":1,"unit_amount_cents":500}'::jsonb,p_test_account=>'acct_package');
    raise exception 'Changed items accepted';
  exception when raise_exception then if sqlerrm='Changed items accepted' then raise; end if; end;
  begin
    perform public.app_issue_bill(owner_id,bill_id,'staff',items);
    raise exception 'Test bill relabeled as live';
  exception when raise_exception then if sqlerrm='Test bill relabeled as live' then raise; end if; end;
  b:=public.app_stripe_bill('reserve_checkout',owner_id,bill_id,'{"account":"acct_package","livemode":false}');
  perform public.app_stripe_bill('sync',owner_id,bill_id,jsonb_build_object('account','acct_package','livemode',false,
    'paymentIntent','pi_package','checkoutKey',b->>'stripe_checkout_key','amount',30000,'currency','usd',
    'paidAt',now(),'observedAt',now(),'refundState','none','refundedAmount',0));
  assert (select status='paid' from public.app_payments where id=bill_id);
  assert (select quantity=10 and unit_amount_cents=3000 and description='Ballet (10 lessons)' from public.app_payment_items where payment_id=bill_id),'Keep course details';
  begin
    perform public.app_stripe_bill('reserve_checkout',owner_id,bill_id,'{"account":"acct_package","livemode":false}');
    raise exception 'Paid bill can be collected again';
  exception when raise_exception then if sqlerrm='Paid bill can be collected again' then raise; end if; end;
  assert not has_function_privilege('authenticated','public.app_issue_bill(uuid,uuid,text,jsonb,date,uuid,text)','execute');
  assert not has_function_privilege('anon','public.app_issue_bill(uuid,uuid,text,jsonb,date,uuid,text)','execute');
end $$;
