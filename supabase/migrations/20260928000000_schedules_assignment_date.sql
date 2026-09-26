-- Feature: admin assigns a task for a specific day (today, tomorrow, ...).
--
-- HOW TO APPLY: Supabase project -> SQL Editor -> paste this file -> Run.

ALTER TABLE public.schedules ADD COLUMN IF NOT EXISTS scheduled_date DATE;
