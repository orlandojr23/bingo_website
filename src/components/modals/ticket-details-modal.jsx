"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, MapPin } from "lucide-react";
import { StatusBadge, UrgencyBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { getTicketPhoto } from "@/lib/mock-data";

const statusOptions = [
  {
    label: "Waiting",
    value: "Pending",
    active: "border-amber-600 bg-amber-600 text-white shadow-xs",
  },
  {
    label: "On the Way",
    value: "In Progress",
    active: "border-blue-600 bg-blue-600 text-white shadow-xs",
  },
  {
    label: "Cleaned Up",
    value: "Resolved",
    active: "border-emerald-600 bg-emerald-600 text-white shadow-xs",
  },
];

function StatusSelector({ selectedStatus, onSelect, size = "sm" }) {
  return (
    <div className={`grid grid-cols-3 ${size === "sm" ? "gap-1.5" : "gap-2"}`}>
      {statusOptions.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onSelect(opt.value)}
          className={`inline-flex items-center justify-center rounded-lg border px-1 text-xs font-medium transition-colors cursor-pointer ${
            size === "sm" ? "py-2" : "py-2.5 px-2"
          } ${
            selectedStatus === opt.value
              ? opt.active
              : "border-border bg-card text-muted-foreground hover:bg-muted/50 hover:text-foreground"
          }`}
        >
          <span>{opt.label}</span>
        </button>
      ))}
    </div>
  );
}

function DetailBlock({ label, children, className = "" }) {
  return (
    <div className={`flex flex-col gap-1.5 rounded-xl border border-border bg-muted/40 p-3.5 ${className}`}>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </div>
  );
}

