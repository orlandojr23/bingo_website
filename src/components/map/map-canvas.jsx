"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, useMap, ZoomControl } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import "leaflet-rotate";
import { StatusBadge, UrgencyBadge } from "@/components/ui/badge";
import { MapSkeleton } from "@/components/ui/skeletons";
import { Navigation } from "lucide-react";

// Fix default leaflet icons in Next.js
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const OSM_TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

// The system only operates in the Philippines (Metro Cebu focus), so every map
// is clamped to the archipelago: users can zoom out to see the whole country but
// no further, and cannot pan past its edges into neighboring countries.
const PH_MAX_BOUNDS = [
  [4.5, 116.7], // southwest: southern Mindanao / Palawan
  [21.2, 126.8], // northeast: Batanes / Philippine Sea
];
const PH_MIN_ZOOM = 6;
const PH_BOUNDS_VISCOSITY = 1.0;

const getUrgencyColor = (urgency) => {
  switch (urgency) {
    case "Critical":
      return "#E11D48";
    case "High":
      return "#EA580C";
    case "Medium":
      return "#D97706";
    case "Low":
    default:
      return "#059669";
  }
};

const createCustomIcon = (urgency) => {
  const color = getUrgencyColor(urgency);
  return L.divIcon({
    className: "custom-pin bg-transparent border-0",
    html: `
      <div style="display: flex; align-items: center; justify-content: center;">
        <svg width="18" height="18" viewBox="0 0 18 18" style="filter: drop-shadow(0px 2px 4px rgba(0,0,0,0.3));">
          <circle cx="9" cy="9" r="7" fill="${color}" stroke="#ffffff" stroke-width="2.5" />
        </svg>
      </div>
    `,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
    popupAnchor: [0, -9],
  });
};

const createRoadBlockIcon = () =>
  L.divIcon({
    className: "custom-road-block bg-transparent border-0",
    html: `
      <div style="position: relative; width: 26px; height: 26px; display: flex; align-items: center; justify-content: center;">
        <style>
          @keyframes roadBlockPulse {
            0% { transform: scale(0.7); opacity: 0.7; }
            100% { transform: scale(1.8); opacity: 0; }
          }
        </style>
        <div style="position: absolute; inset: 0; border-radius: 9999px; background: rgba(225, 29, 72, 0.35); animation: roadBlockPulse 1.6s ease-out infinite;"></div>
        <svg width="22" height="22" viewBox="0 0 22 22" style="position: relative; filter: drop-shadow(0px 2px 4px rgba(0,0,0,0.35));">
          <circle cx="11" cy="11" r="10" fill="#E11D48" stroke="#ffffff" stroke-width="2" />
          <rect x="5" y="9.25" width="12" height="3.5" rx="1.75" fill="#ffffff" />
        </svg>
      </div>
    `,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -13],
  });

const roadBlockIcon = createRoadBlockIcon();

