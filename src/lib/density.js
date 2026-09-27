// Admin display density preference (spacing only) — per device, shared
// across admin tabs. Mirrors the sound-preference pattern in sounds.js:
// persisted in localStorage, reactive through useSyncExternalStore, and
// kept in sync across tabs via the storage event below.
//
// "default" intentionally has no CSS overrides — it renders today's styles,
// so existing admins see zero change until they pick another option.

import { useSyncExternalStore } from "react";

export const DENSITIES = ["default", "comfortable"];

export const DENSITY_LABELS = {
  default: "Default",
  comfortable: "Comfortable",
};

export const DENSITY_DESCRIPTIONS = {
  default: "The current spacing.",
  comfortable: "Roomier rows and cards.",
};

const DENSITY_KEY = "bingo-admin-density";
const listeners = new Set();
let densityCache = null;

function normalize(value) {
  return DENSITIES.includes(value) ? value : "default";
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === DENSITY_KEY || e.key === null) {
      densityCache = null;
      for (const listener of listeners) listener();
    }
  });
}

export function getDensity() {
  if (typeof window === "undefined") return "default";
  if (densityCache === null) {
    try {
      densityCache = normalize(window.localStorage.getItem(DENSITY_KEY));
    } catch {
      densityCache = "default";
    }
  }
  return densityCache;
}

export function setDensity(density) {
  densityCache = normalize(density);
  try {
    window.localStorage.setItem(DENSITY_KEY, densityCache);
  } catch {
    // storage unavailable — the in-memory preference still applies
  }
  for (const listener of listeners) listener();
}

function subscribeDensity(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useDensity() {
  return useSyncExternalStore(subscribeDensity, getDensity, () => "default");
}
