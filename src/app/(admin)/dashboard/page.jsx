"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileText, ChevronRight, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { StatusBadge, UrgencyBadge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { InfoRow } from "@/components/ui/info-row";
import { DashboardSkeleton } from "@/components/ui/skeletons";
import { useTickets, updateTicket, removeTicket } from "@/lib/tickets";
import TicketDetailsModal from "@/components/modals/ticket-details-modal";
import ConfirmModal from "@/components/ui/confirm-modal";

const hintTones = {
  zinc: "text-muted-foreground",
  rose: "text-rose-600",
  blue: "text-blue-600",
  emerald: "text-emerald-600",
};

export default function DashboardPage() {
  const router = useRouter();
  const tickets = useTickets();
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [ticketToDelete, setTicketToDelete] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(false);
  }, []);

  const pendingCount = tickets.filter((t) => t.status === "Pending").length;
  const inProgressCount = tickets.filter((t) => t.status === "In Progress").length;
  const resolvedCount = tickets.filter((t) => t.status === "Resolved").length;
  const totalCount = tickets.length;

  const kpis = [
    { label: "Total Reports", value: totalCount, hint: "vs. last 30 days", tone: "zinc" },
    { label: "Waiting", value: pendingCount, hint: "Ready for collection", tone: "rose" },
    { label: "On the Way", value: inProgressCount, hint: "Truck dispatched", tone: "blue" },
    { label: "Cleaned Up", value: resolvedCount, hint: "Average: 4 hours", tone: "emerald" },
  ];

  const filteredTickets = tickets
    .filter((t) => (statusFilter === "All" ? true : t.status === statusFilter))
    .slice(0, 8);

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

  const isSheetOpen = selectedTicket !== null;

  const todayLabel = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="relative flex min-h-full w-full min-w-0 overflow-x-hidden bg-background bg-[url('/hero-bg.svg')] bg-cover bg-center bg-no-repeat">
      <div className="absolute inset-0 bg-background/40 pointer-events-none" />
      <div className="relative z-10 flex flex-1 min-w-0 flex-col gap-5 p-4 [scrollbar-gutter:stable] sm:gap-6 sm:p-6 lg:p-8 pb-10 sm:pb-16 lg:pb-24">
        <PageHeader
          title="Good morning, Officer Santos"
          description={
            loading ? (
              "Here's today's overview of waste reports in Barangay Tejero"
            ) : (
              <>
                <span className="block font-medium text-foreground/80">{todayLabel}</span>
                <span className="block">Here&apos;s today&apos;s overview of waste reports in Barangay Tejero</span>
              </>
            )
          }
        />

        {loading ? (
          <DashboardSkeleton />
        ) : (
          <>
        <div className="grid shrink-0 grid-cols-2 gap-3 sm:gap-3.5 lg:grid-cols-4">
          {kpis.map((kpi) => (
            <div
              key={kpi.label}
              className="flex flex-col justify-between rounded-xl border border-border bg-card p-3.5 sm:p-4"
            >
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                {kpi.label}
              </span>
              <span className="mt-1.5 font-mono text-xl sm:text-2xl font-semibold leading-tight text-foreground">
                {kpi.value}
              </span>
              <span className={`mt-2 text-xs font-medium ${hintTones[kpi.tone]}`}>
                {kpi.hint}
              </span>
            </div>
          ))}
        </div>

        <div className="flex shrink-0 flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between min-w-0 w-full overflow-hidden">
          <h3 className="text-sm font-semibold text-foreground shrink-0 whitespace-nowrap">Recent Reports</h3>

          <div className="inline-flex max-w-full shrink-0 items-center gap-1 overflow-x-auto rounded-lg border border-border bg-muted/70 p-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {["All", "Pending", "In Progress", "Resolved"].map((status) => {
              const isActive = statusFilter === status;
              let displayLabel = "All";
              if (status === "Pending") displayLabel = "Waiting";
              if (status === "In Progress") displayLabel = "On the Way";
              if (status === "Resolved") displayLabel = "Cleaned Up";

              return (
                <button
                  key={status}
                  type="button"
                  onClick={() => setStatusFilter(status)}
                  className={`shrink-0 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                    isActive
                      ? "bg-card text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {displayLabel}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          {filteredTickets.length === 0 ? (
            <div className="flex items-center justify-center rounded-xl border border-border bg-card p-8 text-center">
              <div className="flex max-w-xs flex-col items-center">
                <Trash2 className="mb-2.5 h-8 w-8 text-zinc-300" />
                <h3 className="text-sm font-semibold text-foreground">No Recent Reports</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {statusFilter === "All"
                    ? "New waste reports from residents will appear here."
                    : `There are no reports with a "${statusFilter}" status right now.`}
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
                      <span className="shrink-0 whitespace-nowrap font-mono text-xs font-semibold text-foreground">
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
                          <span className="font-mono text-xs">
                            {t.date}
                            {t.time ? ` · ${t.time}` : ""}
                          </span>
                        }
                      />
                      <InfoRow label="Barangay Area" value={t.barangay} />
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

        <div className="mt-4 flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center justify-between border-t border-border pt-4 pb-4">
          <span className="text-xs font-medium text-muted-foreground">
            Showing {filteredTickets.length} of {tickets.length} total reports
          </span>
          <Link
            href="/tickets"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground transition-all hover:bg-muted hover:border-zinc-300 shadow-2xs cursor-pointer"
          >
            <span>See all reports</span>
            <ChevronRight className="h-3.5 w-3.5 text-emerald-600" />
          </Link>
        </div>
          </>
        )}
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
