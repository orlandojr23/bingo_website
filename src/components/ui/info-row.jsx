import { cn } from "@/lib/utils";

export function InfoRow({ label, value, className }) {
  return (
    <div className={cn("flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 py-1", className)}>
      <span className="shrink-0 text-xs text-muted-foreground">{label}</span>
      <span className="max-w-full break-words text-right text-sm font-medium leading-snug text-foreground">
        {value}
      </span>
    </div>
  );
}
