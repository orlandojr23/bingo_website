"use client";

import { useState } from "react";
import Link from "next/link";
import {
  FileText,
  Clock,
  CheckCircle2,
  Loader,
  MapPin,
  Plus,
  ChevronRight,
  Eye,
} from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge, UrgencyBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { mockDashboardStats, mockTickets } from "@/lib/mock-data";
import TicketDetailsModal from "@/components/modals/ticket-details-modal";

export default function DashboardPage() {
  const [tickets, setTickets] = useState(mockTickets);
  const [statusFilter, setStatusFilter] = useState("All");
  const [selectedTicket, setSelectedTicket] = useState(null);

  // Dynamic KPI counts based on live state
  const pendingCount = tickets.filter((t) => t.status === "Pending").length;
  const inProgressCount = tickets.filter((t) => t.status === "In Progress").length;
  const resolvedCount = tickets.filter((t) => t.status === "Resolved").length;
  const totalCount = tickets.length;

  const filteredTickets = tickets
    .filter((t) => (statusFilter === "All" ? true : t.status === statusFilter))
    .slice(0, 6);

  const handleUpdateStatus = (ticketId, newStatus) => {
    setTickets((prev) =>
      prev.map((t) => (t.id === ticketId ? { ...t, status: newStatus } : t))
    );
    if (selectedTicket && selectedTicket.id === ticketId) {
      setSelectedTicket((prev) => ({ ...prev, status: newStatus }));
    }
  };

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto pb-8">
      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">
        <div className="rounded-2xl">
          <StatCard
            label="Total Incidents"
            value={totalCount}
            icon={FileText}
            description="vs. last 30 days"
            className="p-6"
          />
        </div>

        <div className="rounded-2xl">
          <StatCard
            label="Pending Reports"
            value={pendingCount}
            icon={Clock}
            description="Waiting for truck"
            className="p-6"
          />
        </div>

        <div className="rounded-2xl">
          <StatCard
            label="In Progress"
            value={inProgressCount}
            icon={Loader}
            description="Truck on the way"
            className="p-6"
          />
        </div>

        <div className="rounded-2xl">
          <StatCard
            label="Resolved"
            value={resolvedCount}
            icon={CheckCircle2}
            description="Average: 4 hours"
            className="p-6"
          />
        </div>
      </div>

      {/* Main Content: Incident Reports Table */}
      <div className="bg-white border-2 border-zinc-200 rounded-2xl overflow-hidden flex flex-col shadow-sm">
        {/* Table Header */}
        <div className="p-5 sm:p-6 border-b-2 border-zinc-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-50/50">
            <div>
              <h3 className="text-lg font-bold text-zinc-900">
                Recent Incident Reports
              </h3>
            </div>

            {/* Quick Status Filter Tabs */}
            <div className="flex flex-nowrap items-center gap-1.5 bg-white border-2 border-zinc-200 rounded-xl p-1 self-start sm:self-auto overflow-x-auto scrollbar-hide max-w-full">
              {["All", "Pending", "In Progress", "Resolved"].map((status) => {
                const isActive = statusFilter === status;
                let count = totalCount;
                if (status === "Pending") count = pendingCount;
                if (status === "In Progress") count = inProgressCount;
                if (status === "Resolved") count = resolvedCount;

                return (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setStatusFilter(status)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-bold transition-colors whitespace-nowrap shrink-0 ${
                      isActive
                        ? "bg-emerald-600 text-white shadow-sm"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                    }`}
                  >
                    <span>{status}</span>
                    <span
                      className={`text-xs font-bold ${
                        isActive
                          ? "text-emerald-100"
                          : "text-slate-400"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Table Body */}
          <div className="overflow-x-auto overflow-y-hidden flex-1">
            <table className="w-full text-left text-sm text-zinc-700">
              <thead className="text-zinc-600 font-bold border-b-2 border-zinc-200 bg-white uppercase text-xs tracking-wider">
                <tr>
                  <th className="px-5 py-4">Ticket ID</th>
                  <th className="px-5 py-4">Location Details</th>
                  <th className="px-5 py-4">Urgency</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody key={statusFilter} className="divide-y-2 divide-zinc-100 animate-in-fade">
                {filteredTickets.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-12 text-center text-zinc-500 font-medium text-base">
                      No reports found for status:{" "}
                      <span className="font-bold text-zinc-900">{statusFilter}</span>
                    </td>
                  </tr>
                ) : (
                  filteredTickets.map((t) => (
                    <tr
                      key={t.id}
                      onClick={() => setSelectedTicket(t)}
                      className="hover:bg-emerald-50/50 transition-colors cursor-pointer group"
                    >
                      <td className="px-5 py-4 font-mono font-bold text-zinc-900 whitespace-nowrap">
                        {t.id}
                      </td>
                      <td className="px-5 py-4 min-w-[200px]">
                        <div className="font-bold text-base text-zinc-900 mb-0.5">
                          {t.location}
                        </div>
                        <div className="text-sm font-medium text-zinc-500">{t.barangay}</div>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <UrgencyBadge urgency={t.urgency} />
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <StatusBadge status={t.status} />
                      </td>
                      <td className="px-5 py-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                             e.stopPropagation();
                             setSelectedTicket(t);
                          }}
                          className="inline-flex items-center gap-1.5 text-sm font-bold text-zinc-700 hover:text-zinc-900 px-3 py-1.5 rounded-lg border-2 border-zinc-200 hover:border-zinc-300 transition-colors bg-white shadow-sm"
                        >
                          <Eye className="w-4 h-4 text-zinc-500" />
                          <span>View Details</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer Link */}
          <div className="p-4 sm:px-6 border-t-2 border-zinc-200 bg-zinc-50/50 flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm font-medium text-zinc-500">
              Showing {filteredTickets.length} of {tickets.length} total reports
            </span>
            <Link
              href="/tickets"
              className="text-sm font-bold text-zinc-700 hover:text-zinc-900 flex items-center gap-1 bg-white px-3 py-1.5 border-2 border-zinc-200 rounded-lg shadow-sm transition-colors whitespace-nowrap shrink-0"
            >
              <span>See all reports</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>



      {/* Ticket Details Inspector Modal */}
      <TicketDetailsModal
        ticket={selectedTicket}
        isOpen={!!selectedTicket}
        onClose={() => setSelectedTicket(null)}
        onUpdateStatus={handleUpdateStatus}
      />
    </div>
  );
}
