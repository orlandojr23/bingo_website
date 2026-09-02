import { useSyncExternalStore } from "react";
import { mockPilotData } from "@/lib/mock-data";
import { nearestEdge } from "@/lib/router";
import { routeCache, cacheKeyFor, blocksSignature } from "@/lib/route-cache";

const STORAGE_KEY = "bingo-live-route-v1";
const STORE_VERSION = 4;

function buildSeed() {
  const scheduleStatus = {};
  for (const s of mockPilotData.schedules) scheduleStatus[s.id] = s.status;

  const schedules = {};
  for (const s of mockPilotData.schedules) schedules[s.id] = { ...s };

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

  const driverByTruck = {};
  for (const t of mockPilotData.trucks) driverByTruck[t.id] = t.driver ?? null;

  return { v: STORE_VERSION, rev: 0, trucks, schedules, scheduleStatus, driverByTruck, roadBlocks: [] };
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
      if (parsed && parsed.v === STORE_VERSION && parsed.trucks && parsed.schedules && parsed.scheduleStatus && parsed.driverByTruck) {
        if (!Array.isArray(parsed.roadBlocks)) parsed.roadBlocks = [];
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

export function getSchedules() {
  return Object.values(getSnapshot().schedules || {}).sort((a, b) =>
    a.id.localeCompare(b.id)
  );
}

export function getSchedule(id) {
  return getSnapshot().schedules?.[id] || null;
}

export function nextScheduleId() {
  const max = getSchedules().reduce((acc, s) => {
    const n = Number(String(s.id || "").replace(/\D/g, ""));
    return Number.isFinite(n) ? Math.max(acc, n) : acc;
  }, 0);
  return `SCH-${String(max + 1).padStart(3, "0")}`;
}

// Parses the start time out of a range like "08:00 AM - 11:00 AM"
function parseStartMinutes(timeStr) {
  const m = String(timeStr || "").match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!m) return null;
  let h = Number(m[1]);
  const min = Number(m[2]);
  const mer = (m[3] || "").toUpperCase();
  if (mer === "PM" && h !== 12) h += 12;
  if (mer === "AM" && h === 12) h = 0;
  return h * 60 + min;
}

function minutesToLabel(total) {
  const h24 = Math.floor(total / 60) % 24;
  const min = total % 60;
  const mer = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(min).padStart(2, "0")} ${mer}`;
}

// New dispatch assignments get stops traced along their zone's corners so
// drivers and residents immediately see a real route trajectory.
export function buildZoneRoutePoints(zoneId, timeStr) {
  const zone = mockPilotData.zones.find((z) => z.id === zoneId);
  const corners = zone?.coordinates ?? [];
  const start = parseStartMinutes(timeStr);
  const label = (zone?.name || "Zone").split("&")[0].trim();
  return corners.map(([lat, lng], i) => ({
    name: `${label} Stop ${i + 1}`,
    time: start != null ? minutesToLabel(start + i * 45) : "TBD",
    lat,
    lng,
  }));
}

export function addSchedule(fields) {
  return write((next) => {
    const id = nextScheduleId();
    const schedule = {
      ...fields,
      id,
      routePoints: fields.routePoints?.length
        ? fields.routePoints
        : buildZoneRoutePoints(fields.zoneId, fields.time),
    };
    next.schedules = { ...next.schedules, [id]: schedule };
    next.scheduleStatus = { ...next.scheduleStatus, [id]: schedule.status || "Scheduled" };
    return schedule;
  });
}

export function updateSchedule(id, patch) {
  return write((next) => {
    const current = next.schedules?.[id];
    if (!current) return;
    const updated = { ...current, ...patch };
    if (patch.zoneId && patch.zoneId !== current.zoneId && !patch.routePoints) {
      updated.routePoints = buildZoneRoutePoints(patch.zoneId, updated.time);
    }
    next.schedules = { ...next.schedules, [id]: updated };
    if (patch.status) {
      next.scheduleStatus = { ...next.scheduleStatus, [id]: patch.status };
    }
  });
}

export function removeSchedule(id) {
  return write((next) => {
    const schedules = { ...next.schedules };
    delete schedules[id];
    next.schedules = schedules;
    const status = { ...next.scheduleStatus };
    delete status[id];
    next.scheduleStatus = status;
  });
}

export function startRoute(truckId) {
  return write((next) => {
    const ts = next.trucks[truckId];
    if (!ts) return null;

    const status = next.scheduleStatus;
    const mine = Object.values(next.schedules || {}).filter((s) => s.activeTruckId === truckId);

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

    const inProgress = mine.filter((s) => status[s.id] === "In Progress");
    const scheduled = mine.filter((s) => status[s.id] === "Scheduled");
    // Prefer the newest assignment so a freshly dispatch is what starts
    const pick =
      inProgress[inProgress.length - 1] || scheduled[scheduled.length - 1];
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

export function getRoadBlocks() {
  return getSnapshot().roadBlocks || [];
}

// Blocks the street segment nearest to the reported location. Every map
// (driver, resident, admin) derives its trajectory from this list, so the
// green route line re-routes around the block automatically in realtime.
export function reportRoadBlock(reportedBy, lat, lng, reason = "Blocked road") {
  return write((next) => {
    const edge = nearestEdge(lat, lng);
    if (!edge) return null;
    const existing = (next.roadBlocks || []).find((b) => b.edge === edge.key);
    if (existing) return existing;
    const block = {
      id: `RB-${Date.now().toString(36)}-${Math.floor(Math.random() * 1e4)}`,
      edge: edge.key,
      a: edge.a,
      b: edge.b,
      lat: edge.lat,
      lng: edge.lng,
      reason,
      reportedBy,
      at: new Date().toISOString(),
    };
    next.roadBlocks = [...(next.roadBlocks || []), block];
    return block;
  });
}

export function clearRoadBlock(id) {
  write((next) => {
    next.roadBlocks = (next.roadBlocks || []).filter((b) => b.id !== id);
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
  ensureRouteSim();
  return useSyncExternalStore(subscribe, getSnapshot, () => SEED);
}

// ---- Live movement sim: advance on-duty trucks toward their next stop every
// 5 seconds so the marker glides in realtime on every map (admin, resident,
// driver). Any tab may tick; lastSimAt dedupes concurrent tabs. Trucks fed by
// real GPS (recent lastGpsAt) or seeded by tests (simPaused) are left alone.
const SIM_INTERVAL_MS = 5000;
const SIM_STEP_M = 45;
const SIM_STOP_GAP_M = 25;

function simMeters(aLat, aLng, bLat, bLng) {
  const dy = (bLat - aLat) * 111320;
  const dx = (bLng - aLng) * 111320 * Math.cos((aLat * Math.PI) / 180);
  return Math.hypot(dx, dy);
}

function simBearing(aLat, aLng, bLat, bLng) {
  const dx = (bLng - aLng) * Math.cos((aLat * Math.PI) / 180);
  const dy = bLat - aLat;
  // App convention: heading = compass bearing + 90 (icon faces north at 0).
  return Math.round(((Math.atan2(dx, dy) * 180) / Math.PI + 90 + 360) % 360);
}

// Walk stepM forward along the drawn route polyline (projecting the truck
// onto its nearest vertex first). Returns null once the remaining path is
// inside the arrival window so arrival stays manual.
function advanceAlongPath(path, lat, lng, stepM, gapM) {
  let startIdx = 0;
  let best = Infinity;
  for (let i = 0; i < path.length; i++) {
    const d = simMeters(lat, lng, path[i][0], path[i][1]);
    if (d < best) {
      best = d;
      startIdx = i;
    }
  }
  const segs = [];
  let total = 0;
  for (let i = startIdx; i < path.length - 1; i++) {
    const len = simMeters(path[i][0], path[i][1], path[i + 1][0], path[i + 1][1]);
    segs.push(len);
    total += len;
  }
  if (total <= gapM) return null;
  let walk = Math.min(stepM, total - gapM);
  let i = startIdx;
  for (; i < path.length - 2; i++) {
    if (walk <= segs[i - startIdx]) break;
    walk -= segs[i - startIdx];
  }
  const a = path[i];
  const b = path[i + 1];
  const segLen = segs[i - startIdx];
  const r = segLen > 0 ? walk / segLen : 1;
  return {
    lat: a[0] + (b[0] - a[0]) * r,
    lng: a[1] + (b[1] - a[1]) * r,
    heading: simBearing(a[0], a[1], b[0], b[1]),
  };
}

function simTick() {
  const snap = getSnapshot();
  const now = Date.now();
  if (now - (snap.lastSimAt || 0) < SIM_INTERVAL_MS - 800) return;

  const blockSig = blocksSignature(snap.roadBlocks || []);
  const trucks = { ...snap.trucks };
  let moved = false;
  for (const [id, ts] of Object.entries(trucks)) {
    if (!ts || ts.phase !== "enroute" || !ts.tracking?.isActive || !ts.scheduleId) continue;
    if (ts.tracking.simPaused) continue;
    if (now - (ts.tracking.lastGpsAt || 0) < 10000) continue;
    const point = getSchedule(ts.scheduleId)?.routePoints?.[ts.stopIndex];
    if (!point) continue;

    // Follow the same cached street route the maps are drawing so the truck
    // stays on the green trajectory (and honors re-route detours).
    const origin = { lat: ts.tracking.lat, lng: ts.tracking.lng };
    const path = routeCache.get(cacheKeyFor(ts.scheduleId, ts.stopIndex, origin, 2, blockSig));
    const advanced =
      path && path.length >= 2
        ? advanceAlongPath(path, origin.lat, origin.lng, SIM_STEP_M, SIM_STOP_GAP_M)
        : null;
    if (advanced) {
      trucks[id] = { ...ts, tracking: { ...ts.tracking, ...advanced } };
      moved = true;
      continue;
    }
    if (path && path.length >= 2) continue; // at arrival window on a real route

    const dist = simMeters(ts.tracking.lat, ts.tracking.lng, point.lat, point.lng);
    if (dist <= SIM_STOP_GAP_M) continue;
    const ratio = Math.min(SIM_STEP_M, dist - SIM_STOP_GAP_M) / dist;
    trucks[id] = {
      ...ts,
      tracking: {
        ...ts.tracking,
        lat: ts.tracking.lat + (point.lat - ts.tracking.lat) * ratio,
        lng: ts.tracking.lng + (point.lng - ts.tracking.lng) * ratio,
        heading: simBearing(ts.tracking.lat, ts.tracking.lng, point.lat, point.lng),
      },
    };
    moved = true;
  }
  if (!moved) return;
  write((next) => {
    next.trucks = trucks;
    next.lastSimAt = now;
  });
}

let simTimer = null;
export function ensureRouteSim() {
  if (simTimer || typeof window === "undefined") return;
  simTimer = setInterval(simTick, SIM_INTERVAL_MS);
}
