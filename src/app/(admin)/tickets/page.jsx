"use client";

import { useState } from "react";
import { Search, Filter, ArrowUpDown, Eye } from "lucide-react";
import { mockTickets } from "@/lib/mock-data";
import { StatusBadge, UrgencyBadge } from "@/components/ui/badge";
import TicketDetailsModal from "@/components/modals/ticket-details-modal";

export default function TicketsPage() {
  const [tickets, setTickets] = useState(mockTickets);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [urgencyFilter, setUrgencyFilter] = useState("All");
  const [selectedTicket, setSelectedTicket] = useState(null);

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

  const handleUpdateStatus = (ticketId, newStatus) => {
    setTickets((prev) =>
      prev.map((t) => (t.id === ticketId ? { ...t, status: newStatus } : t))
    );
    if (selectedTicket && selectedTicket.id === ticketId) {
      setSelectedTicket((prev) => ({ ...prev, status: newStatus }));
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 bg-white border border-zinc-200 rounded-xl">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search tickets by ID, address, barangay, or reporter..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-zinc-200 rounded-lg text-xs sm:text-sm bg-white text-zinc-900 focus:border-zinc-900 focus:outline-none placeholder:text-zinc-400"
          />
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs border border-zinc-200 rounded-lg px-3 py-2 bg-white text-zinc-900 focus:border-zinc-900 focus:outline-none font-medium"
          >
            <option value="All">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="In Progress">In Progress</option>
            <option value="Resolved">Resolved</option>
          </select>

          <select
            value={urgencyFilter}
            onChange={(e) => setUrgencyFilter(e.target.value)}
            className="text-xs border border-zinc-200 rounded-lg px-3 py-2 bg-white text-zinc-900 focus:border-zinc-900 focus:outline-none font-medium"
          >
            <option value="All">All Urgencies</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Critical">Critical</option>
          </select>
        </div>
      </div>

      {/* Tickets Master Table */}
      <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden flex flex-col">
        <div className="p-4 sm:p-5 border-b border-zinc-200/80 flex items-center justify-between">
          <div>
            <h2 className="text-sm sm:text-base font-semibold text-zinc-900">
              Sanitation Incident Log ({filteredTickets.length} records)
            </h2>
            <p className="text-xs text-zinc-500">
              Complete dispatch and incident tracking catalog for LGU units
            </p>
          </div>
        </div>

        <div className="overflow-x-auto overflow-y-hidden">
          <table className="w-full text-left text-xs text-zinc-600">
            <thead className="bg-zinc-50/80 text-zinc-700 font-medium border-b border-zinc-200/60">
              <tr>
                <th className="px-4 py-3 whitespace-nowrap">ID</th>
                <th className="px-4 py-3 whitespace-nowrap min-w-[200px]">Location & Barangay</th>
                <th className="px-4 py-3 whitespace-nowrap">Reporter</th>
                <th className="px-4 py-3 whitespace-nowrap">Category</th>
                <th className="px-4 py-3 whitespace-nowrap">Urgency</th>
                <th className="px-4 py-3 whitespace-nowrap">Status</th>
                <th className="px-4 py-3 whitespace-nowrap">Date</th>
                <th className="px-4 py-3 text-right whitespace-nowrap">Action</th>
              </tr>
            </thead>
            <tbody key={`${statusFilter}-${urgencyFilter}-${search}`} className="divide-y divide-zinc-100 animate-in-fade">
              {filteredTickets.map((t) => (
                <tr
                  key={t.id}
                  className="hover:bg-zinc-50/70 transition-colors"
                >
                  <td className="px-4 py-3.5 font-mono font-medium text-zinc-900 whitespace-nowrap">
                    {t.id}
                  </td>
                  <td className="px-4 py-3.5 min-w-[200px]">
                    <div className="font-medium text-zinc-900">{t.location}</div>
                    <div className="text-[11px] text-zinc-500">{t.barangay}</div>
                  </td>
                  <td className="px-4 py-3.5 font-medium text-zinc-800 whitespace-nowrap">
                    {t.reporter}
                  </td>
                  <td className="px-4 py-3.5 text-zinc-500 whitespace-nowrap">
                    {t.category || "Solid Waste"}
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <UrgencyBadge urgency={t.urgency} />
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <StatusBadge status={t.status} />
                  </td>
                  <td className="px-4 py-3.5 text-zinc-500 font-mono text-[11px] whitespace-nowrap">
                    {t.date}
                  </td>
                  <td className="px-4 py-3.5 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => setSelectedTicket(t)}
                      className="inline-flex items-center gap-1.5 text-sm font-bold text-zinc-700 hover:text-zinc-900 px-3 py-1.5 rounded-lg border-2 border-zinc-200 hover:border-zinc-300 transition-colors bg-white shadow-sm"
                    >
                      <Eye className="w-4 h-4 text-zinc-500" />
                      <span>View Details</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
