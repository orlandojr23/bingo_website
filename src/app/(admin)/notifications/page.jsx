"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Bell,
  AlertTriangle,
  Truck,
  Ticket as TicketIcon,
  Info,
  CheckCheck,
  MapPin,
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

const typeStyles = {
  Emergency: {
    icon: <AlertTriangle className="h-4 w-4 text-rose-600" />,
    pill: "text-rose-600 bg-transparent",
    label: "Emergency",
  },
  Dispatch: {
    icon: <Truck className="h-4 w-4 text-blue-600" />,
    pill: "text-blue-600 bg-transparent",
    label: "Dispatch",
  },
  Ticket: {
    icon: <TicketIcon className="h-4 w-4 text-amber-600" />,
    pill: "text-amber-600 bg-transparent",
    label: "Resident Report",
  },
  System: {
    icon: <Info className="h-4 w-4 text-zinc-600" />,
    pill: "text-zinc-600 bg-transparent",
    label: "System Alert",
  },
};

const getTypeStyle = (type) => typeStyles[type] || typeStyles.System;

export default function NotificationsPage() {
  const storeNotifications = useNotifications("admin");
  const [activeTab, setActiveTab] = useState("All");
  const [selectedNotifId, setSelectedNotifId] = useState(null);

  // Adapt store entries to the card/sheet view shape.
  const notifications = storeNotifications.map((n) => ({
    ...n,
    barangay: n.barangay ?? "Tejero",
    timestamp: timeAgoLabel(n.at),
  }));

  const selectedNotif = notifications.find((n) => n.id === selectedNotifId) ?? null;

  const deleteNotification = (id, e) => {
    if (e) e.stopPropagation();
    removeNotification(id);
    if (selectedNotifId === id) {
      setSelectedNotifId(null);
    }
  };

  const markRead = (id) => {
    markNotificationRead(id);
  };

  const markAllAsRead = () => {
    markAllNotificationsRead("admin");
  };

  const filteredNotifications = notifications.filter((n) => {
    if (activeTab === "Emergency") return n.type === "Emergency";
    if (activeTab === "System") return n.type === "System" || n.type === "Dispatch";
    if (activeTab === "Ticket") return n.type === "Ticket";
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const totalCount = notifications.length;
  const isSheetOpen = selectedNotif !== null;

  return (
    <div className="flex min-h-full w-full min-w-0 overflow-x-hidden bg-background">
      <div className="flex flex-1 min-w-0 flex-col gap-5 p-4 [scrollbar-gutter:stable] sm:gap-6 sm:p-6 lg:p-8 pb-10 sm:pb-16 lg:pb-24">
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

        <div className="grid shrink-0 grid-cols-2 gap-3 sm:gap-3.5 max-w-sm sm:max-w-md">
          <PanelStat label="Alerts" value={totalCount} hint="Total received" />
          <PanelStat label="Unread" value={unreadCount} hint="Awaiting your review" tone="emerald" />
        </div>

        <div className="flex shrink-0 items-center">
          <div className="inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-lg border border-border bg-muted/70 p-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {["All", "Emergency", "System", "Ticket"].map((tab) => {
              const isActive = activeTab === tab;
              let displayLabel = "All Alerts";
              if (tab === "Emergency") displayLabel = "Emergency";
              if (tab === "System") displayLabel = "Truck & System";
              if (tab === "Ticket") displayLabel = "Reports";

              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
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
          {filteredNotifications.length === 0 ? (
            <div className="flex items-center justify-center rounded-xl border border-border bg-card p-8 text-center">
              <div className="flex max-w-xs flex-col items-center">
                <Bell className="mb-2.5 h-8 w-8 text-zinc-300" />
                <h3 className="text-sm font-semibold text-foreground">No Alerts Found</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  You&apos;re all caught up. No new notifications.
                </p>
              </div>
            </div>
          ) : (
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
                    className={`flex cursor-pointer select-none flex-col justify-between rounded-xl border bg-card p-4 transition-all ${
                      isSelected
                        ? "border-emerald-400 ring-1 ring-emerald-400/20"
                        : "border-border hover:border-zinc-300 hover:bg-muted/40"
                    }`}
                  >
                    <div className="flex shrink-0 flex-nowrap items-center justify-between gap-2">
                      <div className="flex min-w-0 flex-nowrap items-center gap-1.5">
                        <span className="whitespace-nowrap font-mono text-xs font-semibold text-foreground">
                          {n.id}
                        </span>
                        {!n.isRead && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />}
                      </div>
                      <span
                        className={cn(
                          "flex shrink-0 items-center gap-1 whitespace-nowrap text-xs font-semibold",
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

                    <div className="mt-3.5 border-t border-border-subtle pt-2">
                      <InfoRow label="Location" value={n.location || "System"} />
                      <InfoRow
                        label="Received"
                        value={<span className="font-mono text-xs">{n.timestamp}</span>}
                      />
                    </div>

                    <div className="mt-3 flex shrink-0 items-center justify-end">
                      <button
                        type="button"
                        onClick={(e) => deleteNotification(n.id, e)}
                        className="rounded-md border border-rose-200 bg-card px-2.5 py-1 text-xs font-medium text-rose-600 transition-colors hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 cursor-pointer"
                        title="Delete Alert"
                      >
                        Delete Alert
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-4 mb-2 sm:mb-6 lg:mb-8 flex shrink-0 items-center justify-between border-t border-border pt-3.5 pb-2">
          <span className="text-xs font-medium text-muted-foreground">
            Showing {filteredNotifications.length} of {notifications.length} total alerts
          </span>
        </div>
      </div>

      <AnimatePresence>
        {isSheetOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-stretch justify-end pointer-events-none overflow-hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 sm:bg-transparent pointer-events-auto"
              onClick={() => setSelectedNotifId(null)}
            />
            <motion.div
              initial={{ y: "100%", x: 0 }}
              animate={{ y: 0, x: 0 }}
              exit={{ y: "100%", x: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="relative z-10 flex h-auto max-h-[85dvh] sm:h-full w-full max-w-md flex-col overflow-y-auto rounded-t-2xl sm:rounded-none border-t sm:border-t-0 sm:border-l border-border bg-card p-4 sm:p-6 shadow-2xl pointer-events-auto self-end sm:self-auto"
            >
              <div className="flex flex-col h-full justify-between overflow-y-auto">
                <div className="flex flex-1 flex-col gap-4 overflow-y-auto">
                  <div className="flex shrink-0 items-start justify-between border-b border-border pb-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-foreground">
                        {selectedNotif.id}
                      </span>
                      <span
                        className={cn(
                          "flex shrink-0 items-center gap-1 whitespace-nowrap text-xs font-semibold",
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
                      aria-label="Back to list"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="flex flex-col gap-2.5">
                    <div className="flex flex-col gap-1.5 rounded-xl border border-border bg-muted/40 p-3.5">
                      <span className="text-xs font-medium text-muted-foreground">Details</span>
                      <div className="flex min-w-0 flex-col">
                        <span className="break-words text-sm font-semibold text-foreground">
                          {selectedNotif.title}
                        </span>
                        <span className="mt-1 text-xs text-muted-foreground">{selectedNotif.timestamp}</span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5 rounded-xl border border-border bg-muted/40 p-3.5">
                      <span className="text-xs font-medium text-muted-foreground">Location</span>
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-foreground">{selectedNotif.location}</span>
                        <span className="mt-0.5 text-xs text-muted-foreground">
                          Barangay {selectedNotif.barangay}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5 rounded-xl border border-border bg-muted/40 p-3.5">
                    <span className="text-xs font-medium text-muted-foreground">Message</span>
                    <p className="text-xs leading-relaxed text-zinc-700">{selectedNotif.message}</p>
                  </div>

                  {selectedNotif.actionUrl && (
                    <Link href={selectedNotif.actionUrl} onClick={() => setSelectedNotifId(null)}>
                      <Button variant="secondary" className="w-full">
                        {/Map|Track/.test(selectedNotif.actionLabel || "") ? (
                          <MapPin className="h-3.5 w-3.5" />
                        ) : (
                          <TicketIcon className="h-3.5 w-3.5" />
                        )}
                        {selectedNotif.actionLabel || "View"}
                      </Button>
                    </Link>
                  )}
                </div>

                <div className="mt-6 flex shrink-0 items-center justify-end border-t border-border-subtle pt-4">
                  <Button variant="secondary" onClick={() => setSelectedNotifId(null)}>
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
