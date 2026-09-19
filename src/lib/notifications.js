import { useSyncExternalStore } from "react";
import { supabase } from "@/lib/supabase";

const STORE_VERSION = 2;
const MAX_ENTRIES = 50;

const SEED = { v: STORE_VERSION, rev: 0, items: [] };

const listeners = new Set();
let cache = null;

function notify() {
  for (const listener of listeners) listener();
}

let syncInitialized = false;

function getSnapshot() {
  if (!cache) {
    cache = SEED;
    if (typeof window !== "undefined") {
      initSupabaseSync();
    }
  }
  return cache;
}

async function initSupabaseSync() {
  if (syncInitialized) return;
  syncInitialized = true;

  // 1. Initial Fetch
  const { data } = await supabase
    .from("notifications")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(MAX_ENTRIES);

  if (data) {
    write((next) => {
      next.items = data.map(dbToClient);
    });
  }

  // 2. Real-time Subscription
  supabase
    .channel("public:notifications")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "notifications" },
      (payload) => {
        write((next) => {
          if (payload.eventType === "INSERT") {
            const newItem = dbToClient(payload.new);
            // The sender also writes eagerly, so the realtime echo of our
            // own push would otherwise appear as a duplicate row (and a
            // double unread count). Merge by id instead.
            next.items = (next.items || []).some((n) => n.id === newItem.id)
              ? next.items.map((n) => (n.id === newItem.id ? newItem : n))
              : [newItem, ...next.items].slice(0, MAX_ENTRIES);
          } else if (payload.eventType === "UPDATE") {
            const updatedItem = dbToClient(payload.new);
            next.items = next.items.map((n) =>
              n.id === updatedItem.id ? updatedItem : n
            );
          } else if (payload.eventType === "DELETE") {
            next.items = next.items.filter((n) => n.id !== payload.old.id);
          }
        });
      }
    )
    .subscribe();
}

// Ticket reference carried by the dedupe key (`ticket:<id>` or
// `ticket:<id>:resolved`). This survives reloads and realtime delivery even
// when the optional detail columns below don't exist in the DB yet.
function ticketIdFromDedupe(key) {
  const m = /^ticket:([^:]+)(?::resolved)?$/.exec(key || "");
  return m ? m[1] : null;
}

function dbToClient(row) {
  return {
    id: row.id,
    audience: row.audience,
    type: row.type,
    title: row.title,
    message: row.message,
    isRead: row.is_read,
    dedupeKey: row.dedupe_key,
    at: row.created_at,
    // Optional columns (see supabase/migrations/*_notifications_extras.sql).
    // Null when the migration hasn't been run — callers must fall back to
    // the message text / dedupe-derived ticketId.
    location: row.location ?? null,
    actionUrl: row.action_url ?? null,
    actionLabel: row.action_label ?? null,
    ticketId: row.ticket_id ?? ticketIdFromDedupe(row.dedupe_key),
  };
}

function matchesAudience(rowAudience, audience) {
  // No filter (undefined/null) matches everything; an explicit EMPTY list
  // matches nothing — important pre-login, when the resident's audience keys
  // aren't known yet and must not briefly match everyone else's rows.
  if (!audience) return true;
  if (Array.isArray(audience)) return audience.length > 0 && audience.includes(rowAudience);
  return rowAudience === audience;
}

// Whether the optional detail columns exist. Probed once: the first insert
// that fails with a missing-column error disables extras for the session and
// pushNotification falls back to the base columns.
let extrasSupported = true;

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function write(mutator) {
  const next = { ...getSnapshot() };
  const result = mutator(next);
  next.rev = (next.rev || 0) + 1;
  cache = next;
  notify();
  return result;
}

