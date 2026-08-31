"use client";

import { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, useMap, ZoomControl } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
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

const createTruckIcon = (heading = 90) => {
  const rotationDeg = heading - 90;
  return L.divIcon({
    className: "custom-truck bg-transparent border-0",
    html: `
      <div style="display: flex; align-items: center; justify-content: center; width: 44px; height: 44px; filter: drop-shadow(0px 4px 6px rgba(0,0,0,0.3)); transform: rotate(${rotationDeg}deg); transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.4s ease-in-out; animation: truckPopIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;">
        <style>
          @keyframes truckPopIn {
            0% { opacity: 0; transform: scale(0) rotate(${rotationDeg}deg); }
            100% { opacity: 1; transform: scale(1) rotate(${rotationDeg}deg); }
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

function TruckMarker({ trk, fading }) {
  const markerRef = useRef(null);

  useEffect(() => {
    const inner = markerRef.current?.getElement()?.firstElementChild;
    if (!inner) return;
    inner.style.animation = fading
      ? "truckFadeOut 0.45s ease-in forwards"
      : "";
  }, [fading]);

  return (
    <Marker
      ref={markerRef}
      position={[trk.lat, trk.lng]}
      icon={createTruckIcon(trk.heading ?? 90)}
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

function MapCameraController({ center, zoom, onMapDrag }) {
  const map = useMap();
  const isFirstRender = useRef(true);
  const prevCenterRef = useRef(center);
  const prevZoomRef = useRef(zoom);

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

export default function MapCanvas({ tickets = [], trucks = [], routes = [], mapMode = "pins", center, zoom, highlightedTicketId, onSelectTicket, onMapDrag, onMapReady }) {
  const [mounted, setMounted] = useState(false);
  const tileRef = useRef(null);
  const tejeroCenter = [10.3016, 123.9086];
  const mapCenter = center || tejeroCenter;
  const mapZoom = zoom ?? (center ? 16 : 14);

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

  return (
    <div className="w-full h-full relative">
      <MapContainer
        center={mapCenter}
        zoom={mapZoom}
        scrollWheelZoom={true}
        attributionControl={false}
        zoomControl={false}
        className="w-full h-full z-10"
      >
        <MapCameraController center={mapCenter} zoom={mapZoom} onMapDrag={onMapDrag} />
        
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

        {/* Route Trajectories (white casing under emerald line, beneath markers) */}
        {(routes || []).map((r) => r.positions.length >= 2 && (
          <span key={`route-${r.id}`}>
            <Polyline
              positions={r.positions}
              pathOptions={{ color: "#ffffff", weight: 7, opacity: 0.9, interactive: false }}
            />
            <Polyline
              positions={r.positions}
              pathOptions={{ color: "#059669", weight: 4, opacity: 0.9, lineCap: "round", lineJoin: "round", interactive: false }}
            />
          </span>
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
              >
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

                    {onSelectTicket && (
                      <button
                        type="button"
                        onClick={() => onSelectTicket(t)}
                        className="w-full text-center mt-1 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg transition-colors shadow-xs"
                      >
                        View Details & Photo
                      </button>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          })}

        {/* Truck Markers (Only render active trucks on route; fading ones finish their fade-out) */}
        {[...activeTrucks, ...fadingOnly].map((trk) => (
          <TruckMarker
            key={`truck-${trk.id}`}
            trk={trk}
            fading={fadingIds.has(trk.id)}
          />
        ))}
      </MapContainer>
    </div>
  );
}
