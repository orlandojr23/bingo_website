"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const STAFF_KEY = "bingo-staff-v2";
export const initialStaff = [];

let listeners = new Set();
let cache = [];
let initialized = false;

function notify() {
  for (const listener of listeners) listener();
}

/**
 * Load drivers from localStorage for fast initial render only.
 * Never used as the final source of truth — that is always Supabase.
 */
export function loadStaffRoster() {
  try {
    const raw = window.localStorage.getItem(STAFF_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (Array.isArray(parsed)) {
      return parsed.filter(
        (p) =>
          p &&
          p.id &&
          p.id !== "DRV-001" &&
          p.id !== "DRV-002" &&
          p.name !== "Juan Dela Cruz" &&
          p.name !== "Pedro Reyes"
      );
    }
  } catch {}
  return initialStaff;
}

/**
 * Fetch drivers from Supabase profiles table.
 * The DB result is the ONLY source of truth — stale localStorage entries
 * are never merged in so ghost/wrong data can never appear.
 */
export async function fetchStaffRoster() {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: true });

    if (!error && Array.isArray(data)) {
      // Only include users explicitly assigned the "driver" role
      const driverProfiles = data.filter((d) => d.role === "driver");

      const dbMapped = driverProfiles.map((d, index) => ({
        id: `DRV-${String(index + 1).padStart(3, "0")}`,
        supabaseId: d.id,
        name:
          d.full_name ||
          `${d.first_name || ""} ${d.last_name || ""}`.trim() ||
          d.email ||
          "Driver",
        role: "Driver",
        username: d.email || "",
        status: d.status || "Active",
      }));

      cache = dbMapped;
      // Persist the clean DB list so the next page load renders instantly
      window.localStorage.setItem(STAFF_KEY, JSON.stringify(dbMapped));
      initialized = true;
      notify();
      return dbMapped;
    }
  } catch (err) {
    console.warn("Error fetching driver profiles from Supabase:", err);
  }

  // Only reach here if DB call failed — fall back to localStorage
  const local = loadStaffRoster();
  cache = local;
  initialized = true;
  notify();
  return local;
}

/**
 * Save drivers to localStorage and notify all subscribers.
 * Used after optimistic UI updates when creating a new driver.
 */
export function saveStaffRoster(staff) {
  try {
    window.localStorage.setItem(STAFF_KEY, JSON.stringify(staff));
    cache = staff;
    notify();
  } catch {}
}

/**
 * React hook — subscribes to the driver cache and re-renders whenever it changes.
 * Pattern is identical to fleet.js (useFleet).
 */
export function useStaffRoster() {
  const [staff, setStaff] = useState(() => {
    // Show localStorage data instantly while Supabase loads
    if (cache.length > 0) return cache;
    return loadStaffRoster();
  });

  useEffect(() => {
    // Wire setStaff into notify so every cache update triggers a re-render
    const sync = () => setStaff([...cache]);
    listeners.add(sync);

    if (!initialized) {
      // First mount — fetch from Supabase; notify() → sync() → setStaff()
      fetchStaffRoster();
    } else {
      // Already have data — push current cache to this component immediately
      sync();
    }

    return () => {
      listeners.delete(sync);
    };
  }, []);

  return [staff, setStaff];
}
