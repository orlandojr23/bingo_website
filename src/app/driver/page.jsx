"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  Truck,
  Radio,
  Wifi,
  WifiOff,
  Battery,
  Zap,
  Play,
  Square,
  Navigation,
  ArrowLeft,
  Smartphone,
  Route,
  Trash2,
  Activity,
  Check,
  MapPin,
  Container,
  AlertTriangle,
  CheckCircle2,
  Search,
  Bell,
  ShieldCheck,
  ChevronRight,
  LogOut,
  Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { mockPilotData, mockTickets } from "@/lib/mock-data";
import { cn, haptic } from "@/lib/utils";
import { useToast } from "@/components/pwa/Toast";
import BottomSheet from "@/components/pwa/BottomSheet";

// Minimalist High-DPI Leaflet MapCanvas
const MapCanvas = dynamic(() => import("@/components/map/map-canvas"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-background">
      <div className="h-7 w-7 rounded-full border-2 border-emerald-500/20 border-t-emerald-600 animate-spin" />
    </div>
  ),
});

const TAB_IDS = ["shift", "route", "tickets"];

// 3D Vector SVG Icons for Action Buttons & Banners
function Waze3DFocusTruckIcon({ className = "h-9 w-9" }) {
  return (
    <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <linearGradient id="driverFocusTruckBody" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="50%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#047857" />
        </linearGradient>
        <linearGradient id="driverFocusTruckCab" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#059669" />
          <stop offset="100%" stopColor="#064e3b" />
        </linearGradient>
        <linearGradient id="driverFocusTruckWindshield" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#e0f2fe" />
          <stop offset="100%" stopColor="#38bdf8" />
        </linearGradient>
        <filter id="driverFocusTruckShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1.5" stdDeviation="1" floodColor="#000000" floodOpacity="0.35" />
        </filter>
      </defs>
      <g filter="url(#driverFocusTruckShadow)">
        <rect x="4" y="10" width="16" height="13" rx="2.5" fill="url(#driverFocusTruckBody)" />
        <line x1="8" y1="12" x2="8" y2="21" stroke="#065f46" strokeWidth="1.2" />
        <line x1="12" y1="12" x2="12" y2="21" stroke="#065f46" strokeWidth="1.2" />
        <line x1="16" y1="12" x2="16" y2="21" stroke="#065f46" strokeWidth="1.2" />
        <path d="M 20 13 H 28 C 30 13 31 14.8 31 16.5 L 31 23 H 20 V 13 Z" fill="url(#driverFocusTruckCab)" />
        <path d="M 22 14.5 H 28 L 29 18.5 H 22 V 14.5 Z" fill="url(#driverFocusTruckWindshield)" />
        <rect x="29.5" y="20.5" width="2" height="2.5" rx="0.5" fill="#f4f4f5" />
        <circle cx="9" cy="24" r="3.2" fill="#18181b" />
        <circle cx="9" cy="24" r="1.3" fill="#e4e4e7" />
        <circle cx="25" cy="24" r="3.2" fill="#18181b" />
        <circle cx="25" cy="24" r="1.3" fill="#e4e4e7" />
      </g>
    </svg>
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

function Waze3DShiftIcon({ className = "h-4 w-4" }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <defs>
        <linearGradient id="shiftGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
      </defs>
      <circle cx="16" cy="16" r="12" fill="url(#shiftGrad)" />
      <polygon points="13,10 22,16 13,22" fill="#ffffff" />
    </svg>
  );
}

function Waze3DRouteIcon({ className = "h-4 w-4" }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M 6 24 C 12 24 12 8 20 8 C 24 8 26 12 26 16" stroke="#10b981" strokeWidth="3" strokeLinecap="round" fill="none" />
      <circle cx="6" cy="24" r="3" fill="#047857" />
      <circle cx="26" cy="16" r="4" fill="#ef4444" />
      <circle cx="26" cy="16" r="1.5" fill="#ffffff" />
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

const STATUS_EVENTS = [
  {
    label: "Arrived at Sitio",
    event: "Arrived at Sitio Sector",
    icon: MapPin,
    className: "border-border bg-card text-foreground hover:bg-muted",
    iconClassName: "text-emerald-600",
  },
  {
    label: "Compactor Full",
    event: "Compactor Full (Heading to Dump Site)",
    icon: Container,
    className: "border-amber-500/30 bg-amber-500/10 text-amber-700 hover:bg-amber-500/20",
    iconClassName: "text-amber-600",
  },
  {
    label: "Traffic Delay",
    event: "Traffic / Road Block",
    icon: AlertTriangle,
    className: "border-border bg-card text-foreground hover:bg-muted",
    iconClassName: "text-muted-foreground",
  },
  {
    label: "Sector Complete",
    event: "Collection Complete",
    icon: CheckCircle2,
    className: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20",
    iconClassName: "text-emerald-600",
  },
];

function InfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between text-xs py-1">
      <span className="text-muted-foreground font-medium">{label}</span>
      <span className="font-bold text-foreground">{value}</span>
    </div>
  );
}

