import { useMemo, useSyncExternalStore } from "react";
import { supabase } from "@/lib/supabase";
import { recordDbSuccess, recordDbFailure, isNetworkError, withDbRetry } from "@/lib/db-health";
import { enqueueOp, flushOutbox, registerExecutor } from "@/lib/outbox";

const TICKETS_KEY = "bingo-tickets-v1";
import { pushNotification } from "@/lib/notifications";

const listeners = new Set();
let cache = loadPersistedTickets() || { tickets: [] };
let isFetching = false;
let lastFailAt = 0;
let initialized = false;

function notify() {
  for (const listener of listeners) listener();
}

// PostgREST/network errors often log as `{}` in the dev overlay, hiding the
// real cause. Serialize the useful fields explicitly instead.
export function describeDbError(error) {
  if (!error) return "unknown error";
  if (typeof error === "string") return error;
  const parts = [
    error.message,
    error.code ? `code=${error.code}` : null,
    error.status ? `status=${error.status}` : null,
    error.details,
    error.hint,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" | ") : JSON.stringify(error);
}

// Translate Supabase Row -> Frontend Object
// `created_at` is the single source of truth for when a report was filed.
// We derive `date` / `time` / `description` / `city` here so every consumer
// (admin cards, modals, map popups, resident screens) can rely on them even
// though those columns don't exist in the DB.
function mapToFrontend(dbRow) {
  const createdAt = dbRow.created_at || null;
  let date = "—";
  let time = "";
  if (createdAt) {
    const d = new Date(createdAt);
    if (!Number.isNaN(d.getTime())) {
      date = d.toLocaleDateString("en-PH", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
      time = d.toLocaleTimeString("en-PH", {
        hour: "2-digit",
        minute: "2-digit",
      });
    }
  }
  const notes = dbRow.notes || "";
  return {
    id: dbRow.id, // Now a UUID
    reporterId: dbRow.reporter_id || null,
    reporter: dbRow.reporter_name,
    location: dbRow.location_name,
    barangay: dbRow.barangay,
    city: "Cebu City",
    category: dbRow.category,
    urgency: dbRow.urgency,
    notes,
    description: notes,
    photo: dbRow.image_url,
    lat: dbRow.lat, // Comes from our computed column!
    lng: dbRow.lng, // Comes from our computed column!
    status: dbRow.status,
    isArchived: dbRow.is_archived,
    timestamp: createdAt,
    date,
    time,
  };
}

async function fetchTickets() {
  if (isFetching) return;
  // Bound failed first-loads to one attempt per 10s so an outage doesn't
  // refetch on every render while `initialized` is still false.
  if (!initialized && Date.now() - lastFailAt < 10000) return;
  isFetching = true;

  const run = async () => {
    const { data, error } = await supabase
      .from('tickets')
      .select('*, lat, lng')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
  };

  try {
    // Retry only the first load; withDbRetry records health itself.
    // Realtime-event refetches must not retry-storm on every notification.
    const data = initialized ? await run() : await withDbRetry(run);
    if (data) {
      cache = { tickets: data.map(mapToFrontend) };
      persistTickets(cache.tickets);
      initialized = true;
      notify();
    }
    if (initialized) {
      recordDbSuccess();
      flushOutbox();
    }
  } catch (err) {
    // Keep the previous list on screen and mark it stale.
    if (initialized) recordDbFailure(err);
    else lastFailAt = Date.now();
  } finally {
    isFetching = false;
  }
}

// Listen for Realtime Changes
if (typeof window !== "undefined") {
  supabase.channel('public:tickets')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, () => {
      fetchTickets();
    })
    .subscribe();
}

export function useTickets() {
  if (!initialized && typeof window !== 'undefined') {
    fetchTickets();
  }
  const tickets = useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => cache,
    () => cache
  ).tickets;

  // NOTE: `.filter()` creates a new array identity on every render. Without
  // memoizing, any `useEffect(..., [tickets])` consumer (e.g. live-map deep
  // links) re-fires every render and `setMapCenter([...])` re-renders forever
  // → "Maximum update depth exceeded". `cache.tickets` is referentially
  // stable between fetches, so this memo keeps the filtered array stable too.
  return useMemo(() => tickets.filter(t => !t.isArchived), [tickets]);
}

export function useArchivedTickets() {
  if (!initialized && typeof window !== 'undefined') {
    fetchTickets();
  }
  const tickets = useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => cache,
    () => cache
  ).tickets;

  return useMemo(() => tickets.filter(t => t.isArchived), [tickets]);
}

// -------------------------------------------------------------
// CRUD Operations
// -------------------------------------------------------------

