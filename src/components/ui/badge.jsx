import { cn } from "@/lib/utils";
import { Clock, Loader, CheckCircle2, Circle, CalendarClock } from "lucide-react";

const statusConfig = {
  Resolved: { color: "text-emerald-700", icon: CheckCircle2 },
  "In Progress": { color: "text-blue-700", icon: Loader },
  Pending: { color: "text-amber-700", icon: Clock },
  Scheduled: { color: "text-zinc-700", icon: CalendarClock },
  Completed: { color: "text-emerald-700", icon: CheckCircle2 },
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
  let displayStatus = status;
  if (status === "Pending") displayStatus = "Waiting";
  if (status === "In Progress") displayStatus = "On the Way";
  if (status === "Resolved") displayStatus = "Cleaned Up";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold",
        config.color,
        className
      )}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" strokeWidth={2.5} />
      {displayStatus}
    </span>
  );
}

export function UrgencyBadge({ urgency, className }) {
  const textColor = urgencyTextColors[urgency] || "text-zinc-700";
  let displayUrgency = urgency;
  if (urgency === "Critical") displayUrgency = "Emergency";
  
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold",
        textColor,
        className
      )}
    >
      {displayUrgency}
    </span>
  );
}
