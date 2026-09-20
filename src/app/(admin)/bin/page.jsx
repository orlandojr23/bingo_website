"use client";

import { useState } from "react";
import { Search, Trash2, RotateCcw } from "lucide-react";
import { useArchivedTickets, restoreTicket, hardDeleteTicket } from "@/lib/tickets";
import { useLiveRoute, getSchedules, restoreSchedule, hardDeleteSchedule } from "@/lib/live-route";
import { StatusBadge, UrgencyBadge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { InfoRow } from "@/components/ui/info-row";
import { inputClass } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import ConfirmModal from "@/components/ui/confirm-modal";

export default function BinPage() {
  const archivedTickets = useArchivedTickets();
  const live = useLiveRoute();
  const archivedSchedules = getSchedules().filter(s => s.isArchived);
  
  const [viewType, setViewType] = useState("reports"); // "reports" | "schedules"
  const [search, setSearch] = useState("");
  
  // State for confirm modal
  const [itemToDelete, setItemToDelete] = useState(null);

  const handleRestore = (id) => {
    if (viewType === "reports") restoreTicket(id);
    else restoreSchedule(id);
  };

  const handleHardDelete = (id) => {
    if (viewType === "reports") hardDeleteTicket(id);
    else hardDeleteSchedule(id);
    setItemToDelete(null);
  };

  const filteredTickets = archivedTickets.filter((t) => {
    const matchSearch =
      (t.location || "").toLowerCase().includes(search.toLowerCase()) ||
      (t.id || "").toLowerCase().includes(search.toLowerCase()) ||
      (t.reporter || "").toLowerCase().includes(search.toLowerCase());
    return matchSearch;
  });

  const filteredSchedules = archivedSchedules.filter((s) => {
    const matchSearch =
      (s.truckId || "").toLowerCase().includes(search.toLowerCase()) ||
      (s.id || "").toLowerCase().includes(search.toLowerCase());
    return matchSearch;
  });

  return (
    <div className="relative flex min-h-full w-full min-w-0 overflow-x-hidden bg-background">
      <div className="relative z-10 flex flex-1 min-w-0 flex-col gap-5 p-4 [scrollbar-gutter:stable] sm:gap-6 sm:p-6 lg:p-8 pb-6 sm:pb-8 lg:pb-10">
        <PageHeader
          title="Bin"
          description="View and permanently delete or restore archived records."
        />

        <div className="flex shrink-0 flex-col items-center gap-3 sm:flex-row">
          <div className="relative w-full flex-1">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search deleted records..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={cn(inputClass, "pl-9")}
            />
          </div>

          <div className="flex w-full shrink-0 items-center gap-2 sm:w-auto">
            <select
              value={viewType}
              onChange={(e) => setViewType(e.target.value)}
              className={cn(inputClass, "cursor-pointer flex-1 sm:w-auto sm:flex-none")}
            >
              <option value="reports">Waste Reports ({archivedTickets.length})</option>
              <option value="schedules">Fleet Schedules ({archivedSchedules.length})</option>
            </select>
          </div>
        </div>

        <div className="flex flex-1 flex-col">
          {viewType === "reports" ? (
            filteredTickets.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center px-4 py-14 text-center">
                <Trash2 className="h-12 w-12 text-muted-foreground/40" strokeWidth={1.5} />
                <h3 className="mt-4 text-[17px] font-semibold tracking-tight text-foreground">Bin is Empty</h3>
                <p className="mt-1 max-w-[240px] text-[13px] leading-normal text-muted-foreground">
                  {search ? "No deleted reports match your search." : "There are no deleted waste reports."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {filteredTickets.map((t) => (
                  <div key={t.id} className="group flex flex-col justify-between rounded-2xl border border-border/60 bg-card p-4 transition-all">
                    <div className="flex shrink-0 flex-nowrap items-center justify-between gap-2">
                      <span className="shrink-0 whitespace-nowrap text-xs font-semibold tracking-tight text-foreground tabular-nums">
                        {t.id}
                      </span>
                      <UrgencyBadge urgency={t.urgency} />
                    </div>

                    <div className="mt-3.5">
                      <div className="truncate text-sm font-semibold text-foreground" title={t.location}>
                        {t.location}
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        {t.category || "Solid Waste"}
                      </div>
                    </div>

                    <div className="mt-4 border-t border-border-subtle pt-2">
                      <InfoRow label="Status" value={<StatusBadge status={t.status} showDot={false} className="p-0" />} />
                      <InfoRow label="Reported By" value={t.reporter} />
                    </div>
                    
                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={() => handleRestore(t.id)}
                        className="flex-1 rounded-full bg-muted px-3 py-1.5 text-[13px] font-semibold text-foreground transition-all hover:bg-muted/80 active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Restore
                      </button>
                      <button
                        onClick={() => setItemToDelete(t.id)}
                        className="flex-1 rounded-full bg-rose-600/10 px-3 py-1.5 text-[13px] font-semibold text-rose-600 transition-all hover:bg-rose-600/20 active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            filteredSchedules.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center px-4 py-14 text-center">
                <Trash2 className="h-12 w-12 text-muted-foreground/40" strokeWidth={1.5} />
                <h3 className="mt-4 text-[17px] font-semibold tracking-tight text-foreground">Bin is Empty</h3>
                <p className="mt-1 max-w-[240px] text-[13px] leading-normal text-muted-foreground">
                  {search ? "No deleted schedules match your search." : "There are no deleted schedules."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3.5 pb-6 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                {filteredSchedules.map((sch) => (
                  <div key={sch.id} className="group flex flex-col justify-between rounded-2xl border border-border/60 bg-card p-4 transition-all">
                    <div className="flex shrink-0 flex-nowrap items-center justify-between gap-2">
                      <span className="shrink-0 whitespace-nowrap text-xs font-semibold tracking-tight text-foreground tabular-nums">
                        {sch.id}
                      </span>
                      <StatusBadge status={sch.status} />
                    </div>

                    <div className="mt-3">
                      <div className="text-xs text-muted-foreground">Truck</div>
                      <div className="font-semibold text-foreground">{sch.truckId || "Unassigned"}</div>
                    </div>

                    <div className="mt-2 border-t border-border-subtle pt-2 text-xs">
                      <div className="flex items-center justify-between py-1">
                        <span className="text-muted-foreground">Type:</span>
                        <span className="font-medium text-foreground">{sch.collectionType || "Any"}</span>
                      </div>
                      <div className="flex items-center justify-between py-1">
                        <span className="text-muted-foreground">Time:</span>
                        <span className="font-medium text-foreground tabular-nums">{sch.time}</span>
                      </div>
                    </div>
                    
                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={() => handleRestore(sch.id)}
                        className="flex-1 rounded-full bg-muted px-3 py-1.5 text-[13px] font-semibold text-foreground transition-all hover:bg-muted/80 active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Restore
                      </button>
                      <button
                        onClick={() => setItemToDelete(sch.id)}
                        className="flex-1 rounded-full bg-rose-600/10 px-3 py-1.5 text-[13px] font-semibold text-rose-600 transition-all hover:bg-rose-600/20 active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>

        <ConfirmModal
          open={!!itemToDelete}
          onCancel={() => setItemToDelete(null)}
          onConfirm={() => handleHardDelete(itemToDelete)}
          title="Delete Permanently"
          description="Are you sure you want to permanently delete this record? This action cannot be undone."
          confirmLabel="Yes, delete"
        />
      </div>
    </div>
  );
}
