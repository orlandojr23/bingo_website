# Offline Resilience (Supabase Outage Plan)

The app depends on Supabase for everything (auth, tickets, schedules, live
GPS, notifications). This feature keeps the app usable through short
Supabase outages or dead mobile data: screens show the last saved data
instead of going blank, and resident reports + driver GPS fixes are queued
on-device and sent automatically when connectivity returns.

It does NOT protect against data loss on Supabase's side (deleted rows,
failed project). For that you still need Supabase backups / PITR.

## User-visible behavior

- **Offline or backend error:** a dark pill banner appears at the top:
  "You're offline — showing last saved data" (no connection) or
  "Connection issue — showing last saved data" (backend reachable but
  failing). If writes are queued it adds "N changes waiting to send."
- **Report submitted offline (resident):** toast says "Report saved on this
  device. It will send automatically when you're back online." The normal
  confirmation screen still shows.
- **Driver GPS offline:** nothing changes on screen — the local marker keeps
  moving and fixes queue silently (one row per truck, see below).
- **Recovery:** queued items sync on their own; a green "Back online — all
  changes synced" pill confirms, then disappears after 3 seconds.

## How it works

Three layers, client-side only, no new dependencies.

### 1. Stale cache (`src/lib/live-route.js`, `src/lib/tickets.js`)

Every confirmed snapshot is persisted to localStorage and reloaded on first
paint, so cold starts render real data instantly:

| Store | Key | Version guard |
|---|---|---|
| Routes, trucks, schedules | `bingo-live-route-v1` | `STORE_VERSION` (stale versions ignored) |
| Tickets | `bingo-tickets-v1` | `{ v: 1 }` shape check |

Rules enforced in code:

- A failed sync NEVER wipes the store. `reinitSupabaseSync` used to clear
  everything before checking the result (blank dispatch/live-map on any
  blip); now clear-and-replace runs only on success, failures return
  `{ ok: false }` and keep the old cache flagged stale. RLS denials are
  treated the same as network failures here.
- First loads retry 3× with exponential backoff (`withDbRetry`). Realtime
  refetches never retry (would retry-storm on every notification), and
  failed first ticket loads are throttled to one attempt per 10s so an
  outage can't refetch on every render.
- Recovery re-syncs automatically: on browser `online` events, plus a 30s
  poll that runs only while flagged stale (covers "backend down, wifi
  fine", which fires no `online` event). Success clears the flag and idles
  the poll.

### 2. Write outbox (`src/lib/outbox.js`)

Failed writes caused by network-class errors are appended to a
localStorage-persisted FIFO queue (`bingo-outbox-v1`, cap 500 entries) and
replayed in order when connectivity returns (online event, 15s ticker, and
after every successful sync). Queue survives reloads.

- **What counts as "network error"** (`isNetworkError` in
  `src/lib/db-health.js`): the request never completed (offline, DNS,
  timeout, reset). Backend "no"s — RLS denials, validation, missing
  columns — always carry `code`/`status` and are NEVER queued or retried;
  they throw to the caller immediately.
- **Op kinds (executor registry):** the outbox core imports nothing; each
  owning lib registers its own replay function, so there are no import
  cycles:
  - `telemetry` (live-route): latest GPS fix per truck. Coalesced by
    `telemetry:<truckId>` — an offline hour buffers ONE row per truck, and
    an entry replaced while waiting its turn is skipped silently.
    Mid-flight sends can't be recalled, but order is preserved so the
    newest fix always lands last.
  - `ticket-insert` (tickets): full report row + slim ticket copy (photo
    stripped from the queued copy only; the row keeps `image_url`).
    Each report gets a client-generated UUID; replay checks existence
    first, so a lost response can never file a duplicate. The admin
    notification reuses its `dedupeKey` for the same reason.
- **Failure handling:** a network failure stops the pass (entries behind
  it would fail identically); each entry backs off exponentially (max
  30s). Logic errors retire after 10 attempts so one poisoned op can't
  wedge the queue. Entries arriving mid-flush trigger a bounded re-scan
  (max 5 passes) instead of waiting for the next tick.
- **Deliberately NOT queued:** notifications (replay would double-deliver)
  and schedule/admin mutations (multi-step flows with side effects).
  Those fail loudly via existing error toasts.
- **Storage limit:** localStorage is ~5MB. If persisting fails (e.g. many
  queued photo reports), entries stay memory-only for the session and are
  still retried — they just won't survive a reload. A warning is logged.

### 3. Health + status UI (`src/lib/db-health.js`, banner)

`db-health.js` is the single source of truth both libs report to
(`recordDbSuccess` / `recordDbFailure`) and the banner subscribes to
(`useDbStatus()`). It also listens to browser online/offline events.
`DbStatusBanner` (`src/components/pwa/DbStatusBanner.jsx`, fixed top,
`z-[95]`, `aria-live="polite"`) renders nothing while healthy and is
mounted in the admin layout (all admin pages), driver page, and report
page. `useOutboxCount()` drives the pending counter.

## Adding a new queued operation

1. In the owning lib, on catch: `if (isNetworkError(err)) enqueueOp(kind,
   payload, { key })` (omit `key`, or pass `null`, for non-coalesced ops).
2. In the same lib, register the replay:
   `registerExecutor(kind, async (payload) => { /* same call the online
   path makes; throw on error */ })`.
3. Make the replay idempotent (client-generated id + existence check, or
   a natural dedupe key). Never queue an op whose replay could
   double-apply a side effect — see why notifications are excluded above.

## Limits and non-goals

- **Continuity, not backup.** Survives minutes-to-hours of outage. It does
  not recover data lost on Supabase's side — enable Supabase backups/PITR
  separately and keep `supabase/migrations/` as the schema source of truth.
- **Auth is still a hard dependency.** If Supabase Auth is down, no new
  logins; existing sessions limp along on the cached session only.
- **Map tiles are independent.** OSM tiles keep rendering with zero pins
  or trucks when the backend is unreachable.
- **No test harness in this repo**, so coverage is: `npx eslint` on all
  touched files (new modules clean), plus a throwaway 21-check node probe
  of queue ordering, coalescing, persistence, backoff, error
  classification, and retry (passed, then deleted). Re-run
  `npx eslint src/lib/db-health.js src/lib/outbox.js src/lib/live-route.js
  src/lib/tickets.js src/components/pwa/DbStatusBanner.jsx` after edits.

## Files changed

- New: `src/lib/db-health.js`, `src/lib/outbox.js`,
  `src/components/pwa/DbStatusBanner.jsx`, this doc.
- Edited: `src/lib/live-route.js` (persist/hydrate, sync rewrite,
  telemetry queue + executor, recovery poll), `src/lib/tickets.js`
  (persist/hydrate, fetch rewrite, idempotent insert + queue, extracted
  `sendTicketAdminNotification`, executor), `src/app/report/page.jsx`
  (queued-report toast branch), `src/app/(admin)/layout.jsx`,
  `src/app/driver/page.jsx` (banner mounts).
