"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FileText, ChevronRight, Trash2, Inbox } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { StatusBadge, UrgencyBadge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { InfoRow } from "@/components/ui/info-row";
import { DashboardSkeleton } from "@/components/ui/skeletons";
import { PanelStat } from "@/components/ui/panel-stat";
import { useTickets, updateTicket, removeTicket } from "@/lib/tickets";
import { formatTicketDateTime } from "@/lib/utils";
import { useToast } from "@/components/pwa/Toast";
import TicketDetailsModal from "@/components/modals/ticket-details-modal";
import ConfirmModal from "@/components/ui/confirm-modal";
import { useAuth } from "@/context/AuthContext";

export default function DashboardPage() {
  const router = useRouter();
  const { profile } = useAuth();
  const tickets = useTickets();
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [ticketToDelete, setTicketToDelete] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(false);
  }, []);

  const pendingCount = tickets.filter((t) => t.status === "Pending").length;
  const resolvedCount = tickets.filter((t) => t.status === "Resolved").length;
  const totalCount = tickets.length;

  // Report workflow is Waiting → Cleaned Up ("On the Way" retired).
  const kpis = [
    { label: "Total Reports", value: totalCount, hint: "vs. last 30 days", tone: "zinc" },
    { label: "Waiting", value: pendingCount, hint: "Ready for collection", tone: "rose" },
    { label: "Cleaned Up", value: resolvedCount, hint: "Average: 4 hours", tone: "emerald" },
  ];

  const filteredTickets = tickets
    .filter((t) => (statusFilter === "All" ? true : t.status === statusFilter))
    .slice(0, 8);

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

  const isSheetOpen = selectedTicket !== null;

  const todayLabel = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  
  const displayName = profile?.full_name || "Admin";

  return (
    <div className="relative flex min-h-full w-full min-w-0 overflow-x-hidden bg-background">
      <div className="relative z-10 flex flex-1 min-w-0 flex-col gap-5 p-4 [scrollbar-gutter:stable] sm:gap-6 sm:p-6 lg:p-8 pb-6 sm:pb-8 lg:pb-10">
        <PageHeader
          title={`Good morning, ${displayName}`}
          description={
            loading ? (
              "Here's today's overview of waste reports in Barangay Tejero"
            ) : (
              <>
                <span className="block font-medium text-foreground/80">{todayLabel}</span>
                <span className="block">Here&apos;s today&apos;s overview of waste reports in {process.env.NEXT_PUBLIC_BARANGAY_NAME || "your barangay"}</span>
              </>
            )
          }
        />

        {loading ? (
          <DashboardSkeleton />
        ) : (
          <>
        <div className="grid shrink-0 grid-cols-3 gap-3 sm:gap-3.5 max-w-xl sm:max-w-2xl">
          {kpis.map((kpi) => (
            <PanelStat
              key={kpi.label}
              label={kpi.label}
              value={kpi.value}
              hint={kpi.hint}
              tone={kpi.tone}
            />
          ))}
        </div>

        <div className="flex shrink-0 flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between min-w-0 w-full overflow-hidden">
          <h3 className="text-sm font-semibold text-foreground shrink-0 whitespace-nowrap">Recent Reports</h3>

          <div className="inline-flex max-w-full shrink-0 items-center gap-1 overflow-x-auto rounded-xl bg-muted p-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {["All", "Pending", "Resolved"].map((status) => {
              const isActive = statusFilter === status;
              let displayLabel = "All";
              if (status === "Pending") displayLabel = "Waiting";
              if (status === "Resolved") displayLabel = "Cleaned Up";

              return (
                <button
                  key={status}
                  type="button"
                  onClick={() => setStatusFilter(status)}
                  className={`shrink-0 whitespace-nowrap rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors cursor-pointer ${
                    isActive
                      ? "bg-card text-foreground shadow-sm font-semibold"
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
            <div className="flex flex-col items-center justify-center px-4 py-14 text-center">
              <Inbox className="h-12 w-12 text-muted-foreground/40" strokeWidth={1.5} />
              <h3 className="mt-4 text-[17px] font-semibold tracking-tight text-foreground">No Recent Reports</h3>
              <p className="mt-1 max-w-[240px] text-[13px] leading-normal text-muted-foreground">
                {statusFilter === "All"
                  ? "New waste reports from residents will appear here."
                  : `There are no reports with a "${statusFilter}" status right now.`}
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
                        {t.category || "Solid Waste"}
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
                      <InfoRow label="Barangay Area" value={t.barangay} />
                    </div>

                    <div className="mt-2 flex shrink-0 items-center justify-end">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setTicketToDelete(t);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-full bg-rose-600/10 px-3 py-1 text-[13px] font-semibold text-rose-600 transition-all active:scale-95 cursor-pointer"
                        title="Delete Report"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete Report
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-4 flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center justify-between border-t border-border pt-4 pb-6">
          <span className="text-xs font-medium text-muted-foreground">
            Showing {filteredTickets.length} of {tickets.length} total reports
          </span>
          <Link
            href="/tickets"
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-border/60 bg-card px-4 text-[14px] font-semibold text-foreground transition-all hover:bg-muted active:scale-[0.99] cursor-pointer"
          >
            <span>See all reports</span>
            <ChevronRight className="h-3.5 w-3.5 text-emerald-600" />
          </Link>
        </div>

        {/* Guaranteed bottom spacer element */}
        <div className="h-6 sm:h-8 lg:h-10 w-full shrink-0 pointer-events-none" aria-hidden="true" />
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
        description={`Are you sure you want to remove the report at "${ticketToDelete?.location}"? This cannot be undone.`}
        onConfirm={() => handleDeleteTicket(ticketToDelete?.id)}
        onCancel={() => setTicketToDelete(null)}
      />

      {ToastViewport}
    </div>
  );
}
