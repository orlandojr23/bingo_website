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
  const wktPoint = `POINT(${ticket.lng} ${ticket.lat})`;

  const { data: sessionData } = await supabase.auth.getSession();

  // Guard against oversized base64 images which can cause the Supabase
  // request to hang or exceed the row size limit (~1 MB safety cap).
  const MAX_IMAGE_BYTES = 1_000_000; // 1 MB
  const imageUrl =
    ticket.photo && ticket.photo.length > MAX_IMAGE_BYTES ? null : ticket.photo;

  const { error } = await supabase.from('tickets').insert({
    reporter_id: sessionData?.session?.user?.id || null,
    reporter_name: ticket.reporter,
    location_name: ticket.location,
    barangay: ticket.barangay,
    category: ticket.category,
    urgency: ticket.urgency,
    notes: ticket.notes,
    image_url: imageUrl,
    status: ticket.status || 'Pending',
    location_geo: wktPoint
  });

  if (error) {
    console.error("Error adding ticket:", error);
    throw new Error(error.message || "Failed to add ticket");
  }

  fetchTickets();
}


export async function updateTicket(id, patch) {
  const dbPatch = {};
  if (patch.status !== undefined) dbPatch.status = patch.status;
  if (patch.isArchived !== undefined) dbPatch.is_archived = patch.isArchived;
  // Allow updating report fields from the edit form
  if (patch.location !== undefined) dbPatch.location_name = patch.location;
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

  const { error } = await supabase.from('tickets').update(dbPatch).eq('id', id);
  if (error) {
    console.error("Error updating ticket:", error);
    throw new Error(error.message || "Failed to update ticket");
  }

  fetchTickets();
}


export async function removeTicket(id) {
  const { error } = await supabase.from('tickets').update({ is_archived: true }).eq('id', id);
  if (error) {
    console.error("Error archiving ticket:", error);
  } else {
    fetchTickets();
  }
}

export async function restoreTicket(id) {
  const { error } = await supabase.from('tickets').update({ is_archived: false }).eq('id', id);
  if (error) {
    console.error("Error restoring ticket:", error);
  } else {
    fetchTickets();
  }
}

export async function hardDeleteTicket(id) {
  const { error } = await supabase.from('tickets').delete().eq('id', id);
  if (error) {
    console.error("Error deleting ticket:", error);
  } else {
    fetchTickets();
  }
}

