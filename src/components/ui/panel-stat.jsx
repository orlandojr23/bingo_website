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
    <div className={cn("rounded-xl border border-border bg-card p-3.5", className)}>
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="mt-1 font-mono text-lg font-semibold tracking-tight text-foreground">
        {value}
      </div>
      {hint && (
        <div className={cn("mt-0.5 text-xs font-medium", hintTones[tone] || hintTones.zinc)}>
          {hint}
        </div>
      )}
    </div>
  );
}
