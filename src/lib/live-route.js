import { useSyncExternalStore } from "react";
import { mockPilotData, TEJERO_SITOS } from "@/lib/mock-data";
import { nearestEdge } from "@/lib/router";
import { routeCache, cacheKeyFor, blocksSignature } from "@/lib/route-cache";
import { pushNotification } from "@/lib/notifications";
import { supabase } from "@/lib/supabase";

const STORAGE_KEY = "bingo-live-route-v1";
const STORE_VERSION = 5;

function buildSeed() {
  const scheduleStatus = {};
  const schedules = {};
  const trucks = {};
  const driverByTruck = {};

  return { v: STORE_VERSION, rev: 0, trucks, schedules, scheduleStatus, driverByTruck, roadBlocks: [] };
}

const SEED = buildSeed();

const listeners = new Set();
let cache = null;

function notify() {
  for (const listener of listeners) listener();
}

function getSnapshot() {
  if (!cache) {
    cache = SEED;
    if (typeof window !== "undefined") {
      initSupabaseSync();
    }
  }
  return cache;
}

let syncInitialized = false;

async function initSupabaseSync() {
  if (syncInitialized) return;
  syncInitialized = true;

  const [schedulesRes, trackingRes] = await Promise.all([
    supabase.from('schedules').select('*'),
    supabase.from('live_tracking').select('*')
  ]);

  write((next) => {
    if (schedulesRes.data) {
      for (const s of schedulesRes.data) {
        next.schedules[s.id] = {
          id: s.id,
          zoneId: s.zone_id,
          truckId: s.truck_id,
          driverId: s.driver_id,
          collectionType: s.collection_type,
          collectionDays: s.collection_days,
          time: s.collection_time,
          isArchived: s.is_archived,
          routePoints: s.route_points || [],
          status: s.status || "Scheduled",
        };
        next.scheduleStatus[s.id] = s.status || "Scheduled";
      }
    }

    if (trackingRes.data) {
      for (const t of trackingRes.data) {
        next.trucks[t.truck_id] = {
          truckId: t.truck_id,
          scheduleId: t.schedule_id,
          phase: t.phase || "idle",
          stopIndex: t.stop_index || 0,
          onsite: t.onsite || false,
          tracking: {
            lat: t.lat || mockPilotData.center[0],
            lng: t.lng || mockPilotData.center[1],
            heading: t.heading || 0,
            eta: t.eta || "Standby",
            isActive: t.is_active || false,
          },
        };
        if (t.driver_id) {
          next.driverByTruck[t.truck_id] = t.driver_id;
        }
      }
    }
  });

  supabase
    .channel('public:schedules')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'schedules' }, (payload) => {
      const s = payload.new;
      if (s && s.id) {
        write((next) => {
          if (payload.eventType === 'DELETE') {
            delete next.schedules[payload.old.id];
            delete next.scheduleStatus[payload.old.id];
          } else {
            next.schedules[s.id] = {
              id: s.id,
              zoneId: s.zone_id,
              truckId: s.truck_id,
              driverId: s.driver_id,
              collectionType: s.collection_type,
              collectionDays: s.collection_days,
              time: s.collection_time,
              isArchived: s.is_archived,
              routePoints: s.route_points || [],
              status: s.status || "Scheduled",
            };
            next.scheduleStatus[s.id] = s.status || "Scheduled";
          }
        });
      }
    })
    .subscribe();

  supabase
    .channel('public:live_tracking')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'live_tracking' }, (payload) => {
      const t = payload.new;
      if (t && t.truck_id) {
        write((next) => {
          if (payload.eventType === 'DELETE') {
            delete next.trucks[payload.old.truck_id];
          } else {
            next.trucks[t.truck_id] = {
              truckId: t.truck_id,
              scheduleId: t.schedule_id,
              phase: t.phase || "idle",
              stopIndex: t.stop_index || 0,
              onsite: t.onsite || false,
              tracking: {
                lat: t.lat || mockPilotData.center[0],
                lng: t.lng || mockPilotData.center[1],
                heading: t.heading || 0,
                eta: t.eta || "Standby",
                isActive: t.is_active || false,
              },
            };
            if (t.driver_id) {
              next.driverByTruck[t.truck_id] = t.driver_id;
            }
          }
        });
      }
    })
    .subscribe();
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

export function buildSitioRoutePoints(sitioNames, timeStr) {
  const start = parseStartMinutes(timeStr);
  return (sitioNames || [])
    .map((name, i) => {
      const sitio = TEJERO_SITOS[name];
      if (!sitio) return null;
      return {
        name,
        time: start != null ? minutesToLabel(start + i * 45) : "TBD",
        lat: sitio.lat,
        lng: sitio.lng,
      };
    })
    .filter(Boolean);
}

