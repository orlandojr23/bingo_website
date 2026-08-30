"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import {
  Camera,
  MapPin,
  Send,
  CheckCircle2,
  Clock,
  Trash2,
  Map,
  Calendar,
  Ticket,
  Truck,
  Bell,
  RefreshCw,
  ChevronRight,
  User,
  LogOut,
  Check,
  ShieldCheck,
  Navigation,
  Compass,
  X,
  Menu,
  Search,
} from "lucide-react";
import { mockTickets, mockPilotData } from "@/lib/mock-data";
import { cn, haptic } from "@/lib/utils";
import { StatusBadge, UrgencyBadge } from "@/components/ui/badge";
import { InfoRow } from "@/components/ui/info-row";
import AppHeader from "@/components/pwa/AppHeader";
import BottomNav from "@/components/pwa/BottomNav";
import BottomSheet from "@/components/pwa/BottomSheet";
import { useToast } from "@/components/pwa/Toast";

const MapCanvas = dynamic(() => import("@/components/map/map-canvas"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-card/60 backdrop-blur-sm">
      <div className="h-7 w-7 rounded-full border-2 border-emerald-500/20 border-t-emerald-600 animate-spin" />
    </div>
  ),
});

const TAB_IDS = ["schedule", "map", "report", "tickets"];

const NAV_TABS = [
  { id: "schedule", label: "Schedules", icon: Calendar },
  { id: "map", label: "Live Map", icon: Map },
  { id: "report", label: "Report", icon: Camera, raised: true },
  { id: "tickets", label: "My Tickets", icon: Ticket },
];

