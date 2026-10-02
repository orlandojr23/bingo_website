// Offline Waze-style route snapping for the driver app.
//
// The phone's raw GPS fix wanders into houses and parking lots. Since the
// truck drives a planned collection route, the marker is projected onto the
// remaining route path (stop-to-stop segments from the current stop onward),
// so it rides the road instead of the driver's house. Fixes farther than
// SNAP_CORRIDOR_M from the path are left raw — an honest position beats a
// wrong snap when the driver detours off route.
//
// Everything here is pure geography (equirectangular projection — plenty
// accurate at barangay scale) with no network calls, so it works offline.
// Headings are device-style compass bearings (0 = North); callers convert to
// the app convention (compass + 90) before broadcasting.

export const SNAP_CORRIDOR_M = 60;
// Wider corridor used when snapping to a dense OSRM road polyline so minor
// GPS wobble that lands a couple metres off the road line still snaps cleanly.
export const ROAD_SNAP_CORRIDOR_M = 40;
// Progress must regress more than this before the heading flips to the
// segment's reverse direction — absorbs GPS jitter along the path.
export const REVERSE_TOL_M = 5;
// Looser reversal tolerance for dense OSRM road geometry: segments are
// 5–15 m long so GPS jitter of 10–15 m routinely regresses alongM by more
// than REVERSE_TOL_M and would falsely flip the heading 180° ("backwards").
// 20 m still catches a genuine U-turn while absorbing jitter.
export const ROAD_REVERSE_TOL_M = 20;

const M_PER_DEG_LAT = 111320;

function validPoint(p) {
  const lat = p?.lat ?? p?.latitude;
  const lng = p?.lng ?? p?.longitude;
  if (Array.isArray(p)) return null;
  if (typeof lat !== "number" || typeof lng !== "number") return null;
  if (isNaN(lat) || isNaN(lng)) return null;
  return { lat, lng };
}

// Compass bearing (0 = North, clockwise) from a to b.
export function compassBearing(a, b) {
  const A = validPoint(a);
  const B = validPoint(b);
  if (!A || !B) return null;
  const dx = (B.lng - A.lng) * M_PER_DEG_LAT * Math.cos(((A.lat + B.lat) / 2) * (Math.PI / 180));
  const dy = (B.lat - A.lat) * M_PER_DEG_LAT;
  if (dx === 0 && dy === 0) return null;
  return (Math.atan2(dx, dy) * 180 / Math.PI + 360) % 360;
}

// Closest point on segment a-b to p: projected position, fraction t along
// the segment, distance in meters, and segment length.
export function projectOnSegment(p, a, b) {
  const P = validPoint(p);
  const A = validPoint(a);
  const B = validPoint(b);
  if (!P || !A || !B) return null;
  const cosLat = Math.cos(((A.lat + B.lat) / 2) * (Math.PI / 180));
  const ax = A.lng * M_PER_DEG_LAT * cosLat;
  const ay = A.lat * M_PER_DEG_LAT;
  const bx = B.lng * M_PER_DEG_LAT * cosLat;
  const by = B.lat * M_PER_DEG_LAT;
  const px = P.lng * M_PER_DEG_LAT * cosLat;
  const py = P.lat * M_PER_DEG_LAT;
  const abx = bx - ax;
  const aby = by - ay;
  const len2 = abx * abx + aby * aby;
  if (len2 < 0.25) return null; // degenerate segment (< 0.5 m)
  const t = Math.min(1, Math.max(0, ((px - ax) * abx + (py - ay) * aby) / len2));
  const cx = ax + abx * t;
  const cy = ay + aby * t;
  return {
    lat: cy / M_PER_DEG_LAT,
    lng: cx / (M_PER_DEG_LAT * cosLat),
    t,
    distM: Math.hypot(px - cx, py - cy),
    segLenM: Math.sqrt(len2),
  };
}

