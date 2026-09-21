begin;

alter table public.app_payments add column pricing_mode text not null default 'itemized'
  check (pricing_mode in ('itemized','agreed_total'));
grant select(pricing_mode) on public.app_payments to authenticated;
alter table public.app_payment_items
  alter column unit_amount_cents drop not null,
  add column course_key text check(course_key in ('group','duet','solo30','solo60')),
  add column stripe_product_id text,
  add column credit_count integer,
  add column lesson_duration_minutes integer,
  add constraint app_course_item_shape check (
    (course_key is null and stripe_product_id is null and credit_count is null and lesson_duration_minutes is null)
    or (course_key is not null and stripe_product_id ~ '^prod_[A-Za-z0-9]+$'
      and stripe_product_id is not null and credit_count between 1 and 100 and credit_count is not null
      and lesson_duration_minutes = case when course_key='solo30' then 30 else 60 end
      and lesson_duration_minutes is not null));

alter table public.app_schedule_entries
  add column payment_item_id uuid references public.app_payment_items(id) on delete restrict,
  add column revision integer not null default 0,
  add column staff_audit jsonb not null default '[]'::jsonb;
create index app_schedule_item_status_idx on public.app_schedule_entries(payment_item_id,status);
-- Staff audit is never part of the student-facing API.
revoke select on public.app_schedule_entries from authenticated;
grant select(id,user_profile_id,payment_id,payment_item_id,entry_type,title,starts_at,ends_at,
  timezone,location,status,source,created_at,updated_at,revision) on public.app_schedule_entries to authenticated;

create function public.app_validate_course_item() returns trigger
language plpgsql set search_path='' as $$
declare mode text;
begin
  select pricing_mode into mode from public.app_payments where id=new.payment_id;
  if mode='agreed_total' then
    if new.course_key is null or new.unit_amount_cents is not null or new.quantity<>1 then
      raise exception 'Agreed-total bills require unpriced course items';
    end if;
  elsif new.unit_amount_cents is null then
    raise exception 'Itemized bills require item amounts';
  end if;
  if tg_op='UPDATE' and old.course_key is not null and new is distinct from old then
    raise exception 'Issued course details are immutable';
  end if;
  return new;
end $$;
create trigger app_validate_course_item before insert or update on public.app_payment_items
for each row execute function public.app_validate_course_item();

