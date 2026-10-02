"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { MapSkeleton } from "@/components/ui/skeletons";
import { Navigation } from "lucide-react";
import { SERVICE_AREAS } from "@/lib/mock-data";

// OpenFreeMap Bright — free keyless vector tiles (OpenMapTiles schema), no
// API key, with glyphs + sprites so street labels render natively. Unlike the
// old raster basemap, labels stay crisp and readable inside a pitched camera.
const VECTOR_STYLE_URL = "https://tiles.openfreemap.org/styles/bright";

// Metro Cebu Map Bounds & Zoom (Expanded map scope for Admin, Resident, and Driver)
// MapLibre maxBounds takes [southwest, northeast] in [lng, lat] order.
const METRO_CEBU_MAX_BOUNDS = [
  [123.7000, 10.1500], // SW Metro Cebu (Talisay / Minglanilla)
  [124.0800, 10.4800], // NE Metro Cebu (Mandaue / Lapu-Lapu / Liloan)
];
const METRO_CEBU_MIN_ZOOM = 11;

// True 3D drive camera (replaces the old CSS pseudo-tilt): pitch 60 reads as
// a Waze-style first-person view; 0 is flat top-down.
const DRIVE_PITCH = 60;
const FLAT_PITCH = 0;

// Screen-stable ahead offset for drive mode, in meters at zoom 18 (~150px
// below center on a typical phone, leaving more road visible ahead). Scales
// with zoom so the marker holds the same screen position at any level.
const DRIVE_AHEAD_METERS_AT_Z18 = 90;

function toLatLngTuple(pos) {
  if (!pos) return null;
  const lat = Array.isArray(pos) ? pos[0] : (pos.lat ?? pos.latitude);
  const lng = Array.isArray(pos) ? pos[1] : (pos.lng ?? pos.longitude);
  if (typeof lat !== "number" || typeof lng !== "number" || isNaN(lat) || isNaN(lng)) return null;
  return [lat, lng];
}

// Minimal HTML escaping for popup strings (ticket locations, driver names).
// The old Leaflet popups were JSX (auto-escaped); MapLibre popups take HTML
// strings, so user-controlled text must be escaped explicitly.
function esc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Waze-style ahead offset: aim the camera at a point ahead of the truck
// along the travel heading so the marker sits below center, leaving more
// road visible ahead. Pure geography (no map instance), so it holds at any
// zoom, bearing, or pitch. bearingApp uses the app heading convention
// (compass + 90); driveOn gates the offset to drive mode.
function aheadTarget(tuple, bearingApp, zoom, driveOn) {
  if (!driveOn || bearingApp == null || !tuple) return tuple;
  const compass = (((bearingApp - 90) % 360) + 360) % 360;
  const rad = (compass * Math.PI) / 180;
  const z = typeof zoom === "number" ? zoom : 18;
  const meters = DRIVE_AHEAD_METERS_AT_Z18 * Math.pow(2, 18 - Math.min(19, Math.max(14, z)));
  const [lat, lng] = tuple;
  const cosLat = Math.cos((lat * Math.PI) / 180) || 1;
  return [
    lat + (meters * Math.cos(rad)) / 111000,
    lng + (meters * Math.sin(rad)) / (111000 * cosLat),
  ];
}

// App heading (compass + 90) to a MapLibre bearing. MapLibre measures bearing
// counter-clockwise from north as the compass direction facing up-screen, so
// the value equals the plain compass heading.
function appHeadingToMlBearing(bearingApp) {
  if (bearingApp == null) return null;
  return (((bearingApp - 90) % 360) + 360) % 360;
}

// Shortest signed angular distance in degrees, wrapped to [-180, 180].
function angDelta(from, to) {
  return ((((to - from) % 360) + 540) % 360) - 180;
}

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

const urgencyDisplay = (urgency) => (urgency === "Critical" ? "Emergency" : (urgency ?? ""));

const statusDisplay = (status) => {
  if (status === "Pending") return "Waiting";
  if (status === "In Progress") return "On the Way";
  if (status === "Resolved") return "Cleaned Up";
  return status ?? "";
};

const statusTextColor = (status) => {
  switch (status) {
    case "Resolved":
    case "Completed":
    case "Active":
    case "On Duty":
      return "text-emerald-700";
    case "In Progress":
    case "Assigned":
    case "Accepted":
      return "text-blue-700";
    case "Pending":
    case "Paused":
      return "text-amber-700";
    case "Suspended":
    case "Cancelled":
      return "text-rose-700";
    case "Inactive":
    case "Off Duty":
    case "Unassigned":
      return "text-zinc-500";
    case "Scheduled":
    default:
      return "text-zinc-700";
  }
};

