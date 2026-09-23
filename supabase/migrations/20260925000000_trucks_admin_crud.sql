-- Fix: adding a truck fails with 403 Forbidden on POST /rest/v1/trucks.
--
-- SYMPTOM: admin fills the Add Truck form in Dispatch and sees the insert
-- fail (403). Reading the fleet works, so a SELECT policy exists, but no
-- policy permits INSERT (and possibly UPDATE/DELETE) for the admin's
-- authenticated client.
--
-- HOW TO APPLY: Supabase project → SQL Editor → paste this file → Run.
-- Idempotent: safe to run more than once.
--
-- This matches the app's existing posture (tickets, notifications, profiles):
-- writes go directly from authenticated clients. Permissive policies combine
-- with OR, so this only ADDS access.

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'trucks'
      and policyname = 'trucks_authenticated_select'
  ) then
    create policy "trucks_authenticated_select"
      on public.trucks for select
      to authenticated
      using (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'trucks'
      and policyname = 'trucks_authenticated_insert'
  ) then
    create policy "trucks_authenticated_insert"
      on public.trucks for insert
      to authenticated
      with check (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'trucks'
      and policyname = 'trucks_authenticated_update'
  ) then
    create policy "trucks_authenticated_update"
      on public.trucks for update
      to authenticated
      using (true)
      with check (true);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'trucks'
      and policyname = 'trucks_authenticated_delete'
  ) then
    create policy "trucks_authenticated_delete"
      on public.trucks for delete
      to authenticated
      using (true);
  end if;
end $$;
