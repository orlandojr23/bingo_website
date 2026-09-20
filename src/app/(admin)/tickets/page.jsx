"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Inbox, Trash2 } from "lucide-react";
import { useTickets, updateTicket, removeTicket } from "@/lib/tickets";
import { StatusBadge, UrgencyBadge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { PanelStat } from "@/components/ui/panel-stat";
import { InfoRow } from "@/components/ui/info-row";
import { inputClass } from "@/components/ui/input";
import { cn, formatTicketDateTime } from "@/lib/utils";
import TicketDetailsModal from "@/components/modals/ticket-details-modal";
import ConfirmModal from "@/components/ui/confirm-modal";
import { useToast } from "@/components/pwa/Toast";

/** Short human-readable ticket ID, e.g. #A3F298 */
const shortId = (id) => (id ? "#" + id.replace(/-/g, "").slice(0, 6).toUpperCase() : "—");

export default function TicketsPage() {
  const router = useRouter();
  const tickets = useTickets();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [urgencyFilter, setUrgencyFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("All");
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [ticketToDelete, setTicketToDelete] = useState(null);
  const { toast, ToastViewport } = useToast();

  const handleUpdateStatus = async (ticketId, newStatus) => {
    try {
      const result = await updateTicket(ticketId, { status: newStatus });
      // Only reflect the change locally after the database write succeeds —
      // otherwise the UI would show a status that was never saved. Guarded
      // merge: the panel closes on Save, so `prev` is usually null by now —
      // merging onto null would resurrect a status-only zombie object.
      setSelectedTicket((prev) =>
        prev && prev.id === ticketId ? { ...prev, status: newStatus } : prev
      );
      if (newStatus === "Resolved") {
        if (result?.remote) {
          toast("Marked Cleaned Up — resident notified.");
        } else {
          toast("Marked Cleaned Up, but the resident could not be notified. Check connection/RLS.", { variant: "error" });
        }
      }
    } catch {
      toast("Failed to update status. Please try again.", { variant: "error" });
    }
  };

  const handleDeleteTicket = (id) => {
    removeTicket(id);
    if (selectedTicket?.id === id) {
      setSelectedTicket(null);
    }
    setTicketToDelete(null);
  };

  const handleLocateOnMap = (t) => {
    router.push(`/live-map?ticketId=${t.id}`);
  };

  const filteredTickets = tickets.filter((t) => {
    const matchSearch =
      (t.location || "").toLowerCase().includes(search.toLowerCase()) ||
      (t.id || "").toLowerCase().includes(search.toLowerCase()) ||
      (t.reporter || "").toLowerCase().includes(search.toLowerCase()) ||
      (t.barangay || "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "All" || t.status === statusFilter;
    const matchUrgency = urgencyFilter === "All" || t.urgency === urgencyFilter;

    let matchDate = true;
    if (dateFilter !== "All" && t.timestamp) {
      const ticketDate = new Date(t.timestamp);
      const now = new Date();
      if (dateFilter === "Today") {
        matchDate = ticketDate.toDateString() === now.toDateString();
      } else if (dateFilter === "Last 7 Days") {
        const sevenDaysAgo = new Date(now.setDate(now.getDate() - 7));
        matchDate = ticketDate >= sevenDaysAgo;
      } else if (dateFilter === "Last 30 Days") {
        const thirtyDaysAgo = new Date(now.setDate(now.getDate() - 30));
        matchDate = ticketDate >= thirtyDaysAgo;
      } else if (dateFilter === "This Year") {
        matchDate = ticketDate.getFullYear() === now.getFullYear();
      }
    }

    return matchSearch && matchStatus && matchUrgency && matchDate;
  });

  const totalReports = tickets.length;
  const pendingReports = tickets.filter((t) => t.status === "Pending").length;

  return (
    <div className="relative flex min-h-full w-full min-w-0 overflow-x-hidden bg-background">
      <div className="relative z-10 flex flex-1 min-w-0 flex-col gap-5 p-4 [scrollbar-gutter:stable] sm:gap-6 sm:p-6 lg:p-8 pb-6 sm:pb-8 lg:pb-10">
        <PageHeader
          title="Reports"
          description="All waste reports submitted by residents and their current status"
        />

        <div className="grid shrink-0 grid-cols-2 gap-3 sm:gap-3.5 max-w-sm sm:max-w-md">
          <PanelStat label="Total Reports" value={totalReports} hint="All submitted reports" />
          <PanelStat label="Waiting" value={pendingReports} hint="Needs attention" tone="rose" />
        </div>

        <div className="flex shrink-0 flex-col items-center gap-3 sm:flex-row">
          <div className="relative w-full flex-1">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search reports by ID, location, or reporter..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={cn(inputClass, "pl-9")}
            />
          </div>

          <div className="flex w-full shrink-0 items-center gap-2 sm:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={cn(inputClass, "cursor-pointer flex-1 sm:w-auto sm:flex-none")}
            >
              <option value="All">All Statuses</option>
              <option value="Pending">Waiting</option>
              <option value="Resolved">Cleaned Up</option>
            </select>

            <select
              value={urgencyFilter}
              onChange={(e) => setUrgencyFilter(e.target.value)}
              className={cn(inputClass, "cursor-pointer flex-1 sm:w-auto sm:flex-none")}
            >
              <option value="All">All Priorities</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Critical">Emergency</option>
            </select>

            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className={cn(inputClass, "cursor-pointer flex-1 sm:w-auto sm:flex-none")}
            >
              <option value="All">All Time</option>
              <option value="Today">Today</option>
              <option value="Last 7 Days">Last 7 Days</option>
              <option value="Last 30 Days">Last 30 Days</option>
              <option value="This Year">This Year</option>
            </select>
          </div>
        </div>

        <div>
          {filteredTickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-4 py-14 text-center">
              <Inbox className="h-12 w-12 text-muted-foreground/40" strokeWidth={1.5} />
              <h3 className="mt-4 text-[17px] font-semibold tracking-tight text-foreground">No Reports Found</h3>
              <p className="mt-1 max-w-[240px] text-[13px] leading-normal text-muted-foreground">
                {search || statusFilter !== "All" || urgencyFilter !== "All"
                  ? "Try different search keywords or filters."
                  : "No waste reports have been submitted yet. Resident reports will appear here."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {filteredTickets.map((t) => {
                const isSelected = selectedTicket?.id === t.id;

                return (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTicket(t)}
                    className={`group flex cursor-pointer select-none flex-col justify-between rounded-2xl border border-border/60 bg-card p-4 transition-all ${
                      isSelected
                        ? "border-emerald-400 ring-1 ring-emerald-400/20"
                        : "hover:border-zinc-300 hover:bg-muted/40"
                    }`}
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
                        {t.category || "Waste Report"}
                      </div>
                    </div>

                    <div className="mt-4 border-t border-border-subtle pt-2">
                      <InfoRow label="Status" value={<StatusBadge status={t.status} showDot={false} className="p-0" />} />
                      <InfoRow
                        label="Reported"
                        value={
                          <span className="text-xs font-medium tracking-tight text-muted-foreground tabular-nums">
                            {t.timestamp ? formatTicketDateTime(t.timestamp) : `${t.date || "—"}${t.time ? ` · ${t.time}` : ""}`}
                          </span>
                        }
                      />
                      <InfoRow label="Barangay" value={t.barangay} />
                      <InfoRow label="Reported By" value={t.reporter} />
                    </div>

                    <div className="mt-4 flex gap-2 border-t border-border-subtle pt-3">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTicket(t);
                        }}
                        className="flex-1 cursor-pointer rounded-full bg-muted px-3 py-1.5 text-[13px] font-semibold text-foreground transition-all hover:bg-muted/80 active:scale-95"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setTicketToDelete(t);
                        }}
                        className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-full bg-rose-600/10 px-3 py-1.5 text-[13px] font-semibold text-rose-600 transition-all hover:bg-rose-600/20 active:scale-95"
                        title="Move to Trash"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Move to Trash
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-4 flex shrink-0 items-center justify-between border-t border-border pt-4 pb-6">
          <span className="text-xs font-medium text-muted-foreground">
            Showing {filteredTickets.length} of {tickets.length} total reports
          </span>
        </div>

        {/* Guaranteed bottom spacer element */}
        <div className="h-6 sm:h-8 lg:h-10 w-full shrink-0 pointer-events-none" aria-hidden="true" />
      </div>

      <TicketDetailsModal
        ticket={selectedTicket}
        isOpen={!!selectedTicket}
        onClose={() => setSelectedTicket(null)}
        onUpdateStatus={handleUpdateStatus}
        onLocateOnMap={handleLocateOnMap}
      />

      <ConfirmModal
        open={!!ticketToDelete}
        onCancel={() => setTicketToDelete(null)}
        onConfirm={() => handleDeleteTicket(ticketToDelete)}
        title="Delete Report"
        description="Are you sure you want to move this report to the bin?"
        confirmLabel="Yes, delete"
      />

      {ToastViewport}
    </div>
  );
}
