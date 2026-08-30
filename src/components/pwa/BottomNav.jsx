"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export default function BottomNav({
  tabs,
  activeTab,
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
          const active = activeTab === tab.id;
          const Icon = tab.icon;
          const activeColor = dark ? "text-emerald-400" : "text-emerald-600";
          const inactiveColor = dark ? "text-zinc-500" : "text-muted-foreground";

          if (tab.raised) {
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onChange(tab.id)}
                aria-label={tab.label}
                className="flex min-w-0 flex-1 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-full transition-transform active:scale-[0.97]"
              >
                <span
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full bg-emerald-600 text-white transition-colors",
                    active && "bg-emerald-700"
                  )}
                >
                  <Icon className="h-5 w-5" strokeWidth={1.75} />
                </span>
                <span
                  className={cn(
                    "text-[10px] font-medium tracking-tight",
                    active ? activeColor : inactiveColor
                  )}
                >
                  {tab.label}
                </span>
              </button>
            );
          }

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onChange(tab.id)}
              className={cn(
                "relative flex min-w-0 flex-1 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-2xl py-1 transition-transform active:scale-[0.97]",
                active
                  ? (dark ? "text-emerald-400 font-bold" : "text-emerald-700 font-bold")
                  : (dark ? "text-zinc-400 font-medium" : "text-muted-foreground font-medium")
              )}
            >
              {active && (
                <motion.span
                  layoutId={`nav-pill-${variant}`}
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  className={cn(
                    "absolute inset-x-1 inset-y-1 rounded-2xl",
                    dark ? "bg-emerald-500/10" : "bg-emerald-50/80 border border-emerald-200/50"
                  )}
                />
              )}
              <span className="relative">
                <Icon className="h-5 w-5" strokeWidth={active ? 2 : 1.75} />
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
