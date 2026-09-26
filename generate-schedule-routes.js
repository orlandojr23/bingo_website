const fs = require('fs');
const ORS_URL = "https://api.openrouteservice.org/v2/directions/driving-car/geojson";
const ORS_KEY = "eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6IjkzMmZmZWMxZDlmZjQ1NjZiOTFlOThlMDNiYjQyZTUwIiwiaCI6Im11cm11cjY0In0=";

const schedules = {
  "SCH-001": [
    { lat: 10.3019, lng: 123.90755 },
    { lat: 10.30125, lng: 123.9081 },
    { lat: 10.3016, lng: 123.9086 },
    { lat: 10.3068, lng: 123.906 }
  ],
  "SCH-002": [
    { lat: 10.30285, lng: 123.90975 },
    { lat: 10.30545, lng: 123.90885 },
    { lat: 10.3049, lng: 123.90665 },
    { lat: 10.3068, lng: 123.906 }
  ],
  "SCH-003": [
    { lat: 10.30375, lng: 123.90195 },
    { lat: 10.303, lng: 123.90295 },
    { lat: 10.3039, lng: 123.90795 },
    { lat: 10.3068, lng: 123.906 }
  ]
};

async function generate() {
  const routes = {};
  for (const [id, points] of Object.entries(schedules)) {
    const waypoints = points.map(p => [p.lng, p.lat]);
    const res = await fetch(ORS_URL, {
      method: "POST",
      headers: { Authorization: ORS_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ coordinates: waypoints })
    });
    const json = await res.json();
    const coords = json?.features?.[0]?.geometry?.coordinates;
    routes[id] = coords.map(([lng, lat]) => [lat, lng]);
    console.log(`Generated ${id} with ${routes[id].length} points.`);
  }
  fs.writeFileSync('schedule-routes.json', JSON.stringify(routes));
}

generate();
