begin;

grant insert on table public.student_profiles to authenticated;

drop policy if exists "Users can create their own student profile" on public.student_profiles;
create policy "Users can create their own student profile"
on public.student_profiles
for insert
to authenticated
with check ((select auth.uid()) = id);

commit;
