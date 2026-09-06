import { useSyncExternalStore } from "react";
import { supabase } from "@/lib/supabase";

const listeners = new Set();
let cache = { tickets: [] };
let isFetching = false;
let initialized = false;

function notify() {
  for (const listener of listeners) listener();
}

// Translate Supabase Row -> Frontend Object
function mapToFrontend(dbRow) {
  return {
    id: dbRow.id, // Now a UUID
    reporter: dbRow.reporter_name,
    location: dbRow.location_name,
    barangay: dbRow.barangay,
    category: dbRow.category,
    urgency: dbRow.urgency,
    notes: dbRow.notes,
    photo: dbRow.image_url,
    lat: dbRow.lat, // Comes from our computed column!
    lng: dbRow.lng, // Comes from our computed column!
    status: dbRow.status,
    isArchived: dbRow.is_archived,
    timestamp: dbRow.created_at,
  };
}

async function fetchTickets() {
  if (isFetching) return;
  isFetching = true;
  
  const { data, error } = await supabase
    .from('tickets')
    .select('*, lat, lng')
    .order('created_at', { ascending: false });

  if (data) {
    cache = { tickets: data.map(mapToFrontend) };
    initialized = true;
    notify();
  }
  isFetching = false;
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
  
  return tickets.filter(t => !t.isArchived);
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
  
  return tickets.filter(t => t.isArchived);
}

// -------------------------------------------------------------
// CRUD Operations
// -------------------------------------------------------------

export async function addTicket(ticket) {
  // Insert directly to Supabase. PostGIS requires ST_Point(lng, lat).
  // We use Supabase RPC or just let it insert using WKT representation 'POINT(lng lat)'
  const wktPoint = `POINT(${ticket.lng} ${ticket.lat})`;

  const { data: sessionData } = await supabase.auth.getSession();
  
  const { error } = await supabase.from('tickets').insert({
    reporter_id: sessionData?.session?.user?.id || null,
    reporter_name: ticket.reporter,
    location_name: ticket.location,
    barangay: ticket.barangay,
    category: ticket.category,
    urgency: ticket.urgency,
    notes: ticket.notes,
    image_url: ticket.photo, // If it's a huge base64 string, this will bloat the DB, but it works for now!
    status: ticket.status || 'Pending',
    location_geo: wktPoint
  });

  if (error) console.error("Error adding ticket:", error);
}

export async function updateTicket(id, patch) {
  const dbPatch = {};
  if (patch.status !== undefined) dbPatch.status = patch.status;
  if (patch.isArchived !== undefined) dbPatch.is_archived = patch.isArchived;

  const { error } = await supabase.from('tickets').update(dbPatch).eq('id', id);
  if (error) console.error("Error updating ticket:", error);
}

export async function removeTicket(id) {
  const { error } = await supabase.from('tickets').update({ is_archived: true }).eq('id', id);
  if (error) console.error("Error archiving ticket:", error);
}

export async function restoreTicket(id) {
  const { error } = await supabase.from('tickets').update({ is_archived: false }).eq('id', id);
  if (error) console.error("Error restoring ticket:", error);
}

export async function hardDeleteTicket(id) {
  const { error } = await supabase.from('tickets').delete().eq('id', id);
  if (error) console.error("Error deleting ticket:", error);
}

export function nextTicketId() {
  // We no longer need custom string IDs like TKT-001 since we use UUIDs.
  // This function is kept to satisfy frontend components that might call it,
  // but it's largely obsolete.
  return null; 
}
