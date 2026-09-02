// Shared route-geometry cache and helpers. Both the rendering hooks
// (use-route-path) and the movement simulation (live-route) read from this
// cache so the truck advances along exactly the same polyline that is drawn
// on the map (ORS street route, re-route detour, or straight fallback).

export const routeCache = new Map();
export const inflight = new Map();

export const round3 = (v) => Math.round(v * 1000) / 1000;
export const round4 = (v) => Math.round(v * 10000) / 10000;

export function buildWaypoints(origin, points) {
  const raw = [...(origin ? [origin] : []), ...(points || [])];
  const deduped = [];
  for (const p of raw) {
    const prev = deduped[deduped.length - 1];
    if (prev && round4(prev.lat) === round4(p.lat) && round4(prev.lng) === round4(p.lng)) continue;
    deduped.push(p);
  }
  return deduped;
}

export function blocksSignature(blocks) {
  return (blocks || []).map((b) => b.edge).sort().join("|");
}

export function cacheKeyFor(scheduleId, stopIndex, origin, count, blockSig = "") {
  const o = origin ? `${round3(origin.lat)},${round3(origin.lng)}` : "-";
  return `${scheduleId ?? "-"}|${stopIndex}|${o}|${count}|${blockSig}`;
}
