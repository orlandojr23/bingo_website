"use client";

import { useEffect, useState } from "react";
import { mockPilotData } from "@/lib/mock-data";

const KEY = "bingo_fleet_v1";
const CHANGE_EVENT = "bingo-fleet-change";

function readStore() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const list = JSON.parse(raw);
      if (Array.isArray(list)) return list;
    }
  } catch {}
  return mockPilotData.trucks.map((t) => ({ ...t }));
}

function writeStore(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {}
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
}

export function normalizeCode(code) {
  return code.trim().toUpperCase();
}

export function addTruck({ id, plate, driver, capacity }) {
  const list = readStore();
  const code = normalizeCode(id);
  const plateClean = plate.trim().toUpperCase();
  if (!code || !plateClean) return { error: "Truck code and plate number are required." };
  if (list.some((t) => normalizeCode(t.id) === code)) return { error: `Truck code ${code} already exists.` };
  if (list.some((t) => (t.plate || "").trim().toUpperCase() === plateClean)) return { error: `Plate ${plateClean} is already registered.` };
  const truck = { id: code, plate: plateClean, driver: driver?.trim() || "", capacity: capacity?.trim() || "" };
  writeStore([...list, truck]);
  return { truck };
}

export function updateTruck(id, patch) {
  const list = readStore();
  const target = list.find((t) => t.id === id);
  if (!target) return { error: "Truck not found." };
  const next = { ...target, ...patch };
  const code = normalizeCode(next.id);
  const plateClean = (next.plate || "").trim().toUpperCase();
  if (!code || !plateClean) return { error: "Truck code and plate number are required." };
  if (list.some((t) => t.id !== id && normalizeCode(t.id) === code)) return { error: `Truck code ${code} already exists.` };
  if (list.some((t) => t.id !== id && (t.plate || "").trim().toUpperCase() === plateClean)) return { error: `Plate ${plateClean} is already registered.` };
  next.id = code;
  next.plate = plateClean;
  writeStore(list.map((t) => (t.id === id ? next : t)));
  return { truck: next };
}

export function removeTruck(id) {
  const list = readStore();
  writeStore(list.filter((t) => t.id !== id));
}

export function useFleet() {
  const [fleet, setFleet] = useState(() => mockPilotData.trucks);

  useEffect(() => {
    const sync = () => setFleet(readStore());
    sync();
    window.addEventListener(CHANGE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return fleet;
}
