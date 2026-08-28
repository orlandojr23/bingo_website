"use client";

import { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap, ZoomControl } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { StatusBadge, UrgencyBadge } from "@/components/ui/badge";
import { Navigation } from "lucide-react";

// Fix default leaflet icons in Next.js
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

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

const createTruckIcon = () => {
  return L.divIcon({
    className: "custom-truck bg-transparent border-0",
    html: `
      <div style="background-color: #059669; padding: 6px; border-radius: 50%; border: 2px solid white; box-shadow: 0 3px 6px rgba(0,0,0,0.25); width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <rect width="14" height="10" x="2" y="6" rx="2" />
          <path d="M16 8h4a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
          <circle cx="6.5" cy="18.5" r="1.5" />
          <circle cx="16.5" cy="18.5" r="1.5" />
        </svg>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
};

function MapCameraController({ center, zoom }) {
  const map = useMap();
  const isFirstRender = useRef(true);
  const prevCenterRef = useRef(center);

  useEffect(() => {
    // Invalidate container size on mount to ensure crisp, non-shaking layout
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 100);
    return () => clearTimeout(timer);
  }, [map]);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const [lat, lng] = center;
    const [prevLat, prevLng] = prevCenterRef.current || [];
    if (lat !== prevLat || lng !== prevLng) {
      prevCenterRef.current = center;
      map.panTo([lat, lng], { animate: true, duration: 0.4 });
    }
  }, [center, zoom, map]);

  return null;
}

export default function MapCanvas({ tickets = [], trucks = [], mapMode = "pins", center, highlightedTicketId, onSelectTicket }) {
  const [mounted, setMounted] = useState(false);
  const tejeroCenter = [10.3016, 123.9086];
  const mapCenter = center || tejeroCenter;
  const zoom = center ? 16 : 14;

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(t);
  }, []);

  if (!mounted) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-zinc-50 text-zinc-400 text-xs">
        <div className="flex items-center gap-2">
          <Navigation className="w-4 h-4 animate-spin text-zinc-400" />
          <span>Loading Metro Cebu Geospatial Canvas...</span>
        </div>
      </div>
    );
  }

  const highlightedTicket = highlightedTicketId ? tickets.find(t => t.id === highlightedTicketId) : null;

  return (
    <div className="w-full h-full relative">
      <MapContainer
        center={mapCenter}
        zoom={zoom}
        scrollWheelZoom={true}
        attributionControl={false}
        zoomControl={false}
        className="w-full h-full z-10"
      >
        <MapCameraController center={mapCenter} zoom={zoom} />
        <ZoomControl position="topleft" />
        
        {/* Crisp clean CartoDB Voyager tiles forced to Retina @2x for ultra-sharp rendering */}
        <TileLayer
          attribution='&copy; <a href="https://carto.com/">CARTO</a>'
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}@2x.png"
          maxZoom={19}
        />



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

        {/* Truck Markers */}
        {trucks &&
          trucks.map((trk) => (
            <Marker
              key={`truck-${trk.id}`}
              position={[trk.lat, trk.lng]}
              icon={createTruckIcon()}
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
          ))}
      </MapContainer>
    </div>
  );
}
