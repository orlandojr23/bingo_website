"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  Bell,
  AlertTriangle,
  Truck,
  Ticket as TicketIcon,
  Info,
  CheckCheck,
  CheckCircle2,
  XCircle,
  Trash2,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { PageHeader } from "@/components/ui/page-header";
import { PanelStat } from "@/components/ui/panel-stat";
import { InfoRow } from "@/components/ui/info-row";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  useNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  removeNotification,
} from "@/lib/notifications";
import { useTickets, useArchivedTickets } from "@/lib/tickets";
import { useToast } from "@/components/pwa/Toast";
import dynamic from "next/dynamic";
import binEmptyState from "../../../../public/lottie/bin-empty-state.json";

const LottiePlayer = dynamic(
  () =>
    import("@lottiefiles/react-lottie-player").then((mod) => {
      const Player = mod.Player;
      return function FadeInPlayer(props) {
        return (
          <div style={{ animation: "fadeIn 0.5s ease-out forwards" }}>
            <Player {...props} />
          </div>
        );
      };
    }),
  { ssr: false }
);

function timeAgoLabel(iso) {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "";
  const mins = Math.max(0, Math.round((Date.now() - t) / 60000));
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return days === 1 ? "Yesterday" : `${days}d ago`;
}

function absoluteDateTimeLabel(iso) {
  const t = new Date(iso);
  if (!Number.isFinite(t.getTime())) return "";
  const date = t.toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const time = t.toLocaleTimeString("en-PH", {
    hour: "2-digit",
    minute: "2-digit",
  });
  return `${date} · ${time}`;
}

const typeStyles = {
  Emergency: {
    icon: <AlertTriangle className="h-4 w-4 text-rose-600" />,
    pill: "text-muted-foreground bg-transparent",
    label: "Emergency",
  },
  Dispatch: {
    icon: <Truck className="h-4 w-4 text-sky-600" />,
    pill: "text-muted-foreground bg-transparent",
    label: "Dispatch",
  },
  Ticket: {
    icon: <TicketIcon className="h-4 w-4 text-amber-600" />,
    pill: "text-muted-foreground bg-transparent",
    label: "Report",
  },
  Cancelled: {
    icon: <XCircle className="h-4 w-4 text-rose-600" />,
    pill: "text-muted-foreground bg-transparent",
    label: "Cancelled",
  },
  Resolved: {
    icon: <CheckCircle2 className="h-4 w-4 text-emerald-600" />,
    pill: "text-muted-foreground bg-transparent",
    label: "Resolved",
  },
  System: {
    icon: <Info className="h-4 w-4 text-zinc-500" />,
    pill: "text-muted-foreground bg-transparent",
    label: "System",
  },
};

const getTypeStyle = (type) => typeStyles[type] || typeStyles.System;

