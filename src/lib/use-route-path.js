import { useEffect, useMemo, useRef, useState } from "react";
import { getSchedule } from "@/lib/live-route";
import { computeRoute } from "@/lib/router";
import {
  routeCache,
  inflight,
  round3,
  round4,
  buildWaypoints,
  blocksSignature,
  cacheKeyFor,
} from "@/lib/route-cache";

const ORS_URL = "https://api.openrouteservice.org/v2/directions/driving-car/geojson";
const ORS_KEY = process.env.NEXT_PUBLIC_ORS_API_KEY || "";

let backoffUntil = 0;

const METERS_PER_DEG_LAT = 111320;

function distanceMeters(a, b) {
  const dy = (b.lat - a.lat) * METERS_PER_DEG_LAT;
  const dx = (b.lng - a.lng) * METERS_PER_DEG_LAT * Math.cos((a.lat * Math.PI) / 180);
  return Math.hypot(dx, dy);
}

function bearingDeg(a, b) {
  const dx = (b.lng - a.lng) * Math.cos((a.lat * Math.PI) / 180);
  const dy = b.lat - a.lat;
  return ((Math.atan2(dx, dy) * 180) / Math.PI + 360) % 360;
}

// Shortest distance (meters) from an origin to a route polyline. Segment 0 is
// the pinned origin→first-vertex stub (see headingAlong), so it is ignored
// when real geometry follows — otherwise the distance would always read ~0.
function distToPathM(origin, positions) {
  if (!origin || positions.length < 2) return 0;
  const mLat = 111320;
  const mLng = 111320 * Math.cos((origin.lat * Math.PI) / 180);
  const startSeg = positions.length > 2 ? 1 : 0;
  let best = Infinity;
  for (let i = startSeg; i < positions.length - 1; i++) {
    const ax = (positions[i][1] - origin.lng) * mLng;
    const ay = (positions[i][0] - origin.lat) * mLat;
    const bx = (positions[i + 1][1] - origin.lng) * mLng;
    const by = (positions[i + 1][0] - origin.lat) * mLat;
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy;
    const t = len2 > 0 ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / len2)) : 0;
    best = Math.min(best, Math.hypot(ax + dx * t, ay + dy * t));
  }
  return best === Infinity ? 0 : best;
}

// Waze-style auto-reroute tuning: past this distance off the drawn trajectory
// the driver is treated as having left the route and a fresh path is computed
// from their current position to the same next stop. The threshold sits well
// above phone GPS noise (~10-20m) so normal wobble never triggers a reroute.
const REROUTE_AFTER_M = 50;
// Minimum gap between auto-reroutes so a long off-route stretch recomputes at
// most this often instead of on every GPS fix.
const REROUTE_COOLDOWN_MS = 15000;

// Snap a raw GPS point to the nearest point on the road polyline
// (Waze-style: marker stays on the road even when the phone is a few meters
// off-road at a house/garage). Segment 0 is the pinned origin→first-vertex
// stub and is ignored while the truck is off that stub. Returns null when
// there is no usable geometry — or the fix is further than maxDistM from the
// line (beyond that the raw fix is more truthful than a teleport, and the
// heading falls back to the device's direction of travel).
export function snapToRoute(origin, positions, maxDistM = 100) {
  if (!origin || !Array.isArray(positions) || positions.length < 2) return null;
  const lat0 = typeof origin.lat === "number" ? origin.lat : origin[0];
  const lng0 = typeof origin.lng === "number" ? origin.lng : origin[1];
  if (typeof lat0 !== "number" || typeof lng0 !== "number" || isNaN(lat0) || isNaN(lng0)) return null;
  const mLat = 111320;
  const mLng = 111320 * Math.cos((lat0 * Math.PI) / 180);
  const startSeg = positions.length > 2 ? 1 : 0;
  let best = null;
  let bestDist = Infinity;
  for (let i = startSeg; i < positions.length - 1; i++) {
    const aLat = Array.isArray(positions[i]) ? positions[i][0] : positions[i].lat;
    const aLng = Array.isArray(positions[i]) ? positions[i][1] : positions[i].lng;
    const bLat = Array.isArray(positions[i + 1]) ? positions[i + 1][0] : positions[i + 1].lat;
    const bLng = Array.isArray(positions[i + 1]) ? positions[i + 1][1] : positions[i + 1].lng;
    if (typeof aLat !== "number" || typeof aLng !== "number" || typeof bLat !== "number" || typeof bLng !== "number") continue;
    const ax = (aLng - lng0) * mLng;
    const ay = (aLat - lat0) * mLat;
    const bx = (bLng - lng0) * mLng;
    const by = (bLat - lat0) * mLat;
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy;
    const t = len2 > 0 ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / len2)) : 0;
    const projLat = aLat + (bLat - aLat) * t;
    const projLng = aLng + (bLng - aLng) * t;
    const dist = Math.hypot(ax + dx * t, ay + dy * t);
    if (dist < bestDist) {
      bestDist = dist;
      best = { lat: projLat, lng: projLng, i, t };
    }
  }
  if (!best || bestDist > maxDistM) return null;
  return best;
}

