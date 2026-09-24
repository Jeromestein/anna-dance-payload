begin;
set local lock_timeout = '3s';

-- NULL details preserve existing and OAuth-created accounts until profile completion.
alter table public.app_user_profiles
  add column date_of_birth date,
  add column address_line1 text,
  add column address_line2 text,
  add column city text,
  add column state text,
  add column postal_code text,
  add column health_notes text,
  add constraint student_birth_date_valid check (
    date_of_birth is null or date_of_birth between date '1900-01-01'
      and (current_timestamp at time zone 'America/Los_Angeles')::date
  ),
  add constraint student_address_line1_valid check (address_line1 is null or char_length(btrim(address_line1)) between 1 and 200),
  add constraint student_address_line2_valid check (address_line2 is null or char_length(btrim(address_line2)) between 1 and 200),
  add constraint student_city_valid check (city is null or char_length(btrim(city)) between 1 and 100),
  add constraint student_state_valid check (state is null or char_length(btrim(state)) between 1 and 100),
  add constraint student_postal_code_valid check (postal_code is null or char_length(btrim(postal_code)) between 1 and 20),
  add constraint student_health_notes_valid check (health_notes is null or (char_length(health_notes) <= 2000 and health_notes ~ '[^[:space:]]')),
  add constraint student_details_complete_together check (
    (date_of_birth is null and address_line1 is null and address_line2 is null and city is null and state is null and postal_code is null and health_notes is null)
    or
    (date_of_birth is not null and address_line1 is not null and city is not null and state is not null and postal_code is not null and health_notes is not null
      and phone is not null and phone ~ '^[0-9[:space:]()+.\-]+$'
      and char_length(regexp_replace(phone, '[^0-9]', '', 'g')) between 7 and 15)
  );

alter table public.app_user_profiles add column profile_complete boolean
  generated always as (date_of_birth is not null and address_line1 is not null
    and city is not null and state is not null and postal_code is not null
    and health_notes is not null and phone is not null) stored;

-- Keep the existing owner-only RLS policies and administrator access boundary.
grant update (date_of_birth, address_line1, address_line2, city, state, postal_code, health_notes)
  on public.app_user_profiles to authenticated;

comment on column public.app_user_profiles.health_notes is
  'Required on completed profiles. Family-provided allergies and relevant health conditions; N/A if none. Never prefilled.';
comment on column public.app_user_profiles.profile_complete is
  'False for legacy/OAuth profiles awaiting required enrollment details. Derived, never client writable.';
notify pgrst, 'reload schema';
commit;
