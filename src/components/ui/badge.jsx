import { cn } from "@/lib/utils";

const statusConfig = {
  Resolved: { color: "text-emerald-700" },
  "In Progress": { color: "text-blue-700" },
  Pending: { color: "text-amber-700" },
  Scheduled: { color: "text-zinc-700" },
  Completed: { color: "text-emerald-700" },
  Active: { color: "text-emerald-700" },
  Suspended: { color: "text-zinc-600" },
};

const urgencyTextColors = {
  Critical: "text-rose-700",
  High: "text-orange-700",
  Medium: "text-amber-700",
  Low: "text-zinc-600",
};

export function StatusBadge({ status, className }) {
  const config = statusConfig[status] || { color: "text-zinc-700" };
  let displayStatus = status;
  if (status === "Pending") displayStatus = "Waiting";
  if (status === "In Progress") displayStatus = "On the Way";
  if (status === "Resolved") displayStatus = "Cleaned Up";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0",
        config.color,
        className
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0 opacity-85" />
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
        "inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0",
        textColor,
        className
      )}
    >
      {displayUrgency}
    </span>
  );
}
