"use client";

import { cn } from "@/lib/utils";

// Bottom nav — no active highlight: each button opens its own full screen,
// so a selected-pill state never makes sense here. (Any `activeTab` prop
// passed by callers is intentionally ignored.)
export default function BottomNav({
  tabs,
  onChange,
  variant = "light",
  className,
}) {
  const dark = variant === "dark";

  return (
    <nav
      className={cn(
        "pointer-events-none fixed inset-x-0 bottom-0 z-40 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))]",
        className
      )}
    >
      <div
        className={cn(
          "pointer-events-auto mx-auto flex h-16 max-w-md items-stretch gap-1 rounded-full border px-2 backdrop-blur-md",
          dark
            ? "border-zinc-800 bg-zinc-950/95 shadow-lg shadow-black/40"
            : "border-border bg-white/95 shadow-lg shadow-zinc-900/[0.06]"
        )}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const labelColor = dark ? "text-zinc-400" : "text-muted-foreground";

          if (tab.raised) {
            return (
              <button
                key={tab.id}
                type="button"
                data-tour={`nav-tab-${tab.id}`}
                onClick={() => onChange(tab.id)}
                aria-label={tab.label}
                className="flex min-w-0 flex-1 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-full transition-transform active:scale-[0.97]"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-600 text-white transition-colors">
                  <Icon className="h-5 w-5" strokeWidth={1.75} />
                </span>
                <span className={cn("text-[10px] font-medium tracking-tight", labelColor)}>
                  {tab.label}
                </span>
              </button>
            );
          }

          return (
            <button
              key={tab.id}
              type="button"
              data-tour={`nav-tab-${tab.id}`}
              onClick={() => onChange(tab.id)}
              className={cn(
                "relative flex min-w-0 flex-1 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-2xl py-1 font-medium transition-transform active:scale-[0.97]",
                dark ? "text-zinc-400" : "text-muted-foreground"
              )}
            >
              <span className="relative">
                <Icon className="h-5 w-5" strokeWidth={1.75} />
                {typeof tab.badge === "number" && tab.badge > 0 && (
                  <span className="absolute -right-3 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-600 px-1 font-mono text-[9px] font-semibold leading-none text-white">
                    {tab.badge}
                  </span>
                )}
              </span>
              <span className="relative text-[10px] tracking-tight">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
