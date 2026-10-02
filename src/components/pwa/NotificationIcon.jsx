"use client";

import { Truck, Ticket, XCircle, CheckCircle2, AlertTriangle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

// Type icons shared by the driver Updates and resident Updates notification
// cards (same language as the admin Notifications page pills). Plain icons
// with no background tint.
const TYPE_CONFIG = {
  Dispatch: { Icon: Truck, color: "text-emerald-600" },
  Ticket: { Icon: Ticket, color: "text-amber-600" },
  Cancelled: { Icon: XCircle, color: "text-rose-600" },
  Resolved: { Icon: CheckCircle2, color: "text-emerald-600" },
  Emergency: { Icon: AlertTriangle, color: "text-rose-600" },
  System: { Icon: Info, color: "text-zinc-500" },
};

export default function NotificationTypeIcon({ type, className }) {
  const { Icon, color } = TYPE_CONFIG[type] || TYPE_CONFIG.System;
  return (
    <span aria-hidden="true" className={cn("flex items-center justify-center", color, className)}>
      <Icon className="h-5 w-5" strokeWidth={2} />
    </span>
  );
}
