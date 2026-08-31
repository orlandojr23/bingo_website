import { useSyncExternalStore } from "react";
import { mockPilotData } from "@/lib/mock-data";

const STORAGE_KEY = "bingo-live-route-v1";
const STORE_VERSION = 2;

function buildSeed() {
  const scheduleStatus = {};
  for (const s of mockPilotData.schedules) scheduleStatus[s.id] = s.status;

  const trucks = {};
  for (const t of mockPilotData.trucks) {
    const tr = mockPilotData.activeTracking[t.id];
    trucks[t.id] = {
      truckId: t.id,
      scheduleId: null,
      phase: "idle",
      stopIndex: 0,
      onsite: false,
      tracking: {
        lat: tr?.lat ?? mockPilotData.center[0],
        lng: tr?.lng ?? mockPilotData.center[1],
        heading: tr?.heading ?? 0,
        eta: tr?.eta ?? "Standby",
        isActive: false,
      },
    };
  }

  // Demo narrative: TRK-01 is already running SCH-001, approaching stop 2 (Sitio Vilgon)
  const t1 = mockPilotData.activeTracking["TRK-01"];
  trucks["TRK-01"] = {
    truckId: "TRK-01",
    scheduleId: "SCH-001",
    phase: "enroute",
    stopIndex: 1,
    onsite: false,
    tracking: {
      lat: t1.lat,
      lng: t1.lng,
      heading: t1.heading,
      eta: "5 mins",
      isActive: true,
    },
  };

  const driverByTruck = {};
  for (const t of mockPilotData.trucks) driverByTruck[t.id] = t.driver ?? null;

  return { v: STORE_VERSION, rev: 0, trucks, scheduleStatus, driverByTruck };
}

const SEED = buildSeed();

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
      if (parsed && parsed.v === STORE_VERSION && parsed.trucks && parsed.scheduleStatus && parsed.driverByTruck) {
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

export function getSchedule(id) {
  return mockPilotData.schedules.find((s) => s.id === id) || null;
}

export function startRoute(truckId) {
  return write((next) => {
    const ts = next.trucks[truckId];
    if (!ts) return null;

    const status = next.scheduleStatus;
    const mine = mockPilotData.schedules.filter((s) => s.activeTruckId === truckId);

    // Resume only if the held route is still open (a completed route must
    // never be re-activated — Start then picks the next assignment instead)
    if (
      ts.phase !== "idle" &&
      ts.scheduleId &&
      status[ts.scheduleId] !== "Completed"
    ) {
      next.trucks = {
        ...next.trucks,
        [truckId]: {
          ...ts,
          tracking: {
            ...ts.tracking,
            isActive: true,
            eta: ts.phase === "onsite" ? "On Site" : "5 mins",
          },
        },
      };
      return ts.scheduleId;
    }

    const pick =
      mine.find((s) => status[s.id] === "In Progress") ||
      mine.find((s) => status[s.id] === "Scheduled");
    if (!pick) return null;

    const first = pick.routePoints?.[0];
    next.trucks = {
      ...next.trucks,
      [truckId]: {
        truckId,
        scheduleId: pick.id,
        phase: "enroute",
        stopIndex: 0,
        onsite: false,
        tracking: {
          lat: first?.lat ?? ts.tracking.lat,
          lng: first?.lng ?? ts.tracking.lng,
          heading: ts.tracking.heading,
          eta: "5 mins",
          isActive: true,
        },
      },
    };
    next.scheduleStatus = { ...status, [pick.id]: "In Progress" };
    return pick.id;
  });
}

export function stopByAtPoint(truckId) {
  write((next) => {
    const ts = next.trucks[truckId];
    if (!ts || !ts.scheduleId) return;
    const point = getSchedule(ts.scheduleId)?.routePoints?.[ts.stopIndex];
    next.trucks = {
      ...next.trucks,
      [truckId]: {
        ...ts,
        phase: "onsite",
        onsite: true,
        tracking: {
          ...ts.tracking,
          lat: point?.lat ?? ts.tracking.lat,
          lng: point?.lng ?? ts.tracking.lng,
          eta: "On Site",
        },
      },
    };
  });
}

export function continueRoute(truckId) {
  write((next) => {
    const ts = next.trucks[truckId];
    if (!ts || !ts.scheduleId) return;
    const points = getSchedule(ts.scheduleId)?.routePoints ?? [];
    next.trucks = {
      ...next.trucks,
      [truckId]: {
        ...ts,
        phase: "enroute",
        onsite: false,
        stopIndex: Math.min(ts.stopIndex + 1, points.length - 1),
        tracking: { ...ts.tracking, eta: "5 mins" },
      },
    };
  });
}

export function completeRoute(truckId) {
  write((next) => {
    const ts = next.trucks[truckId];
    if (!ts || !ts.scheduleId) return;
    const points = getSchedule(ts.scheduleId)?.routePoints ?? [];
    next.trucks = {
      ...next.trucks,
      [truckId]: {
        ...ts,
        phase: "completed",
        onsite: false,
        stopIndex: Math.max(points.length - 1, 0),
        tracking: { ...ts.tracking, isActive: false, eta: "Route Done" },
      },
    };
    next.scheduleStatus = { ...next.scheduleStatus, [ts.scheduleId]: "Completed" };
  });
}

export function endRoute(truckId) {
  write((next) => {
    const ts = next.trucks[truckId];
    if (!ts) return;
    next.trucks = {
      ...next.trucks,
      [truckId]: {
        ...ts,
        tracking: { ...ts.tracking, isActive: false, eta: "Paused" },
      },
    };
  });
}

export function updateTracking(truckId, patch) {
  write((next) => {
    const ts = next.trucks[truckId];
    if (!ts) return;
    next.trucks = {
      ...next.trucks,
      [truckId]: { ...ts, tracking: { ...ts.tracking, ...patch } },
    };
  });
}

export function setScheduleStatus(scheduleId, status) {
  write((next) => {
    next.scheduleStatus = { ...next.scheduleStatus, [scheduleId]: status };
  });
}

export function assignDriver(truckId, driverName) {
  write((next) => {
    const map = { ...next.driverByTruck };
    if (driverName) {
      for (const key of Object.keys(map)) {
        if (map[key] === driverName) map[key] = null;
      }
    }
    map[truckId] = driverName || null;
    next.driverByTruck = map;
  });
}

export function swapDrivers(truckIdA, truckIdB) {
  write((next) => {
    const map = { ...next.driverByTruck };
    const tmp = map[truckIdA];
    map[truckIdA] = map[truckIdB];
    map[truckIdB] = tmp;
    next.driverByTruck = map;
  });
}

export function useLiveRoute() {
  return useSyncExternalStore(subscribe, getSnapshot, () => SEED);
}
