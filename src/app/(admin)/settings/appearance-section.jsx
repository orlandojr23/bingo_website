"use client";

import {
  DENSITIES,
  DENSITY_LABELS,
  DENSITY_DESCRIPTIONS,
  useDensity,
  setDensity,
} from "@/lib/density";
import { cn } from "@/lib/utils";

// Gmail-style static thumbnail: three mock rows whose gaps show what each
// option feels like. Default is tight, Comfortable breathes.
function DensityThumb({ roomy }) {
  return (
    <div
      aria-hidden="true"
      className="w-[76px] shrink-0 rounded-lg border border-border-subtle bg-background p-1.5"
    >
      <div className={cn("flex flex-col", roomy ? "gap-[7px]" : "gap-[3px]")}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={cn(
              "flex items-center gap-1.5 rounded px-0.5 py-px",
              i === 1 && "bg-emerald-50"
            )}
          >
            <span
              className={cn(
                "h-2 w-2 shrink-0 rounded-[2px]",
                i === 1 ? "bg-emerald-500" : "bg-zinc-300"
              )}
            />
            <span className="flex flex-1 flex-col gap-[3px]">
              <span className="h-[3px] w-11/12 rounded-full bg-zinc-300" />
              <span className="h-[3px] w-2/3 rounded-full bg-zinc-200" />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AppearanceSection({ sectionCard, sectionHeader, notify }) {
  const density = useDensity();

  const pick = (value) => {
    if (value === density) return;
    setDensity(value);
    notify?.("Display density updated.");
  };

  return (
    <section className={sectionCard}>
      <div className={sectionHeader}>
        <div>
          <h2 className="text-sm font-semibold text-foreground">Appearance</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Control how roomy the admin pages feel
          </p>
        </div>
      </div>

      <div>
        <p className="mb-1 text-xs font-medium text-muted-foreground">Density</p>
        <div role="radiogroup" aria-label="Display density" className="flex flex-col">
          {DENSITIES.map((value) => {
            const selected = value === density;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => pick(value)}
                className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-1 py-2 text-left transition-colors hover:bg-muted/50"
              >
                <span
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                    selected ? "border-emerald-600" : "border-zinc-300"
                  )}
                >
                  {selected && (
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-600" />
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-foreground">
                    {DENSITY_LABELS[value]}
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    {DENSITY_DESCRIPTIONS[value]}
                  </span>
                </span>
                <DensityThumb roomy={value === "comfortable"} />
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
          Spacing only. Text sizes never change. Saved on this device.
        </p>
      </div>
    </section>
  );
}