export async function addTicket(ticket) {
  // Insert directly to Supabase. PostGIS requires ST_Point(lng, lat).
  const wktPoint = `POINT(${ticket.lng} ${ticket.lat})`;

  const { data: sessionData } = await supabase.auth.getSession();

  // Guard against oversized base64 images which can cause the Supabase
  // request to hang or exceed the row size limit (~1 MB safety cap).
  const MAX_IMAGE_BYTES = 1_000_000; // 1 MB
  const imageUrl =
    ticket.photo && ticket.photo.length > MAX_IMAGE_BYTES ? null : ticket.photo;

  // The report form sends `description`; older callers may send `notes`.
  // Either one lands in the `notes` column so it is never dropped.
  const notes = ticket.notes ?? ticket.description ?? "";

  const clientId = ticket.clientId || newTicketId();
  const row = {
    id: clientId,
    reporter_id: sessionData?.session?.user?.id || null,
    reporter_name: ticket.reporter,
    location_name: ticket.location,
    barangay: ticket.barangay,
    category: ticket.category,
    urgency: ticket.urgency,
    notes,
    image_url: imageUrl,
    status: ticket.status || 'Pending',
    location_geo: wktPoint
  };

  let data = null;
  try {
    const res = await supabase.from('tickets').insert(row).select('id').single();
    if (res.error) throw res.error;
    data = res.data;
  } catch (err) {
    if (isNetworkError(err)) {
      // Outage plan: the report stays on this device and sends itself
      // when connectivity returns (see outbox.js). The client-generated
      // id makes the replay idempotent — a lost response can never file
      // it twice. Photo is dropped from the queued copy only (the row
      // keeps image_url); it only feeds the confirmation screen.
      enqueueOp('ticket-insert', { row, ticket: { ...ticket, photo: undefined } }, { key: `ticket:${clientId}` });
      recordDbFailure(err);
      return { ticketId: clientId, queued: true, notified: false, remote: false };
    }
    console.error("Error adding ticket:", describeDbError(err));
    throw new Error(err.message || "Failed to add ticket");
  }

  fetchTickets();

  // Notify the admin side (Notifications page, sidebar badge, arrival ding)
  // about the new resident report. Fire-and-forget: a notification failure
  // must never fail the report submission itself. The outcome is returned so
  // the UI can warn visibly when the admin was not reached.
  return sendTicketAdminNotification(ticket, data?.id || null);
}

async function sendTicketAdminNotification(ticket, newId) {
  try {
    const isEmergency = ticket.urgency === "Critical";
    const { remote, deduped, error: notifError } = await pushNotification({
      audience: "admin",
      type: isEmergency ? "Emergency" : "Ticket",
      title: isEmergency
        ? `Emergency: ${ticket.category || "Waste report"} at ${ticket.location}`
        : `New report: ${ticket.category || "Waste report"} at ${ticket.location}`,
      message: `${ticket.category || "Waste report"} at ${ticket.location}. Priority: ${ticket.urgency || "High"}.`,
      location: `${ticket.location}, Brgy. ${ticket.barangay || "Tejero"}`,
      actionUrl: newId ? `/live-map?ticketId=${newId}` : "/tickets",
      actionLabel: "View Report",
      ticketId: newId,
      at: new Date().toISOString(),
      dedupeKey: newId ? `ticket:${newId}` : undefined,
    });
    if (remote) {
      console.info(
        deduped
          ? `Admin notification already exists for ticket ${newId} — not duplicated.`
          : `Admin notification delivered for ticket ${newId}.`
      );
    } else {
      console.warn("Report saved, but admin notification stayed local-only:", notifError?.message || notifError);
    }
    return { ticketId: newId, notified: true, remote };
  } catch (notifErr) {
    console.warn("Report saved, but admin notification failed:", notifErr?.message || notifErr);
    return { ticketId: newId, notified: false, remote: false };
  }
}

