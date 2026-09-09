"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Play,
  CheckCircle2,
  LogOut,
  Eye,
  EyeOff,
  Loader2,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { mockPilotData, mockTickets } from "@/lib/mock-data";
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
} from "@/lib/live-route";
import { cn, haptic } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useRoutePath } from "@/lib/use-route-path";
import { useFleet } from "@/lib/fleet";
import { getDriverSession, clearDriverSession } from "@/lib/driver-session";
import { changeDriverPassword } from "@/lib/driver-accounts";
import { useSwipeToggle } from "@/lib/use-swipe-toggle";
import { MapSkeleton } from "@/components/ui/skeletons";
import PasswordStrengthHint from "@/components/ui/password-strength-hint";
import { useToast } from "@/components/pwa/Toast";
import BottomSheet from "@/components/pwa/BottomSheet";
import { supabase } from "@/lib/supabase";

// Minimalist High-DPI Leaflet MapCanvas
const MapCanvas = dynamic(() => import("@/components/map/map-canvas"), {
  ssr: false,
  loading: () => <MapSkeleton />,
});

const TAB_IDS = ["route", "assignment", "history"];

// 3D Vector SVG Icons for Action Buttons & Banners
function Waze3DFocusTruckIcon({ className = "h-9 w-9" }) {
  return (
    <svg viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <filter id="driverFocusTruckShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1.5" stdDeviation="1" floodColor="#000000" floodOpacity="0.3" />
        </filter>
      </defs>
      <g filter="url(#driverFocusTruckShadow)">
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

function Waze3DHeaderTruckIcon({ className = "h-8 w-8" }) {
  return (
    <svg viewBox="0 0 44 36" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <filter id="driverSideTruckShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1.5" stdDeviation="1" floodColor="#0f172a" floodOpacity="0.3" />
        </filter>
        <linearGradient id="driverSideBodyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="40%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
        <linearGradient id="driverSideCabGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#047857" />
        </linearGradient>
        <linearGradient id="driverSideWindowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#e0f2fe" />
          <stop offset="100%" stopColor="#38bdf8" />
        </linearGradient>
      </defs>

      <g filter="url(#driverSideTruckShadow)">
        {/* Chassis Under-Frame */}
        <rect x="5" y="24" width="34" height="3" rx="1" fill="#0f172a" />

        {/* --- REAR COMPACTOR CONTAINER --- */}
        {/* Main Compactor Body Box */}
        <path d="M 5 9 C 5 7.5 6.2 6.5 7.5 6.5 H 25 V 24 H 5 V 9 Z" fill="url(#driverSideBodyGrad)" stroke="#047857" strokeWidth="0.8" />
        
        {/* Top 3D Roof Highlight Plate */}
        <path d="M 7 7.5 H 25 V 10.5 H 6.5 C 6.5 9.5 7 7.5 7 7.5 Z" fill="#6ee7b7" opacity="0.65" />

        {/* Compactor Rib Grooves */}
        <line x1="10" y1="7" x2="10" y2="23" stroke="#047857" strokeWidth="1.2" />
        <line x1="15" y1="7" x2="15" y2="23" stroke="#047857" strokeWidth="1.2" />
        <line x1="20" y1="7" x2="20" y2="23" stroke="#047857" strokeWidth="1.2" />

        {/* Yellow Hazard Accents on Body */}
        <rect x="5.5" y="14" width="3" height="1.8" rx="0.4" fill="#facc15" />
        <rect x="5.5" y="18" width="3" height="1.8" rx="0.4" fill="#facc15" />

        {/* Rear Hopper Loader Unit */}
        <path d="M 2.5 13 L 5 11 V 24 H 3 C 2.5 24 2 23.5 2 23 V 14 C 2 13.5 2.2 13 2.5 13 Z" fill="#064e3b" stroke="#047857" strokeWidth="0.6" />
        <rect x="1.5" y="21" width="2" height="2" rx="0.5" fill="#facc15" />

        {/* --- FRONT DRIVER CAB --- */}
        {/* Cab Hood Structure */}
        <path d="M 25 11 H 35 C 37.5 11 39 12.8 39 15 V 24 H 25 V 11 Z" fill="url(#driverSideCabGrad)" stroke="#047857" strokeWidth="0.8" />

        {/* Glossy Sky Blue Side Window */}
        <path d="M 27 13 H 34 C 35.2 13 36 13.8 36 15 V 18 H 27 V 13 Z" fill="url(#driverSideWindowGrad)" stroke="#e0f2fe" strokeWidth="0.6" />
        <line x1="31" y1="13.5" x2="34" y2="17.5" stroke="#ffffff" strokeWidth="1" opacity="0.85" />

        {/* Door Handle & Side Mirror Bracket */}
        <rect x="28" y="19.5" width="2.5" height="1" rx="0.3" fill="#cbd5e1" />
        <rect x="36.5" y="14" width="1.5" height="3" rx="0.4" fill="#047857" />

        {/* Front Bumper & LED Headlight */}
        <path d="M 38.5 20 H 40.5 C 41 20 41.5 20.5 41.5 21 V 24 H 38.5 V 20 Z" fill="#1e293b" />
        <rect x="38" y="21" width="2.5" height="2" rx="0.5" fill="#facc15" />

        {/* --- 3D WHEELS --- */}
        {/* Rear Dual Wheels */}
        <g>
          <circle cx="10" cy="25" r="4.2" fill="#18181b" stroke="#09090b" strokeWidth="0.6" />
          <circle cx="10" cy="25" r="2.2" fill="#e4e4e7" />
          <circle cx="10" cy="25" r="1.1" fill="#18181b" />
        </g>
        <g>
          <circle cx="18.5" cy="25" r="4.2" fill="#18181b" stroke="#09090b" strokeWidth="0.6" />
          <circle cx="18.5" cy="25" r="2.2" fill="#e4e4e7" />
          <circle cx="18.5" cy="25" r="1.1" fill="#18181b" />
        </g>
        {/* Front Steering Wheel */}
        <g>
          <circle cx="33" cy="25" r="4.2" fill="#18181b" stroke="#09090b" strokeWidth="0.6" />
          <circle cx="33" cy="25" r="2.2" fill="#e4e4e7" />
          <circle cx="33" cy="25" r="1.1" fill="#18181b" />
        </g>
      </g>
    </svg>
  );
}

function Waze3DWavingHandIcon({ className = "h-8 w-8" }) {
  return (
    <span className="text-[26px] select-none leading-none inline-block filter drop-shadow-[0_2px_4px_rgba(217,119,6,0.35)] shrink-0">
      👋
    </span>
  );
}

function Waze3DTargetIcon({ className = "h-9 w-9" }) {
  return (
    <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <linearGradient id="driverTargetGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
        <filter id="driverTargetShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1.5" stdDeviation="1" floodColor="#000000" floodOpacity="0.25" />
        </filter>
      </defs>
      <g filter="url(#driverTargetShadow)">
        <circle cx="18" cy="18" r="13" fill="none" stroke="url(#driverTargetGrad)" strokeWidth="3" />
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

function Waze3DPlayIcon({ className = "h-4 w-4" }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <linearGradient id="playGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
      </defs>
      <circle cx="16" cy="16" r="12" fill="url(#playGrad)" />
      <polygon points="13,10 22,16 13,22" fill="#ffffff" />
    </svg>
  );
}

function Waze3DRouteIcon({ className = "h-4 w-4" }) {
  return (
    <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <filter id="assignment3dShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1.5" stdDeviation="1.2" floodColor="#0f172a" floodOpacity="0.25" />
        </filter>
        <linearGradient id="assignBoardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#1d4ed8" />
        </linearGradient>
        <linearGradient id="assignPaperGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#f1f5f9" />
        </linearGradient>
        <linearGradient id="assignClipGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#94a3b8" />
          <stop offset="50%" stopColor="#cbd5e1" />
          <stop offset="100%" stopColor="#64748b" />
        </linearGradient>
        <linearGradient id="assignPinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ef4444" />
          <stop offset="100%" stopColor="#b91c1c" />
        </linearGradient>
      </defs>

      <g filter="url(#assignment3dShadow)">
        {/* 3D Board Base Side Depth */}
        <rect x="5.5" y="6.5" width="20" height="25" rx="3.5" fill="#1e3a8a" />
        
        {/* Main Board Face */}
        <rect x="5.5" y="4.5" width="20" height="25" rx="3.5" fill="url(#assignBoardGrad)" />

        {/* Paper Sheet */}
        <rect x="8" y="8.5" width="15" height="19" rx="2" fill="url(#assignPaperGrad)" />

        {/* Paper Checklist / Route lines */}
        <rect x="10.5" y="11.5" width="6.5" height="2" rx="1" fill="#3b82f6" />
        <rect x="10.5" y="15.5" width="10" height="1.5" rx="0.75" fill="#94a3b8" />
        <rect x="10.5" y="19" width="8" height="1.5" rx="0.75" fill="#94a3b8" />
        <rect x="10.5" y="22.5" width="6" height="1.5" rx="0.75" fill="#94a3b8" />

        {/* Green Checkmark Badge */}
        <circle cx="20" cy="12.5" r="2.5" fill="#10b981" />
        <path d="M 18.8 12.5 L 19.6 13.3 L 21.2 11.7" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />

        {/* Metallic Top Clip */}
        <rect x="11.5" y="3" width="8" height="3" rx="1" fill="url(#assignClipGrad)" />
        <rect x="13.5" y="2" width="4" height="2" rx="0.75" fill="#475569" />

        {/* 3D Floating Location Pin Overlay */}
        <g transform="translate(4, 3)">
          <path d="M 22 17 C 22 21 18 24.5 18 24.5 C 18 24.5 14 21 14 17 C 14 14.8 15.8 13 18 13 C 20.2 13 22 14.8 22 17 Z" fill="url(#assignPinGrad)" />
          <circle cx="18" cy="17" r="1.8" fill="#ffffff" />
        </g>
      </g>
    </svg>
  );
}

function Waze3DCleanIcon({ className = "h-4 w-4" }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect x="8" y="12" width="16" height="14" rx="2" fill="#10b981" />
      <path d="M 12 8 H 20 V 12 H 12 Z" fill="#047857" />
      <path d="M 12 18 L 15 21 L 21 15" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between text-xs py-1">
      <span className="text-muted-foreground font-medium">{label}</span>
      <span className="font-semibold text-foreground tracking-tight tabular-nums">{value}</span>
    </div>
  );
}

// Compact, truthful area tagline for the header banners: the first pickup
// stop plus how many more stops follow, so a multi-stop assignment never
// reads as a single sitio. Falls back to the zone name when a schedule
// carries no stop list.
function assignedAreaTagline(schedule, zone) {
  if (!schedule) return null;
  const names = (schedule.routePoints || []).map((p) => p.name).filter(Boolean);
  if (!names.length) {
    return zone ? zone.name.split("&")[0].trim() : scheduleLabel(schedule);
  }
  if (names.length === 1) return names[0];
  return `${names[0]} + ${names.length - 1} more stop${names.length === 2 ? "" : "s"}`;
}

export default function DriverPage() {
  const [selectedTruckId, setSelectedTruckId] = useState("TRK-01");
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const [wakeLockSupported, setWakeLockSupported] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [batteryLevel, setBatteryLevel] = useState(null);
  const [isCharging, setIsCharging] = useState(false);
  const [activeTab, setActiveTab] = useState("route"); // "route" | "assignment"
  const [isMapSheetExpanded, setIsMapSheetExpanded] = useState(false);
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

  // Profile & Logout Modals
  const [showProfile, setShowProfile] = useState(false);
  const [showSignOutModal, setShowSignOutModal] = useState(false);

  // Change Password (settings sheet)
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
      
      supabase.from('profiles').select('role, full_name, id').eq('id', session.user.id).single().then(({ data }) => {
        const role = data?.role || session.user.user_metadata?.role;
        if (role !== 'driver') {
          router.replace("/driver-login");
        } else {
          setDriverSession({ email: session.user.email, name: data?.full_name || session.user.user_metadata?.full_name || "Driver", id: session.user.id });
          setSessionReady(true);
        }
      });
    });
  }, [router]);

  // Live Driver Tickets State
  const [driverTickets, setDriverTickets] = useState(mockTickets);

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

  const handleChangePassword = () => {
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

    setTimeout(() => {
      const result = changeDriverPassword(driverSession?.email || "", currentPassword, newPassword);
      setPwSaving(false);
      if (result === "wrong-current") {
        setPwErrors({ current: "Your current password is incorrect." });
        return;
      }
      if (result === "no-account") {
        setPwErrors({ current: "Account not found. Please sign out and sign in again." });
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
    }, 700);
  };

  const live = useLiveRoute();
  const fleet = useFleet();
  const truckState = live.trucks[selectedTruckId];
  const isOnDuty =
    !!truckState &&
    (truckState.phase === "enroute" || truckState.phase === "onsite") &&
    truckState.tracking.isActive;

  const currentTruck =
    fleet.find((t) => t.id === selectedTruckId) || fleet[0] || { id: "—", plate: "—", driver: "—", capacity: "—" };

  const liveDriver = live.driverByTruck[selectedTruckId] ?? currentTruck.driver;

  const assignedSchedule = useMemo(() => {
    const status = live.scheduleStatus;
    const mine = getSchedules().filter(
      (s) => s.activeTruckId === selectedTruckId
    );
    const inProgress = mine.filter((s) => status[s.id] === "In Progress");
    const scheduled = mine.filter((s) => status[s.id] === "Scheduled" || status[s.id] === "Assigned" || status[s.id] === "Accepted");
    return (
      inProgress[inProgress.length - 1] ||
      scheduled[scheduled.length - 1] ||
      null
    );
  }, [selectedTruckId, live]);

  // How many routes are still queued for this truck — drives the banner's
  // "N new assignments" headline so it stays truthful with multiple queued.
  const pendingAssignments = useMemo(() => {
    const status = live.scheduleStatus;
    return getSchedules().filter(
      (s) =>
        s.activeTruckId === selectedTruckId &&
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
  });

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
        Icon: Waze3DCleanIcon,
        title: "Route completed",
        subtitle: zoneName ? `Next up: ${zoneName}` : "No more routes today",
      };
    }
    if (isOnDuty && truckState?.phase === "onsite") {
      return {
        id: "status",
        Icon: Waze3DHeaderTruckIcon,
        title: `Collecting at ${currentPoint?.name ?? "stop"}`,
        subtitle: `Stop ${(truckState?.stopIndex ?? 0) + 1} of ${routePoints.length}`,
      };
    }
    if (isOnDuty) {
      return {
        id: "status",
        Icon: Waze3DHeaderTruckIcon,
        title: `En route to ${currentPoint?.name ?? "next stop"}`,
        subtitle: `Stop ${(truckState?.stopIndex ?? 0) + 1} of ${routePoints.length}${startTime ? ` • ${startTime}` : ""}`,
      };
    }
    if (isPaused) {
      return {
        id: "status",
        Icon: Waze3DHeaderTruckIcon,
        title: "Route paused",
        subtitle: "Start Route to resume",
      };
    }
    if (assignedSchedule) {
      return {
        id: "status",
        Icon: Waze3DRouteIcon,
        title: `${pendingAssignments} new assignment${pendingAssignments === 1 ? "" : "s"}`,
        subtitle: `${zoneName ?? "New route"}${startTime ? ` • ${startTime}` : ""}`,
      };
    }

    return {
      id: "greeting",
      mascot: "/mascot/star-pose.png",
      title: greetingTitle,
      subtitle: `${new Date().toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
      })}`,
    };
  }, [greetingTitle, assignedAreaName, assignedSchedule, truckState, isOnDuty, currentPoint, routePoints.length, pendingAssignments]);

  const pendingCount = driverTickets.filter((t) => t.status !== "Resolved").length;

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("tab");
    if (TAB_IDS.includes(t)) setActiveTab(t);
  }, []);

  const switchTab = (id) => {
    haptic();
    setActiveTab(id);
    window.history.replaceState(null, "", `?tab=${id}`);
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
      }
      releaseWakeLock();
    };
  }, []);

  const startGpsWatch = () => {
    if (watchIdRef.current !== null || !("geolocation" in navigator)) return;
    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, speed, heading, accuracy } = pos.coords;
        setCoords({
          lat: latitude,
          lng: longitude,
          speed: speed ? Math.round(speed * 3.6) : 0,
          heading: heading || 90,
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
            heading: heading != null ? (Math.round(heading) + 90) % 360 : 90,
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
    watchIdRef.current = id;
  };

  const stopGpsWatch = async () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
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
      const scheduleId = startRoute(selectedTruckId);
      if (!scheduleId) {
        toast("No route assignments.");
        return;
      }
      setBroadcastStatus("Broadcasting live");
      await requestWakeLock();
      startGpsWatch();

      // Waze Navigation Camera Mode: Focus truck, collapse bottom sheet, set zoom 18 & fly camera
      setTruckFocused(true);
      setIsMapSheetExpanded(false);
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
      setIsMapSheetExpanded(false);
      const tracking = truckState?.tracking;
      if (tracking?.lat != null && tracking?.lng != null) {
        setMapCenter([tracking.lat, tracking.lng]);
      }
      setMapZoom(18);
      setFlySignal((s) => s + 1);

      toast(`En route to ${next?.name ?? "next stop"}.`);
      return;
    }

    completeRoute(selectedTruckId);
    await stopGpsWatch();
    const next = getSchedules().find(
      (s) =>
        s.activeTruckId === selectedTruckId &&
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

  const handleResolveTicket = (ticketId) => {
    setDriverTickets((prev) =>
      prev.map((t) => (t.id === ticketId ? { ...t, status: "Resolved" } : t))
    );
    haptic(15);
    toast(`Ticket ${ticketId} marked Cleaned Up.`);
  };

  const trucksForMap = useMemo(() => {
    if (!currentTruck || !truckState) return [];
    return [
      {
        id: currentTruck.id,
        plate: currentTruck.plate,
        driver: liveDriver,
        capacity: currentTruck.capacity,
        lat: truckState.tracking.lat,
        lng: truckState.tracking.lng,
        heading: driverRoute.heading ?? truckState.tracking.heading,
        eta: isOnDuty ? "Active On Route" : "Standby",
        isActive: truckState.tracking.isActive,
      },
    ];
  }, [currentTruck, truckState, isOnDuty, driverRoute.heading, liveDriver]);

  // Waze-style course-up camera while driving: heading up, auto-follow truck.
  // Use the live travel heading so the camera matches actual motion.
  const navBearing = isOnDuty
    ? Math.round(truckState?.tracking.heading ?? driverRoute.heading ?? 0)
    : null;

  useEffect(() => {
    if (isOnDuty) {
      setTruckFocused(true);
      setMapZoom(17);
      if (watchIdRef.current === null && typeof window !== "undefined") {
        setBroadcastStatus("Broadcasting live");
        requestWakeLock();
        startGpsWatch();
      }
      if (truckState?.tracking?.lat != null && truckState?.tracking?.lng != null) {
        setMapCenter([truckState.tracking.lat, truckState.tracking.lng]);
      }
    } else {
      stopGpsWatch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnDuty]);

  const trackLat = truckState?.tracking.lat;
  const trackLng = truckState?.tracking.lng;
  useEffect(() => {
    if (isOnDuty && truckFocused && trackLat != null && trackLng != null) {
      setMapCenter([trackLat, trackLng]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trackLat, trackLng]);

  if (!sessionReady) {
    return (
      <div className="flex h-dvh w-full items-center justify-center bg-background">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-emerald-500/30 border-t-emerald-500" />
      </div>
    );
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
            routes={[
              isOnDuty && truckState?.phase !== "completed" && driverRoute.positions.length >= 2 && { id: `${routeScheduleId ?? "driver-route"}-leg`, ...driverRoute },
              driverFuturePath.positions.length >= 2 && { id: `${routeScheduleId ?? "driver-route"}-future-${dStopIdx}`, ...driverFuturePath },
            ].filter(Boolean)}
            mapMode="pins"
            currentStop={driverCurrentStop}
            upcomingStops={driverUpcomingStops}
            center={mapCenter}
            zoom={mapZoom}
            onMapReady={handleMapReady}
            onMapDrag={() => {
              if (isMapSheetExpanded) {
                setIsMapSheetExpanded(false);
              }
              if (truckFocused) {
                setTruckFocused(false);
              }
            }}
            onBoundsChange={handleMapBoundsChange}
            flySignal={flySignal}
            rotatable
            bearing={navBearing}
            perspective3D={false}
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

        {/* Waze-Style Flush Top Navigation Banner */}
        <div className="pointer-events-auto absolute top-0 inset-x-0 z-20 w-full border-b border-border bg-card/98 px-5 py-4 text-foreground backdrop-blur-md flex items-center justify-between gap-3.5 select-none overflow-hidden h-20 shadow-sm">
          {/* Left: Dynamic 3D Icon & Slide-from-Top Readout */}
          <div className="min-w-0 flex-1 overflow-hidden relative h-14 flex items-center">
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
                key={`${currentBanner.id}-${currentBanner.title}`}
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 20, opacity: 0 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="flex items-center gap-3.5 min-w-0 w-full"
              >
                {currentBanner.mascot ? (
                  <div className="flex h-14 w-14 items-center justify-center shrink-0">
                    <img
                      src={currentBanner.mascot}
                      alt="Binny Mascot"
                      className="h-13 w-13 shrink-0 object-contain drop-shadow-xs"
                    />
                  </div>
                ) : currentBanner.Icon ? (
                  <div className="flex h-10 w-10 items-center justify-center shrink-0">
                    <currentBanner.Icon className="h-8 w-8 shrink-0" />
                  </div>
                ) : null}

                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-semibold tracking-tight text-foreground truncate leading-tight">
                    {currentBanner.title}
                  </h3>
                  {currentBanner.subtitle && (
                    <p className="text-sm font-semibold text-emerald-800 truncate leading-tight mt-1">
                      {currentBanner.subtitle}
                    </p>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
            )}
          </div>

          {/* Right: Top-Right Circular Profile Button */}
          <button
            type="button"
            onClick={() => {
              setIsMapSheetExpanded(false);
              setShowProfile(true);
              haptic();
            }}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-sm font-semibold leading-none text-white shadow-xs hover:bg-emerald-700 active:scale-95 transition-all cursor-pointer border border-emerald-500/30"
            title="Driver Terminal & Settings"
            aria-label="Driver Terminal & Settings"
          >
            {driverSession?.name?.charAt(0)?.toUpperCase() || "D"}
          </button>
        </div>

        {/* Floating Circular 3D Map Action Buttons (Option B: Symmetrical Left & Right Split) */}
        {/* 1. Bottom-Left: Focus Active Truck (slides in when the truck is out of view, out when centered) */}
        <div className="pointer-events-none absolute bottom-[104px] left-4 z-20">
          <AnimatePresence>
            {(() => {
              const tracking = truckState?.tracking;
              const focusLat = tracking?.lat != null ? tracking.lat : coords?.lat != null ? coords.lat : 10.3025;
              const focusLng = tracking?.lng != null ? tracking.lng : coords?.lng != null ? coords.lng : 123.9095;
              return !isPointInView(focusLat, focusLng) && (
                <motion.button
                  key="focus-compactor-unit"
                  type="button"
                  initial={{ x: -72, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -72, opacity: 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  onClick={() => {
                    setIsMapSheetExpanded(false);
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
                  className="pointer-events-auto flex h-[54px] w-[54px] flex-col items-center justify-center gap-0.5 rounded-full border border-border bg-card/95 shadow-lg backdrop-blur-md transition-all hover:scale-105 active:scale-95 cursor-pointer"
                  title="Focus Compactor Unit"
                  aria-label="Focus Compactor Unit"
                >
                  <Waze3DFocusTruckIcon className="h-7 w-7 shrink-0" />
                </motion.button>
              );
            })()}
          </AnimatePresence>
        </div>

        {/* 2. Bottom-Right: Center GPS Location (slides in when driver is out of view, out when centered) */}
        <div className="pointer-events-none absolute bottom-[104px] right-4 z-20">
          <AnimatePresence>
            {coords?.lat != null && !isPointInView(coords.lat, coords.lng) && (
              <motion.button
                key="center-driver-location"
                type="button"
                initial={{ x: 72, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 72, opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
                onClick={() => {
                  setIsMapSheetExpanded(false);
                  setTruckFocused(false);
                  if (coords?.lat != null && coords?.lng != null) {
                    setMapCenter([coords.lat, coords.lng]);
                  } else {
                    setMapCenter([10.3025, 123.9095]);
                  }
                  setMapZoom(17);
                  setFlySignal((s) => s + 1);
                  haptic();
                }}
                className="pointer-events-auto flex h-[54px] w-[54px] flex-col items-center justify-center gap-0.5 rounded-full border border-border bg-card/95 shadow-lg backdrop-blur-md cursor-pointer"
                title="Center Driver Location"
                aria-label="Center Driver Location"
              >
                <Waze3DTargetIcon className="h-7 w-7 shrink-0" />
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* Waze-Style Single-Screen Bottom Sheet Drawer */}
        <div className="pointer-events-none absolute bottom-0 inset-x-0 z-30 flex justify-center">
          <motion.div
            className="pointer-events-auto flex w-full max-w-md flex-col rounded-t-3xl border-t border-border bg-card shadow-2xl"
          >
            {/* Top Drag Handle & Peeking Search Control */}
            <div className="flex flex-col items-center px-4 pt-2.5 pb-2">
              <button
                type="button"
                onClick={() => {
                  setIsMapSheetExpanded(!isMapSheetExpanded);
                  haptic();
                }}
                {...sheetSwipe}
                aria-label="Toggle drawer expansion"
                className="w-full flex touch-none flex-col items-center py-1 cursor-pointer group"
              >
                <div className="h-1.5 w-10 rounded-full bg-muted-foreground/30 group-hover:bg-muted-foreground/60 transition-colors" />
              </button>

              {/* 3D Action Pill Tab Navigation */}
              <div
                {...sheetSwipe}
                className="mt-2.5 flex w-full touch-none items-center justify-between gap-2"
              >
                {/* 1. Route Tab */}
                <button
                  type="button"
                  onClick={() => {
                    switchTab("route");
                    setIsMapSheetExpanded(true);
                  }}
                  className={cn(
                    "flex h-11 flex-1 min-w-0 items-center justify-center gap-1.5 rounded-xl border px-1 sm:px-3 text-[11px] sm:text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95",
                    isMapSheetExpanded && activeTab === "route"
                      ? "border-emerald-500 bg-emerald-600 text-white font-bold"
                      : "border-border bg-card text-foreground hover:bg-muted"
                  )}
                >
                  <Waze3DPlayIcon className="h-5 sm:h-5.5 w-5 sm:w-5.5 shrink-0" />
                  <span className="whitespace-nowrap">Route</span>
                </button>

                {/* 2. Assignment Tab */}
                <button
                  type="button"
                  onClick={() => {
                    switchTab("assignment");
                    setIsMapSheetExpanded(true);
                  }}
                  className={cn(
                    "flex h-11 flex-1 min-w-0 items-center justify-center gap-1.5 rounded-xl border px-1 sm:px-3 text-[11px] sm:text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95",
                    isMapSheetExpanded && activeTab === "assignment"
                      ? "border-emerald-500 bg-emerald-600 text-white font-bold"
                      : "border-border bg-card text-foreground hover:bg-muted"
                  )}
                >
                  <Waze3DRouteIcon className="h-5 sm:h-5.5 w-5 sm:w-5.5 shrink-0" />
                  <span className="whitespace-nowrap">Assignment</span>
                </button>

                {/* 3. History Tab */}
                <button
                  type="button"
                  onClick={() => {
                    switchTab("history");
                    setIsMapSheetExpanded(true);
                  }}
                  className={cn(
                    "flex h-11 flex-1 min-w-0 items-center justify-center gap-1.5 rounded-xl border px-1 sm:px-3 text-[11px] sm:text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95",
                    isMapSheetExpanded && activeTab === "history"
                      ? "border-emerald-500 bg-emerald-600 text-white font-bold"
                      : "border-border bg-card text-foreground hover:bg-muted"
                  )}
                >
                  <CheckCircle2 className="h-4 sm:h-5 w-4 sm:w-5 shrink-0" />
                  <span className="whitespace-nowrap">History</span>
                </button>
              </div>
            </div>

            {/* Expanded Tab Drawer Content Wrapper */}
            <AnimatePresence>
              {isMapSheetExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <div className="h-[340px] overflow-y-auto space-y-4 pt-1 px-4 pb-4 scrollbar-hide">

                    {/* Tab 1: Route & Telemetry Controls */}
                    {activeTab === "route" && (
                      <div className="space-y-4">
                        {/* Main Route Workflow Control */}
                        <div className="relative rounded-2xl border border-emerald-500/25 bg-[url('/hero-bg.svg')] bg-cover bg-center bg-no-repeat p-4 space-y-3 shadow-md overflow-hidden">
                          <div className="relative z-10 space-y-3">
                            {(!isOnDuty && assignedSchedule && (live.scheduleStatus[assignedSchedule.id] === "Scheduled" || live.scheduleStatus[assignedSchedule.id] === "Assigned")) ? (
                              <button
                                type="button"
                                onClick={() => {
                                  haptic(15);
                                  acceptAssignment(assignedSchedule.id);
                                  toast("Assignment accepted.");
                                }}
                                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl text-xs font-bold transition-all active:scale-[0.98] cursor-pointer shadow-xs bg-indigo-600 text-white hover:bg-indigo-700"
                              >
                                <Waze3DRouteIcon className="h-5 w-5 shrink-0" />
                                Accept Assignment
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={handlePrimaryAction}
                                className={cn(
                                  "flex h-12 w-full items-center justify-center gap-2 rounded-xl text-xs font-bold transition-all active:scale-[0.98] cursor-pointer shadow-xs",
                                  isOnDuty && truckState?.phase === "enroute"
                                    ? "bg-amber-600 text-white hover:bg-amber-700"
                                    : "bg-emerald-600 text-white hover:bg-emerald-700"
                                )}
                              >
                                {!isOnDuty ? (
                                  <>
                                    <Play className="h-4 w-4 fill-white" /> Start Route
                                  </>
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
                            )}

                            {isOnDuty && (
                              <button
                                type="button"
                                onClick={handleEndRoute}
                                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-rose-600 text-xs font-bold text-white transition-all hover:bg-rose-700 active:scale-[0.98] cursor-pointer shadow-xs"
                              >
                                <X className="h-4 w-4 stroke-[2.5]" />
                                End Route
                              </button>
                            )}

                            <div className="space-y-1.5 pt-1 px-1">
                              <InfoRow
                                label="Active Route"
                                value={activeSchedule ? scheduleLabel(activeSchedule) : "No Active Route"}
                              />
                              <InfoRow
                                label="Next Stop"
                                value={
                                  truckState?.phase === "completed"
                                    ? "Route Completed"
                                    : truckState?.onsite
                                      ? `At ${currentPoint?.name ?? "stop"}`
                                      : currentPoint
                                        ? `${currentPoint.name} • ${currentPoint.time}`
                                        : "Standby"
                                }
                              />
                              <InfoRow
                                label="Stops Served"
                                value={
                                  routePoints.length
                                    ? `${
                                        truckState?.phase === "completed"
                                          ? routePoints.length
                                          : truckState?.onsite
                                            ? truckState.stopIndex + 1
                                            : truckState?.stopIndex ?? 0
                                      } of ${routePoints.length}`
                                    : "—"
                                }
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Tab 2: Assignment & Compactor Info */}
                    {activeTab === "assignment" && (
                      <div className="space-y-4">
                        <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
                          <div className="border-b border-border/60 pb-2.5">
                            <h3 className="text-sm font-extrabold text-foreground tracking-tight">
                              {assignedSchedule
                                ? `${scheduleLabel(assignedSchedule)} Route`
                                : "No Route Assigned"}
                            </h3>
                          </div>

                          <div className="rounded-xl border border-border bg-muted/40 p-3 space-y-2">
                            <InfoRow label="Assigned Unit" value={`${currentTruck.id} (${currentTruck.plate})`} />
                            <InfoRow label="Driver Operator" value={liveDriver || "—"} />
                            <InfoRow label="Payload Capacity" value={currentTruck.capacity} />
                            <InfoRow label="Waste Collection" value={assignedSchedule?.type ?? "—"} />
                            <InfoRow label="Scheduled Days" value={assignedSchedule?.days.join(", ") ?? "—"} />
                            <InfoRow label="Scheduled Hours" value={assignedSchedule?.time ?? "—"} />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Tab 3: History */}
                    {activeTab === "history" && (
                      <div className="space-y-3">
                        {(() => {
                          const history = getSchedules().filter(
                            (s) =>
                              s.activeTruckId === selectedTruckId &&
                              live.scheduleStatus[s.id] === "Completed" &&
                              !s.isArchived
                          );
                          if (history.length === 0) {
                            return (
                              <div className="rounded-2xl border border-border bg-card p-6 flex flex-col items-center justify-center text-center">
                                <CheckCircle2 className="h-8 w-8 text-muted-foreground/50 mb-2" />
                                <h3 className="text-sm font-bold text-foreground">No completed routes</h3>
                                <p className="text-xs text-muted-foreground mt-1">Routes you finish today will appear here.</p>
                              </div>
                            );
                          }
                          return history.map((s) => (
                            <div key={s.id} className="rounded-2xl border border-border bg-card p-4 flex items-center justify-between">
                              <div>
                                <h3 className="text-sm font-extrabold text-foreground tracking-tight">{scheduleLabel(s)}</h3>
                                <p className="text-xs text-muted-foreground">{s.time || "No time specified"}</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  haptic();
                                  removeSchedule(s.id);
                                  toast("Route archived from history.");
                                }}
                                className="rounded-lg bg-rose-50 text-rose-600 px-3 py-1.5 text-xs font-bold transition-all hover:bg-rose-100 active:scale-95 border border-rose-200 cursor-pointer"
                              >
                                Archive
                              </button>
                            </div>
                          ));
                        })()}
                      </div>
                    )}

                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>

      {/* Driver Profile & Settings Slide-Up Bottom Sheet */}
      <BottomSheet
        open={showProfile}
        onClose={() => setShowProfile(false)}
        title="Driver Terminal & Settings"
      >
        <div className="h-[362px] overflow-y-auto space-y-4 pt-2 scrollbar-hide">
          {/* Driver Profile Summary Card */}
          <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4">
            <div className="flex h-13 w-13 items-center justify-center rounded-full bg-emerald-600 text-2xl font-semibold leading-none text-white shadow-sm shrink-0">
              {driverSession?.name?.charAt(0)?.toUpperCase() || "D"}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-bold text-foreground truncate">{driverSession?.name || "Driver"}</h3>
              <p className="text-xs font-semibold text-foreground mt-0.5">Compactor Operator ({selectedTruckId})</p>
              <p className="text-[11px] text-muted-foreground">Plate: {currentTruck.plate} &bull; Brgy. Tejero, Cebu City</p>
            </div>
          </div>

          {/* Terminal Diagnostic Details */}
          <div className="rounded-xl border border-border bg-card p-3.5 space-y-2">
            <InfoRow label="Compactor Unit" value={selectedTruckId} />
            <InfoRow label="Network Status" value={isOnline ? <span className="text-emerald-600 font-bold">Online</span> : <span className="text-rose-600 font-bold">Offline</span>} />
            <InfoRow label="Device Battery" value={`${batteryLevel ?? 100}% ${isCharging ? "(Charging)" : ""}`} />
            <InfoRow label="GPS Telemetry Status" value={<span className="text-emerald-600 font-bold">{broadcastStatus}</span>} />
          </div>

          {/* Change Password */}
          <div className="rounded-xl border border-border bg-card p-3.5 space-y-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Change Password
            </h4>

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
                    className={`w-full rounded-lg border bg-card px-3 py-2 pr-9 text-xs font-medium text-foreground placeholder:text-muted-foreground/50 outline-none transition-colors ${
                      pwErrors[f.field]
                        ? "border-rose-300 focus:border-rose-400"
                        : "border-border hover:border-zinc-300 focus:border-zinc-400"
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
              className="h-11 w-full rounded-xl text-sm font-bold shadow-lg shadow-emerald-600/20"
            >
              {pwSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Changing...</span>
                </>
              ) : (
                "Change Password"
              )}
            </Button>
          </div>

          {/* Actions */}
          <div className="space-y-2 pt-2">
            <button
              type="button"
              onClick={() => {
                setShowProfile(false);
                setShowSignOutModal(true);
                haptic();
              }}
              className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-border bg-card px-6 text-sm font-bold text-zinc-700 transition-all hover:border-rose-300 hover:text-rose-600 active:scale-[0.98]"
            >
              <LogOut className="h-4 w-4 text-muted-foreground" strokeWidth={1.75} />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </BottomSheet>

      {/* Admin Dashboard Style Sign Out Confirmation Modal */}
      {showSignOutModal && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-zinc-950/40 p-4 backdrop-blur-sm"
          onClick={() => setShowSignOutModal(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="flex w-full max-w-xs flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <h3 className="text-sm font-semibold text-foreground">Sign Out</h3>
              <p className="mt-1 text-xs font-medium text-muted-foreground">
                You will need to log back in to access the driver terminal.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSignOutModal(false)}
                className="rounded-xl font-bold"
              >
                Cancel
              </Button>
              <button
                type="button"
                onClick={async () => {
                  clearDriverSession();
                  await supabase.auth.signOut();
                  setShowSignOutModal(false);
                  router.replace("/driver-login");
                }}
                className="inline-flex select-none items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-white px-2.5 py-1.5 text-xs font-bold text-rose-600 shadow-xs transition-all duration-150 hover:border-rose-600 hover:bg-rose-600 hover:text-white active:scale-[0.98] cursor-pointer"
              >
                Sign Out
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {ToastViewport}
    </div>
  );
}
