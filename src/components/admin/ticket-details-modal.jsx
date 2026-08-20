"use client";

import { useState } from "react";
import { X, MapPin, User, Calendar, Clock, AlertCircle, CheckCircle2, Truck } from "lucide-react";
import { StatusBadge, UrgencyBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function TicketDetailsModal({ ticket, isOpen, onClose, onUpdateStatus }) {
  const [selectedStatus, setSelectedStatus] = useState(ticket?.status || "Pending");

  if (!isOpen || !ticket) return null;

  const handleStatusChange = (newStatus) => {
    setSelectedStatus(newStatus);
    if (onUpdateStatus) {
      onUpdateStatus(ticket.id, newStatus);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-zinc-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 sm:p-8 border-2 border-zinc-200 animate-in-fade relative flex flex-col gap-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b-2 border-zinc-200/80">
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-mono font-bold text-lg sm:text-xl text-zinc-900 bg-zinc-100 px-3 py-1 rounded-lg">
                {ticket.id}
              </span>
              <UrgencyBadge urgency={ticket.urgency} />
              <StatusBadge status={ticket.status} />
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-900 p-2.5 rounded-xl hover:bg-zinc-100 transition-colors bg-zinc-50 border-2 border-transparent hover:border-zinc-200"
            aria-label="Close modal"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Location & Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
          <div className="flex items-center gap-3 p-4 rounded-xl border-2 border-zinc-200 bg-zinc-50/50">
            <div className="p-2 bg-white rounded-lg border border-zinc-200 shrink-0">
              <MapPin className="w-5 h-5 text-zinc-600" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-base text-zinc-900">{ticket.location}</span>
              <span className="text-sm font-medium text-zinc-600 mt-0.5">{ticket.barangay}, {ticket.city || "Cebu City"}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 rounded-xl border-2 border-zinc-200 bg-zinc-50/50">
            <div className="p-2 bg-white rounded-lg border border-zinc-200 shrink-0">
              <User className="w-5 h-5 text-zinc-600" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-base text-zinc-900">{ticket.reporter}</span>
              <span className="text-sm font-medium text-emerald-600 mt-0.5 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> Verified Citizen
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 rounded-xl border-2 border-zinc-200 bg-zinc-50/50">
            <div className="p-2 bg-white rounded-lg border border-zinc-200 shrink-0">
              <Calendar className="w-5 h-5 text-zinc-600" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-base text-zinc-900">{ticket.date || "2023-10-24"}</span>
              <span className="text-sm font-bold text-zinc-600 bg-white border border-zinc-200 px-2 py-0.5 rounded-md mt-1 w-fit">
                {ticket.time || "08:42 AM"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 rounded-xl border-2 border-zinc-200 bg-zinc-50/50">
            <div className="p-2 bg-white rounded-lg border border-zinc-200 shrink-0">
              <Truck className="w-5 h-5 text-zinc-600" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-base text-zinc-900">
                {ticket.status === "Resolved" ? "Team 02 (Completed)" : ticket.status === "In Progress" ? "Truck 04 (On the way)" : "Not Assigned Yet"}
              </span>
              <span className="text-sm font-medium text-zinc-600 mt-0.5">Assigned to Sector 4</span>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="flex flex-col gap-2 p-5 rounded-xl border-2 border-zinc-200 bg-zinc-50">
          <p className="text-base text-zinc-800 leading-relaxed font-medium">
            {ticket.description || "No specific detailed description provided by the citizen."}
          </p>
        </div>

        {/* Quick Status Action Controls */}
        <div className="flex flex-col gap-3 pt-4 border-t-2 border-zinc-200/80">
          <span className="text-sm font-bold text-zinc-700">
            Change Current Status:
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => handleStatusChange("Pending")}
              className={`inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold border-2 transition-all shadow-sm ${
                selectedStatus === "Pending"
                  ? "border-amber-500 bg-amber-50 text-amber-900 ring-2 ring-amber-500/20"
                  : "border-zinc-200 text-zinc-600 hover:text-zinc-900 hover:border-zinc-300 hover:bg-zinc-50 bg-white"
              }`}
            >
              <span>Mark as Pending</span>
            </button>
            <button
              type="button"
              onClick={() => handleStatusChange("In Progress")}
              className={`inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold border-2 transition-all shadow-sm ${
                selectedStatus === "In Progress"
                  ? "border-blue-500 bg-blue-50 text-blue-900 ring-2 ring-blue-500/20"
                  : "border-zinc-200 text-zinc-600 hover:text-zinc-900 hover:border-zinc-300 hover:bg-zinc-50 bg-white"
              }`}
            >
              <span>Mark In Progress</span>
            </button>
            <button
              type="button"
              onClick={() => handleStatusChange("Resolved")}
              className={`inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-bold border-2 transition-all shadow-sm ${
                selectedStatus === "Resolved"
                  ? "border-emerald-500 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500/20"
                  : "border-zinc-200 text-zinc-600 hover:text-zinc-900 hover:border-zinc-300 hover:bg-zinc-50 bg-white"
              }`}
            >
              <span>Mark as Resolved</span>
            </button>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex justify-end gap-3 pt-2 mt-2">
          <Button variant="secondary" size="lg" onClick={onClose} className="w-full sm:w-auto font-bold shadow-sm">
            Close Modal
          </Button>
        </div>
      </div>
    </div>
  );
}
