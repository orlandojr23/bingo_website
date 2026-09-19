import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function haptic(ms = 10) {
  if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
    try {
      navigator.vibrate(ms);
    } catch {}
  }
}

// ── Report date/time formatting (single source of truth) ──
// All ticket timestamps are stored as ISO strings (Supabase `created_at`).
// These helpers render them in Philippine local time so the admin and the
// resident always see the same date + time for a report.
export function formatTicketDate(iso) {
  const t = new Date(iso);
  if (!Number.isFinite(t.getTime())) return "—";
  return t.toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatTicketTime(iso) {
  const t = new Date(iso);
  if (!Number.isFinite(t.getTime())) return "—";
  return t.toLocaleTimeString("en-PH", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatTicketDateTime(iso) {
  const t = new Date(iso);
  if (!Number.isFinite(t.getTime())) return "—";
  return `${formatTicketDate(iso)} · ${formatTicketTime(iso)}`;
}

// Long variant used on detail screens: "September 19, 2026 · 02:35 PM"
export function formatTicketDateLong(iso) {
  const t = new Date(iso);
  if (!Number.isFinite(t.getTime())) return "—";
  return t.toLocaleDateString("en-PH", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}
