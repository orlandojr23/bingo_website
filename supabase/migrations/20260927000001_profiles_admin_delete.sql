-- Allow authenticated users (admins) to delete profile rows
-- This is necessary to hard-delete drivers from the Roster.

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'profiles_authenticated_delete'
  ) then
    create policy "profiles_authenticated_delete"
      on public.profiles for delete
      to authenticated
      using (true);
  end if;
end $$;
