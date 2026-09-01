// Reverse-geocode coordinates into a human-readable address using OpenStreetMap
// Nominatim (same provider as the map tiles, no API key required).

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/reverse";

function formatNominatim(data) {
  const a = data.address || {};
  const primary =
    data.name ||
    a.amenity ||
    a.shop ||
    a.building ||
    a.road ||
    a.pedestrian ||
    a.highway;
  const area = a.suburb || a.neighbourhood || a.quarter || a.village || a.hamlet;
  const city = a.city || a.town || a.municipality || a.county;
  const parts = [...new Set([primary, area, city].filter(Boolean))];
  if (parts.length) return parts.join(", ");
  if (data.display_name) {
    return data.display_name.split(",").slice(0, 3).join(",").trim();
  }
  return "";
}

// Resolves { lat, lng } to a readable place name like
// "Sitio Vilgon, Tejero, Cebu City". Returns null when the lookup fails.
export async function reverseGeocode(lat, lng) {
  try {
    const res = await fetch(
      `${NOMINATIM_URL}?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      { headers: { Accept: "application/json" } }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return formatNominatim(data) || null;
  } catch {
    return null;
  }
}
