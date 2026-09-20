-- Add a queryable phone column to profiles + let users update their own.
--
-- WHY: resident/driver phone numbers currently live only in Supabase Auth
-- `user_metadata` (private to each user). Admins and dispatch cannot see or
-- query them. This column is the shared copy; `user_metadata.phone` remains
-- the source of truth for self-service display, and the app heals the column
-- from metadata on login (see src/app/report/page.jsx session load).
--
-- HOW TO APPLY: open your Supabase project → SQL Editor → paste this file →
-- Run. (Same manual step as the other files in this folder.)
-- The app degrades gracefully until you run it: reads fall back to metadata
-- and column writes are best-effort.

alter table public.profiles
  add column if not exists phone text;

-- Self-service update: a signed-in user may update ONLY their own row.
-- Guarded so this file is safe to run whether RLS is on or off and whether
-- the policy already exists (avoids the silent-update failures seen when a
-- needed policy is simply missing).
do $$
begin
  if exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'profiles'
      and c.relrowsecurity
  ) and not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'profiles_authenticated_update_own'
  ) then
    create policy "profiles_authenticated_update_own"
      on public.profiles for update
      to authenticated
      using (auth.uid() = id)
      with check (auth.uid() = id);
  end if;
end $$;
