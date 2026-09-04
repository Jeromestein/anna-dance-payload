begin;

do $$
begin
  if to_regclass('public.user_profiles') is null then
    return;
  end if;

  if to_regclass('public.app_user_profiles') is null then
    raise exception 'Cannot remove user_profiles before app_user_profiles exists';
  end if;

  if exists (
    select legacy.id
    from public.user_profiles as legacy
    left join public.app_user_profiles as replacement on replacement.id = legacy.id
    where replacement.id is null
  ) then
    raise exception 'Cannot remove user_profiles while legacy accounts are missing from app_user_profiles';
  end if;
end;
$$;

-- Do not use CASCADE. An unexpected dependency must stop this migration so it
-- can be reviewed explicitly instead of being removed with the legacy table.
drop table if exists public.user_profiles;

commit;
