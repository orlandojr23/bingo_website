import { useEffect, useState } from "react";

// Persisted default map camera per app: "default" (flat top-down) or "tilt"
// (pitched 3D camera). Driver and resident share one localStorage origin, so
// each app passes its own storage key.
export function useMapView(storageKey) {
  const [mapView, setMapViewState] = useState("default");

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (saved === "tilt" || saved === "default") setMapViewState(saved);
    } catch {}
  }, [storageKey]);

  const setMapView = (value) => {
    if (value !== "tilt" && value !== "default") return;
    setMapViewState(value);
    try {
      window.localStorage.setItem(storageKey, value);
    } catch {}
  };

  return [mapView, setMapView];
}
