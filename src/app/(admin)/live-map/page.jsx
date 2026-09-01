"use client";

import { useState, useEffect, Suspense } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useTickets, updateTicket } from "@/lib/tickets";
import { useLiveRoute, getSchedule } from "@/lib/live-route";
import { useTruckRoutes } from "@/lib/use-route-path";
import { useFleet } from "@/lib/fleet";
import { StatusBadge, UrgencyBadge } from "@/components/ui/badge";
import TicketDetailsModal from "@/components/modals/ticket-details-modal";
import { inputClass } from "@/components/ui/input";
import { MapSkeleton } from "@/components/ui/skeletons";
import { cn } from "@/lib/utils";
import { Search, MapPin, Truck as TruckIcon } from "lucide-react";

const MapCanvas = dynamic(() => import("@/components/map/map-canvas"), {
  ssr: false,
  loading: () => <MapSkeleton />,
});

function LiveMapContent() {
  const searchParams = useSearchParams();
  const urlTicketId = searchParams.get("ticketId");

  const tickets = useTickets();
  const [mapView, setMapView] = useState("reports");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [urgencyFilter, setUrgencyFilter] = useState("All");
  const [mapMode, setMapMode] = useState("combined");
  const [activeTicketId, setActiveTicketId] = useState(null);
  const [activeTruckId, setActiveTruckId] = useState(null);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [mapCenter, setMapCenter] = useState([10.3016, 123.9086]);
  const [mapZoom, setMapZoom] = useState(null);

  useEffect(() => {
    if (urlTicketId) {
      const ticket = tickets.find((t) => t.id === urlTicketId);
      if (ticket) {
        setMapView("reports");
        setActiveTicketId(ticket.id);
        setMapCenter([ticket.lat, ticket.lng]);
        setMapZoom(18);
        setSelectedTicket(ticket);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const live = useLiveRoute();
  const fleet = useFleet();
  const truckRoutes = useTruckRoutes(live, fleet);

  const trucksData = fleet.map((t) => {
    const ts = live.trucks[t.id];
    const route = truckRoutes.find((r) => r.id === t.id);
    return {
      id: t.id,
      plate: t.plate,
      driver: live.driverByTruck[t.id] ?? t.driver,
      capacity: t.capacity,
      lat: ts?.tracking.lat || 10.3016,
      lng: ts?.tracking.lng || 123.9086,
      heading: route?.heading ?? ts?.tracking.heading ?? 0,
      eta: ts?.tracking.eta,
      isActive: !!ts?.tracking.isActive,
    };
  });

  useEffect(() => {
    if (mapView === "trucks") {
      const activeTrucks = trucksData.filter((t) => t.isActive);
      if (activeTrucks.length === 1) {
        const singleTruck = activeTrucks[0];
        setMapCenter([singleTruck.lat, singleTruck.lng]);
        setActiveTruckId(singleTruck.id);
      }
    } else {
      setActiveTruckId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapView]);

  const filteredTickets = tickets.filter((t) => {
    const matchSearch =
      search === "" ||
      t.location.toLowerCase().includes(search.toLowerCase()) ||
      t.id.toLowerCase().includes(search.toLowerCase()) ||
      t.reporter.toLowerCase().includes(search.toLowerCase()) ||
      t.barangay.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "All" || t.status === statusFilter;
    const matchUrgency = urgencyFilter === "All" || t.urgency === urgencyFilter;
    return matchSearch && matchStatus && matchUrgency;
  });

  const handleSelectReport = (ticket) => {
    setActiveTicketId(ticket.id);
    setMapCenter([ticket.lat, ticket.lng]);
    setSelectedTicket(ticket);
  };

  const handlePinClick = (ticket) => {
    setActiveTicketId(ticket.id);
    setSelectedTicket(ticket);
  };

  const handleSelectTruck = (truck) => {
    setActiveTruckId(truck.id);
    setMapCenter([truck.lat, truck.lng]);
  };

  const handleLocateOnMap = (ticket) => {
    setMapCenter([ticket.lat, ticket.lng]);
    setActiveTicketId(ticket.id);
  };

  const handleUpdateStatus = (ticketId, newStatus) => {
    updateTicket(ticketId, { status: newStatus });
    if (selectedTicket?.id === ticketId) {
      setSelectedTicket((prev) => ({ ...prev, status: newStatus }));
    }
  };

  const handleSwitchView = (view) => {
    setMapView(view);
    setActiveTicketId(null);
    setActiveTruckId(null);
    setSelectedTicket(null);
    setMapCenter([10.3016, 123.9086]);
    setMapZoom(null);
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <div className="relative h-full flex-1 overflow-hidden">
        {/* Floating Map Status Overlay */}
        <div className="absolute top-4 right-4 z-20 flex items-center gap-2 rounded-xl border border-border bg-card/90 px-3.5 py-2 text-xs font-medium text-foreground shadow-md backdrop-blur-xs">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          <span>
            Showing {mapView === "reports" ? `${filteredTickets.length} of ${tickets.length}` : `${trucksData.filter((t) => t.isActive).length} of ${trucksData.length}`} {mapView === "reports" ? "reports" : "active trucks"}
          </span>
        </div>

        <MapCanvas
          tickets={mapView === "reports" ? filteredTickets : []}
          trucks={mapView === "trucks" ? trucksData : []}
          routes={mapView === "trucks" ? truckRoutes : []}
          mapMode={mapView === "reports" ? mapMode : "pins"}
          center={mapCenter}
          zoom={mapZoom}
          highlightedTicketId={mapView === "reports" ? activeTicketId : null}
          onSelectTicket={mapView === "reports" ? handlePinClick : undefined}
        />
      </div>

      <div className="flex h-full w-[300px] shrink-0 flex-col overflow-hidden border-l border-border bg-card lg:w-[340px]">
        <div className="shrink-0 border-b border-border px-5 pb-4 pt-5">
          <h2 className="text-sm font-semibold text-foreground">Map Control</h2>
        </div>

        <div className="flex shrink-0 items-center gap-2 border-b border-border-subtle px-4 py-3">
          <div className="flex flex-1 gap-0.5 rounded-lg bg-muted p-0.5">
            <button
              type="button"
              onClick={() => handleSwitchView("reports")}
              className={`flex flex-1 items-center justify-center rounded-md py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                mapView === "reports"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Reports
            </button>
            <button
              type="button"
              onClick={() => handleSwitchView("trucks")}
              className={`flex flex-1 items-center justify-center rounded-md py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                mapView === "trucks"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Trucks
            </button>
          </div>
        </div>

        {mapView === "reports" &&
          (selectedTicket ? (
            <TicketDetailsModal
              ticket={selectedTicket}
              isOpen={true}
              inline={true}
              onClose={() => setSelectedTicket(null)}
              onUpdateStatus={handleUpdateStatus}
              onLocateOnMap={handleLocateOnMap}
            />
          ) : (
            <div className="flex flex-1 flex-col overflow-hidden">
              <div className="shrink-0 px-4 pb-2 pt-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Search by ID, address, reporter..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className={cn(inputClass, "pl-9")}
                  />
                </div>
              </div>

              <div className="flex shrink-0 gap-2 px-4 pb-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className={cn(inputClass, "flex-1 cursor-pointer")}
                >
                  <option value="All">All Status</option>
                  <option value="Pending">Waiting</option>
                  <option value="In Progress">On the Way</option>
                  <option value="Resolved">Cleaned Up</option>
                </select>
                <select
                  value={urgencyFilter}
                  onChange={(e) => setUrgencyFilter(e.target.value)}
                  className={cn(inputClass, "flex-1 cursor-pointer")}
                >
                  <option value="All">All Priority</option>
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Emergency</option>
                </select>
              </div>

              <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border-subtle px-4 pb-3">
                <span className="text-xs text-muted-foreground">Map View</span>
                <div className="flex w-fit gap-0.5 rounded-lg bg-muted p-0.5">
                  {[
                    { key: "pins", label: "Pins" },
                    { key: "heatmap", label: "Heatmap" },
                    { key: "combined", label: "Both" },
                  ].map(({ key, label }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setMapMode(key)}
                      className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
                        mapMode === key
                          ? "bg-card text-foreground shadow-xs"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-2 flex shrink-0 flex-col gap-2 border-b border-border-subtle px-4 pb-3">
                <div className="flex flex-wrap items-center justify-between gap-y-1">
                  <span className="text-xs text-muted-foreground">Priority</span>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-rose-600" />
                      <span className="text-xs font-medium text-zinc-600">Emergency</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-orange-500" />
                      <span className="text-xs font-medium text-zinc-600">High</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-amber-500" />
                      <span className="text-xs font-medium text-zinc-600">Medium</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      <span className="text-xs font-medium text-zinc-600">Low</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-4 pb-3">
                {filteredTickets.length === 0 ? (
                  <div className="flex flex-1 flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
                    <MapPin className="h-6 w-6 text-zinc-300" />
                    <span className="text-xs font-medium">No reports match your filters.</span>
                  </div>
                ) : (
                  filteredTickets.map((t) => (
                    <button
                      key={t.id}
                      id={`report-card-${t.id}`}
                      onClick={() => handleSelectReport(t)}
                      className={`w-full rounded-xl border bg-card p-3 text-left transition-all ${
                        activeTicketId === t.id
                          ? "border-emerald-400 bg-emerald-50/50 shadow-xs ring-1 ring-emerald-400/20"
                          : "border-border hover:border-zinc-300 hover:bg-muted/40"
                      }`}
                    >
                      <div className="mb-1 flex flex-nowrap items-center justify-between gap-2">
                        <span className="shrink-0 whitespace-nowrap font-mono text-xs font-semibold text-foreground">
                          {t.id}
                        </span>
                        <UrgencyBadge urgency={t.urgency} />
                      </div>
                      <div className="truncate text-sm font-semibold text-foreground">{t.location}</div>
                      <div className="mb-2 truncate text-xs text-muted-foreground">
                        {t.barangay}, {t.city || "Cebu City"}
                      </div>
                      <div className="flex items-center justify-between">
                        <StatusBadge status={t.status} />
                        <span className="font-mono text-xs text-muted-foreground">{t.date}</span>
                      </div>
                    </button>
                  ))
                )}
              </div>

              <div className="shrink-0 border-t border-border px-4 py-3">
                <span className="text-xs text-muted-foreground">
                  Showing {filteredTickets.length} of {tickets.length} reports
                </span>
              </div>
            </div>
          ))}

        {mapView === "trucks" && (
          <div className="flex flex-1 flex-col overflow-hidden">
            <div className="shrink-0 px-4 pb-2 pt-3">
              <p className="text-xs text-muted-foreground">
                {trucksData.filter((t) => t.isActive).length} of {trucksData.length} trucks currently on
                duty
              </p>
            </div>

            {trucksData.filter((t) => t.isActive).length === 1 &&
              (() => {
                const activeTruck = trucksData.find((t) => t.isActive);
                const ts = live.trucks[activeTruck.id];
                const sch = ts?.scheduleId ? getSchedule(ts.scheduleId) : null;
                const point = sch?.routePoints?.[ts?.stopIndex];
                return (
                  <div className="mx-4 mb-2 shrink-0 rounded-xl border border-border bg-muted/40 p-3 text-xs leading-relaxed text-zinc-600">
                    <p className="mb-0.5 font-semibold text-foreground">Live Tracking</p>
                    Truck <strong className="font-semibold text-foreground">{activeTruck.id}</strong> is
                    currently on its collection route.{" "}
                    {ts?.onsite ? (
                      <>Currently collecting at {point?.name ?? "a stop"}.</>
                    ) : (
                      <>
                        Next stop: {point?.name ?? "route end"} (arriving in{" "}
                        {activeTruck.eta || "5 mins"}).
                      </>
                    )}
                  </div>
                );
              })()}

            <div className="flex flex-1 flex-col gap-2 overflow-y-auto px-4 pb-3">
              {trucksData.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center py-12 text-center">
                  <TruckIcon className="h-6 w-6 text-zinc-300" />
                  <span className="mt-2 text-xs font-semibold text-foreground">No Trucks in Fleet</span>
                  <span className="mt-0.5 max-w-[200px] text-xs text-muted-foreground">
                    Add trucks in Fleet Dispatch to start tracking them on the map.
                  </span>
                </div>
              ) : (
              trucksData.map((trk) => (
                <button
                  key={trk.id}
                  onClick={() => handleSelectTruck(trk)}
                  className={`w-full rounded-xl border bg-card p-3 text-left transition-all ${
                    activeTruckId === trk.id
                      ? "border-emerald-400 bg-emerald-50/50 shadow-xs ring-1 ring-emerald-400/20"
                      : "border-border hover:border-zinc-300 hover:bg-muted/40"
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TruckIcon
                        className={`h-4 w-4 ${trk.isActive ? "text-emerald-600" : "text-zinc-400"}`}
                      />
                      <span className="text-xs font-semibold text-foreground">Truck {trk.id}</span>
                    </div>
                    <span
                      className={`text-xs font-medium ${
                        trk.isActive ? "text-emerald-600" : "text-zinc-400"
                      }`}
                    >
                      {trk.isActive ? "On Duty" : "Off Duty"}
                    </span>
                  </div>
                  <div className="ml-6 flex flex-col gap-0.5 text-xs text-zinc-600">
                    <div>
                      <span className="font-semibold text-zinc-700">Driver:</span> {trk.driver}
                    </div>
                    <div>
                      <span className="font-semibold text-zinc-700">Plate:</span> {trk.plate}
                    </div>
                    {trk.capacity && (
                      <div>
                        <span className="font-semibold text-zinc-700">Load:</span> {trk.capacity}
                      </div>
                    )}
                    {trk.eta && (
                      <div className="mt-0.5 font-semibold text-emerald-600">
                        Arriving in: {trk.eta}
                      </div>
                    )}
                  </div>
                </button>
              ))
              )}
            </div>

            <div className="shrink-0 border-t border-border px-4 py-3">
              <span className="text-xs text-muted-foreground">
                Showing {trucksData.filter((t) => t.isActive).length} of {trucksData.length} active trucks
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function LiveMapPage() {
  return (
    <Suspense fallback={<MapSkeleton />}>
      <LiveMapContent />
    </Suspense>
  );
}
