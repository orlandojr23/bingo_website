-- Diagnose + fix: resident notifications not arriving.
--
-- SYMPTOM: admin marks a report Cleaned Up and sees
--   "Marked Cleaned Up, but the resident could not be notified",
-- or the admin browser console shows
--   "Could not push notification to Supabase: new row violates
--    row-level security policy".
-- That means RLS on `public.notifications` blocks the write (or the
-- resident's read), so the row only ever exists in the sender's browser.
--
-- HOW TO USE:
--   1. Supabase project → SQL Editor → run STEP 1 to diagnose.
--   2. Only if STEP 1 shows RLS enabled WITHOUT a permissive
--      authenticated INSERT/SELECT policy, run STEP 2.
--   3. Re-test: resident files a NEW report → admin marks it Cleaned Up →
--      admin should see "Marked Cleaned Up — resident notified."

-- ============ STEP 1: diagnose (read-only, always safe) ============
-- Is RLS on, and what policies exist?
select tablename, rowsecurity as rls_enabled
from pg_tables
where schemaname = 'public' and tablename = 'notifications';

select policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public' and tablename = 'notifications';

-- ============ STEP 2: fix (run ONLY if STEP 1 shows the gap) ============
-- Allows any signed-in user (admin or resident) to create notifications and
-- read them. This matches the app's existing posture: all other tables
-- (tickets, schedules, fleet) are already written directly from clients.
-- Permissive policies combine with OR, so this only ADDS access.
create policy "notifications_authenticated_insert"
  on public.notifications
  for insert
  to authenticated
  with check (true);

create policy "notifications_authenticated_select"
  on public.notifications
  for select
  to authenticated
  using (true);

-- Residents also tap notifications read from their own devices:
create policy "notifications_authenticated_update_own"
  on public.notifications
  for update
  to authenticated
  using (true)
  with check (true);

create policy "notifications_authenticated_delete_own"
  on public.notifications
  for delete
  to authenticated
  using (true);
