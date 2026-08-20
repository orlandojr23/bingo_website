"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X, MapPin, User, Calendar, CheckCircle2, Truck } from "lucide-react";
import { StatusBadge, UrgencyBadge } from "@/components/ui/badge";

export default function TicketDetailsModal({ ticket, isOpen, onClose, onUpdateStatus }) {
  const [selectedStatus, setSelectedStatus] = useState(ticket?.status || "Pending");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (ticket) {
      setSelectedStatus(ticket.status);
    }
  }, [ticket]);

  if (!isOpen || !ticket || !mounted) return null;

  const handleStatusChange = (newStatus) => {
    setSelectedStatus(newStatus);
    if (onUpdateStatus) {
      onUpdateStatus(ticket.id, newStatus);
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-[100] flex justify-end">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm animate-in-fade"
        onClick={onClose}
      />

      {/* Right Sheet Content */}
      <div
        className="relative w-full max-w-md bg-white h-full shadow-2xl border-l border-zinc-200 flex flex-col animate-slide-in-right overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 sm:p-6 flex flex-col gap-5 min-h-full">
          {/* Header */}
          <div className="flex items-start justify-between pb-4 border-b border-zinc-200/80">
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="font-mono font-bold text-base text-zinc-900 bg-zinc-100 px-2.5 py-1 rounded-lg">
                  {ticket.id}
                </span>
                <UrgencyBadge urgency={ticket.urgency} />
                <StatusBadge status={ticket.status} />
              </div>
            </div>

            <button
              onClick={onClose}
              className="text-zinc-500 hover:text-zinc-900 p-2 rounded-xl hover:bg-zinc-100 transition-colors bg-zinc-50 border border-transparent hover:border-zinc-200"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Location & Details List */}
          <div className="flex flex-col gap-3 py-1">
            <div className="flex items-start gap-3 p-3.5 rounded-xl border border-zinc-200 bg-zinc-50/50">
              <div className="p-1.5 bg-white rounded-lg border border-zinc-200 shrink-0 mt-0.5">
                <MapPin className="w-4 h-4 text-zinc-600" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-sm text-zinc-900">{ticket.location}</span>
                <span className="text-xs font-medium text-zinc-600 mt-0.5">{ticket.barangay}, {ticket.city || "Cebu City"}</span>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3.5 rounded-xl border border-zinc-200 bg-zinc-50/50">
              <div className="p-1.5 bg-white rounded-lg border border-zinc-200 shrink-0 mt-0.5">
                <User className="w-4 h-4 text-zinc-600" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-sm text-zinc-900">{ticket.reporter}</span>
                <span className="text-[11px] font-medium text-emerald-600 mt-0.5 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Verified Citizen
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3.5 rounded-xl border border-zinc-200 bg-zinc-50/50">
              <div className="p-1.5 bg-white rounded-lg border border-zinc-200 shrink-0 mt-0.5">
                <Calendar className="w-4 h-4 text-zinc-600" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-sm text-zinc-900">{ticket.date || "2023-10-24"}</span>
                <span className="text-[11px] font-bold text-zinc-600 bg-white border border-zinc-200 px-1.5 py-0.5 rounded flex w-fit mt-1">
                  {ticket.time || "08:42 AM"}
                </span>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3.5 rounded-xl border border-zinc-200 bg-zinc-50/50">
              <div className="p-1.5 bg-white rounded-lg border border-zinc-200 shrink-0 mt-0.5">
                <Truck className="w-4 h-4 text-zinc-600" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-sm text-zinc-900">
                  {ticket.status === "Resolved" ? "Team 02" : ticket.status === "In Progress" ? "Truck 04" : "Unassigned"}
                </span>
                <span className="text-xs font-medium text-zinc-600 mt-0.5">Sector 4</span>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5 p-4 rounded-xl border border-zinc-200 bg-zinc-50">
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Incident Notes</span>
            <p className="text-sm text-zinc-800 leading-relaxed font-medium">
              {ticket.description || "No specific detailed description provided."}
            </p>
          </div>

          {/* Spacer to push controls to bottom if needed */}
          <div className="flex-1" />

          {/* Quick Status Action Controls */}
          <div className="flex flex-col gap-3 pt-4 border-t border-zinc-200/80 mt-2">
            <span className="text-xs font-bold text-zinc-700">
              Change Current Status:
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleStatusChange("Pending")}
                className={`inline-flex items-center justify-center py-2.5 px-2 rounded-lg text-xs font-bold border transition-all shadow-sm ${
                  selectedStatus === "Pending"
                    ? "border-amber-500 bg-amber-50 text-amber-900 ring-1 ring-amber-500/20"
                    : "border-zinc-200 text-zinc-600 hover:text-zinc-900 hover:border-zinc-300 hover:bg-zinc-50 bg-white"
                }`}
              >
                <span>Pending</span>
              </button>
              <button
                type="button"
                onClick={() => handleStatusChange("In Progress")}
                className={`inline-flex items-center justify-center py-2.5 px-2 rounded-lg text-xs font-bold border transition-all shadow-sm ${
                  selectedStatus === "In Progress"
                    ? "border-blue-500 bg-blue-50 text-blue-900 ring-1 ring-blue-500/20"
                    : "border-zinc-200 text-zinc-600 hover:text-zinc-900 hover:border-zinc-300 hover:bg-zinc-50 bg-white"
                }`}
              >
                <span>In Progress</span>
              </button>
              <button
                type="button"
                onClick={() => handleStatusChange("Resolved")}
                className={`inline-flex items-center justify-center py-2.5 px-2 rounded-lg text-xs font-bold border transition-all shadow-sm ${
                  selectedStatus === "Resolved"
                    ? "border-emerald-500 bg-emerald-50 text-emerald-900 ring-1 ring-emerald-500/20"
                    : "border-zinc-200 text-zinc-600 hover:text-zinc-900 hover:border-zinc-300 hover:bg-zinc-50 bg-white"
                }`}
              >
                <span>Resolved</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