export function estimateStopTime(timeStr, index) {
  const start = parseStartMinutes(timeStr);
  return start != null ? minutesToLabel(start + index * 45) : "TBD";
}

export function retimeRoutePoints(points, timeStr) {
  return (points || []).map((p, i) => ({ ...p, time: estimateStopTime(timeStr, i) }));
}

export function scheduleLabel(schedule) {
  if (!schedule) return "Barangay Tejero";
  const zone = mockPilotData.zones.find((z) => z.id === schedule.zoneId);
  if (zone) return zone.name;
  const names = (schedule.routePoints || []).map((p) => p.name).filter(Boolean);
  if (!names.length) return "Barangay Tejero";
  if (names.length <= 2) return names.join(" → ");
  return `${names[0]} → ${names[1]} +${names.length - 2} more`;
}

export async function addSchedule(fields) {
  const id = nextScheduleId();
  const routePoints = fields.routePoints?.length
    ? fields.routePoints
    : fields.zoneId
      ? buildZoneRoutePoints(fields.zoneId, fields.time)
      : [];

  const { error } = await supabase.from('schedules').insert({
    id,
    zone_id: fields.zoneId,
    truck_id: fields.truckId,
    driver_id: fields.driverId,
    collection_type: fields.collectionType,
    collection_days: fields.collectionDays,
    collection_time: fields.time,
    is_archived: false,
    route_points: routePoints,
    status: fields.status || "Scheduled",
  });

  if (error) throw error;

  return write((next) => {
    const schedule = {
      ...fields,
      id,
      routePoints,
    };
    next.schedules = { ...next.schedules, [id]: schedule };
    next.scheduleStatus = { ...next.scheduleStatus, [id]: schedule.status || "Scheduled" };
    return schedule;
  });
}

export async function updateSchedule(id, patch) {
  const dbPatch = {};
  if (patch.zoneId !== undefined) dbPatch.zone_id = patch.zoneId;
  if (patch.truckId !== undefined) dbPatch.truck_id = patch.truckId;
  if (patch.driverId !== undefined) dbPatch.driver_id = patch.driverId;
  if (patch.collectionType !== undefined) dbPatch.collection_type = patch.collectionType;
  if (patch.collectionDays !== undefined) dbPatch.collection_days = patch.collectionDays;
  if (patch.time !== undefined) dbPatch.collection_time = patch.time;
  if (patch.isArchived !== undefined) dbPatch.is_archived = patch.isArchived;
  if (patch.status !== undefined) dbPatch.status = patch.status;
  if (patch.routePoints !== undefined) dbPatch.route_points = patch.routePoints;

  const current = getSnapshot().schedules?.[id];
  if (patch.zoneId && patch.zoneId !== current?.zoneId && !patch.routePoints) {
    dbPatch.route_points = buildZoneRoutePoints(patch.zoneId, patch.time || current?.time);
  }

  const { error } = await supabase.from('schedules').update(dbPatch).eq('id', id);
  if (error) throw error;

  return write((next) => {
    const cur = next.schedules?.[id];
    if (!cur) return;
    const updated = { ...cur, ...patch };
    if (dbPatch.route_points) {
      updated.routePoints = dbPatch.route_points;
    }
    next.schedules = { ...next.schedules, [id]: updated };
    if (patch.status) {
      next.scheduleStatus = { ...next.scheduleStatus, [id]: patch.status };
    }
  });
}

export async function removeSchedule(id) {
  const { error } = await supabase.from('schedules').update({ is_archived: true }).eq('id', id);
  if (error) throw error;
  return write((next) => {
    const schedules = { ...next.schedules };
    if (schedules[id]) {
      schedules[id] = { ...schedules[id], isArchived: true };
      next.schedules = schedules;
    }
  });
}

export async function restoreSchedule(id) {
  const { error } = await supabase.from('schedules').update({ is_archived: false }).eq('id', id);
  if (error) throw error;
  return write((next) => {
    const schedules = { ...next.schedules };
    if (schedules[id]) {
      schedules[id] = { ...schedules[id], isArchived: false };
      next.schedules = schedules;
    }
  });
}

export async function hardDeleteSchedule(id) {
  const { error } = await supabase.from('schedules').delete().eq('id', id);
  if (error) throw error;
  return write((next) => {
    const schedules = { ...next.schedules };
    delete schedules[id];
    next.schedules = schedules;
    const status = { ...next.scheduleStatus };
    delete status[id];
    next.scheduleStatus = status;
  });
}

