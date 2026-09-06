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
            next.items = [newItem, ...next.items].slice(0, MAX_ENTRIES);
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
  };
}

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
  // If we have a dedupe key, we could check our local cache first to avoid a network round trip
  if (entry.dedupeKey) {
    const snap = getSnapshot();
    const dupe = (snap.items || []).find(
      (n) => n.dedupeKey === entry.dedupeKey && n.audience === entry.audience
    );
    if (dupe) return dupe;
  }

  const { data, error } = await supabase
    .from("notifications")
    .insert({
      audience: entry.audience || "admin",
      type: entry.type || "Dispatch",
      title: entry.title || "Notification",
      message: entry.message || "",
      is_read: false,
      dedupe_key: entry.dedupeKey || null,
    })
    .select()
    .single();

  if (error) {
    console.error("Error pushing notification", error);
    return null;
  }
  
  // Realtime channel will pick it up and update the local store, 
  // but we can eagerly update it here for immediate UI response.
  return write((next) => {
    const item = dbToClient(data);
    if (!next.items.find(n => n.id === item.id)) {
        next.items = [item, ...(next.items || [])].slice(0, MAX_ENTRIES);
    }
    return item;
  });
}

export function getNotifications(audience) {
  return (getSnapshot().items || [])
    .filter((n) => !audience || n.audience === audience)
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
  // Eager local update
  write((next) => {
    next.items = (next.items || []).map((n) =>
      !audience || n.audience === audience ? { ...n, isRead: true } : n
    );
  });
  
  let query = supabase.from("notifications").update({ is_read: true }).eq("is_read", false);
  if (audience) {
      query = query.eq("audience", audience);
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

export function useNotifications(audience) {
  const store = useSyncExternalStore(subscribe, getSnapshot, () => SEED);
  return (store.items || [])
    .filter((n) => !audience || n.audience === audience)
    .sort((a, b) => new Date(b.at) - new Date(a.at));
}

export function useUnreadCount(audience) {
  const store = useSyncExternalStore(subscribe, getSnapshot, () => SEED);
  return (store.items || []).filter(
    (n) => (!audience || n.audience === audience) && !n.isRead
  ).length;
}