// Project a raw fix onto the remaining route path. Searches segments from
// max(0, stopIndex - 1) onward — the arrival leg plus everything ahead — so
// the marker never snaps backward to a finished leg. Returns the snapped
// fix plus routing metadata, or null when the fix is off-route.
export function snapToRoute(lat, lng, points, stopIndex = 0, corridorM = SNAP_CORRIDOR_M) {
  if (typeof lat !== "number" || typeof lng !== "number" || isNaN(lat) || isNaN(lng)) return null;
  if (!Array.isArray(points) || points.length < 2) return null;
  const start = Math.min(Math.max(0, (stopIndex ?? 0) - 1), points.length - 2);
  let best = null;
  // Cumulative lengths are measured from the route start so progress stays
  // comparable as stopIndex advances.
  const cum = [0];
  for (let i = 0; i < points.length - 1; i++) {
    const A = validPoint(points[i]);
    const B = validPoint(points[i + 1]);
    if (!A || !B) { cum.push(cum[i]); continue; }
    const cosLat = Math.cos(((A.lat + B.lat) / 2) * (Math.PI / 180));
    const dx = (B.lng - A.lng) * M_PER_DEG_LAT * cosLat;
    const dy = (B.lat - A.lat) * M_PER_DEG_LAT;
    cum.push(cum[i] + Math.hypot(dx, dy));
  }
  for (let i = start; i < points.length - 1; i++) {
    const proj = projectOnSegment({ lat, lng }, points[i], points[i + 1]);
    if (!proj) continue;
    if (!best || proj.distM < best.distM) {
      best = { ...proj, segIndex: i, alongM: cum[i] + proj.t * proj.segLenM };
    }
  }
  if (!best || best.distM > corridorM) return null;
  const bearing = compassBearing(points[best.segIndex], points[best.segIndex + 1]);
  if (bearing == null) return null;
  return { lat: best.lat, lng: best.lng, segIndex: best.segIndex, alongM: best.alongM, distM: best.distM, bearing };
}

// Resolve which way along the snapped segment the truck is traveling.
// Progress (meters along the route) that keeps increasing means forward;
// a regression beyond the jitter tolerance means reversing. prevAlong is
// the caller's stored baseline (null on first fix / leg change).
export function travelHeading(snap, prevAlong = null, reversalTolM = REVERSE_TOL_M) {
  if (!snap) return null;
  if (prevAlong == null || snap.alongM >= prevAlong - reversalTolM) {
    return { heading: snap.bearing, along: snap.alongM };
  }
  return { heading: (snap.bearing + 180) % 360, along: snap.alongM };
}

// Heading source priority for the marker and the course-up camera: the
// snapped road direction wins (moving, or parked with no history yet); then
// ground course (actual travel beats the device compass, which follows how
// the phone is held — not where the truck goes); then the device compass
// while moving; a parked truck holds its last heading instead of swinging
// with compass wobble; unknown defaults to North (the map rest state).
export function resolveTravelHeading({ road, course, device, prevHeading, speedMps }) {
  const moving = (speedMps ?? 0) > 1;
  if (road != null && (moving || prevHeading == null)) return road;
  if (moving && course != null) return course;
  if (moving && device != null) return device;
  if (prevHeading != null) return prevHeading;
  return 0;
}

// --- Live-tracking stabilization (driver GPS watch) ---
//
// Raw phone fixes jitter ±5–20 m, which at zoom 17–18 reads as the marker
// wobbling off the road. Two guards keep it planted:
//
// 1. smoothFix: exponential moving average with speed-adaptive trust.
//    Fast movement follows the new fix (low lag); slow movement leans on
//    history (absorbs sidewalk-level wobble); poor-accuracy fixes are
//    trusted less. Teleport-scale jumps reset instead of dragging the
//    marker through buildings for seconds.
// 2. createSnapFilter: sticky snapped/raw mode (hysteresis). A single
//    off-corridor fix — GPS jump, sidewalk wobble — holds the last snapped
//    point instead of teleporting off-road and back. Only consecutive
//    off-corridor fixes admit a real detour and switch to raw.

// Consecutive off-corridor fixes before the filter admits the truck really
// left the route and shows the (smoothed) raw position.
export const OFF_ROUTE_CONFIRM_FIXES = 3;

export function smoothFix(prev, lat, lng, { speedMps = 0, accuracyM = null } = {}) {
  if (typeof lat !== "number" || typeof lng !== "number" || isNaN(lat) || isNaN(lng)) return prev;
  if (!prev || typeof prev.lat !== "number" || typeof prev.lng !== "number") return { lat, lng };
  const dx = (lng - prev.lng) * M_PER_DEG_LAT * Math.cos((prev.lat * Math.PI) / 180);
  const dy = (lat - prev.lat) * M_PER_DEG_LAT;
  // Teleport-scale jump (tunnel exit, reacquire): reset the average instead
  // of smearing the marker across the map for seconds.
  if (Math.hypot(dx, dy) > 50) return { lat, lng };
  const speed = Math.max(0, speedMps ?? 0);
  // 0 m/s → 0.25 (heavy smoothing), 4 m/s → ~0.5, 8+ m/s → ~0.8 (follow).
  let alpha = 0.25 + 0.55 * Math.min(1, speed / 8);
  if (accuracyM != null && accuracyM > 20) alpha *= 0.6;
  return {
    lat: prev.lat + (lat - prev.lat) * alpha,
    lng: prev.lng + (lng - prev.lng) * alpha,
  };
}

