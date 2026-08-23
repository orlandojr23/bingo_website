"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Bell,
  AlertTriangle,
  Truck,
  Ticket as TicketIcon,
  MapPin,
  Info,
  CheckCheck,
  Trash2,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const initialNotifications = [
  {
    id: "NOTIF-001",
    type: "Emergency",
    title: "Critical Illegal Dumping Alert",
    message:
      "Massive illegal waste disposal reported near Guadalupe Riverbank. High environmental hazard.",
    location: "Sitio Riverfront, Brgy. Guadalupe",
    barangay: "Guadalupe",
    timestamp: "10m ago",
    ticketId: "TKT-008",
    actionUrl: "/tickets",
    actionLabel: "View Report",
    isRead: false,
  },
  {
    id: "NOTIF-002",
    type: "Dispatch",
    title: "Truck 04 Arrived at Site",
    message:
      "Compactor Truck 04 (Plate GW-8821) reached Sitio Kamagong collection area.",
    location: "Sitio Kamagong",
    barangay: "Guadalupe",
    timestamp: "25m ago",
    actionUrl: "/live-map",
    actionLabel: "View Live Map",
    isRead: false,
  },
  {
    id: "NOTIF-003",
    type: "System",
    title: "Truck 02 Telemetry Alert",
    message:
      "Compactor Truck 02 idle time exceeded 20 minutes near Banawa Heights sector.",
    location: "Banawa Heights",
    barangay: "Guadalupe",
    timestamp: "1h ago",
    actionUrl: "/live-map",
    actionLabel: "Track Unit",
    isRead: true,
  },
  {
    id: "NOTIF-004",
    type: "Ticket",
    title: "New Waste Report Filed",
    message:
      "Resident reported overflowing communal bin near Guadalupe Public Market.",
    location: "Public Market Access Rd",
    barangay: "Guadalupe",
    timestamp: "2h ago",
    ticketId: "TKT-001",
    actionUrl: "/tickets",
    actionLabel: "Review Report",
    isRead: true,
  },
];

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState(initialNotifications);
  const [activeTab, setActiveTab] = useState("All");
  const [deleteTargetId, setDeleteTargetId] = useState(null);

  const deleteNotification = (id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    setDeleteTargetId(null);
  };

  const markAsRead = (id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const filteredNotifications = notifications.filter((n) => {
    if (activeTab === "Emergency Reports") return n.type === "Emergency";
    if (activeTab === "System Alerts")
      return n.type === "System" || n.type === "Dispatch";
    if (activeTab === "Ticket Reports") return n.type === "Ticket";
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const getTypeIcon = (type) => {
    switch (type) {
      case "Emergency":
        return <AlertTriangle className="w-4 h-4 text-rose-600" />;
      case "Dispatch":
        return <Truck className="w-4 h-4 text-blue-600" />;
      case "Ticket":
        return <TicketIcon className="w-4 h-4 text-amber-600" />;
      case "System":
      default:
        return <Info className="w-4 h-4 text-zinc-600" />;
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto">
      {/* Filter Tabs & Bulk Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto p-1.5 bg-white border border-zinc-200 rounded-xl max-w-full scrollbar-hide">
          {["All", "Emergency Reports", "System Alerts", "Waste Reports"].map(
            (tab) => {
              const isActive = activeTab === tab;
              let count = notifications.length;
              if (tab === "Emergency Reports")
                count = notifications.filter((n) => n.type === "Emergency").length;
              if (tab === "System Alerts")
                count = notifications.filter(
                  (n) => n.type === "System" || n.type === "Dispatch"
                ).length;
              if (tab === "Waste Reports")
                count = notifications.filter((n) => n.type === "Ticket").length;

              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 ${
                    isActive
                      ? "bg-emerald-600 text-white"
                      : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100"
                  }`}
                >
                  <span>{tab}</span>
                  <span
                    className={`text-[10px] font-mono ${
                      isActive ? "text-emerald-100" : "text-zinc-400"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            }
          )}
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={markAllAsRead}
            className="flex items-center gap-1.5 text-xs font-bold text-zinc-600 hover:text-zinc-900 bg-white border border-zinc-200 px-3 py-2 rounded-lg shadow-sm hover:bg-zinc-50 transition-colors shrink-0 self-end sm:self-auto"
          >
            <CheckCheck className="w-4 h-4 text-emerald-600" />
            <span>Mark all as read</span>
          </button>
        )}
      </div>

      {/* Notifications Feed */}
      <div key={activeTab} className="bg-white border border-zinc-200 rounded-xl overflow-hidden divide-y divide-zinc-100 animate-in-fade">
        {filteredNotifications.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center">
            <Bell className="w-8 h-8 text-zinc-300 mb-2" />
            <h3 className="text-sm font-semibold text-zinc-900">
              No notifications in this category
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              You are completely caught up with municipal alerts.
            </p>
          </div>
        ) : (
          filteredNotifications.map((n) => (
            <div
              key={n.id}
              className="p-4 sm:p-5 flex flex-col sm:flex-row items-start justify-between gap-4 bg-white transition-colors"
            >
              <div className="flex items-start gap-3.5 flex-1 min-w-0">
                <div className="pt-0.5 shrink-0">
                  <div className="w-7 h-7 flex items-center justify-center">
                    {getTypeIcon(n.type)}
                  </div>
                </div>

                <div className="flex flex-col gap-1 min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h4
                      className={`text-xs sm:text-sm tracking-tight ${
                        !n.isRead
                          ? "font-semibold text-zinc-900"
                          : "font-medium text-zinc-800"
                      }`}
                    >
                      {n.title}
                    </h4>
                    {!n.isRead && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                    )}
                  </div>

                  <p className="text-xs text-zinc-600 leading-relaxed">
                    {n.message}
                  </p>

                  <div className="flex items-center gap-3 text-[11px] text-zinc-400 mt-1">
                    <span className="font-mono">{n.timestamp}</span>
                    {n.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-zinc-400" />
                        <span>{n.location}</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0 self-end sm:self-start pt-1">
                {!n.isRead && (
                  <button
                    type="button"
                    onClick={() => markAsRead(n.id)}
                    className="text-xs font-medium text-zinc-600 hover:text-zinc-900 px-2.5 py-1 rounded border border-zinc-200 hover:bg-zinc-50 transition-colors"
                  >
                    Mark read
                  </button>
                )}

                <Link
                  href={n.actionUrl}
                  className="inline-flex items-center text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-700 px-2.5 py-1 rounded transition-colors shadow-xs"
                >
                  {n.actionLabel}
                </Link>

                <button
                  type="button"
                  onClick={() => setDeleteTargetId(n.id)}
                  className="text-xs font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2.5 py-1 rounded transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteTargetId && (
        <div
          className="fixed inset-0 bg-zinc-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4"
          onClick={() => setDeleteTargetId(null)}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-xs w-full p-5 border border-zinc-200 animate-in-fade"
            onClick={(e) => e.stopPropagation()}
          >
            <h4 className="text-sm font-semibold text-zinc-900 mb-1">
              Delete Alert
            </h4>
            <p className="text-xs text-zinc-600 mb-4 leading-relaxed">
              Remove this notification from your command feed?
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDeleteTargetId(null)}
                className="flex-1 py-1.5 px-3 rounded-lg border border-zinc-200 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => deleteNotification(deleteTargetId)}
                className="flex-1 py-1.5 px-3 rounded-lg bg-rose-600 text-white text-xs font-medium hover:bg-rose-700 shadow-xs"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
