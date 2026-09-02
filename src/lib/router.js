// Client-side street router for Brgy. Tejero. A small deterministic road
// graph lets the app re-route collection trajectories around reported road
// blocks in realtime (Waze-style) without any external routing service.

const LAT_MIN = 10.3002;
const LAT_STEP = 0.0012;
const ROWS = 7;
const LNG_MIN = 123.9006;
const LNG_STEP = 0.0012;
const COLS = 10;

const METERS_PER_DEG_LAT = 111320;

function metersPerDegLng(lat) {
  return METERS_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180);
}

function distanceMeters(aLat, aLng, bLat, bLng) {
  const dy = (bLat - aLat) * METERS_PER_DEG_LAT;
  const dx = (bLng - aLng) * metersPerDegLng((aLat + bLat) / 2);
  return Math.hypot(dx, dy);
}

const nodeId = (r, c) => `${r}:${c}`;
export const edgeKey = (a, b) => (a < b ? `${a}~${b}` : `${b}~${a}`);

const nodes = [];
const nodeIndex = new Map();
for (let r = 0; r < ROWS; r++) {
  for (let c = 0; c < COLS; c++) {
    nodeIndex.set(nodeId(r, c), nodes.length);
    nodes.push({ id: nodeId(r, c), r, c, lat: LAT_MIN + r * LAT_STEP, lng: LNG_MIN + c * LNG_STEP });
  }
}

// Deterministic "organic" gaps in the grid; backbone rows/columns always
// stay connected so a block never strands an entire area.
const keepHorizontal = (r, c) => r === 0 || r === 3 || r === ROWS - 1 || ((r * 7 + c * 13) % 9 !== 0);
const keepVertical = (r, c) => c === 0 || c === 4 || c === COLS - 1 || ((r * 31 + c * 17) % 8 !== 0);

const adjacency = nodes.map(() => []);

function link(a, b) {
  const ia = nodeIndex.get(a);
  const ib = nodeIndex.get(b);
  const dist = distanceMeters(nodes[ia].lat, nodes[ia].lng, nodes[ib].lat, nodes[ib].lng);
  const key = edgeKey(a, b);
  adjacency[ia].push({ to: ib, dist, key });
  adjacency[ib].push({ to: ia, dist, key });
}

for (let r = 0; r < ROWS; r++) {
  for (let c = 0; c < COLS; c++) {
    if (c + 1 < COLS && keepHorizontal(r, c)) link(nodeId(r, c), nodeId(r, c + 1));
    if (r + 1 < ROWS && keepVertical(r, c)) link(nodeId(r, c), nodeId(r + 1, c));
  }
}

export function snapToNode(lat, lng) {
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < nodes.length; i++) {
    const d = distanceMeters(lat, lng, nodes[i].lat, nodes[i].lng);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  }
  return nodes[best];
}

const allEdges = (() => {
  const seen = new Map();
  adjacency.forEach((edges, i) => {
    for (const e of edges) {
      if (i > e.to) continue;
      const a = nodes[i];
      const b = nodes[e.to];
      seen.set(e.key, {
        key: e.key,
        a: a.id,
        b: b.id,
        lat: (a.lat + b.lat) / 2,
        lng: (a.lng + b.lng) / 2,
      });
    }
  });
  return [...seen.values()];
})();

export function nearestEdge(lat, lng) {
  let best = null;
  let bestDist = Infinity;
  for (const edge of allEdges) {
    const d = distanceMeters(lat, lng, edge.lat, edge.lng);
    if (d < bestDist) {
      bestDist = d;
      best = edge;
    }
  }
  return best;
}

export function getEdge(key) {
  return allEdges.find((e) => e.key === key) || null;
}

// Dijkstra over the street graph while skipping blocked edges. Returns
// [[lat, lng], ...] along the roads, or null when no path exists.
function shortestLeg(fromIdx, toIdx, blocked) {
  if (fromIdx === toIdx) return [nodes[fromIdx]];
  const dist = new Float64Array(nodes.length).fill(Infinity);
  const prev = new Int32Array(nodes.length).fill(-1);
  const visited = new Uint8Array(nodes.length);
  dist[fromIdx] = 0;

  for (let iter = 0; iter < nodes.length; iter++) {
    let u = -1;
    let uDist = Infinity;
    for (let i = 0; i < nodes.length; i++) {
      if (!visited[i] && dist[i] < uDist) {
        uDist = dist[i];
        u = i;
      }
    }
    if (u === -1 || uDist === Infinity) break;
    if (u === toIdx) break;
    visited[u] = 1;
    for (const e of adjacency[u]) {
      if (blocked.has(e.key)) continue;
      const alt = dist[u] + e.dist;
      if (alt < dist[e.to]) {
        dist[e.to] = alt;
        prev[e.to] = u;
      }
    }
  }

  if (dist[toIdx] === Infinity) return null;
  const path = [];
  for (let cur = toIdx; cur !== -1; cur = prev[cur]) path.push(nodes[cur]);
  path.reverse();
  return path;
}

// When both waypoints of a leg snap to the same intersection, a block on a
// street touching that intersection would otherwise be invisible. Force a
// short loop around the nearest block (4 grid edges) so the trajectory
// visibly detours.
function blockedSameNodeDetour(fromIdx, blocked) {
  const touchesBlock = adjacency[fromIdx].some((e) => blocked.has(e.key));
  if (!touchesBlock) return null;
  const open = adjacency[fromIdx].filter((e) => !blocked.has(e.key));
  for (let i = 0; i < open.length; i++) {
    for (let j = i + 1; j < open.length; j++) {
      const x = open[i].to;
      const y = open[j].to;
      for (const ex of adjacency[x]) {
        if (ex.to === fromIdx || blocked.has(ex.key)) continue;
        const z = ex.to;
        const zy = adjacency[z].find((e) => e.to === y && !blocked.has(e.key));
        if (zy) return [nodes[fromIdx], nodes[x], nodes[z], nodes[y], nodes[fromIdx]];
      }
    }
  }
  return null;
}

// Route through a list of waypoints along the street graph, avoiding the
// blocked edge keys. Falls back to straight lines for legs with no path.
export function computeRoute(waypoints, blockedEdgeKeys = []) {
  if (!waypoints || waypoints.length < 2) return [];
  const blocked = new Set(blockedEdgeKeys);
  const positions = [];

  for (let i = 0; i < waypoints.length - 1; i++) {
    const a = waypoints[i];
    const b = waypoints[i + 1];
    const fromIdx = nodeIndex.get(snapToNode(a.lat, a.lng).id);
    const toIdx = nodeIndex.get(snapToNode(b.lat, b.lng).id);
    const leg =
      fromIdx === toIdx ? blockedSameNodeDetour(fromIdx, blocked) : shortestLeg(fromIdx, toIdx, blocked);
    const legPositions = leg
      ? leg.map((n) => [n.lat, n.lng])
      : [[a.lat, a.lng], [b.lat, b.lng]];

    for (const p of legPositions) {
      const last = positions[positions.length - 1];
      if (last && last[0] === p[0] && last[1] === p[1]) continue;
      positions.push(p);
    }
  }

  // Pin both ends exactly to the requested waypoints
  if (positions.length >= 1) {
    positions[0] = [waypoints[0].lat, waypoints[0].lng];
    positions[positions.length - 1] = [
      waypoints[waypoints.length - 1].lat,
      waypoints[waypoints.length - 1].lng,
    ];
  }
  return positions;
}
