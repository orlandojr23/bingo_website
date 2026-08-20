"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { mockTickets } from "@/lib/mock-data";
import { Layers, Filter, MapPin } from "lucide-react";

const MapCanvas = dynamic(() => import("@/components/map/map-canvas"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-zinc-50 text-zinc-400 text-xs">
      Loading geospatial map canvas...
    </div>
  ),
});

export default function LiveMapPage() {
  const [statusFilter, setStatusFilter] = useState("All");
  const [urgencyFilter, setUrgencyFilter] = useState("All");
  const [mapMode, setMapMode] = useState("combined");

  const filteredTickets = mockTickets.filter((ticket) => {
    const matchStatus =
      statusFilter === "All" || ticket.status === statusFilter;
    const matchUrgency =
      urgencyFilter === "All" || ticket.urgency === urgencyFilter;
    return matchStatus && matchUrgency;
  });

  return (
    <div className="flex flex-col gap-4 max-w-7xl mx-auto h-[calc(100vh-8rem)] min-h-[600px]">
      {/* Top Filter & Mode Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-white border border-zinc-200 rounded-xl shrink-0">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-zinc-500">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs border border-zinc-200 rounded-lg px-2.5 py-1.5 bg-white text-zinc-900 focus:outline-none focus:border-zinc-900 font-medium"
            >
              <option value="All">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="In Progress">In Progress</option>
              <option value="Resolved">Resolved</option>
            </select>
          </div>

          {/* Urgency Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-zinc-500">Urgency:</span>
            <select
              value={urgencyFilter}
              onChange={(e) => setUrgencyFilter(e.target.value)}
              className="text-xs border border-zinc-200 rounded-lg px-2.5 py-1.5 bg-white text-zinc-900 focus:outline-none focus:border-zinc-900 font-medium"
            >
              <option value="All">All Urgencies</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Critical">Critical</option>
            </select>
          </div>

          <span className="text-xs text-zinc-400 hidden sm:inline-block">
            Showing {filteredTickets.length} incidents
          </span>
        </div>

        {/* Mode Selector */}
        <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-zinc-200">
          <button
            type="button"
            onClick={() => setMapMode("pins")}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
              mapMode === "pins"
                ? "bg-emerald-600 text-white shadow-xs"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            Pins
          </button>
          <button
            type="button"
            onClick={() => setMapMode("heatmap")}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
              mapMode === "heatmap"
                ? "bg-emerald-600 text-white shadow-xs"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            Heatmap
          </button>
          <button
            type="button"
            onClick={() => setMapMode("combined")}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
              mapMode === "combined"
                ? "bg-emerald-600 text-white shadow-xs"
                : "text-zinc-600 hover:text-zinc-900"
            }`}
          >
            Combined
          </button>
        </div>
      </div>

      {/* Map Canvas Card */}
      <div className="flex-1 w-full bg-white border border-zinc-200 rounded-xl overflow-hidden relative shadow-xs">
        <MapCanvas tickets={filteredTickets} mapMode={mapMode} />

        {/* Floating Urgency Legend */}
        <div className="absolute bottom-4 left-4 z-20 bg-white/95 backdrop-blur-xs border border-zinc-200/80 rounded-lg p-2.5 shadow-sm text-xs flex flex-col gap-1.5 pointer-events-auto">
          <span className="text-[10px] font-mono uppercase text-zinc-400 font-semibold tracking-wider">
            Urgency Legend
          </span>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-600" />
              <span className="text-zinc-700 font-medium">Critical</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-orange-500" />
              <span className="text-zinc-700 font-medium">High</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span className="text-zinc-700 font-medium">Medium</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-zinc-700 font-medium">Low</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