export default function NotificationsPage() {
  const storeNotifications = useNotifications("admin");
  const [activeTab, setActiveTab] = useState("All");
  const [selectedNotifId, setSelectedNotifId] = useState(null);
  const { toast, ToastViewport } = useToast();

  // Report tickets (live + archived) so a notification's location/barangay can
  // be resolved from its linked ticket when the row itself carries none.
  const tickets = useTickets();
  const archivedTickets = useArchivedTickets();
  const allTickets = useMemo(
    () => tickets.concat(archivedTickets),
    [tickets, archivedTickets]
  );

  // Adapt store entries to the card/sheet view shape.
  // `location`/`actionUrl` are only stored when the optional notification
  // columns exist (or the push happened in this session) — otherwise derive
  // them from the ticket reference carried by the dedupe key, so the card
  // never degrades to "System" for a report that still exists.
  const cleanTitle = (t) => (typeof t === "string" ? t.split(" — ").join(" at ") : t);
  const notifications = storeNotifications.map((n) => {
    const linkedTicket = n.ticketId
      ? allTickets.find((t) => String(t.id) === String(n.ticketId))
      : null;
    return {
      ...n,
      title: cleanTitle(n.title),
      barangay: linkedTicket?.barangay || "Tejero",
      location: n.location || linkedTicket?.location || null,
      timestamp: timeAgoLabel(n.at),
      receivedAt: absoluteDateTimeLabel(n.at),
      actionUrl: n.actionUrl || (n.ticketId ? `/live-map?ticketId=${n.ticketId}` : null),
      actionLabel: n.actionLabel || (n.ticketId ? "View Report" : null),
    };
  });

  // TEMPORARY preview: mock cards so the layout + detail sheet can be
  // seen before anything arrives. Remove when real notifications exist.
  const previewNotifs = [
    {
      id: "preview-notif-1",
      type: "Dispatch",
      title: "Assignment cancelled at Sitio Vilgon & Sitio Mac Arthur",
      message:
        "Sitio Vilgon & Sitio Mac Arthur was cancelled by its driver. Reason: Truck breakdown. Assign a new driver.",
      barangay: "Tejero",
      location: "Sitio Vilgon, Brgy. Tejero",
      timestamp: "2h ago",
      receivedAt: "Sep 27, 2026 · 07:20 AM",
      actionUrl: null,
      actionLabel: null,
      isRead: false,
      ticketId: null,
    },
    {
      id: "preview-notif-2",
      type: "Ticket",
      title: "New report: Overflowing Bin at Sitio Vilgon",
      message:
        "Overflowing Bin at Sitio Vilgon. Priority: High.",
      barangay: "Tejero",
      location: "Sitio Vilgon, Brgy. Tejero",
      timestamp: "26m ago",
      receivedAt: "Sep 27, 2026 · 09:14 AM",
      actionUrl: null,
      actionLabel: null,
      isRead: false,
      ticketId: null,
    },
  ];
  const isNotifPreview = notifications.length === 0;
  const baseNotifs = isNotifPreview ? previewNotifs : notifications;
  const selectedNotif = baseNotifs.find((n) => n.id === selectedNotifId) ?? null;
  const isPreviewId = (id) => String(id).startsWith("preview-");

  const deleteNotification = (id, e) => {
    if (e) e.stopPropagation();
    if (isPreviewId(id)) return;
    removeNotification(id);
    if (selectedNotifId === id) {
      setSelectedNotifId(null);
    }
    toast("Alert deleted.");
  };

  const markRead = (id) => {
    if (isPreviewId(id)) return;
    markNotificationRead(id);
  };

  const markAllAsRead = () => {
    markAllNotificationsRead("admin");
  };

  const filteredNotifications = baseNotifs.filter((n) => {
    if (activeTab === "Emergency") return n.type === "Emergency";
    if (activeTab === "System") return n.type === "System" || n.type === "Dispatch";
    if (activeTab === "Ticket") return n.type === "Ticket";
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const totalCount = notifications.length;
  const isSheetOpen = selectedNotif !== null;

  // Lock background scroll when modal is open
  useEffect(() => {
    const mainEl = document.getElementById("admin-main-scroll");
    if (!mainEl) return;
    if (isSheetOpen) {
      mainEl.style.overflow = "hidden";
    } else {
      mainEl.style.overflow = "";
    }
    return () => {
      mainEl.style.overflow = "";
    };
  }, [isSheetOpen]);

  return (
    <div className="relative flex min-h-full w-full min-w-0 overflow-x-hidden bg-background">
      <div className="relative z-10 flex flex-1 min-w-0 flex-col gap-5 p-4 [scrollbar-gutter:stable] sm:gap-6 sm:p-6 lg:p-8 pb-6 sm:pb-8 lg:pb-10">
        <PageHeader
          title="Notifications"
          description="Emergency alerts, truck updates, and new resident reports"
          actions={
            unreadCount > 0 ? (
              <Button variant="secondary" onClick={markAllAsRead}>
                <CheckCheck className="h-4 w-4 text-emerald-600" />
                <span>Mark all as read</span>
              </Button>
            ) : null
          }
        />

        <div className="grid shrink-0 grid-cols-2 gap-2.5 sm:gap-3.5 max-w-md">
          <PanelStat label="Alerts" value={totalCount} hint="Total received" />
          <PanelStat label="Unread" value={unreadCount} hint="Awaiting your review" tone="emerald" />
        </div>

        <div className="flex shrink-0 items-center">
          <div className="w-fit">
            <select
              value={activeTab}
              onChange={(e) => setActiveTab(e.target.value)}
              className="flex h-9 min-w-[140px] items-center justify-between rounded-lg border border-border bg-card px-3 text-[13px] font-medium text-foreground transition-colors hover:border-zinc-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/20 cursor-pointer"
            >
              <option value="All">All Alerts</option>
              <option value="Emergency">Emergency</option>
              <option value="System">Truck & System</option>
              <option value="Ticket">Reports</option>
            </select>
          </div>
        </div>

        <div>
          {filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center px-4 py-14 text-center">
              <h3 className="text-[17px] font-semibold tracking-tight text-foreground">No Notifications Yet</h3>
              <p className="mt-1 max-w-[240px] text-[13px] leading-normal text-muted-foreground">
                You&apos;re all caught up. No new notifications.
              </p>
            </div>
          ) : (
            <>
            <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {filteredNotifications.map((n) => {
                const isSelected = selectedNotif?.id === n.id;
                const typeInfo = getTypeStyle(n.type);

                return (
                  <div
                    key={n.id}
                    onClick={() => {
                      setSelectedNotifId(n.id);
                      markRead(n.id);
                    }}
                    className={`flex cursor-pointer select-none flex-col justify-between rounded-2xl border border-border/60 bg-card p-4 transition-all ${
                      isSelected
                        ? "border-emerald-400 ring-1 ring-emerald-400/20"
                        : "border-border hover:border-zinc-300 hover:bg-muted/40"
                    }`}
                  >
                    <div className="flex shrink-0 flex-nowrap items-center justify-between gap-2">
                      {!n.isRead ? (
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                      ) : (
                        <span />
                      )}
                      <span
                        className={cn(
                          "flex shrink-0 items-center gap-1 whitespace-nowrap text-xs font-medium tracking-tight",
                          typeInfo.pill
                        )}
                      >
                        {typeInfo.icon}
                        {typeInfo.label}
                      </span>
                    </div>

                    <div className="mt-3.5">
                      <div
                        className={cn("truncate text-sm text-foreground", !n.isRead ? "font-semibold" : "font-medium")}
                        title={n.title}
                      >
                        {n.title}
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs leading-normal text-muted-foreground">
                        {n.message}
                      </p>
                    </div>

                    <div className="mt-3.5 border-t border-border-subtle pt-2 info-stack">
                      <InfoRow label="Location" value={n.location || "System"} />
                      <InfoRow
                        label="Received"
                        value={
                          <span className="text-sm font-medium tracking-tight text-muted-foreground tabular-nums">
                            {n.receivedAt || "—"}
                            {n.timestamp ? ` (${n.timestamp})` : ""}
                          </span>
                        }
                      />
                    </div>

                    <div className="mt-3 flex shrink-0 items-center justify-end">
                      <button
                        type="button"
                        onClick={(e) => deleteNotification(n.id, e)}
                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-rose-600/10 px-3 py-1 text-[13px] font-semibold text-rose-600 transition-all hover:bg-rose-600/20 active:scale-95"
                        title="Delete Alert"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete Alert
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            {isNotifPreview && (
              <p className="mt-2.5 text-center text-[13px] text-muted-foreground">
                Preview. Incoming alerts will appear here.
              </p>
            )}
            </>
          )}
        </div>

        <div className="mt-4 flex shrink-0 items-center justify-between border-t border-border pt-4 pb-6">
          <span className="text-xs font-medium text-muted-foreground">
            Showing {filteredNotifications.length} of {baseNotifs.length} total alerts
          </span>
        </div>

        {/* Guaranteed bottom spacer element */}
        <div className="h-6 sm:h-8 lg:h-10 w-full shrink-0 pointer-events-none" aria-hidden="true" />
        {ToastViewport}
      </div>

      <AnimatePresence>
        {isSheetOpen && (
          <div className="fixed inset-0 z-50 flex items-stretch justify-center sm:justify-end pointer-events-none overflow-hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 sm:bg-transparent pointer-events-auto"
              onClick={() => setSelectedNotifId(null)}
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="relative z-10 flex h-full h-dvh w-full min-w-0 flex-col overflow-hidden bg-card pointer-events-auto sm:max-w-md sm:border-l sm:border-border sm:shadow-2xl"
            >
              <div className="mx-auto flex h-full w-full max-w-3xl flex-col justify-between overflow-hidden p-4 sm:p-6">
                <div className="flex shrink-0 touch-none items-start justify-between border-b border-border/60 pb-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        "flex shrink-0 items-center gap-1.5 whitespace-nowrap text-[13px] font-semibold tracking-tight",
                        getTypeStyle(selectedNotif.type).pill
                      )}
                    >
                      {getTypeStyle(selectedNotif.type).icon}
                      {getTypeStyle(selectedNotif.type).label}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSelectedNotifId(null)}
                    className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:text-foreground cursor-pointer"
                    aria-label="Close panel"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto overscroll-contain py-3 gap-5 flex flex-col min-h-0">
                  <div className="divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/60 bg-card">
                    <div className="flex flex-col gap-1 px-4 py-3">
                      <span className="text-[13px] text-muted-foreground">Details</span>
                      <div className="flex min-w-0 flex-col">
                        <span className="break-words text-[15px] font-semibold text-foreground">
                          {selectedNotif.title}
                        </span>
                        <span className="mt-0.5 text-[13px] tabular-nums text-muted-foreground">
                          {selectedNotif.receivedAt || "—"}
                          {selectedNotif.timestamp ? ` (${selectedNotif.timestamp})` : ""}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1 px-4 py-3">
                      <span className="text-[13px] text-muted-foreground">Location</span>
                      <div className="flex flex-col">
                        <span className="text-[15px] font-semibold text-foreground">{selectedNotif.location || "System"}</span>
                        <span className="mt-0.5 text-[13px] text-muted-foreground">
                          Barangay {selectedNotif.barangay}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1 px-4 py-3">
                      <span className="text-[13px] text-muted-foreground">Message</span>
                      <p className="text-[13px] leading-normal text-foreground">{selectedNotif.message}</p>
                    </div>
                  </div>

                  {selectedNotif.actionUrl && (
                    <Link href={selectedNotif.actionUrl} onClick={() => setSelectedNotifId(null)}>
                      <Button variant="primary" className="h-10 w-full rounded-xl px-4 text-[14px] font-semibold">
                        {selectedNotif.actionLabel || "View"}
                      </Button>
                    </Link>
                  )}
                </div>

                <div className="mt-auto shrink-0 touch-none flex items-center justify-end gap-2 border-t border-border-subtle pt-4">
                  <Button variant="secondary" className="h-10 rounded-xl px-4 text-[14px] font-semibold" onClick={() => setSelectedNotifId(null)}>
                    Close
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
