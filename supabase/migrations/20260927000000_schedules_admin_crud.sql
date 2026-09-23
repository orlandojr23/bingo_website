-- Fix: adding/updating a schedule fails with 403 Forbidden.
--
-- HOW TO APPLY: Supabase project -> SQL Editor -> paste this file -> Run.

DROP POLICY IF EXISTS "schedules_authenticated_select" ON public.schedules;
CREATE POLICY "schedules_authenticated_select" ON public.schedules FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "schedules_authenticated_insert" ON public.schedules;
CREATE POLICY "schedules_authenticated_insert" ON public.schedules FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "schedules_authenticated_update" ON public.schedules;
CREATE POLICY "schedules_authenticated_update" ON public.schedules FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "schedules_authenticated_delete" ON public.schedules;
CREATE POLICY "schedules_authenticated_delete" ON public.schedules FOR DELETE TO authenticated USING (true);
