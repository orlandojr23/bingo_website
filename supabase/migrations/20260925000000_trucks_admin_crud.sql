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

DROP POLICY IF EXISTS "trucks_authenticated_select" ON public.trucks;
CREATE POLICY "trucks_authenticated_select" ON public.trucks FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "trucks_authenticated_insert" ON public.trucks;
CREATE POLICY "trucks_authenticated_insert" ON public.trucks FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "trucks_authenticated_update" ON public.trucks;
CREATE POLICY "trucks_authenticated_update" ON public.trucks FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "trucks_authenticated_delete" ON public.trucks;
CREATE POLICY "trucks_authenticated_delete" ON public.trucks FOR DELETE TO authenticated USING (true);
