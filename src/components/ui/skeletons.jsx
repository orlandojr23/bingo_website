export function MapSkeleton() {
  return (
    <div className="relative h-full w-full overflow-hidden bg-muted/40" aria-hidden="true">
      <div className="absolute -left-10 top-1/4 h-2.5 w-[120%] -rotate-6 rounded-full bg-foreground/5 animate-pulse" />
      <div className="absolute -top-10 left-1/3 h-[120%] w-2.5 rotate-12 rounded-full bg-foreground/5 animate-pulse" />
      <div className="absolute -left-10 top-2/3 h-2 w-[120%] rotate-3 rounded-full bg-foreground/5 animate-pulse" />
      <div className="absolute left-1/2 top-1/2 h-14 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-600/10 animate-pulse" />
      <div className="absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-600/20 animate-pulse" />
    </div>
  );
}

function PulseCard({ bars }) {
  return (
    <div className="flex flex-col gap-2.5 rounded-xl border border-border bg-card p-4">
      {bars.map((b, i) => (
        <div
          key={i}
          className={`rounded-full bg-foreground/10 animate-pulse ${b}`}
        />
      ))}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-6" aria-hidden="true">
      <div className="grid shrink-0 grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <PulseCard key={i} bars={["h-2.5 w-1/2", "h-6 w-1/3", "h-2.5 w-2/3"]} />
        ))}
      </div>

      <div className="flex shrink-0 items-center justify-between">
        <div className="h-3.5 w-28 rounded-full bg-foreground/10 animate-pulse" />
        <div className="h-7 w-64 max-w-full rounded-lg bg-foreground/10 animate-pulse" />
      </div>

      <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div
            key={i}
            className="flex flex-col gap-2.5 rounded-xl border border-border bg-card p-4"
          >
            <div className="flex items-center justify-between">
              <div className="h-2.5 w-16 rounded-full bg-foreground/10 animate-pulse" />
              <div className="h-4 w-14 rounded-full bg-foreground/10 animate-pulse" />
            </div>
            <div className="h-3.5 w-4/5 rounded-full bg-foreground/10 animate-pulse" />
            <div className="h-2.5 w-3/5 rounded-full bg-foreground/10 animate-pulse" />
            <div className="mt-2 h-2.5 w-full rounded-full bg-foreground/5 animate-pulse" />
            <div className="h-2.5 w-2/3 rounded-full bg-foreground/5 animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function AdminShellSkeleton() {
  return (
    <div className="flex min-h-screen bg-background" aria-hidden="true">
      <div className="hidden w-60 shrink-0 flex-col gap-3 border-r border-border bg-card p-4 lg:flex">
        <div className="mb-2 h-8 w-2/3 rounded-lg bg-foreground/10 animate-pulse" />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-7 rounded-lg bg-foreground/5 animate-pulse" />
        ))}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-6 overflow-hidden p-6 lg:p-8">
        <div className="h-8 w-32 rounded-lg bg-foreground/10 animate-pulse lg:hidden" />
        <div className="flex flex-1 flex-col gap-6 overflow-hidden">
          <DashboardSkeleton />
        </div>
      </div>
    </div>
  );
}
