"use client";

import { useEffect, useRef, useState } from "react";
import { WifiOff } from "lucide-react";
import { useDbStatus } from "@/lib/db-health";
import { useOutboxCount } from "@/lib/outbox";

// Persistent connectivity banner for the Supabase outage plan. Fixed to the
// top of the viewport so it can be mounted anywhere in the tree (next to
// ToastViewport). Renders nothing while the backend is healthy.
export default function DbStatusBanner() {
  const { browserOnline, stale } = useDbStatus();
  const pending = useOutboxCount();
  const degraded = !browserOnline || stale || pending > 0;
  const [caughtUp, setCaughtUp] = useState(false);
  const prev = useRef({ pending, degraded });

  // Brief "all caught up" confirmation once a degraded spell drains fully.
  // Ref writes stay inside the effect so render stays pure.
  useEffect(() => {
    const p = prev.current;
    if (p.pending > 0 && pending === 0 && (p.degraded || degraded)) {
      setCaughtUp(true);
      const t = setTimeout(() => setCaughtUp(false), 3000);
      prev.current = { pending, degraded };
      return () => clearTimeout(t);
    }
    prev.current = { pending, degraded };
  }, [pending, degraded]);

  if (!degraded && !caughtUp) return null;

  const headline = caughtUp
    ? "Back online all changes synced."
    : !browserOnline
      ? "You're offline showing last saved data."
      : stale
        ? "Connection issue showing last saved data."
        : "Syncing queued changes…";
  const sub =
    !caughtUp && pending > 0
      ? `${pending} change${pending === 1 ? "" : "s"} waiting to send.`
      : null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-0 z-[95] flex justify-center px-4 pt-[calc(0.5rem+env(safe-area-inset-top))]"
    >
      <div
        className={
          caughtUp
            ? "pointer-events-auto flex max-w-md items-center gap-2 rounded-full bg-emerald-700 px-4 py-2 text-[13px] font-semibold text-white shadow-lg"
            : "pointer-events-auto flex max-w-md items-center gap-2 rounded-full bg-zinc-900 px-4 py-2 text-[13px] font-semibold text-white shadow-lg"
        }
      >
        {!caughtUp && <WifiOff className="h-4 w-4 shrink-0 text-amber-400" strokeWidth={2} />}
        <span className="leading-snug">
          {headline}
          {sub && <span className="font-normal text-zinc-300"> {sub}</span>}
        </span>
      </div>
    </div>
  );
}
