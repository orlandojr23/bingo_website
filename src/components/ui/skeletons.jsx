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
    <div className="flex flex-1 flex-col gap-5 sm:gap-6" aria-hidden="true">
      <div className="h-8 w-64 max-w-full rounded-lg bg-foreground/10 animate-pulse" />
      <div className="h-5 w-48 max-w-full rounded-lg bg-foreground/5 animate-pulse -mt-2" />

      <div className="mt-4 grid shrink-0 grid-cols-2 sm:grid-cols-3 gap-2.5 sm:gap-3.5 max-w-xl sm:max-w-2xl">
        {[0, 1, 2].map((i) => (
          <PulseCard key={i} bars={["h-3 w-1/2", "h-7 w-1/3", "h-3 w-2/3"]} />
        ))}
      </div>

      <div className="mt-2 flex shrink-0 flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between min-w-0 w-full">
        <div className="h-5 w-32 rounded-lg bg-foreground/10 animate-pulse" />
        <div className="h-8 w-64 rounded-xl bg-muted animate-pulse" />
      </div>

      <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 mt-2">
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div
            key={i}
            className="flex flex-col gap-2.5 rounded-2xl border border-border/60 bg-card p-4"
          >
            <div className="flex items-center justify-between">
              <div className="h-3 w-20 rounded-full bg-foreground/10 animate-pulse" />
              <div className="h-5 w-16 rounded-full bg-foreground/10 animate-pulse" />
            </div>
            <div className="mt-2 h-4 w-4/5 rounded-full bg-foreground/10 animate-pulse" />
            <div className="h-3 w-3/5 rounded-full bg-foreground/10 animate-pulse" />
            <div className="mt-3 border-t border-border-subtle pt-3 space-y-2">
              <div className="flex justify-between"><div className="h-3 w-12 rounded bg-foreground/5"/><div className="h-3 w-16 rounded bg-foreground/5"/></div>
              <div className="flex justify-between"><div className="h-3 w-14 rounded bg-foreground/5"/><div className="h-3 w-20 rounded bg-foreground/5"/></div>
              <div className="flex justify-between"><div className="h-3 w-16 rounded bg-foreground/5"/><div className="h-3 w-24 rounded bg-foreground/5"/></div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AdminShellSkeleton() {
  return (
    <div className="flex min-h-[100dvh] w-full bg-background text-foreground lg:h-screen lg:overflow-hidden" aria-hidden="true">
      <aside className="sticky top-0 z-30 hidden h-screen lg:flex">
        <div className="flex h-full w-[280px] sm:w-64 shrink-0 flex-col border-r border-border-subtle bg-card lg:w-72">
          <div className="flex h-16 shrink-0 items-center border-b border-border-subtle px-5">
            <div className="h-8 w-32 rounded-lg bg-foreground/10 animate-pulse" />
          </div>
          <div className="flex flex-1 flex-col gap-2 px-3 py-4">
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div key={i} className="h-9 w-full rounded-lg bg-foreground/5 animate-pulse" />
            ))}
          </div>
          <div className="mt-auto flex shrink-0 flex-col gap-3 border-t border-border-subtle px-3 pb-4 pt-3">
            <div className="flex items-center gap-3 px-2 py-1">
              <div className="h-9 w-9 rounded-full bg-foreground/10 animate-pulse" />
              <div className="flex flex-col gap-1.5 flex-1">
                <div className="h-3 w-20 rounded bg-foreground/10 animate-pulse" />
                <div className="h-2 w-24 rounded bg-foreground/5 animate-pulse" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="h-10 rounded-xl bg-foreground/5 animate-pulse" />
              <div className="h-10 rounded-xl bg-foreground/5 animate-pulse" />
            </div>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="sticky top-0 z-20 flex p-3 pb-0 lg:hidden">
          <div className="h-9 w-9 rounded-lg bg-foreground/10 animate-pulse" />
        </div>

        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overflow-x-hidden">
          <div className="p-4 sm:p-6 lg:p-8">
            <DashboardSkeleton />
          </div>
        </main>
      </div>
    </div>
  );
}

