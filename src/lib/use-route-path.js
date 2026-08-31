import { useEffect, useRef, useState } from "react";
import { getSchedule } from "@/lib/live-route";

const ORS_URL = "https://api.openrouteservice.org/v2/directions/driving-car/geojson";
const ORS_KEY = process.env.NEXT_PUBLIC_ORS_API_KEY || "";

const routeCache = new Map();
const inflight = new Map();
let backoffUntil = 0;

const round3 = (v) => Math.round(v * 1000) / 1000;
const round4 = (v) => Math.round(v * 10000) / 10000;

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

// The truck icon faces north at rotation 0 and rotates clockwise by
// (heading - 90), so heading = compass bearing + 90.
function headingAlong(positions, lookAheadM = 12) {
  const origin = { lat: positions[0][0], lng: positions[0][1] };
  let target = positions[positions.length - 1];
  for (let i = 1; i < positions.length; i++) {
    const p = { lat: positions[i][0], lng: positions[i][1] };
    if (distanceMeters(origin, p) >= lookAheadM) {
      target = p;
      break;
    }
  }
  return Math.round((bearingDeg(origin, target) + 90) % 360);
}

function buildWaypoints(origin, points) {
  const raw = [...(origin ? [origin] : []), ...(points || [])];
  const deduped = [];
  for (const p of raw) {
    const prev = deduped[deduped.length - 1];
    if (prev && round4(prev.lat) === round4(p.lat) && round4(prev.lng) === round4(p.lng)) continue;
    deduped.push(p);
  }
  return deduped;
}

function cacheKeyFor(scheduleId, stopIndex, origin, count) {
  const o = origin ? `${round3(origin.lat)},${round3(origin.lng)}` : "-";
  return `${scheduleId ?? "-"}|${stopIndex}|${o}|${count}`;
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

export function useRoutePath({ scheduleId, stopIndex = 0, origin = null, points = [], enabled = true }) {
  const waypoints = enabled ? buildWaypoints(origin, points) : [];
  const cacheKey = cacheKeyFor(scheduleId, stopIndex, origin, waypoints.length);

  const [state, setState] = useState(() => {
    const cached = routeCache.get(cacheKey);
    return {
      positions: waypoints.length >= 2 ? (cached ?? waypoints.map((p) => [p.lat, p.lng])) : [],
      source: cached ? "ors" : "straight",
      ready: waypoints.length >= 2,
    };
  });

  const lastKeyRef = useRef(cacheKey);
  if (lastKeyRef.current !== cacheKey) {
    lastKeyRef.current = cacheKey;
    const cached = routeCache.get(cacheKey);
    setState({
      positions: waypoints.length >= 2 ? (cached ?? waypoints.map((p) => [p.lat, p.lng])) : [],
      source: cached ? "ors" : "straight",
      ready: waypoints.length >= 2,
    });
  }

  useEffect(() => {
    if (!enabled || waypoints.length < 2 || !ORS_KEY) return;
    if (Date.now() < backoffUntil) return;
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
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey, enabled]);

  // Keep the line's first vertex pinned to the live truck position so the
  // trajectory always connects to the marker between ORS refetches, and face
  // the marker along the road direction it is about to travel.
  const positions =
    origin && state.positions.length >= 2
      ? [[origin.lat, origin.lng], ...state.positions.slice(1)]
      : state.positions;
  return {
    ...state,
    positions,
    heading: origin && positions.length >= 2 ? headingAlong(positions) : null,
  };
}

export function useTruckRoutes(live, fleet) {
  const [routes, setRoutes] = useState([]);

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
        const waypoints = buildWaypoints(origin, sched.routePoints.slice(ts.stopIndex));
        if (waypoints.length < 2) continue;

        const cacheKey = cacheKeyFor(sched.id, ts.stopIndex, origin, waypoints.length);
        let positions = routeCache.get(cacheKey);
        if (!positions) {
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
            } catch (err) {
              const now = Date.now();
              if (err.status === 401 || err.status === 403) backoffUntil = now + 5 * 60 * 1000;
              else if (err.status === 429) backoffUntil = now + 60 * 1000;
              else backoffUntil = now + 30 * 1000;
            }
          }
        }

        const withOrigin = [[origin.lat, origin.lng], ...positions.slice(1)];
        results.push({
          id: t.id,
          positions: withOrigin,
          source: routeCache.has(cacheKey) ? "ors" : "straight",
          heading: headingAlong(withOrigin),
        });
      }
      if (!cancelled) setRoutes(results);
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fleetKey, liveKey]);

  return routes;
}