export async function acceptAssignment(scheduleId) {
  const { error } = await supabase.from('schedules').update({ status: 'Accepted' }).eq('id', scheduleId);
  if (error) throw error;
  return write((next) => {
    if (next.schedules?.[scheduleId]) {
      next.scheduleStatus = { ...next.scheduleStatus, [scheduleId]: "Accepted" };
    }
  });
}

export async function startRoute(truckId) {
  const snap = getSnapshot();
  const ts = snap.trucks[truckId];
  if (!ts) return null;

  const status = snap.scheduleStatus;
  const mine = Object.values(snap.schedules || {}).filter((s) => s.truckId === truckId || s.activeTruckId === truckId);
  
  let startedId = null;
  let newPhase = null;
  let newTracking = null;

  if (
    ts.phase !== "idle" &&
    ts.scheduleId &&
    status[ts.scheduleId] !== "Completed"
  ) {
    startedId = ts.scheduleId;
    newPhase = ts.phase;
    newTracking = {
      ...ts.tracking,
      isActive: true,
      eta: ts.phase === "onsite" ? "On Site" : "5 mins",
    };
  } else {
    const inProgress = mine.filter((s) => status[s.id] === "In Progress");
    const scheduled = mine.filter((s) => status[s.id] === "Scheduled" || status[s.id] === "Assigned" || status[s.id] === "Accepted");
    const pick = inProgress[inProgress.length - 1] || scheduled[scheduled.length - 1];
    if (!pick) return null;

    startedId = pick.id;
    newPhase = "enroute";
    const first = pick.routePoints?.[0];
    newTracking = {
      lat: first?.lat ?? ts.tracking.lat,
      lng: first?.lng ?? ts.tracking.lng,
      heading: ts.tracking.heading,
      eta: "5 mins",
      isActive: true,
    };
  }

  await supabase.from('live_tracking').update({
    schedule_id: startedId,
    phase: newPhase,
    is_active: newTracking.isActive,
    eta: newTracking.eta,
    lat: newTracking.lat,
    lng: newTracking.lng,
    heading: newTracking.heading,
  }).eq('truck_id', truckId);

  await supabase.from('schedules').update({ status: 'In Progress' }).eq('id', startedId);

  write((next) => {
    next.trucks = {
      ...next.trucks,
      [truckId]: {
        ...next.trucks[truckId],
        scheduleId: startedId,
        phase: newPhase,
        onsite: newPhase === "onsite",
        tracking: newTracking,
      },
    };
    next.scheduleStatus = { ...next.scheduleStatus, [startedId]: "In Progress" };
  });

  if (startedId) {
    const first = getSchedule(startedId)?.routePoints?.[0];
    pushNotification({
      audience: "admin",
      type: "Dispatch",
      title: `Truck ${truckId} started its route`,
      message: `Truck ${truckId} is now en route, heading to the ${first?.name ?? "first"} pickup pin point.`,
      location: first ? `${first.name}, Brgy. Tejero` : undefined,
      truckId,
      actionUrl: `/live-map?truckId=${truckId}`,
      actionLabel: "View Live Map",
      at: new Date().toISOString(),
      dedupeKey: `${startedId}:start`,
    });
  }
  return startedId;
}

export async function stopByAtPoint(truckId) {
  const ts = getSnapshot().trucks[truckId];
  if (!ts || !ts.scheduleId) return;
  const point = getSchedule(ts.scheduleId)?.routePoints?.[ts.stopIndex];

  const newTracking = {
    ...ts.tracking,
    lat: point?.lat ?? ts.tracking.lat,
    lng: point?.lng ?? ts.tracking.lng,
    eta: "On Site",
  };

  await supabase.from('live_tracking').update({
    phase: "onsite",
    onsite: true,
    eta: newTracking.eta,
    lat: newTracking.lat,
    lng: newTracking.lng,
  }).eq('truck_id', truckId);

  write((next) => {
    const cur = next.trucks[truckId];
    if (!cur || !cur.scheduleId) return;
    next.trucks = {
      ...next.trucks,
      [truckId]: {
        ...cur,
        phase: "onsite",
        onsite: true,
        tracking: newTracking,
      },
    };
  });

  const stopName = point?.name ?? "a stop";
  const dedupeKey = `${ts.scheduleId}:${ts.stopIndex}:stopby`;
  pushNotification({
    audience: "admin",
    type: "Dispatch",
    title: `Truck ${truckId} arrived at ${stopName}`,
    message: `Truck ${truckId} is now on site at the ${stopName} pickup pin point you scheduled.`,
    location: `${stopName}, Brgy. Tejero`,
    truckId,
    actionUrl: `/live-map?truckId=${truckId}`,
    actionLabel: "View Live Map",
    at: new Date().toISOString(),
    dedupeKey,
  });
}