const createTruckIcon = () => {
  return L.divIcon({
    className: "custom-truck bg-transparent border-0",
    html: `
      <div style="display: flex; align-items: center; justify-content: center; width: 44px; height: 44px; filter: drop-shadow(0px 4px 6px rgba(0,0,0,0.3)); animation: truckPopIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);">
        <style>
          @keyframes truckPopIn {
            0% { opacity: 0; transform: scale(0); }
            100% { opacity: 1; transform: scale(1); }
          }
          @keyframes truckFadeOut {
            from { opacity: 1; }
            to { opacity: 0; }
          }
        </style>
        <svg width="44" height="44" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* 4 Side Tires */}
          <rect x="7" y="9" width="3.5" height="7" rx="1.5" fill="#18181b" />
          <rect x="33.5" y="9" width="3.5" height="7" rx="1.5" fill="#18181b" />
          <rect x="6.5" y="27" width="4" height="8" rx="1.5" fill="#18181b" />
          <rect x="33.5" y="27" width="4" height="8" rx="1.5" fill="#18181b" />

          {/* Compactor Main Container Box */}
          <rect x="10" y="16" width="24" height="20" rx="3" fill="#10b981" stroke="#059669" stroke-width="1" />
          {/* Container Top 3D Roof Highlight */}
          <rect x="13" y="18" width="18" height="14" rx="2" fill="#34d399" opacity="0.9" />
          <line x1="10" y1="21" x2="34" y2="21" stroke="#047857" stroke-width="1.2" />
          <line x1="10" y1="26" x2="34" y2="26" stroke="#047857" stroke-width="1.2" />
          <line x1="10" y1="31" x2="34" y2="31" stroke="#047857" stroke-width="1.2" />

          {/* Rear Hopper Loader */}
          <rect x="12" y="35" width="20" height="3" rx="1" fill="#064e3b" />
          <rect x="15" y="35.5" width="4" height="2" fill="#facc15" />
          <rect x="25" y="35.5" width="4" height="2" fill="#facc15" />

          {/* 3D Cab Front Hood */}
          <path d="M 12 16 H 32 V 9 C 32 6.5 29.5 5 27 5 H 17 C 14.5 5 12 6.5 12 9 V 16 Z" fill="#059669" stroke="#047857" stroke-width="1" />

          {/* Side Mirrors */}
          <rect x="7.5" y="11" width="3" height="2" rx="0.5" fill="#047857" />
          <rect x="33.5" y="11" width="3" height="2" rx="0.5" fill="#047857" />

          {/* Glossy Sky Blue Curved Windshield */}
          <path d="M 14 11 H 30 L 28 14.5 H 16 L 14 11 Z" fill="#38bdf8" stroke="#e0f2fe" stroke-width="0.8" />
          <line x1="20" y1="11.5" x2="22" y2="14" stroke="#ffffff" stroke-width="1" opacity="0.8" />

          {/* LED Headlights */}
          <rect x="13.5" y="5" width="3.5" height="1.8" rx="0.5" fill="#facc15" />
          <rect x="27" y="5" width="3.5" height="1.8" rx="0.5" fill="#facc15" />
        </svg>
      </div>
    `,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    popupAnchor: [0, -22],
  });
};

// Single unrotated icon; TruckMarker rotates the inner element per frame so
// turns tween smoothly instead of swapping icons (which replays the pop-in).
const truckIcon = createTruckIcon();

