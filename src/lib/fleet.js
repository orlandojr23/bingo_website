"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

const listeners = new Set();
let cache = [];
let isFetching = false;
let initialized = false;

function notify() {
  for (const listener of listeners) listener();
}

function mapToFrontend(dbRow) {
  return {
    id: dbRow.id,
    plate: dbRow.plate_number,
    capacity: dbRow.capacity,
    driver: dbRow.driver_name,
    isActive: dbRow.is_active,
  };
}

async function fetchFleet() {
  if (isFetching) return;
  isFetching = true;
  
  const { data, error } = await supabase
    .from('trucks')
    .select('*')
    .order('created_at', { ascending: false });

  if (data) {
    cache = data.map(mapToFrontend);
    initialized = true;
    notify();
  }
  isFetching = false;
}

if (typeof window !== "undefined") {
  supabase.channel('public:trucks')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'trucks' }, () => {
      fetchFleet();
    })
    .subscribe();
}

export function normalizeCode(code) {
  return code.trim().toUpperCase();
}

export async function addTruck({ id, plate, driver, capacity }) {
  const code = normalizeCode(id);
  const plateClean = plate.trim().toUpperCase();
  if (!code || !plateClean) return { error: "Truck code and plate number are required." };
  
  const { error } = await supabase.from('trucks').insert({
    id: code,
    plate_number: plateClean,
    driver_name: driver?.trim() || "",
    capacity: capacity?.trim() || "",
  });
  
  if (error) {
    if (error.code === '23505') { // Unique violation
      return { error: `Truck code or Plate is already registered.` };
    }
    return { error: error.message };
  }
  return { truck: { id: code, plate: plateClean, driver: driver?.trim(), capacity: capacity?.trim() } };
}

export async function updateTruck(id, patch) {
  const next = { ...cache.find(t => t.id === id), ...patch };
  const code = normalizeCode(next.id);
  const plateClean = (next.plate || "").trim().toUpperCase();
  
  if (!code || !plateClean) return { error: "Truck code and plate number are required." };

  const { error } = await supabase.from('trucks').update({
    id: code,
    plate_number: plateClean,
    driver_name: next.driver?.trim() || "",
    capacity: next.capacity?.trim() || "",
  }).eq('id', id);

  if (error) return { error: error.message };
  return { truck: next };
}

export async function removeTruck(id) {
  const { error } = await supabase.from('trucks').delete().eq('id', id);
  if (error) console.error("Error deleting truck:", error);
}

export function useFleet() {
  const [fleet, setFleet] = useState(() => cache);

  useEffect(() => {
    if (!initialized) fetchFleet();
    
    const sync = () => setFleet(cache);
    sync(); // Make sure we have latest state right after mount
    
    listeners.add(sync);
    return () => listeners.delete(sync);
  }, []);

  return fleet;
}
