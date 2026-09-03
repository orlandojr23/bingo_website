import { useSyncExternalStore } from "react";

// Shared cross-tab notification feed for the admin dashboard. Driver actions
// (e.g. Stop By) push entries here; the admin notifications page and sidebar
// badge subscribe and stay in sync via storage events, exactly like the
// live-route store. Residents are intentionally NOT part of this feed — the
// resident PWA already surfaces arrivals through its live rotating header
// banner, which is driven by the live-route store directly.
const STORAGE_KEY = "bingo-notifications-v1";
const STORE_VERSION = 1;
const MAX_ENTRIES = 50;

const SEED = { v: STORE_VERSION, rev: 0, items: [] };

const listeners = new Set();
let cache = null;
let storageListenerInstalled = false;

function notify() {
  for (const listener of listeners) listener();
}

function readStore() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.v === STORE_VERSION && Array.isArray(parsed.items)) {
        return parsed;
      }
    }
  } catch {
    // corrupt storage falls through to re-seed
  }
  return SEED;
}

function getSnapshot() {
  if (typeof window === "undefined") return SEED;
  if (!cache) cache = readStore();
  return cache;
}

function installStorageListener() {
  if (storageListenerInstalled || typeof window === "undefined") return;
  storageListenerInstalled = true;
  window.addEventListener("storage", (e) => {
    if (e.key === STORAGE_KEY || e.key === null) {
      cache = readStore();
      notify();
    }
  });
}

function subscribe(listener) {
  installStorageListener();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function write(mutator) {
  const next = { ...getSnapshot() };
  const result = mutator(next);
  next.rev = (next.rev || 0) + 1;
  cache = next;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // storage unavailable — in-tab sync still works
    }
  }
  notify();
  return result;
}

// Pushes a notification to one audience ("admin" | "resident"). When
// `dedupeKey` is given, an existing unread entry with the same key makes the
// push a no-op so repeated driver actions never spam the feed.
export function pushNotification(entry) {
  return write((next) => {
    if (entry.dedupeKey) {
      const dupe = (next.items || []).find(
        (n) => n.dedupeKey === entry.dedupeKey && n.audience === entry.audience
      );
      if (dupe) return dupe;
    }
    const item = {
      id: `NTF-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e4)}`,
      type: "Dispatch",
      title: "Notification",
      message: "",
      isRead: false,
      at: new Date().toISOString(),
      ...entry,
    };
    next.items = [item, ...(next.items || [])].slice(0, MAX_ENTRIES);
    return item;
  });
}

export function getNotifications(audience) {
  return (getSnapshot().items || [])
    .filter((n) => !audience || n.audience === audience)
    .sort((a, b) => new Date(b.at) - new Date(a.at));
}

export function markNotificationRead(id) {
  write((next) => {
    next.items = (next.items || []).map((n) =>
      n.id === id ? { ...n, isRead: true } : n
    );
  });
}

export function markAllNotificationsRead(audience) {
  write((next) => {
    next.items = (next.items || []).map((n) =>
      !audience || n.audience === audience ? { ...n, isRead: true } : n
    );
  });
}

export function removeNotification(id) {
  write((next) => {
    next.items = (next.items || []).filter((n) => n.id !== id);
  });
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