export default function DriverPage() {
  const [selectedTruckId, setSelectedTruckId] = useState("TRK-01");
  const [isOnDuty, setIsOnDuty] = useState(false);
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const [wakeLockSupported, setWakeLockSupported] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [batteryLevel, setBatteryLevel] = useState(null);
  const [isCharging, setIsCharging] = useState(false);
  const [activeTab, setActiveTab] = useState("shift"); // "shift" | "route" | "tickets"
  const [isMapSheetExpanded, setIsMapSheetExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [mapCenter, setMapCenter] = useState([10.3025, 123.9095]);
  const [mapZoom, setMapZoom] = useState(16);

  // Profile & Logout Modals
  const [showProfile, setShowProfile] = useState(false);
  const [showSignOutModal, setShowSignOutModal] = useState(false);

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
  const [lastBroadcastTime, setLastBroadcastTime] = useState(null);
  const [broadcastCount, setBroadcastCount] = useState(0);
  const [broadcastStatus, setBroadcastStatus] = useState("Idle / Standby");

  const watchIdRef = useRef(null);
  const wakeLockRef = useRef(null);
  const { toast, ToastViewport } = useToast();

  const currentTruck =
    mockPilotData.trucks.find((t) => t.id === selectedTruckId) || mockPilotData.trucks[0];

  const assignedSchedule =
    mockPilotData.schedules.find((s) => s.activeTruckId === selectedTruckId) ||
    mockPilotData.schedules[0];

  const assignedZone = mockPilotData.zones.find(
    (z) => z.id === assignedSchedule.zoneId
  );

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
      await wakeLockRef.current.release();
      wakeLockRef.current = null;
      setWakeLockActive(false);
    }
  };

  const toggleDuty = async () => {
    haptic(15);
    if (!isOnDuty) {
      setIsOnDuty(true);
      setBroadcastStatus("Transmitting Live Telemetry");
      await requestWakeLock();

      if ("geolocation" in navigator) {
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
            setMapCenter([latitude, longitude]);
            setLastBroadcastTime(
              new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })
            );
            setBroadcastCount((prev) => prev + 1);
            setBroadcastStatus("Broadcasting live");
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
      }
      toast("Shift Started. GPS Telemetry active.");
    } else {
      setIsOnDuty(false);
      setBroadcastStatus("Off Duty / Standby");
      await releaseWakeLock();

      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      toast("Shift Ended. GPS Telemetry stopped.");
    }
  };

  const handleResolveTicket = (ticketId) => {
    setDriverTickets((prev) =>
      prev.map((t) => (t.id === ticketId ? { ...t, status: "Resolved" } : t))
    );
    haptic(15);
    toast(`Ticket ${ticketId} marked Cleaned Up.`);
  };

  const handleSendStatusEvent = (eventTitle) => {
    haptic(10);
    toast(`Logged Event: "${eventTitle}"`);
  };

  const trucksForMap = [
    {
      id: currentTruck.id,
      plate: currentTruck.plate,
      driver: currentTruck.driver,
      capacity: currentTruck.capacity,
      lat: coords.lat,
      lng: coords.lng,
      heading: coords.heading,
      eta: isOnDuty ? "Active On Route" : "Parked",
      isActive: isOnDuty,
    },
  ];

  return (
    <div className="flex h-dvh w-full flex-col bg-background text-foreground font-sans selection:bg-emerald-100 selection:text-emerald-900 overflow-hidden select-none">

      {/* Main 1-Screen Body: Full-Screen Map Canvas as Permanent Backdrop */}
      <div className="relative flex-1 w-full overflow-hidden select-none">
        {/* Permanent Background Map Canvas */}
        <div className="absolute inset-0 h-full w-full z-0">
          <MapCanvas
            tickets={driverTickets.filter((t) => t.status !== "Resolved")}
            trucks={trucksForMap}
            mapMode="pins"
            center={mapCenter}
            zoom={mapZoom}
            onMapDrag={() => {
              if (isMapSheetExpanded) {
                setIsMapSheetExpanded(false);
              }
            }}
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
              className="absolute inset-0 z-15 bg-black/25 backdrop-blur-[1px] cursor-pointer"
            />
          )}
        </AnimatePresence>

        {/* Waze-Style Flush Top Navigation Banner */}
        <div className="pointer-events-auto absolute top-0 inset-x-0 z-20 w-full border-b border-border bg-card/98 px-5 py-3 text-foreground backdrop-blur-md flex items-center justify-between gap-3.5 select-none overflow-hidden h-16 shadow-sm">
          {/* Left: Driver Duty Status Readout */}
          <div className="min-w-0 flex-1 overflow-hidden relative h-11 flex items-center">
            <div className="flex items-center gap-3.5 min-w-0 w-full">
              <div className="flex h-10 w-10 items-center justify-center shrink-0">
                <Waze3DFocusTruckIcon className="h-8 w-8 shrink-0" />
              </div>

              <div className="min-w-0 flex-1">
                <h3 className="text-base font-black tracking-tight text-foreground truncate leading-tight flex items-center gap-2">
                  <span>Unit {currentTruck.id}</span>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold",
                      isOnDuty
                        ? "bg-emerald-500/15 text-emerald-600 border border-emerald-500/20"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    <span
                      className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        isOnDuty ? "bg-emerald-600 animate-ping" : "bg-muted-foreground"
                      )}
                    />
                    {isOnDuty ? "Live Telemetry" : "Off Duty"}
                  </span>
                </h3>
                <p className="text-xs font-semibold text-emerald-700 truncate leading-tight mt-0.5">
                  {assignedZone?.name.split(" (")[0]} &bull; {currentTruck.driver}
                </p>
              </div>
            </div>
          </div>

          {/* Right: Top-Right Circular Profile Button with Initial Letter "D" */}
          <button
            type="button"
            onClick={() => {
              setIsMapSheetExpanded(false);
              setShowProfile(true);
              haptic();
            }}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-black text-white shadow-xs hover:bg-emerald-700 active:scale-95 transition-all cursor-pointer border border-emerald-500/30"
            title="Driver Terminal Settings"
          >
            D
          </button>
        </div>

        {/* Floating Circular 3D Map Action Buttons (Option B: Symmetrical Left & Right Split) */}
        {/* 1. Bottom-Left: Focus Active Truck */}
        <button
          type="button"
          onClick={() => {
            setMapCenter([coords.lat, coords.lng]);
            setMapZoom(17);
            haptic();
          }}
          className="pointer-events-auto absolute bottom-[164px] left-4 z-20 flex h-12 w-12 items-center justify-center rounded-full bg-card/95 border border-border text-foreground shadow-lg backdrop-blur-md transition-all hover:scale-105 active:scale-95 cursor-pointer"
          title="Focus Compactor Unit"
        >
          <Waze3DFocusTruckIcon className="h-9 w-9 shrink-0" />
        </button>

        {/* 2. Bottom-Right: Center GPS Location */}
        <button
          type="button"
          onClick={() => {
            if ("geolocation" in navigator) {
              navigator.geolocation.getCurrentPosition((pos) => {
                const { latitude, longitude } = pos.coords;
                setMapCenter([latitude, longitude]);
                setMapZoom(17);
              });
            } else {
              setMapCenter([10.3025, 123.9095]);
              setMapZoom(17);
            }
            haptic();
          }}
          className="pointer-events-auto absolute bottom-[164px] right-4 z-20 flex h-12 w-12 items-center justify-center rounded-full bg-card/95 border border-border text-foreground shadow-lg backdrop-blur-md transition-all hover:scale-105 active:scale-95 cursor-pointer"
          title="Center Driver Location"
        >
          <Waze3DTargetIcon className="h-9 w-9 shrink-0" />
        </button>

        {/* Waze-Style Single-Screen Bottom Sheet Drawer */}
        <div className="pointer-events-none absolute bottom-0 inset-x-0 z-30 flex justify-center">
          <motion.div
            layout
            transition={{
              type: "spring",
              damping: 30,
              stiffness: 350,
            }}
            className="pointer-events-auto flex w-full max-w-md flex-col rounded-t-3xl border-t border-border bg-card/98 shadow-2xl backdrop-blur-xl"
          >
            {/* Top Drag Handle & Peeking Search Control */}
            <div className="flex flex-col items-center px-4 pt-2.5 pb-2">
              <button
                type="button"
                onClick={() => {
                  setIsMapSheetExpanded(!isMapSheetExpanded);
                  haptic();
                }}
                aria-label="Toggle drawer expansion"
                className="w-full flex flex-col items-center py-1 cursor-pointer group"
              >
                <div className="h-1.5 w-10 rounded-full bg-muted-foreground/30 group-hover:bg-muted-foreground/60 transition-colors" />
              </button>

              {/* Peeking Search Input & Status Readout */}
              <div className="mt-1.5 flex w-full items-center gap-2 rounded-xl border border-border bg-muted/50 px-3 py-2 text-xs">
                <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search sector, route, or ticket..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setIsMapSheetExpanded(true)}
                  className="w-full bg-transparent font-medium text-foreground placeholder:text-muted-foreground focus:outline-none"
                />
              </div>

              {/* 3D Action Pill Tab Navigation */}
              <div className="mt-2.5 flex w-full items-center justify-between gap-1 rounded-2xl bg-muted/60 p-1">
                {/* 1. Shift Tab */}
                <button
                  type="button"
                  onClick={() => {
                    switchTab("shift");
                    setIsMapSheetExpanded(true);
                  }}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-extrabold transition-all cursor-pointer",
                    activeTab === "shift"
                      ? "bg-card text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Waze3DShiftIcon className="h-4 w-4 shrink-0" />
                  <span>Shift</span>
                </button>

                {/* 2. Route Tab */}
                <button
                  type="button"
                  onClick={() => {
                    switchTab("route");
                    setIsMapSheetExpanded(true);
                  }}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-extrabold transition-all cursor-pointer",
                    activeTab === "route"
                      ? "bg-card text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Waze3DRouteIcon className="h-4 w-4 shrink-0" />
                  <span>Route</span>
                </button>

                {/* 3. Clean Bins Tab */}
                <button
                  type="button"
                  onClick={() => {
                    switchTab("tickets");
                    setIsMapSheetExpanded(true);
                  }}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-extrabold transition-all cursor-pointer relative",
                    activeTab === "tickets"
                      ? "bg-card text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Waze3DCleanIcon className="h-4 w-4 shrink-0" />
                  <span>Clean Bins</span>
                  {pendingCount > 0 && (
                    <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-emerald-600 text-[10px] font-bold text-white px-1 ml-0.5">
                      {pendingCount}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Expanded Tab Drawer Content Wrapper */}
            <AnimatePresence mode="wait">
              {isMapSheetExpanded && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25 }}
                  className="px-4 pb-4 pt-1"
                >
                  <div className="h-[340px] overflow-y-auto space-y-4 pr-0.5 pt-2 scrollbar-hide">

                    {/* Tab 1: Shift & Telemetry Controls */}
                    {activeTab === "shift" && (
                      <div className="space-y-4">
                        {/* Main Shift Duty Toggle Button */}
                        <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                              Shift & Telemetry Control
                            </span>
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold",
                                isOnDuty
                                  ? "bg-emerald-500/15 text-emerald-600 border border-emerald-500/20"
                                  : "bg-muted text-muted-foreground"
                              )}
                            >
                              <span
                                className={cn(
                                  "h-1.5 w-1.5 rounded-full",
                                  isOnDuty ? "bg-emerald-600 animate-ping" : "bg-muted-foreground"
                                )}
                              />
                              {isOnDuty ? "Broadcasting live" : "Off duty"}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={toggleDuty}
                            className={cn(
                              "flex h-12 w-full items-center justify-center gap-2 rounded-xl text-xs font-bold transition-all active:scale-[0.98] cursor-pointer shadow-xs",
                              isOnDuty
                                ? "bg-rose-600 text-white hover:bg-rose-700"
                                : "bg-emerald-600 text-white hover:bg-emerald-700"
                            )}
                          >
                            {isOnDuty ? (
                              <>
                                <Square className="h-4 w-4 fill-white" /> End Shift / Stop GPS Broadcast
                              </>
                            ) : (
                              <>
                                <Play className="h-4 w-4 fill-white" /> Start Shift & Broadcast Telemetry
                              </>
                            )}
                          </button>

                          <div className="flex items-center gap-2 rounded-xl border border-border bg-muted/40 p-2.5 text-xs text-muted-foreground">
                            <Smartphone className="h-4 w-4 shrink-0 text-emerald-600" />
                            <div className="flex-1">
                              <span className="font-bold text-foreground">Screen Wake Lock: </span>
                              {wakeLockActive ? (
                                <span className="font-bold text-emerald-600">Active (No Sleep)</span>
                              ) : (
                                <span>Keeps phone awake while driving</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Quick Event Buttons */}
                        <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
                          <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                            Quick Status Event Logging
                          </h4>
                          <div className="grid grid-cols-2 gap-2">
                            {STATUS_EVENTS.map(({ label, event, icon: Icon, className, iconClassName }) => (
                              <button
                                key={label}
                                type="button"
                                onClick={() => handleSendStatusEvent(event)}
                                className={cn(
                                  "flex items-center gap-2 rounded-xl border p-3 text-left text-xs font-bold transition-all active:scale-[0.97] cursor-pointer",
                                  className
                                )}
                              >
                                <Icon className={cn("h-4 w-4 shrink-0", iconClassName)} strokeWidth={2} />
                                <span>{label}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Tab 2: Route & Compactor Info */}
                    {activeTab === "route" && (
                      <div className="space-y-4">
                        <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <h3 className="text-sm font-bold text-foreground">
                              {assignedZone?.name.split(" (")[0]} Route
                            </h3>
                            <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700">
                              {assignedSchedule.type}
                            </span>
                          </div>

                          <div className="rounded-xl border border-border bg-muted/40 p-3 space-y-2">
                            <InfoRow label="Assigned Unit" value={`${currentTruck.id} (${currentTruck.plate})`} />
                            <InfoRow label="Driver Operator" value={currentTruck.driver} />
                            <InfoRow label="Payload Capacity" value={currentTruck.capacity} />
                            <InfoRow label="Scheduled Days" value={assignedSchedule.days.join(", ")} />
                            <InfoRow label="Shift Hours" value={assignedSchedule.time} />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Tab 3: Clean Bins (Waste Reports in Sector) */}
                    {activeTab === "tickets" && (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between px-1">
                          <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                            Reported Bins along Route
                          </h4>
                          <span className="font-mono text-xs font-bold text-emerald-600">
                            {pendingCount} Pending Cleanups
                          </span>
                        </div>

                        {driverTickets.map((ticket) => {
                          const isResolved = ticket.status === "Resolved";
                          return (
                            <div
                              key={ticket.id}
                              className={cn(
                                "rounded-2xl border p-4 transition-all space-y-2",
                                isResolved
                                  ? "border-border bg-muted/40 opacity-60"
                                  : "border-emerald-500/30 bg-card shadow-xs"
                              )}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-mono text-xs font-bold text-emerald-700">
                                  {ticket.id}
                                </span>
                                <span
                                  className={cn(
                                    "rounded-full px-2.5 py-0.5 text-[10px] font-bold",
                                    isResolved
                                      ? "bg-emerald-500/10 text-emerald-700 border border-emerald-500/20"
                                      : "bg-amber-500/10 text-amber-700 border border-amber-500/20"
                                  )}
                                >
                                  {isResolved ? "Cleaned Up" : ticket.status}
                                </span>
                              </div>

                              <h4 className="text-xs font-bold text-foreground">{ticket.location}</h4>
                              <p className="text-xs text-muted-foreground leading-relaxed">
                                {ticket.category} &bull; {ticket.barangay}
                              </p>

                              {!isResolved && (
                                <button
                                  type="button"
                                  onClick={() => handleResolveTicket(ticket.id)}
                                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white transition-all hover:bg-emerald-700 active:scale-[0.98] cursor-pointer shadow-xs"
                                >
                                  <Check className="h-4 w-4" strokeWidth={2.5} /> Mark as Cleaned Up
                                </button>
                              )}
                            </div>
                          );
                        })}
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
        <div className="h-[340px] overflow-y-auto space-y-4 pr-0.5 pt-2 scrollbar-hide">
          {/* Driver Profile Summary Card */}
          <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4">
            <div className="flex h-13 w-13 items-center justify-center rounded-full bg-emerald-600 font-black text-white text-xl shadow-sm shrink-0">
              D
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-bold text-foreground truncate">Orlando Jr.</h3>
              <p className="text-xs font-semibold text-foreground mt-0.5">Compactor Operator (TRK-01)</p>
              <p className="text-[11px] text-muted-foreground">Plate: CEB-9912 &bull; Brgy. Tejero Sector A</p>
            </div>
          </div>

          {/* Terminal Diagnostic Details */}
          <div className="rounded-xl border border-border bg-card p-3.5 space-y-2">
            <InfoRow label="Compactor Unit" value={selectedTruckId} />
            <InfoRow label="Network Status" value={isOnline ? <span className="text-emerald-600 font-bold">Online</span> : <span className="text-rose-600 font-bold">Offline</span>} />
            <InfoRow label="Device Battery" value={`${batteryLevel ?? 100}% ${isCharging ? "(Charging)" : ""}`} />
            <InfoRow label="GPS Telemetry Status" value={<span className="text-emerald-600 font-bold">{broadcastStatus}</span>} />
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
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 text-xs font-bold text-rose-600 transition-colors hover:bg-rose-100 hover:border-rose-300 cursor-pointer active:scale-[0.98]"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </BottomSheet>

      {/* Admin Dashboard Style Sign Out Confirmation Modal */}
      {showSignOutModal && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-zinc-950/40 p-4 backdrop-blur-xs select-none"
          onClick={() => setShowSignOutModal(false)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="flex w-full max-w-xs flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <h3 className="text-sm font-bold text-foreground">Sign Out</h3>
              <p className="mt-1 text-xs font-medium text-muted-foreground leading-relaxed">
                You will need to log back in to access the driver terminal.
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowSignOutModal(false)}
                className="rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-bold text-muted-foreground hover:bg-muted transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <Link
                href="/"
                onClick={() => setShowSignOutModal(false)}
                className="inline-flex items-center justify-center rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-100 hover:border-rose-300 active:scale-95 transition-all cursor-pointer"
              >
                Sign Out
              </Link>
            </div>
          </motion.div>
        </div>
      )}

      {ToastViewport}
    </div>
  );
}