function Waze3DTurnArrow({ className = "h-7 w-7" }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="arrowGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#047857" />
        </linearGradient>
        <filter id="arrowShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1.5" stdDeviation="1" floodColor="#000000" floodOpacity="0.2" />
        </filter>
      </defs>
      <g filter="url(#arrowShadow)">
        <path
          d="M 8 26 V 14 C 8 10, 11 7, 17 7 H 22"
          stroke="url(#arrowGradient)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M 17 2 L 25 7 L 17 12"
          fill="none"
          stroke="url(#arrowGradient)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}

function Waze3DBellIcon({ className = "h-6 w-6", active = false }) {
  return (
    <svg
      viewBox="0 0 36 36"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        {/* Main Body 3D Gradient */}
        <linearGradient id={active ? "bellBodyActive" : "bellBodyInactive"} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={active ? "#fde047" : "#6ee7b7"} />
          <stop offset="45%" stopColor={active ? "#f59e0b" : "#10b981"} />
          <stop offset="100%" stopColor={active ? "#b45309" : "#047857"} />
        </linearGradient>

        {/* Rim Highlight 3D Gradient */}
        <linearGradient id={active ? "bellRimActive" : "bellRimInactive"} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={active ? "#fbbf24" : "#34d399"} />
          <stop offset="50%" stopColor={active ? "#fef08a" : "#a7f3d0"} />
          <stop offset="100%" stopColor={active ? "#d97706" : "#059669"} />
        </linearGradient>

        {/* Soft Drop Shadow */}
        <filter id="3dBellShadow" x="-30%" y="-20%" width="160%" height="160%">
          <feDropShadow dx="0" dy="1.5" stdDeviation="1.2" floodColor="#000000" floodOpacity="0.2" />
        </filter>
      </defs>

      <g filter="url(#3dBellShadow)">
        {/* Top Attachment Loop Ring */}
        <circle
          cx="18"
          cy="5"
          r="2.2"
          stroke={active ? "#f59e0b" : "#10b981"}
          strokeWidth="1.8"
          fill="none"
        />

        {/* Bell Flared Body */}
        <path
          d="M 18 7.5 C 12 7.5 9 11.5 9 18 C 9 22 7 23.5 6 24.5 H 30 C 29 23.5 27 22 27 18 C 27 11.5 24 7.5 18 7.5 Z"
          fill={`url(#${active ? "bellBodyActive" : "bellBodyInactive"})`}
        />

        {/* 3D Flared Rim Lip */}
        <ellipse
          cx="18"
          cy="24.5"
          rx="12"
          ry="2"
          fill={`url(#${active ? "bellRimActive" : "bellRimInactive"})`}
        />

        {/* Bell Clapper Ball */}
        <circle
          cx="18"
          cy="27"
          r="2.8"
          fill={`url(#${active ? "bellBodyActive" : "bellBodyInactive"})`}
        />

        {/* Active Sound Vibration Arcs */}
        {active && (
          <>
            <path
              d="M 3 14 C 1.5 16.5 1.5 19.5 3 22"
              stroke="#f59e0b"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M 33 14 C 34.5 16.5 34.5 19.5 33 22"
              stroke="#f59e0b"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </>
        )}
      </g>
    </svg>
  );
}

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

function Waze3DPinIcon({ className = "h-4 w-4" }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="pinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f43f5e" />
          <stop offset="50%" stopColor="#e11d48" />
          <stop offset="100%" stopColor="#9f1239" />
        </linearGradient>
        <filter id="pinShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="0.8" floodColor="#000000" floodOpacity="0.3" />
        </filter>
      </defs>
      <g filter="url(#pinShadow)">
        <path
          d="M 16 3 C 10.5 3 6 7.5 6 13 C 6 20 16 29 16 29 C 16 29 26 20 26 13 C 26 7.5 21.5 3 16 3 Z"
          fill="url(#pinGrad)"
        />
        <circle cx="16" cy="12" r="3.5" fill="#ffffff" />
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

function getTimeBasedGreeting(name = "Orlando") {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) {
    return `Good morning, ${name}!`;
  } else if (hour >= 12 && hour < 17) {
    return `Good afternoon, ${name}!`;
  } else if (hour >= 17 && hour < 22) {
    return `Good evening, ${name}!`;
  }
}

export default function ResidentMobilePWA() {
  const [activeTab, setActiveTab] = useState("schedule"); // "schedule" | "map" | "report" | "tickets"
  const [tickets, setTickets] = useState(mockTickets);
  const [ticketFilter, setTicketFilter] = useState("all");
  const [selectedZone, setSelectedZone] = useState("all");
  const [notifyZone, setNotifyZone] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [isMapSheetExpanded, setIsMapSheetExpanded] = useState(false);
  const [bannerIndex, setBannerIndex] = useState(0);

  const greetingTitle = useMemo(() => getTimeBasedGreeting("Orlando"), []);

  const dynamicBannerMessages = useMemo(
    () => [
      {
        id: "greeting",
        Icon: Waze3DWavingHandIcon,
        title: greetingTitle,
        subtitle: "",
      },
      {
        id: "truck-15m",
        Icon: Waze3DTurnArrow,
        title: "Truck is 15 mins away",
        subtitle: "Approaching Sitio Vilgon",
      },
      {
        id: "truck-5m",
        Icon: Waze3DTurnArrow,
        title: "Truck is 5 mins away",
        subtitle: "Arriving at Sitio Vilgon",
      },
      {
        id: "truck-arrived",
        Icon: Waze3DTruckIcon,
        title: "Truck arrived",
        subtitle: "Collecting at Sitio Vilgon",
      },
      {
        id: "announcement",
        Icon: Waze3DBellIcon,
        title: "Sector A collection active",
        subtitle: "Prepare biodegradable waste",
      },
      {
        id: "off-schedule",
        Icon: Waze3DCalendarIcon,
        title: "No pickup today",
        subtitle: "Next: Tomorrow at 8:00 AM",
      },
    ],
    [greetingTitle]
  );

  const [hasNewAnnouncement, setHasNewAnnouncement] = useState(true);

  // If there are no new announcements, stay on user greeting; otherwise cycle announcements
  useEffect(() => {
    if (!hasNewAnnouncement) {
      setBannerIndex(0);
      return;
    }

    const interval = setInterval(() => {
      setBannerIndex((prev) => (prev + 1) % dynamicBannerMessages.length);
    }, 5000);

    return () => clearInterval(interval);
  }, [hasNewAnnouncement, dynamicBannerMessages.length]);

  const currentBanner = dynamicBannerMessages[bannerIndex] || dynamicBannerMessages[0];

  // Modals for Header Profile & Notifications
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const [mapCenter, setMapCenter] = useState([10.3025, 123.9095]);
  const [mapZoom, setMapZoom] = useState(16);
  const [unreadNotifications, setUnreadNotifications] = useState(2);
  const [notificationsList, setNotificationsList] = useState([
    {
      id: 1,
      title: "Truck TRK-01 Approaching",
      message: "Garbage compactor TRK-01 is 5 minutes away from Sitio Vilgon.",
      time: "5m ago",
      unread: true,
    },
    {
      id: 2,
      title: "Biodegradable Pickup Active",
      message: "Collection is currently ongoing in Barangay Tejero Sector A.",
      time: "30m ago",
      unread: true,
    },
    {
      id: 3,
      title: "Report Resolved",
      message: "Your overflow report TKT-002 was collected by the dispatch crew.",
      time: "Yesterday",
      unread: false,
    },
  ]);

  // Form State for Report
  const [photoPreview, setPhotoPreview] = useState(null);
  const [category, setCategory] = useState("Overflowing Bin");
  const [urgency, setUrgency] = useState("High");
  const [locationName, setLocationName] = useState("");
  const [barangay, setBarangay] = useState("Tejero");
  const [description, setDescription] = useState("");
  const [reporterName, setReporterName] = useState("");
  const [reporterPhone, setReporterPhone] = useState("");
  const [gpsCoords, setGpsCoords] = useState(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedTicket, setSubmittedTicket] = useState(null);

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

  // Active trucks for live tracking map
  const activeTrucks = mockPilotData.trucks.map((t) => {
    const track = mockPilotData.activeTracking[t.id] || {};
    return {
      id: t.id,
      plate: t.plate,
      driver: t.driver,
      capacity: t.capacity,
      lat: track.lat || 10.3025,
      lng: track.lng || 123.9095,
      heading: track.heading || 90,
      eta: track.eta || "5 mins",
      isActive: true,
    };
  });

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setPhotoPreview(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleGetLocation = () => {
    if ("geolocation" in navigator) {
      setIsLocating(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setGpsCoords({ lat: latitude, lng: longitude });
          if (!locationName) {
            setLocationName(`Near Sitio Vilgon, ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
          }
          setIsLocating(false);
          haptic();
          toast("GPS coordinates attached.");
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
    }
  };

  const handleSubmitReport = (e) => {
    e.preventDefault();
    if (!locationName && !gpsCoords) {
      toast("Add a street location or tap 'Use My GPS'.", { variant: "error" });
      return;
    }

    setIsSubmitting(true);

    setTimeout(() => {
      const newId = `TKT-${String(tickets.length + 1).padStart(3, "0")}`;
      const created = {
        id: newId,
        location: locationName || "Near Collection Point",
        barangay: barangay,
        city: "Cebu City",
        reporter: reporterName || "Resident",
        urgency: urgency,
        status: "Pending",
        date: new Date().toISOString().split("T")[0],
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        lat: gpsCoords?.lat || 10.3016,
        lng: gpsCoords?.lng || 123.9086,
        category: category,
        description: description || `Reported ${category} at ${locationName}.`,
        photo: photoPreview,
      };

      setTickets((prev) => [created, ...prev]);
      setSubmittedTicket(created);
      setIsSubmitting(false);
      haptic(20);
    }, 600);
  };

  const filteredSchedules = mockPilotData.schedules.filter((s) => {
    const matchesZone = selectedZone === "all" || s.zoneId === selectedZone;
    const matchesQuery =
      !searchQuery ||
      s.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.days.some((d) => d.toLowerCase().includes(searchQuery.toLowerCase())) ||
      mockPilotData.zones
        .find((z) => z.id === s.zoneId)
        ?.name.toLowerCase()
        .includes(searchQuery.toLowerCase());
    return matchesZone && matchesQuery;
  });

  return (
    <div className="flex h-dvh w-full flex-col bg-background text-foreground font-sans selection:bg-emerald-100 selection:text-emerald-900 overflow-hidden select-none">



      {/* Main 1-Screen Body: Full-Screen Map Canvas as Permanent Backdrop */}
      <div className="relative flex-1 w-full overflow-hidden select-none">
        {/* Permanent Background Map Canvas */}
        <div className="absolute inset-0 h-full w-full z-0">
          <MapCanvas
            tickets={selectedTicket ? [selectedTicket] : []}
            trucks={activeTrucks}
            mapMode="pins"
            center={selectedTicket ? [selectedTicket.lat, selectedTicket.lng] : mapCenter}
            zoom={mapZoom}
            highlightedTicketId={selectedTicket?.id}
            onSelectTicket={(t) => {
              setSelectedTicket(t);
              setMapZoom(17);
              haptic();
            }}
            onMapDrag={() => {
              if (selectedTicket) {
                setSelectedTicket(null);
              }
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

        {/* Waze-Style Flush Top Navigation Banner (Light Glass Theme - Dynamic Slide-from-Top Readout) */}
        <div className="pointer-events-auto absolute top-0 inset-x-0 z-20 w-full border-b border-border bg-card/98 px-5 py-3 text-foreground backdrop-blur-md flex items-center justify-between gap-3.5 select-none overflow-hidden h-16 shadow-sm">
          {/* Left: Dynamic 3D Vector SVG Icon & Dynamic Slide-from-Top Readout */}
          <div className="min-w-0 flex-1 overflow-hidden relative h-11 flex items-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentBanner.id}
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 20, opacity: 0 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
                className="flex items-center gap-3.5 min-w-0 w-full"
              >
                {currentBanner.Icon && (
                  <div className="flex h-10 w-10 items-center justify-center shrink-0">
                    <currentBanner.Icon className="h-8 w-8 shrink-0" />
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-black tracking-tight text-foreground truncate leading-tight">
                    {currentBanner.title}
                  </h3>
                  {currentBanner.subtitle && (
                    <p className="text-xs font-semibold text-emerald-700 truncate leading-tight mt-0.5">
                      {currentBanner.subtitle}
                    </p>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Right: Top-Right Circular Profile Button with Initial Letter "O" */}
          <button
            type="button"
            onClick={() => {
              setIsMapSheetExpanded(false);
              setShowProfile(true);
              haptic();
            }}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-xs font-black text-white shadow-xs hover:bg-emerald-700 active:scale-95 transition-all cursor-pointer border border-emerald-500/30"
            title="Profile & Settings"
          >
            O
          </button>
        </div>



        {/* Floating Circular 3D Map Action Buttons (Option B: Symmetrical Left & Right Split) */}
        {/* 1. Bottom-Left: Focus Active Truck (Dedicated 3D Focus Truck Icon) */}
        <button
          type="button"
          onClick={() => {
            const activeTruck = activeTrucks && activeTrucks[0];
            if (activeTruck) {
              setMapCenter([activeTruck.lat, activeTruck.lng]);
            } else {
              setMapCenter([10.3025, 123.9095]);
            }
            setMapZoom(17);
            haptic();
          }}
          className="pointer-events-auto absolute bottom-[164px] left-4 z-20 flex h-12 w-12 items-center justify-center rounded-full bg-card/95 border border-border text-foreground shadow-lg backdrop-blur-md transition-all hover:scale-105 active:scale-95"
          title="Focus Active Truck"
        >
          <Waze3DFocusTruckIcon className="h-9 w-9 shrink-0" />
        </button>

        {/* 2. Bottom-Right: Center My Location (3D GPS Target Icon) */}
        <button
          type="button"
          onClick={() => {
            handleGetLocation();
            setMapCenter([10.3025, 123.9095]);
            setMapZoom(17);
            haptic();
          }}
          className="pointer-events-auto absolute bottom-[164px] right-4 z-20 flex h-12 w-12 items-center justify-center rounded-full bg-card/95 border border-border text-foreground shadow-lg backdrop-blur-md transition-all hover:scale-105 active:scale-95"
          title="Center My Location"
        >
          <Waze3DTargetIcon className="h-9 w-9 shrink-0" />
        </button>

        {/* Waze-Style Single-Screen Bottom Sheet Drawer (Peeks Search Bar & Action Pills) */}
        <div className="pointer-events-none absolute bottom-0 inset-x-0 z-30 flex justify-center">
          <motion.div
            layout
            transition={{
              type: "spring",
              damping: 30,
              stiffness: 320,
              mass: 0.8,
            }}
            className="pointer-events-auto w-full max-w-lg rounded-t-3xl border-t border-x border-border bg-card/98 p-4 shadow-2xl space-y-3 select-none backdrop-blur-xl"
          >
            {/* Drag Handle & Collapse Toggle Bar */}
            <div
              onClick={() => {
                setIsMapSheetExpanded(!isMapSheetExpanded);
                haptic();
              }}
              className="group flex flex-col items-center justify-center gap-1 cursor-pointer py-0.5"
            >
              <div className="h-1.5 w-10 rounded-full bg-muted-foreground/30 group-hover:bg-muted-foreground/60 transition-colors" />
            </div>

            {/* Top Search Bar (Tapping Expands Sheet) */}
            <div className="relative w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search sitio, route, or schedule..."
                value={searchQuery}
                onFocus={() => {
                  if (!isMapSheetExpanded) setIsMapSheetExpanded(true);
                }}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (!isMapSheetExpanded) setIsMapSheetExpanded(true);
                }}
                className="w-full rounded-2xl border border-border bg-muted/40 pl-9 pr-8 py-2.5 text-xs font-medium text-foreground placeholder:text-muted-foreground/70 focus:border-emerald-500 focus:bg-card focus:outline-none transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  aria-label="Clear Search"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Action Buttons Bar Inside Bottom Sheet (Admin Dashboard Style: rounded-xl) */}
            <div className="flex items-center justify-between gap-2 pt-0.5 pb-1 border-b border-border/60">
              <button
                type="button"
                onClick={() => {
                  switchTab("schedule");
                  if (!isMapSheetExpanded) setIsMapSheetExpanded(true);
                }}
                className={cn(
                  "flex h-11 flex-1 min-w-0 items-center justify-center gap-2 rounded-xl border px-3 text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95",
                  isMapSheetExpanded && (activeTab === "schedule" || activeTab === "map")
                    ? "border-emerald-500 bg-emerald-600 text-white font-bold"
                    : "border-border bg-card text-foreground hover:bg-muted"
                )}
              >
                <Waze3DCalendarIcon className="h-5.5 w-5.5 shrink-0" />
                <span className="truncate whitespace-nowrap">Schedules</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  switchTab("report");
                  if (!isMapSheetExpanded) setIsMapSheetExpanded(true);
                  setTimeout(() => {
                    fileInputRef.current?.click();
                  }, 150);
                }}
                className={cn(
                  "flex h-11 flex-1 min-w-0 items-center justify-center gap-2 rounded-xl border px-3 text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95",
                  isMapSheetExpanded && activeTab === "report"
                    ? "border-emerald-500 bg-emerald-600 text-white font-bold"
                    : "border-border bg-card text-foreground hover:bg-muted"
                )}
              >
                <Waze3DCameraIcon className="h-5.5 w-5.5 shrink-0" />
                <span className="truncate whitespace-nowrap">Report</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  switchTab("tickets");
                  if (!isMapSheetExpanded) setIsMapSheetExpanded(true);
                }}
                className={cn(
                  "flex h-11 flex-1 min-w-0 items-center justify-center gap-2 rounded-xl border px-3 text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95",
                  isMapSheetExpanded && activeTab === "tickets"
                    ? "border-emerald-500 bg-emerald-600 text-white font-bold"
                    : "border-border bg-card text-foreground hover:bg-muted"
                )}
              >
                <Waze3DTicketIcon className="h-5.5 w-5.5 shrink-0" />
                <span className="truncate whitespace-nowrap">Tickets</span>
              </button>
            </div>

            {/* Expandable Section Content inside Bottom Sheet */}
            <AnimatePresence>
              {isMapSheetExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <div className="h-[340px] overflow-y-auto space-y-4 pr-0.5 pt-2 scrollbar-hide">
                    <AnimatePresence mode="wait">
                      {/* DEFAULT LANDING & MAIN CONTENT: COLLECTION SCHEDULES */}
                      {(activeTab === "schedule" || activeTab === "map") && (
                        <motion.div
                          key="tab-schedule-main"
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -12 }}
                          transition={{ duration: 0.2, ease: "easeOut" }}
                          className="space-y-4 pt-1"
                        >

                  <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                          Sitio Vilgon &bull; Today's Pickup
                        </span>
                        <h2 className="text-lg font-bold tracking-tight text-foreground mt-0.5">
                          8:00 AM – 11:00 AM
                        </h2>
                        <p className="text-xs font-semibold text-emerald-700 mt-0.5">
                          Biodegradable (Nabubulok)
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          Truck Status
                        </span>
                        <span className="font-mono text-xs font-bold text-foreground">
                          5 mins away
                        </span>
                      </div>
                    </div>

                    {/* Minimalist Point-to-Point Live Route Progress Stepper */}
                    <div className="pt-2.5 border-t border-border/60 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-muted-foreground">
                          Route Progress
                        </span>
                        <span className="font-semibold text-emerald-700 text-xs">
                          Stop 2 of 4 &bull; On Site
                        </span>
                      </div>

                      {/* Clean Stepper Bar */}
                      <div className="relative px-0 pt-1 pb-0.5">
                        {/* Track Lines: Spans from center of first node, trailing to the rear bumper of the active truck */}
                        <div className="absolute top-4 left-[32px] right-[32px] h-0.5 rounded-full bg-border z-0" />
                        <div className="absolute top-4 left-[32px] w-[calc(33%-14px)] h-0.5 rounded-full bg-emerald-600 z-0" />

                        {/* Waypoint Nodes */}
                        <div className="relative z-10 flex items-center justify-between">
                          {[
                            { id: 1, name: "Sector A", time: "8:00 AM", status: "completed" },
                            { id: 2, name: "Sitio Vilgon", time: "8:45 AM", status: "current" },
                            { id: 3, name: "Tejero Chapel", time: "9:30 AM", status: "upcoming" },
                            { id: 4, name: "MRF Facility", time: "10:30 AM", status: "destination" },
                          ].map((stop, idx) => (
                            <div key={stop.id} className="flex flex-col items-center w-16 text-center shrink-0">
                              {/* Node Badge */}
                              {stop.status === "completed" && (
                                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-600 text-white shadow-2xs">
                                  <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                                </div>
                              )}
                              {stop.status === "current" && (
                                <div className="flex h-7 w-7 items-center justify-center -translate-y-1.5">
                                  <Waze3DTruckIcon className="h-8 w-8 shrink-0 filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.25)]" />
                                </div>
                              )}
                              {stop.status === "upcoming" && (
                                <div className="flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card text-muted-foreground">
                                  <span className="text-[9px] font-semibold">{idx + 1}</span>
                                </div>
                              )}
                              {stop.status === "destination" && (
                                <div className="flex h-7 w-7 items-center justify-center rounded-full border border-rose-200 bg-card shadow-2xs">
                                  <Waze3DPinIcon className="h-4 w-4 shrink-0" />
                                </div>
                              )}

                              {/* Stop Title & Time */}
                              <div className="mt-1 text-center min-w-0">
                                <span
                                  className={cn(
                                    "block text-[11px] leading-tight truncate max-w-[68px]",
                                    stop.status === "current"
                                      ? "font-bold text-foreground"
                                      : stop.status === "completed"
                                      ? "font-medium text-foreground/80"
                                      : "font-normal text-muted-foreground"
                                  )}
                                >
                                  {stop.name}
                                </span>
                                <span className="block text-[9px] font-mono text-muted-foreground/70">
                                  {stop.time}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Zone Filter Chips (Admin Dashboard Style: rounded-xl) */}
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
                    <button
                      type="button"
                      onClick={() => setSelectedZone("all")}
                      className={cn(
                        "shrink-0 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer",
                        selectedZone === "all"
                          ? "bg-emerald-600 text-white font-bold shadow-xs"
                          : "border border-border bg-card text-muted-foreground hover:bg-muted"
                      )}
                    >
                      All Zones
                    </button>
                    {mockPilotData.zones.map((z) => {
                      const shortName = z.name.includes("Sector")
                        ? z.name.split(" Sector")[0]
                        : z.name.split(" (")[0];

                      return (
                        <button
                          key={z.id}
                          type="button"
                          onClick={() => setSelectedZone(z.id)}
                          className={cn(
                            "shrink-0 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer",
                            selectedZone === z.id
                              ? "bg-emerald-600 text-white font-bold shadow-xs"
                              : "border border-border bg-card text-muted-foreground hover:bg-muted"
                          )}
                        >
                          {shortName}
                        </button>
                      );
                    })}
                  </div>

                  {/* Schedule List */}
                  <div className="space-y-3">
                    {filteredSchedules.map((sch) => {
                      const zone = mockPilotData.zones.find((z) => z.id === sch.zoneId);
                      const isBiodegradable = sch.type.includes("Nabubulok");
                      const isRecyclable = sch.type.includes("Recyclable");

                      const nameParts = zone?.name ? zone.name.split(" (") : ["Barangay Sector", ""];
                      const sectorTitle = nameParts[0];
                      const sitiosList = nameParts[1] ? nameParts[1].replace(")", "") : "";

                      const DAY_ABBR = {
                        Monday: "Mon",
                        Tuesday: "Tue",
                        Wednesday: "Wed",
                        Thursday: "Thu",
                        Friday: "Fri",
                        Saturday: "Sat",
                        Sunday: "Sun",
                      };
                      const formattedDays = sch.days.map((d) => DAY_ABBR[d] || d).join(", ");

                      const categoryBadgeLabel = isBiodegradable
                        ? "Biodegradable"
                        : isRecyclable
                        ? "Recyclable"
                        : "Non-Biodegradable";

                      return (
                        <div
                          key={sch.id}
                          className="rounded-xl border border-border bg-card p-4 transition-colors space-y-3"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <h3 className="text-sm font-bold text-foreground truncate">
                                {sectorTitle}
                              </h3>
                              {sitiosList && (
                                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                                  {sitiosList}
                                </p>
                              )}
                            </div>
                            <span
                              className={cn(
                                "text-xs font-semibold shrink-0 whitespace-nowrap",
                                isBiodegradable
                                  ? "text-emerald-700"
                                  : isRecyclable
                                  ? "text-blue-700"
                                  : "text-amber-700"
                              )}
                            >
                              {categoryBadgeLabel}
                            </span>
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-y-1 gap-x-2 text-xs pt-2.5 border-t border-border/60">
                            <span className="font-medium text-foreground truncate">{formattedDays}</span>
                            <span className="font-mono text-xs font-semibold text-foreground whitespace-nowrap ml-auto">{sch.time}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* SLIDE-UP SECTION: DISPATCH WASTE REPORT */}
              {activeTab === "report" && (
                <motion.div
                  key="tab-report"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="space-y-3 pt-1"
                >

                  {submittedTicket ? (
                    <div className="rounded-2xl border border-border bg-card p-5 text-center space-y-3">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                        <CheckCircle2 className="h-7 w-7" strokeWidth={1.75} />
                      </div>
                      <div>
                        <h2 className="text-base font-bold tracking-tight text-foreground">
                          Report Dispatched
                        </h2>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Ticket <span className="font-mono font-bold text-emerald-700">{submittedTicket.id}</span> assigned to Juan Dela Cruz.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setSubmittedTicket(null);
                          setPhotoPreview(null);
                          setLocationName("");
                        }}
                        className="flex h-9 w-full items-center justify-center rounded-xl border border-border bg-card text-xs font-semibold text-foreground transition-colors hover:bg-muted"
                      >
                        Submit Another Report
                      </button>
                    </div>
                  ) : (
                    <form
                      onSubmit={handleSubmitReport}
                      className={cn(
                        "space-y-4 rounded-2xl p-4 transition-all",
                        photoPreview
                          ? "border border-border bg-card shadow-xs"
                          : "border-none bg-transparent shadow-none p-0"
                      )}
                    >
                      {/* Photo Upload Zone */}

                      {/* Photo Capture Zone */}
                      <div>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          ref={fileInputRef}
                          onChange={handlePhotoChange}
                          className="hidden"
                        />

                        {photoPreview ? (
                          <div className="space-y-4">
                            <div className="mb-1.5">
                              <label className="block text-xs font-bold text-foreground">
                                Captured Photo
                              </label>
                            </div>
                            <div className="relative overflow-hidden rounded-xl border border-border bg-muted">
                              <img src={photoPreview} alt="Captured waste" className="h-44 w-full object-cover" />
                              <button
                                type="button"
                                onClick={() => setPhotoPreview(null)}
                                className="absolute top-2 right-2 rounded-full bg-black/70 p-1.5 text-white cursor-pointer hover:bg-black/90 transition-colors"
                              >
                                <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="flex min-h-[280px] h-full w-full flex-col items-center justify-center gap-3.5 rounded-2xl border-none bg-transparent text-muted-foreground hover:bg-muted/20 transition-all cursor-pointer p-6 text-center"
                          >
                            <Waze3DCameraIcon className="h-16 w-16 shrink-0 drop-shadow-xs" />
                            <div>
                              <span className="block text-base font-bold text-foreground">Tap to Open Camera</span>
                              <span className="block text-xs font-medium text-muted-foreground mt-1 max-w-[220px] mx-auto leading-normal">
                                Take a photo of the waste or bin on the spot
                              </span>
                            </div>
                            <span className="mt-2 inline-flex items-center justify-center rounded-xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs">
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
                            <label className="mb-1.5 block text-xs font-bold text-foreground">
                              Issue Category
                            </label>
                            <select
                              value={category}
                              onChange={(e) => setCategory(e.target.value)}
                              className="w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-xs font-semibold text-foreground focus:border-emerald-500 focus:outline-none transition-colors"
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
                            <label className="mb-1.5 block text-xs font-bold text-foreground">
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
                                    "rounded-xl py-2 text-xs font-bold transition-colors cursor-pointer",
                                    urgency === lvl
                                      ? "bg-emerald-600 text-white shadow-xs"
                                      : "border border-border bg-card text-muted-foreground hover:bg-muted"
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
                              <label className="block text-xs font-bold text-foreground">
                                Location / Sitio
                              </label>
                              <button
                                type="button"
                                onClick={handleGetLocation}
                                disabled={isLocating}
                                className="flex items-center gap-1 text-xs font-bold text-emerald-600 hover:text-emerald-700 cursor-pointer disabled:opacity-60"
                              >
                                <MapPin className="h-3.5 w-3.5" strokeWidth={2} />
                                {isLocating ? "Locating..." : "Use My GPS"}
                              </button>
                            </div>

                            <input
                              type="text"
                              placeholder="e.g. Sitio Vilgon, near Chapel"
                              value={locationName}
                              onChange={(e) => setLocationName(e.target.value)}
                              className="w-full rounded-xl border border-border bg-card px-3.5 py-2.5 text-xs font-semibold text-foreground focus:border-emerald-500 focus:outline-none transition-colors"
                              required
                            />
                          </div>

                          {/* Minimalist Confirm Button */}
                          <button
                            type="button"
                            onClick={handleSubmitReport}
                            disabled={isSubmitting}
                            className="flex h-11 w-full items-center justify-center rounded-xl bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-700 active:scale-[0.98] transition-all cursor-pointer shadow-xs disabled:opacity-60"
                          >
                            {isSubmitting ? (
                              <RefreshCw className="h-4 w-4 animate-spin" strokeWidth={2} />
                            ) : (
                              "Confirm"
                            )}
                          </button>
                        </motion.div>
                      )}
                    </form>
                  )}
                  </motion.div>
                )}

                {/* SLIDE-UP SECTION: MY FILED TICKETS */}
                {activeTab === "tickets" && (
                  <motion.div
                    key="tab-tickets"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="space-y-3.5"
                  >
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide pt-1">
                      {[
                        { id: "all", label: `All (${tickets.length})` },
                        { id: "Pending", label: `Waiting (${tickets.filter((t) => t.status === "Pending").length})` },
                        { id: "In Progress", label: `On the Way (${tickets.filter((t) => t.status === "In Progress").length})` },
                        { id: "Resolved", label: `Cleaned Up (${tickets.filter((t) => t.status === "Resolved").length})` },
                      ].map((f) => (
                        <button
                          key={f.id}
                          type="button"
                          onClick={() => {
                            setTicketFilter(f.id);
                            haptic();
                          }}
                          className={cn(
                            "shrink-0 rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap",
                            ticketFilter === f.id
                              ? "bg-emerald-600 text-white font-bold shadow-xs"
                              : "border border-border bg-card text-muted-foreground hover:bg-muted"
                          )}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>

                    <div className="space-y-2.5">
                      {tickets
                        .filter((t) => (ticketFilter === "all" ? true : t.status === ticketFilter))
                        .map((t) => (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => {
                              setSelectedTicket(t);
                              switchTab("map");
                              haptic();
                            }}
                            className="w-full rounded-xl border border-border bg-card p-3.5 text-left transition-colors hover:border-zinc-300 active:scale-[0.99] cursor-pointer space-y-2"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-mono text-xs font-bold text-foreground">{t.id}</span>
                              <StatusBadge status={t.status} />
                            </div>

                            <div>
                              <h3 className="text-sm font-bold text-foreground leading-snug">
                                {t.location}
                              </h3>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {t.category}
                              </p>
                            </div>

                            <div className="flex items-center justify-between text-xs pt-2 border-t border-border/60">
                              <span className="font-mono text-muted-foreground">{t.date} &bull; {t.time}</span>
                              <UrgencyBadge urgency={t.urgency} />
                            </div>
                          </button>
                        ))}
                    </div>
                  </motion.div>
                )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>

      {/* Ticket Detail Bottom Sheet */}
      <BottomSheet
        open={!!selectedTicket}
        onClose={() => setSelectedTicket(null)}
        title="Report Details"
      >
        {selectedTicket && (
          <div className="space-y-4 select-text">
            {selectedTicket.photo ? (
              <img
                src={selectedTicket.photo}
                alt={`Waste report ${selectedTicket.id}`}
                className="h-44 w-full rounded-lg border border-border object-cover"
              />
            ) : (
              <div className="flex h-24 w-full items-center justify-center rounded-lg bg-muted">
                <Camera className="h-5 w-5 text-muted-foreground/60" strokeWidth={1.75} />
              </div>
            )}

            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-sm font-semibold text-emerald-700">
                {selectedTicket.id}
              </span>
              <div className="flex items-center gap-1.5">
                <UrgencyBadge urgency={selectedTicket.urgency} />
                <StatusBadge status={selectedTicket.status} />
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold text-foreground">{selectedTicket.location}</h3>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {selectedTicket.description}
              </p>
            </div>

            <div className="rounded-lg border border-border bg-muted/40 p-3.5">
              <InfoRow label="Category" value={selectedTicket.category} />
              <InfoRow
                label="Barangay"
                value={`${selectedTicket.barangay}, ${selectedTicket.city}`}
              />
              <InfoRow label="Reported By" value={selectedTicket.reporter} />
              <InfoRow
                label="Date"
                value={<span className="font-mono">{selectedTicket.date}</span>}
              />
              <InfoRow
                label="Time"
                value={<span className="font-mono">{selectedTicket.time}</span>}
              />
              <InfoRow
                label="GPS"
                value={
                  <span className="font-mono text-xs">
                    {selectedTicket.lat?.toFixed(4)}, {selectedTicket.lng?.toFixed(4)}
                  </span>
                }
              />
            </div>

            <button
              type="button"
              onClick={() => {
                setSelectedTicket(null);
                switchTab("map");
              }}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 text-sm font-semibold text-white transition-all hover:bg-emerald-700 active:scale-[0.98] cursor-pointer"
            >
              <Map className="h-4 w-4" strokeWidth={1.75} />
              View on Live Map
            </button>
          </div>
        )}
      </BottomSheet>

      {/* Notifications Bottom Sheet */}
      <BottomSheet
        open={showNotifications}
        onClose={() => setShowNotifications(false)}
        title="Notifications"
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between pb-1">
            <span className="text-xs text-muted-foreground font-medium">Recent Updates & Alerts</span>
            {unreadNotifications > 0 && (
              <button
                type="button"
                onClick={() => {
                  setUnreadNotifications(0);
                  setNotificationsList((prev) => prev.map((n) => ({ ...n, unread: false })));
                  toast("All notifications marked as read.");
                }}
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 cursor-pointer"
              >
                Mark all as read
              </button>
            )}
          </div>

          <div className="space-y-2.5">
            {notificationsList.map((n) => (
              <div
                key={n.id}
                className={cn(
                  "rounded-xl border p-3.5 transition-all",
                  n.unread
                    ? "border-emerald-200 bg-emerald-50/50"
                    : "border-border bg-card"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <h4 className="text-xs font-semibold text-foreground">{n.title}</h4>
                  <span className="text-[10px] font-mono text-muted-foreground shrink-0">{n.time}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{n.message}</p>
              </div>
            ))}
          </div>
        </div>
      </BottomSheet>

      {/* Profile & Settings Slide-Up Bottom Sheet */}
      <BottomSheet
        open={showProfile}
        onClose={() => setShowProfile(false)}
        title="Profile & Settings"
      >
        <div className="h-[340px] overflow-y-auto space-y-4 pr-0.5 pt-2 scrollbar-hide">
          {/* User Profile Summary Header */}
          <div className="flex items-center gap-4 rounded-2xl border border-border bg-card p-4">
            <div className="flex h-13 w-13 items-center justify-center rounded-full bg-emerald-600 font-black text-white text-xl shadow-sm shrink-0">
              O
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-bold text-foreground truncate">Orlando Jr.</h3>
              <p className="text-xs font-semibold text-foreground mt-0.5">Sitio Vilgon</p>
              <p className="text-[11px] text-muted-foreground">Brgy. Tejero, Cebu City</p>
            </div>
          </div>

          {/* Account Info Details */}
          <div className="rounded-xl border border-border bg-card p-3.5 space-y-2">
            <InfoRow label="Mobile Phone" value="+63 917 888 1923" />
            <InfoRow label="Barangay Sector" value="Sector A (Sitio Vilgon)" />
            <InfoRow label="Reports Filed" value={`${tickets.length} tickets`} />
            <InfoRow label="Account Status" value={<span className="text-emerald-600 font-bold">Active / Verified</span>} />
          </div>

          {/* Settings & Preferences */}
          <div className="space-y-2 pt-1">
            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">
              Preferences
            </h4>

            <div className="rounded-xl border border-border divide-y divide-border/60 bg-card overflow-hidden">
              <div className="flex items-center justify-between p-3">
                <div className="flex items-center gap-2.5">
                  <Bell className="h-4 w-4 text-emerald-600" />
                  <span className="text-xs font-bold text-foreground">Pickup Notifications</span>
                </div>
                <input type="checkbox" defaultChecked className="h-4 w-4 accent-emerald-600 rounded cursor-pointer" />
              </div>

              <div className="flex items-center justify-between p-3">
                <div className="flex items-center gap-2.5">
                  <MapPin className="h-4 w-4 text-emerald-600" />
                  <span className="text-xs font-bold text-foreground">Home Address</span>
                </div>
                <span className="text-xs font-semibold text-muted-foreground">Sitio Vilgon</span>
              </div>

              <div className="flex items-center justify-between p-3">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  <span className="text-xs font-bold text-foreground">Security</span>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                setShowProfile(false);
                toast("Profile preferences saved.");
              }}
              className="flex h-11 w-full items-center justify-center rounded-xl bg-emerald-600 text-xs font-bold text-white transition-all hover:bg-emerald-700 active:scale-[0.98] cursor-pointer shadow-xs"
            >
              Save Preferences
            </button>
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
                You will need to log back in to access the portal.
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
