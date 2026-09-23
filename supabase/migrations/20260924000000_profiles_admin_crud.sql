-- Fix: driver added by admin appears in Auth users but never shows in Drivers list.
--
-- SYMPTOM: admin creates a driver, the user shows up under
-- Authentication > Users, but the Drivers page (and driver login) never sees
-- them. The browser console shows "Upsert error: new row violates
-- row-level security policy" for `profiles`, or no profile row exists at all
-- because it is only written after the OTP step.
--
-- WHY: `src/lib/staff.js:fetchStaffRoster` reads ONLY `public.profiles`
-- rows with `role = 'driver'`. The admin create flow writes Auth first and
-- `profiles` later, and the `profiles` INSERT/SELECT/UPDATE had no policy
-- for the admin's authenticated client (only `profiles_authenticated_update_own`
-- existed), so the write was silently rejected and the next fetch wiped the
-- optimistic row.
--
-- HOW TO APPLY: Supabase project → SQL Editor → paste this file → Run.
-- Idempotent: safe to run more than once. After running, create a NEW driver
-- to verify (old Auth-only users still need a `profiles` row — re-save them
-- from the Drivers page or insert the missing row manually).
--
-- This matches the app's existing posture (tickets, notifications): writes go
-- directly from authenticated clients. Permissive policies combine with OR,
-- so this only ADDS access.

-- Admin/drivers list must be readable by any signed-in user (admin reads the
-- roster, drivers read their own profile on login).
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'profiles_authenticated_select'
  ) then
    create policy "profiles_authenticated_select"
      on public.profiles for select
      to authenticated
      using (true);
  end if;
end $$;

-- Admin creates the driver's profile row right after signUp.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'profiles_authenticated_insert'
  ) then
    create policy "profiles_authenticated_insert"
      on public.profiles for insert
      to authenticated
      with check (true);
  end if;
end $$;

-- Admin edits driver name/email/status and soft-deletes (role -> 'inactive')
-- on rows owned by OTHER users, which `..._update_own` (auth.uid() = id)
-- blocks. Allow signed-in users to update profile rows.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'profiles_authenticated_update'
  ) then
    create policy "profiles_authenticated_update"
      on public.profiles for update
      to authenticated
      using (true)
      with check (true);
  end if;
end $$;
