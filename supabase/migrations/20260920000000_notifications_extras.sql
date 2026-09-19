-- Optional detail columns for the `notifications` table.
--
-- HOW TO APPLY: open your Supabase project → SQL Editor → paste this file →
-- Run. It is idempotent (safe to run more than once).
--
-- WHY: the app pushes resident-report notifications with a location, a
-- deep-link action and the ticket id. The client code already sends these
-- fields and reads them back when present; without this migration they are
-- kept in-memory only (lost on reload), with it they persist and survive
-- realtime delivery to other devices. The ticket reference ALSO travels in
-- `dedupe_key` (`ticket:<id>`), so actions keep working either way.
--
-- NOTE on access: report submissions (resident clients) and status updates
-- (admin clients) both INSERT into this table, and residents SELECT rows
-- whose `audience` is their user id. If notifications don't arrive, verify
-- your Row Level Security policies allow:
--   * authenticated INSERT on `notifications`
--   * authenticated SELECT on `notifications` (scoped to own audience rows)

alter table public.notifications
  add column if not exists location text,
  add column if not exists action_url text,
  add column if not exists action_label text,
  add column if not exists ticket_id uuid references public.tickets (id) on delete set null;

create index if not exists notifications_audience_created_idx
  on public.notifications (audience, created_at desc);
