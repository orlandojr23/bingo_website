"use client";

import { cn } from "@/lib/utils";

export default function AppHeader({
  variant = "light",
  leading,
  title,
  subtitle,
  trailing,
  className,
}) {
  const dark = variant === "dark";

  return (
    <header
      className={cn(
        "sticky top-0 z-40 shrink-0 border-b backdrop-blur-md pt-safe",
        dark ? "border-zinc-800 bg-zinc-950/90" : "border-border bg-white/95",
        className
      )}
    >
      <div className="flex h-14 items-center justify-between gap-3 px-4 sm:px-6">
        {(leading || title || subtitle) ? (
          <div className="flex min-w-0 flex-1 items-center gap-3">
            {leading}
            {(title || subtitle) && (
              <div className="min-w-0">
                {title && (
                  <h1
                    className={cn(
                      "truncate text-sm sm:text-base font-bold leading-tight tracking-tight",
                      dark ? "text-white" : "text-foreground"
                    )}
                  >
                    {title}
                  </h1>
                )}
                {subtitle && (
                  <div
                    className={cn(
                      "truncate text-xs leading-tight mt-0.5",
                      dark ? "text-zinc-400" : "text-muted-foreground"
                    )}
                  >
                    {subtitle}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div />
        )}
        {trailing && <div className="flex shrink-0 items-center gap-2.5">{trailing}</div>}
      </div>
    </header>
  );
}
