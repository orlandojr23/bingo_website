import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  icon: Icon,
  description,
  trend,
  className,
}) {
  return (
    <div
      className={cn(
        "bg-white border-2 border-zinc-200 rounded-2xl p-4 sm:p-6 flex flex-col justify-between transition-all duration-150 hover:border-zinc-300 hover:shadow-sm",
        className
      )}
    >
      <div className="flex items-start sm:items-center justify-between gap-2 mb-3 sm:mb-4">
        <span className="text-xs sm:text-sm font-bold text-zinc-500 tracking-tight leading-tight">
          {label}
        </span>
        {Icon && (
          <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600 shrink-0" strokeWidth={2} />
        )}
      </div>

      <div className="flex flex-col gap-1">
        <div className="text-2xl sm:text-4xl font-bold tracking-tight text-zinc-900 font-mono">
          {value}
        </div>

        {(trend || description) && (
          <div className="flex flex-wrap items-center gap-1.5 mt-2 text-sm font-medium">
            {trend && (
              <span
                className={cn(
                  "font-bold",
                  trend.isPositive ? "text-emerald-700" : "text-rose-700"
                )}
              >
                {trend.value}
              </span>
            )}
            {description && (
              <span className="text-zinc-500">{description}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
