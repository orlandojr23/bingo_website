"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap, ZoomControl } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { StatusBadge, UrgencyBadge } from "@/components/ui/badge";
import Link from "next/link";
import { MapPin, Navigation } from "lucide-react";

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
      return "#E11D48"; // Rose-600
    case "High":
      return "#EA580C"; // Orange-600
    case "Medium":
      return "#D97706"; // Amber-600
    case "Low":
    default:
      return "#10B981"; // Emerald-500
  }
};

const createCustomIcon = (urgency) => {
  const color = getUrgencyColor(urgency);
  return L.divIcon({
    className: "custom-pin bg-transparent border-0",
    html: `
      <div style="display: flex; align-items: center; justify-content: center;">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="${color}" stroke="#ffffff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0px 2px 4px rgba(0,0,0,0.3));">
          <!-- Top tie/ruffle -->
          <path d="M9 3l1 3h4l1-3l-2 1l-1-1l-1 1l-2-1z" />
          <!-- Bag Body -->
          <path d="M10 6c-3 0-4 2-5 6s-1 8 7 8 8-4 7-8-2-6-5-6h-4z" />
          <!-- Tie string -->
          <path d="M8 7h8" stroke-width="1.5" />
        </svg>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 16],
    popupAnchor: [0, -14],
  });
};

function ChangeMapView({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

export default function MapCanvas({ tickets = [], mapMode = "pins" }) {
  const [mounted, setMounted] = useState(false);
  const cebuCenter = [10.3157, 123.8854];

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

  return (
    <div className="w-full h-full relative">
      <MapContainer
        center={cebuCenter}
        zoom={13}
        scrollWheelZoom={false}
        attributionControl={false}
        zoomControl={false}
        className="w-full h-full z-10"
      >
        <ChangeMapView center={cebuCenter} zoom={13} />
        <ZoomControl position="topright" />
        
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
            const radius = t.urgency === "Critical" ? 900 : t.urgency === "High" ? 700 : 500;
            return (
              <Circle
                key={`heat-${t.id}`}
                center={[t.lat, t.lng]}
                radius={radius}
                pathOptions={{
                  stroke: false,
                  fillColor: color,
                  fillOpacity: t.urgency === "Critical" ? 0.3 : 0.15,
                  className: "blur-[4px] mix-blend-multiply",
                }}
              />
            );
          })}

        {/* Point Markers */}
        {(mapMode === "pins" || mapMode === "combined") &&
          tickets.map((t) => (
            <Marker
              key={`pin-${t.id}`}
              position={[t.lat, t.lng]}
              icon={createCustomIcon(t.urgency)}
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
                    <span className="text-[11px] text-zinc-500">
                      {t.barangay}, {t.city || "Cebu City"}
                    </span>
                  </div>

                  <p className="text-[11px] text-zinc-600 line-clamp-2 leading-relaxed">
                    {t.description}
                  </p>

                  <div className="flex items-center justify-between pt-2 border-t border-zinc-100 mt-0.5">
                    <StatusBadge status={t.status} />
                    <span className="text-[10px] text-zinc-400 font-mono">
                      {t.date}
                    </span>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
      </MapContainer>
    </div>
  );
}
