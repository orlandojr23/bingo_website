import { cn } from "@/lib/utils";
import { Clock, Loader, CheckCircle2, Circle } from "lucide-react";

const statusConfig = {
  Resolved: { color: "text-emerald-700", icon: CheckCircle2 },
  "In Progress": { color: "text-blue-700", icon: Loader },
  Pending: { color: "text-amber-700", icon: Clock },
};

const urgencyTextColors = {
  Critical: "text-rose-700",
  High: "text-orange-700",
  Medium: "text-amber-700",
  Low: "text-zinc-600",
};

export function StatusBadge({ status, className }) {
  const config = statusConfig[status] || { color: "text-zinc-700", icon: Circle };
  const Icon = config.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold",
        config.color,
        className
      )}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" strokeWidth={2.5} />
      {status}
    </span>
  );
}

export function UrgencyBadge({ urgency, className }) {
  const textColor = urgencyTextColors[urgency] || "text-zinc-700";
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold",
        textColor,
        className
      )}
    >
      {urgency}
    </span>
  );
}