const urgencyTextColor = (urgency) => {
  switch (urgency) {
    case "Critical":
      return "text-rose-700";
    case "High":
      return "text-orange-700";
    case "Medium":
      return "text-amber-700";
    case "Low":
      return "text-zinc-600";
    default:
      return "text-zinc-700";
  }
};

function formatTicketTimestamp(t) {
  if (t.timestamp) {
    try {
      const d = new Date(t.timestamp);
      return `${d.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })} · ${d.toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" })}`;
    } catch {
      return "";
    }
  }
  return `${t.date || ""}${t.time ? ` · ${t.time}` : ""}`;
}

// ---- Marker elements (plain DOM for maplibregl.Marker) --------------------
// Entrance/fade keyframes keep their Leaflet-era names so the marker effects
// below (and their timings) behave exactly as before.

function makeTicketEl(urgency) {
  const color = getUrgencyColor(urgency);
  const el = document.createElement("div");
  el.className = "custom-pin bg-transparent border-0";
  el.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: center; transform-origin: 50% 50%; animation: ticketPinPopIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);">
      <style>
        @keyframes ticketPinPopIn {
          0% { opacity: 0; transform: scale(0.2); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes ticketPinFadeOut {
          from { opacity: 1; transform: scale(1); }
          to { opacity: 0; transform: scale(0.5); }
        }
      </style>
      <svg width="18" height="18" viewBox="0 0 18 18" style="filter: drop-shadow(0px 2px 4px rgba(0,0,0,0.3));">
        <circle cx="9" cy="9" r="7" fill="${color}" stroke="#ffffff" stroke-width="2.5" />
      </svg>
    </div>
  `;
  return el;
}

function makeTruckEl() {
  const el = document.createElement("div");
  el.className = "custom-truck bg-transparent border-0";
  el.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: center; width: 48px; height: 48px; filter: drop-shadow(0px 3px 5px rgba(0,0,0,0.28)); animation: truckPopIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);">
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
      <svg data-arrow width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" style="transform-origin: 50% 50%;">
        <!-- Top-down compactor truck, nose pointing up (north at rest) so the
             existing heading rotation keeps working. White strokes lift it
             off any basemap. -->
        <!-- wheels -->
        <g fill="#27272a">
          <rect x="12" y="11" width="4.5" height="8" rx="1.5" />
          <rect x="31.5" y="11" width="4.5" height="8" rx="1.5" />
          <rect x="12" y="31" width="4.5" height="8" rx="1.5" />
          <rect x="31.5" y="31" width="4.5" height="8" rx="1.5" />
        </g>
        <!-- compactor body -->
        <rect x="16" y="16" width="16" height="24" rx="3" fill="#059669" stroke="#ffffff" stroke-width="2" />
        <!-- body ribs -->
        <g stroke="#047857" stroke-width="1.4" stroke-linecap="round">
          <line x1="18.5" y1="22.5" x2="29.5" y2="22.5" />
          <line x1="18.5" y1="27.5" x2="29.5" y2="27.5" />
          <line x1="18.5" y1="32.5" x2="29.5" y2="32.5" />
        </g>
        <!-- rear hopper -->
        <rect x="16" y="35.5" width="16" height="5" rx="2" fill="#065f46" />
        <!-- cab -->
        <rect x="17" y="7.5" width="14" height="9.5" rx="2.5" fill="#f4f4f5" stroke="#ffffff" stroke-width="2" />
        <!-- windshield -->
        <rect x="19.5" y="10" width="9" height="3.6" rx="1.6" fill="#7DD3FC" />
        <!-- headlights -->
        <circle cx="18.4" cy="8.2" r="1.3" fill="#FDE047" />
        <circle cx="29.6" cy="8.2" r="1.3" fill="#FDE047" />
      </svg>
    </div>
  `;
  el.style.zIndex = "5000";
  return el;
}

function stopPinInnerHTML(stop, compact = false) {
  const name = esc(stop.name ?? "Next stop");
  const time = esc(stop.time ?? "");

  const svg = compact
    ? `<svg width="26" height="30" viewBox="0 0 24 28" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.22));">
        <circle cx="12" cy="10.5" r="7" fill="#ffffff" stroke="#059669" stroke-width="3.5" />
        <path d="M8.5 16.5 L12 24 L15.5 16.5 Z" fill="#059669" />
        ${stop.index != null ? `<text x="12" y="10.5" text-anchor="middle" dominant-baseline="central" font-size="7" font-weight="800" fill="#059669" font-family="ui-sans-serif, system-ui, sans-serif">${stop.index + 1}</text>` : ""}
      </svg>`
    : `<svg width="36" height="42" viewBox="0 0 36 42" style="filter: drop-shadow(0 2px 5px rgba(0,0,0,0.25));">
        <circle cx="18" cy="15" r="11" fill="#ffffff" stroke="#059669" stroke-width="5" />
        <path d="M12.5 24 L18 35 L23.5 24 Z" fill="#059669" />
        ${stop.index != null ? `<text x="18" y="15" text-anchor="middle" dominant-baseline="central" font-size="10" font-weight="800" fill="#059669" font-family="ui-sans-serif, system-ui, sans-serif">${stop.index + 1}</text>` : ""}
      </svg>`;

  const pill = compact
    ? ""
    : `<div style="margin-bottom: 4px; background: #ffffff; border: 1px solid rgba(24,24,27,0.12); border-radius: 999px; padding: 3px 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.14); text-align: center; white-space: nowrap;">
        <div style="font-size: 10px; font-weight: 700; color: #18181b; line-height: 1.3;">${name}</div>
        ${time ? `<div style="font-size: 8.5px; font-weight: 600; color: #059669; line-height: 1.35;">${time}</div>` : ""}
      </div>`;

  return `
    <div data-compact="${compact ? "1" : "0"}" data-stop-index="${stop.index ?? ""}" style="display: flex; flex-direction: column-reverse; align-items: center; pointer-events: none; transform-origin: 50% 100%; animation: stopPinPopIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; font-family: ui-sans-serif, system-ui, -apple-system, sans-serif;">
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
  `;
}

function makeStopEl(stop, compact = false) {

  const iconWidth = compact ? 26 : 36;
  const el = document.createElement("div");
  el.className = "custom-stop-pin bg-transparent border-0";
  el.style.width = `${iconWidth}px`;
  // Positioning is owned by maplibregl.Marker (anchor:'bottom' at the call
  // site, like the old iconAnchor) — never transform the element directly.
  el.innerHTML = stopPinInnerHTML(stop, compact);
  el.style.zIndex = compact ? "1800" : "2000";
  return el;
}

// ---- Popup HTML (MapLibre popups take HTML strings) ------------------------

function ticketPopupHTML(t) {
  return `
    <div style="display:flex;flex-direction:column;gap:8px;min-width:220px;max-width:260px;color:#18181b;font-family:ui-sans-serif,system-ui,sans-serif;">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding-bottom:6px;border-bottom:1px solid #f4f4f5;">
        <span style="font-family:ui-monospace,monospace;font-weight:600;font-size:12px;">${esc(t.id)}</span>
        <span style="display:inline-flex;align-items:center;padding:4px 10px;border-radius:8px;font-size:12px;font-weight:600;white-space:nowrap;" class="${urgencyTextColor(t.urgency)}">${esc(urgencyDisplay(t.urgency))}</span>
      </div>
      <div style="display:flex;flex-direction:column;">
        <span style="font-weight:600;font-size:12px;">${esc(t.location)}</span>
        <span style="font-size:12px;color:#71717a;">${esc(t.barangay)}${t.city ? `, ${esc(t.city)}` : ""}</span>
      </div>
      <p style="font-size:12px;color:#52525b;line-height:1.5;margin:0;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">
        ${esc(t.description || t.notes)}
      </p>
      <div style="display:flex;align-items:center;justify-content:space-between;padding-top:8px;border-top:1px solid #f4f4f5;margin-top:2px;">
        <span style="display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:8px;font-size:12px;font-weight:600;white-space:nowrap;" class="${statusTextColor(t.status)}"><span style="width:6px;height:6px;border-radius:999px;background:currentColor;opacity:0.85;"></span>${esc(statusDisplay(t.status))}</span>
        <span style="font-size:12px;color:#a1a1aa;font-family:ui-monospace,monospace;">${esc(formatTicketTimestamp(t))}</span>
      </div>
    </div>
  `;
}

function truckPopupHTML(trk) {
  const duty = trk.isActive
    ? `<span style="font-size:12px;color:#059669;font-weight:600;">• On Duty</span>`
    : `<span style="font-size:12px;color:#d97706;font-weight:600;">• Paused</span>`;
  return `
    <div style="display:flex;flex-direction:column;gap:6px;min-width:200px;color:#18181b;font-family:ui-sans-serif,system-ui,sans-serif;padding:12px;">
      <div style="display:flex;align-items:center;gap:6px;padding-bottom:4px;border-bottom:1px solid #f4f4f5;">
        <span style="font-weight:600;font-size:12px;">${esc(trk.id)}</span>
        ${duty}
      </div>
      <div style="display:flex;flex-direction:column;font-size:12px;color:#52525b;gap:2px;">
        <div><span style="font-weight:600;color:#3f3f46;">Driver:</span> ${esc(trk.driver)}</div>
        <div><span style="font-weight:600;color:#3f3f46;">Plate:</span> ${esc(trk.plate)}</div>
        ${trk.capacity ? `<div><span style="font-weight:600;color:#3f3f46;">Load:</span> ${esc(trk.capacity)}</div>` : ""}
        ${trk.eta ? `<div style="color:#059669;font-weight:700;margin-top:4px;">Arriving in: ${esc(trk.eta)}</div>` : ""}
      </div>
    </div>
  `;
}

// ---- Marker components (each owns one maplibregl.Marker) ------------------

function TicketMarker({ map, ticket: t, fading, highlighted, showTicketPopup, onSelectTicket }) {
  const markerRef = useRef(null);

  useEffect(() => {
    if (!map) return;
    const marker = new maplibregl.Marker({ element: makeTicketEl(t.urgency) })
      .setLngLat([t.lng, t.lat])
      .addTo(map);
    if (highlighted) marker.getElement().style.zIndex = "1000";
    markerRef.current = marker;
    const onClick = () => {
      if (!showTicketPopup && onSelectTicket) {
        onSelectTicket(t);
        return;
      }
      if (showTicketPopup) {
        new maplibregl.Popup({ offset: 12, maxWidth: "280px" })
          .setLngLat([t.lng, t.lat])
          .setHTML(ticketPopupHTML(t))
          .addTo(map);
      }
    };
    marker.getElement().addEventListener("click", onClick);
    return () => {
      marker.getElement().removeEventListener("click", onClick);
      marker.remove();
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  useEffect(() => {
    markerRef.current?.setLngLat([t.lng, t.lat]);
  }, [t.lat, t.lng]);

  useEffect(() => {
    const inner = markerRef.current?.getElement()?.firstElementChild;
    if (!inner) return;
    if (fading) {
      inner.style.animation = "ticketPinFadeOut 0.45s ease-in forwards";
    }
  }, [fading]);

  return null;
}

function StopPinMarker({ map, stop, fading, compact = false }) {
  const markerRef = useRef(null);

  useEffect(() => {
    if (!map) return;
    const marker = new maplibregl.Marker({ element: makeStopEl(stop, compact), anchor: "bottom" })
      .setLngLat([stop.lng, stop.lat])
      .addTo(map);
    markerRef.current = marker;
    return () => {
      marker.remove();
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  useEffect(() => {
    markerRef.current?.setLngLat([stop.lng, stop.lat]);
  }, [stop.lat, stop.lng]);

  useEffect(() => {
    const inner = markerRef.current?.getElement()?.firstElementChild;
    if (!inner) return;
    if (fading) {
      inner.style.animation = "stopPinFadeOut 0.45s ease-in forwards";
    }
  }, [fading]);

  return null;
}

function TruckMarker({ map, trk, fading }) {
  const markerRef = useRef(null);
  const [view, setView] = useState({ lat: trk.lat, lng: trk.lng });
  const viewRef = useRef(view);
  const animRef = useRef(null);
  // When the marker mounts (Start/Resume), the first road-snapped fix lands
  // just after the raw mount point. Fixes inside this window snap instead of
  // gliding so the truck appears on the road while the pop-in plays, instead
  // of visibly driving itself from the raw fix to the road.
  const APPEAR_GRACE_MS = 5000;
  const mountedAt = useRef(null);
  if (mountedAt.current === null) mountedAt.current = performance.now();
  const wasFading = useRef(fading);

  // New telemetry retargets the tween; position glides over the ~2s update
  // cadence. Jumps > 30m (route start, reset) snap immediately. The arrow
  // art points north; its screen rotation is applied separately below from
  // the truck heading and the live map bearing.
  useEffect(() => {
    const v = viewRef.current;
    const dLat = (trk.lat - v.lat) * 111000;
    const dLng = (trk.lng - v.lng) * 111000 * Math.cos((v.lat * Math.PI) / 180);
    const distMeters = Math.sqrt(dLat * dLat + dLng * dLng);

    if (distMeters > 30 || performance.now() - mountedAt.current < APPEAR_GRACE_MS) {
      setView({ lat: trk.lat, lng: trk.lng });
      animRef.current = null;
      return;
    }

    animRef.current = {
      fromLat: v.lat,
      fromLng: v.lng,
      toLat: trk.lat,
      toLng: trk.lng,
      start: performance.now(),
    };
  }, [trk.lat, trk.lng]);

  useEffect(() => {
    let raf;
    const loop = (now) => {
      const a = animRef.current;
      if (a) {
        const k = Math.min(1, (now - a.start) / 1000);
        const next = {
          lat: a.fromLat + (a.toLat - a.fromLat) * k,
          lng: a.fromLng + (a.toLng - a.fromLng) * k,
        };
        const v = viewRef.current;
        if (next.lat !== v.lat || next.lng !== v.lng) setView(next);
        if (k >= 1) { animRef.current = null; return; }
      } else {
        return;
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [trk.lat, trk.lng]);

  useEffect(() => {
    if (!map) return;
    const marker = new maplibregl.Marker({ element: makeTruckEl() })
      .setLngLat([viewRef.current.lng, viewRef.current.lat])
      .addTo(map);
    markerRef.current = marker;
    const onClick = () => {
      new maplibregl.Popup({ offset: 14, maxWidth: "280px" })
        .setLngLat([viewRef.current.lng, viewRef.current.lat])
        .setHTML(truckPopupHTML(trk))
        .addTo(map);
    };
    marker.getElement().addEventListener("click", onClick);
    return () => {
      marker.getElement().removeEventListener("click", onClick);
      marker.remove();
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  useEffect(() => {
    markerRef.current?.setLngLat([view.lng, view.lat]);
    viewRef.current = view;
  }, [view]);

  // Waze-style heading arrow: spin it by (compass heading minus compass
  // up-screen map bearing). Re-applied on heading changes and while the map
  // itself rotates (course-up drive mode).
  useEffect(() => {
    const el = markerRef.current?.getElement();
    if (!el || !map) return;
    const apply = () => {
      const arrow = el.querySelector("[data-arrow]");
      if (!arrow) return;
      // Shared headings are stored app-convention (compass + 90); the CSS
      // arrow points north at 0, so convert back to compass first.
      const deg = ((((trk.heading ?? 90) - 90 - map.getBearing()) % 360) + 360) % 360;
      arrow.style.transform = `rotate(${deg}deg)`;
    };
    apply();
    map.on("rotate", apply);
    return () => { map.off("rotate", apply); };
  }, [map, trk.heading]);

  useEffect(() => {
    const inner = markerRef.current?.getElement()?.firstElementChild;
    if (!inner) return;
    if (fading) {
      inner.style.animation = "truckFadeOut 0.45s ease-in forwards";
      wasFading.current = true;
      return;
    }
    // Stop → quick Resume reuses the same marker while it is mid-fade-out;
    // replay the pop-in so it doesn't get stuck invisible from the fade fill.
    if (wasFading.current) {
      inner.style.animation = "truckPopIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)";
      wasFading.current = false;
    }
  }, [fading]);

  return null;
}

// Stable identity for an upcoming-stop pin: absolute route index + position.
const upcomingPinKey = (s) => `${s.index}-${s.lat}-${s.lng}`;

export default function MapCanvas({ tickets = [], trucks = [], mapMode = "pins", center, zoom, highlightedTicketId, currentStop, upcomingStops = [], onSelectTicket, onMapDrag, onBoundsChange, flySignal, onMapReady, showZoomControl = false, showTicketPopup = true, rotatable = false, bearing = null, perspective3D = false, tilted = false, onTiltChange, hideCompass = false, hidePausedTrucks = false }) {
  const containerRef = useRef(null);
  const [mapObj, setMapObj] = useState(null);
  const [mapError, setMapError] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const tejeroCenter = [10.3016, 123.9086];
  const mapCenter = center || tejeroCenter;
  const mapZoom = zoom ?? (center ? 16 : 14);

  // Free 360° rotation: a user gesture pauses the auto camera (course-up on
  // the driver map, north-up elsewhere) until the compass button resumes it.
  const [autoFollow, setAutoFollow] = useState(true);
  const [viewBearing, setViewBearing] = useState(0);

  const handleUserRotate = useCallback(() => setAutoFollow(false), []);
  const bearingTargetRef = useRef(null);

  // The `bearing` prop uses the app heading convention (heading = compass +
  // 90). MapLibre bearings equal the compass facing up-screen, so the camera
  // takes the plain compass value. Course-up == travel points up, natively.
  const compassBearing = appHeadingToMlBearing(bearing);
  const driveOn = perspective3D && autoFollow && compassBearing != null;
  const cameraBearing = driveOn ? compassBearing : (rotatable ? 0 : null);
  // Flat north-up maps still reset a leftover drive rotation; manual user
  // rotations (autoFollow false) are left alone.
  const wantBearing = autoFollow ? cameraBearing : null;
  // Tilted default view pitches the camera without engaging drive mode
  // (course-up bearing and ahead offset stay behind perspective3D).
  const wantPitch = perspective3D || tilted ? DRIVE_PITCH : FLAT_PITCH;

  // On-duty trucks broadcast live; paused trucks (mid-route, GPS stopped via
  // End Route) stay visible at their last known position so admins can see an
  // assignment is still being held. Fully off-duty trucks stay hidden.
  // The driver map passes hidePausedTrucks so End Route fades the marker out
  // instead of leaving it parked on screen; Resume mounts it fresh with the
  // pop-in. Removal flows through the fading-trucks hand-off below, so both
  // directions animate instead of blinking.
  const activeTrucks = (trucks || []).filter(
    (trk) => trk && (trk.isActive !== false || (!hidePausedTrucks && (trk.phase === "enroute" || trk.phase === "onsite")))
  );
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

  const activeIds = new Set(activeTrucks.map((t) => t.id));
  const fadingOnly = fadingTrucks.filter((t) => !activeIds.has(t.id));
  const fadingIds = new Set(fadingOnly.map((t) => t.id));

  // Report pin hand-off: tickets leaving the list (filtered out, resolved,
  // view toggled) stay mounted for 500ms playing their fade-out.
  const [fadingTickets, setFadingTickets] = useState([]);
  const prevTicketsRef = useRef(tickets || []);

  useEffect(() => {
    const prev = prevTicketsRef.current;
    prevTicketsRef.current = tickets || [];
    const currentIds = new Set((tickets || []).map((t) => t.id));
    const removed = prev.filter((t) => !currentIds.has(t.id));
    if (!removed.length) return;
    setFadingTickets((f) => [...f, ...removed]);
    const removedIds = new Set(removed.map((t) => t.id));
    setTimeout(() => {
      setFadingTickets((f) => f.filter((x) => !removedIds.has(x.id)));
    }, 500);
  }, [tickets]);

  const ticketIds = new Set((tickets || []).map((t) => t.id));
  const fadingTicketsOnly = fadingTickets.filter((t) => !ticketIds.has(t.id));
  const fadingTicketIds = new Set(fadingTicketsOnly.map((t) => t.id));

  // Upcoming-stop pin hand-off: when the route advances (or ends), the consumed
  // compact pins fade out instead of vanishing mid-run.
  const [fadingUpcoming, setFadingUpcoming] = useState([]);
  const prevUpcomingRef = useRef(upcomingStops || []);

  useEffect(() => {
    const prev = prevUpcomingRef.current;
    prevUpcomingRef.current = upcomingStops || [];
    const currentKeys = new Set((upcomingStops || []).map(upcomingPinKey));
    const removed = prev.filter((s) => !currentKeys.has(upcomingPinKey(s)));
    if (!removed.length) return;
    setFadingUpcoming((f) => [
      ...f.filter((x) => !removed.some((r) => upcomingPinKey(r) === upcomingPinKey(x))),
      ...removed,
    ]);
    const removedKeys = new Set(removed.map(upcomingPinKey));
    setTimeout(() => {
      setFadingUpcoming((f) => f.filter((x) => !removedKeys.has(upcomingPinKey(x))));
    }, 500);
  }, [upcomingStops]);

  const upcomingKeys = new Set((upcomingStops || []).map(upcomingPinKey));
  const fadingUpcomingOnly = fadingUpcoming.filter((s) => !upcomingKeys.has(upcomingPinKey(s)));
  const fadingUpcomingKeys = new Set(fadingUpcomingOnly.map(upcomingPinKey));

  // Shortest angular distance of the live map rotation from its rest bearing,
  // used to decide when the compass reset button is worth showing.
  const normBearing = (((viewBearing % 360) + 540) % 360) - 180;
  const showCompass = rotatable || Math.abs(normBearing) > 2;

  // ---- Map instance (created once; camera follows via effects) ------------
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let map = null;
    let settled = false;
    const settle = () => {
      if (settled) return;
      settled = true;
      setMapLoaded(true);
      try { onMapReady?.(); } catch {}
    };
    try {
      if (mapError) return;
      // Turbopack does not emit maplibre's worker chunk (its URL is derived
      // from import.meta at runtime and 404s as HTML), so serve the vendored
      // worker explicitly. Both files are pinned to maplibre-gl 6.11.2 —
      // re-copy from node_modules/maplibre-gl/dist on upgrade.
      maplibregl.setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
      const first = toLatLngTuple(mapCenter) || tejeroCenter;
      map = new maplibregl.Map({
        container,
        style: VECTOR_STYLE_URL,
        center: [first[1], first[0]],
        zoom: mapZoom,
        minZoom: METRO_CEBU_MIN_ZOOM,
        maxBounds: METRO_CEBU_MAX_BOUNDS,
        maxPitch: 70,
        // Two-finger vertical swipe tilts on phones (touch pitch). Explicit
        // so a manual finger tilt always works and can sync the Map Display
        // switch via onTiltChange below.
        touchPitch: true,
        attributionControl: false,
      });
      if (showZoomControl) {
        map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-left");
      }
      // v6 has no supported() export: GPU failure surfaces as a DOM event on
      // the canvas (plus a sync throw at construction, caught below).
      const handleWebglFail = () => setMapError(true);
      container.addEventListener("webglcontextcreationerror", handleWebglFail);
      map.on("load", settle);
      // Tiles can lag on slow links; never trap the UI behind the skeleton.
      // (Mirrors the old 3s tile-load fallback.)
      setTimeout(settle, 4000);
      setMapObj(map);
    } catch {
      setTimeout(() => setMapError(true), 0);
    }
    return () => {
      setMapObj(null);
      try { container.removeEventListener("webglcontextcreationerror", handleWebglFail); } catch {}
      try { map?.remove(); } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Gesture + camera plumbing ------------------------------------------
  const draggingRef = useRef(false);
  const zoomingRef = useRef(false);
  const pitchingRef = useRef(false);
  const cameraHeld = () => draggingRef.current || zoomingRef.current || pitchingRef.current;
  const centerRef = useRef(toLatLngTuple(mapCenter));
  const zoomRef = useRef(mapZoom);
  const prevSentRef = useRef(null);
  const isFirstCamera = useRef(true);

  // Finger/zoom gestures suspend the follow camera; an intentional pan past
  // ~20px also dismisses focus (same threshold as before, converted through
  // the local meters-per-pixel at the gesture zoom).
  useEffect(() => {
    if (!mapObj) return;
    let startCenter = null;
    let startZoom = mapZoom;
    const onDragStart = () => {
      draggingRef.current = true;
      try { startCenter = mapObj.getCenter(); startZoom = mapObj.getZoom(); } catch { startCenter = null; }
    };
    const onDragEnd = () => {
      draggingRef.current = false;
      if (startCenter && onMapDrag) {
        try {
          const end = mapObj.getCenter();
          const mPerPx = (156543.03392 * Math.cos((startCenter.lat * Math.PI) / 180)) / Math.pow(2, startZoom);
          const dx = (end.lng - startCenter.lng) * 111320 * Math.cos((startCenter.lat * Math.PI) / 180);
          const dy = (end.lat - startCenter.lat) * 111320;
          if (Math.hypot(dx, dy) >= 20 * mPerPx) onMapDrag();
        } catch {
          onMapDrag();
        }
      }
      startCenter = null;
    };
    const onZoomStart = () => { zoomingRef.current = true; };
    const onZoomEnd = () => { zoomingRef.current = false; };
    mapObj.on("dragstart", onDragStart);
    mapObj.on("dragend", onDragEnd);
    mapObj.on("zoomstart", onZoomStart);
    mapObj.on("zoomend", onZoomEnd);
    return () => {
      mapObj.off("dragstart", onDragStart);
      mapObj.off("dragend", onDragEnd);
      mapObj.off("zoomstart", onZoomStart);
      mapObj.off("zoomend", onZoomEnd);
    };
  }, [mapObj, onMapDrag, mapZoom]);

  // Rotation tracking: programmatic tweens carry a target bearing, so only
  // anything else counts as a user rotate gesture (pauses auto-follow).
  useEffect(() => {
    if (!mapObj) return;
    const handler = () => {
      const b = mapObj.getBearing();
      setViewBearing(b);
      const t = bearingTargetRef.current;
      if (t != null && Math.abs(angDelta(b, t)) < 2) return;
      handleUserRotate();
    };
    mapObj.on("rotate", handler);
    return () => {
      mapObj.off("rotate", handler);
    };
  }, [mapObj, handleUserRotate]);

  // Manual tilt tracking: a two-finger vertical swipe (or right-drag on
  // desktop) pitches the camera. Only user gestures sync the Map Display
  // switch — programmatic easeTo tweens carry no originalEvent, so drive
  // mode engaging/disengaging never flips the switch by itself.
  const onTiltChangeRef = useRef(onTiltChange);
  const tiltedRef = useRef(tilted);
  useEffect(() => {
    onTiltChangeRef.current = onTiltChange;
    tiltedRef.current = tilted;
  });
  const userPitchedRef = useRef(false);
  useEffect(() => {
    if (!mapObj) return;
    const TILT_THRESHOLD = 20;
    const onPitchStart = (e) => {
      pitchingRef.current = true;
      if (e?.originalEvent) userPitchedRef.current = true;
    };
    const onPitchEnd = () => {
      pitchingRef.current = false;
      if (!userPitchedRef.current) return;
      userPitchedRef.current = false;
      let pitch = 0;
      try { pitch = mapObj.getPitch(); } catch { return; }
      const isTilted = pitch > TILT_THRESHOLD;
      // Skip when the switch already matches — keeps the parent setter (and
      // its localStorage write) idempotent and avoids render loops.
      if (isTilted === tiltedRef.current) return;
      try { onTiltChangeRef.current?.(isTilted); } catch {}
    };
    mapObj.on("pitchstart", onPitchStart);
    mapObj.on("pitchend", onPitchEnd);
    return () => {
      mapObj.off("pitchstart", onPitchStart);
      mapObj.off("pitchend", onPitchEnd);
    };
  }, [mapObj]);

  useEffect(() => {
    if (!mapObj || !onBoundsChange) return;
    const report = () => {
      try {
        const b = mapObj.getBounds();
        onBoundsChange({ north: b.getNorth(), south: b.getSouth(), east: b.getEast(), west: b.getWest() });
      } catch {}
    };
    report();
    mapObj.on("moveend", report);
    return () => {
      mapObj.off("moveend", report);
    };
  }, [mapObj, onBoundsChange]);

  // Reactive follow camera: center + zoom + course-up bearing + drive pitch
  // in ONE easeTo (a second easeTo would cancel the first). Manual user
  // rotation leaves bearing alone; an untouched flat map stays north-up.
  useEffect(() => {
    if (!mapObj) return;
    const tuple = toLatLngTuple(mapCenter);
    centerRef.current = tuple;
    zoomRef.current = mapZoom;
    if (!tuple) return;
    const dest = aheadTarget(tuple, autoFollow ? bearing : null, mapZoom, perspective3D);
    const b = wantBearing;
    const p = wantPitch;
    const prev = prevSentRef.current;
    const same =
      prev &&
      prev.lat === dest[0] &&
      prev.lng === dest[1] &&
      prev.zoom === mapZoom &&
      prev.bearing === b &&
      prev.pitch === p;
    prevSentRef.current = { lat: dest[0], lng: dest[1], zoom: mapZoom, bearing: b, pitch: p };
    if (same || cameraHeld()) return;
    const center = [dest[1], dest[0]];
    if (isFirstCamera.current) {
      isFirstCamera.current = false;
      mapObj.jumpTo({ center, zoom: mapZoom, bearing: b ?? mapObj.getBearing(), pitch: p });
      return;
    }
    bearingTargetRef.current = b;
    mapObj.easeTo({ center, zoom: mapZoom, bearing: b ?? mapObj.getBearing(), pitch: p, duration: 800 });
  }, [mapObj, mapCenter, mapZoom, wantBearing, wantPitch, bearing, autoFollow, perspective3D]);

  // Recenter signal (re-tapping focus sends identical center values).
  useEffect(() => {
    if (!mapObj || !flySignal || cameraHeld()) return;
    const tuple = centerRef.current;
    if (!tuple) return;
    mapObj.flyTo({ center: [tuple[1], tuple[0]], zoom: zoomRef.current, duration: 1600 });
  }, [flySignal, mapObj]);

  // Compass needle points at screen-north: with compass C facing up-screen,
  // north sits C degrees counter-clockwise from up.
  const compassUp = ((viewBearing % 360) + 360) % 360;

  if (mapError) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-muted p-6 text-center text-sm text-muted-foreground">
        Map unavailable (WebGL or map tiles unreachable). Everything below stays live.
      </div>
    );
  }

  return (
    <div className="w-full h-full relative overflow-hidden">
      <div ref={containerRef} className="w-full h-full absolute" />
      {!mapLoaded && (
        <div className="absolute inset-0 z-10 bg-background">
          <MapSkeleton />
        </div>
      )}
      {mapObj && mapLoaded && (
        <>
          {(mapMode === "pins" || mapMode === "combined") &&
            [...tickets, ...fadingTicketsOnly].map((t) => (
              <TicketMarker
                key={`pin-${t.id}`}
                map={mapObj}
                ticket={t}
                fading={fadingTicketIds.has(t.id)}
                highlighted={highlightedTicketId === t.id}
                showTicketPopup={showTicketPopup}
                onSelectTicket={onSelectTicket}
              />
            ))}

          {[...activeTrucks, ...fadingOnly].map((trk) => (
            <TruckMarker
              key={`truck-${trk.id}`}
              map={mapObj}
              trk={trk}
              fading={fadingIds.has(trk.id)}
            />
          ))}

          {fadingStop && (
            <StopPinMarker
              key={`stop-pin-fading-${fadingStop.name}-${fadingStop.lat}-${fadingStop.lng}`}
              map={mapObj}
              stop={fadingStop}
              fading
            />
          )}
          {currentStop && (
            <StopPinMarker
              key={`stop-pin-${stopKey}`}
              map={mapObj}
              stop={currentStop}
              fading={false}
            />
          )}
          {[...(upcomingStops || []), ...fadingUpcomingOnly].map((s) => (
            <StopPinMarker
              key={`upcoming-pin-${upcomingPinKey(s)}`}
              map={mapObj}
              stop={s}
              compact
              fading={fadingUpcomingKeys.has(upcomingPinKey(s))}
            />
          ))}
        </>
      )}
      {!hideCompass && showCompass && (
        <button
          type="button"
          aria-label="Reset map orientation"
          onClick={() => setAutoFollow(true)}
          className="absolute top-3 right-3 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-lg ring-1 ring-black/10 transition hover:bg-zinc-50 active:scale-95"
        >
          <Navigation
            className="h-5 w-5 text-emerald-600"
            style={{ transform: `rotate(${-compassUp}deg)` }}
          />
        </button>
      )}
    </div>
  );
}
