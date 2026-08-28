"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Bell,
  AlertTriangle,
  Truck,
  Ticket as TicketIcon,
  Info,
  CheckCheck,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { PageHeader } from "@/components/ui/page-header";
import { PanelStat } from "@/components/ui/panel-stat";
import { InfoRow } from "@/components/ui/info-row";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const initialNotifications = [
  {
    id: "NOTIF-001",
    type: "Emergency",
    title: "Critical Illegal Dumping Alert",
    message: "Large-scale illegal dumping was reported near the Sitio Vilgon river access. This poses a serious environmental risk.",
    location: "Sitio Vilgon, Brgy. Tejero",
    barangay: "Tejero",
    timestamp: "10m ago",
    ticketId: "TKT-008",
    actionUrl: "/live-map?ticketId=TKT-008",
    actionLabel: "View on Map",
    isRead: false,
  },
  {
    id: "NOTIF-002",
    type: "Dispatch",
    title: "Truck 04 Arrived at Site",
    message: "Truck 04 (Plate GW-8821) has arrived at the Sitio ICM collection area.",
    location: "Sitio ICM, Brgy. Tejero",
    barangay: "Tejero",
    timestamp: "25m ago",
    actionUrl: "/live-map",
    actionLabel: "View Live Map",
    isRead: false,
  },
  {
    id: "NOTIF-003",
    type: "System",
    title: "Truck 02 GPS Alert",
    message: "Truck 02 has been stopped for more than 20 minutes near Sitio Daclan.",
    location: "Sitio Daclan, Brgy. Tejero",
    barangay: "Tejero",
    timestamp: "1h ago",
    actionUrl: "/live-map",
    actionLabel: "Track Truck",
    isRead: true,
  },
  {
    id: "NOTIF-004",
    type: "Ticket",
    title: "New Waste Report Filed",
    message: "Resident reported overflowing communal bin near Sitio Sampaguita chapel.",
    location: "Sitio Sampaguita, Brgy. Tejero",
    barangay: "Tejero",
    timestamp: "2h ago",
    ticketId: "TKT-001",
    actionUrl: "/tickets",
    actionLabel: "Review Report",
    isRead: true,
  },
];

const typeStyles = {
  Emergency: {
    icon: <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />,
    pill: "text-rose-600 bg-transparent",
    label: "Emergency",
  },
  Dispatch: {
    icon: <Truck className="h-3.5 w-3.5 text-blue-600" />,
    pill: "text-blue-600 bg-transparent",
    label: "Dispatch",
  },
  Ticket: {
    icon: <TicketIcon className="h-3.5 w-3.5 text-amber-600" />,
    pill: "text-amber-600 bg-transparent",
    label: "Resident Report",
  },
  System: {
    icon: <Info className="h-3.5 w-3.5 text-zinc-600" />,
    pill: "text-zinc-600 bg-transparent",
    label: "System Alert",
  },
};

const getTypeStyle = (type) => typeStyles[type] || typeStyles.System;

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [activeTab, setActiveTab] = useState("All");
  const [selectedNotif, setSelectedNotif] = useState(null);

  useEffect(() => {
    setNotifications(initialNotifications);
  }, []);

  const deleteNotification = (id, e) => {
    if (e) e.stopPropagation();
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    if (selectedNotif?.id === id) {
      setSelectedNotif(null);
    }
  };

  const markAsRead = (id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
    if (selectedNotif?.id === id) {
      setSelectedNotif((prev) => ({ ...prev, isRead: true }));
    }
  };

  const markAsUnread = (id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: false } : n))
    );
    if (selectedNotif?.id === id) {
      setSelectedNotif((prev) => ({ ...prev, isRead: false }));
    }
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    if (selectedNotif) {
      setSelectedNotif((prev) => ({ ...prev, isRead: true }));
    }
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
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-6 [scrollbar-gutter:stable] lg:p-8">
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

        <div className="grid shrink-0 grid-cols-2 gap-3.5 max-w-sm sm:max-w-md">
          <PanelStat label="Alerts" value={totalCount} hint="Total received" />
          <PanelStat label="Unread" value={unreadCount} hint="Awaiting your review" tone="emerald" />
        </div>

        <div className="flex shrink-0 items-center">
          <div className="flex items-center gap-1 rounded-lg border border-border bg-muted p-0.5">
            {["All", "Emergency", "System", "Ticket"].map((tab) => {
              const isActive = activeTab === tab;
              let displayLabel = "All";
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
                    onClick={() => setSelectedNotif(n)}
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
                          "shrink-0 whitespace-nowrap text-xs font-semibold",
                          typeInfo.pill
                        )}
                      >
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
                      <InfoRow
                        label="Status"
                        value={
                          <span className={n.isRead ? "text-muted-foreground" : "font-semibold text-emerald-600"}>
                            {n.isRead ? "Read" : "Unread"}
                          </span>
                        }
                      />
                    </div>

                    <div className="mt-3 flex shrink-0 items-center justify-end">
                      <button
                        type="button"
                        onClick={(e) => deleteNotification(n.id, e)}
                        className="text-xs font-medium text-rose-600 transition-colors hover:text-rose-700 cursor-pointer"
                        title="Dismiss Alert"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-2 flex shrink-0 items-center justify-between border-t border-border pt-3">
          <span className="text-xs text-muted-foreground">
            Showing {filteredNotifications.length} of {notifications.length} total alerts
          </span>
        </div>
      </div>

      <AnimatePresence>
        {isSheetOpen && (
          <div className="fixed inset-0 z-50 flex justify-end pointer-events-none overflow-hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-transparent pointer-events-auto"
              onClick={() => setSelectedNotif(null)}
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="relative z-10 flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-border bg-card p-6 shadow-2xl pointer-events-auto"
            >
              <div className="flex h-full flex-1 flex-col overflow-hidden">
                <div className="flex flex-1 flex-col gap-4 overflow-y-auto">
                  <div className="flex shrink-0 items-start justify-between border-b border-border pb-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-foreground">
                        {selectedNotif.id}
                      </span>
                      <span
                        className={cn(
                          "shrink-0 whitespace-nowrap text-xs font-semibold",
                          getTypeStyle(selectedNotif.type).pill
                        )}
                      >
                        {getTypeStyle(selectedNotif.type).label}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setSelectedNotif(null)}
                      className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
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

                  <Link href={selectedNotif.actionUrl}>
                    <Button variant="secondary" className="w-full">
                      {selectedNotif.actionLabel}
                    </Button>
                  </Link>

                  <div className="mt-2 flex flex-col gap-2 border-t border-border-subtle pt-4">
                    <span className="text-xs font-medium text-muted-foreground">Mark as</span>
                    <div className="grid grid-cols-2 gap-0.5 rounded-lg bg-muted p-0.5">
                      <button
                        type="button"
                        onClick={() => markAsUnread(selectedNotif.id)}
                        className={`rounded-md py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                          !selectedNotif.isRead
                            ? "bg-card text-foreground shadow-xs"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Unread
                      </button>
                      <button
                        type="button"
                        onClick={() => markAsRead(selectedNotif.id)}
                        className={`rounded-md py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                          selectedNotif.isRead
                            ? "bg-card text-foreground shadow-xs"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Read
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex shrink-0 items-center justify-end border-t border-border-subtle pt-4">
                  <Button variant="secondary" onClick={() => setSelectedNotif(null)}>
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
