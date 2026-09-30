// Persistent mutation outbox for the Supabase outage plan.
//
// When a write fails with a network-class error (see isNetworkError in
// db-health.js), callers enqueue the mutation here instead of dropping it.
// Entries survive reloads via localStorage and are replayed in FIFO order
// when connectivity returns. Executors are registered by the owning lib
// (live-route registers "telemetry", tickets registers "ticket-insert") so
// this core module imports nothing and cannot create an import cycle.
//
// Deliberately NOT queued: notifications (dedupe-by-key side effects that
// would double-deliver on replay) and logic errors (RLS/validation — the
// backend answered "no", retrying is pointless).

import { useSyncExternalStore } from "react";

const OUTBOX_KEY = "bingo-outbox-v1";
const MAX_ENTRIES = 500;
const MAX_ATTEMPTS = 10;
const FLUSH_INTERVAL_MS = 15000;

const listeners = new Set();
const executors = new Map();

let queue = [];
let flushing = false;
let timerStarted = false;
// Set when entries arrive while a flush is running, so the flush re-scans
// instead of leaving the burst for the next tick.
let grewDuringFlush = false;

function notify() {
  for (const listener of listeners) listener();
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(OUTBOX_KEY, JSON.stringify(queue));
  } catch (err) {
    // Quota exceeded (e.g. queued photo reports): the entry stays
    // memory-only for this session and is still retried — it just won't
    // survive a reload. Never throw from the outbox itself.
    console.warn("[outbox] Could not persist queue (quota?):", err?.message || err);
  }
  notify();
}

function load() {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(OUTBOX_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (Array.isArray(parsed)) {
      queue = parsed.filter((e) => e && e.id && e.kind && e.payload !== undefined);
    }
  } catch {
    queue = [];
  }
}

if (typeof window !== "undefined") {
  load();
}

/** Register the async executor for an op kind: (payload) => Promise. */
export function registerExecutor(kind, fn) {
  executors.set(kind, fn);
}

/**
 * Enqueue a mutation. When `key` is given, any pending entry with the same
 * kind+key is replaced — used for GPS telemetry where only the latest fix
 * per truck matters, so an offline hour buffers ONE row per truck instead
 * of thousands.
 */
export function enqueueOp(kind, payload, { key = null } = {}) {
  const entry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    kind,
    key,
    payload,
    createdAt: Date.now(),
    attempts: 0,
    nextTryAt: 0,
  };
  if (key != null) {
    // Mark first: a flush may already hold the old entry in its snapshot
    // and would otherwise send the stale payload when its turn comes.
    for (const e of queue) {
      if (e.kind === kind && e.key === key) e.superseded = true;
    }
    queue = queue.filter((e) => !(e.kind === kind && e.key === key));
  }
  queue.push(entry);
  if (flushing) grewDuringFlush = true;
  while (queue.length > MAX_ENTRIES) queue.shift();
  persist();
  ensureTicker();
  flushOutbox();
  return entry.id;
}

/** Number of mutations waiting to sync (for the status banner). */
export function getOutboxCount() {
  return queue.length;
}

/** React hook — re-renders whenever the queued count changes. */
export function useOutboxCount() {
  return useSyncExternalStore(subscribe, getOutboxCount, getOutboxCount);
}

function backoffMs(attempts) {
  return Math.min(30000, 1000 * 2 ** Math.min(attempts, 5));
}

/**
 * Replay pending entries in FIFO order. Stops at the first network-class
 * failure (everything behind it would fail the same way); logic errors
 * retire that entry after MAX_ATTEMPTS so one poisoned op can't wedge the
 * queue forever. Re-scans when entries arrive mid-flush so a burst (e.g.
 * GPS fixes queued while a slow replay is running) drains in one go.
 */
export async function flushOutbox() {
  if (flushing || typeof window === "undefined") return;
  if (typeof navigator !== "undefined" && navigator.onLine === false) return;
  flushing = true;
  try {
    for (let pass = 0; pass < 5; pass += 1) {
      const now = Date.now();
      let stoppedOnNet = false;
      for (const entry of [...queue]) {
        if (entry.nextTryAt && entry.nextTryAt > now) continue;
        if (entry.superseded) {
          // Replaced by a newer op while waiting its turn — drop silently.
          queue = queue.filter((e) => e.id !== entry.id);
          persist();
          continue;
        }
        const run = executors.get(entry.kind);
        if (!run) {
          // No owner registered (yet) — leave it queued, not dropped.
          continue;
        }
        try {
          await run(entry.payload);
          queue = queue.filter((e) => e.id !== entry.id);
          persist();
        } catch (err) {
          const net =
            !err?.code && !err?.status && !err?.statusCode;
          entry.attempts += 1;
          if (!net && entry.attempts >= MAX_ATTEMPTS) {
            console.warn(
              `[outbox] Dropping ${entry.kind} op after ${MAX_ATTEMPTS} failed attempts:`,
              err?.message || err
            );
            queue = queue.filter((e) => e.id !== entry.id);
            persist();
            continue;
          }
          entry.nextTryAt = Date.now() + backoffMs(entry.attempts);
          persist();
          if (net) {
            stoppedOnNet = true;
            grewDuringFlush = false;
            break;
          }
        }
      }
      if (!grewDuringFlush || stoppedOnNet) {
        grewDuringFlush = false;
        break;
      }
      grewDuringFlush = false;
    }
  } finally {
    flushing = false;
  }
}

function ensureTicker() {
  if (typeof window === "undefined" || timerStarted) return;
  timerStarted = true;
  window.addEventListener("online", () => flushOutbox());
  window.setInterval(() => flushOutbox(), FLUSH_INTERVAL_MS);
}

// Start the online-listener + retry ticker at load so entries restored
// from a previous session drain without needing a fresh enqueue first.
ensureTicker();
