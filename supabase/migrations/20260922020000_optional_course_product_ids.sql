begin;

-- Course identity and credits are local. Preserve optional historical Stripe IDs.
alter table public.app_payment_items drop constraint app_course_item_shape;
alter table public.app_payment_items add constraint app_course_item_shape check (
  (course_key is null and stripe_product_id is null and credit_count is null and lesson_duration_minutes is null)
  or (course_key is not null
    and (stripe_product_id is null or stripe_product_id ~ '^prod_[A-Za-z0-9]+$')
    and credit_count between 1 and 100 and credit_count is not null
    and lesson_duration_minutes = case when course_key='solo30' then 30 else 60 end
    and lesson_duration_minutes is not null));

create or replace function public.app_issue_course_bill(
 p_owner uuid,p_id uuid,p_actor text,p_items jsonb,p_total integer,p_account text,p_live boolean,
 p_due date default null,p_replaces uuid default null
) returns uuid language plpgsql security definer set search_path='' as $$
declare b public.app_payments%rowtype; i jsonb; saved jsonb; pos integer:=0;
begin
  if p_actor is null or btrim(p_actor)='' or p_total is null or p_total not between 50 and 10000000
     or p_account is null or p_account !~ '^acct_[A-Za-z0-9]+$' or p_live is null
     or jsonb_typeof(p_items) is distinct from 'array' then raise exception 'Invalid course bill'; end if;
  if jsonb_array_length(p_items) not between 1 and 4 then raise exception 'Choose one to four courses'; end if;
  if (select count(distinct value->>'course_key') from jsonb_array_elements(p_items))<>jsonb_array_length(p_items)
    then raise exception 'Duplicate courses'; end if;
  for i in select value from jsonb_array_elements(p_items) loop
    if i->>'course_key' is null or i->>'course_key' not in ('group','duet','solo30','solo60')
      or (i->>'stripe_product_id' is not null and i->>'stripe_product_id' !~ '^prod_[A-Za-z0-9]+$')
      or coalesce(i->>'credit_count','') !~ '^[0-9]+$' or (i->>'credit_count')::int not between 1 and 100
      or coalesce(i->>'lesson_duration_minutes','') !~ '^[0-9]+$'
      or (i->>'lesson_duration_minutes')::int<>(case when i->>'course_key'='solo30' then 30 else 60 end)
      or coalesce(i->>'quantity','')<>'1' or i->>'unit_amount_cents' is not null
      or length(btrim(coalesce(i->>'description',''))) not between 1 and 200
      then raise exception 'Invalid included course'; end if;
  end loop;
  -- Normalize omitted legacy metadata for stable missing/null retries.
  select jsonb_agg(value || jsonb_build_object('stripe_product_id',value->'stripe_product_id') order by ordinality)
    into p_items from jsonb_array_elements(p_items) with ordinality;
  perform pg_advisory_xact_lock(hashtextextended(p_id::text,0));
  select * into b from public.app_payments where id=p_id for update;
  if found then
    select jsonb_agg(jsonb_build_object('course_key',course_key,'description',description,
      'stripe_product_id',stripe_product_id,'credit_count',credit_count,'lesson_duration_minutes',lesson_duration_minutes,
      'quantity',quantity,'unit_amount_cents',unit_amount_cents) order by position)
      into saved from public.app_payment_items where payment_id=p_id;
    if b.user_profile_id is distinct from p_owner or b.amount_cents is distinct from p_total
      or b.pricing_mode<>'agreed_total' or saved is distinct from p_items
      or b.due_date is distinct from p_due or b.replaces_payment_id is distinct from p_replaces
      or b.stripe_account_id is distinct from p_account or b.stripe_livemode is distinct from p_live
      then raise exception 'Bill reference conflict'; end if;
    return b.id;
  end if;
  if p_replaces is not null and not exists(select 1 from public.app_payments where id=p_replaces and user_profile_id=p_owner)
    then raise exception 'Replacement belongs to another account'; end if;
  insert into public.app_payments(id,user_profile_id,bill_number,amount_cents,currency,status,
    paid_amount_cents,due_date,replaces_payment_id,pricing_mode,stripe_account_id,stripe_livemode,audit_history)
    values(p_id,p_owner,'ADA-'||upper(replace(p_id::text,'-','')),p_total,'usd','payment_due',0,p_due,p_replaces,
      'agreed_total',p_account,p_live,jsonb_build_array(jsonb_build_object('operation','issue_courses','actor',p_actor,'at',now())));
  for i in select value from jsonb_array_elements(p_items) loop
    pos:=pos+1;
    insert into public.app_payment_items(payment_id,position,description,quantity,unit_amount_cents,
      course_key,stripe_product_id,credit_count,lesson_duration_minutes)
      values(p_id,pos,i->>'description',1,null,i->>'course_key',i->>'stripe_product_id',
        (i->>'credit_count')::int,(i->>'lesson_duration_minutes')::int);
  end loop;
  return p_id;
end $$;

create or replace function public.app_link_cal_course_credit(p_owner uuid,p_bill uuid,p_course text,p_product text default null)
returns void language plpgsql security definer set search_path='' as $$
declare b public.app_payments%rowtype; i public.app_payment_items%rowtype;
 s public.app_schedule_entries%rowtype; expected_slug text;
begin
 select * into b from public.app_payments where id=p_bill and user_profile_id=p_owner for update;
 if not found or b.status<>'paid' or b.payment_channel<>'stripe' or b.cal_booking_id is null then return; end if;
 expected_slug:=case p_course when 'group' then 'level-class' when 'duet' then 'duet-class'
   when 'solo30' then 'solo-class-30min' when 'solo60' then 'solo-class' end;
 if expected_slug is null or (p_product is not null and p_product !~ '^prod_[A-Za-z0-9]+$') then raise exception 'Invalid course'; end if;
 perform pg_advisory_xact_lock(hashtextextended(p_owner::text,1));
 if (select count(*) from public.app_payment_items where payment_id=p_bill)<>1 then return; end if;
 if (select count(*) from public.app_schedule_entries where cal_booking_id=b.cal_booking_id
   and user_profile_id=p_owner and source='cal_com' and match_status='linked')<>1 then return; end if;
 select * into i from public.app_payment_items where payment_id=p_bill for update;
 select * into s from public.app_schedule_entries where cal_booking_id=b.cal_booking_id
   and user_profile_id=p_owner and source='cal_com' and match_status='linked' for update;
 if s.cal_event_type_slug is distinct from expected_slug then return; end if;
 if i.credit_count is not null then
   if i.course_key is distinct from p_course or s.payment_item_id is distinct from i.id
     then raise exception 'Booking credit needs review'; end if;
   return;
 end if;
 if s.payment_item_id is not null or (s.payment_id is not null and s.payment_id<>b.id) then raise exception 'Booking already assigned'; end if;
 update public.app_payment_items set course_key=p_course,stripe_product_id=p_product,credit_count=1,
   lesson_duration_minutes=case when p_course='solo30' then 30 else 60 end where id=i.id;
 update public.app_schedule_entries set payment_id=b.id,payment_item_id=i.id,
   staff_audit=staff_audit||jsonb_build_array(jsonb_build_object('operation','link_paid_cal_booking','at',now())) where id=s.id;
end $$;
revoke all on function public.app_link_cal_course_credit(uuid,uuid,text,text) from public,anon,authenticated;
grant execute on function public.app_link_cal_course_credit(uuid,uuid,text,text) to service_role;

notify pgrst,'reload schema';
commit;