export function ResidentShellSkeleton() {
  return (
    <div className="flex h-dvh w-full flex-col bg-background overflow-hidden" aria-hidden="true">
      {/* Background Map Skeleton */}
      <div className="relative flex-1 w-full overflow-hidden">
        <div className="absolute inset-0 h-full w-full z-0">
          <MapSkeleton />
        </div>

        {/* Top Status Banner Skeleton */}
        <div className="pointer-events-auto absolute top-0 inset-x-0 z-20 w-full border-b border-border/60 bg-background/80 backdrop-blur-md flex items-center overflow-hidden px-4 pt-[calc(env(safe-area-inset-top)+12px)] pb-3">
          <div className="flex items-center gap-2.5 min-w-0 w-full">
            <div className="h-6 w-6 shrink-0 rounded bg-foreground/10 animate-pulse" />
            <div className="min-w-0 flex-1 flex flex-col gap-1.5">
              <div className="h-4 w-32 rounded bg-foreground/10 animate-pulse" />
              <div className="h-3 w-48 rounded bg-foreground/5 animate-pulse" />
            </div>
          </div>
          <div className="ml-1 flex w-11 shrink-0 flex-col items-center justify-center gap-[2px]">
            <div className="h-5 w-5 rounded bg-foreground/10 animate-pulse" />
            <div className="h-2 w-7 rounded bg-foreground/10 animate-pulse" />
          </div>
          <div className="ml-1 flex w-11 shrink-0 flex-col items-center justify-center gap-[2px]">
            <div className="h-5 w-5 rounded bg-foreground/10 animate-pulse" />
            <div className="h-2 w-7 rounded bg-foreground/10 animate-pulse" />
          </div>
        </div>

        {/* Floating Map Action Buttons Skeleton */}
        <div className="absolute bottom-[calc(5.5rem+env(safe-area-inset-bottom))] left-3 z-20">
          <div className="h-11 w-11 rounded-full bg-white shadow-md animate-pulse border border-black/10" />
        </div>
        <div className="absolute bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-3 z-20">
          <div className="h-11 w-11 rounded-full bg-white shadow-md animate-pulse border border-black/10" />
        </div>

        {/* Bottom Nav Bar Skeleton */}
        <div className="fixed bottom-0 inset-x-0 z-[100] border-t border-black/10 bg-background/85 backdrop-blur-xl shadow-[0_-4px_16px_rgba(0,0,0,0.06)] pb-[env(safe-area-inset-bottom)]">
          <div className="grid grid-cols-5 h-[64px] max-w-md mx-auto px-2">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className={`flex flex-col items-center justify-center ${i === 2 ? '-mt-5 gap-1.5' : 'gap-1'}`}>
                {i === 2 ? (
                  <div className="h-[42px] w-[42px] rounded-[18px] bg-emerald-600/30 animate-pulse" />
                ) : (
                  <div className="h-6 w-6 rounded bg-foreground/10 animate-pulse" />
                )}
                <div className={`h-2 rounded animate-pulse ${i === 2 ? 'w-8 bg-emerald-600/20' : 'w-8 bg-foreground/5'}`} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function DriverShellSkeleton() {
  return (
    <div className="flex h-dvh w-full flex-col bg-background overflow-hidden" aria-hidden="true">
      {/* Background Map Skeleton */}
      <div className="relative flex-1 w-full overflow-hidden">
        <div className="absolute inset-0 h-full w-full z-0">
          <MapSkeleton />
        </div>

        {/* Top Status Banner Skeleton */}
        <div className="pointer-events-auto absolute top-0 inset-x-0 z-20 w-full border-b border-border/60 bg-background/80 backdrop-blur-md flex items-center overflow-hidden px-4 pt-[calc(env(safe-area-inset-top)+12px)] pb-3">
          <div className="flex items-center gap-2.5 min-w-0 w-full">
            <div className="h-6 w-6 shrink-0 rounded bg-foreground/10 animate-pulse" />
            <div className="min-w-0 flex-1 flex flex-col gap-1.5">
              <div className="h-4 w-32 rounded bg-foreground/10 animate-pulse" />
              <div className="h-3 w-48 rounded bg-foreground/5 animate-pulse" />
            </div>
          </div>
        </div>

        {/* Floating Map Action Buttons Skeleton */}
        <div className="absolute bottom-[calc(5.5rem+env(safe-area-inset-bottom))] left-3 z-20">
          <div className="h-11 w-11 rounded-full bg-white shadow-md animate-pulse border border-black/10" />
        </div>
        <div className="absolute bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-3 z-20">
          <div className="h-11 w-11 rounded-full bg-white shadow-md animate-pulse border border-black/10" />
        </div>

        {/* Bottom Nav Bar Skeleton */}
        <div className="fixed bottom-0 inset-x-0 z-[100] border-t border-black/10 bg-background/85 backdrop-blur-xl shadow-[0_-4px_16px_rgba(0,0,0,0.06)] pb-[env(safe-area-inset-bottom)]">
          <div className="grid grid-cols-5 h-[64px] max-w-md mx-auto px-2">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="flex flex-col items-center justify-center gap-1">
                <div className="h-6 w-6 rounded bg-foreground/10 animate-pulse" />
                <div className="h-2 w-8 rounded bg-foreground/5 animate-pulse" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ChatReplySkeleton() {
  return (
    <div className="flex w-full justify-start" aria-hidden="true">
      <div className="flex w-full flex-row items-end gap-2">
        <img
          src="/mascot/arms-open-pose-clean.webp"
          alt=""
          className="h-24 w-auto shrink-0 sm:h-28"
        />
        <div className="relative min-w-0 flex-1 rounded-2xl border border-border/60 bg-card px-4 py-2.5 shadow-sm">
          <span
            aria-hidden="true"
            className="absolute -left-[7px] bottom-12 h-3.5 w-3.5 rotate-45 border-b border-l border-border/60 bg-card"
          />
          <span
            aria-hidden="true"
            className="absolute -left-[3px] bottom-12 h-[18px] w-[6px] bg-card"
          />
          <div className="relative flex flex-col gap-2 py-1">
            <div className="h-3 w-11/12 rounded-full bg-foreground/10 animate-pulse" />
            <div className="h-3 w-2/3 rounded-full bg-foreground/10 animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function ListSkeleton() {  return (
    <div className="flex flex-col gap-3 w-full animate-in fade-in duration-300">
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className="h-[90px] w-full rounded-2xl bg-muted/40 animate-pulse border border-border/50" />
      ))}
    </div>
  );
}

export function ProfileSkeleton() {
  return (
    <div className="flex flex-col gap-4 w-full animate-in fade-in duration-300 pt-2">
      <div className="h-[88px] w-full rounded-2xl bg-muted/40 animate-pulse border border-border/50" />
      <div className="h-[180px] w-full rounded-xl bg-muted/40 animate-pulse border border-border/50" />
      <div className="h-[120px] w-full rounded-xl bg-muted/40 animate-pulse border border-border/50" />
    </div>
  );
}
