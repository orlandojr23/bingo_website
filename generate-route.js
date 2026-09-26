const ORS_URL = "https://api.openrouteservice.org/v2/directions/cycling-regular/geojson";
const ORS_KEY = "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjkzMmZmZWMxZDlmZjQ1NjZiOTFlOThlMDNiYjQyZTUwIiwiaCI6Im11cm11cjY0In0=";

const BARANGAY_ROUTE = [
  [10.30125, 123.9081],  // 1. Vilgon
  [10.30285, 123.90975], // 2. Silangan
  [10.30545, 123.90885], // 3. Daclan
  [10.30465, 123.90835], // 4. Looban
  [10.3039, 123.90795],  // 5. ICM
  [10.3049, 123.90665],  // 6. Sampaguita
  [10.30565, 123.90555], // 7. Bacaros
  [10.30375, 123.90195], // 8. Zapanta
  [10.303, 123.90295],   // 9. Riverside
  [10.3019, 123.90755],  // 10. Mac Arthur
];

// Note: ORS API expects coordinates as [lng, lat]
const waypoints = BARANGAY_ROUTE.map(p => [p[1], p[0]]);

async function getDetailedRoute() {
  const res = await fetch(ORS_URL, {
    method: "POST",
    headers: {
      Authorization: ORS_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ coordinates: waypoints }),
  });
  
  if (!res.ok) {
    console.error("Failed", res.status);
    console.error(await res.text());
    return;
  }
  
  const json = await res.json();
  const coords = json?.features?.[0]?.geometry?.coordinates;
  if (!coords) {
    console.error("No coordinates");
    return;
  }
  
  // Back to [lat, lng] for Leaflet
  const leafletCoords = coords.map(([lng, lat]) => [lat, lng]);
  
  const fs = require('fs');
  fs.writeFileSync('detailed-route.json', JSON.stringify(leafletCoords));
  console.log("Successfully wrote", leafletCoords.length, "points to detailed-route.json");
}

getDetailedRoute();
