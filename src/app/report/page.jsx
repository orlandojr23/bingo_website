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
  User,
  Loader2,
} from "lucide-react";
import { TEJERO_SITOS } from "@/lib/mock-data";
import { useTickets, addTicket, updateTicket, removeTicket } from "@/lib/tickets";
import { useAuth } from "@/context/AuthContext";
import { useLiveRoute, getSchedule, getSchedules, scheduleLabel, selectTruckHeading } from "@/lib/live-route";
import { playDing, playTrumpet, useSoundEnabled, setSoundEnabled } from "@/lib/sounds";
import { useRoutePath } from "@/lib/use-route-path";
import { useFleet } from "@/lib/fleet";
import { clearResidentSession } from "@/lib/resident-session";
import { reverseGeocode } from "@/lib/geocode";
import { useSwipeToggle } from "@/lib/use-swipe-toggle";
import { cn, haptic, formatTicketDateTime, formatTicketDateLong, formatTicketTime } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { StatusBadge, UrgencyBadge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapSkeleton, ResidentShellSkeleton } from "@/components/ui/skeletons";
import { InfoRow } from "@/components/ui/info-row";
import { useToast } from "@/components/pwa/Toast";
import {
  useNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "@/lib/notifications";
import OnboardingModal from "@/components/pwa/OnboardingModal";
import ProductTour from "@/components/pwa/ProductTour";

const MapCanvas = dynamic(() => import("@/components/map/map-canvas"), {
  ssr: false,
  loading: () => <MapSkeleton />,
});

const TAB_IDS = ["schedule", "map", "report", "tickets"];

// Map banner is text-only (native style); status glyphs use Lucide icons.

// Map banner is text-only (native style); status glyphs use Lucide icons.

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

// Generous bounding box around Brgy. Tejero. A pin outside it is still
// accepted (the typed landmark is what crews navigate by) but gets a warning
// since it usually means GPS drift or a wrong-area report.
const TEJERO_GPS_BOUNDS = { south: 10.29, north: 10.32, west: 123.89, east: 123.92 };
// Fixes worse than this are flagged so the user can step outdoors and retake.
const POOR_GPS_ACCURACY_M = 100;
// A focused report pin auto-dismisses this long after the last focus event
// (View on Map / marker tap), so it never lingers on the map.
const FOCUS_AUTO_DISMISS_MS = 8000;

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
  // Bumped on every focus event so the auto-dismiss timer re-arms.
  const [focusSignal, setFocusSignal] = useState(0);
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
    autoReroute: true,
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
        live: true,
        title: "Collection complete",
        subtitle: "All pickups complete",
      };
    }
    const point = activeSchedule.routePoints?.[activeTs.stopIndex] || activeSchedule.routePoints?.[0];
    if (activeTs.onsite) {
      return {
        id: "truck-live-arrived",
        live: true,
        title: "Truck arrived",
        subtitle: `Collecting at ${point?.name ?? "your stop"}`,
      };
    }
    return {
      id: "truck-live-enroute",
      live: true,
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

  // Report updates for this resident (e.g. "Your report was cleaned up").
  // Subscribed by user id + display-name key so reports filed under either
  // identity still reach them.
  const [showUpdates, setShowUpdates] = useState(false);
  // Plain array (not memoized): useNotifications derives a new list each
  // render anyway, and the arrival effect below is ref-guarded, so identity
  // churn here is harmless.
  const residentAudiences = [
    ...(residentSession?.id ? [residentSession.id] : []),
    ...(residentSession?.name ? [`resident:${residentSession.name}`] : []),
  ];
  const residentNotifs = useNotifications(residentAudiences);
  const residentUnread = residentNotifs.filter((n) => !n.isRead).length;

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
          title: "No pickup today",
          subtitle: `Next: ${label}${start ? ` at ${start}` : ""}`,
        };
      }
    }
    return {
      id: "pickup-status-none",
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
        title: greetingTitle,
        subtitle: new Date().toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
        }),
      },
      {
        id: "report-action",
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
  const [category, setCategory] = useState("Uncollected Garbage");
  const [urgency, setUrgency] = useState("High");
  const [locationName, setLocationName] = useState("");
  const [barangay, setBarangay] = useState("Tejero");
  const [description, setDescription] = useState("");

  const [gpsCoords, setGpsCoords] = useState(null);
  const [gpsAddress, setGpsAddress] = useState("");
  const [gpsAccuracy, setGpsAccuracy] = useState(null);
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

  // Ref mirror of the live view bounds so dismissal helpers always read the
  // current view without re-creating callbacks on every pan/zoom.
  const mapBoundsRef = useRef(null);
  const handleMapBoundsChange = useCallback((b) => {
    mapBoundsRef.current = b;
    setMapBounds(b);
  }, []);

  // Clearing focus also drops the camera `center` binding back to mapCenter,
  // which would yank the camera. Pin mapCenter to the current view first so
  // dismissal (timer, drag, back) never moves the camera.
  const clearMapFocus = useCallback(() => {
    const b = mapBoundsRef.current;
    if (b) {
      setMapCenter([(b.north + b.south) / 2, (b.east + b.west) / 2]);
    }
    setMapFocusTicket(null);
  }, []);

  // Focused pin auto-dismiss: re-arms on every focus event, cleared on
  // unmount or when a newer focus supersedes it.
  useEffect(() => {
    if (!mapFocusTicket) return;
    const timer = setTimeout(() => {
      clearMapFocus();
    }, FOCUS_AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [mapFocusTicket, focusSignal, clearMapFocus]);
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

  // Ding + toast when a new report update lands. "Seen" is remembered in
  // localStorage per resident, so a reload (or a slow first sync, where the
  // list starts empty and fills in a beat later) never replays old news —
  // only a genuinely newer item fires.
  const notifSeenRef = useRef(undefined);
  const notifSeenKeyRef = useRef(null);
  useEffect(() => {
    const storageKey = residentSession?.id ? `bingo_seen_notif_${residentSession.id}` : null;
    if (notifSeenKeyRef.current !== storageKey) {
      notifSeenKeyRef.current = storageKey;
      notifSeenRef.current = undefined;
    }
    const latest = residentNotifs[0];
    const readStored = () => {
      try {
        return storageKey ? localStorage.getItem(storageKey) : null;
      } catch {
        return null;
      }
    };
    const writeStored = (id) => {
      try {
        if (storageKey && id) localStorage.setItem(storageKey, id);
      } catch {}
    };
    if (notifSeenRef.current === undefined) {
      const stored = readStored();
      if (stored) {
        notifSeenRef.current = stored;
        return;
      }
      // No record yet: an empty list usually means the sync hasn't returned,
      // not that there is nothing — stay uninitialized rather than replaying
      // the first arrivals as new.
      if (residentNotifs.length === 0) return;
      notifSeenRef.current = latest?.id ?? null;
      writeStored(latest?.id);
      return;
    }
    if (latest && latest.id !== notifSeenRef.current) {
      notifSeenRef.current = latest.id;
      writeStored(latest.id);
      if (soundEnabled) playDing();
      toast(latest.title || "New update on your report.");
    }
  }, [residentNotifs, soundEnabled, toast, residentSession?.id]);

  const openUpdate = (notif) => {
    markNotificationRead(notif.id);
    const target = notif.ticketId
      ? tickets.find((t) => String(t.id) === String(notif.ticketId))
      : null;
    setShowUpdates(false);
    if (target) {
      setSelectedTicket(target);
      setMapFocusTicket(null);
      haptic();
    }
  };

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
            t.id === activeTs?.truckId
              ? selectTruckHeading(ts, routePath.heading)
              : selectTruckHeading(ts, null),
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

  const handleGetLocation = (onSuccess, onError) => {
    if (!("geolocation" in navigator)) {
      if (typeof onError === "function") onError(new Error("Geolocation unsupported"));
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
          console.warn("GPS returned an invalid fix:", position.coords);
          setIsLocating(false);
          const err = new Error("Invalid GPS fix");
          if (typeof onError === "function") {
            onError(err);
          } else {
            toast("GPS returned an invalid fix. Step outdoors and try again.", {
              variant: "error",
            });
          }
          return;
        }
        // maximumAge: 0 (below) forces a fresh satellite/Wi-Fi fix — without
        // it the browser may hand back a stale cached position.
        const fixAccuracy = Number.isFinite(accuracy) ? Math.round(accuracy) : null;
        setGpsCoords({ lat: latitude, lng: longitude });
        setGpsAccuracy(fixAccuracy);
        haptic();
        if (typeof onSuccess === "function") onSuccess({ lat: latitude, lng: longitude });

        let address = "";
        try {
          address = await reverseGeocode(latitude, longitude) || "";
        } catch { }
        setGpsAddress(address);

        const accNote = fixAccuracy != null ? ` (±${fixAccuracy}m)` : "";
        const inTejero =
          latitude >= TEJERO_GPS_BOUNDS.south &&
          latitude <= TEJERO_GPS_BOUNDS.north &&
          longitude >= TEJERO_GPS_BOUNDS.west &&
          longitude <= TEJERO_GPS_BOUNDS.east;
        if (!inTejero) {
          toast(
            `GPS pinned${accNote} outside Brgy. Tejero — double-check your landmark so crews can find it.`,
            { variant: "error" }
          );
        } else if (fixAccuracy != null && fixAccuracy > POOR_GPS_ACCURACY_M) {
          toast(
            `GPS pinned${accNote} — accuracy is low. Step outdoors and tap Retake GPS, and add a specific landmark.`,
            { variant: "error" }
          );
        } else {
          toast(
            address
              ? `GPS pinned${accNote} near ${address}. Add a specific landmark so crews can find it.`
              : `GPS pinned${accNote}. Add a specific area or landmark so crews can find it.`
          );
        }
        setIsLocating(false);
      },
      (error) => {
        console.warn("GPS location error:", error);
        setIsLocating(false);
        if (typeof onError === "function") {
          onError(error);
        } else {
          toast("Unable to fetch GPS location. Please enter the street name.", {
            variant: "error",
          });
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const handleEditTicket = useCallback((ticket) => {
    setEditingTicketId(ticket.id);
    setCategory(ticket.category || "Uncollected Garbage");
    setUrgency(ticket.urgency || "High");
    setLocationName(ticket.location || "");
    setBarangay(ticket.barangay || "Tejero");
    setDescription(ticket.description || ticket.notes || "");
    setPhotoPreview(ticket.photo || null);
    if (ticket.lat && ticket.lng) {
      setGpsCoords({ lat: ticket.lat, lng: ticket.lng });
    } else {
      setGpsCoords(null);
    }
    setGpsAccuracy(null);
    setGpsAddress("");
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
      try {
        if (editingTicketId) {
          const patch = {
            location: locationName.trim(),
            barangay: barangay,
            urgency: urgency,
            lat: gpsCoords?.lat || 10.3016,
            lng: gpsCoords?.lng || 123.9086,
            category: category,
            description: description.trim(),
            photo: photoPreview,
          };
          await updateTicket(editingTicketId, patch);
          setSubmittedTicket({ id: editingTicketId, ...patch, timestamp: new Date().toISOString() });
          setEditingTicketId(null);
          haptic(20);
        } else {
          const now = new Date();
          const created = {
            location: locationName.trim(),
            barangay: barangay,
            city: "Cebu City",
            reporter: residentSession?.name || "Resident",
            urgency: urgency,
            status: "Pending",
            date: now.toLocaleDateString("en-CA"),
            time: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            timestamp: now.toISOString(),
            lat: gpsCoords?.lat || 10.3016,
            lng: gpsCoords?.lng || 123.9086,
            category: category,
            description: description.trim() || `Reported ${category} at ${locationName}.`,
            photo: photoPreview,
          };

          const result = await addTicket(created);
          setSubmittedTicket(created);
          // The report itself is saved at this point; only warn if the admin
          // alert didn't go out so it can be retried/reported.
          if (result && result.notified === false) {
            toast("Report saved, but the admin alert failed to send.", { variant: "error" });
          } else if (result && result.notified && !result.remote) {
            toast("Report saved, but the admin alert stayed on this device. Check connection/RLS.", { variant: "error" });
          }
          haptic(20);
        }
      } catch (err) {
        console.error("[Report] Submit failed:", err);
        toast("Failed to submit report. Please check your connection and try again.", {
          variant: "error",
        });
      } finally {
        setIsSubmitting(false);
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
    return <ResidentShellSkeleton />;
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
            // Popups off so a marker tap re-opens the ticket Details screen
            // instead of a Leaflet popup (round trip: Tickets → Details →
            // View on Map → tap marker → Details).
            showTicketPopup={false}
            onSelectTicket={(t) => {
              closeAllSheets();
              setSelectedTicket(t);
              setMapFocusTicket(t);
              setFocusSignal((s) => s + 1);
              setMapZoom(17);
              haptic();
            }}
            onMapDrag={() => {
              if (selectedTicket) {
                setSelectedTicket(null);
              }
              if (mapFocusTicket) {
                clearMapFocus();
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

        {/* Native status banner */}
        <div className="pointer-events-auto absolute top-0 inset-x-0 z-20 w-full border-b border-border/60 bg-background/80 backdrop-blur-md flex items-center select-none overflow-hidden px-4 pt-[calc(env(safe-area-inset-top)+12px)] pb-3">
          {/* Left: Live status readout */}
          <div data-tour="live-banner" onClick={handleHeaderClick} className="min-w-0 flex-1 overflow-hidden relative flex items-center cursor-pointer">
            {!mapReady ? (
              <div className="flex items-center gap-3 w-full">
                <div className="h-2.5 w-2/5 rounded-full bg-foreground/10 animate-pulse" />
              </div>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentBanner.id}
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
          {/* Right: Report updates bell */}
          <button
            type="button"
            onClick={() => { setShowUpdates(true); haptic(); }}
            className="relative ml-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-foreground transition-all hover:bg-muted active:scale-95 cursor-pointer"
            aria-label="Report updates"
          >
            <Bell className="h-5 w-5" strokeWidth={2} />
            {residentUnread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold leading-none text-white">
                {residentUnread > 9 ? "9+" : residentUnread}
              </span>
            )}
          </button>
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
                    handleGetLocation(
                      (coords) => centerOn(coords),
                      () => {
                        // GPS denied/unavailable: fall back to the pilot area
                        // (Brgy. Tejero Hall) instead of leaving the map put.
                        setMapCenter([10.3025, 123.9095]);
                        setMapZoom(16);
                        setFlySignal((s) => s + 1);
                        toast("GPS unavailable — showing Brgy. Tejero Hall.");
                      }
                    );
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


        {/* Bottom Navigation Bar - native tab bar with center action, only visible
            on map and hidden beneath full-screen overlays (Updates, Details),
            which sit below its z-index */}
        {activeTab === "map" && !showUpdates && !selectedTicket && (
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
              onClick={() => { setActiveTab("report"); setTimeout(() => fileInputRef.current?.click(), 150); haptic(); }}
              className="relative flex flex-col items-center justify-end pb-3 cursor-pointer"
            >
              <span data-tour="nav-tab-report" className="absolute -top-7 left-1/2 flex h-14 w-14 -translate-x-1/2 items-center justify-center rounded-full bg-emerald-600 text-white shadow-[0_8px_20px_rgba(5,150,105,0.35)] transition-transform active:scale-95">
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
              <User className="h-6 w-6" strokeWidth={activeTab === "profile" ? 2.25 : 1.75} />
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
              <div className="shrink-0 border-b border-border/60 bg-background/80 backdrop-blur-md pt-[calc(env(safe-area-inset-top)+12px)] pb-3">
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
      <div className="shrink-0 border-b border-border/60 bg-background/80 backdrop-blur-md pt-[calc(env(safe-area-inset-top)+12px)] pb-3">
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
          <p className="mt-2 text-[12px] tabular-nums text-muted-foreground">
            {submittedTicket.timestamp
              ? formatTicketDateTime(submittedTicket.timestamp)
              : `${formatTicketDateTime(new Date().toISOString())}`}
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
                  <option value="Uncollected Garbage">Uncollected Garbage</option>
                  <option value="Illegal Dumping">Illegal Dumping</option>
                  <option value="Missed Collection">Missed Collection</option>
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
                    {isLocating ? "Locating..." : gpsCoords ? "Retake GPS" : "Use My GPS"}
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
                    ? `${gpsAccuracy != null ? `GPS ±${gpsAccuracy}m` : "GPS"}${gpsAddress ? ` ≈ ${gpsAddress}` : " attached"} — still add a landmark.`
                    : LOCATION_FORMAT_HINT}
                </p>
              </div>

              {/* Additional Details */}
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="block text-[13px] text-muted-foreground">
                    Additional Details <span className="text-muted-foreground/70">(optional)</span>
                  </label>
                  <span className="text-[12px] tabular-nums text-muted-foreground">
                    {description.length}/500
                  </span>
                </div>
                <textarea
                  rows={3}
                  maxLength={500}
                  placeholder="e.g. Two black bags beside the canal, blocking the sidewalk since yesterday…"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="min-h-[96px] w-full resize-none rounded-2xl border border-border/60 bg-card px-3.5 py-3 text-[16px] leading-relaxed text-foreground placeholder:text-muted-foreground/60 focus:border-zinc-400 focus:outline-none transition-colors"
                />
                <p className="mt-1 text-[12px] text-muted-foreground">
                  Crews and admins will see this note on your report.
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
      <div className="shrink-0 border-b border-border/60 bg-background/80 backdrop-blur-md pt-[calc(env(safe-area-inset-top)+12px)] pb-3">
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
          <button
            type="button"
            onClick={() => { setShowUpdates(true); haptic(); }}
            className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-foreground transition-all hover:bg-muted active:scale-95 active:bg-muted cursor-pointer"
            aria-label="Report updates"
          >
            <Bell className="h-5 w-5" strokeWidth={2} />
            {residentUnread > 0 && (
              <span className="absolute top-0.5 right-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 text-[10px] font-bold leading-none text-white">
                {residentUnread > 9 ? "9+" : residentUnread}
              </span>
            )}
          </button>
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
              .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
              .map((ticket) => (
                <div
                  key={ticket.id}
                  onClick={() => { setSelectedTicket(ticket); haptic(); }}
                  className="rounded-2xl border border-border/60 bg-card p-4 cursor-pointer active:scale-[0.99] transition-transform"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">
                        {ticket.category || "Waste Report"}
                      </p>
                      <p className="truncate text-[16px] font-semibold tracking-tight text-foreground">
                        {ticket.location}
                      </p>
                      {ticket.description || ticket.notes ? (
                        <p className="mt-0.5 line-clamp-1 text-[13px] leading-normal text-muted-foreground">
                          {ticket.description || ticket.notes}
                        </p>
                      ) : null}
                    </div>
                    <StatusBadge status={ticket.status} />
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-2.5">
                    <span className="text-[12px] tabular-nums text-muted-foreground">
                      {ticket.timestamp
                        ? formatTicketDateTime(ticket.timestamp)
                        : `${ticket.date || "—"}${ticket.time ? ` · ${ticket.time}` : ""}`}
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
      <div className="shrink-0 border-b border-border/60 bg-background/80 backdrop-blur-md pt-[calc(env(safe-area-inset-top)+12px)] pb-3">
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
      <div className="shrink-0 border-b border-border/60 bg-background/80 backdrop-blur-md pt-[calc(env(safe-area-inset-top)+12px)] pb-3">
        <div className="relative flex h-[52px] items-center justify-center px-2">
          <button
            type="button"
            onClick={() => {
              setSelectedTicket(null);
              clearMapFocus();
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
                <p className="mt-0.5 text-[13px] text-muted-foreground">{selectedTicket.category || "Waste Report"}</p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <UrgencyBadge urgency={selectedTicket.urgency} />
                <StatusBadge status={selectedTicket.status} />
              </div>
            </div>
            {selectedTicket.description || selectedTicket.notes ? (
              <p className="mt-2 text-[13px] leading-normal text-muted-foreground">
                {selectedTicket.description || selectedTicket.notes}
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
              <span className="truncate text-right text-[15px] text-foreground">{`${selectedTicket.barangay}, ${selectedTicket.city || "Cebu City"}`}</span>
            </div>
            <div className="flex min-h-[48px] items-center justify-between gap-3 py-2.5">
              <span className="shrink-0 text-[15px] text-muted-foreground">Date submitted</span>
              <span className="text-right text-[15px] tabular-nums text-foreground">
                {selectedTicket.timestamp
                  ? formatTicketDateLong(selectedTicket.timestamp)
                  : selectedTicket.date || "—"}
              </span>
            </div>
            <div className="flex min-h-[48px] items-center justify-between gap-3 py-2.5">
              <span className="shrink-0 text-[15px] text-muted-foreground">Time submitted</span>
              <span className="text-right text-[15px] tabular-nums text-foreground">
                {selectedTicket.timestamp
                  ? formatTicketTime(selectedTicket.timestamp)
                  : selectedTicket.time || "—"}
              </span>
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
              setFocusSignal((s) => s + 1);
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

  {/* Report Updates Full Screen View */}
  <AnimatePresence mode="wait" initial={false}>
  { showUpdates && (
    <motion.div
      key="fs-updates"
      initial={{ opacity: 0, scale: 0.98, y: 8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98, y: 8 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className="fixed inset-0 z-[94] flex flex-col bg-background"
    >
      <div className="shrink-0 border-b border-border/60 bg-background/80 backdrop-blur-md pt-[calc(env(safe-area-inset-top)+12px)] pb-3">
        <div className="relative flex h-[52px] items-center justify-center px-2">
          <button
            type="button"
            onClick={() => { setShowUpdates(false); haptic(); }}
            className="absolute left-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-foreground transition-all hover:bg-muted active:scale-95 active:bg-muted cursor-pointer"
            aria-label="Back"
          >
            <ChevronLeft className="h-6 w-6" strokeWidth={2} />
          </button>
          <h1 className="text-[17px] font-semibold tracking-tight text-foreground">Updates</h1>
          {residentUnread > 0 && (
            <button
              type="button"
              onClick={() => { markAllNotificationsRead(residentAudiences); haptic(); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[13px] font-semibold text-emerald-600 active:text-emerald-700 cursor-pointer"
            >
              Mark all read
            </button>
          )}
        </div>
      </div>
      <div className="flex flex-1 flex-col overflow-y-auto bg-muted/40 pb-10">
        {residentNotifs.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center min-h-[50vh] px-6 py-16 text-center">
            <Bell className="h-12 w-12 text-muted-foreground/40" strokeWidth={1.5} />
            <h3 className="mt-4 text-[17px] font-semibold tracking-tight text-foreground">No Updates Yet</h3>
            <p className="mt-1 max-w-[240px] text-[13px] leading-normal text-muted-foreground">When the crew acts on your reports, you&apos;ll see it here.</p>
          </div>
        ) : (
          <div className="space-y-2.5 p-4">
            {residentNotifs.map((notif) => (
              <button
                key={notif.id}
                type="button"
                onClick={() => openUpdate(notif)}
                className="w-full rounded-2xl border border-border/60 bg-card p-4 text-left cursor-pointer active:scale-[0.99] transition-transform"
              >
                <div className="flex items-start gap-3">
                  {notif.type === "Resolved" ? (
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" strokeWidth={2} />
                  ) : (
                    <Ticket className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" strokeWidth={2} />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className={cn("text-[15px] tracking-tight text-foreground", !notif.isRead ? "font-semibold" : "font-medium")}>
                        {notif.title}
                      </p>
                      {!notif.isRead && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-emerald-500" />}
                    </div>
                    <p className="mt-0.5 line-clamp-3 text-[13px] leading-normal text-muted-foreground">
                      {notif.message}
                    </p>
                    <p className="mt-2 text-[12px] tabular-nums text-muted-foreground">
                      {notif.at ? formatTicketDateTime(notif.at) : "—"}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
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
