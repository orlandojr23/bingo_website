"use client";

import { useState, useEffect } from "react";
import { Calendar, Plus, X, Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { mockPilotData } from "@/lib/mock-data";
import { useLiveRoute, setScheduleStatus } from "@/lib/live-route";
import { StatusBadge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { PanelStat } from "@/components/ui/panel-stat";
import { InfoRow } from "@/components/ui/info-row";
import { Button } from "@/components/ui/button";
import { inputClass, labelClass } from "@/components/ui/input";
import { cn } from "@/lib/utils";

function Field({ label, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className={labelClass}>{label}</label>
      {children}
    </div>
  );
}

export default function DispatchPage() {
  const [schedules, setSchedules] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSchedule, setSelectedSchedule] = useState(null);
  const [isAdding, setIsAdding] = useState(false);

  const live = useLiveRoute();
  const effStatus = (sch) => live.scheduleStatus[sch.id] ?? sch.status;
  const driverOf = (truckId) =>
    live.driverByTruck[truckId] ??
    mockPilotData.trucks.find((t) => t.id === truckId)?.driver ??
    null;

  const [zoneId, setZoneId] = useState("");
  const [truckId, setTruckId] = useState("");
  const [type, setType] = useState("");
  const [days, setDays] = useState("");
  const [time, setTime] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    setSchedules(mockPilotData.schedules);
  }, []);

  useEffect(() => {
    if (isAdding) {
      setSelectedSchedule(null);
      setZoneId(mockPilotData.zones[0]?.id || "");
      setTruckId(mockPilotData.trucks[0]?.id || "");
      setType("Biodegradable (Nabubulok)");
      setDays("Monday, Wednesday, Friday");
      setTime("08:00 AM - 11:00 AM");
      setStatus("Scheduled");
    }
  }, [isAdding]);

  useEffect(() => {
    if (selectedSchedule) {
      setIsAdding(false);
      setZoneId(selectedSchedule.zoneId);
      setTruckId(selectedSchedule.activeTruckId);
      setType(selectedSchedule.type);
      setDays(selectedSchedule.days.join(", "));
      setTime(selectedSchedule.time);
      setStatus(live.scheduleStatus[selectedSchedule.id] ?? selectedSchedule.status);
    } else {
      setZoneId("");
      setTruckId("");
      setType("");
      setDays("");
      setTime("");
      setStatus("");
    }
  }, [selectedSchedule]);

  const buildScheduleFields = () => ({
    zoneId,
    activeTruckId: truckId,
    type,
    days: days.split(",").map((d) => d.trim()).filter(Boolean),
    time,
    status,
  });

  const handleAddSchedule = (e) => {
    e.preventDefault();
    if (!zoneId || !truckId || !type || !days || !time) return;

    const nextIdNum =
      schedules.length > 0
        ? Math.max(...schedules.map((s) => parseInt(s.id.split("-")[1]))) + 1
        : 1;
    const newSch = { id: `SCH-${String(nextIdNum).padStart(3, "0")}`, ...buildScheduleFields() };

    setSchedules((prev) => [...prev, newSch]);
    setScheduleStatus(newSch.id, newSch.status);
    setIsAdding(false);
  };

  const handleUpdateSchedule = (e) => {
    e.preventDefault();
    if (!selectedSchedule || !zoneId || !truckId || !type || !days || !time) return;

    setSchedules((prev) =>
      prev.map((s) => (s.id === selectedSchedule.id ? { ...s, ...buildScheduleFields() } : s))
    );
    setScheduleStatus(selectedSchedule.id, status);
    setSelectedSchedule(null);
  };

  const handleDeleteSchedule = (id, e) => {
    e.stopPropagation();
    setSchedules((prev) => prev.filter((s) => s.id !== id));
    if (selectedSchedule?.id === id) {
      setSelectedSchedule(null);
    }
  };

  const filteredSchedules = schedules.filter((sch) => {
    const zone = mockPilotData.zones.find((z) => z.id === sch.zoneId);
    const truck = mockPilotData.trucks.find((t) => t.id === sch.activeTruckId);
    const query = searchQuery.toLowerCase();

    return (
      sch.id.toLowerCase().includes(query) ||
      (zone?.name || "").toLowerCase().includes(query) ||
      (driverOf(sch.activeTruckId) || "").toLowerCase().includes(query) ||
      (truck?.id || "").toLowerCase().includes(query) ||
      sch.type.toLowerCase().includes(query)
    );
  });

  const totalSchedules = schedules.length;
  const activeDispatches = schedules.filter((s) => effStatus(s) === "In Progress").length;

  const formFields = (
    <>
      <Field label="Sitio Coverage">
        <select
          value={zoneId}
          onChange={(e) => setZoneId(e.target.value)}
          className={cn(inputClass, "cursor-pointer")}
        >
          {mockPilotData.zones.map((z) => (
            <option key={z.id} value={z.id}>{z.name}</option>
          ))}
        </select>
      </Field>

      <Field label="Assigned Truck">
        <select
          value={truckId}
          onChange={(e) => setTruckId(e.target.value)}
          className={cn(inputClass, "cursor-pointer")}
        >
          {mockPilotData.trucks.map((t) => (
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
          <option value="Biodegradable (Nabubulok)">Biodegradable (Nabubulok)</option>
          <option value="Non-Biodegradable (Di-Nabubulok)">Non-Biodegradable (Di-Nabubulok)</option>
          <option value="Recyclable">Recyclable</option>
        </select>
      </Field>

      <Field label="Collection Days">
        <input
          type="text"
          value={days}
          onChange={(e) => setDays(e.target.value)}
          placeholder="e.g. Monday, Wednesday, Friday"
          className={inputClass}
          required
        />
      </Field>

      <Field label="Collection Time">
        <input
          type="text"
          value={time}
          onChange={(e) => setTime(e.target.value)}
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
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-6 [scrollbar-gutter:stable] lg:p-8">
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

        <div className="grid shrink-0 grid-cols-2 gap-3.5 max-w-sm sm:max-w-md">
          <PanelStat label="Schedules" value={totalSchedules} hint="Total collection schedules" />
          <PanelStat label="Trucks Out" value={activeDispatches} hint="Currently collecting" tone="emerald" />
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
              <h3 className="text-sm font-semibold text-foreground">No Schedules Found</h3>
              <p className="mt-1 max-w-[220px] text-xs text-muted-foreground">
                We couldn&apos;t find any schedules matching &quot;{searchQuery}&quot;.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {filteredSchedules.map((sch) => {
                const isSelected = selectedSchedule?.id === sch.id;
                const zone = mockPilotData.zones.find((z) => z.id === sch.zoneId);
                const truck = mockPilotData.trucks.find((t) => t.id === sch.activeTruckId);

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
                        <span className="font-mono text-xs font-semibold text-foreground">{sch.id}</span>
                        <StatusBadge status={effStatus(sch)} />
                      </div>

                      <div className="text-sm font-semibold leading-tight text-foreground">
                        {zone?.name || sch.zoneId}
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

                    <div className="mt-2 flex shrink-0 items-center justify-end">
                      <button
                        type="button"
                        onClick={(e) => handleDeleteSchedule(sch.id, e)}
                        className="rounded-md border border-rose-200 bg-card px-2.5 py-1 text-xs font-medium text-rose-600 transition-colors hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 cursor-pointer"
                        title="Delete Assignment"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {isSheetOpen && (
          <div className="fixed inset-0 z-50 flex justify-end pointer-events-none overflow-hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-transparent pointer-events-auto"
              onClick={() => (isAdding ? setIsAdding(false) : setSelectedSchedule(null))}
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="relative z-10 flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-border bg-card p-6 shadow-2xl pointer-events-auto"
            >
              <form
                onSubmit={isAdding ? handleAddSchedule : handleUpdateSchedule}
                className="flex h-full flex-col overflow-hidden"
              >
                <div className="flex flex-1 flex-col gap-5 overflow-y-auto">
                  <div className="flex shrink-0 items-start justify-between border-b border-border pb-3">
                    {isAdding ? (
                      <h2 className="text-sm font-semibold text-foreground">Create Assignment</h2>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-foreground">
                          {selectedSchedule?.id}
                        </span>
                        <StatusBadge status={selectedSchedule ? effStatus(selectedSchedule) : "Scheduled"} />
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => (isAdding ? setIsAdding(false) : setSelectedSchedule(null))}
                      className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
                      aria-label="Close panel"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-1 flex flex-col gap-4">{formFields}</div>
                </div>

                <div className="mt-6 flex shrink-0 items-center justify-end gap-2 border-t border-border-subtle pt-4">
                  <Button
                    variant="secondary"
                    type="button"
                    onClick={() => (isAdding ? setIsAdding(false) : setSelectedSchedule(null))}
                  >
                    Cancel
                  </Button>
                  <Button variant="primary" type="submit">
                    {isAdding ? "Create" : "Save"}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
