import { useSyncExternalStore } from "react";
import { mockTickets } from "@/lib/mock-data";

const STORAGE_KEY = "bingo-tickets-v1";
const STORE_VERSION = 1;

const SEED = { v: STORE_VERSION, rev: 0, tickets: mockTickets.map((t) => ({ ...t })) };

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
      if (parsed && parsed.v === STORE_VERSION && Array.isArray(parsed.tickets)) {
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

function persist(next) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Photo data-URLs can exceed the quota; retry without photos so the
    // ticket itself still syncs across tabs.
    try {
      const slim = { ...next, tickets: next.tickets.map(({ photo, ...rest }) => rest) };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(slim));
    } catch {
      // storage unavailable — in-tab sync still works
    }
  }
}

function write(mutator) {
  const next = { ...getSnapshot() };
  const result = mutator(next);
  next.rev = (next.rev || 0) + 1;
  cache = next;
  persist(next);
  notify();
  return result;
}

export function nextTicketId() {
  const tickets = getSnapshot().tickets;
  const max = tickets.reduce((acc, t) => {
    const n = Number(String(t.id || "").replace(/\D/g, ""));
    return Number.isFinite(n) ? Math.max(acc, n) : acc;
  }, 0);
  return `TKT-${String(max + 1).padStart(3, "0")}`;
}

export function addTicket(ticket) {
  return write((next) => {
    next.tickets = [ticket, ...next.tickets.filter((t) => t.id !== ticket.id)];
  });
}

export function updateTicket(id, patch) {
  return write((next) => {
    next.tickets = next.tickets.map((t) => (t.id === id ? { ...t, ...patch } : t));
  });
}

export function removeTicket(id) {
  return write((next) => {
    next.tickets = next.tickets.filter((t) => t.id !== id);
  });
}

export function useTickets() {
  return useSyncExternalStore(subscribe, getSnapshot, () => SEED).tickets;
}