export default function TicketDetailsModal({ ticket, isOpen, onClose, onUpdateStatus, onLocateOnMap, inline = false }) {
  const [selectedStatus, setSelectedStatus] = useState(ticket?.status || "Pending");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (ticket) {
      const t = setTimeout(() => setSelectedStatus(ticket.status), 0);
      return () => clearTimeout(t);
    }
  }, [ticket]);

  if (!mounted) return null;

  const handleSave = () => {
    if (onUpdateStatus && selectedStatus !== ticket.status) {
      onUpdateStatus(ticket.id, selectedStatus);
    }
    onClose();
  };

  const assignedUnit =
    ticket?.status === "Resolved" ? "Team 02" : ticket?.status === "In Progress" ? "Truck 04" : "Unassigned";

  /* ─────────────────────────── Inline Sidebar Mode ─────────────────────────── */
  if (inline) {
    if (!isOpen || !ticket) return null;
    return (
      <div className="flex h-full flex-1 flex-col overflow-hidden">
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
          <div className="flex shrink-0 items-start justify-between border-b border-border pb-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-xs font-semibold text-foreground">{ticket.id}</span>
              <UrgencyBadge urgency={ticket.urgency} />
              <StatusBadge status={ticket.status} />
            </div>

            <button
              type="button"
              onClick={onClose}
              className="shrink-0 p-1.5 text-muted-foreground transition-colors hover:text-foreground cursor-pointer"
              aria-label="Back to list"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex shrink-0 flex-col gap-2.5">
            <DetailBlock label="Location">
              <span className="text-xs font-semibold text-foreground">{ticket.location}</span>
              <span className="text-xs text-muted-foreground">
                {ticket.barangay}, {ticket.city || "Cebu City"}
              </span>
            </DetailBlock>

            <DetailBlock label="Reporter">
              <span className="text-xs font-semibold text-foreground">{ticket.reporter}</span>
            </DetailBlock>

            <DetailBlock label="Date & Time">
              <span className="text-xs font-semibold text-foreground">{ticket.date || "2023-10-24"}</span>
              <span className="text-xs text-muted-foreground">{ticket.time || "08:42 AM"}</span>
            </DetailBlock>

            <DetailBlock label="Assigned Team">
              <span className="text-xs font-semibold text-foreground">{assignedUnit}</span>
              <span className="text-xs text-muted-foreground">Brgy. Tejero</span>
            </DetailBlock>
          </div>

          <DetailBlock label="Additional Details" className="shrink-0">
            <p className="text-xs leading-relaxed text-zinc-700">
              {ticket.description || "No additional details provided."}
            </p>
          </DetailBlock>

          <DetailBlock label="Photo from Resident" className="shrink-0">
            <div className="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-lg border border-border bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getTicketPhoto(ticket.category)}
                alt={`Photo for report ${ticket.id}`}
                className="h-full w-full object-cover"
                onError={(e) => {
                  e.target.src = "https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?w=600&auto=format&fit=crop&q=80";
                }}
              />
            </div>
          </DetailBlock>

          <div className="mt-1 flex shrink-0 flex-col gap-2 border-t border-border-subtle pb-1 pt-3">
            <span className="text-xs font-medium text-muted-foreground">Update Status</span>
            <StatusSelector selectedStatus={selectedStatus} onSelect={setSelectedStatus} />
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border-subtle p-4">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={handleSave}>
            Save
          </Button>
        </div>
      </div>
    );
  }

  /* ─────────────────────────── Full Page Overlay Modal Mode ─────────────────────────── */
  const modalContent = (
    <AnimatePresence>
      {isOpen && ticket && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-stretch justify-end overflow-hidden">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 sm:bg-transparent"
            onClick={onClose}
          />

          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="relative z-10 flex h-auto max-h-[85dvh] sm:h-full sm:max-h-full w-full max-w-md flex-col overflow-hidden rounded-t-2xl sm:rounded-none border-t sm:border-t-0 sm:border-l border-border bg-card shadow-2xl self-end sm:self-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex h-full flex-col justify-between overflow-hidden">
              <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-5 sm:p-6">
                <div className="flex shrink-0 items-start justify-between border-b border-border pb-4">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="font-mono text-base font-semibold text-foreground">{ticket.id}</span>
                    <UrgencyBadge urgency={ticket.urgency} />
                    <StatusBadge status={ticket.status} />
                  </div>

                  <button
                    type="button"
                    onClick={onClose}
                    className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
                    aria-label="Close sheet"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <div className="flex shrink-0 flex-col gap-3 py-1">
                  <DetailBlock label="Location">
                    <span className="text-sm font-semibold text-foreground">{ticket.location}</span>
                    <span className="text-xs text-muted-foreground">
                      {ticket.barangay}, {ticket.city || "Cebu City"}
                    </span>
                  </DetailBlock>

                  <DetailBlock label="Reporter">
                    <span className="text-sm font-semibold text-foreground">{ticket.reporter}</span>
                  </DetailBlock>

                  <DetailBlock label="Date & Time">
                    <span className="text-sm font-semibold text-foreground">{ticket.date || "2023-10-24"}</span>
                    <span className="mt-0.5 font-mono text-xs text-muted-foreground">
                      {ticket.time || "08:42 AM"}
                    </span>
                  </DetailBlock>

                  <DetailBlock label="Assigned Team">
                    <span className="text-sm font-semibold text-foreground">{assignedUnit}</span>
                    <span className="text-xs text-muted-foreground">Brgy. Tejero</span>
                  </DetailBlock>
                </div>

                <DetailBlock label="Additional Details" className="shrink-0">
                  <p className="text-sm leading-relaxed text-zinc-700">
                    {ticket.description || "No additional details provided."}
                  </p>
                </DetailBlock>

                <DetailBlock label="Photo from Resident" className="shrink-0">
                  <div className="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-lg border border-border bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={getTicketPhoto(ticket.category)}
                      alt={`Photo for report ${ticket.id}`}
                      className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                      onError={(e) => {
                        e.target.src = "https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?w=600&auto=format&fit=crop&q=80";
                      }}
                    />
                  </div>
                </DetailBlock>

                <div className="mt-2 flex shrink-0 flex-col gap-3 border-t border-border-subtle pb-4 pt-4">
                  <span className="text-xs font-medium text-muted-foreground">Update Status</span>
                  <StatusSelector selectedStatus={selectedStatus} onSelect={setSelectedStatus} size="md" />
                </div>
              </div>

              <div className="mt-auto shrink-0 flex items-center justify-between gap-3 border-t border-border p-4 sm:p-5 bg-card">
                <div className="flex items-center">
                  {onLocateOnMap ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        onLocateOnMap(ticket);
                        onClose();
                      }}
                      className="text-emerald-700"
                    >
                      <MapPin className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Locate on Map</span>
                    </Button>
                  ) : (
                    <Link href={`/live-map?ticketId=${ticket.id}`} onClick={onClose}>
                      <Button variant="secondary" size="sm" className="text-emerald-700">
                        <MapPin className="h-3.5 w-3.5 text-emerald-600" />
                        <span>Locate on Map</span>
                      </Button>
                    </Link>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="secondary" size="sm" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button variant="primary" size="sm" onClick={handleSave}>
                    Save Changes
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
}