// Stateful snap filter — one per GPS watch session (reset on start/resume).
// Returns { lat, lng, heading, snapped }: the snapped road point while the
// fix is in-corridor (or held there through brief excursions), otherwise
// the smoothed raw fix once a detour is confirmed. heading is the road
// direction, or null when raw/held (caller falls back to course/device).
export function createSnapFilter() {
  let progress = null; // { key, along } for travelHeading continuity
  let held = null; // last snapped point, shown through brief excursions
  let offCount = 0;
  const reset = () => {
    progress = null;
    held = null;
    offCount = 0;
  };
  // geometry: dense OSRM road polyline ({ lat, lng }[]). When provided it is
  // used for snapping first (road-accurate, no stopIndex window needed);
  // stop-pin segments are the fallback when geometry is absent or misses.
  const update = (lat, lng, points, stopIndex = 0, scheduleId = null, geometry = null) => {
    // --- Primary: snap to OSRM road geometry (ignores stopIndex window) ---
    const roadSnap =
      Array.isArray(geometry) && geometry.length >= 2
        ? snapToRoute(lat, lng, geometry, 0, ROAD_SNAP_CORRIDOR_M)
        : null;

    // --- Fallback: snap to sparse stop-pin segments ---
    const pinSnap =
      !roadSnap && Array.isArray(points) && points.length >= 2
        ? snapToRoute(lat, lng, points, stopIndex)
        : null;

    const snap = roadSnap ?? pinSnap;
    // Use different progress keys so switching between geometry / pins never
    // makes the truck appear to reverse.
    const snapMode = roadSnap ? "road" : "pin";

    if (snap) {
      const key = `${snapMode}|${scheduleId}|${stopIndex}`;
      // Road geometry uses a looser reversal tolerance: dense OSRM polylines
      // have 5–15 m segments so ordinary GPS jitter would otherwise flip the
      // heading 180° on every other fix ("marker faces backwards" bug).
      const revTol = roadSnap ? ROAD_REVERSE_TOL_M : REVERSE_TOL_M;
      const solved = travelHeading(snap, progress && progress.key === key ? progress.along : null, revTol);
      progress = { key, along: solved.along };
      offCount = 0;
      held = { lat: snap.lat, lng: snap.lng };
      return { lat: snap.lat, lng: snap.lng, heading: solved.heading, snapped: true, roadSnapped: !!roadSnap };
    }
    offCount += 1;
    if (held && offCount <= OFF_ROUTE_CONFIRM_FIXES) {
      return { lat: held.lat, lng: held.lng, heading: null, snapped: true, held: true };
    }
    return { lat, lng, heading: null, snapped: false };
  };
  return { update, reset };
}

// --- OSRM road-geometry fetch ---
//
// The stop pins (routePoints) are sparse — just 4-5 barangay locations.
// Snapping the truck onto straight lines between those pins puts the marker
// in fields and buildings instead of on the road. fetchRoadGeometry() asks
// OSRM (free, no API key) for a road-following polyline so the snap stays
// on actual streets — exactly how Waze and Uber do it.
//
// Returns an array of { lat, lng } waypoints dense enough to ride every
// road bend, or null when the fetch fails (offline fallback: the caller
// falls back to the raw stop-pin segments).
export async function fetchRoadGeometry(stops) {
  if (!Array.isArray(stops) || stops.length < 2) return null;
  // Validate every stop has numeric lat/lng.
  const pts = stops
    .map((s) => {
      const lat = s?.lat ?? s?.latitude;
      const lng = s?.lng ?? s?.longitude;
      return typeof lat === "number" && typeof lng === "number" && !isNaN(lat) && !isNaN(lng)
        ? { lat, lng }
        : null;
    })
    .filter(Boolean);
  if (pts.length < 2) return null;

  // OSRM coordinate string: "lng,lat;lng,lat;..."
  const coords = pts.map((p) => `${p.lng},${p.lat}`).join(";");
  // overview=full returns the complete route geometry (not simplified).
  // geometries=geojson gives us [lng, lat] coordinates directly.
  const url =
    `https://router.project-osrm.org/route/v1/driving/${coords}` +
    `?overview=full&geometries=geojson&steps=false`;

  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const data = await res.json();
    const route = data?.routes?.[0];
    if (!route) return null;
    const geomCoords = route.geometry?.coordinates;
    if (!Array.isArray(geomCoords) || geomCoords.length < 2) return null;
    // GeoJSON is [lng, lat]; convert to { lat, lng } for the snap functions.
    return geomCoords.map(([lng, lat]) => ({ lat, lng }));
  } catch {
    // Network error, timeout, or OSRM unavailable — caller uses raw pins.
    return null;
  }
}