export async function pushNotification(entry) {
  // If we have a dedupe key, we could check our local cache first to avoid a network round trip.
  // Must keep the `{ item, remote }` contract: callers destructure it, so a
  // bare item here would read as a failed delivery.
  if (entry.dedupeKey) {
    const snap = getSnapshot();
    const dupe = (snap.items || []).find(
      (n) => n.dedupeKey === entry.dedupeKey && n.audience === entry.audience
    );
    if (dupe) {
      const remote = !String(dupe.id || "").startsWith("local-");
      return { item: dupe, remote, deduped: true };
    }
  }

  const basePayload = {
    audience: entry.audience || "admin",
    type: entry.type || "Dispatch",
    title: entry.title || "Notification",
    message: entry.message || "",
    is_read: false,
    dedupe_key: entry.dedupeKey || null,
  };

  // Persist the detail fields when the optional columns exist (migration);
  // otherwise retry with the base columns so pushes keep working.
  const fullPayload = extrasSupported
    ? {
        ...basePayload,
        location: entry.location ?? null,
        action_url: entry.actionUrl ?? null,
        action_label: entry.actionLabel ?? null,
        ticket_id: entry.ticketId ?? ticketIdFromDedupe(entry.dedupeKey) ?? null,
      }
    : basePayload;

  let { data, error } = await supabase
    .from("notifications")
    .insert(fullPayload)
    .select()
    .single();

  if (error && extrasSupported && /column|schema cache/i.test(error.message || "")) {
    extrasSupported = false;
    ({ data, error } = await supabase
      .from("notifications")
      .insert(basePayload)
      .select()
      .single());
  }

  if (error) {
    const detail = [
      error.message,
      error.code ? `code=${error.code}` : null,
      error.details,
      error.hint,
    ].filter(Boolean).join(" | ") || JSON.stringify(error);
    console.warn("Could not push notification to Supabase:", detail);
    // Fallback to a local-only notification to keep the UI functioning.
    // NOTE: `remote: false` tells the caller this never left the browser —
    // the other side will NOT receive it (usually an RLS policy blocking
    // the insert, or no connection).
    const localItem = {
      id: "local-" + Date.now(),
      audience: entry.audience || "admin",
      type: entry.type || "Dispatch",
      title: entry.title || "Notification",
      message: entry.message || "",
      isRead: false,
      dedupeKey: entry.dedupeKey || null,
      at: entry.at || new Date().toISOString(),
      actionUrl: entry.actionUrl,
      actionLabel: entry.actionLabel,
      location: entry.location,
      truckId: entry.truckId
    };
    const item = write((next) => {
      if (!next.items.find(n => n.id === localItem.id)) {
          next.items = [localItem, ...(next.items || [])].slice(0, MAX_ENTRIES);
      }
      return localItem;
    });
    return { item, remote: false, error };
  }

  // Realtime channel will pick it up and update the local store,
  // but we can eagerly update it here for immediate UI response.
  const item = write((next) => {
    const mapped = dbToClient(data);
    // Attach frontend-only fields since they aren't always stored in DB
    mapped.actionUrl = entry.actionUrl ?? mapped.actionUrl;
    mapped.actionLabel = entry.actionLabel ?? mapped.actionLabel;
    mapped.location = entry.location ?? mapped.location;
    mapped.ticketId = entry.ticketId ?? mapped.ticketId;
    mapped.truckId = entry.truckId;

    if (!next.items.find(n => n.id === mapped.id)) {
        next.items = [mapped, ...(next.items || [])].slice(0, MAX_ENTRIES);
    }
    return mapped;
  });
  return { item, remote: true };
}

export function getNotifications(audience) {
  return (getSnapshot().items || [])
    .filter((n) => matchesAudience(n.audience, audience))
    .sort((a, b) => new Date(b.at) - new Date(a.at));
}

export async function markNotificationRead(id) {
  // Eager local update
  write((next) => {
    next.items = (next.items || []).map((n) =>
      n.id === id ? { ...n, isRead: true } : n
    );
  });
  
  await supabase
    .from("notifications")
    .update({ is_read: true })
    .eq("id", id);
}

export async function markAllNotificationsRead(audience) {
  // An empty audience list must be a no-op — without this guard it would
  // mark EVERYONE's notifications read.
  if (Array.isArray(audience) && audience.length === 0) return;
  // Eager local update
  write((next) => {
    next.items = (next.items || []).map((n) =>
      matchesAudience(n.audience, audience) ? { ...n, isRead: true } : n
    );
  });
  
  let query = supabase.from("notifications").update({ is_read: true }).eq("is_read", false);
  if (audience && !(Array.isArray(audience) && audience.length === 0)) {
      query = Array.isArray(audience)
        ? query.in("audience", audience)
        : query.eq("audience", audience);
  }
  await query;
}

export async function removeNotification(id) {
  // Eager local update
  write((next) => {
    next.items = (next.items || []).filter((n) => n.id !== id);
  });
  
  await supabase.from("notifications").delete().eq("id", id);
}

export function getUnreadCount(audience) {
  return getNotifications(audience).filter((n) => !n.isRead).length;
}

// `audience` accepts a single key or an array of keys. Residents subscribe
// with `[userId, "resident:<displayName>"]` so reports filed before/after a
// rename (or with a missing reporter_id) still reach them.
export function useNotifications(audience) {
  const store = useSyncExternalStore(subscribe, getSnapshot, () => SEED);
  return (store.items || [])
    .filter((n) => matchesAudience(n.audience, audience))
    .sort((a, b) => new Date(b.at) - new Date(a.at));
}

export function useUnreadCount(audience) {
  const store = useSyncExternalStore(subscribe, getSnapshot, () => SEED);
  return (store.items || []).filter(
    (n) => matchesAudience(n.audience, audience) && !n.isRead
  ).length;
}
