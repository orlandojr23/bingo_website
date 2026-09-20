"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  Play,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  X,
  Map as MapIcon,
  ClipboardList,
  History,
  ChevronLeft,
  ChevronRight,
  LocateFixed,
  Truck,
  User,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { mockPilotData } from "@/lib/mock-data";
import {
  useLiveRoute,
  startRoute,
  stopByAtPoint,
  continueRoute,
  completeRoute,
  endRoute,
  updateTracking,
  getSchedule,
  getSchedules,
  scheduleLabel,
  acceptAssignment,
  removeSchedule,
  reinitSupabaseSync,
  dutyStatusOf,
} from "@/lib/live-route";
import { cn, haptic } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useRoutePath } from "@/lib/use-route-path";
import { useFleet } from "@/lib/fleet";
import { getDriverSession, clearDriverSession } from "@/lib/driver-session";
import { changeDriverPassword } from "@/lib/driver-accounts";
import { MapSkeleton, DriverShellSkeleton } from "@/components/ui/skeletons";
import PasswordStrengthHint from "@/components/ui/password-strength-hint";
import { useToast } from "@/components/pwa/Toast";
import { supabase } from "@/lib/supabase";

// Minimalist High-DPI Leaflet MapCanvas
const MapCanvas = dynamic(() => import("@/components/map/map-canvas"), {
  ssr: false,
  loading: () => <MapSkeleton />,
});

const TAB_IDS = ["map", "route", "assignment", "history", "profile"];

function assignedAreaTagline(schedule, zone) {
  if (!schedule) return null;
  const names = (schedule.routePoints || []).map((p) => p.name).filter(Boolean);
  if (!names.length) {
    return zone ? zone.name.split("&")[0].trim() : scheduleLabel(schedule);
  }
  if (names.length === 1) return names[0];
  return `${names[0]} +${names.length - 1} stops`;
}