create function public.app_issue_course_bill(
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
    or (select count(distinct value->>'stripe_product_id') from jsonb_array_elements(p_items))<>jsonb_array_length(p_items)
    then raise exception 'Duplicate courses'; end if;
  for i in select value from jsonb_array_elements(p_items) loop
    if i->>'course_key' is null or i->>'course_key' not in ('group','duet','solo30','solo60')
      or i->>'stripe_product_id' is null or i->>'stripe_product_id' !~ '^prod_[A-Za-z0-9]+$'
      or coalesce(i->>'credit_count','') !~ '^[0-9]+$' or (i->>'credit_count')::int not between 1 and 100
      or coalesce(i->>'lesson_duration_minutes','') !~ '^[0-9]+$'
      or (i->>'lesson_duration_minutes')::int<>(case when i->>'course_key'='solo30' then 30 else 60 end)
      or coalesce(i->>'quantity','')<>'1' or i->>'unit_amount_cents' is not null
      or length(btrim(coalesce(i->>'description',''))) not between 1 and 200
      then raise exception 'Invalid included course'; end if;
  end loop;
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

-- Derived balances include ALL history, independently of calendar pagination.
create function public.app_course_balances(p_owner uuid,p_test boolean default false)
returns table(item_id uuid,payment_id uuid,bill_number text,description text,course_key text,
  credit_count integer,lesson_duration_minutes integer,reserved bigint,completed bigint,available bigint,
  allocatable boolean,bill_status text)
language plpgsql stable security definer set search_path='' as $$
begin
  if current_setting('role',true)<>'service_role' and (auth.uid() is distinct from p_owner or p_test)
    then raise exception 'Not authorized'; end if;
  return query
  select i.id,b.id,b.bill_number,i.description,i.course_key,i.credit_count,i.lesson_duration_minutes,
    count(s.id) filter(where s.status in ('scheduled','changed')),
    count(s.id) filter(where s.status='completed'),
    i.credit_count-count(s.id) filter(where s.status in ('scheduled','changed','completed')),
    b.status='paid' and b.refund_state='none' and b.stripe_sync_error is null,
    b.status
  from public.app_payment_items i join public.app_payments b on b.id=i.payment_id
  left join public.app_schedule_entries s on s.payment_item_id=i.id
  where b.user_profile_id=p_owner and i.credit_count is not null
    and (case when p_test then b.stripe_livemode=false else b.stripe_livemode is distinct from false end)
  group by i.id,b.id;
end $$;

create function public.app_manage_course_schedule(p_owner uuid,p_item uuid,p_actor text,p_operation text,
 p_entries jsonb,p_test boolean default false)
returns void language plpgsql security definer set search_path='' as $$
declare b public.app_payments%rowtype; i public.app_payment_items%rowtype;
 s public.app_schedule_entries%rowtype; e jsonb; bill_id uuid; used integer;
 start_time timestamptz; end_time timestamptz; original jsonb; new_status text;
begin
  if nullif(btrim(p_actor),'') is null or p_operation is null or p_operation not in ('create','reschedule','cancel','complete')
    or jsonb_typeof(p_entries) is distinct from 'array' then raise exception 'Invalid schedule request'; end if;
  if jsonb_array_length(p_entries) not between 1 and 100 then raise exception 'Invalid lesson count'; end if;
  select payment_id into bill_id from public.app_payment_items where id=p_item;
  select * into b from public.app_payments where id=bill_id and user_profile_id=p_owner for update;
  if not found then raise exception 'Course purchase not found'; end if;
  -- Serialize allocations across different purchases for the same student's time conflicts.
  perform pg_advisory_xact_lock(hashtextextended(p_owner::text,1));
  select * into i from public.app_payment_items where id=p_item for update;
  if i.credit_count is null or (b.stripe_livemode is false) is distinct from p_test
    then raise exception 'Course environment mismatch'; end if;
  if p_operation<>'cancel' and (b.status<>'paid' or b.refund_state<>'none' or b.stripe_sync_error is not null)
    then raise exception 'Course payment needs verification before scheduling'; end if;
  for e in select value from jsonb_array_elements(p_entries) loop
    if e->>'id' is null then raise exception 'Missing lesson reference'; end if;
    select * into s from public.app_schedule_entries where id=(e->>'id')::uuid for update;
    if p_operation='create' then
      original:=jsonb_build_object('id',e->>'id','starts_at',e->>'starts_at','location',coalesce(e->>'location',''));
      if found then
        if s.payment_item_id is distinct from p_item or s.user_profile_id is distinct from p_owner
          or s.staff_audit->0->'request' is distinct from original
          or s.staff_audit->0->'batch' is distinct from p_entries then raise exception 'Lesson reference conflict'; end if;
        continue;
      end if;
    else
      if not found or s.payment_item_id is distinct from p_item or s.user_profile_id is distinct from p_owner
        or s.source<>'academy' then raise exception 'Lesson not found'; end if;
      if s.revision is distinct from (e->>'revision')::int then raise exception 'Lesson changed; refresh before editing'; end if;
      if s.status not in ('scheduled','changed') then raise exception 'This lesson is already resolved'; end if;
    end if;
    if p_operation in ('create','reschedule') then
      start_time:=(e->>'starts_at')::timestamptz;
      if start_time is null or start_time<=now() then raise exception 'Choose a future lesson time'; end if;
      end_time:=start_time+make_interval(mins=>i.lesson_duration_minutes);
      if length(coalesce(e->>'location',''))>200 then raise exception 'Location is too long'; end if;
      if exists(select 1 from public.app_schedule_entries x where x.user_profile_id=p_owner
        and x.id<>(e->>'id')::uuid and x.status in ('scheduled','changed')
        and x.starts_at<end_time and x.ends_at>start_time) then raise exception 'Student already has a lesson at this time'; end if;
      if p_operation='create' then
        select count(*) into used from public.app_schedule_entries where payment_item_id=p_item
          and status in ('scheduled','changed','completed');
        if used>=i.credit_count then raise exception 'No lesson credits available'; end if;
        insert into public.app_schedule_entries(id,user_profile_id,payment_id,payment_item_id,entry_type,
          title,starts_at,ends_at,timezone,location,status,source,match_status,staff_audit)
          values((e->>'id')::uuid,p_owner,b.id,i.id,case when i.course_key in ('solo30','solo60') then 'private_lesson' else 'class' end,
            i.description,start_time,end_time,'America/New_York',nullif(e->>'location',''),'scheduled','academy','linked',
            jsonb_build_array(jsonb_build_object('operation','create','actor',p_actor,'at',now(),'request',original,'batch',p_entries)));
        continue;
      end if;
      new_status:='changed';
    elsif p_operation='complete' then
      if s.ends_at>now() then raise exception 'A future lesson cannot be completed'; end if;
      new_status:='completed';start_time:=s.starts_at;end_time:=s.ends_at;
    else
      if nullif(btrim(e->>'reason'),'') is null then raise exception 'Enter a cancellation reason'; end if;
      new_status:='cancelled';start_time:=s.starts_at;end_time:=s.ends_at;
    end if;
    update public.app_schedule_entries set status=new_status,starts_at=start_time,ends_at=end_time,
      location=case when p_operation='reschedule' then nullif(e->>'location','') else location end,
      updated_at=now(),revision=revision+1,
      staff_audit=staff_audit||jsonb_build_array(jsonb_build_object('operation',p_operation,'actor',p_actor,'at',now(),
        'reason',left(e->>'reason',500),'previous_start',s.starts_at,'previous_status',s.status,'starts_at',start_time))
      where id=s.id;
  end loop;
end $$;

-- Provider and manual refunds share the same allocation cleanup in the financial transaction.
create function public.app_refund_course_allocations() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.status='refunded' and old.status is distinct from 'refunded' then
   update public.app_schedule_entries s set status='cancelled',updated_at=now(),revision=revision+1,
     staff_audit=staff_audit||jsonb_build_array(jsonb_build_object('operation','full_refund','at',now(),'payment_id',new.id))
   where s.payment_id=new.id and s.payment_item_id is not null and s.source='academy'
     and s.status in ('scheduled','changed') and s.starts_at>now();
 end if;
 return new;
end $$;
create trigger app_refund_course_allocations after update on public.app_payments
for each row execute function public.app_refund_course_allocations();

revoke all on function public.app_validate_course_item() from public,anon,authenticated;
revoke all on function public.app_refund_course_allocations() from public,anon,authenticated;
revoke all on function public.app_issue_course_bill(uuid,uuid,text,jsonb,integer,text,boolean,date,uuid) from public,anon,authenticated;
revoke all on function public.app_course_balances(uuid,boolean) from public,anon,authenticated;
revoke all on function public.app_manage_course_schedule(uuid,uuid,text,text,jsonb,boolean) from public,anon,authenticated;
grant execute on function public.app_issue_course_bill(uuid,uuid,text,jsonb,integer,text,boolean,date,uuid) to service_role;
grant execute on function public.app_course_balances(uuid,boolean) to service_role,authenticated;
grant execute on function public.app_manage_course_schedule(uuid,uuid,text,text,jsonb,boolean) to service_role;
-- A verified paid Cal.com booking is one purchased credit already allocated to that booking.
create function public.app_link_cal_course_credit(p_owner uuid,p_bill uuid,p_course text,p_product text)
returns void language plpgsql security definer set search_path='' as $$
declare b public.app_payments%rowtype; i public.app_payment_items%rowtype;
 s public.app_schedule_entries%rowtype; expected_slug text;
begin
 select * into b from public.app_payments where id=p_bill and user_profile_id=p_owner for update;
 if not found or b.status<>'paid' or b.payment_channel<>'stripe' or b.cal_booking_id is null then return; end if;
 expected_slug:=case p_course when 'group' then 'level-class' when 'duet' then 'duet-class'
   when 'solo30' then 'solo-class-30min' when 'solo60' then 'solo-class' end;
 if expected_slug is null or p_product is null or p_product !~ '^prod_[A-Za-z0-9]+$' then raise exception 'Invalid course'; end if;
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

-- Enforce owner/parent/quota on provider updates too, not only the Admin RPC.
create function public.app_validate_schedule_credit() returns trigger
language plpgsql security definer set search_path='' as $$
declare i public.app_payment_items%rowtype; b public.app_payments%rowtype; used integer;
begin
 if new.payment_item_id is null then
   if tg_op='UPDATE' and old.payment_item_id is not null then raise exception 'Cannot unlink course history'; end if;
   return new;
 end if;
 select * into i from public.app_payment_items where id=new.payment_item_id;
 select * into b from public.app_payments where id=i.payment_id for update;
 perform pg_advisory_xact_lock(hashtextextended(b.user_profile_id::text,1));
 if i.credit_count is null or new.payment_id is distinct from b.id or new.user_profile_id is distinct from b.user_profile_id
   then raise exception 'Course ownership mismatch'; end if;
 if tg_op='UPDATE' and old.payment_item_id is not null and new.payment_item_id is distinct from old.payment_item_id
   then raise exception 'Cannot reassign course history'; end if;
 if new.status in ('scheduled','changed','completed') then
   select count(*) into used from public.app_schedule_entries where payment_item_id=i.id and id<>new.id
     and status in ('scheduled','changed','completed');
   if used>=i.credit_count then raise exception 'No lesson credits available'; end if;
 end if;
 return new;
end $$;
create trigger app_validate_schedule_credit before insert or update on public.app_schedule_entries
for each row execute function public.app_validate_schedule_credit();
revoke all on function public.app_validate_schedule_credit() from public,anon,authenticated;

notify pgrst,'reload schema';
commit;
