"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, ImageOff, MapPin } from "lucide-react";
import { StatusBadge, UrgencyBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatTicketDateLong, formatTicketTime } from "@/lib/utils";
import Link from "next/link";

/** Resolve the report's date/time from its DB timestamp, falling back to
 *  legacy `date`/`time` fields so old and new tickets always show one. */
function ticketDateLabel(ticket) {
  if (ticket?.timestamp) return formatTicketDateLong(ticket.timestamp);
  return ticket?.date || "—";
}

function ticketTimeLabel(ticket) {
  if (ticket?.timestamp) return formatTicketTime(ticket.timestamp);
  return ticket?.time || "—";
}

const statusOptions = [
  {
    label: "Waiting",
    value: "Pending",
    active: "border-amber-600 bg-amber-600 text-white shadow-xs",
  },
  {
    label: "Cleaned Up",
    value: "Resolved",
    active: "border-emerald-600 bg-emerald-600 text-white shadow-xs",
  },
];

function StatusSelector({ selectedStatus, onSelect, size = "sm" }) {
  return (
    <div className={`grid grid-cols-2 ${size === "sm" ? "gap-1.5" : "gap-2"}`}>
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

/** Returns a short human-readable ticket number like #A3F298 from a UUID */
function shortId(id) {
  if (!id) return "—";
  return "#" + id.replace(/-/g, "").slice(0, 6).toUpperCase();
}

/** Photo block — uses the actual resident upload (base64 or URL), falls back gracefully */
function TicketPhoto({ photo, ticketId }) {
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
    <img
      src={photo}
      alt={`Photo for report ${shortId(ticketId)}`}
      className="h-full w-full rounded-lg object-cover transition-transform duration-300 hover:scale-105"
    />
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

  /* ─────────────────────────── Inline Sidebar Mode ─────────────────────────── */
  if (inline) {
    if (!isOpen || !ticket) return null;
    return (
      <div className="flex h-full flex-1 flex-col overflow-hidden">
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
          <div className="flex shrink-0 items-start justify-between border-b border-border pb-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-foreground tracking-tight">{ticket.category || "Waste Report"}</span>
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
              <span className="text-xs font-semibold text-foreground tabular-nums">{ticketDateLabel(ticket)}</span>
              <span className="text-xs text-muted-foreground tabular-nums">{ticketTimeLabel(ticket)}</span>
            </DetailBlock>

            <DetailBlock label="Barangay">
              <span className="text-xs font-semibold text-foreground">{ticket.barangay || "Tejero"}</span>
              <span className="text-xs text-muted-foreground">Cebu City</span>
            </DetailBlock>
          </div>

          <DetailBlock label="Additional Details" className="shrink-0">
            <p className="text-xs leading-relaxed text-zinc-700">
              {ticket.description || ticket.notes || "No additional details provided."}
            </p>
          </DetailBlock>

          <DetailBlock label="Photo from Resident" className="shrink-0">
            <div className="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-lg border border-border bg-muted">
              <TicketPhoto photo={ticket.photo} ticketId={ticket.id} />
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
            {selectedStatus === "Resolved" && ticket.status !== "Resolved" ? "Mark as Cleaned Up" : "Save"}
          </Button>
        </div>
      </div>
    );
  }

  /* ─────────────────────────── Full Page Overlay Modal Mode ─────────────────────────── */
  const modalContent = (
    <AnimatePresence>
      {isOpen && ticket && (
        <div className="fixed inset-0 z-50 flex items-stretch justify-center sm:justify-end pointer-events-none overflow-hidden">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/40 sm:bg-transparent pointer-events-auto"
            onClick={onClose}
          />

          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="relative z-10 flex h-full h-dvh w-full min-w-0 flex-col overflow-hidden bg-card pointer-events-auto sm:max-w-md sm:border-l sm:border-border sm:shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto flex h-full w-full max-w-3xl flex-col justify-between overflow-hidden p-4 sm:p-6">
              <div className="flex-1 overflow-y-auto overscroll-contain py-3 gap-5 flex flex-col min-h-0">
                <div className="flex shrink-0 touch-none items-start justify-between border-b border-border/60 pb-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[17px] font-semibold text-foreground tracking-tight">{ticket.category || "Waste Report"}</span>
                    <UrgencyBadge urgency={ticket.urgency} />
                    <StatusBadge status={ticket.status} />
                  </div>

                  <button
                    type="button"
                    onClick={onClose}
                    className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:text-foreground cursor-pointer"
                    aria-label="Close panel"
                  >
                    <X className="h-4 w-4" />
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
                    <span className="text-sm font-semibold text-foreground tracking-tight tabular-nums">{ticketDateLabel(ticket)}</span>
                    <span className="mt-0.5 text-xs font-medium text-muted-foreground tracking-tight tabular-nums">
                      {ticketTimeLabel(ticket)}
                    </span>
                  </DetailBlock>

                  <DetailBlock label="Barangay">
                    <span className="text-sm font-semibold text-foreground">{ticket.barangay || "Tejero"}</span>
                    <span className="text-xs text-muted-foreground">Cebu City</span>
                  </DetailBlock>
                </div>

                <DetailBlock label="Additional Details" className="shrink-0">
                  <p className="text-sm leading-relaxed text-zinc-700">
                    {ticket.description || ticket.notes || "No additional details provided."}
                  </p>
                </DetailBlock>

                <DetailBlock label="Photo from Resident" className="shrink-0">
                  <div className="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-lg border border-border bg-muted">
                    <TicketPhoto photo={ticket.photo} ticketId={ticket.id} />
                  </div>
                </DetailBlock>

                <div className="mt-2 flex shrink-0 flex-col gap-3 border-t border-border-subtle pb-4 pt-4">
                  <span className="text-xs font-medium text-muted-foreground">Update Status</span>
                  <StatusSelector selectedStatus={selectedStatus} onSelect={setSelectedStatus} size="md" />
                  {selectedStatus === "Resolved" && ticket.status !== "Resolved" && (
                    <p className="text-xs text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">
                      Marking as <strong>Cleaned Up</strong> will notify the resident who submitted this report.
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-auto shrink-0 touch-none flex flex-col-reverse gap-2 border-t border-border-subtle pt-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center">
                  {onLocateOnMap ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="h-10 w-full gap-1.5 rounded-xl px-4 text-[14px] font-semibold sm:w-auto"
                      onClick={() => {
                        onLocateOnMap(ticket);
                        onClose();
                      }}
                    >
                      <MapPin className="w-4 h-4" />
                      <span>Locate on Map</span>
                    </Button>
                  ) : (
                    <Link href={`/live-map?ticketId=${ticket.id}`} onClick={onClose} className="w-full sm:w-auto">
                      <Button variant="secondary" size="sm" className="h-10 w-full gap-1.5 rounded-xl px-4 text-[14px] font-semibold sm:w-auto">
                        <MapPin className="w-4 h-4" />
                        <span>Locate on Map</span>
                      </Button>
                    </Link>
                  )}
                </div>

                <div className="grid grid-cols-2 items-center gap-2 sm:flex">
                  <Button variant="secondary" size="sm" className="h-10 w-full sm:w-auto rounded-xl px-4 text-[14px] font-semibold" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button variant="primary" size="sm" className="h-10 w-full sm:w-auto rounded-xl px-4 text-[14px] font-semibold" onClick={handleSave}>
                    {selectedStatus === "Resolved" && ticket.status !== "Resolved"
                      ? "Mark as Cleaned Up"
                      : "Save Changes"}
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
