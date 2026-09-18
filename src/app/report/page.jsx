"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  LocateFixed,
  Camera,
  Map as MapIcon,
  MapPin,
  CheckCircle2,
  Trash2,
  Calendar,
  Ticket,
  Truck,
  Bell,
  RefreshCw,
  ChevronRight,
  LogOut,
  ShieldCheck,
  X,
  Search,
  Plus,
  Loader2,
} from "lucide-react";
import { TEJERO_SITOS } from "@/lib/mock-data";
import { useTickets, addTicket, updateTicket, removeTicket } from "@/lib/tickets";
import { useAuth } from "@/context/AuthContext";
import { useLiveRoute, getSchedule, getSchedules, scheduleLabel } from "@/lib/live-route";
import { playDing, playTrumpet, useSoundEnabled, setSoundEnabled } from "@/lib/sounds";
import { useRoutePath } from "@/lib/use-route-path";
import { useFleet } from "@/lib/fleet";
import { clearResidentSession } from "@/lib/resident-session";
import { reverseGeocode } from "@/lib/geocode";
import { useSwipeToggle } from "@/lib/use-swipe-toggle";
import { cn, haptic } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { StatusBadge, UrgencyBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapSkeleton } from "@/components/ui/skeletons";
import { InfoRow } from "@/components/ui/info-row";
import { useToast } from "@/components/pwa/Toast";
import OnboardingModal from "@/components/pwa/OnboardingModal";
import ProductTour from "@/components/pwa/ProductTour";

const MapCanvas = dynamic(() => import("@/components/map/map-canvas"), {
  ssr: false,
  loading: () => <MapSkeleton />,
});

const TAB_IDS = ["schedule", "map", "report", "tickets"];



function Waze3DTruckIcon({ className = "h-5 w-5" }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="truckCabinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#047857" />
        </linearGradient>
        <linearGradient id="truckBodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#065f46" />
        </linearGradient>
        <filter id="truckShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="0.8" floodColor="#000000" floodOpacity="0.25" />
        </filter>
      </defs>
      <g filter="url(#truckShadow)">
        <rect x="3" y="9" width="16" height="13" rx="2" fill="url(#truckBodyGrad)" />
        <path d="M 19 12 H 26 C 27.5 12 28.5 13.5 28.5 15 L 28.5 22 H 19 V 12 Z" fill="url(#truckCabinGrad)" />
        <path d="M 21 14 H 25.5 L 26.5 17 H 21 V 14 Z" fill="#ffffff" opacity="0.85" />
        <line x1="6" y1="11" x2="6" y2="20" stroke="#047857" strokeWidth="1.5" />
        <line x1="10" y1="11" x2="10" y2="20" stroke="#047857" strokeWidth="1.5" />
        <line x1="14" y1="11" x2="14" y2="20" stroke="#047857" strokeWidth="1.5" />
        <circle cx="8" cy="23" r="3" fill="#18181b" />
        <circle cx="8" cy="23" r="1.2" fill="#a1a1aa" />
        <circle cx="23" cy="23" r="3" fill="#18181b" />
        <circle cx="23" cy="23" r="1.2" fill="#a1a1aa" />
      </g>
    </svg>
  );
}

function Waze3DCalendarIcon({ className = "h-4 w-4" }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="calTopGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#047857" />
        </linearGradient>
        <filter id="calShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="0.8" floodColor="#000000" floodOpacity="0.25" />
        </filter>
      </defs>
      <g filter="url(#calShadow)">
        <rect x="4" y="6" width="24" height="22" rx="3" fill="#ffffff" stroke="#e4e4e7" strokeWidth="1" />
        <path d="M 4 9 C 4 7.34 5.34 6 7 6 H 25 C 26.66 6 28 7.34 28 9 V 12 H 4 V 9 Z" fill="url(#calTopGrad)" />
        <rect x="9" y="3.5" width="2.5" height="5" rx="1.2" fill="#71717a" />
        <rect x="20.5" y="3.5" width="2.5" height="5" rx="1.2" fill="#71717a" />
        <circle cx="10" cy="17" r="1.5" fill="#10b981" />
        <circle cx="16" cy="17" r="1.5" fill="#a1a1aa" />
        <circle cx="22" cy="17" r="1.5" fill="#a1a1aa" />
        <circle cx="10" cy="23" r="1.5" fill="#a1a1aa" />
        <circle cx="16" cy="23" r="1.5" fill="#10b981" />
        <circle cx="22" cy="23" r="1.5" fill="#a1a1aa" />
      </g>
    </svg>
  );
}

function Waze3DCameraIcon({ className = "h-4 w-4" }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="camBodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3f3f46" />
          <stop offset="100%" stopColor="#18181b" />
        </linearGradient>
        <linearGradient id="camLensGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
        <filter id="camShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="0.8" floodColor="#000000" floodOpacity="0.25" />
        </filter>
      </defs>
      <g filter="url(#camShadow)">
        <path d="M 10 9 L 12 6 H 20 L 22 9 Z" fill="#27272a" />
        <rect x="3" y="9" width="26" height="18" rx="3.5" fill="url(#camBodyGrad)" />
        <rect x="3" y="9" width="26" height="3" fill="#10b981" />
        <circle cx="16" cy="18" r="6" fill="#a1a1aa" />
        <circle cx="16" cy="18" r="4.5" fill="url(#camLensGrad)" />
        <circle cx="14.5" cy="16.5" r="1.3" fill="#ffffff" opacity="0.8" />
        <circle cx="7" cy="12" r="1" fill="#ef4444" />
      </g>
    </svg>
  );
}

function Waze3DTicketIcon({ className = "h-4 w-4" }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="tktGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="50%" stopColor="#d97706" />
          <stop offset="100%" stopColor="#b45309" />
        </linearGradient>
        <filter id="tktShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="0.8" floodColor="#000000" floodOpacity="0.25" />
        </filter>
      </defs>
      <g filter="url(#tktShadow)">
        <path
          d="M 4 8 C 4 6.89 4.89 6 6 6 H 26 C 27.11 6 28 6.89 28 8 V 13 C 26.34 13 25 14.34 25 16 C 25 17.66 26.34 19 28 19 V 24 C 28 25.11 27.11 26 26 26 H 6 C 4.89 26 4 25.11 4 24 V 19 C 5.66 19 7 17.66 7 16 C 7 14.34 5.66 13 4 13 V 8 Z"
          fill="url(#tktGrad)"
        />
        <line x1="12" y1="7" x2="12" y2="25" stroke="#ffffff" strokeWidth="1.2" strokeDasharray="2 2" opacity="0.8" />
        <line x1="16" y1="11" x2="16" y2="21" stroke="#ffffff" strokeWidth="1.2" opacity="0.9" />
        <line x1="19" y1="11" x2="19" y2="21" stroke="#ffffff" strokeWidth="1.8" opacity="0.9" />
        <line x1="22" y1="11" x2="22" y2="21" stroke="#ffffff" strokeWidth="1" opacity="0.9" />
        <line x1="24" y1="11" x2="24" y2="21" stroke="#ffffff" strokeWidth="1.5" opacity="0.9" />
      </g>
    </svg>
  );
}

// A report is only actionable if the resident names a specific area/landmark.
// GPS gives coordinates but not a usable "where", so the typed location must
// pass this check before submit.
const VAGUE_LOCATION_RE =
  /^(here|there|home|house|my (house|home|location|current location)|current location|gps|my gps|near me|near my|unknown|n\/?a|none|test|asdf+|location|location pinned on map|near (your|my) current location|near collection point)$/i;
const COORDS_RE = /^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/;

function isSpecificLocation(raw) {
  const v = (raw || "").trim().replace(/\s+/g, " ");
  if (v.length < 8) return false;
  if (!/[a-zA-Z]/.test(v)) return false;
  if (COORDS_RE.test(v)) return false;
  if (VAGUE_LOCATION_RE.test(v)) return false;
  const words = v.split(" ").filter(Boolean);
  if (words.length < 2 && v.length < 12) return false;
  return true;
}

