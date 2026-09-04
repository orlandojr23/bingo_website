"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { Calendar, Plus, Minus, X, Search, Truck, Shuffle, MapPin } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { TEJERO_SITOS } from "@/lib/mock-data";
import { useLiveRoute, getSchedules, addSchedule, updateSchedule, removeSchedule, restoreSchedule, hardDeleteSchedule, assignDriver, estimateStopTime, retimeRoutePoints, scheduleLabel } from "@/lib/live-route";
import { useRoutePath } from "@/lib/use-route-path";
import { useFleet, addTruck, updateTruck, removeTruck } from "@/lib/fleet";
import { loadStaffRoster } from "@/lib/staff";
import ConfirmModal from "@/components/ui/confirm-modal";
import { StatusBadge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { PanelStat } from "@/components/ui/panel-stat";
import { InfoRow } from "@/components/ui/info-row";
import { Button } from "@/components/ui/button";
import { inputClass, labelClass } from "@/components/ui/input";
import { MapSkeleton } from "@/components/ui/skeletons";
import { cn } from "@/lib/utils";

const MapCanvas = dynamic(() => import("@/components/map/map-canvas"), {
  ssr: false,
  loading: () => <MapSkeleton />,
});

function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className={labelClass}>{label}</label>
      {children}
    </div>
  );
}

