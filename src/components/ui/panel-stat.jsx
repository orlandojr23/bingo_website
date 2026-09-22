import { cn } from "@/lib/utils";

const hintTones = {
  emerald: "text-emerald-700",
  rose: "text-rose-700",
  blue: "text-blue-700",
  amber: "text-amber-700",
  zinc: "text-muted-foreground",
};

export function PanelStat({ label, value, hint, tone = "zinc", className }) {
  return (
    <div className={cn("rounded-xl border border-border bg-card p-3 sm:p-3.5 flex flex-col justify-between min-w-0 shadow-xs", className)}>
      <div className="text-[11px] sm:text-xs font-medium text-muted-foreground truncate">{label}</div>
      <div className="mt-0.5 sm:mt-1 text-base sm:text-lg font-semibold tracking-tight text-foreground font-sans truncate">
        {value}
      </div>
      {hint && (
        <div className={cn("mt-0.5 text-[10px] sm:text-xs font-medium truncate", hintTones[tone] || hintTones.zinc)}>
          {hint}
        </div>
      )}
    </div>
  );
}
