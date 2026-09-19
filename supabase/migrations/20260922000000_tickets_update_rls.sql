-- Diagnose + fix: EVERY ticket status change fails
-- ("Error updating ticket", admin sees "Failed to update status"),
-- while filing and viewing reports keeps working.
--
-- WHY: INSERT and SELECT on `tickets` are allowed, but no policy permits
-- UPDATE (or the UPDATE policy restricts to the report's owner, which locks
-- out admins changing other people's reports). Each command needs its own
-- policy in Postgres RLS.
--
-- HOW TO USE:
--   1. Supabase project → SQL Editor → run STEP 1 to diagnose.
--   2. Only if STEP 1 shows no permissive UPDATE policy for authenticated
--      users, run STEP 2.
--   3. Re-test: mark any report Cleaned Up → admin should see
--      "Marked Cleaned Up — resident notified."

-- ============ STEP 1: diagnose (read-only, always safe) ============
select policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public' and tablename = 'tickets'
order by cmd, policyname;

-- ============ STEP 2: fix (run ONLY if STEP 1 shows the gap) ============
-- Allows any signed-in user to update tickets. Needed by:
--   * admins/dispatch changing report status from Tickets, Dashboard, Live Map
--   * residents editing their own reports from the app
-- This matches the app's existing posture (all writes go directly from
-- clients). Permissive policies combine with OR, so this only ADDS access.
create policy "tickets_authenticated_update"
  on public.tickets
  for update
  to authenticated
  using (true)
  with check (true);