export default function DriverPage() {
  const [selectedTruckId, setSelectedTruckId] = useState("");
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const [wakeLockSupported, setWakeLockSupported] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [batteryLevel, setBatteryLevel] = useState(null);
  const [isCharging, setIsCharging] = useState(false);
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window === "undefined") return "map";
    const param = new URLSearchParams(window.location.search).get("tab");
    if (TAB_IDS.includes(param)) return param;
    const saved = window.localStorage.getItem("driver-active-tab");
    return TAB_IDS.includes(saved) ? saved : "map";
  }); // "map" | "route" | "assignment" | "history" | "profile"
  const [mapCenter, setMapCenter] = useState([10.3025, 123.9095]);
  const [mapZoom, setMapZoom] = useState(16);
  const [truckFocused, setTruckFocused] = useState(false);
  const [mapBounds, setMapBounds] = useState(null);
  const [mapReady, setMapReady] = useState(false);
  const [flySignal, setFlySignal] = useState(0);

  const handleMapReady = useCallback(() => setMapReady(true), []);
  const handleMapBoundsChange = useCallback((b) => setMapBounds(b), []);
  const isPointInView = useCallback(
    (lat, lng) =>
      !!mapBounds &&
      lat <= mapBounds.north &&
      lat >= mapBounds.south &&
      lng <= mapBounds.east &&
      lng >= mapBounds.west,
    [mapBounds]
  );

  // Sign Out Modal
  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  // Change Password (profile sub-screen)
  const [profileView, setProfileView] = useState("main"); // "main" | "password"
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [pwErrors, setPwErrors] = useState({});
  const [pwSaving, setPwSaving] = useState(false);

  const router = useRouter();
  const [sessionReady, setSessionReady] = useState(false);
  const [driverSession, setDriverSession] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace("/driver-login");
        return;
      }

      supabase.from('profiles').select('role, full_name, id').eq('id', session.user.id).single().then(({ data: profile }) => {
        const role = profile?.role || session.user.user_metadata?.role;
        if (role !== 'driver') {
          router.replace("/driver-login");
          return;
        }

        const driverFullName = profile?.full_name || session.user.user_metadata?.full_name || "";
        setDriverSession({ email: session.user.email, name: driverFullName || "Driver", id: session.user.id });

        // Bug 1 fix: resolve the truck assigned to this driver by name from the trucks table
        supabase.from('trucks').select('id').eq('driver_name', driverFullName).maybeSingle().then(({ data: truck }) => {
          if (truck?.id) {
            setSelectedTruckId(truck.id);
          }
          reinitSupabaseSync().then(() => {
            setSessionReady(true);
          });
        });
      });
    });
  }, [router]);

  // Live Telemetry State
  const [coords, setCoords] = useState({
    lat: 10.3025,
    lng: 123.9095,
    speed: 0,
    heading: 90,
    accuracy: 8,
  });
  const lastBroadcastTime = useRef(null);
  const broadcastCount = useRef(0);
  const [broadcastStatus, setBroadcastStatus] = useState("Standby");

  const watchIdRef = useRef(null);
  const wakeLockRef = useRef(null);
  const lastPushRef = useRef(0);
  const { toast, ToastViewport } = useToast();

  const handlePwFieldChange = (field, value, setter) => {
    setter(value);
    if (pwErrors[field]) {
      setPwErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  // Bug 5 fix: password change uses Supabase Auth (supabase.auth.updateUser) instead of localStorage.
  // Current password is verified by re-authenticating before updating.
  const handleChangePassword = async () => {
    const newErrors = {};
    if (!currentPassword) {
      newErrors.current = "Please enter your current password.";
    }
    if (!newPassword) {
      newErrors.newPassword = "Please enter a new password.";
    } else if (newPassword.length < 6) {
      newErrors.newPassword = "Password must be at least 6 characters.";
    } else if (currentPassword && newPassword === currentPassword) {
      newErrors.newPassword = "New password must be different from your current password.";
    }
    if (!confirmNewPassword) {
      newErrors.confirm = "Please re-enter your new password.";
    } else if (newPassword && confirmNewPassword !== newPassword) {
      newErrors.confirm = "Passwords do not match.";
    }

    if (Object.keys(newErrors).length > 0) {
      setPwErrors(newErrors);
      return;
    }
    setPwErrors({});
    setPwSaving(true);

    try {
      // Verify current password by re-signing in
      const { error: verifyErr } = await supabase.auth.signInWithPassword({
        email: driverSession?.email || "",
        password: currentPassword,
      });
      if (verifyErr) {
        setPwErrors({ current: "Your current password is incorrect." });
        setPwSaving(false);
        return;
      }

      // Update password in Supabase Auth
      const { error: updateErr } = await supabase.auth.updateUser({ password: newPassword });
      if (updateErr) {
        setPwErrors({ newPassword: updateErr.message });
        setPwSaving(false);
        return;
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      setShowCurrent(false);
      setShowNew(false);
      setShowConfirm(false);
      toast("Password changed successfully.");
      haptic();
      setProfileView("main");
    } catch (err) {
      setPwErrors({ current: "Something went wrong. Please try again." });
    } finally {
      setPwSaving(false);
    }
  };

  const live = useLiveRoute();
  const fleet = useFleet();
  const truckState = live.trucks[selectedTruckId];
  const isOnDuty =
    !!truckState &&
    (truckState.phase === "enroute" || truckState.phase === "onsite") &&
    truckState.tracking.isActive;
  // Three-state duty indicator: On Duty (broadcasting) / Paused (mid-route,
  // GPS stopped — resumable) / Off Duty (idle or completed).
  const dutyStatus = dutyStatusOf(truckState);

  const currentTruck =
    fleet.find((t) => t.id === selectedTruckId) || fleet[0] || { id: "—", plate: "—", driver: "—", capacity: "—" };

  const liveDriver = live.driverByTruck[selectedTruckId] ?? currentTruck.driver;

  const assignedSchedule = useMemo(() => {
    if (!selectedTruckId) return null;
    const status = live.scheduleStatus;
    const effStatus = (s) => status[s.id] ?? s.status;
    // Bug 2 fix: use s.truckId (the actual DB field), not s.activeTruckId which doesn't exist
    const mine = getSchedules().filter((s) => s.truckId === selectedTruckId && !s.isArchived);
    const inProgress = mine.filter((s) => effStatus(s) === "In Progress");
    // Accepted assignments take priority over unaccepted ones so the driver
    // is always guided to the assignment they can actually start.
    const accepted = mine.filter((s) => effStatus(s) === "Accepted");
    const pending = mine.filter(
      (s) => effStatus(s) === "Scheduled" || effStatus(s) === "Assigned"
    );
    return (
      inProgress[inProgress.length - 1] ||
      accepted[accepted.length - 1] ||
      pending[pending.length - 1] ||
      null
    );
  }, [selectedTruckId, live]);

  // Effective status of the assignment shown in the UI. A route can only be
  // started after the driver accepts it (status "Accepted"); "Scheduled" /
  // "Assigned" means the admin assigned it but the driver hasn't accepted yet.
  const assignedScheduleStatus =
    (assignedSchedule && (live.scheduleStatus[assignedSchedule.id] ?? assignedSchedule.status)) || null;
  const isAssignmentAccepted =
    assignedScheduleStatus === "Accepted" || assignedScheduleStatus === "In Progress";
  const needsAcceptance = !!assignedSchedule && !isOnDuty && !isAssignmentAccepted;

  const hasAvailableAssignment =
    isOnDuty ||
    (!!truckState &&
      (truckState.phase === "enroute" || truckState.phase === "onsite")) ||
    !!assignedSchedule;

  // How many routes are still queued for this truck — drives the banner's
  // "N new assignments" headline so it stays truthful with multiple queued.
  const pendingAssignments = useMemo(() => {
    if (!selectedTruckId) return 0;
    const status = live.scheduleStatus;
    return getSchedules().filter(
      (s) =>
        s.truckId === selectedTruckId &&
        (status[s.id] === "In Progress" || status[s.id] === "Scheduled" || status[s.id] === "Assigned" || status[s.id] === "Accepted")
    ).length;
  }, [selectedTruckId, live]);

  const assignedZone = assignedSchedule
    ? mockPilotData.zones.find((z) => z.id === assignedSchedule.zoneId)
    : null;
  const assignedAreaName = assignedAreaTagline(assignedSchedule, assignedZone);

  const activeSchedule = truckState?.scheduleId
    ? getSchedule(truckState.scheduleId)
    : null;
  const routePoints = activeSchedule?.routePoints ?? [];
  const currentPoint = routePoints[truckState?.stopIndex ?? 0];
  const isLastPoint = truckState
    ? truckState.stopIndex >= routePoints.length - 1
    : false;

  const routeScheduleId = activeSchedule?.id ?? assignedSchedule?.id ?? null;
  const routeStops = activeSchedule
    ? routePoints.slice(truckState?.stopIndex ?? 0, (truckState?.stopIndex ?? 0) + 1)
    : (assignedSchedule?.routePoints?.slice(0, 1) ?? []);
  const driverRoute = useRoutePath({
    scheduleId: routeScheduleId,
    stopIndex: truckState?.stopIndex ?? 0,
    origin:
      isOnDuty && truckState?.phase !== "completed"
        ? { lat: truckState.tracking.lat, lng: truckState.tracking.lng }
        : null,
    points: truckState?.phase === "completed" ? [] : routeStops,
    autoReroute: true,
    // The drawn leg starts at the map-matched road point; the marker below
    // uses driverRoute.snappedOrigin so line and marker share one source.
    pinToRoad: true,
  });

  const driverRouteRef = useRef(driverRoute);
  useEffect(() => { driverRouteRef.current = driverRoute; }, [driverRoute]);

  // Single "current stop" pin: shown only once the driver has started the
  // route (an active schedule exists); hidden once the route is completed.
  const driverStopPoint =
    !activeSchedule || truckState?.phase === "completed" ? null : currentPoint;
  const driverCurrentStop = driverStopPoint
    ? { ...driverStopPoint, index: truckState?.stopIndex ?? 0 }
    : null;

  // Compact numbered pins for every stop after the current one — likewise gated
  // on the route having started, so the map stays pin-free until Start Route.
  const dStopIdx = truckState?.stopIndex ?? 0;
  const driverUpcomingStops =
    !activeSchedule || truckState?.phase === "completed"
      ? []
      : routePoints.slice(dStopIdx + 1).map((p, i) => ({ ...p, index: dStopIdx + 1 + i }));

  // Road-accurate path for the legs AFTER the current stop. The origin is the fixed
  // current-stop vertex (not the moving truck), so this is fetched once per stop
  // advance instead of every sim tick; stopIndex+1 keeps its cache key distinct from
  // the sim's current-leg key.
  const driverOnDuty = isOnDuty && truckState?.phase !== "completed" && !!activeSchedule;
  const driverFuturePath = useRoutePath({
    scheduleId: routeScheduleId,
    stopIndex: dStopIdx + 1,
    origin:
      driverOnDuty && routePoints[dStopIdx]
        ? { lat: routePoints[dStopIdx].lat, lng: routePoints[dStopIdx].lng }
        : null,
    points: driverOnDuty ? routePoints.slice(dStopIdx + 1) : [],
    enabled: driverOnDuty,
  });

  const driverName = (driverSession?.name || "Driver").split(" ")[0];
  const greetingTitle = useMemo(() => {
    return `Hi, ${driverName}!`;
  }, [driverName]);

  const currentBanner = useMemo(() => {
    const zoneName = assignedAreaName;
    const startTime = String(assignedSchedule?.time || "")
      .split("-")[0]
      .trim();

    const isPaused =
      !!truckState &&
      (truckState.phase === "enroute" || truckState.phase === "onsite") &&
      !truckState.tracking.isActive;

    if (truckState?.phase === "completed") {
      return {
        id: "status",
        live: true,
        title: "Route completed",
        subtitle: zoneName ? `Next up: ${zoneName}` : "No more routes today",
      };
    }
    if (isOnDuty && truckState?.phase === "onsite") {
      return {
        id: "status",
        live: true,
        title: `Collecting at ${currentPoint?.name ?? "stop"}`,
        subtitle: `Stop ${(truckState?.stopIndex ?? 0) + 1} of ${routePoints.length}`,
      };
    }
    if (isOnDuty) {
      return {
        id: "status",
        live: true,
        title: `En route to ${currentPoint?.name ?? "next stop"}`,
        subtitle: `Stop ${(truckState?.stopIndex ?? 0) + 1} of ${routePoints.length}${startTime ? ` • ${startTime}` : ""}`,
      };
    }
    if (isPaused) {
      return {
        id: "status",
        title: "Route paused",
        subtitle: "Start Route to resume",
      };
    }
    if (assignedSchedule) {
      return {
        id: "status",
        title: `${pendingAssignments} new assignment${pendingAssignments === 1 ? "" : "s"}`,
        subtitle: `${zoneName ?? "New route"}${startTime ? ` • ${startTime}` : ""}`,
      };
    }

    return {
      id: "greeting",
      title: greetingTitle,
      subtitle: `${new Date().toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      })}`,
    };
  }, [greetingTitle, assignedAreaName, assignedSchedule, truckState, isOnDuty, currentPoint, routePoints.length, pendingAssignments]);

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("tab");
    if (TAB_IDS.includes(t)) setActiveTab(t);
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem("driver-active-tab", activeTab);
    } catch {}
  }, [activeTab]);

  const switchTab = (id) => {
    haptic();
    setActiveTab(id);
    window.history.replaceState(null, "", `?tab=${id}`);
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      setWakeLockSupported("wakeLock" in navigator);
      setIsOnline(navigator.onLine);

      const handleOnline = () => setIsOnline(true);
      const handleOffline = () => setIsOnline(false);

      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);

      if ("getBattery" in navigator) {
        navigator.getBattery().then((battery) => {
          setBatteryLevel(Math.round(battery.level * 100));
          setIsCharging(battery.charging);

          battery.addEventListener("levelchange", () => {
            setBatteryLevel(Math.round(battery.level * 100));
          });
          battery.addEventListener("chargingchange", () => {
            setIsCharging(battery.charging);
          });
        }).catch(() => {});
      }

      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      };
    }
  }, []);

  const requestWakeLock = async () => {
    if ("wakeLock" in navigator) {
      try {
        const lock = await navigator.wakeLock.request("screen");
        wakeLockRef.current = lock;
        setWakeLockActive(true);

        lock.addEventListener("release", () => {
          setWakeLockActive(false);
          wakeLockRef.current = null;
        });
      } catch (err) {
        console.warn("[Driver PWA] Screen Wake Lock error:", err);
      }
    }
  };

  const releaseWakeLock = async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
      } catch {}
      wakeLockRef.current = null;
      setWakeLockActive(false);
    }
  };

  const selectedTruckIdRef = useRef(selectedTruckId);
  useEffect(() => {
    selectedTruckIdRef.current = selectedTruckId;
  }, [selectedTruckId]);

  const truckFocusedRef = useRef(truckFocused);
  useEffect(() => {
    truckFocusedRef.current = truckFocused;
  }, [truckFocused]);

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
        lastAcceptedGpsRef.current = null;
      }
      releaseWakeLock();
    };
  }, []);

  const lastAcceptedGpsRef = useRef(null);

  const startGpsWatch = () => {
    if (watchIdRef.current !== null) return;
    
    // Automatic GPS Simulator removed at user request. The app will now 
    // strictly use real GPS movement like Uber/Waze.

    if (!("geolocation" in navigator)) return;
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, speed, heading, accuracy } = pos.coords;
        let finalHeading = (heading !== null && !isNaN(heading)) ? heading : null;
        
        const s = speed ? speed : 0;
        const prev = lastAcceptedGpsRef.current;
        
        if (prev) {
          const dx = (longitude - prev.lng) * 111320 * Math.cos((prev.lat * Math.PI) / 180);
          const dy = (latitude - prev.lat) * 111320;
          const distM = Math.hypot(dx, dy);
          
          // Waze-style stationary noise filter: if moving very slowly (speed <= 1 m/s)
          // and the GPS fix only jumped by < 10 meters, it's just satellite wobble while
          // parked. Ignore it so the truck marker doesn't slide back and forth.
          if (s <= 1 && distM < 10) {
            return; 
          }
          if (finalHeading === null) finalHeading = prev.heading;
        }

        if (finalHeading === null) finalHeading = 90;
        lastAcceptedGpsRef.current = { lat: latitude, lng: longitude, heading: finalHeading };

        setCoords({
          lat: latitude,
          lng: longitude,
          speed: s ? Math.round(s * 3.6) : 0,
          heading: finalHeading,
          accuracy: Math.round(accuracy),
        });

        if (truckFocusedRef.current) {
          setMapCenter([latitude, longitude]);
        }
        lastBroadcastTime.current =
          new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          });
        broadcastCount.current += 1;
        setBroadcastStatus("Broadcasting live");

        const now = Date.now();
        if (now - lastPushRef.current >= 2000) {
          lastPushRef.current = now;
          updateTracking(selectedTruckIdRef.current, {
            lat: latitude,
            lng: longitude,
            // Device GPS reports a compass bearing (0 = North). The app's
            // heading convention is compass + 90 (see headingAlong in
            // use-route-path.js), which is what the map marker and
            // course-up camera expect.
            heading: (Math.round(finalHeading) + 90) % 360,
            lastGpsAt: now,
          });
        }
      },
      (err) => {
        setBroadcastStatus(`GPS Warning: ${err.message}`);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
    watchIdRef.current = { type: 'real', id };
  };

  const stopGpsWatch = async () => {
    if (watchIdRef.current !== null) {
      if (watchIdRef.current.type === 'sim') {
        clearInterval(watchIdRef.current.id);
      } else {
        navigator.geolocation.clearWatch(watchIdRef.current.id);
      }
      watchIdRef.current = null;
    }
    await releaseWakeLock();
    setBroadcastStatus("Standby");
  };

  const handlePrimaryAction = async () => {
    haptic(15);

    if (!isOnDuty) {
      const wasPaused =
        !!truckState &&
        (truckState.phase === "enroute" || truckState.phase === "onsite") &&
        !truckState.tracking.isActive;

      if (!wasPaused && !assignedSchedule) {
        toast("No route assignments available.", { variant: "error" });
        return;
      }

      // Gate: the driver must accept the admin's assignment before starting.
      // Resuming a paused route is allowed without re-accepting.
      if (!wasPaused && !isAssignmentAccepted) {
        toast("Please accept your assignment in Tasks before starting the route.", { variant: "warning" });
        switchTab("assignment");
        return;
      }

      // Bug 4 fix: await startRoute so GPS and wake lock don't activate before route is recorded
      const scheduleId = await startRoute(selectedTruckId, coords);
      if (!scheduleId) {
        if (needsAcceptance) {
          toast("Please accept your assignment in Tasks before starting the route.", { variant: "warning" });
          switchTab("assignment");
        } else {
          toast("No route assignments available.", { variant: "error" });
        }
        return;
      }
      setBroadcastStatus("Broadcasting live");
      await requestWakeLock();
      startGpsWatch();

      // Waze Navigation Camera Mode: Focus truck, set zoom 18 & fly camera
      setTruckFocused(true);
      const tracking = live.trucks[selectedTruckId]?.tracking;
      if (tracking?.lat != null && tracking?.lng != null) {
        setMapCenter([tracking.lat, tracking.lng]);
      } else if (coords?.lat != null && coords?.lng != null) {
        setMapCenter([coords.lat, coords.lng]);
      } else {
        setMapCenter([10.3025, 123.9095]);
      }
      setMapZoom(18);
      setFlySignal((s) => s + 1);

      toast(wasPaused ? "Route resumed." : "Route started.");
      return;
    }

    if (truckState.phase === "enroute") {
      stopByAtPoint(selectedTruckId);
      toast(`Arrived at ${currentPoint?.name ?? "stop"} — admin notified.`);
      return;
    }

    if (!isLastPoint) {
      continueRoute(selectedTruckId);
      const next = routePoints[truckState.stopIndex + 1];

      // Maintain Waze Navigation Camera Focus on next leg
      setTruckFocused(true);
      const tracking = truckState?.tracking;
      if (tracking?.lat != null && tracking?.lng != null) {
        setMapCenter([tracking.lat, tracking.lng]);
      }
      setMapZoom(18);
      setFlySignal((s) => s + 1);

      toast(`En route to ${next?.name ?? "next stop"}.`);
      return;
    }

    const done = await completeRoute(selectedTruckId);
    if (!done) {
      toast("Pass by every stop before completing the route.", { variant: "warning" });
      return;
    }
    await stopGpsWatch();
    const next = getSchedules().find(
      (s) =>
        s.truckId === selectedTruckId &&
        ((live.scheduleStatus[s.id] ?? s.status) === "Scheduled" || (live.scheduleStatus[s.id] ?? s.status) === "Assigned" || (live.scheduleStatus[s.id] ?? s.status) === "Accepted")
    );
    toast(
      next
        ? `Route completed. New assignment: ${scheduleLabel(next)}.`
        : "Route completed. No further assignments."
    );
  };

  const handleEndRoute = async () => {
    haptic(15);
    endRoute(selectedTruckId);
    await stopGpsWatch();
    toast("Route ended.");
  };

  // The truck-anchored leg (truck position → current stop) is drawn as the 
  // active green line so the driver sees their immediate destination (Waze-style).
  // Future legs between stops are drawn as dashed lines.
  const mapRoutes = useMemo(() => [
    driverRoute.positions.length >= 2 && { id: `${routeScheduleId ?? "driver-route"}-current-${dStopIdx}`, ...driverRoute },
    driverFuturePath.positions.length >= 2 && { id: `${routeScheduleId ?? "driver-route"}-future-${dStopIdx}`, ...driverFuturePath },
    // eslint-disable-next-line react-hooks/exhaustive-deps
  ].filter(Boolean), [
    routeScheduleId, dStopIdx,
    driverRoute.positions, driverRoute.heading, driverRoute.source, driverRoute.ready,
    driverFuturePath.positions, driverFuturePath.heading, driverFuturePath.source, driverFuturePath.ready,
  ]);

  // Marker rides at the same map-matched road point the trajectory starts at
  // (driverRoute.snappedOrigin) — line and marker can never separate, even
  // when the raw phone fix sits inside a house. Null = draw raw GPS.
  const snappedTruck = driverRoute.snappedOrigin;

  // Waze-style heading: snap to the road direction to keep the truck perfectly 
  // aligned with the route, BUT if the driver deviates and points more than 90° away 
  // from the route (e.g. going the wrong way, making a U-turn), prioritize the actual 
  // device heading so the truck icon and map camera spin around immediately.
  const bestHeading = useMemo(() => {
    if (!truckState) return 0;
    const deviceHeading = truckState.tracking.heading;
    if (snappedTruck && driverRoute.heading != null) {
      const diff = Math.abs(((driverRoute.heading - deviceHeading + 540) % 360) - 180);
      if (diff <= 90) return driverRoute.heading;
    }
    return deviceHeading;
  }, [truckState, snappedTruck, driverRoute.heading]);

  const trucksForMap = useMemo(() => {
    if (!currentTruck || !truckState) return [];
    const s = snappedTruck;
    return [
      {
        id: currentTruck.id,
        plate: currentTruck.plate,
        driver: liveDriver,
        capacity: currentTruck.capacity,
        lat: s ? s.lat : truckState.tracking.lat,
        lng: s ? s.lng : truckState.tracking.lng,
        heading: bestHeading,
        eta: isOnDuty ? "Active On Route" : "Standby",
        isActive: truckState.tracking.isActive,
        phase: truckState.phase,
      },
    ];
  }, [currentTruck, truckState, isOnDuty, liveDriver, snappedTruck, bestHeading]);

  // Waze-style course-up camera while driving: heading up, auto-follow truck.
  const navBearing = isOnDuty ? Math.round(bestHeading ?? 0) : null;

  useEffect(() => {
    if (isOnDuty) {
      setTruckFocused(true);
      setMapZoom(17);
      if (watchIdRef.current === null && typeof window !== "undefined") {
        setBroadcastStatus("Broadcasting live");
        requestWakeLock();
        startGpsWatch();
      }
      const s = snappedTruck;
      if (s) {
        setMapCenter([s.lat, s.lng]);
      } else if (truckState?.tracking?.lat != null && truckState?.tracking?.lng != null) {
        setMapCenter([truckState.tracking.lat, truckState.tracking.lng]);
      }
    } else {
      stopGpsWatch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnDuty, snappedTruck]);

  const trackLat = truckState?.tracking.lat;
  const trackLng = truckState?.tracking.lng;
  useEffect(() => {
    if (isOnDuty && truckFocused) {
      if (snappedTruck) {
        setMapCenter([snappedTruck.lat, snappedTruck.lng]);
      } else if (trackLat != null && trackLng != null) {
        setMapCenter([trackLat, trackLng]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackLat, trackLng, snappedTruck]);

  if (!sessionReady) {
    return <DriverShellSkeleton />;
  }

  return (
    <div className="flex h-dvh w-full flex-col bg-background text-foreground font-sans selection:bg-emerald-100 selection:text-emerald-900 overflow-hidden select-none">

      {/* Main 1-Screen Body: Full-Screen Map Canvas as Permanent Backdrop */}
      <div className="relative flex-1 w-full overflow-hidden select-none">
        {/* Permanent Background Map Canvas */}
        <div className="absolute inset-0 h-full w-full z-0">
          <MapCanvas
            tickets={[]}
            trucks={trucksForMap}
            routes={mapRoutes}
            mapMode="pins"
            currentStop={driverCurrentStop}
            upcomingStops={driverUpcomingStops}
            center={mapCenter}
            zoom={mapZoom}
            onMapReady={handleMapReady}
            onMapDrag={() => {
              if (truckFocused) {
                setTruckFocused(false);
              }
            }}
            onBoundsChange={handleMapBoundsChange}
            flySignal={flySignal}
            rotatable
            bearing={navBearing}
            perspective3D={isOnDuty && truckFocused}
            hidePausedTrucks
          />
        </div>

        {/* Native status banner */}
        <div className="pointer-events-auto absolute top-0 inset-x-0 z-20 w-full border-b border-border/60 bg-background/80 backdrop-blur-md flex items-center select-none overflow-hidden px-4 pt-[calc(env(safe-area-inset-top)+12px)] pb-3">
          {/* Left: Live status readout */}
          <div className="min-w-0 flex-1 overflow-hidden relative flex items-center">
            {!mapReady ? (
              <div className="flex items-center gap-3 w-full">
                <div className="h-2.5 w-2/5 rounded-full bg-foreground/10 animate-pulse" />
              </div>
            ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={`${currentBanner.id}-${currentBanner.title}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="flex items-center gap-2.5 min-w-0 w-full"
              >
                {currentBanner.live && (
                  <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-600" />
                )}

                <div className="min-w-0 flex-1">
                  <h3 className="text-[17px] font-semibold tracking-tight text-foreground leading-tight truncate">
                    {currentBanner.title}
                  </h3>
                  {currentBanner.subtitle && (
                    <p className="text-[13px] text-muted-foreground leading-tight mt-0.5 truncate">
                      {currentBanner.subtitle}
                    </p>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
            )}
          </div>
        </div>

        {/* Floating native map action buttons, just above bottom nav */}
        {/* 1. Bottom-Left: Focus Compactor Unit (native style, just above bottom nav) */}
        <div className="pointer-events-none absolute bottom-[calc(5.5rem+env(safe-area-inset-bottom))] left-3 z-20">
          <AnimatePresence>
            {(() => {
              const tracking = truckState?.tracking;
              const focusLat = tracking?.lat != null ? tracking.lat : coords?.lat != null ? coords.lat : 10.3025;
              const focusLng = tracking?.lng != null ? tracking.lng : coords?.lng != null ? coords.lng : 123.9095;
              return isOnDuty && !isPointInView(focusLat, focusLng) && (
                <motion.button
                  key="focus-compactor-unit"
                  type="button"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  onClick={() => {
                    setTruckFocused(true);
                    if (tracking?.lat != null && tracking?.lng != null) {
                      setMapCenter([tracking.lat, tracking.lng]);
                    } else if (coords?.lat != null && coords?.lng != null) {
                      setMapCenter([coords.lat, coords.lng]);
                    } else {
                      setMapCenter([10.3025, 123.9095]);
                    }
                    setMapZoom(17);
                    setFlySignal((s) => s + 1);
                    haptic();
                  }}
                  className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full border border-black/10 bg-white text-zinc-800 shadow-md active:scale-95 transition-transform cursor-pointer"
                  title="Focus Compactor Unit"
                  aria-label="Focus Compactor Unit"
                >
                  <Truck className="h-[22px] w-[22px]" strokeWidth={2} />
                </motion.button>
              );
            })()}
          </AnimatePresence>
        </div>

        {/* 2. Bottom-Right: Center GPS Location (native style, just above bottom nav) */}
        <div className="pointer-events-none absolute bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-3 z-20">
          <AnimatePresence>
            {coords?.lat != null && !isPointInView(coords.lat, coords.lng) && (
              <motion.button
                key="center-driver-location"
                type="button"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                onClick={() => {
                  setTruckFocused(false);
                  if (coords?.lat != null && coords?.lng != null) {
                    setMapCenter([coords.lat, coords.lng]);
                  } else {
                    // No GPS fix: fall back to the pilot area (Brgy. Tejero Hall).
                    setMapCenter([10.3025, 123.9095]);
                    toast("GPS unavailable — showing Brgy. Tejero Hall.");
                  }
                  setMapZoom(17);
                  setFlySignal((s) => s + 1);
                  haptic();
                }}
                className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full border border-black/10 bg-white text-zinc-800 shadow-md active:scale-95 transition-transform cursor-pointer"
                title="Center Driver Location"
                aria-label="Center Driver Location"
              >
                <LocateFixed className="h-[22px] w-[22px]" strokeWidth={2} />
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* Bottom Navigation Bar - native tab bar, only visible on map */}
        {activeTab === "map" && (
        <div className="fixed bottom-0 inset-x-0 z-[100] border-t border-black/10 bg-background/85 backdrop-blur-xl shadow-[0_-4px_16px_rgba(0,0,0,0.06)] pb-[env(safe-area-inset-bottom)]">
          <div className="grid grid-cols-5 h-[64px] max-w-md mx-auto px-2">
            {/* 1. Map */}
            <button
              type="button"
              onClick={() => { switchTab("map"); }}
              className={`flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer ${activeTab === "map" ? "text-emerald-600" : "text-zinc-400"}`}
            >
              <MapIcon className="h-6 w-6" strokeWidth={activeTab === "map" ? 2.25 : 1.75} />
              <span className={`text-[10px] leading-none ${activeTab === "map" ? "font-semibold" : "font-medium"}`}>Map</span>
            </button>

            {/* 2. Route */}
            <button
              type="button"
              onClick={() => { switchTab("route"); }}
              className={`flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer ${activeTab === "route" ? "text-emerald-600" : "text-zinc-400"}`}
            >
              <Play className="h-6 w-6" strokeWidth={activeTab === "route" ? 2.25 : 1.75} />
              <span className={`text-[10px] leading-none ${activeTab === "route" ? "font-semibold" : "font-medium"}`}>Route</span>
            </button>

            {/* 3. Assignment */}
            <button
              type="button"
              onClick={() => { switchTab("assignment"); }}
              className={`flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer ${activeTab === "assignment" ? "text-emerald-600" : "text-zinc-400"}`}
            >
              <ClipboardList className="h-6 w-6" strokeWidth={activeTab === "assignment" ? 2.25 : 1.75} />
              <span className={`text-[10px] leading-none ${activeTab === "assignment" ? "font-semibold" : "font-medium"}`}>Tasks</span>
            </button>

            {/* 4. History */}
            <button
              type="button"
              onClick={() => { switchTab("history"); }}
              className={`flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer ${activeTab === "history" ? "text-emerald-600" : "text-zinc-400"}`}
            >
              <History className="h-6 w-6" strokeWidth={activeTab === "history" ? 2.25 : 1.75} />
              <span className={`text-[10px] leading-none ${activeTab === "history" ? "font-semibold" : "font-medium"}`}>History</span>
            </button>

            {/* 5. Profile */}
            <button
              type="button"
              onClick={() => { setProfileView("main"); switchTab("profile"); }}
              className={`flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer ${activeTab === "profile" ? "text-emerald-600" : "text-zinc-400"}`}
            >
              <User className="h-6 w-6" strokeWidth={activeTab === "profile" ? 2.25 : 1.75} />
              <span className={`text-[10px] leading-none ${activeTab === "profile" ? "font-semibold" : "font-medium"}`}>Profile</span>
            </button>
          </div>
        </div>
        )}

        {/* FULL SCREEN VIEWS - native app style fade transition */}
        <AnimatePresence mode="wait" initial={false}>
          {activeTab === "route" && (
            <motion.div
              key="fs-route"
              initial={{ opacity: 0, scale: 0.98, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 8 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="fixed inset-0 z-[90] flex flex-col bg-background"
            >
              <div className="shrink-0 border-b border-border/60 bg-background/80 backdrop-blur-md pt-[calc(env(safe-area-inset-top)+12px)] pb-3">
                <div className="relative flex h-[52px] items-center justify-center px-2">
                  <button
                    type="button"
                    onClick={() => { switchTab("map"); }}
                    className="absolute left-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-foreground transition-all hover:bg-muted active:scale-95 active:bg-muted cursor-pointer"
                    aria-label="Back to map"
                  >
                    <ChevronLeft className="h-6 w-6" strokeWidth={2} />
                  </button>
                  <h1 className="text-[17px] font-semibold tracking-tight text-foreground">Route</h1>
                </div>
              </div>
              <div className="flex flex-1 flex-col overflow-y-auto bg-muted/40 pb-10">
                <div className="flex flex-1 flex-col space-y-2.5 p-4">

                    {/* Tab 1: Route & Telemetry Controls */}
                    {activeTab === "route" && (
                      <div className="space-y-2.5">
                        {/* Main Route Workflow Control */}
                        <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-2.5">
                          <div className="space-y-2.5">
                              <button
                                type="button"
                                onClick={handlePrimaryAction}
                                disabled={!isOnDuty && !hasAvailableAssignment}
                                className={cn(
                                  "flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-[15px] font-semibold transition-all active:scale-[0.99]",
                                  !isOnDuty && !hasAvailableAssignment
                                    ? "bg-zinc-200 text-zinc-400 cursor-not-allowed dark:bg-zinc-800 dark:text-zinc-500 opacity-80"
                                    : isOnDuty && truckState?.phase === "enroute"
                                      ? "bg-amber-600 text-white active:bg-amber-700 cursor-pointer"
                                      : "bg-emerald-600 text-white active:bg-emerald-700 cursor-pointer"
                                )}
                              >
                                {!isOnDuty ? (
                                  !hasAvailableAssignment ? (
                                    <>
                                      <Play className="h-4 w-4 fill-zinc-400 dark:fill-zinc-500" /> No Assignment Available
                                    </>
                                  ) : needsAcceptance ? (
                                    <>
                                      <Play className="h-4 w-4 fill-white" /> Accept Assignment to Start
                                    </>
                                  ) : (
                                    <>
                                      <Play className="h-4 w-4 fill-white" /> Start Route
                                    </>
                                  )
                                ) : truckState.phase === "enroute" ? (
                                  <>
                                    Stop By: {currentPoint?.name ?? "Stop"}
                                  </>
                                ) : !isLastPoint ? (
                                  <>
                                    Continue Route
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle2 className="h-4 w-4" /> Complete Route
                                  </>
                                )}
                              </button>

                            {needsAcceptance && (
                              <p className="text-center text-[13px] leading-normal text-muted-foreground">
                                Accept your assignment in{" "}
                                <button
                                  type="button"
                                  onClick={() => switchTab("assignment")}
                                  className="font-semibold text-emerald-600 underline underline-offset-2 cursor-pointer"
                                >
                                  Tasks
                                </button>{" "}
                                before starting the route.
                              </p>
                            )}

                            {isOnDuty && (
                              <button
                                type="button"
                                onClick={handleEndRoute}
                                className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-rose-600 text-[15px] font-semibold text-white transition-all active:bg-rose-700 active:scale-[0.99] cursor-pointer"
                              >
                                <X className="h-5 w-5" strokeWidth={2} />
                                End Route
                              </button>
                            )}

                            <div className="divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/60 bg-card">
                              <div className="flex min-h-[48px] items-center justify-between gap-3 px-4 py-2.5">
                                <span className="shrink-0 text-[15px] text-muted-foreground">Active Route</span>
                                <span className="truncate text-right text-[15px] text-foreground">{activeSchedule ? scheduleLabel(activeSchedule) : "No Active Route"}</span>
                              </div>
                              <div className="flex min-h-[48px] items-center justify-between gap-3 px-4 py-2.5">
                                <span className="shrink-0 text-[15px] text-muted-foreground">Next Stop</span>
                                <span className="truncate text-right text-[15px] text-foreground">
                                  {truckState?.phase === "completed"
                                    ? "Route Completed"
                                    : truckState?.onsite
                                      ? `At ${currentPoint?.name ?? "stop"}`
                                      : currentPoint
                                        ? `${currentPoint.name} • ${currentPoint.time}`
                                        : "Standby"}
                                </span>
                              </div>
                              <div className="flex min-h-[48px] items-center justify-between gap-3 px-4 py-2.5">
                                <span className="shrink-0 text-[15px] text-muted-foreground">Stops Served</span>
                                <span className="text-right text-[15px] tabular-nums text-foreground">
                                  {routePoints.length
                                    ? `${
                                        truckState?.phase === "completed"
                                          ? routePoints.length
                                          : truckState?.onsite
                                            ? truckState.stopIndex + 1
                                            : truckState?.stopIndex ?? 0
                                      } of ${routePoints.length}`
                                    : "—"}
                                </span>
          </div>
        </div>



                          </div>
                        </div>
                      </div>
                    )}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "assignment" && (
            <motion.div
              key="fs-assignment"
              initial={{ opacity: 0, scale: 0.98, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 8 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="fixed inset-0 z-[90] flex flex-col bg-background"
            >
              <div className="shrink-0 border-b border-border/60 bg-background/80 backdrop-blur-md pt-[calc(env(safe-area-inset-top)+12px)] pb-3">
                <div className="relative flex h-[52px] items-center justify-center px-2">
                  <button
                    type="button"
                    onClick={() => { switchTab("map"); }}
                    className="absolute left-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-foreground transition-all hover:bg-muted active:scale-95 active:bg-muted cursor-pointer"
                    aria-label="Back to map"
                  >
                    <ChevronLeft className="h-6 w-6" strokeWidth={2} />
                  </button>
                  <h1 className="text-[17px] font-semibold tracking-tight text-foreground">Assignment</h1>
                </div>
              </div>
              <div className="flex flex-1 flex-col overflow-y-auto bg-muted/40 pb-10">
                <div className="flex flex-1 flex-col space-y-2.5 p-4">
                    {/* Tab 2: Assignment & Compactor Info */}
                    {activeTab === "assignment" && (
                      <div className="space-y-2.5">
                        <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-3">
                          <div className="border-b border-border/60 pb-2.5">
                            <h3 className="text-[16px] font-semibold tracking-tight text-foreground">
                              {assignedSchedule
                                ? `${scheduleLabel(assignedSchedule)} Route`
                                : "No Route Assigned"}
                            </h3>
                          </div>

                          <div className="divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/60 bg-card">
                            <div className="flex min-h-[48px] items-center justify-between gap-3 px-4 py-2.5">
                              <span className="shrink-0 text-[15px] text-muted-foreground">Assigned Unit</span>
                              <span className="truncate text-right text-[15px] text-foreground">{`${currentTruck.id} (${currentTruck.plate})`}</span>
                            </div>
                            <div className="flex min-h-[48px] items-center justify-between gap-3 px-4 py-2.5">
                              <span className="shrink-0 text-[15px] text-muted-foreground">Driver Operator</span>
                              <span className="truncate text-right text-[15px] text-foreground">{liveDriver || "—"}</span>
                            </div>
                            <div className="flex min-h-[48px] items-center justify-between gap-3 px-4 py-2.5">
                              <span className="shrink-0 text-[15px] text-muted-foreground">Payload Capacity</span>
                              <span className="truncate text-right text-[15px] text-foreground">{currentTruck.capacity}</span>
                            </div>
                            <div className="flex min-h-[48px] items-center justify-between gap-3 px-4 py-2.5">
                              <span className="shrink-0 text-[15px] text-muted-foreground">Waste Collection</span>
                              <span className="truncate text-right text-[15px] text-foreground">{assignedSchedule?.collectionType ?? "—"}</span>
                            </div>
                            <div className="flex min-h-[48px] items-center justify-between gap-3 px-4 py-2.5">
                              <span className="shrink-0 text-[15px] text-muted-foreground">Scheduled Days</span>
                              <span className="truncate text-right text-[15px] text-foreground">
                                {Array.isArray(assignedSchedule?.collectionDays)
                                  ? assignedSchedule.collectionDays.join(", ")
                                  : (assignedSchedule?.collectionDays ?? "—")}
                              </span>
                            </div>
                            <div className="flex min-h-[48px] items-center justify-between gap-3 px-4 py-2.5">
                              <span className="shrink-0 text-[15px] text-muted-foreground">Scheduled Hours</span>
                              <span className="truncate text-right text-[15px] tabular-nums text-foreground">{assignedSchedule?.time ?? "—"}</span>
                            </div>
                          </div>
                          
                          {(!isOnDuty && assignedSchedule && !isAssignmentAccepted) && (
                            <button
                              type="button"
                              onClick={async () => {
                                haptic(15);
                                try {
                                  await acceptAssignment(assignedSchedule.id);
                                  toast("Assignment accepted. You can now start the route.");
                                } catch {
                                  toast("Could not accept the assignment. Please try again.", { variant: "error" });
                                }
                              }}
                              className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-[15px] font-semibold transition-all active:scale-[0.99] cursor-pointer bg-emerald-600 text-white active:bg-emerald-700"
                            >
                              Accept Assignment
                            </button>
                          )}
                          {(!isOnDuty && assignedSchedule && isAssignmentAccepted && assignedScheduleStatus === "Accepted") && (
                            <p className="text-center text-[13px] font-medium text-emerald-600">
                              Assignment accepted — go to Route to start.
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "history" && (
            <motion.div
              key="fs-history"
              initial={{ opacity: 0, scale: 0.98, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 8 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="fixed inset-0 z-[90] flex flex-col bg-background"
            >
              <div className="shrink-0 border-b border-border/60 bg-background/80 backdrop-blur-md pt-[calc(env(safe-area-inset-top)+12px)] pb-3">
                <div className="relative flex h-[52px] items-center justify-center px-2">
                  <button
                    type="button"
                    onClick={() => { switchTab("map"); }}
                    className="absolute left-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-foreground transition-all hover:bg-muted active:scale-95 active:bg-muted cursor-pointer"
                    aria-label="Back to map"
                  >
                    <ChevronLeft className="h-6 w-6" strokeWidth={2} />
                  </button>
                  <h1 className="text-[17px] font-semibold tracking-tight text-foreground">History</h1>
                </div>
              </div>
              <div className="flex flex-1 flex-col overflow-y-auto bg-muted/40 pb-10">
                <div className="flex flex-1 flex-col space-y-2.5 p-4">
                    {/* Tab 3: History */}
                    {activeTab === "history" && (
                      <div className="space-y-2.5">
                        {(() => {
                          const history = getSchedules().filter(
                            (s) =>
                              s.truckId === selectedTruckId &&
                              live.scheduleStatus[s.id] === "Completed" &&
                              !s.isArchived
                          );
                          if (history.length === 0) {
                            return (
                              <div className="flex flex-1 flex-col items-center justify-center min-h-[50vh] px-6 py-16 text-center">
                                <CheckCircle2 className="h-12 w-12 text-muted-foreground/40" strokeWidth={1.5} />
                                <h3 className="mt-4 text-[17px] font-semibold tracking-tight text-foreground">No completed routes</h3>
                                <p className="mt-1 max-w-[240px] text-[13px] leading-normal text-muted-foreground">
                                  Routes you finish today will appear here.
                                </p>
                              </div>
                            );
                          }
                          return history.map((s) => (
                            <div key={s.id} className="rounded-2xl border border-border/60 bg-card p-4 flex items-center justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <h3 className="text-[16px] font-semibold tracking-tight text-foreground truncate">{scheduleLabel(s)}</h3>
                                <p className="mt-0.5 text-[13px] text-muted-foreground">{s.time || "No time specified"}</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  haptic();
                                  removeSchedule(s.id);
                                  toast("Route archived from history.");
                                }}
                                className="shrink-0 rounded-full bg-rose-600/10 px-3.5 py-1.5 text-[13px] font-semibold text-rose-600 transition-all active:scale-95 cursor-pointer"
                              >
                                Archive
                              </button>
                            </div>
                          ));
                        })()}
                      </div>
                    )}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "profile" && (
            <motion.div
              key="fs-profile"
              initial={{ opacity: 0, scale: 0.98, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 8 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="fixed inset-0 z-[90] flex flex-col bg-background"
            >
              <div className="shrink-0 border-b border-border/60 bg-background/80 backdrop-blur-md pt-[calc(env(safe-area-inset-top)+12px)] pb-3">
                <div className="relative flex h-[52px] items-center justify-center px-2">
                  <button
                    type="button"
                    onClick={() => { profileView === "password" ? setProfileView("main") : switchTab("map"); }}
                    className="absolute left-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-foreground transition-all hover:bg-muted active:scale-95 active:bg-muted cursor-pointer"
                    aria-label={profileView === "password" ? "Back to profile" : "Back to map"}
                  >
                    <ChevronLeft className="h-6 w-6" strokeWidth={2} />
                  </button>
                  <h1 className="text-[17px] font-semibold tracking-tight text-foreground">{profileView === "password" ? "Change Password" : "Profile"}</h1>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto bg-muted/40 pb-10">
              <AnimatePresence mode="wait" initial={false}>
              {profileView === "password" ? (
              <motion.div
                key="profile-password"
                initial={{ x: 48, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 48, opacity: 0 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="flex flex-1 flex-col"
              >
          <div className="mt-5 px-4">
            <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-2.5">

            {[
              {
                field: "current",
                value: currentPassword,
                setter: setCurrentPassword,
                show: showCurrent,
                setShow: setShowCurrent,
                placeholder: "Current password",
              },
              {
                field: "newPassword",
                value: newPassword,
                setter: setNewPassword,
                show: showNew,
                setShow: setShowNew,
                placeholder: "New password",
              },
              {
                field: "confirm",
                value: confirmNewPassword,
                setter: setConfirmNewPassword,
                show: showConfirm,
                setShow: setShowConfirm,
                placeholder: "Re-enter new password",
              },
            ].map((f) => (
              <div key={f.field} className="flex flex-col gap-1">
                <div className="relative">
                  <input
                    type={f.show ? "text" : "password"}
                    value={f.value}
                    onChange={(e) => handlePwFieldChange(f.field, e.target.value.replace(/\s/g, ""), f.setter)}
                    maxLength={64}
                    autoComplete={f.field === "current" ? "current-password" : "new-password"}
                    className={`w-full rounded-2xl border bg-card px-3.5 py-3.5 pr-11 text-[16px] text-foreground placeholder:text-muted-foreground/50 outline-none transition-colors ${
                      pwErrors[f.field]
                        ? "border-rose-300 focus:border-rose-400"
                        : "border-border/60 focus:border-zinc-400"
                    }`}
                    placeholder={f.placeholder}
                  />
                  <button
                    type="button"
                    onClick={() => f.setShow(!f.show)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer text-muted-foreground/70 transition-colors hover:text-foreground"
                    aria-label={f.show ? "Hide password" : "Show password"}
                  >
                    {f.show ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                  </button>
                </div>
                {f.field === "newPassword" && <PasswordStrengthHint password={f.value} />}
                <AnimatePresence initial={false}>
                  {pwErrors[f.field] && (
                    <motion.p
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                      className="overflow-hidden text-[11px] font-medium text-rose-500"
                    >
                      {pwErrors[f.field]}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>
            ))}

            <Button
              variant="primary"
              size="md"
              disabled={pwSaving}
              onClick={handleChangePassword}
              className="h-12 w-full rounded-2xl text-[15px] font-semibold"
            >
              {pwSaving ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Updating...</span>
                </>
              ) : (
                "Update Password"
              )}
            </Button>
            </div>
          </div>
              </motion.div>
              ) : (
              <motion.div
                key="profile-main"
                initial={{ x: -32, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -32, opacity: 0 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="flex flex-1 flex-col"
              >
          {/* Centered driver header */}
          <div className="flex flex-col items-center px-4 pb-2 pt-6 text-center">
            <div className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-emerald-600 text-[28px] font-semibold leading-none text-white shadow-sm">
              {driverSession?.name?.charAt(0)?.toUpperCase() || "D"}
            </div>
            <h2 className="mt-3 text-[20px] font-semibold tracking-tight text-foreground">{driverSession?.name || "Driver"}</h2>
            <p className="mt-0.5 text-[13px] text-muted-foreground">Compactor Operator ({selectedTruckId}) · Brgy. Tejero, Cebu City</p>
            <span className="mt-2 inline-flex items-center rounded-full bg-emerald-600/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
              {isOnline ? "Online" : "Offline"}
            </span>
          </div>

          {/* Terminal group */}
          <div className="mt-5 px-4">
            <p className="px-1 pb-1.5 text-[13px] text-muted-foreground">Terminal</p>
            <div className="divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/60 bg-card">
              <div className="flex min-h-[48px] items-center justify-between gap-3 px-4 py-2.5">
                <span className="shrink-0 text-[15px] text-foreground">Duty Status</span>
                <span className={`text-right text-[15px] font-semibold ${dutyStatus === "On Duty" ? "text-emerald-600" : dutyStatus === "Paused" ? "text-amber-600" : "text-muted-foreground"}`}>{dutyStatus}</span>
              </div>
              <div className="flex min-h-[48px] items-center justify-between gap-3 px-4 py-2.5">
                <span className="shrink-0 text-[15px] text-foreground">Compactor Unit</span>
                <span className="truncate text-right text-[15px] text-muted-foreground">{selectedTruckId}</span>
              </div>
              <div className="flex min-h-[48px] items-center justify-between gap-3 px-4 py-2.5">
                <span className="shrink-0 text-[15px] text-foreground">Plate</span>
                <span className="truncate text-right text-[15px] text-muted-foreground">{currentTruck.plate}</span>
              </div>
              <div className="flex min-h-[48px] items-center justify-between gap-3 px-4 py-2.5">
                <span className="shrink-0 text-[15px] text-foreground">Device Battery</span>
                <span className="text-right text-[15px] text-muted-foreground">{`${batteryLevel ?? 100}% ${isCharging ? "(Charging)" : ""}`}</span>
              </div>
              <div className="flex min-h-[48px] items-center justify-between gap-3 px-4 py-2.5">
                <span className="shrink-0 text-[15px] text-foreground">GPS Telemetry</span>
                <span className="text-right text-[15px] font-medium text-emerald-600">{broadcastStatus}</span>
              </div>
            </div>
          </div>

          {/* Security group */}
          <div className="mt-5 px-4">
            <p className="px-1 pb-1.5 text-[13px] text-muted-foreground">Security</p>
            <button
              type="button"
              onClick={() => { setProfileView("password"); haptic(); }}
              className="flex min-h-[48px] w-full cursor-pointer items-center justify-between gap-3 rounded-2xl border border-border/60 bg-card px-4 py-2.5 transition-all active:bg-muted"
            >
              <span className="text-[15px] text-foreground">Change Password</span>
              <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground/50" />
            </button>
          </div>

          {/* Actions */}
          <div className="mt-5 px-4">
            <button
              type="button"
              onClick={() => {
                setShowSignOutModal(true);
                haptic();
              }}
              className="flex h-12 w-full cursor-pointer items-center justify-center rounded-2xl border border-border/60 bg-card text-[15px] font-semibold text-rose-600 transition-all active:scale-[0.99]"
            >
              Sign Out
            </button>
          </div>
              </motion.div>
              )}
              </AnimatePresence>
      </div>
    </motion.div>
  )}
      </AnimatePresence>
    </div>

      {/* Native iOS-style Sign Out Confirmation Alert */}
      {showSignOutModal && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 p-4"
          onClick={() => { if (!isSigningOut) setShowSignOutModal(false); }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="w-full max-w-[270px] overflow-hidden rounded-[14px] bg-white text-center shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 pb-4 pt-5">
              <h3 className="text-[17px] font-semibold tracking-tight text-zinc-900">Sign Out?</h3>
              <p className="mt-1 text-[13px] leading-normal text-zinc-600">
                You will need to log back in to access the driver terminal.
              </p>
            </div>
            <div className="flex divide-x divide-black/10 border-t border-black/10">
              <button
                type="button"
                onClick={() => setShowSignOutModal(false)}
                disabled={isSigningOut}
                className="h-11 flex-1 text-[17px] text-zinc-800 transition-colors active:bg-black/5 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  setIsSigningOut(true);
                  try {
                    clearDriverSession();
                    await supabase.auth.signOut();
                    setShowSignOutModal(false);
                    router.replace("/driver-login");
                  } finally {
                    setIsSigningOut(false);
                  }
                }}
                disabled={isSigningOut}
                className="flex h-11 flex-1 items-center justify-center text-[17px] font-semibold text-rose-600 transition-colors active:bg-black/5 cursor-pointer disabled:pointer-events-none"
              >
                {isSigningOut ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  "Sign Out"
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {ToastViewport}
    </div>
  );
}
