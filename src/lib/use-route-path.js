import { useMemo } from "react";
import { getSchedule } from "./live-route";

// Hardcoded collection route loop for Barangay Tejero.
// This replaces the complex OpenRouteService dynamic routing, ensuring
// a visually clean, instantly loading, and operationally accurate path.
export const SCHEDULE_ROUTES = {
  "SCH-001": [[10.301952,123.907552],[10.301958,123.907323],[10.301521,123.907186],[10.301276,123.907167],[10.301251,123.9081],[10.301276,123.907167],[10.301521,123.907186],[10.301958,123.907323],[10.30193,123.908327],[10.30193,123.908465],[10.301929,123.908545],[10.301926,123.908613],[10.301929,123.908545],[10.30193,123.908465],[10.30193,123.908327],[10.301958,123.907323],[10.301923,123.906568],[10.302205,123.906541],[10.302843,123.906451],[10.303436,123.906358],[10.303691,123.906318],[10.304087,123.906255],[10.304653,123.906165],[10.304893,123.906153],[10.305604,123.906118],[10.305688,123.906114],[10.305936,123.906102],[10.306169,123.906171],[10.306342,123.906163],[10.306424,123.906127],[10.306602,123.905862]],
  "SCH-002": [[10.302851,123.90972],[10.302729,123.909714],[10.302762,123.909543],[10.302875,123.909191],[10.303289,123.909338],[10.303506,123.909415],[10.30448,123.909738],[10.304841,123.909179],[10.305305,123.909334],[10.305326,123.909276],[10.305339,123.909245],[10.305369,123.909161],[10.305339,123.909245],[10.305326,123.909276],[10.305305,123.909334],[10.304841,123.909179],[10.304746,123.909152],[10.30443,123.90905],[10.303976,123.908904],[10.303064,123.908563],[10.302481,123.908375],[10.302322,123.908348],[10.302255,123.90835],[10.301929,123.908545],[10.30193,123.908465],[10.30193,123.908327],[10.301958,123.907323],[10.301923,123.906568],[10.302205,123.906541],[10.302843,123.906451],[10.303436,123.906358],[10.303691,123.906318],[10.304087,123.906255],[10.304653,123.906165],[10.304893,123.906153],[10.304957,123.906642],[10.304893,123.906153],[10.305604,123.906118],[10.305688,123.906114],[10.305936,123.906102],[10.306169,123.906171],[10.306342,123.906163],[10.306424,123.906127],[10.306602,123.905862]],
  "SCH-003": [[10.303737,123.901816],[10.303406,123.90185],[10.303011,123.901865],[10.302611,123.901926],[10.302277,123.902027],[10.30211,123.902084],[10.302017,123.90214],[10.302414,123.902476],[10.303025,123.902914],[10.303388,123.903175],[10.30349,123.903247],[10.303881,123.903523],[10.304079,123.903668],[10.304419,123.903931],[10.304436,123.904129],[10.304482,123.904553],[10.304512,123.904869],[10.304543,123.905187],[10.304568,123.905384],[10.304616,123.905782],[10.304653,123.906165],[10.304087,123.906255],[10.303691,123.906318],[10.303436,123.906358],[10.30357,123.907165],[10.303585,123.907284],[10.303577,123.907509],[10.303496,123.907731],[10.303453,123.907797],[10.303897,123.907958],[10.303453,123.907797],[10.303496,123.907731],[10.303577,123.907509],[10.303585,123.907284],[10.30357,123.907165],[10.303436,123.906358],[10.303691,123.906318],[10.304087,123.906255],[10.304653,123.906165],[10.304893,123.906153],[10.305604,123.906118],[10.305688,123.906114],[10.305936,123.906102],[10.306169,123.906171],[10.306342,123.906163],[10.306424,123.906127],[10.306602,123.905862]]
};

export function useRoutePath({ scheduleId, enabled = true }) {
  const positions = useMemo(() => {
    if (!enabled || !scheduleId) return [];
    
    // In production/Supabase, scheduleId is a UUID.
    // We inspect the schedule's routePoints to map it to our hardcoded routes.
    const schedule = getSchedule(scheduleId);
    if (!schedule || !schedule.routePoints?.length) return [];
    
    const firstStopName = schedule.routePoints[0].name;
    if (firstStopName === "Sitio Mac Arthur") return SCHEDULE_ROUTES["SCH-001"];
    if (firstStopName === "Sitio Silangan") return SCHEDULE_ROUTES["SCH-002"];
    if (firstStopName === "Sitio Zapanta") return SCHEDULE_ROUTES["SCH-003"];
    
    return [];
  }, [enabled, scheduleId]);

  return {
    positions,
    source: "static",
    ready: true,
    heading: 0,
    rerouting: false,
    snappedOrigin: null,
  };
}

// Helper to provide the fixed route for all active trucks on the admin map.
export function useTruckRoutes(live, fleet) {
  const routes = useMemo(() => {
    const results = [];
    for (const t of fleet || []) {
      const ts = live?.trucks?.[t.id];
      const active = !!ts && (ts.phase === "enroute" || ts.phase === "onsite") && !!ts.tracking?.isActive;
      if (!active) continue;
      
      if (ts?.scheduleId) {
        const schedule = getSchedule(ts.scheduleId);
        const firstStopName = schedule?.routePoints?.[0]?.name;
        
        let positions = [];
        if (firstStopName === "Sitio Mac Arthur") positions = SCHEDULE_ROUTES["SCH-001"];
        else if (firstStopName === "Sitio Silangan") positions = SCHEDULE_ROUTES["SCH-002"];
        else if (firstStopName === "Sitio Zapanta") positions = SCHEDULE_ROUTES["SCH-003"];

        results.push({
          id: t.id,
          positions,
          source: "static",
          heading: 0,
          snappedOrigin: null,
        });
      }
    }
    return results;
  }, [live, fleet]);

  return routes;
}

// Snap a raw GPS point to the nearest point on the road polyline
// (Stubbed out since we no longer snap to a dynamic route)
export function snapToRoute(origin, positions, maxDistM = 100) {
  return null;
}
