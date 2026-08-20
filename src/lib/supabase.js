import { createClient } from "@supabase/supabase-js";

export const initialTestRecords = [
  {
    id: "TKT-101",
    location: "Osmeña Blvd & Colon St",
    barangay: "Capitol Site",
    reporter: "Juan Dela Cruz",
    urgency: "High",
    status: "Pending",
    description:
      "Overflowing communal garbage bin near the intersection requiring immediate pickup.",
    created_at: "2023-10-24T08:30:00Z",
  },
  {
    id: "TKT-102",
    location: "Cebu IT Park, Avida Towers",
    barangay: "Apas",
    reporter: "Maria Santos",
    urgency: "Low",
    status: "Resolved",
    description:
      "Litter scattered near park benches, cleared by assigned response team.",
    created_at: "2023-10-23T14:15:00Z",
  },
  {
    id: "TKT-103",
    location: "AS Fortuna St",
    barangay: "Banilad",
    reporter: "Pedro Reyes",
    urgency: "Critical",
    status: "In Progress",
    description:
      "Illegal dumping site blocking pedestrian sidewalk access on main avenue.",
    created_at: "2023-10-25T11:00:00Z",
  },
  {
    id: "TKT-104",
    location: "Fuente Osmeña Circle",
    barangay: "Santa Cruz",
    reporter: "Ana Lim",
    urgency: "Medium",
    status: "Pending",
    description:
      "Uncollected storm debris and green waste accumulating along curb.",
    created_at: "2023-10-26T09:45:00Z",
  },
];

export function getSupabaseClient(customUrl, customKey) {
  const url = customUrl || process.env.NEXT_PUBLIC_SUPABASE_URL || "https://yzluyeoqifikpaogpdob.supabase.co";
  const key = customKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_WQpxXZ69Dpp0d1S0R8uFYw_t_lxdyxR";

  if (!url || !key) return null;
  try {
    return createClient(url, key);
  } catch (err) {
    console.warn("Invalid Supabase configuration:", err);
    return null;
  }
}
