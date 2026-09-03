"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Inbox } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTickets, updateTicket, removeTicket } from "@/lib/tickets";
import { StatusBadge, UrgencyBadge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { PanelStat } from "@/components/ui/panel-stat";
import { InfoRow } from "@/components/ui/info-row";
import { inputClass } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import TicketDetailsModal from "@/components/modals/ticket-details-modal";
import ConfirmModal from "@/components/ui/confirm-modal";

export default function TicketsPage() {
  const router = useRouter();
  const tickets = useTickets();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [urgencyFilter, setUrgencyFilter] = useState("All");
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [ticketToDelete, setTicketToDelete] = useState(null);

  const handleUpdateStatus = (ticketId, newStatus) => {
    updateTicket(ticketId, { status: newStatus });
    if (selectedTicket && selectedTicket.id === ticketId) {
      setSelectedTicket((prev) => ({ ...prev, status: newStatus }));
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
      t.location.toLowerCase().includes(search.toLowerCase()) ||
      t.id.toLowerCase().includes(search.toLowerCase()) ||
      t.reporter.toLowerCase().includes(search.toLowerCase()) ||
      t.barangay.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "All" || t.status === statusFilter;
    const matchUrgency = urgencyFilter === "All" || t.urgency === urgencyFilter;
    return matchSearch && matchStatus && matchUrgency;
  });

  const totalReports = tickets.length;
  const pendingReports = tickets.filter((t) => t.status === "Pending").length;
  const isSheetOpen = selectedTicket !== null;

  return (
    <div className="relative flex min-h-full w-full min-w-0 overflow-x-hidden bg-background bg-[url('/hero-bg.svg')] bg-[length:100%_auto] sm:bg-cover bg-top sm:bg-center bg-no-repeat">
      <div className="absolute inset-0 bg-background/42 pointer-events-none" />
      <div className="relative z-10 flex flex-1 min-w-0 flex-col gap-5 p-4 [scrollbar-gutter:stable] sm:gap-6 sm:p-6 lg:p-8 pb-6 sm:pb-8 lg:pb-10">
        <PageHeader
          title="Reports"
          description="All waste reports submitted by residents and their current status"
        />

        <div className="grid shrink-0 grid-cols-2 gap-3.5 max-w-sm sm:max-w-md">
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
              <option value="In Progress">On the Way</option>
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
          </div>
        </div>

        <div>
          {filteredTickets.length === 0 ? (
            <div className="flex items-center justify-center rounded-xl border border-border bg-card p-8 text-center">
              <div className="flex max-w-xs flex-col items-center">
                <Inbox className="mb-2.5 h-8 w-8 text-zinc-300" />
                <h3 className="text-sm font-semibold text-foreground">No Reports Found</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {search || statusFilter !== "All" || urgencyFilter !== "All"
                    ? "Try different search keywords or filters."
                    : "No waste reports have been submitted yet. Resident reports will appear here."}
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {filteredTickets.map((t) => {
                const isSelected = selectedTicket?.id === t.id;

                return (
                  <div
                    key={t.id}
                    onClick={() => setSelectedTicket(t)}
                    className={`group flex cursor-pointer select-none flex-col justify-between rounded-xl border bg-card p-4 transition-all ${
                      isSelected
                        ? "border-emerald-400 ring-1 ring-emerald-400/20"
                        : "border-border hover:border-zinc-300 hover:bg-muted/40"
                    }`}
                  >
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
                      <InfoRow label="Status" value={<StatusBadge status={t.status} className="p-0" />} />
                      <InfoRow
                        label="Reported"
                        value={
                          <span className="text-xs font-medium tracking-tight text-muted-foreground tabular-nums">
                            {t.date}
                            {t.time ? ` · ${t.time}` : ""}
                          </span>
                        }
                      />
                      <InfoRow label="Barangay Area" value={t.barangay} />
                      <InfoRow label="Reported By" value={t.reporter} />
                    </div>

                    <div className="mt-2 flex shrink-0 items-center justify-end">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setTicketToDelete(t);
                        }}
                        className="rounded-md border border-rose-200 bg-card px-2.5 py-1 text-xs font-medium text-rose-600 transition-colors hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 cursor-pointer"
                        title="Delete Report"
                      >
                        Delete Report
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
        title="Delete Report"
        description={`Are you sure you want to remove report ${ticketToDelete?.id} (${ticketToDelete?.location})? This cannot be undone.`}
        onConfirm={() => handleDeleteTicket(ticketToDelete?.id)}
        onCancel={() => setTicketToDelete(null)}
      />
    </div>
  );
}

