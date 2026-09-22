"use client";

import { useState } from "react";
import { Search, Trash2, RotateCcw, X, ImageOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useArchivedTickets, restoreTicket, hardDeleteTicket } from "@/lib/tickets";
import { useLiveRoute, getSchedules, restoreSchedule, hardDeleteSchedule, scheduleLabel } from "@/lib/live-route";
import { StatusBadge, UrgencyBadge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { InfoRow } from "@/components/ui/info-row";
import { inputClass } from "@/components/ui/input";
import { cn, formatTicketDateTime } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import ConfirmModal from "@/components/ui/confirm-modal";
import { useLockBodyScroll } from "@/lib/use-lock-body-scroll";

function DetailBlock({ label, children, className = "" }) {
  return (
    <div className={`flex flex-col gap-1.5 rounded-xl border border-border bg-muted/40 p-3.5 ${className}`}>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

function TicketPhoto({ photo }) {
  if (!photo) {
    return (
      <div className="flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-lg border border-border bg-muted text-muted-foreground">
        <ImageOff className="h-8 w-8 opacity-40" strokeWidth={1.5} />
        <span className="text-xs">No photo attached</span>
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={photo} alt="Report photo" className="h-full w-full rounded-lg object-cover" />
  );
}

export default function BinPage() {
  const archivedTickets = useArchivedTickets();
  const live = useLiveRoute();
  const archivedSchedules = getSchedules().filter(s => s.isArchived);
  
  const [viewType, setViewType] = useState("reports"); // "reports" | "schedules"
  const [search, setSearch] = useState("");
  
  // State for confirm modal
  const [itemToDelete, setItemToDelete] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null); // { type: 'ticket'|'schedule', data }

  const isSheetOpen = selectedItem !== null;
  useLockBodyScroll(isSheetOpen);

  const handleRestore = (id) => {
    if (viewType === "reports") restoreTicket(id);
    else restoreSchedule(id);
  };

  const handleHardDelete = (id) => {
    if (viewType === "reports") hardDeleteTicket(id);
    else hardDeleteSchedule(id);
    setItemToDelete(null);
    if (selectedItem?.data?.id === id) setSelectedItem(null);
  };

  const handleSheetRestore = () => {
    if (!selectedItem) return;
    if (selectedItem.type === "ticket") restoreTicket(selectedItem.data.id);
    else restoreSchedule(selectedItem.data.id);
    setSelectedItem(null);
  };

  const handleSheetDelete = () => {
    if (!selectedItem) return;
    setItemToDelete(selectedItem.data.id);
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
                  <div
                    key={t.id}
                    onClick={() => setSelectedItem({ type: "ticket", data: t })}
                    className="group flex cursor-pointer select-none flex-col justify-between rounded-2xl border border-border/60 bg-card p-4 transition-all hover:border-zinc-300 hover:bg-muted/40"
                  >
                    <div className="flex shrink-0 flex-nowrap items-center justify-between gap-2">
                      <span className="truncate text-xs font-semibold tracking-tight text-muted-foreground">
                        {t.category || "Waste Report"}
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
                    
                    <div className="mt-2 flex shrink-0 items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleRestore(t.id); }}
                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-[13px] font-semibold text-foreground transition-all hover:bg-muted/80 active:scale-95"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Restore
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setItemToDelete(t.id); }}
                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-rose-600/10 px-3 py-1 text-[13px] font-semibold text-rose-600 transition-all hover:bg-rose-600/20 active:scale-95"
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
                  <div
                    key={sch.id}
                    onClick={() => setSelectedItem({ type: "schedule", data: sch })}
                    className="group flex cursor-pointer select-none flex-col justify-between rounded-2xl border border-border/60 bg-card p-4 transition-all hover:border-zinc-300 hover:bg-muted/40"
                  >
                    <div className="flex shrink-0 flex-nowrap items-center justify-between gap-2">
                      <span className="truncate text-xs font-semibold tracking-tight text-muted-foreground">
                        {scheduleLabel(sch)}
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
                    
                    <div className="mt-2 flex shrink-0 items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleRestore(sch.id); }}
                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-[13px] font-semibold text-foreground transition-all hover:bg-muted/80 active:scale-95"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Restore
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setItemToDelete(sch.id); }}
                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-rose-600/10 px-3 py-1 text-[13px] font-semibold text-rose-600 transition-all hover:bg-rose-600/20 active:scale-95"
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

      <AnimatePresence>
        {isSheetOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-stretch justify-center sm:justify-end pointer-events-none overflow-hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 sm:bg-transparent pointer-events-auto"
              onClick={() => setSelectedItem(null)}
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="relative z-10 flex h-full w-full min-w-0 flex-col overflow-hidden bg-card pointer-events-auto sm:max-w-md sm:border-l sm:border-border sm:shadow-2xl"
            >
              <div className="mx-auto flex h-full w-full max-w-3xl flex-col justify-between overflow-hidden p-4 sm:p-6">
                <div className="flex shrink-0 touch-none items-start justify-between border-b border-border/60 pb-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {selectedItem?.type === "ticket" ? (
                      <>
                        <span className="text-[17px] font-semibold tracking-tight text-foreground">{selectedItem.data.category || "Waste Report"}</span>
                        <UrgencyBadge urgency={selectedItem.data.urgency} />
                        <StatusBadge status={selectedItem.data.status} />
                      </>
                    ) : (
                      <>
                        <span className="text-[17px] font-semibold tracking-tight text-foreground">{scheduleLabel(selectedItem?.data) || "Schedule"}</span>
                        <StatusBadge status={selectedItem?.data?.status} />
                      </>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedItem(null)}
                    className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:text-foreground cursor-pointer"
                    aria-label="Close panel"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto overscroll-contain py-3 gap-5 flex flex-col min-h-0">
                  {selectedItem?.type === "ticket" ? (
                    <>
                      <div className="flex shrink-0 flex-col gap-3 py-1">
                        <DetailBlock label="Location">
                          <span className="text-sm font-semibold text-foreground">{selectedItem.data.location}</span>
                          <span className="text-xs text-muted-foreground">{selectedItem.data.barangay || "Tejero"}, Cebu City</span>
                        </DetailBlock>
                        <DetailBlock label="Reporter">
                          <span className="text-sm font-semibold text-foreground">{selectedItem.data.reporter}</span>
                        </DetailBlock>
                        <DetailBlock label="Date & Time">
                          <span className="text-sm font-semibold text-foreground tracking-tight tabular-nums">{selectedItem.data.timestamp ? formatTicketDateTime(selectedItem.data.timestamp) : `${selectedItem.data.date || "—"} ${selectedItem.data.time || ""}`}</span>
                        </DetailBlock>
                        <DetailBlock label="Barangay">
                          <span className="text-sm font-semibold text-foreground">{selectedItem.data.barangay || "Tejero"}</span>
                          <span className="text-xs text-muted-foreground">Cebu City</span>
                        </DetailBlock>
                      </div>
                      <DetailBlock label="Additional Details" className="shrink-0">
                        <p className="text-sm leading-relaxed text-zinc-700">{selectedItem.data.description || selectedItem.data.notes || "No additional details provided."}</p>
                      </DetailBlock>
                      <DetailBlock label="Photo from Resident" className="shrink-0">
                        <div className="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-lg border border-border bg-muted">
                          <TicketPhoto photo={selectedItem.data.photo} />
                        </div>
                      </DetailBlock>
                    </>
                  ) : (
                    <>
                      <div className="flex shrink-0 flex-col gap-3 py-1">
                        <DetailBlock label="Assigned Truck">
                          <span className="text-sm font-semibold text-foreground">{selectedItem.data.truckId || "Unassigned"}</span>
                        </DetailBlock>
                        <DetailBlock label="Collection Type">
                          <span className="text-sm font-semibold text-foreground">{selectedItem.data.collectionType || "Any"}</span>
                        </DetailBlock>
                        <DetailBlock label="Collection Time">
                          <span className="text-sm font-semibold text-foreground tabular-nums">{selectedItem.data.time || "—"}</span>
                        </DetailBlock>
                        <DetailBlock label="Collection Days">
                          <span className="text-sm font-semibold text-foreground">{Array.isArray(selectedItem.data.collectionDays) ? selectedItem.data.collectionDays.join(", ") : selectedItem.data.collectionDays || "—"}</span>
                        </DetailBlock>
                        <DetailBlock label="Route">
                          <span className="text-sm font-semibold text-foreground">{scheduleLabel(selectedItem.data)}</span>
                          {Array.isArray(selectedItem.data.routePoints) && selectedItem.data.routePoints.length > 0 && (
                            <ul className="mt-2 divide-y divide-border-subtle overflow-hidden rounded-lg border border-border bg-background">
                              {selectedItem.data.routePoints.map((p, i) => (
                                <li key={`${p.name || p}-${i}`} className="flex items-center gap-2 px-3 py-2">
                                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">{i + 1}</span>
                                  <span className="text-xs font-semibold text-foreground">{typeof p === "string" ? p : p.name}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </DetailBlock>
                      </div>
                    </>
                  )}
                </div>

                <div className="mt-auto shrink-0 touch-none flex flex-col-reverse gap-2 border-t border-border-subtle pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <Button
                      variant="secondary"
                      type="button"
                      onClick={handleSheetDelete}
                      className="h-10 w-full gap-1.5 rounded-xl px-4 text-[14px] font-semibold text-rose-600 sm:w-auto"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete Permanently
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 items-center gap-2 sm:flex">
                    <Button
                      variant="secondary"
                      type="button"
                      className="h-10 rounded-xl px-4 text-[14px] font-semibold"
                      onClick={() => setSelectedItem(null)}
                    >
                      Close
                    </Button>
                    <Button
                      variant="secondary"
                      type="button"
                      className="h-10 gap-1.5 rounded-xl px-4 text-[14px] font-semibold sm:w-auto"
                      onClick={handleSheetRestore}
                    >
                      <RotateCcw className="w-4 h-4" />
                      Restore
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
