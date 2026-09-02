import { useEffect, useRef, useState } from "react";
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

// The truck icon faces north at rotation 0 and rotates clockwise by
// (heading - 90), so heading = compass bearing + 90. Project the origin onto
// the nearest route segment and use that segment's direction, so vertices the
// truck already passed can never flip the heading ~180°.
function headingAlong(positions) {
  if (positions.length < 2) return null;
  const origin = { lat: positions[0][0], lng: positions[0][1] };
  const mLat = 111320;
  const mLng = 111320 * Math.cos((origin.lat * Math.PI) / 180);
  // Segment 0 is the pinned origin→first cached vertex; once the truck moves
  // it points backwards, so ignore it when real geometry follows.
  const startSeg = positions.length > 2 ? 1 : 0;
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
    if (!best || dist < best.dist) best = { dist, a, b };
  }
  return Math.round((bearingDeg(best.a, best.b) + 90) % 360);
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

export function useRoutePath({ scheduleId, stopIndex = 0, origin = null, points = [], blocks = [], enabled = true }) {
  const waypoints = enabled ? buildWaypoints(origin, points) : [];
  const blockSig = blocksSignature(blocks);
  const cacheKey = cacheKeyFor(scheduleId, stopIndex, origin, waypoints.length, blockSig);

  const [state, setState] = useState(() => {
    const cached = routeCache.get(cacheKey);
    return {
      positions: waypoints.length >= 2 ? (cached ?? waypoints.map((p) => [p.lat, p.lng])) : [],
      source: cached ? (blockSig ? "reroute" : "ors") : "straight",
      ready: waypoints.length >= 2,
    };
  });

  const lastKeyRef = useRef(cacheKey);
  if (lastKeyRef.current !== cacheKey) {
    lastKeyRef.current = cacheKey;
    const cached = routeCache.get(cacheKey);
    setState({
      positions: waypoints.length >= 2 ? (cached ?? waypoints.map((p) => [p.lat, p.lng])) : [],
      source: cached ? (blockSig ? "reroute" : "ors") : "straight",
      ready: waypoints.length >= 2,
    });
  }

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

    if (!ORS_KEY) return;
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
        const waypoints = buildWaypoints(origin, sched.routePoints.slice(ts.stopIndex, ts.stopIndex + 1));
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