export async function updateTicket(id, patch) {
  const dbPatch = {};
  if (patch.status !== undefined) dbPatch.status = patch.status;
  if (patch.isArchived !== undefined) dbPatch.is_archived = patch.isArchived;
  // Allow updating report fields from the edit form
  if (patch.location !== undefined) dbPatch.location_name = patch.location;
  if (patch.reporter !== undefined) dbPatch.reporter_name = patch.reporter;
  if (patch.barangay !== undefined) dbPatch.barangay = patch.barangay;
  if (patch.urgency !== undefined) dbPatch.urgency = patch.urgency;
  if (patch.category !== undefined) dbPatch.category = patch.category;
  if (patch.description !== undefined) dbPatch.notes = patch.description;
  if (patch.photo !== undefined) {
    const MAX_IMAGE_BYTES = 1_000_000;
    dbPatch.image_url = patch.photo && patch.photo.length > MAX_IMAGE_BYTES ? null : patch.photo;
  }
  if (patch.lat !== undefined && patch.lng !== undefined) {
    dbPatch.location_geo = `POINT(${patch.lng} ${patch.lat})`;
  }

  // Snapshot reporter details BEFORE the refresh so the Resolved
  // notification below knows who to notify even if the cache updates.
  const knownTicket = patch.status === "Resolved"
    ? cache.tickets.find((t) => t.id === id) || null
    : null;

  const { error } = await supabase.from('tickets').update(dbPatch).eq('id', id);
  if (error) {
    console.error("Error updating ticket:", describeDbError(error));
    throw new Error(error.message || "Failed to update ticket");
  }

  fetchTickets();

  // Tell the resident their report was cleaned up. Fire-and-forget: a
  // notification failure must never fail the status update itself. The
  // outcome is returned so the UI can confirm (or warn) visibly.
  if (patch.status === "Resolved") {
    try {
      let reporterId = knownTicket?.reporterId || null;
      let reporter = knownTicket?.reporter || "";
      let location = knownTicket?.location || "your reported area";
      if (!reporterId && !reporter) {
        const { data: row } = await supabase
          .from('tickets')
          .select('reporter_id, reporter_name, location_name')
          .eq('id', id)
          .single();
        reporterId = row?.reporter_id || null;
        reporter = row?.reporter_name || "";
        location = row?.location_name || location;
      }
      const audience = reporterId || (reporter ? `resident:${reporter}` : null);
      if (!audience) {
        console.warn(`Status saved, but ticket ${id} has no reporter to notify.`);
        return { notified: false, remote: false, reason: "no-reporter" };
      }
      const { remote, deduped, error: notifError } = await pushNotification({
        audience,
        type: "Resolved",
        title: "Your report was cleaned up",
          message: `Your report at ${location} was cleaned up. Thank you!`,
        location,
        ticketId: id,
        at: new Date().toISOString(),
        dedupeKey: `ticket:${id}:resolved`,
      });
      if (remote) {
        console.info(
          deduped
            ? `Resident notification already exists (audience: ${audience}) — not duplicated.`
            : `Resident notification delivered (audience: ${audience}).`
        );
      } else {
        console.warn("Status saved, but resident notification stayed local-only:", notifError?.message || notifError);
      }
      return { notified: true, remote, audience };
    } catch (notifErr) {
      console.warn("Status saved, but resident notification failed:", notifErr?.message || notifErr);
      return { notified: false, remote: false, reason: "exception" };
    }
  }
  return { notified: false, remote: true };
}

export async function removeTicket(id) {
  const { error } = await supabase.from('tickets').update({ is_archived: true }).eq('id', id);
  if (error) {
    console.error("Error archiving ticket:", describeDbError(error));
  } else {
    fetchTickets();
  }
}

export async function restoreTicket(id) {
  const { error } = await supabase.from('tickets').update({ is_archived: false }).eq('id', id);
  if (error) {
    console.error("Error restoring ticket:", describeDbError(error));
  } else {
    fetchTickets();
  }
}

export async function hardDeleteTicket(id) {
  const { error } = await supabase.from('tickets').delete().eq('id', id);
  if (error) {
    console.error("Error deleting ticket:", describeDbError(error));
  } else {
    fetchTickets();
  }
}

// ---- Outage plan: stale cache + queued reports (see db-health.js) ----
function newTicketId() {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  } catch {}
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function loadPersistedTickets() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(TICKETS_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (parsed && Array.isArray(parsed.tickets)) return parsed;
  } catch {}
  return null;
}

function persistTickets(tickets) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(TICKETS_KEY, JSON.stringify({ v: 1, tickets }));
  } catch {}
}

// Outbox executor owned by this lib: replays a queued report idempotently.
// The client-generated id means a lost response can never duplicate the
// row; the admin notification reuses its dedupeKey for the same reason.
registerExecutor("ticket-insert", async ({ row, ticket }) => {
  const { data: existing } = await supabase.from('tickets').select('id').eq('id', row.id).maybeSingle();
  let ticketId = existing?.id || null;
  if (!ticketId) {
    const { data, error } = await supabase.from('tickets').insert(row).select('id').single();
    if (error) throw error;
    ticketId = data?.id || row.id;
  }
  fetchTickets();
  await sendTicketAdminNotification(ticket, ticketId);
  recordDbSuccess();
  return { ticketId };
});