const createStopPinIcon = (stop, { compact = false } = {}) => {
  const name = String(stop.name ?? "Next stop").replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const time = String(stop.time ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const num = stop.index != null ? stop.index + 1 : "";
  const svg = compact
    ? `<svg width="24" height="28" viewBox="0 0 24 28" style="filter: drop-shadow(0 1px 3px rgba(0,0,0,0.2));">
        <path d="M12 26 C 12 26 2 17 2 11 C 2 5.5 6.5 1 12 1 C 17.5 1 22 5.5 22 11 C 22 17 12 26 12 26 Z" fill="#059669" stroke="#ffffff" stroke-width="1.5" />
        ${num ? `<text x="12" y="11" text-anchor="middle" dominant-baseline="central" font-size="11" font-weight="700" fill="#ffffff" font-family="ui-sans-serif, system-ui, sans-serif">${num}</text>` : ""}
      </svg>`
    : `<svg width="36" height="42" viewBox="0 0 36 42" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.18));">
        <path d="M18 40 C 18 40 3 26 3 17 C 3 8.7 9.7 2 18 2 C 26.3 2 33 8.7 33 17 C 33 26 18 40 18 40 Z" fill="#059669" stroke="#ffffff" stroke-width="1.5" />
        ${num ? `<text x="18" y="17" text-anchor="middle" dominant-baseline="central" font-size="13" font-weight="700" fill="#ffffff" font-family="ui-sans-serif, system-ui, sans-serif">${num}</text>` : ""}
      </svg>`;
  const pill = `<div style="margin-top: ${compact ? 4 : 6}px; background: #ffffff; border: 1px solid rgba(24,24,27,0.08); border-radius: 999px; padding: ${compact ? "2px 8px" : "3px 10px"}; box-shadow: 0 2px 6px rgba(0,0,0,0.08); text-align: center; white-space: nowrap;">
          <div style="font-size: ${compact ? 9 : 10}px; font-weight: 600; color: #27272a; line-height: 1.3;">${name}</div>
          ${time ? `<div style="font-size: ${compact ? 7.5 : 8.5}px; font-weight: 600; color: #059669; line-height: 1.35;">${time}</div>` : ""}
        </div>`;
  return L.divIcon({
    className: "custom-stop-pin bg-transparent border-0",
    html: `
      <div data-compact="${compact ? "1" : "0"}" data-stop-index="${stop.index ?? ""}" style="display: flex; flex-direction: column; align-items: center; transform-origin: 50% 100%; animation: stopPinPopIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;">
        <style>
          @keyframes stopPinPopIn {
            0% { opacity: 0; transform: scale(0.2); }
            100% { opacity: 1; transform: scale(1); }
          }
          @keyframes stopPinFadeOut {
            from { opacity: 1; transform: scale(1); }
            to { opacity: 0; transform: scale(0.55); }
          }
        </style>
        ${svg}
        ${pill}
      </div>
    `,
    iconSize: compact ? [24, 28] : [36, 42],
    iconAnchor: compact ? [12, 26] : [18, 40],
    popupAnchor: compact ? [0, -26] : [0, -40],
  });
};

// Cache by stop identity + variant so re-renders keep the same icon and never
// replay the pop-in animation; a stopIndex change produces a fresh key, which is
// exactly when we want the pin to pop in again.
const stopPinCache = new Map();
const getStopPinIcon = (stop, compact = false) => {
  const key = `${stop.name ?? ""}|${stop.lat}|${stop.lng}|${stop.time ?? ""}|${stop.index ?? ""}|${compact ? "c" : "f"}`;
  let icon = stopPinCache.get(key);
  if (!icon) {
    icon = createStopPinIcon(stop, { compact });
    stopPinCache.set(key, icon);
  }
  return icon;
};

function StopPinMarker({ stop, fading, compact = false }) {
  const markerRef = useRef(null);

  useEffect(() => {
    const inner = markerRef.current?.getElement()?.firstElementChild;
    if (!inner) return;
    if (fading) {
      inner.style.animation = "stopPinFadeOut 0.45s ease-in forwards";
    }
  }, [fading]);

  return (
    <Marker
      ref={markerRef}
      position={[stop.lat, stop.lng]}
      icon={getStopPinIcon(stop, compact)}
      zIndexOffset={compact ? 1800 : 2000}
    />
  );
}

function TruckMarker({ trk, fading, bearing = 0 }) {
  const markerRef = useRef(null);
  const [view, setView] = useState({ lat: trk.lat, lng: trk.lng, rot: trk.heading ?? 90 });
  const viewRef = useRef(view);
  viewRef.current = view;
  const animRef = useRef(null);

  // New telemetry retargets the tween; position glides over the 5s update
  // cadence and heading eases faster so turns read like a nav arrow.
  useEffect(() => {
    const v = viewRef.current;
    animRef.current = {
      fromLat: v.lat,
      fromLng: v.lng,
      toLat: trk.lat,
      toLng: trk.lng,
      fromRot: v.rot,
      toRot: trk.heading ?? 90,
      start: performance.now(),
    };
  }, [trk.lat, trk.lng, trk.heading]);

  useEffect(() => {
    let raf;
    const loop = (now) => {
      const a = animRef.current;
      if (a) {
        const pk = Math.min(1, (now - a.start) / 4600);
        const rk = Math.min(1, (now - a.start) / 900);
        const dRot = ((a.toRot - a.fromRot + 540) % 360) - 180;
        const next = {
          lat: a.fromLat + (a.toLat - a.fromLat) * pk,
          lng: a.fromLng + (a.toLng - a.fromLng) * pk,
          rot: a.fromRot + dRot * rk,
        };
        const v = viewRef.current;
        if (next.lat !== v.lat || next.lng !== v.lng || next.rot !== v.rot) setView(next);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const inner = markerRef.current?.getElement()?.firstElementChild;
    if (!inner) return;
    if (fading) {
      inner.style.animation = "truckFadeOut 0.45s ease-in forwards";
      return;
    }
    inner.style.transform = `rotate(${view.rot - 90 - bearing}deg)`;
  }, [view.rot, bearing, fading]);

  return (
    <Marker
      ref={markerRef}
      position={[view.lat, view.lng]}
      icon={truckIcon}
    >
      <Popup>
        <div className="p-3 flex flex-col gap-1.5 min-w-[200px] text-zinc-900 font-sans">
          <div className="flex items-center gap-1.5 pb-1 border-b border-zinc-100">
            <span className="font-semibold text-xs text-zinc-900">
              Truck {trk.id}
            </span>
            <span className="text-xs text-emerald-600 font-semibold">
              • On Duty
            </span>
          </div>
          <div className="flex flex-col text-xs text-zinc-600 gap-0.5">
            <div><span className="font-semibold text-zinc-700">Driver:</span> {trk.driver}</div>
            <div><span className="font-semibold text-zinc-700">Plate:</span> {trk.plate}</div>
            {trk.capacity && <div><span className="font-semibold text-zinc-700">Load:</span> {trk.capacity}</div>}
            {trk.eta && <div className="text-emerald-600 font-bold mt-1">Arriving in: {trk.eta}</div>}
          </div>
        </div>
      </Popup>
    </Marker>
  );
}

function AnimatedRoute({ route, fading }) {
  const casingRef = useRef(null);
  const lineRef = useRef(null);

  useEffect(() => {
    const els = [casingRef.current?.getElement(), lineRef.current?.getElement()].filter(Boolean);
    if (!els.length) return;
    if (fading) {
      els.forEach((el) => {
        el.style.transition = "opacity 0.45s ease-in";
        el.style.opacity = "0";
      });
      return;
    }
    els.forEach((el) => {
      el.style.opacity = "0";
    });
    const raf = requestAnimationFrame(() => {
      els.forEach((el) => {
        el.style.transition = "opacity 0.5s ease-out";
        el.style.opacity = "1";
      });
    });
    return () => cancelAnimationFrame(raf);
  }, [fading]);

  return (
    <span>
      <Polyline
        ref={casingRef}
        positions={route.positions}
        pathOptions={{ color: "#ffffff", weight: 7, opacity: 0.9, interactive: false }}
      />
      <Polyline
        ref={lineRef}
        positions={route.positions}
        pathOptions={{ color: "#059669", weight: 4, opacity: 0.9, lineCap: "round", lineJoin: "round", interactive: false }}
      />
    </span>
  );
}

function MapCameraController({ center, zoom, onMapDrag, onBoundsChange, flySignal, bearing, onUserRotate }) {
  const map = useMap();
  const isFirstRender = useRef(true);
  const prevCenterRef = useRef(center);
  const prevZoomRef = useRef(zoom);
  const centerRef = useRef(center);
  const zoomRef = useRef(zoom);
  centerRef.current = center;
  zoomRef.current = zoom;
  const selfRotate = useRef(false);

  // Any rotation we did not trigger ourselves came from a user gesture
  // (two-finger rotate / shift+wheel), which pauses the auto camera.
  useEffect(() => {
    const handler = () => {
      if (!selfRotate.current) onUserRotate?.();
    };
    map.on("rotate", handler);
    return () => map.off("rotate", handler);
  }, [map, onUserRotate]);

  // Course-up camera (Waze-style): rotate the map so the travel heading is up.
  // bearing === null means the user is rotating manually; leave them alone.
  useEffect(() => {
    if (bearing == null || !map._rotate || typeof map.setBearing !== "function") return;
    const apply = (deg) => {
      selfRotate.current = true;
      map.setBearing(deg);
      selfRotate.current = false;
    };
    const target = bearing;
    const from = map.getBearing();
    const delta = ((target - from + 540) % 360) - 180;
    if (Math.abs(delta) < 0.5) {
      apply(target);
      return;
    }
    const start = performance.now();
    const dur = 900;
    let raf;
    const step = (now) => {
      const k = Math.min(1, (now - start) / dur);
      const e = k * (2 - k);
      apply(from + delta * e);
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [bearing, map]);

  // A manual drag moves the map without updating React state, so re-clicking a
  // recenter button sends identical center/zoom values; flySignal forces the fly.
  useEffect(() => {
    if (!flySignal) return;
    map.flyTo(centerRef.current, zoomRef.current, { animate: true, duration: 0.8 });
  }, [flySignal, map]);

  useEffect(() => {
    if (!onMapDrag) return;
    const handleDragStart = () => {
      onMapDrag();
    };
    map.on("dragstart", handleDragStart);
    return () => {
      map.off("dragstart", handleDragStart);
    };
  }, [map, onMapDrag]);

  useEffect(() => {
    if (!onBoundsChange) return;
    const report = () => {
      const b = map.getBounds();
      onBoundsChange({
        north: b.getNorth(),
        south: b.getSouth(),
        east: b.getEast(),
        west: b.getWest(),
      });
    };
    report();
    map.on("moveend", report);
    return () => {
      map.off("moveend", report);
    };
  }, [map, onBoundsChange]);

  useEffect(() => {
    // Multi-phase invalidateSize to handle tab transitions and mobile shell animations
    const t1 = setTimeout(() => map.invalidateSize(), 50);
    const t2 = setTimeout(() => map.invalidateSize(), 250);
    const t3 = setTimeout(() => map.invalidateSize(), 600);

    const handleResize = () => map.invalidateSize();
    window.addEventListener("resize", handleResize);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      window.removeEventListener("resize", handleResize);
    };
  }, [map]);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      prevCenterRef.current = center;
      prevZoomRef.current = zoom;
      return;
    }
    const [lat, lng] = center;
    const [prevLat, prevLng] = prevCenterRef.current || [];
    const centerChanged = lat !== prevLat || lng !== prevLng;
    const zoomChanged = zoom !== prevZoomRef.current;
    if (centerChanged) prevCenterRef.current = center;
    if (zoomChanged) prevZoomRef.current = zoom;
    if (zoomChanged) {
      map.flyTo([lat, lng], zoom, { animate: true, duration: 0.8 });
    } else if (centerChanged) {
      map.panTo([lat, lng], { animate: true, duration: 0.4 });
    }
  }, [center, zoom, map]);

  return null;
}

function MapReadyNotifier({ onReady, tileRef }) {
  const map = useMap();
  useEffect(() => {
    let done = false;
    const fire = () => {
      if (done) return;
      done = true;
      onReady();
    };
    const tl = tileRef.current;
    tl?.on("load", fire);
    const fallback = setTimeout(fire, 3000);
    return () => {
      clearTimeout(fallback);
      tl?.off("load", fire);
    };
  }, [map, onReady, tileRef]);
  return null;
}

function BearingWatcher({ onBearing }) {
  const map = useMap();
  useEffect(() => {
    const handler = () => onBearing(map.getBearing());
    map.on("rotate", handler);
    return () => map.off("rotate", handler);
  }, [map, onBearing]);
  return null;
}

export default function MapCanvas({ tickets = [], trucks = [], routes = [], roadBlocks = [], mapMode = "pins", center, zoom, highlightedTicketId, currentStop, upcomingStops = [], onSelectTicket, onMapDrag, onBoundsChange, flySignal, onMapReady, showZoomControl = false, showTicketPopup = true, rotatable = false, bearing = null }) {
  const [mounted, setMounted] = useState(false);
  const tileRef = useRef(null);
  const tejeroCenter = [10.3016, 123.9086];
  const mapCenter = center || tejeroCenter;
  const mapZoom = zoom ?? (center ? 16 : 14);

  // Free 360° rotation: a user gesture pauses the auto camera (course-up on
  // the driver map, north-up elsewhere) until the compass button resumes it.
  const [autoFollow, setAutoFollow] = useState(true);
  const [viewBearing, setViewBearing] = useState(0);
  const handleUserRotate = useCallback(() => setAutoFollow(false), []);
  const handleBearing = useCallback((deg) => setViewBearing(deg), []);

  const activeTrucks = (trucks || []).filter((trk) => trk && trk.isActive !== false);
  const [fadingTrucks, setFadingTrucks] = useState([]);
  const prevActiveRef = useRef(activeTrucks);

  useEffect(() => {
    const prev = prevActiveRef.current;
    prevActiveRef.current = activeTrucks;
    const currentIds = new Set(activeTrucks.map((t) => t.id));
    const removed = prev.filter((t) => !currentIds.has(t.id));
    if (!removed.length) return;
    setFadingTrucks((f) => [...f, ...removed]);
    const removedIds = new Set(removed.map((t) => t.id));
    setTimeout(() => {
      setFadingTrucks((f) => f.filter((x) => !removedIds.has(x.id)));
    }, 500);
  }, [trucks]);

  // Current-stop pin hand-off: when the stop changes (or disappears), keep
  // the previous pin around for 500ms playing its fade-out while the new one
  // pops in, so the transition reads as smooth instead of a hard swap.
  const stopKey = currentStop
    ? `${currentStop.name}|${currentStop.lat}|${currentStop.lng}`
    : null;
  const [fadingStop, setFadingStop] = useState(null);
  const prevStopRef = useRef(currentStop ?? null);
  const prevStopKeyRef = useRef(stopKey);

  useEffect(() => {
    const prev = prevStopRef.current;
    const prevKey = prevStopKeyRef.current;
    prevStopRef.current = currentStop ?? null;
    prevStopKeyRef.current = stopKey;
    if (!prev || prevKey === stopKey) return;
    setFadingStop(prev);
    const t = setTimeout(() => setFadingStop(null), 500);
    return () => clearTimeout(t);
  }, [stopKey]);

  // Route line hand-off: keyed by destination vertex, so advancing to the
  // next stop fades the old leg out while the new leg fades in; GPS wobble
  // on the origin vertex does not trigger a hand-off.
  const routeSig = (r) => {
    const last = r.positions?.[r.positions.length - 1];
    return `${r.id}|${last ? `${last[0].toFixed(4)},${last[1].toFixed(4)}` : "-"}`;
  };
  const [fadingRoutes, setFadingRoutes] = useState([]);
  const prevRoutesRef = useRef(routes || []);

  useEffect(() => {
    const prev = prevRoutesRef.current;
    prevRoutesRef.current = routes || [];
    const nextSigs = new Map((routes || []).map((r) => [r.id, routeSig(r)]));
    const outgoing = prev.filter((r) => nextSigs.get(r.id) !== routeSig(r));
    if (!outgoing.length) return;
    setFadingRoutes((f) => [
      ...f.filter((x) => !outgoing.some((r) => r.id === x.id)),
      ...outgoing,
    ]);
    setTimeout(() => {
      setFadingRoutes((f) => f.filter((x) => !outgoing.some((r) => r.id === x.id)));
    }, 500);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routes]);

  const activeIds = new Set(activeTrucks.map((t) => t.id));
  const fadingOnly = fadingTrucks.filter((t) => !activeIds.has(t.id));
  const fadingIds = new Set(fadingOnly.map((t) => t.id));

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(t);
  }, []);

  if (!mounted) {
    return <MapSkeleton />;
  }

  const highlightedTicket = highlightedTicketId ? tickets.find(t => t.id === highlightedTicketId) : null;

  // The `bearing` prop uses the app heading convention (heading = compass + 90).
  // Course-up means rotating the map by -compass so travel points up, while the
  // truck marker (unrotated pane) compensates by the compass value to stay up.
  const compassBearing = bearing == null ? null : (((bearing - 90) % 360) + 360) % 360;
  const cameraBearing = compassBearing == null ? null : (360 - compassBearing) % 360;

  // Shortest angular distance of the live map rotation from its rest bearing,
  // used to decide when the compass reset button is worth showing.
  const normBearing = (((viewBearing % 360) + 540) % 360) - 180;
  const showCompass = rotatable || Math.abs(normBearing) > 2;

  return (
    <div className="w-full h-full relative">
      <MapContainer
        center={mapCenter}
        zoom={mapZoom}
        scrollWheelZoom={true}
        attributionControl={false}
        zoomControl={false}
        rotate
        rotateControl={false}
        touchRotate={true}
        minZoom={PH_MIN_ZOOM}
        maxBounds={PH_MAX_BOUNDS}
        maxBoundsViscosity={PH_BOUNDS_VISCOSITY}
        className="w-full h-full z-10"
      >
        <MapCameraController center={mapCenter} zoom={mapZoom} onMapDrag={onMapDrag} onBoundsChange={onBoundsChange} flySignal={flySignal} bearing={autoFollow ? (rotatable ? cameraBearing : 0) : null} onUserRotate={handleUserRotate} />
        <BearingWatcher onBearing={handleBearing} />
        {showZoomControl && <ZoomControl position="topleft" />}
        
        {/* OpenStreetMap standard tiles (no API key required) */}
        <TileLayer
          ref={tileRef}
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url={OSM_TILE_URL}
          maxZoom={19}
          detectRetina={true}
        />
        {onMapReady && <MapReadyNotifier onReady={onMapReady} tileRef={tileRef} />}



        {/* Heatmap / Accumulation Density Circles */}
        {(mapMode === "heatmap" || mapMode === "combined") &&
          tickets.map((t) => {
            const color = getUrgencyColor(t.urgency);
            const radius = t.urgency === "Critical" ? 150 : t.urgency === "High" ? 120 : t.urgency === "Medium" ? 100 : 80;
            return (
              <span key={`heat-group-${t.id}`}>
                {/* Outer Glow Circle */}
                <Circle
                  center={[t.lat, t.lng]}
                  radius={radius}
                  pathOptions={{
                    stroke: false,
                    fillColor: color,
                    fillOpacity: 0.06,
                    interactive: false,
                  }}
                />
                {/* Inner Core Circle */}
                <Circle
                  center={[t.lat, t.lng]}
                  radius={radius * 0.4}
                  pathOptions={{
                    stroke: false,
                    fillColor: color,
                    fillOpacity: 0.18,
                    interactive: false,
                  }}
                />
              </span>
            );
          })}

        {/* Route Trajectories (only the current leg up to the stop pin;
            old legs fade out while new ones fade in on stop changes) */}
        {fadingRoutes.map((r) => r.positions.length >= 2 && (
          <AnimatedRoute
            key={`route-fading-${routeSig(r)}`}
            route={r}
            fading
          />
        ))}
        {(routes || []).map((r) => r.positions.length >= 2 && (
          <AnimatedRoute
            key={`route-${routeSig(r)}`}
            route={r}
            fading={false}
          />
        ))}

        {/* Road Blocks (blocked streets forcing automatic re-routes) */}
        {(roadBlocks || []).map((b) => (
          <Marker
            key={`road-block-${b.id}`}
            position={[b.lat, b.lng]}
            icon={roadBlockIcon}
            zIndexOffset={1500}
          >
            <Popup>
              <div className="p-3 flex flex-col gap-1 min-w-[180px] text-zinc-900 font-sans">
                <div className="flex items-center gap-1.5 pb-1 border-b border-zinc-100">
                  <span className="font-semibold text-xs text-rose-600">Road Blocked</span>
                </div>
                <div className="text-xs text-zinc-600">{b.reason || "Blocked road"}</div>
                {b.reportedBy && (
                  <div className="text-xs text-zinc-500">Reported by {b.reportedBy}</div>
                )}
                <div className="text-xs text-emerald-600 font-bold mt-0.5">
                  Trucks are re-routing around this street.
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Point Markers */}
        {(mapMode === "pins" || mapMode === "combined") &&
          tickets.map((t) => {
            const isHighlighted = highlightedTicketId === t.id;
            return (
              <Marker
                key={`pin-${t.id}`}
                position={[t.lat, t.lng]}
                icon={createCustomIcon(t.urgency)}
                zIndexOffset={isHighlighted ? 1000 : 0}
                eventHandlers={
                  !showTicketPopup && onSelectTicket
                    ? { click: () => onSelectTicket(t) }
                    : undefined
                }
              >
                {showTicketPopup && (
                <Popup>
                  <div className="p-3.5 flex flex-col gap-2 min-w-[220px] max-w-[260px] text-zinc-900 font-sans">
                    <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-zinc-100">
                      <span className="font-mono font-semibold text-xs text-zinc-900">
                        {t.id}
                      </span>
                      <UrgencyBadge urgency={t.urgency} />
                    </div>

                    <div className="flex flex-col">
                      <span className="font-semibold text-xs text-zinc-900">
                        {t.location}
                      </span>
                      <span className="text-xs text-zinc-500">
                        {t.barangay}, {t.city || "Cebu City"}
                      </span>
                    </div>

                    <p className="text-xs text-zinc-600 line-clamp-2 leading-relaxed">
                      {t.description}
                    </p>

                    <div className="flex items-center justify-between pt-2 border-t border-zinc-100 mt-0.5">
                      <StatusBadge status={t.status} />
                      <span className="text-xs text-zinc-400 font-mono">
                        {t.date}
                      </span>
                    </div>
                  </div>
                </Popup>
                )}
              </Marker>
            );
          })}

        {/* Truck Markers (Only render active trucks on route; fading ones finish their fade-out) */}
        {[...activeTrucks, ...fadingOnly].map((trk) => (
          <TruckMarker
            key={`truck-${trk.id}`}
            trk={trk}
            fading={fadingIds.has(trk.id)}
            bearing={rotatable ? (compassBearing ?? 0) : 0}
          />
        ))}

        {/* Current Stop Pin (hands off smoothly from sitio to sitio) */}
        {fadingStop && (
          <StopPinMarker
            key={`stop-pin-fading-${fadingStop.name}-${fadingStop.lat}-${fadingStop.lng}`}
            stop={fadingStop}
            fading
          />
        )}
        {currentStop && (
          <StopPinMarker
            key={`stop-pin-${stopKey}`}
            stop={currentStop}
            fading={false}
          />
        )}
        {(upcomingStops || []).map((s) => (
          <StopPinMarker
            key={`upcoming-pin-${s.index}-${s.lat}-${s.lng}`}
            stop={s}
            compact
            fading={false}
          />
        ))}
      </MapContainer>
      {showCompass && (
        <button
          type="button"
          aria-label="Reset map orientation"
          onClick={() => setAutoFollow(true)}
          className="absolute top-3 right-3 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-lg ring-1 ring-black/10 transition hover:bg-zinc-50 active:scale-95"
        >
          <Navigation
            className="h-5 w-5 text-emerald-600"
            style={{ transform: `rotate(${viewBearing}deg)` }}
          />
        </button>
      )}
    </div>
  );
}