const LOCATION_FORMAT_HINT = "Be specific: e.g. “Behind Tejero Chapel, Purok 3”";

function Waze3DTargetIcon({ className = "h-9 w-9" }) {
  return (
    <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <linearGradient id="userTargetGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
        <filter id="userTargetShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1.5" stdDeviation="1" floodColor="#000000" floodOpacity="0.25" />
        </filter>
      </defs>
      <g filter="url(#userTargetShadow)">
        <circle cx="18" cy="18" r="13" fill="none" stroke="url(#userTargetGrad)" strokeWidth="3" />
        <circle cx="18" cy="18" r="6" fill="#10b981" />
        <circle cx="18" cy="18" r="2.5" fill="#ffffff" />
        <line x1="18" y1="2" x2="18" y2="7" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="18" y1="29" x2="18" y2="34" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="2" y1="18" x2="7" y2="18" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="29" y1="18" x2="34" y2="18" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" />
      </g>
    </svg>
  );
}

function Waze3DFocusTruckIcon({ className = "h-9 w-9" }) {
  return (
    <svg viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <filter id="userFocusTruckShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1.5" stdDeviation="1" floodColor="#000000" floodOpacity="0.3" />
        </filter>
      </defs>
      <g filter="url(#userFocusTruckShadow)">
        {/* 4 Side Tires */}
        <rect x="7" y="9" width="3.5" height="7" rx="1.5" fill="#18181b" />
        <rect x="33.5" y="9" width="3.5" height="7" rx="1.5" fill="#18181b" />
        <rect x="6.5" y="27" width="4" height="8" rx="1.5" fill="#18181b" />
        <rect x="33.5" y="27" width="4" height="8" rx="1.5" fill="#18181b" />

        {/* Compactor Main Container Box */}
        <rect x="10" y="16" width="24" height="20" rx="3" fill="#10b981" stroke="#059669" strokeWidth="1" />
        {/* Container Top 3D Roof Highlight */}
        <rect x="13" y="18" width="18" height="14" rx="2" fill="#34d399" opacity="0.9" />
        <line x1="10" y1="21" x2="34" y2="21" stroke="#047857" strokeWidth="1.2" />
        <line x1="10" y1="26" x2="34" y2="26" stroke="#047857" strokeWidth="1.2" />
        <line x1="10" y1="31" x2="34" y2="31" stroke="#047857" strokeWidth="1.2" />

        {/* Rear Hopper Loader */}
        <rect x="12" y="35" width="20" height="3" rx="1" fill="#064e3b" />
        <rect x="15" y="35.5" width="4" height="2" fill="#facc15" />
        <rect x="25" y="35.5" width="4" height="2" fill="#facc15" />

        {/* 3D Cab Front Hood */}
        <path d="M 12 16 H 32 V 9 C 32 6.5 29.5 5 27 5 H 17 C 14.5 5 12 6.5 12 9 V 16 Z" fill="#059669" stroke="#047857" strokeWidth="1" />

        {/* Side Mirrors */}
        <rect x="7.5" y="11" width="3" height="2" rx="0.5" fill="#047857" />
        <rect x="33.5" y="11" width="3" height="2" rx="0.5" fill="#047857" />

        {/* Glossy Sky Blue Curved Windshield */}
        <path d="M 14 11 H 30 L 28 14.5 H 16 L 14 11 Z" fill="#38bdf8" stroke="#e0f2fe" strokeWidth="0.8" />
        <line x1="20" y1="11.5" x2="22" y2="14" stroke="#ffffff" strokeWidth="1" opacity="0.8" />

        {/* LED Headlights */}
        <rect x="13.5" y="5" width="3.5" height="1.8" rx="0.5" fill="#facc15" />
        <rect x="27" y="5" width="3.5" height="1.8" rx="0.5" fill="#facc15" />
      </g>
    </svg>
  );
}

function getTimeBasedGreeting(fullName = "Resident") {
  const name = fullName.split(" ")[0];
  return `Hi, ${name}!`;
}

// Approximate meters along a lat/lng polyline (equirectangular projection —
// plenty accurate at barangay scale).
function pathMeters(positions) {
  let meters = 0;
  for (let i = 0; i < positions.length - 1; i++) {
    const [lat1, lng1] = positions[i];
    const [lat2, lng2] = positions[i + 1];
    const mLat = 111320;
    const mLng = 111320 * Math.cos(((lat1 + lat2) / 2) * (Math.PI / 180));
    meters += Math.hypot((lat2 - lat1) * mLat, (lng2 - lng1) * mLng);
  }
  return meters;
}