// The truck icon faces north at rotation 0 and rotates clockwise by
// (heading - 90), so heading = compass bearing + 90. Project the origin onto
// the nearest route segment, then sample the bearing lookaheadM meters AHEAD
// of that projection along the path so the marker starts rotating into a
// corner just before reaching it (Waze-style turn anticipation).
function headingAlong(positions, lookaheadM = 15) {
  if (positions.length < 2) return null;
  const origin = { lat: positions[0][0], lng: positions[0][1] };
  const mLat = 111320;
  const mLng = 111320 * Math.cos((origin.lat * Math.PI) / 180);
  // Segment 0 is the pinned origin→first cached vertex; once the truck moves
  // it points backwards, so ignore it when real geometry follows.
  const startSeg = positions.length > 2 ? 1 : 0;

  // Cumulative path distance (meters) at each vertex.
  const cum = [0];
  for (let i = 0; i < positions.length - 1; i++) {
    const dx = (positions[i + 1][1] - positions[i][1]) * mLng;
    const dy = (positions[i + 1][0] - positions[i][0]) * mLat;
    cum.push(cum[i] + Math.hypot(dx, dy));
  }

  // Nearest segment to the origin + the along-path distance of the projection.
  let best = null;
  for (let i = startSeg; i < positions.length - 1; i++) {
    const a = { lat: positions[i][0], lng: positions[i][1] };
    const b = { lat: positions[i + 1][0], lng: positions[i + 1][1] };
    const ax = (a.lng - origin.lng) * mLng;
    const ay = (a.lat - origin.lat) * mLat;
    const bx = (b.lng - origin.lng) * mLng;
    const by = (b.lat - origin.lat) * mLat;
    const dx = bx - ax;
    const dy = by - ay;
    const len2 = dx * dx + dy * dy;
    const t = len2 > 0 ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / len2)) : 0;
    const dist = Math.hypot(ax + dx * t, ay + dy * t);
    if (!best || dist < best.dist) best = { i, t, dist };
  }

  const total = cum[cum.length - 1];
  const segLen = cum[best.i + 1] - cum[best.i];
  const target = Math.min(cum[best.i] + segLen * best.t + lookaheadM, total);

  let i = startSeg;
  while (i < positions.length - 2 && cum[i + 1] < target) i++;
  const a = { lat: positions[i][0], lng: positions[i][1] };
  const b = { lat: positions[i + 1][0], lng: positions[i + 1][1] };
  return Math.round((bearingDeg(a, b) + 90) % 360);
}

async function fetchOrs(waypoints) {
  const res = await fetch(ORS_URL, {
    method: "POST",
    headers: {
      Authorization: ORS_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ coordinates: waypoints.map((p) => [p.lng, p.lat]) }),
  });
  if (!res.ok) {
    const err = new Error(`ORS directions failed: ${res.status}`);
    err.status = res.status;
    throw err;
  }
  const json = await res.json();
  const coords = json?.features?.[0]?.geometry?.coordinates;
  if (!coords || coords.length < 2) throw new Error("ORS directions returned empty geometry");
  return coords.map(([lng, lat]) => [lat, lng]);
}

