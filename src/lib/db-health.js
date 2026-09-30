// Shared database-connectivity health for the Supabase outage plan.
//
// Single source of truth for "can we reach the backend right now?" Every
// data lib (live-route, tickets) reports its Supabase reads/writes here, and
// UI surfaces (DbStatusBanner) subscribe via useDbStatus(). This module
// imports nothing so it can never create an import cycle.

import { useSyncExternalStore } from "react";

const listeners = new Set();

const status = {
  // Browser-level signal (navigator.onLine + online/offline events).
  // Unreliable on its own — a captive portal reports "online" — so failed
  // Supabase calls also drive `reachable` below.
  browserOnline: typeof navigator === "undefined" ? true : navigator.onLine !== false,
  // True once any Supabase read/write has failed recently. Cleared on the
  // next confirmed success. While true, screens keep showing their last
  // saved snapshot instead of blanking out.
  stale: false,
  // Consecutive failed Supabase calls. Success resets to 0.
  failures: 0,
  lastErrorAt: null,
  lastSyncAt: null,
};

function notify() {
  for (const listener of listeners) listener();
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function snapshot() {
  return status;
}

if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    status.browserOnline = true;
    notify();
  });
  window.addEventListener("offline", () => {
    status.browserOnline = false;
    notify();
  });
}

/** React hook — re-renders whenever connectivity health changes. */
export function useDbStatus() {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}

/** Current health without subscribing (for event handlers / probes). */
export function getDbStatus() {
  return { ...status };
}

/** Call after any confirmed Supabase success. Clears the stale flag. */
export function recordDbSuccess() {
  status.failures = 0;
  status.stale = false;
  status.lastSyncAt = Date.now();
  notify();
}

/**
 * Call after any failed Supabase call. Keeps the previous snapshot on
 * screen (callers must NOT wipe their cache) and marks it stale.
 */
export function recordDbFailure(err) {
  status.failures += 1;
  status.stale = true;
  status.lastErrorAt = Date.now();
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    status.browserOnline = false;
  }
  if (err) {
    console.warn("[db-health] Supabase call failed:", err?.message || err);
  }
  notify();
}

/**
 * True when an error means "the request never completed" (offline, DNS,
 * timeout, connection reset) as opposed to "the backend answered no"
 * (RLS denial, validation, missing column — those have a code/status and
 * must NEVER be queued or retried blindly).
 */
export function isNetworkError(err) {
  if (!err) return false;
  // PostgREST / Supabase logic errors always carry one of these.
  if (err.code || err.status || err.statusCode) return false;
  const msg = String(err?.message || err || "");
  return (
    err instanceof TypeError ||
    /fetch failed|failed to fetch|networkerror|network request failed|offline|timeout|timed out|aborted|econn|enotfound|socket|connection|load failed/i.test(
      msg
    )
  );
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Run an async read with bounded retries. Only network-class failures are
 * retried; logic errors throw immediately. Records health either way.
 * Intended for initial loads — NOT for realtime-event refetches, which
 * would retry-storm on every postgres_changes notification.
 */
export async function withDbRetry(fn, { attempts = 3, baseMs = 400 } = {}) {
  let lastErr = null;
  for (let i = 0; i < attempts; i += 1) {
    try {
      const result = await fn();
      recordDbSuccess();
      return result;
    } catch (err) {
      lastErr = err;
      if (!isNetworkError(err) || i === attempts - 1) break;
      await sleep(baseMs * 2 ** i);
    }
  }
  recordDbFailure(lastErr);
  throw lastErr;
}