export async function continueRoute(truckId) {
  const ts = getSnapshot().trucks[truckId];
  if (!ts || !ts.scheduleId) return;
  const points = getSchedule(ts.scheduleId)?.routePoints ?? [];
  const newIndex = Math.min(ts.stopIndex + 1, points.length - 1);

  await supabase.from('live_tracking').update({
    phase: "enroute",
    onsite: false,
    stop_index: newIndex,
    eta: "5 mins",
  }).eq('truck_id', truckId);

  write((next) => {
    const cur = next.trucks[truckId];
    next.trucks = {
      ...next.trucks,
      [truckId]: {
        ...cur,
        phase: "enroute",
        onsite: false,
        stopIndex: newIndex,
        tracking: { ...cur.tracking, eta: "5 mins" },
      },
    };
  });
}

export async function completeRoute(truckId) {
  const ts = getSnapshot().trucks[truckId];
  if (!ts || !ts.scheduleId) return;
  const points = getSchedule(ts.scheduleId)?.routePoints ?? [];
  const newIndex = Math.max(points.length - 1, 0);

  await supabase.from('live_tracking').update({
    phase: "completed",
    onsite: false,
    stop_index: newIndex,
    is_active: false,
    eta: "Route Done",
  }).eq('truck_id', truckId);

  await supabase.from('schedules').update({ status: 'Completed' }).eq('id', ts.scheduleId);

  write((next) => {
    const cur = next.trucks[truckId];
    next.trucks = {
      ...next.trucks,
      [truckId]: {
        ...cur,
        phase: "completed",
        onsite: false,
        stopIndex: newIndex,
        tracking: { ...cur.tracking, isActive: false, eta: "Route Done" },
      },
    };
    next.scheduleStatus = { ...next.scheduleStatus, [ts.scheduleId]: "Completed" };
  });
}

export async function endRoute(truckId) {
  const ts = getSnapshot().trucks[truckId];
  if (!ts) return;

  await supabase.from('live_tracking').update({
    is_active: false,
    eta: "Paused",
  }).eq('truck_id', truckId);

  write((next) => {
    const cur = next.trucks[truckId];
    next.trucks = {
      ...next.trucks,
      [truckId]: {
        ...cur,
        tracking: { ...cur.tracking, isActive: false, eta: "Paused" },
      },
    };
  });
}

export async function updateTracking(truckId, patch) {
  const dbPatch = {};
  if (patch.lat !== undefined) dbPatch.lat = patch.lat;
  if (patch.lng !== undefined) dbPatch.lng = patch.lng;
  if (patch.heading !== undefined) dbPatch.heading = patch.heading;
  if (patch.eta !== undefined) dbPatch.eta = patch.eta;
  if (patch.isActive !== undefined) dbPatch.is_active = patch.isActive;

  await supabase.from('live_tracking').update(dbPatch).eq('truck_id', truckId);

  write((next) => {
    const ts = next.trucks[truckId];
    if (!ts) return;
    next.trucks = {
      ...next.trucks,
      [truckId]: { ...ts, tracking: { ...ts.tracking, ...patch } },
    };
  });
}

export async function setScheduleStatus(scheduleId, status) {
  await supabase.from('schedules').update({ status }).eq('id', scheduleId);
  write((next) => {
    next.scheduleStatus = { ...next.scheduleStatus, [scheduleId]: status };
  });
}

export async function assignDriver(truckId, driverName) {
  await supabase.from('live_tracking').update({ driver_id: driverName }).eq('truck_id', truckId);

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
  return [];
}

export function reportRoadBlock() {
  return null;
}

export function clearRoadBlock() {}

export async function swapDrivers(truckIdA, truckIdB) {
  const snap = getSnapshot();
  const driverA = snap.driverByTruck[truckIdA];
  const driverB = snap.driverByTruck[truckIdB];

  await Promise.all([
    supabase.from('live_tracking').update({ driver_id: driverB }).eq('truck_id', truckIdA),
    supabase.from('live_tracking').update({ driver_id: driverA }).eq('truck_id', truckIdB),
  ]);

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
// 4 seconds so the marker glides in realtime on every map (admin, resident,
// driver). The 4s tick lands before the marker's 4.6s glide finishes, so each
// update retargets mid-glide and motion never pauses; the 36m step keeps the
// same 9 m/s speed as the old 45m/5s cadence. Any tab may tick; lastSimAt
// dedupes concurrent tabs. Trucks fed by real GPS (recent lastGpsAt) or
// seeded by tests (simPaused) are left alone.
const SIM_INTERVAL_MS = 4000;
const SIM_STEP_M = 36;
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