export default function ResidentMobilePWA() {
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window === "undefined") return "map";
    const saved = window.localStorage.getItem("resident-active-tab");
    return ["schedule", "map", "report", "tickets", "profile"].includes(saved) ? saved : "map";
  }); // "schedule" | "map" | "report" | "tickets" | "profile"

  useEffect(() => {
    try {
      window.localStorage.setItem("resident-active-tab", activeTab);
    } catch {}
  }, [activeTab]);
  const tickets = useTickets();
  const [ticketFilter, setTicketFilter] = useState("all");

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [mapFocusTicket, setMapFocusTicket] = useState(null);
  const [ticketAddress, setTicketAddress] = useState("");

  useEffect(() => {
    if (!selectedTicket) {
      setTicketAddress("");
      return;
    }
    let cancelled = false;
    setTicketAddress("Locating address...");
    reverseGeocode(selectedTicket.lat, selectedTicket.lng).then((addr) => {
      if (!cancelled) setTicketAddress(addr || "Location pinned on map");
    }).catch(() => {
      if (!cancelled) setTicketAddress("Location pinned on map");
    });
    return () => {
      cancelled = true;
    };
  }, [selectedTicket]);
  const [isMapSheetExpanded, setIsMapSheetExpanded] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const handleMapReady = useCallback(() => setMapReady(true), []);
  const router = useRouter();
  const [sessionReady, setSessionReady] = useState(false);
  const [residentSession, setResidentSession] = useState(null);

  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) return;
      supabase.from('profiles').select('role, full_name, sitio, id').eq('id', session.user.id).single().then(({ data }) => {
        const role = data?.role || session.user.user_metadata?.role;
        if (role && role !== 'resident') {
          if (['admin', 'staff', 'dispatch'].includes(role)) {
            router.replace('/dashboard');
          } else if (role === 'driver') {
            router.replace('/driver');
          } else {
            router.replace('/login');
          }
          return;
        }

        setResidentSession({
          email: session.user.email,
          name: data?.full_name || session.user.user_metadata?.full_name || "Resident",
          sitio: data?.sitio || session.user.user_metadata?.sitio,
          phone: session.user.user_metadata?.phone || data?.phone,
          id: session.user.id
        });
        setSessionReady(true);
      });
    });
  }, [router, user, authLoading]);

  const [showOnboarding, setShowOnboarding] = useState(false);
  const [runProductTour, setRunProductTour] = useState(false);

  useEffect(() => {
    if (!sessionReady || !residentSession?.id) return;
    const completed = localStorage.getItem(`bingo_onboarding_completed_${residentSession.id}`);
    if (!completed) {
      setShowOnboarding(true);
    }
  }, [sessionReady, residentSession]);

  const handleCompleteOnboarding = () => {
    if (residentSession?.id) {
      localStorage.setItem(`bingo_onboarding_completed_${residentSession.id}`, "true");
    }
    setShowOnboarding(false);
    setActiveTab("map");
    // Launch product tour right after first-time onboarding completes
    if (residentSession?.id) {
      const tourCompleted = localStorage.getItem(`bingo_product_tour_completed_${residentSession.id}`);
      if (!tourCompleted) {
        setTimeout(() => {
          setRunProductTour(true);
        }, 400);
      }
    }
  };

  const greetingTitle = useMemo(
    () => getTimeBasedGreeting(residentSession?.name || "Resident"),
    [residentSession]
  );

  // Focus map on the resident's home sitio if they provided one, otherwise
  // default to Barangay Tejero hall. The bounding box restricts them anyway, but
  // coverage still spans their whole service area (Barangay Tejero for the
  // pilot) so they see trucks collecting in neighboring sitios too.
  const [mapCenter, setMapCenter] = useState([10.3025, 123.9095]);

  useEffect(() => {
    if (residentSession?.sitio) {
      const sitio = TEJERO_SITOS[residentSession.sitio];
      if (sitio) setMapCenter([sitio.lat, sitio.lng]);
    }
  }, [residentSession]);

  const live = useLiveRoute();
  const fleet = useFleet();

  // The truck currently running a route: assigned, past idle, and actually
  // broadcasting (or finished). A paused/ended route (isActive false while
  const activeTs = useMemo(
    () =>
      Object.values(live.trucks || {}).find(
        (ts) =>
          ts.scheduleId &&
          ts.phase !== "idle" &&
          (ts.tracking?.isActive || ts.phase === "completed")
      ) || null,
    [live]
  );
  const activeSchedule = activeTs ? getSchedule(activeTs.scheduleId) : null;
  const displaySchedule = activeSchedule || getSchedules()[0] || { id: null, routePoints: [] };
  const routePoints = displaySchedule.routePoints ?? [];
  const stopIndex = activeTs ? activeTs.stopIndex : 0;
  const routeCompleted = activeTs?.phase === "completed";

  // Single "current stop" pin: the live truck's target stop. Pins only appear
  // once the driver presses Start Route (activeTs); hidden once completed.
  const stopPoint = !activeTs || routeCompleted ? null : routePoints[stopIndex];
  const currentStop = stopPoint ? { ...stopPoint, index: stopIndex } : null;

  const routePath = useRoutePath({
    scheduleId: displaySchedule.id,
    stopIndex,
    origin:
      activeTs && !routeCompleted
        ? { lat: activeTs.tracking.lat, lng: activeTs.tracking.lng }
        : null,
    points: routeCompleted ? [] : routePoints.slice(stopIndex, stopIndex + 1),
  });

  // Compact numbered pins for every stop after the current one — likewise only
  // shown once the driver has started the route.
  const upcomingStops =
    !activeTs || routeCompleted
      ? []
      : routePoints.slice(stopIndex + 1).map((p, i) => ({ ...p, index: stopIndex + 1 + i }));

  // Road-accurate path for the legs AFTER the current stop. The origin is the fixed
  // current-stop vertex (not the moving truck), so this is fetched once per stop
  // advance instead of every sim tick; stopIndex+1 keeps its cache key distinct
  // from the sim's current-leg key.
  const onDuty = !!activeTs && !routeCompleted && !!activeTs.tracking?.isActive;
  const futurePath = useRoutePath({
    scheduleId: displaySchedule.id,
    stopIndex: stopIndex + 1,
    origin:
      onDuty && routePoints[stopIndex]
        ? { lat: routePoints[stopIndex].lat, lng: routePoints[stopIndex].lng }
        : null,
    points: onDuty ? routePoints.slice(stopIndex + 1) : [],
    enabled: onDuty,
  });

  // Truthful countdown ETA for the banner: meters remaining along the drawn
  // route leg (live truck position → current stop) at the fleet's ~9 m/s
  // working pace — replaces the store's static "5 mins" placeholder, so the
  // banner counts down for real as the truck approaches.
  const liveEta = useMemo(() => {
    if (!activeTs || routeCompleted || activeTs.onsite) return null;
    let meters = pathMeters(routePath.positions ?? []);
    if (meters <= 0 && stopPoint && activeTs.tracking?.lat != null) {
      meters = pathMeters([
        [activeTs.tracking.lat, activeTs.tracking.lng],
        [stopPoint.lat, stopPoint.lng],
      ]);
    }
    if (meters <= 0) return null;
    if (meters < 120) return "Arriving now";
    const mins = Math.max(1, Math.round(meters / 9 / 60));
    return `${mins} min${mins === 1 ? "" : "s"}`;
  }, [activeTs, routeCompleted, activeTs?.onsite, routePath, stopPoint]);

  // Live truck banner entry derived from the shared route store
  const liveBanner = useMemo(() => {
    if (!activeTs || !activeSchedule) return null;
    if (activeTs.phase === "completed") {
      return {
        id: "truck-live-completed",
        mascot: "/mascot/arms-open-pose-clean.png",
        title: "Collection complete",
        subtitle: "All pickups complete",
      };
    }
    const point = activeSchedule.routePoints?.[activeTs.stopIndex] || activeSchedule.routePoints?.[0];
    if (activeTs.onsite) {
      return {
        id: "truck-live-arrived",
        mascot: "/mascot/arms-open-pose.png",
        title: "Truck arrived",
        subtitle: `Collecting at ${point?.name ?? "your stop"}`,
      };
    }
    return {
      id: "truck-live-enroute",
      Icon: Waze3DTruckIcon,
      title:
        liveEta === "Arriving now"
          ? "Truck arriving now"
          : `Truck is ${liveEta ?? "3 mins"} away`,
      subtitle: `Approaching ${point?.name ?? "your stop"}`,
    };
  }, [activeTs, activeSchedule, liveEta]);

  // Pickup notification sounds: a cute ding when the driver starts the route
  // (including a fresh route after a completed one), and a trumpet fanfare
  // each time the driver presses Stop By and the truck arrives at a stop. The
  // snapshot present on mount is only recorded, so opening the page while a
  // route is already running never replays sounds for past events.
  const truckSoundRef = useRef("init");
  const soundEnabled = useSoundEnabled();
  useEffect(() => {
    const state = !activeTs
      ? "none"
      : activeTs.onsite
        ? "onsite"
        : activeTs.phase === "completed"
          ? "completed"
          : "enroute";
    const prev = truckSoundRef.current;
    truckSoundRef.current = state;
    if (prev === "init" || prev === state) return;
    if (state === "enroute" && (prev === "none" || prev === "completed")) {
      if (soundEnabled) playDing();
    } else if (state === "onsite") {
      if (soundEnabled) playTrumpet();
    }
  }, [activeTs, soundEnabled]);

  // Single truthful status message derived from real schedules: pickup today,
  // or no pickup today with the next collection day.
  const pickupStatus = useMemo(() => {
    if (liveBanner) return null;
    const now = new Date();
    const dayName = now.toLocaleDateString("en-US", { weekday: "long" });
    const open = getSchedules().filter(
      (s) => (live.scheduleStatus?.[s.id] ?? s.status) !== "Completed"
    );
    const today = open.find((s) => s.days?.includes(dayName));
    if (today) {
      const start = String(today.time || "").split("-")[0].trim();
      return {
        id: "pickup-status-today",
        Icon: Waze3DCalendarIcon,
        mascot: "/mascot/arms-open-pose.png",
        title: "Pickup today",
        subtitle: `${today.type}${start ? ` • ${start}` : ""}`,
      };
    }
    for (let off = 1; off <= 7; off++) {
      const d = new Date(now);
      d.setDate(now.getDate() + off);
      const name = d.toLocaleDateString("en-US", { weekday: "long" });
      const hit = open.find((s) => s.collectionDays?.includes(name));
      if (hit) {
        const label = off === 1 ? "Tomorrow" : name;
        const start = String(hit.time || "").split("-")[0].trim();
        return {
          id: "pickup-status-next",
          Icon: Waze3DCalendarIcon,
          mascot: "/mascot/coffee-pose.png",
          title: "No pickup today",
          subtitle: `Next: ${label}${start ? ` at ${start}` : ""}`,
        };
      }
    }
    return {
      id: "pickup-status-none",
      Icon: Waze3DCalendarIcon,
      mascot: "/mascot/coffee-pose.png",
      title: "No pickup today",
      subtitle: "No schedule posted",
    };
  }, [liveBanner, live]);

  // Dynamic banner onboarding sequence: Step 0 (Greeting, 4s) -> Step 1 (Spotted Waste?, 4s) -> Step 2 (Schedule Status, Fixed)
  const [bannerStep, setBannerStep] = useState(0);

  useEffect(() => {
    if (liveBanner || showOnboarding || runProductTour) {
      setBannerStep(0);
      return;
    }
    const timer1 = setTimeout(() => {
      setBannerStep(1);
    }, 4000);
    const timer2 = setTimeout(() => {
      setBannerStep(2);
    }, 8000);
    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [liveBanner, showOnboarding, runProductTour]);

  const idleBanners = useMemo(() => {
    const list = [
      {
        id: "greeting",
        mascot: "/mascot/arms-open-pose-clean.png",
        title: greetingTitle,
        subtitle: new Date().toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
        }),
      },
      {
        id: "report-action",
        mascot: "/mascot/pointing-pose.png",
        title: "Spotted Waste?",
        subtitle: "Tap Report below",
      },
    ];

    if (pickupStatus) {
      list.push(pickupStatus);
    }

    return list;
  }, [greetingTitle, pickupStatus]);

  const currentBanner = useMemo(() => {
    if (liveBanner) return liveBanner;
    if (runProductTour && pickupStatus) return pickupStatus;
    return idleBanners[bannerStep % idleBanners.length] || idleBanners[0];
  }, [liveBanner, idleBanners, bannerStep, runProductTour, pickupStatus]);

  const handleHeaderClick = () => {
    if (liveBanner || showOnboarding || runProductTour) return;
    setBannerStep((prev) => (prev + 1) % idleBanners.length);
    haptic();
  };

  // Modals for Header Profile
  const [showProfile, setShowProfile] = useState(false);
  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const closeAllSheets = () => {
    setSelectedTicket(null);
    setShowProfile(false);
    setIsMapSheetExpanded(false);
  };

  const sheetSwipe = useSwipeToggle(
    () => {
      if (!isMapSheetExpanded) {
        setIsMapSheetExpanded(true);
        haptic();
      }
    },
    () => {
      if (isMapSheetExpanded) {
        setIsMapSheetExpanded(false);
        haptic();
      }
    }
  );

  const [mapZoom, setMapZoom] = useState(16);

  // Form State for Report
  const [editingTicketId, setEditingTicketId] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [category, setCategory] = useState("Overflowing Bin");
  const [urgency, setUrgency] = useState("High");
  const [locationName, setLocationName] = useState("");
  const [barangay, setBarangay] = useState("Tejero");
  const [description, setDescription] = useState("");

  const [gpsCoords, setGpsCoords] = useState(null);
  const [gpsAddress, setGpsAddress] = useState("");
  const [isLocating, setIsLocating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedTicket, setSubmittedTicket] = useState(null);
  const [truckFocused, setTruckFocused] = useState(false);
  const [mapBounds, setMapBounds] = useState(null);
  const [flySignal, setFlySignal] = useState(0);
  const submitTimeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      if (submitTimeoutRef.current) clearTimeout(submitTimeoutRef.current);
    };
  }, []);

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

  const fileInputRef = useRef(null);
  const { toast, ToastViewport } = useToast();

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("tab");
    if (TAB_IDS.includes(t)) setActiveTab(t);
  }, []);

  const switchTab = (id) => {
    haptic();
    setActiveTab(id);
    window.history.replaceState(null, "", `?tab=${id}`);
  };

  // Active trucks for live tracking map (Only show trucks whose drivers started their route!)
  const activeTrucks = useMemo(() => {
    return (fleet || [])
      .map((t) => {
        const ts = (live.trucks || {})[t.id];
        if (!ts || !ts.tracking.isActive) return null;
        return {
          id: t.id,
          plate: t.plate,
          driver: t.driver,
          capacity: t.capacity,
          lat: ts.tracking.lat || 10.3025,
          lng: ts.tracking.lng || 123.9095,
          heading:
            t.id === activeTs?.truckId && routePath.heading != null
              ? routePath.heading
              : ts.tracking.heading || 90,
          eta: ts.tracking.eta || "5 mins",
          isActive: true,
        };
      })
      .filter(Boolean);
  }, [live, routePath, activeTs, fleet]);

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const img = new Image();
      img.onload = () => {
        const MAX = 800;
        let w = img.width, h = img.height;
        if (w > MAX || h > MAX) {
          const scale = MAX / Math.max(w, h);
          w = Math.round(w * scale);
          h = Math.round(h * scale);
        }
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d").drawImage(img, 0, 0, w, h);
        setPhotoPreview(canvas.toDataURL("image/jpeg", 0.7));
        URL.revokeObjectURL(img.src);
      };
      img.src = URL.createObjectURL(file);
    }
  };

  const handleGetLocation = (onSuccess) => {
    if (!("geolocation" in navigator)) return;
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setGpsCoords({ lat: latitude, lng: longitude });
        haptic();
        if (typeof onSuccess === "function") onSuccess({ lat: latitude, lng: longitude });

        let address = "";
        try {
          address = await reverseGeocode(latitude, longitude) || "";
        } catch { }
        setGpsAddress(address);
        toast(
          address
            ? `GPS pinned near ${address}. Add a specific landmark so crews can find it.`
            : "GPS pinned. Add a specific area or landmark so crews can find it."
        );
        setIsLocating(false);
      },
      (error) => {
        console.warn("GPS location error:", error);
        setIsLocating(false);
        toast("Unable to fetch GPS location. Please enter the street name.", {
          variant: "error",
        });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleEditTicket = useCallback((ticket) => {
    setEditingTicketId(ticket.id);
    setCategory(ticket.category || "Overflowing Bin");
    setUrgency(ticket.urgency || "High");
    setLocationName(ticket.location || "");
    setBarangay(ticket.barangay || "Tejero");
    setDescription(ticket.description || "");
    setPhotoPreview(ticket.photo || null);
    if (ticket.lat && ticket.lng) {
      setGpsCoords({ lat: ticket.lat, lng: ticket.lng });
    } else {
      setGpsCoords(null);
    }
    closeAllSheets();
    switchTab("report");
  }, []);

  const handleSubmitReport = (e) => {
    e.preventDefault();
    if (!isSpecificLocation(locationName)) {
      toast(
        gpsCoords
          ? `GPS is pinned, but add a specific area or landmark. ${LOCATION_FORMAT_HINT}`
          : `Add a specific area or landmark. ${LOCATION_FORMAT_HINT}`,
        { variant: "error" }
      );
      return;
    }

    setIsSubmitting(true);

    submitTimeoutRef.current = setTimeout(async () => {
      if (editingTicketId) {
        const patch = {
          location: locationName.trim(),
          barangay: barangay,
          urgency: urgency,
          lat: gpsCoords?.lat || 10.3016,
          lng: gpsCoords?.lng || 123.9086,
          category: category,
          description: description,
          photo: photoPreview,
        };
        await updateTicket(editingTicketId, patch);
        setSubmittedTicket({ id: editingTicketId, ...patch });
        setIsSubmitting(false);
        setEditingTicketId(null);
        haptic(20);
      } else {
        const created = {
          location: locationName.trim(),
          barangay: barangay,
          city: "Cebu City",
          reporter: reporterName || "Resident",
          urgency: urgency,
          status: "Pending",
          date: new Date().toLocaleDateString("en-CA"),
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          lat: gpsCoords?.lat || 10.3016,
          lng: gpsCoords?.lng || 123.9086,
          category: category,
          description: description || `Reported ${category} at ${locationName}.`,
          photo: photoPreview,
        };

        await addTicket(created);
        setSubmittedTicket(created);
        setIsSubmitting(false);
        haptic(20);
      }
    }, 600);
  };

  const filteredSchedules = getSchedules().filter((s) => {
    const matchesZone = selectedZone === "all" || s.zoneId === selectedZone || (s.routePoints || []).some((p) => p.name === selectedZone);
    const q = searchQuery.toLowerCase();
    const matchesQuery =
      !searchQuery ||
      s.type.toLowerCase().includes(q) ||
      s.days.some((d) => d.toLowerCase().includes(q)) ||
      scheduleLabel(s).toLowerCase().includes(q) ||
      (s.routePoints || []).some((p) => (p.name || "").toLowerCase().includes(q));
    return matchesZone && matchesQuery;
  });

  if (!sessionReady) {
    return (
      <div className="flex h-dvh w-full items-center justify-center bg-background">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-emerald-500/30 border-t-emerald-500" />
      </div>
    );
  }

  if (showOnboarding) {
    return <OnboardingModal isOpen={showOnboarding} onComplete={handleCompleteOnboarding} />;
  }

  return (
    <div className="flex h-dvh w-full flex-col bg-background text-foreground font-sans selection:bg-emerald-100 selection:text-emerald-900 overflow-hidden select-none">
      {/* Main 1-Screen Body: Full-Screen Map Canvas as Permanent Backdrop */}
      <div className="relative flex-1 w-full overflow-hidden select-none">
        {/* Permanent Background Map Canvas */}
        <div className="absolute inset-0 h-full w-full z-0">
          <MapCanvas
            tickets={mapFocusTicket ? [mapFocusTicket] : []}
            trucks={activeTrucks}
            routes={[
              activeTs && !routeCompleted && routePath.positions.length >= 2 && { id: `${displaySchedule.id}-leg`, ...routePath },
              futurePath.positions.length >= 2 && { id: `${displaySchedule.id}-future-${stopIndex}`, ...futurePath },
            ].filter(Boolean)}
            mapMode="pins"
            currentStop={currentStop}
            upcomingStops={upcomingStops}
            center={mapFocusTicket ? [mapFocusTicket.lat, mapFocusTicket.lng] : selectedTicket ? [selectedTicket.lat, selectedTicket.lng] : mapCenter}
            zoom={mapZoom}
            highlightedTicketId={mapFocusTicket?.id}
            onMapReady={handleMapReady}
            onSelectTicket={(t) => {
              closeAllSheets();
              setSelectedTicket(t);
              setMapFocusTicket(t);
              setMapZoom(17);
              haptic();
            }}
            onMapDrag={() => {
              if (selectedTicket) {
                setSelectedTicket(null);
              }
              if (mapFocusTicket) {
                setMapFocusTicket(null);
              }
              if (isMapSheetExpanded) {
                setIsMapSheetExpanded(false);
              }
              if (truckFocused) {
                setTruckFocused(false);
              }
            }}
            onBoundsChange={handleMapBoundsChange}
            flySignal={flySignal}
          />
        </div>

        {/* Translucent Backdrop Scrim when Main Bottom Sheet is Expanded */}
        <AnimatePresence>
          {isMapSheetExpanded && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => {
                setIsMapSheetExpanded(false);
                haptic();
              }}
              className="absolute inset-0 z-15 bg-black/25 cursor-pointer"
            />
          )}
        </AnimatePresence>

        {/* Waze-Style Flush Top Navigation Banner (Light Glass Theme - Dynamic Slide-from-Top Readout) */}
        <div className="pointer-events-auto absolute top-0 inset-x-0 z-20 w-full border-b border-border bg-card/98 px-5 py-4 text-foreground backdrop-blur-md flex items-center justify-between gap-3.5 select-none overflow-hidden h-20 shadow-sm">
          {/* Left: Dynamic 3D Vector SVG Icon & Dynamic Slide-from-Top Readout */}
          <div data-tour="live-banner" onClick={handleHeaderClick} className="min-w-0 flex-1 overflow-hidden relative h-14 flex items-center cursor-pointer">
            {!mapReady ? (
              <div className="flex items-center gap-3.5 w-full">
                <div className="h-10 w-10 shrink-0 rounded-xl bg-foreground/10 animate-pulse" />
                <div className="flex-1 flex flex-col gap-1.5">
                  <div className="h-3.5 w-2/5 rounded-full bg-foreground/10 animate-pulse" />
                  <div className="h-2.5 w-3/5 rounded-full bg-foreground/10 animate-pulse" />
                </div>
              </div>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentBanner.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                  className="flex items-center gap-3.5 min-w-0 w-full"
                >
                  {currentBanner.mascot ? (
                    <div className="flex h-16 w-16 items-center justify-center shrink-0">
                      <img
                        src={currentBanner.mascot}
                        alt="Binny Mascot"
                        fetchPriority="high"
                        loading="eager"
                        className="h-16 w-16 shrink-0 object-contain drop-shadow-xs"
                      />
                    </div>
                  ) : currentBanner.Icon ? (
                    <div className="flex h-11 w-11 items-center justify-center shrink-0">
                      <currentBanner.Icon className="h-9 w-9 shrink-0" />
                    </div>
                  ) : null}

                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg font-semibold tracking-tight text-foreground leading-tight">
                      {currentBanner.title}
                    </h3>
                    {currentBanner.subtitle && (
                      <p className="text-sm font-semibold text-emerald-800 leading-tight mt-1">
                        {currentBanner.subtitle}
                      </p>
                    )}
                  </div>
                </motion.div>
              </AnimatePresence>
            )}
          </div>
        </div>



        {/* Floating Map Action Buttons */}
        {/* 1. Bottom-Left: Focus Active Truck (native style, just above bottom nav) */}
        <div className="pointer-events-none absolute bottom-[calc(5.5rem+env(safe-area-inset-bottom))] left-3 z-20">
          <AnimatePresence>
            {activeTs?.tracking && !isPointInView(activeTs.tracking.lat, activeTs.tracking.lng) && (
              <motion.button
                key="focus-active-truck"
                type="button"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                onClick={() => {
                  closeAllSheets();
                  setIsMapSheetExpanded(false);
                  setTruckFocused(true);
                  if (activeTs?.tracking) {
                    setMapCenter([activeTs.tracking.lat, activeTs.tracking.lng]);
                    setMapZoom(17);
                    setFlySignal((s) => s + 1);
                  }
                  haptic();
                }}
                className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full border border-black/10 bg-white text-zinc-800 shadow-md active:scale-95 transition-transform cursor-pointer"
                title="Focus Active Truck"
                aria-label="Focus Active Truck"
              >
                <Truck className="h-[22px] w-[22px]" strokeWidth={2} />
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* 2. Bottom-Right: Center My Location (native style, just above bottom nav) */}
        <div className="pointer-events-none absolute bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-3 z-20">
          <AnimatePresence>
            {(!gpsCoords || !isPointInView(gpsCoords.lat, gpsCoords.lng)) && (
              <motion.button
                key="center-my-location"
                type="button"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                onClick={() => {
                  closeAllSheets();
                  setIsMapSheetExpanded(false);
                  setTruckFocused(false);
                  const centerOn = (coords) => {
                    setMapCenter([coords.lat, coords.lng]);
                    setMapZoom(17);
                    setFlySignal((s) => s + 1);
                  };
                  if (gpsCoords) {
                    centerOn(gpsCoords);
                  } else {
                    handleGetLocation((coords) => centerOn(coords));
                  }
                  haptic();
                }}
                className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full border border-black/10 bg-white text-zinc-800 shadow-md active:scale-95 transition-transform cursor-pointer"
                title="Center My Location"
                aria-label="Center My Location"
              >
                <LocateFixed className="h-[22px] w-[22px]" strokeWidth={2} />
              </motion.button>
            )}
          </AnimatePresence>
        </div>


        {/* Bottom Navigation Bar - native tab bar with center action, only visible on map */}
        {activeTab === "map" && (
        <div className="fixed bottom-0 inset-x-0 z-[100] border-t border-black/10 bg-background/85 backdrop-blur-xl shadow-[0_-4px_16px_rgba(0,0,0,0.06)] pb-[env(safe-area-inset-bottom)]">
          <div className="grid grid-cols-5 h-[64px] max-w-md mx-auto px-2">
            {/* 1. Map */}
            <button
              type="button"
              onClick={() => { setActiveTab("map"); haptic(); }}
              className={`flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer ${activeTab === "map" ? "text-emerald-600" : "text-zinc-400"}`}
            >
              <MapIcon className="h-6 w-6" strokeWidth={activeTab === "map" ? 2.25 : 1.75} />
              <span className={`text-[10px] leading-none ${activeTab === "map" ? "font-semibold" : "font-medium"}`}>Map</span>
            </button>

            {/* 2. Schedule */}
            <button
              type="button"
              data-tour="nav-tab-schedule"
              onClick={() => { setActiveTab("schedule"); haptic(); }}
              className={`flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer ${activeTab === "schedule" ? "text-emerald-600" : "text-zinc-400"}`}
            >
              <Calendar className="h-6 w-6" strokeWidth={activeTab === "schedule" ? 2.25 : 1.75} />
              <span className={`text-[10px] leading-none ${activeTab === "schedule" ? "font-semibold" : "font-medium"}`}>Schedule</span>
            </button>

            {/* 3. Report (elevated center action) */}
            <button
              type="button"
              data-tour="nav-tab-report"
              onClick={() => { setActiveTab("report"); setTimeout(() => fileInputRef.current?.click(), 150); haptic(); }}
              className="relative flex flex-col items-center justify-end pb-3 cursor-pointer"
            >
              <span className="absolute -top-7 left-1/2 flex h-14 w-14 -translate-x-1/2 items-center justify-center rounded-full bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 ring-4 ring-background transition-transform active:scale-95">
                <Camera className="h-6 w-6" strokeWidth={2} />
              </span>
              <span className="text-[10px] font-semibold leading-none text-emerald-600">Report</span>
            </button>

            {/* 4. Tickets */}
            <button
              type="button"
              data-tour="nav-tab-tickets"
              onClick={() => { setActiveTab("tickets"); haptic(); }}
              className={`flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer ${activeTab === "tickets" ? "text-emerald-600" : "text-zinc-400"}`}
            >
              <Ticket className="h-6 w-6" strokeWidth={activeTab === "tickets" ? 2.25 : 1.75} />
              <span className={`text-[10px] leading-none ${activeTab === "tickets" ? "font-semibold" : "font-medium"}`}>Tickets</span>
            </button>

            {/* 5. Profile */}
            <button
              type="button"
              data-tour="profile-btn"
              onClick={() => { setActiveTab("profile"); haptic(); }}
              className={`flex flex-col items-center justify-center gap-1 transition-colors cursor-pointer ${activeTab === "profile" ? "text-emerald-600" : "text-zinc-400"}`}
            >
              <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold leading-none transition-colors ${activeTab === "profile" ? "bg-emerald-600 text-white" : "bg-zinc-300/60 text-zinc-600"}`}>
                {residentSession?.name?.charAt(0)?.toUpperCase() || "R"}
              </span>
              <span className={`text-[10px] leading-none ${activeTab === "profile" ? "font-semibold" : "font-medium"}`}>Profile</span>
            </button>
          </div>
        </div>
        )}

        {/* FULL SCREEN VIEWS - native app style fade/scale transition */}
        <AnimatePresence mode="wait" initial={false}>
          {activeTab === "schedule" && (
            <motion.div
              key="fs-schedule"
              initial={{ opacity: 0, scale: 0.98, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 8 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="fixed inset-0 z-[90] flex flex-col bg-background"
            >
              <div className="shrink-0 border-b border-border/60 bg-background/80 backdrop-blur-md pt-[env(safe-area-inset-top)]">
                <div className="relative flex h-[52px] items-center justify-center px-2">
                  <button
                    type="button"
                    onClick={() => { setActiveTab("map"); haptic(); }}
                    className="absolute left-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-foreground transition-all hover:bg-muted active:scale-95 active:bg-muted cursor-pointer"
                    aria-label="Back to map"
                  >
                    <ChevronLeft className="h-6 w-6" strokeWidth={2} />
                  </button>
                  <h1 className="text-[17px] font-semibold tracking-tight text-foreground">Schedule</h1>
                </div>
              </div>
              <div className="flex flex-1 flex-col overflow-y-auto bg-muted/40 pb-10">
                {/* Schedule List */}
                <div className="flex flex-1 flex-col space-y-2.5 p-4">
                  {filteredSchedules.length === 0 ? (
                    <div className="flex flex-1 flex-col items-center justify-center min-h-[50vh] px-6 py-16 text-center">
                      <Calendar className="h-12 w-12 text-muted-foreground/40" strokeWidth={1.5} />
                      <h3 className="mt-4 text-[17px] font-semibold tracking-tight text-foreground">No schedules found</h3>
                      <p className="mt-1 max-w-[240px] text-[13px] leading-normal text-muted-foreground">
                        There are no schedules matching your search.
                      </p>
                    </div>
                  ) : filteredSchedules.map((sch) => {
                    const isRecyclable = sch.type?.includes("Recyclable");
                    const isDiliMalata = sch.type?.includes("Dili Malata");
                    const isBiodegradable = !isRecyclable && !isDiliMalata;

                    const areaTitle = scheduleLabel(sch);

                    const DAY_ABBR = {
                      Monday: "Mon",
                      Tuesday: "Tue",
                      Wednesday: "Wed",
                      Thursday: "Thu",
                      Friday: "Fri",
                      Saturday: "Sat",
                      Sunday: "Sun",
                    };
                    const formattedDays = (sch.days || []).map((d) => DAY_ABBR[d] || d).join(", ");

                    const categoryBadgeLabel = isBiodegradable
                      ? "Malata"
                      : isRecyclable
                        ? "Recyclable"
                        : "Dili Malata";

                    return (
                      <div
                        key={sch.id}
                        className="rounded-2xl border border-border/60 bg-card p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <h3 className="min-w-0 flex-1 text-[16px] font-semibold leading-snug tracking-tight text-foreground">
                            {areaTitle}
                          </h3>
                          <span
                            className={cn(
                              "shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold",
                              isBiodegradable
                                ? "bg-emerald-600/10 text-emerald-700"
                                : isRecyclable
                                  ? "bg-blue-600/10 text-blue-700"
                                  : "bg-amber-600/10 text-amber-700"
                            )}
                          >
                            {categoryBadgeLabel}
                          </span>
                        </div>

                        <div className="mt-3 flex flex-wrap items-center justify-between gap-x-2 gap-y-1 border-t border-border/60 pt-2.5">
                          <span className="text-[13px] text-muted-foreground">{formattedDays}</span>
                          <span className="ml-auto whitespace-nowrap text-[13px] font-semibold tabular-nums text-foreground">{sch.time}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}

{
  activeTab === "report" && (
    <motion.div
      key="fs-report"
      initial={{ opacity: 0, scale: 0.98, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98, y: 8 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className="fixed inset-0 z-[90] flex flex-col bg-background"
    >
      <div className="shrink-0 border-b border-border/60 bg-background/80 backdrop-blur-md pt-[env(safe-area-inset-top)]">
        <div className="relative flex h-[52px] items-center justify-center px-2">
          <button
            type="button"
            onClick={() => { setActiveTab("map"); haptic(); }}
            className="absolute left-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-foreground transition-all hover:bg-muted active:scale-95 active:bg-muted cursor-pointer"
            aria-label="Back to map"
          >
            <ChevronLeft className="h-6 w-6" strokeWidth={2} />
          </button>
          <h1 className="text-[17px] font-semibold tracking-tight text-foreground">New Report</h1>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4 pb-10">
        {submittedTicket ? (
        <div className="flex min-h-[50vh] flex-col items-center justify-center px-6 py-12 text-center">
          <CheckCircle2 className="h-12 w-12 text-emerald-600" strokeWidth={1.5} />
          <h2 className="mt-4 text-[17px] font-semibold tracking-tight text-foreground">
            Report Dispatched
          </h2>
          <p className="mt-1 max-w-[260px] text-[13px] leading-normal text-muted-foreground">
            Ticket <span className="font-semibold text-emerald-700">{submittedTicket.id}</span> submitted successfully & dispatched.
          </p>

          <button
            type="button"
            onClick={() => {
              setSubmittedTicket(null);
              setPhotoPreview(null);
              setLocationName("");
            }}
            className="mt-6 flex h-12 w-full items-center justify-center rounded-2xl bg-emerald-600 px-6 text-[15px] font-semibold text-white transition-all hover:bg-emerald-700 active:scale-[0.99] cursor-pointer"
          >
            Submit Another Report
          </button>
        </div>
        ) : (
        <form
          onSubmit={handleSubmitReport}
          className={cn(
            "transition-all",
            photoPreview
              ? "space-y-4 rounded-2xl border border-border/60 bg-card p-4"
              : "flex flex-1 flex-col"
          )}
        >
          {/* Photo Upload Zone */}

          {/* Photo Capture Zone */}
          <div className={cn(!photoPreview && "flex flex-1 flex-col")}>
            <input
              type="file"
              accept="image/*"
              capture="environment"
              ref={fileInputRef}
              onChange={handlePhotoChange}
              className="hidden"
            />

            {photoPreview ? (
              <div className="space-y-2.5">
                <p className="text-[13px] text-muted-foreground">
                  Captured Photo
                </p>
                <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-muted">
                  <img src={photoPreview} alt="Captured waste" className="h-52 w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setPhotoPreview(null)}
                    aria-label="Remove photo"
                    className="absolute top-2.5 right-2.5 flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white cursor-pointer active:scale-95 transition-transform"
                  >
                    <Trash2 className="h-5 w-5" strokeWidth={2} />
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex min-h-[60vh] w-full flex-1 flex-col items-center justify-center px-6 py-12 text-center cursor-pointer active:opacity-70 transition-opacity"
              >
                <Camera className="h-16 w-16 text-muted-foreground/40" strokeWidth={1.25} />
                <span className="mt-5 block text-[17px] font-semibold tracking-tight text-foreground">Take a photo</span>
                <span className="mx-auto mt-1 block max-w-[240px] text-[13px] leading-normal text-muted-foreground">
                  Take a photo of the waste or bin on the spot to start your report
                </span>
                <span className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-emerald-600 px-8 text-[15px] font-semibold text-white shadow-sm active:scale-[0.98] transition-transform">
                  Open Camera
                </span>
              </button>
            )}
          </div>

          {/* Fields revealed AFTER photo is captured */}
          {photoPreview && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4 pt-1"
            >
              {/* Issue Category Select */}
              <div>
                <label className="mb-1.5 block text-[13px] text-muted-foreground">
                  Issue Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="h-[50px] w-full rounded-2xl border border-border/60 bg-card px-3.5 text-[16px] text-foreground focus:border-zinc-400 focus:outline-none transition-colors"
                >
                  <option value="Overflowing Bin">Overflowing Bin</option>
                  <option value="Illegal Dumping">Illegal Dumping</option>
                  <option value="Uncollected Waste">Uncollected Waste</option>
                  <option value="Drainage Clog">Drainage Clog</option>
                  <option value="Litter">Street Litter</option>
                </select>
              </div>

              {/* Priority Level Buttons */}
              <div>
                <label className="mb-1.5 block text-[13px] text-muted-foreground">
                  Priority Level
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {["Low", "Medium", "High", "Critical"].map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => {
                        setUrgency(lvl);
                        haptic();
                      }}
                      className={cn(
                        "h-12 rounded-2xl text-[15px] font-semibold transition-colors cursor-pointer",
                        urgency === lvl
                          ? "bg-emerald-600 text-white"
                          : "border border-border/60 bg-card text-muted-foreground active:bg-muted"
                      )}
                    >
                      {lvl}
                    </button>
                  ))}
                </div>
              </div>

              {/* Location Input & GPS */}
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="block text-[13px] text-muted-foreground">
                    Location / Sitio
                  </label>
                  <button
                    type="button"
                    onClick={handleGetLocation}
                    disabled={isLocating}
                    className="flex items-center gap-1 text-[13px] font-semibold text-emerald-600 active:text-emerald-700 cursor-pointer disabled:opacity-60"
                  >
                    <MapPin className="h-4 w-4" strokeWidth={2} />
                    {isLocating ? "Locating..." : "Use My GPS"}
                  </button>
                </div>

                <input
                  type="text"
                  placeholder="e.g. Behind Tejero Chapel, Purok 3"
                  value={locationName}
                  onChange={(e) => {
                    setLocationName(e.target.value);
                  }}
                  onBlur={() => {
                    const formatted = locationName.split(/(\s+)/).map(p => p.trim().length > 0 ? p.charAt(0).toUpperCase() + p.slice(1) : p).join("");
                    setLocationName(formatted);
                  }}
                  className="h-[50px] w-full rounded-2xl border border-border/60 bg-card px-3.5 text-[16px] text-foreground focus:border-zinc-400 focus:outline-none transition-colors"
                  required
                />
                <p className="mt-1 text-[12px] text-muted-foreground">
                  {gpsCoords
                    ? gpsAddress
                      ? `GPS ≈ ${gpsAddress} — still add a landmark.`
                      : "GPS attached — still add a specific landmark."
                    : LOCATION_FORMAT_HINT}
                </p>
              </div>

              {/* Minimalist Confirm Button */}
              <div className="flex gap-3">
                {editingTicketId && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingTicketId(null);
                    setLocationName("");
                    setDescription("");
                    setPhotoPreview(null);
                    switchTab("tickets");
                  }}
                  disabled={isSubmitting}
                  className="flex h-12 w-1/3 items-center justify-center rounded-2xl bg-muted px-4 text-[15px] font-semibold text-foreground active:bg-muted/80 active:scale-[0.99] transition-all cursor-pointer disabled:opacity-60"
                >
                  Cancel
                </button>
              )}
              <button
                type="button"
                onClick={handleSubmitReport}
                disabled={isSubmitting}
                className={cn(
                  "flex h-12 items-center justify-center rounded-2xl bg-emerald-600 px-6 text-[15px] font-semibold text-white transition-all hover:bg-emerald-700 active:scale-[0.99] cursor-pointer disabled:opacity-60",
                  editingTicketId ? "w-2/3" : "w-full"
                )}
              >
                {isSubmitting ? (
                  <RefreshCw className="h-5 w-5 animate-spin" strokeWidth={2} />
                  ) : editingTicketId ? (
                    "Update Report"
                  ) : (
                    "Submit Report"
                  )}
                </button>
              </div>
            </motion.div>
          )}
        </form>
          )}
      </div>
    </motion.div>
  )}

{
  activeTab === "tickets" && (
    <motion.div
      key="fs-tickets"
      initial={{ opacity: 0, scale: 0.98, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98, y: 8 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className="fixed inset-0 z-[90] flex flex-col bg-background"
    >
      <div className="shrink-0 border-b border-border/60 bg-background/80 backdrop-blur-md pt-[env(safe-area-inset-top)]">
        <div className="relative flex h-[52px] items-center justify-center px-2">
          <button
            type="button"
            onClick={() => { setActiveTab("map"); haptic(); }}
            className="absolute left-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-foreground transition-all hover:bg-muted active:scale-95 active:bg-muted cursor-pointer"
            aria-label="Back to map"
          >
            <ChevronLeft className="h-6 w-6" strokeWidth={2} />
          </button>
          <h1 className="text-[17px] font-semibold tracking-tight text-foreground">My Tickets</h1>
        </div>
      </div>
      <div className="flex flex-1 flex-col overflow-y-auto bg-muted/40 pb-10">
        {tickets.filter((t) => t.reporter === residentSession?.name).length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center min-h-[50vh] px-6 py-16 text-center">
            <Ticket className="h-12 w-12 text-muted-foreground/40" strokeWidth={1.5} />
            <h3 className="mt-4 text-[17px] font-semibold tracking-tight text-foreground">No Tickets Yet</h3>
            <p className="mt-1 max-w-[240px] text-[13px] leading-normal text-muted-foreground">When you submit a report, you can track its progress here.</p>
          </div>
        ) : (
          <div className="space-y-2.5 p-4">
            {tickets
              .filter((t) => t.reporter === residentSession?.name)
              .sort((a, b) => b.id.localeCompare(a.id))
              .map((ticket) => (
                <div key={ticket.id} className="rounded-2xl border border-border/60 bg-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[16px] font-semibold tracking-tight text-foreground">
                        {ticket.location}
                      </p>
                      {ticket.description ? (
                        <p className="mt-0.5 line-clamp-2 text-[13px] leading-normal text-muted-foreground">
                          {ticket.description}
                        </p>
                      ) : null}
                    </div>
                    <StatusBadge status={ticket.status} />
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-2.5">
                    <span className="text-[12px] text-muted-foreground">
                      {ticket.createdAt ? new Date(ticket.createdAt).toLocaleDateString() : ticket.date || "—"}
                    </span>
                    <span className="text-[12px] font-medium capitalize text-muted-foreground">
                      {ticket.urgency} Priority
                    </span>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </motion.div>
  )}

{
  activeTab === "profile" && (
    <motion.div
      key="fs-profile"
      initial={{ opacity: 0, scale: 0.98, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98, y: 8 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className="fixed inset-0 z-[90] flex flex-col bg-background"
    >
      <div className="shrink-0 border-b border-border/60 bg-background/80 backdrop-blur-md pt-[env(safe-area-inset-top)]">
        <div className="relative flex h-[52px] items-center justify-center px-2">
          <button
            type="button"
            onClick={() => { setActiveTab("map"); haptic(); }}
            className="absolute left-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-foreground transition-all hover:bg-muted active:scale-95 active:bg-muted cursor-pointer"
            aria-label="Back to map"
          >
            <ChevronLeft className="h-6 w-6" strokeWidth={2} />
          </button>
          <h1 className="text-[17px] font-semibold tracking-tight text-foreground">Profile</h1>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto bg-muted/40 pb-10">
        {/* Centered profile header */}
        <div className="flex flex-col items-center px-4 pb-2 pt-6 text-center">
          <div className="flex h-[72px] w-[72px] items-center justify-center rounded-full bg-emerald-600 text-[28px] font-semibold leading-none text-white shadow-sm">
            {residentSession?.name?.charAt(0)?.toUpperCase() || "R"}
          </div>
          <h2 className="mt-3 text-[20px] font-semibold tracking-tight text-foreground">{residentSession?.name || "Resident"}</h2>
          <p className="mt-0.5 text-[13px] text-muted-foreground">{residentSession?.sitio || "Unknown Sitio"} · Brgy. Tejero, Cebu City</p>
          <span className="mt-2 inline-flex items-center rounded-full bg-emerald-600/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
            Active / Verified
          </span>
        </div>

        {/* Account group */}
        <div className="mt-5 px-4">
          <p className="px-1 pb-1.5 text-[13px] text-muted-foreground">Account</p>
          <div className="divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/60 bg-card">
            <div className="flex min-h-[48px] items-center justify-between gap-3 px-4 py-2.5">
              <span className="shrink-0 text-[15px] text-foreground">Email</span>
              <span className="truncate text-right text-[15px] text-muted-foreground">{residentSession?.email || "—"}</span>
            </div>
            <div className="flex min-h-[48px] items-center justify-between gap-3 px-4 py-2.5">
              <span className="shrink-0 text-[15px] text-foreground">Mobile Phone</span>
              <span className="truncate text-right text-[15px] text-muted-foreground">{residentSession?.phone || "—"}</span>
            </div>
            <div className="flex min-h-[48px] items-center justify-between gap-3 px-4 py-2.5">
              <span className="shrink-0 text-[15px] text-foreground">Reports Filed</span>
              <span className="text-right text-[15px] text-muted-foreground">{`${tickets.length} tickets`}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-5 space-y-2.5 px-4">
          <button
            type="button"
            onClick={() => {
              toast("Profile preferences saved.");
            }}
            className="flex h-12 w-full items-center justify-center rounded-2xl bg-emerald-600 px-6 text-[15px] font-semibold text-white transition-all hover:bg-emerald-700 active:scale-[0.99] cursor-pointer"
          >
            Save Preferences
          </button>
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

      </div>
    </motion.div>
  )}
      </AnimatePresence>
    </div>


  {/* Ticket Detail Full Screen View */}
  <AnimatePresence mode="wait" initial={false}>
  { selectedTicket && (
    <motion.div
      key="fs-ticket-detail"
      initial={{ opacity: 0, scale: 0.98, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98, y: 8 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className="fixed inset-0 z-[95] flex flex-col bg-background"
    >
      <div className="shrink-0 border-b border-border/60 bg-background/80 backdrop-blur-md pt-[env(safe-area-inset-top)]">
        <div className="relative flex h-[52px] items-center justify-center px-2">
          <button
            type="button"
            onClick={() => {
              setSelectedTicket(null);
              setMapFocusTicket(null);
              haptic();
            }}
            className="absolute left-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-foreground transition-all hover:bg-muted active:scale-95 active:bg-muted cursor-pointer"
            aria-label="Back"
          >
            <ChevronLeft className="h-6 w-6" strokeWidth={2} />
          </button>
          <h1 className="text-[17px] font-semibold tracking-tight text-foreground">Details</h1>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto bg-muted/40 pb-10 select-text">
        <div className="p-4 space-y-2.5">
          {selectedTicket.photo ? (
            <img
              src={selectedTicket.photo}
              alt={`Waste report ${selectedTicket.id}`}
              className="h-52 w-full rounded-2xl border border-border/60 object-cover"
            />
          ) : (
            <div className="flex h-28 w-full items-center justify-center rounded-2xl border border-border/60 bg-card">
              <Camera className="h-8 w-8 text-muted-foreground/40" strokeWidth={1.5} />
            </div>
          )}

          <div className="rounded-2xl border border-border/60 bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h2 className="text-[16px] font-semibold tracking-tight text-foreground">{selectedTicket.location}</h2>
                <p className="mt-0.5 text-[13px] text-muted-foreground">{selectedTicket.id}</p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <UrgencyBadge urgency={selectedTicket.urgency} />
                <StatusBadge status={selectedTicket.status} />
              </div>
            </div>
            {selectedTicket.description ? (
              <p className="mt-2 text-[13px] leading-normal text-muted-foreground">
                {selectedTicket.description}
              </p>
            ) : null}
          </div>

          <div className="divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/60 bg-card px-4 py-1">
            <div className="flex min-h-[48px] items-center justify-between gap-3 py-2.5">
              <span className="shrink-0 text-[15px] text-muted-foreground">Category</span>
              <span className="truncate text-right text-[15px] text-foreground">{selectedTicket.category}</span>
            </div>
            <div className="flex min-h-[48px] items-center justify-between gap-3 py-2.5">
              <span className="shrink-0 text-[15px] text-muted-foreground">Barangay</span>
              <span className="truncate text-right text-[15px] text-foreground">{`${selectedTicket.barangay}, ${selectedTicket.city}`}</span>
            </div>
            <div className="flex min-h-[48px] items-center justify-between gap-3 py-2.5">
              <span className="shrink-0 text-[15px] text-muted-foreground">Date</span>
              <span className="text-right text-[15px] tabular-nums text-foreground">{selectedTicket.date}</span>
            </div>
            <div className="flex min-h-[48px] items-center justify-between gap-3 py-2.5">
              <span className="shrink-0 text-[15px] text-muted-foreground">Time</span>
              <span className="text-right text-[15px] tabular-nums text-foreground">{selectedTicket.time}</span>
            </div>
            <div className="flex min-h-[48px] items-center justify-between gap-3 py-2.5">
              <span className="shrink-0 text-[15px] text-muted-foreground">Address</span>
              <span className="text-right text-[15px] text-foreground">{ticketAddress || "—"}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setMapFocusTicket(selectedTicket);
              setSelectedTicket(null);
              setMapZoom(17);
              switchTab("map");
            }}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-6 text-[15px] font-semibold text-white transition-all hover:bg-emerald-700 active:scale-[0.99] cursor-pointer"
          >
            View on Map
          </button>
        </div>
      </div>
    </motion.div>
  )}
  </AnimatePresence>



  {/* Native iOS-style Sign Out Confirmation Alert */ }
{
  showSignOutModal && (
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
            You will need to log back in to access the portal.
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
                clearResidentSession();
                await supabase.auth.signOut();
                setShowSignOutModal(false);
                router.replace("/login");
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
  )
}

<ProductTour
  run={runProductTour}
  onComplete={() => {
    setRunProductTour(false);
    if (residentSession?.id) {
      localStorage.setItem(`bingo_product_tour_completed_${residentSession.id}`, "true");
    }
  }}
  onTabChange={(tabId) => setActiveTab(tabId)}
  activeTab={activeTab}
/>

{ ToastViewport }
    </div >
  );
}