export default function DispatchPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [truckSheet, setTruckSheet] = useState(null);
  const [truckForm, setTruckForm] = useState({ id: "", plate: "", driver: "", capacity: "" });
  const [truckError, setTruckError] = useState("");
  const [stopOrder, setStopOrder] = useState([]);
  const [scheduleToDelete, setScheduleToDelete] = useState(null);
  const [truckToRemove, setTruckToRemove] = useState(null);
  const [driverRoster, setDriverRoster] = useState([]);
  const [viewMode, setViewMode] = useState("active");

  useEffect(() => {
    setDriverRoster(loadStaffRoster());
  }, []);

  const live = useLiveRoute();
  const fleet = useFleet();
  const schedules = getSchedules();
  const effStatus = (sch) => live.scheduleStatus[sch.id] ?? sch.status;
  const driverOf = (truckId) =>
    live.driverByTruck[truckId] ??
    fleet.find((t) => t.id === truckId)?.driver ??
    null;

  const [sitioQuery, setSitioQuery] = useState("");
  const [previewZoom, setPreviewZoom] = useState(14);
  const [sitioDropdownOpen, setSitioDropdownOpen] = useState(false);
  const [truckId, setTruckId] = useState("");
  const [type, setType] = useState("");
  const [days, setDays] = useState("");
  const [time, setTime] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (isAdding) {
      setSelectedSchedule(null);
      setTruckId(fleet[0]?.id || "");
      setType("Malata (Nabubulok)");
      setDays("Monday, Wednesday, Friday");
      setTime("08:00 AM - 11:00 AM");
      setStatus("Scheduled");
      setStopOrder([]);
      setSitioQuery("");
      setSitioDropdownOpen(false);
    }
  }, [isAdding]);

  useEffect(() => {
    if (selectedSchedule) {
      setIsAdding(false);
      setTruckId(selectedSchedule.activeTruckId);
      setType(selectedSchedule.type);
      setDays(selectedSchedule.days.join(", "));
      setTime(selectedSchedule.time);
      setStatus(live.scheduleStatus[selectedSchedule.id] ?? selectedSchedule.status);
      setStopOrder(selectedSchedule.routePoints ?? []);
      setSitioQuery("");
      setSitioDropdownOpen(false);
    } else {
      setTruckId("");
      setType("");
      setDays("");
      setTime("");
      setStatus("");
      setStopOrder([]);
    }
  }, [selectedSchedule]);

  const shuffleStops = () => {
    setStopOrder((prev) => {
      const next = [...prev];
      for (let i = next.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [next[i], next[j]] = [next[j], next[i]];
      }
      return retimeRoutePoints(next, time);
    });
  };

  // Search-picked sitios become the ordered pickup stops; the store's router
  // traces the street-following green trajectory through them in this order.
  const addSitioStop = (name) => {
    const sitio = TEJERO_SITOS[name];
    if (!sitio) return;
    setSitioQuery("");
    setStopOrder((prev) => {
      if (prev.some((s) => s.name === name)) return prev;
      return [
        ...prev,
        { name, time: estimateStopTime(time, prev.length), lat: sitio.lat, lng: sitio.lng },
      ];
    });
  };

  const removeStop = (index) => {
    setStopOrder((prev) => retimeRoutePoints(prev.filter((_, i) => i !== index), time));
  };

  const handleTimeChange = (value) => {
    setTime(value);
    setStopOrder((prev) => (prev.length ? retimeRoutePoints(prev, value) : prev));
  };

  const sitioList = Object.entries(TEJERO_SITOS).map(([name, v]) => ({
    name,
    aliases: v.aliases ?? [],
  }));
  const filteredSitios = sitioList.filter((s) => {
    if (stopOrder.some((p) => p.name === s.name)) return false;
    const q = sitioQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      s.name.toLowerCase().includes(q) ||
      s.aliases.some((a) => a.toLowerCase().includes(q))
    );
  });

  const buildScheduleFields = () => ({
    zoneId: selectedSchedule?.zoneId ?? null,
    activeTruckId: truckId,
    type,
    days: days.split(",").map((d) => d.trim()).filter(Boolean),
    time,
    status,
  });

  const handleAddSchedule = (e) => {
    e.preventDefault();
    if (!truckId || !type || !days || !time || stopOrder.length === 0) return;

    addSchedule({
      ...buildScheduleFields(),
      routePoints: stopOrder,
    });
    setIsAdding(false);
  };

  const handleUpdateSchedule = (e) => {
    e.preventDefault();
    if (!selectedSchedule || !truckId || !type || !days || !time || stopOrder.length === 0) return;

    if (live.scheduleStatus[selectedSchedule.id] === "In Progress" || selectedSchedule.status === "In Progress") {
      alert("Cannot edit an in-progress schedule.");
      return;
    }

    updateSchedule(selectedSchedule.id, {
      ...buildScheduleFields(),
      routePoints: stopOrder,
    });
    setSelectedSchedule(null);
  };

  const handleDeleteSchedule = (id) => {
    if (live.scheduleStatus[id] === "In Progress") {
      alert("Cannot delete a schedule while it is in progress.");
      setScheduleToDelete(null);
      return;
    }

    if (viewMode === "trash") {
      hardDeleteSchedule(id);
    } else {
      removeSchedule(id);
    }

    if (selectedSchedule?.id === id) {
      setSelectedSchedule(null);
    }
    setScheduleToDelete(null);
  };

  const handleRestoreSchedule = (id) => {
    restoreSchedule(id);
  };

  const openTruckSheet = (mode, truck) => {
    setTruckError("");
    if (mode === "add") {
      const nextNum =
        fleet.reduce((max, t) => {
          const n = parseInt(String(t.id).split("-")[1], 10);
          return Number.isFinite(n) ? Math.max(max, n) : max;
        }, 0) + 1;
      setTruckForm({ id: `TRK-${String(nextNum).padStart(2, "0")}`, plate: "", driver: "", capacity: "" });
    } else {
      setTruckForm({
        id: truck.id,
        plate: truck.plate,
        driver: live.driverByTruck[truck.id] ?? truck.driver ?? "",
        capacity: truck.capacity || "",
      });
    }
    setTruckSheet({ mode, truck: truck ?? null });
  };

  const handleTruckSubmit = (e) => {
    e.preventDefault();
    const res =
      truckSheet.mode === "add"
        ? addTruck(truckForm)
        : updateTruck(truckSheet.truck.id, truckForm);
    if (res.error) {
      setTruckError(res.error);
      return;
    }
    assignDriver(truckForm.id, truckForm.driver || null);
    setTruckSheet(null);
  };

  const handleTruckDeleteRequest = () => {
    const t = truckSheet?.truck;
    if (!t) return;
    if (live.trucks[t.id]?.tracking?.isActive) {
      setTruckError("This truck is on duty. End its route before removing it.");
      return;
    }
    setTruckToRemove(t);
  };

  const handleTruckDelete = () => {
    const t = truckToRemove;
    if (!t) return;
    removeTruck(t.id);
    setTruckToRemove(null);
    setTruckSheet(null);
  };

  const filteredSchedules = schedules.filter((sch) => {
    const isArchived = sch.isArchived === true;
    if (viewMode === "active" && isArchived) return false;
    if (viewMode === "trash" && !isArchived) return false;

    const truck = fleet.find((t) => t.id === sch.activeTruckId);
    const query = searchQuery.toLowerCase();

    return (
      sch.id.toLowerCase().includes(query) ||
      scheduleLabel(sch).toLowerCase().includes(query) ||
      (sch.routePoints || []).some((p) => (p.name || "").toLowerCase().includes(query)) ||
      (driverOf(sch.activeTruckId) || "").toLowerCase().includes(query) ||
      (truck?.id || "").toLowerCase().includes(query) ||
      sch.type.toLowerCase().includes(query)
    );
  });

  const totalSchedules = schedules.filter(s => !s.isArchived).length;
  const activeDispatches = schedules.filter((s) => effStatus(s) === "In Progress" && !s.isArchived).length;

  // Live preview of the trajectory through the picked stops, reusing the same
  // MapCanvas + router the driver/resident maps use. Stop names are folded
  // into the scheduleId so the route-cache key changes with the sequence — the
  // key alone only tracks stop COUNT and would serve stale geometry.
  const previewPath = useRoutePath({
    scheduleId: `preview|${stopOrder.map((s) => s.name).join(">")}`,
    stopIndex: 0,
    origin: null,
    points: stopOrder,
    enabled: (isAdding || selectedSchedule !== null) && stopOrder.length >= 2,
  });

  const formFields = (
    <>
      <Field label="Pickup Stops — Search sitios in Brgy. Tejero">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={sitioQuery}
            onChange={(e) => {
              setSitioQuery(e.target.value);
              setSitioDropdownOpen(true);
            }}
            onFocus={() => setSitioDropdownOpen(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                if (filteredSitios[0]) addSitioStop(filteredSitios[0].name);
              } else if (e.key === "Escape") {
                setSitioDropdownOpen(false);
              }
            }}
            placeholder="Search a sitio or area (e.g. Vilgon, Riverside)..."
            className={cn(inputClass, "pl-9")}
          />
          {sitioDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-10 cursor-default"
                onClick={() => setSitioDropdownOpen(false)}
              />
              <ul className="absolute inset-x-0 top-full z-20 mt-1 max-h-44 overflow-y-auto rounded-lg border border-border bg-card py-1 shadow-lg">
                {filteredSitios.length === 0 ? (
                  <li className="px-3 py-2 text-xs text-muted-foreground">
                    {sitioQuery.trim()
                      ? "No matching sitio in Barangay Tejero."
                      : "All sitios are already on this route."}
                  </li>
                ) : (
                  filteredSitios.map((s) => (
                    <li key={s.name}>
                      <button
                        type="button"
                        onClick={() => addSitioStop(s.name)}
                        className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-muted"
                      >
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                        <span className="text-xs font-semibold text-foreground">{s.name}</span>
                        {s.aliases.length > 0 && (
                          <span className="truncate text-[10px] text-muted-foreground">
                            ({s.aliases.join(", ")})
                          </span>
                        )}
                        <Plus className="ml-auto h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground">
          Pick one or more sitios — the route trajectory is traced through them in the order below.
        </p>
      </Field>

      <Field label="Route Stop Order (Truck starts at Stop 1)">
        <div className="rounded-lg border border-border bg-background">
          {stopOrder.length === 0 ? (
            <p className="px-3 py-3 text-xs text-muted-foreground">
              No stops yet search above to add sitios as pickup stops.
            </p>
          ) : (
            <ul className="divide-y divide-border-subtle">
              {stopOrder.map((stop, i) => (
                <li key={`${stop.name}-${i}`} className="flex items-center gap-2 px-3 py-2">
                  <span
                    className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                      i === 0 ? "bg-emerald-600 text-white" : "bg-muted text-muted-foreground"
                    )}
                  >
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-foreground">{stop.name}</p>
                    <p className="text-[10px] text-muted-foreground">{stop.time}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => removeStop(i)}
                      className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
                      aria-label={`Remove ${stop.name} from route`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {stopOrder.length >= 2 && (
            <div className="flex items-center justify-between gap-2 border-t border-border-subtle px-3 py-2">
              <p className="text-[10px] text-muted-foreground">
                Shuffle to change which sitio the truck starts by.
              </p>
              <button
                type="button"
                onClick={shuffleStops}
                className="flex shrink-0 items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-[10px] font-semibold text-foreground transition-colors hover:bg-muted cursor-pointer"
              >
                <Shuffle className="h-3 w-3" />
                Shuffle Order
              </button>
            </div>
          )}
        </div>
      </Field>

      {stopOrder.length > 0 && (
        <Field label="Route Preview">
          <div className="relative h-52 overflow-hidden rounded-lg border border-border">
            <MapCanvas
              tickets={[]}
              trucks={[]}
              routes={
                previewPath.positions.length >= 2
                  ? [{ id: "assignment-preview", positions: previewPath.positions }]
                  : []
              }
              mapMode="pins"
              currentStop={{ ...stopOrder[0], index: 0 }}
              upcomingStops={stopOrder.slice(1).map((s, i) => ({ ...s, index: i + 1 }))}
              center={[stopOrder[0].lat, stopOrder[0].lng]}
              zoom={previewZoom}
              showTicketPopup={false}
            />

            {/* Floating Zoom In & Zoom Out Controls */}
            <div className="absolute bottom-2.5 right-2.5 z-20 flex flex-col rounded-lg border border-border bg-card/95 shadow-md backdrop-blur-xs">
              <button
                type="button"
                onClick={() => setPreviewZoom((z) => Math.min(z + 1, 18))}
                className="flex h-7 w-7 items-center justify-center rounded-t-lg text-foreground transition-colors hover:bg-muted active:bg-muted/80 cursor-pointer border-b border-border"
                aria-label="Zoom in map preview"
                title="Zoom In"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setPreviewZoom((z) => Math.max(z - 1, 11))}
                className="flex h-7 w-7 items-center justify-center rounded-b-lg text-foreground transition-colors hover:bg-muted active:bg-muted/80 cursor-pointer"
                aria-label="Zoom out map preview"
                title="Zoom Out"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </Field>
      )}

      <Field label="Assigned Truck">
        <select
          value={truckId}
          onChange={(e) => setTruckId(e.target.value)}
          className={cn(inputClass, "cursor-pointer")}
        >
          {fleet.map((t) => (
            <option key={t.id} value={t.id}>{t.id} ({t.plate}) - {driverOf(t.id) || "Unassigned"}</option>
          ))}
        </select>
      </Field>

      <Field label="Collection Type">
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          className={cn(inputClass, "cursor-pointer")}
        >
          <option value="Malata (Nabubulok)">Malata (Nabubulok)</option>
          <option value="Dili Malata (Di-Nabubulok)">Dili Malata (Di-Nabubulok)</option>
          <option value="Recyclable">Recyclable</option>
        </select>
      </Field>

      <Field label="Collection Days">
        <input
          type="text"
          value={days}
          onChange={(e) => setDays(formatDaysInput(e.target.value))}
          onBlur={() => setDays(formatDaysFinal(days))}
          placeholder="e.g. Monday, Wednesday, Friday"
          className={inputClass}
          required
        />
      </Field>

      <Field label="Collection Time">
        <input
          type="text"
          value={time}
          onChange={(e) => handleTimeChange(e.target.value.toUpperCase())}
          onBlur={() => setTime(time.toUpperCase())}
          placeholder="e.g. 08:00 AM - 11:00 AM"
          className={inputClass}
          required
        />
      </Field>

      <Field label="Status">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className={cn(inputClass, "cursor-pointer")}
        >
          <option value="Scheduled">Scheduled</option>
          <option value="In Progress">In Progress</option>
          <option value="Completed">Completed</option>
        </select>
      </Field>
    </>
  );

  const isSheetOpen = isAdding || selectedSchedule !== null;

  return (
    <div className="relative flex min-h-full w-full min-w-0 overflow-x-hidden bg-background bg-[url('/hero-bg.svg')] bg-[length:100%_auto] sm:bg-cover bg-top sm:bg-center bg-no-repeat">
      <div className="absolute inset-0 bg-background/42 pointer-events-none" />
      <div className="relative z-10 flex flex-1 min-w-0 flex-col gap-5 p-4 [scrollbar-gutter:stable] sm:gap-6 sm:p-6 lg:p-8 pb-6 sm:pb-8 lg:pb-10">
        <PageHeader
          title="Fleet Dispatch"
          description="Manage truck assignments and weekly collection schedules"
          actions={
            <Button variant="primary" onClick={() => setIsAdding(true)}>
              <Plus className="h-4 w-4" />
              <span>Create Assignment</span>
            </Button>
          }
        />

        <div className="flex bg-muted/50 p-1 rounded-lg w-fit">
          <button 
            className={cn("px-4 py-1.5 text-sm font-medium rounded-md transition-colors", viewMode === "active" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
            onClick={() => setViewMode("active")}
          >
            Active Assignments
          </button>
          <button 
            className={cn("px-4 py-1.5 text-sm font-medium rounded-md transition-colors", viewMode === "trash" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
            onClick={() => setViewMode("trash")}
          >
            Trash Bin
          </button>
        </div>

        <div className="grid shrink-0 grid-cols-2 gap-3.5 max-w-sm sm:max-w-md">
          <PanelStat label="Schedules" value={totalSchedules} hint="Total collection schedules" />
          <PanelStat label="Trucks Out" value={activeDispatches} hint="Currently collecting" tone="emerald" />
        </div>

        <div className="shrink-0 rounded-xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-foreground">Fleet</h2>
              <span className="text-xs text-muted-foreground">{fleet.length} trucks</span>
            </div>
            <Button variant="secondary" onClick={() => openTruckSheet("add")}>
              <Plus className="h-4 w-4" />
              <span>Add Truck</span>
            </Button>
          </div>
          <div className="w-full">
            {fleet.length === 0 ? (
              <div className="flex w-full flex-col items-center rounded-lg border border-dashed border-border px-4 py-6 text-center">
                <Truck className="h-6 w-6 text-zinc-300" />
                <p className="mt-2 text-xs font-semibold text-foreground">No Trucks in Fleet</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Click &quot;Add Truck&quot; to register your first collection truck.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {fleet.map((t) => {
                  const isActive = live.trucks[t.id]?.tracking?.isActive;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => openTruckSheet("edit", t)}
                      className="group relative flex cursor-pointer flex-col justify-between rounded-xl border border-border bg-card p-3.5 text-left transition-all hover:border-zinc-300 hover:shadow-xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Truck className={`h-4.5 w-4.5 shrink-0 mt-0.5 ${isActive ? "text-emerald-600" : "text-zinc-400"}`} />
                          <div className="flex min-w-0 flex-col">
                            <span className="text-xs font-semibold text-foreground whitespace-nowrap tracking-tight tabular-nums">{t.id}</span>
                            <span className="text-[11px] font-medium text-muted-foreground whitespace-nowrap truncate">{t.plate}</span>
                          </div>
                        </div>
                        <span
                          className={`shrink-0 text-xs font-medium ${
                            isActive ? "text-emerald-600" : "text-zinc-400"
                          }`}
                        >
                          {isActive ? "On Duty" : "Off Duty"}
                        </span>
                      </div>

                      <div className="mt-3 flex items-center justify-between border-t border-border-subtle pt-2.5 text-xs">
                        <span className="text-muted-foreground font-medium">Driver:</span>
                        <span className="font-semibold text-foreground truncate max-w-[130px]" title={t.driver || "Unassigned"}>
                          {t.driver || "Unassigned"}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="flex shrink-0 items-center">
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search schedule, sitio, or truck..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn(inputClass, "pl-9")}
            />
          </div>
        </div>

        <div>
          {filteredSchedules.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-border bg-card p-10 text-center">
              <Calendar className="mb-2.5 h-8 w-8 text-zinc-300" />
              <h3 className="text-sm font-semibold text-foreground">
                {searchQuery ? "No Schedules Found" : viewMode === "trash" ? "Trash is Empty" : "No Schedules Yet"}
              </h3>
              <p className="mt-1 max-w-[240px] text-xs text-muted-foreground">
                {searchQuery ? (
                  <>We couldn&apos;t find any schedules matching &quot;{searchQuery}&quot;.</>
                ) : viewMode === "trash" ? (
                  <>Deleted assignments will appear here.</>
                ) : (
                  <>Click &quot;Create Assignment&quot; to set up your first collection route.</>
                )}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3.5 pb-6 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {filteredSchedules.map((sch) => {
                const isSelected = selectedSchedule?.id === sch.id;
                const truck = fleet.find((t) => t.id === sch.activeTruckId);

                return (
                  <div
                    key={sch.id}
                    onClick={() => setSelectedSchedule(sch)}
                    className={`group flex cursor-pointer select-none flex-col justify-between rounded-xl border bg-card p-4 transition-all ${
                      isSelected
                        ? "border-emerald-400 ring-1 ring-emerald-400/20"
                        : "border-border hover:border-zinc-300 hover:bg-muted/40"
                    }`}
                  >
                    <div>
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-xs font-semibold text-foreground tracking-tight tabular-nums">{sch.id}</span>
                        <StatusBadge status={effStatus(sch)} />
                      </div>

                      <div className="text-sm font-semibold leading-tight text-foreground">
                        {scheduleLabel(sch)}
                      </div>

                      <div className="mt-4 border-t border-border-subtle pt-2">
                        <InfoRow label="Collection Days" value={sch.days.join(", ")} />
                        <InfoRow label="Collection Time" value={sch.time} />
                        <InfoRow
                          label="Assigned Truck"
                          value={`${truck?.id || sch.activeTruckId} (${driverOf(sch.activeTruckId) || "Driver"})`}
                        />
                        <InfoRow label="Waste Type" value={sch.type} />
                      </div>
                    </div>

                    <div className="mt-2 flex shrink-0 items-center justify-end gap-2">
                      {viewMode === "trash" ? (
                        <>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRestoreSchedule(sch.id);
                            }}
                            className="rounded-md border border-emerald-200 bg-card px-2.5 py-1 text-xs font-medium text-emerald-600 transition-colors hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 cursor-pointer"
                            title="Restore Assignment"
                          >
                            Restore
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setScheduleToDelete(sch);
                            }}
                            className="rounded-md border border-rose-200 bg-card px-2.5 py-1 text-xs font-medium text-rose-600 transition-colors hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 cursor-pointer"
                            title="Permanently Delete"
                          >
                            Permanently Delete
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setScheduleToDelete(sch);
                          }}
                          className="rounded-md border border-rose-200 bg-card px-2.5 py-1 text-xs font-medium text-rose-600 transition-colors hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 cursor-pointer"
                          title="Delete Assignment"
                        >
                          Delete Assignment
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Guaranteed bottom spacer element */}
        <div className="h-6 sm:h-8 lg:h-10 w-full shrink-0 pointer-events-none" aria-hidden="true" />
      </div>

      <AnimatePresence>
        {isSheetOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-stretch justify-end pointer-events-none overflow-hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 sm:bg-transparent pointer-events-auto"
              onClick={() => (isAdding ? setIsAdding(false) : setSelectedSchedule(null))}
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="relative z-10 flex h-auto max-h-[85dvh] sm:h-full sm:max-h-full w-full max-w-md flex-col overflow-hidden rounded-t-2xl sm:rounded-none border-t sm:border-t-0 sm:border-l border-border bg-card p-4 sm:p-6 shadow-2xl pointer-events-auto self-end sm:self-auto"
            >
              <form
                onSubmit={isAdding ? handleAddSchedule : handleUpdateSchedule}
                className="flex h-full flex-col justify-between overflow-hidden"
              >
                <div className="flex shrink-0 items-start justify-between border-b border-border pb-3">
                  {isAdding ? (
                    <h2 className="text-sm font-semibold text-foreground">Create Assignment</h2>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-foreground tracking-tight tabular-nums">
                        {selectedSchedule?.id}
                      </span>
                      <StatusBadge status={selectedSchedule ? effStatus(selectedSchedule) : "Scheduled"} />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => (isAdding ? setIsAdding(false) : setSelectedSchedule(null))}
                    className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:text-foreground cursor-pointer"
                    aria-label="Close panel"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto py-3 gap-5 flex flex-col min-h-0">
                  <div className="mt-1 flex flex-col gap-4">{formFields}</div>
                </div>

                <div className="mt-auto shrink-0 flex items-center justify-end gap-2 border-t border-border-subtle pt-4">
                  <Button
                    variant="secondary"
                    type="button"
                    onClick={() => (isAdding ? setIsAdding(false) : setSelectedSchedule(null))}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    type="submit"
                    disabled={stopOrder.length === 0}
                    title={stopOrder.length === 0 ? "Add at least one sitio stop first" : undefined}
                  >
                    {isAdding ? "Create Schedule" : "Save Changes"}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {truckSheet && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-stretch justify-end pointer-events-none overflow-hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 sm:bg-transparent pointer-events-auto"
              onClick={() => setTruckSheet(null)}
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="relative z-10 flex h-auto max-h-[85dvh] sm:h-full sm:max-h-full w-full max-w-md flex-col overflow-hidden rounded-t-2xl sm:rounded-none border-t sm:border-t-0 sm:border-l border-border bg-card p-4 sm:p-6 shadow-2xl pointer-events-auto self-end sm:self-auto"
            >
              <form onSubmit={handleTruckSubmit} className="flex h-full flex-col justify-between overflow-hidden">
                <div className="flex shrink-0 items-start justify-between border-b border-border pb-3">
                  <h2 className="text-sm font-semibold text-foreground">
                    {truckSheet.mode === "add" ? "Add Truck" : `Edit ${truckSheet.truck?.id}`}
                  </h2>
                  <button
                    type="button"
                    onClick={() => setTruckSheet(null)}
                    className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:text-foreground cursor-pointer"
                    aria-label="Close panel"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto py-3 gap-5 flex flex-col min-h-0">
                  <div className="mt-1 flex flex-col gap-4">
                    <Field label="Truck Code">
                      <input
                        type="text"
                        value={truckForm.id}
                        onChange={(e) => setTruckForm({ ...truckForm, id: e.target.value })}
                        placeholder="e.g. TRK-05"
                        className={cn(inputClass, "font-mono")}
                        required
                      />
                    </Field>
                    <Field label="Plate Number">
                      <input
                        type="text"
                        value={truckForm.plate}
                        onChange={(e) => setTruckForm({ ...truckForm, plate: e.target.value })}
                        placeholder="e.g. GW-1234"
                        className={cn(inputClass, "font-mono")}
                        required
                      />
                    </Field>
                    <Field label="Assign Driver (optional)">
                      <select
                        value={truckForm.driver}
                        onChange={(e) => setTruckForm({ ...truckForm, driver: e.target.value })}
                        className={cn(inputClass, "cursor-pointer")}
                      >
                        <option value="">Unassigned</option>
                        {driverRoster
                          .filter((p) => p.status === "Active")
                          .map((p) => (
                            <option key={p.id} value={p.name}>
                              {p.name}
                            </option>
                          ))}
                        {truckForm.driver &&
                          !driverRoster.some((p) => p.name === truckForm.driver) && (
                            <option value={truckForm.driver}>{truckForm.driver}</option>
                          )}
                      </select>
                    </Field>
                    <Field label="Capacity (optional)">
                      <input
                        type="text"
                        value={truckForm.capacity}
                        onChange={(e) => setTruckForm({ ...truckForm, capacity: e.target.value })}
                        placeholder="e.g. 10 Tons"
                        className={inputClass}
                      />
                    </Field>
                    {truckError && (
                      <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-600">
                        {truckError}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-auto shrink-0 flex items-center justify-between gap-2 border-t border-border-subtle pt-4">
                  <div>
                    {truckSheet.mode === "edit" && (
                      <Button variant="secondary" type="button" onClick={handleTruckDeleteRequest} className="text-rose-600">
                        Remove Truck
                      </Button>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="secondary" type="button" onClick={() => setTruckSheet(null)}>
                      Cancel
                    </Button>
                    <Button variant="primary" type="submit">
                      {truckSheet.mode === "add" ? "Add Truck" : "Save Changes"}
                    </Button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmModal
        open={!!scheduleToDelete}
        title={viewMode === "trash" ? "Permanently Delete Assignment" : "Delete Assignment"}
        description={
          viewMode === "trash"
            ? `This will permanently remove schedule ${scheduleToDelete?.id}. This action cannot be undone.`
            : `This will move schedule ${scheduleToDelete?.id} to the trash bin.`
        }
        onConfirm={() => handleDeleteSchedule(scheduleToDelete?.id)}
        onCancel={() => setScheduleToDelete(null)}
      />

      <ConfirmModal
        open={!!truckToRemove}
        title="Remove Truck"
        description={`This will permanently remove ${truckToRemove?.id} (${truckToRemove?.plate}) from the fleet. This action cannot be undone.`}
        confirmLabel="Remove"
        onConfirm={handleTruckDelete}
        onCancel={() => setTruckToRemove(null)}
      />
    </div>
  );
}