export function useRoutePath({ scheduleId, stopIndex = 0, origin = null, points = [], blocks = [], enabled = true, autoReroute = false }) {
  const waypoints = enabled ? buildWaypoints(origin, points) : [];
  const blockSig = blocksSignature(blocks);
  const baseKey = cacheKeyFor(scheduleId, stopIndex, origin, waypoints.length, blockSig);

  // Waze-style auto-reroute: each deviation event gets its own cache key so
  // the fetch effect below recomputes a fresh path from the driver's current
  // position to the same next stop. The nonce only ever grows; every key
  // holds finished geometry, so nothing ever snaps back to a stale path.
  const [rerouteNonce, setRerouteNonce] = useState(0);
  const lastRerouteAt = useRef(0);
  const cacheKey = rerouteNonce ? `${baseKey}#r${rerouteNonce}` : baseKey;
  const isRerouteKey = rerouteNonce > 0;

  const [state, setState] = useState(() => {
    const cached = routeCache.get(cacheKey);
    return {
      positions: waypoints.length >= 2 ? (cached ?? waypoints.map((p) => [p.lat, p.lng])) : [],
      source: cached ? (blockSig || isRerouteKey ? "reroute" : "ors") : "straight",
      ready: waypoints.length >= 2,
    };
  });

  const lastKeyRef = useRef(cacheKey);
  if (lastKeyRef.current !== cacheKey) {
    lastKeyRef.current = cacheKey;
    const cached = routeCache.get(cacheKey);
    setState({
      positions: waypoints.length >= 2 ? (cached ?? waypoints.map((p) => [p.lat, p.lng])) : [],
      source: cached ? (blockSig || isRerouteKey ? "reroute" : "ors") : "straight",
      ready: waypoints.length >= 2,
    });
  }

  // Deviation detector: when the live origin drifts off the drawn trajectory
  // (state.positions is the unpinned geometry — the pinned stub in segment 0
  // is skipped inside distToPathM), request a reroute. Cooldown-gated so a
  // long off-route stretch recomputes periodically instead of per GPS fix.
  useEffect(() => {
    if (!autoReroute || !enabled || !origin || state.positions.length < 2) return;
    if (distToPathM(origin, state.positions) <= REROUTE_AFTER_M) return;
    const now = Date.now();
    if (now - lastRerouteAt.current < REROUTE_COOLDOWN_MS) return;
    lastRerouteAt.current = now;
    setRerouteNonce((n) => n + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoReroute, enabled, origin?.lat, origin?.lng, state.positions]);

  useEffect(() => {
    if (!enabled || waypoints.length < 2) return;

    // Blocked streets force the local street router so the trajectory
    // re-routes around the block in realtime; ORS has no live closures.
    if (blockSig) {
      const cached = routeCache.get(cacheKey);
      const positions = cached ?? computeRoute(waypoints, blocks.map((b) => b.edge));
      if (!cached) routeCache.set(cacheKey, positions);
      setState({ positions, source: "reroute", ready: true });
      return;
    }

    // Auto-reroutes also take the local router: instant, offline, and zero
    // ORS quota — refinement from the network can wait until the driver is
    // back on a planned leg.
    if (isRerouteKey) {
      const cached = routeCache.get(cacheKey);
      const positions = cached ?? computeRoute(waypoints, blocks.map((b) => b.edge));
      if (!cached) routeCache.set(cacheKey, positions);
      setState({ positions, source: "reroute", ready: true });
      return;
    }

    if (!ORS_KEY || Date.now() < backoffUntil) {
      const cached = routeCache.get(cacheKey);
      const positions = cached ?? computeRoute(waypoints, blocks.map((b) => b.edge));
      if (!cached) routeCache.set(cacheKey, positions);
      setState({ positions, source: "local", ready: true });
      return;
    }
    const cached = routeCache.get(cacheKey);
    if (cached) {
      setState({ positions: cached, source: "ors", ready: true });
      return;
    }

    let cancelled = false;
    let job = inflight.get(cacheKey);
    if (!job) {
      job = fetchOrs(waypoints)
        .then((positions) => {
          routeCache.set(cacheKey, positions);
          return positions;
        })
        .finally(() => inflight.delete(cacheKey));
      inflight.set(cacheKey, job);
    }
    job
      .then((positions) => {
        if (!cancelled) setState({ positions, source: "ors", ready: true });
      })
      .catch((err) => {
        const now = Date.now();
        if (err.status === 401 || err.status === 403) backoffUntil = now + 5 * 60 * 1000;
        else if (err.status === 429) backoffUntil = now + 60 * 1000;
        else backoffUntil = now + 30 * 1000;

        if (!cancelled) {
          const cached = routeCache.get(cacheKey);
          const positions = cached ?? computeRoute(waypoints, blocks.map((b) => b.edge));
          if (!cached) routeCache.set(cacheKey, positions);
          setState({ positions, source: "local", ready: true });
        }
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey, enabled]);

  // Keep the line's first vertex pinned to the live truck position so the
  // trajectory always connects to the marker between refetches, and face
  // the marker along the road direction it is about to travel. The pinned
  // origin is quantized to ~11m and the result memoized: parents re-render on
  // every GPS echo / sim tick / bounds change, and without this each render
  // hands react-leaflet a fresh array identity, redrawing the whole green
  // trajectory every couple of seconds — the visible "dancing", worst while
  // dragging or zooming. Now the path only rebuilds when it really moved.
  const qLat = origin ? round4(origin.lat) : null;
  const qLng = origin ? round4(origin.lng) : null;
  const positions = useMemo(
    () =>
      origin && state.positions.length >= 2
        ? [[qLat, qLng], ...state.positions.slice(1)]
        : state.positions,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [qLat, qLng, state.positions]
  );
  // True while the origin sits off the drawn trajectory — drives the
  // "Rerouting…" indicator and clears on its own once fresh geometry lands.
  const rerouting =
    !!autoReroute &&
    !!enabled &&
    !!origin &&
    state.positions.length >= 2 &&
    distToPathM(origin, state.positions) > REROUTE_AFTER_M;
  return {
    ...state,
    positions,
    heading: origin && positions.length >= 2 ? headingAlong(positions) : null,
    rerouting,
  };
}

export function useTruckRoutes(live, fleet) {
  const [routes, setRoutes] = useState([]);

  const blocks = live.roadBlocks || [];
  const blockSig = blocksSignature(blocks);

  const fleetKey = (fleet || []).map((t) => t.id).join(",");
  const liveKey = Object.entries(live.trucks || {})
    .map(([id, ts]) => [
      id,
      ts?.phase,
      ts?.stopIndex,
      ts?.tracking?.isActive ? 1 : 0,
      round4(ts?.tracking?.lat || 0),
      round4(ts?.tracking?.lng || 0),
    ].join(":"))
    .join("|");

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const results = [];
      for (const t of fleet || []) {
        const ts = live.trucks[t.id];
        const sched = ts?.scheduleId ? getSchedule(ts.scheduleId) : null;
        const active = !!ts && (ts.phase === "enroute" || ts.phase === "onsite") && !!ts.tracking?.isActive;
        if (!active || !sched) continue;

        const origin = { lat: ts.tracking.lat, lng: ts.tracking.lng };
        const waypoints = buildWaypoints(origin, (sched.routePoints || []).slice(ts.stopIndex, ts.stopIndex + 1));
        if (waypoints.length < 2) continue;

        const cacheKey = cacheKeyFor(sched.id, ts.stopIndex, origin, waypoints.length, blockSig);
        let positions = routeCache.get(cacheKey);
        let source = routeCache.has(cacheKey) ? (blockSig ? "reroute" : "ors") : "straight";

        if (!positions) {
          if (blockSig) {
            // Blocked streets re-route through the local street graph.
            positions = computeRoute(waypoints, blocks.map((b) => b.edge));
            source = "reroute";
          } else {
            positions = waypoints.map((p) => [p.lat, p.lng]);
            if (ORS_KEY && Date.now() >= backoffUntil) {
              let job = inflight.get(cacheKey);
              if (!job) {
                job = fetchOrs(waypoints)
                  .then((orsPositions) => {
                    routeCache.set(cacheKey, orsPositions);
                    return orsPositions;
                  })
                  .finally(() => inflight.delete(cacheKey));
                inflight.set(cacheKey, job);
              }
              try {
                positions = await job;
                source = "ors";
              } catch (err) {
                const now = Date.now();
                if (err.status === 401 || err.status === 403) backoffUntil = now + 5 * 60 * 1000;
                else if (err.status === 429) backoffUntil = now + 60 * 1000;
                else backoffUntil = now + 30 * 1000;
              }
            }
          }
          if (source !== "straight" && positions && positions.length >= 2) routeCache.set(cacheKey, positions);
        }

        const withOrigin = [[origin.lat, origin.lng], ...positions.slice(1)];
        results.push({
          id: t.id,
          positions: withOrigin,
          source,
          heading: headingAlong(withOrigin),
        });
      }
      if (!cancelled) setRoutes(results);
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fleetKey, liveKey, blockSig]);

  return routes;
}
