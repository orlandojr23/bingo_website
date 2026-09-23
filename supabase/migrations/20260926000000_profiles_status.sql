-- Add status column to profiles
--
-- WHY: The admin dashboard allows deactivating drivers by setting their status to 'Suspended'.
-- Without this column, the update fails with a schema cache error.
--
-- HOW TO APPLY: open your Supabase project -> SQL Editor -> paste this file -> Run.

alter table public.profiles
  add column if not exists status text default 'Active';
