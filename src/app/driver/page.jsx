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
  ClipboardList,
  History,

  ChevronLeft,
  ChevronRight,
  ChevronDown,
  LocateFixed,
  Truck,
  User,
  Calendar,
  Check,
  ArrowUpDown,
  Bell,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { mockPilotData } from "@/lib/mock-data";
import {
  useLiveRoute,
  startRoute,
  stopByAtPoint,
  continueRoute,
  completeRoute,
  updateTracking,
  getSchedule,
  getSchedules,
  scheduleLabel,
  compactScheduleLabel,
  scheduleStops,
  scheduleEndpointTitle,
  splitScheduleLabel,
  acceptAssignment,
  cancelAssignment,
  reinitSupabaseSync,
  dutyStatusOf,
} from "@/lib/live-route";
import { smoothFix, createSnapFilter, compassBearing, resolveTravelHeading } from "@/lib/route-snap";
import { cn, haptic } from "@/lib/utils";
import {
  useNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "@/lib/notifications";
import { playDing, useSoundEnabled, setSoundEnabled } from "@/lib/sounds";
import { useMapView } from "@/lib/use-map-view";
import { Button } from "@/components/ui/button";
import { useFleet } from "@/lib/fleet";
import { getDriverSession, clearDriverSession } from "@/lib/driver-session";
import { changeDriverPassword } from "@/lib/driver-accounts";
import { MapSkeleton, DriverShellSkeleton } from "@/components/ui/skeletons";
import { useToast } from "@/components/pwa/Toast";
import DbStatusBanner from "@/components/pwa/DbStatusBanner";
import { supabase } from "@/lib/supabase";

// Minimalist High-DPI Leaflet MapCanvas
const MapCanvas = dynamic(() => import("@/components/map/map-canvas"), {
  ssr: false,
  loading: () => <MapSkeleton />,
});

const TAB_IDS = ["map", "assignment", "history", "profile"];

function assignedAreaTagline(schedule, zone) {
  if (!schedule) return null;
  const names = (schedule.routePoints || []).map((p) => p.name).filter(Boolean);
  if (!names.length) {
    return zone ? zone.name.split("&")[0].trim() : scheduleLabel(schedule);
  }
  if (names.length === 1) return names[0];
  return `${names[0]} +${names.length - 1} stops`;
}

// Compact label for driver list rows: the first two locations plus a muted
// "+N more" suffix when the route is longer (see compactScheduleLabel).
// Detail screens list every stop in their own card instead so nothing is
// ever cut off.
function CompactScheduleLabel({ label }) {
  const text = label == null ? "" : String(label);
  const parts = splitScheduleLabel(text);
  if (parts.length <= 2) return <>{text}</>;
  return (
    <>
      {parts.slice(0, 2).join(", ")}
      <span className="text-muted-foreground"> +{parts.length - 2} more</span>
    </>
  );
}

// Detail header: first stop → last stop, so it stays tidy for any count.
// The full stop list lives in the card below.
function detailHeaderTitle(schedule) {
  return scheduleEndpointTitle(schedule);
}

// Numbered stop list card for the assignment/history detail screens.
function DetailStopsCard({ schedule }) {
  const stops = scheduleStops(schedule);
  if (!stops.length) return null;
  return (
    <div className="mt-5 px-4">
      <p className="px-1 pb-1.5 text-[13px] text-muted-foreground">Stops · {stops.length}</p>
      <div className="divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/60 bg-card">
        {stops.map((stop, i) => (
          <div key={`${stop.name}-${i}`} className="flex min-h-[48px] items-center gap-3 px-4 py-2.5">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-600/10 text-[12px] font-semibold text-emerald-600">
              {i + 1}
            </span>
            <span className="min-w-0 flex-1 text-[15px] leading-snug break-words text-foreground">{stop.name}</span>
            {stop.time && (
              <span className="shrink-0 text-[13px] tabular-nums text-muted-foreground">{stop.time}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// "2026-09-27" → "Today", "Tomorrow", or "Mon, Sep 28". Null → null.
function assignmentDayLabel(iso) {
  if (!iso) return null;
  const now = new Date();
  const toISO = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  if (iso === toISO(now)) return "Today";
  if (iso === toISO(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1))) return "Tomorrow";
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  if (Number.isNaN(dt.getTime())) return iso;
  return dt.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

// Full date with year for History rows, e.g. "Sep 28, 2026". Null → null.
function formatHistoryDate(iso) {
  if (!iso) return null;
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  if (Number.isNaN(dt.getTime())) return iso;
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// Relative time for driver inbox rows ("2h ago", "Yesterday").
function driverTimeAgo(iso, nowMs) {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "";
  const mins = Math.max(0, Math.round((nowMs - t) / 60000));
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// Bottom-nav tab for the floating pill bar: bold outline icon over a small
// label — the active tab gets a soft neutral pill behind icon + label.
function DriverTab({ id, label, icon: Icon, activeTab, onSelect, badge = 0 }) {
  const active = activeTab === id;
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-label={label}
      className={cn(
        "relative flex cursor-pointer flex-col items-center justify-center gap-0.5 rounded-full px-4 py-1.5 transition-all active:scale-95",
        active ? "bg-foreground/[0.07] text-foreground" : "text-foreground"
      )}
    >
      <span className="relative flex items-center justify-center">
        <Icon
          className="relative h-[22px] w-[22px]"
          strokeWidth={2}
        />
        {badge > 0 && (
          <span className="absolute -right-2.5 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold leading-none text-white">
            {badge > 9 ? "9+" : badge}
          </span>
        )}
      </span>
      <span className={`text-[10px] leading-none ${active ? "font-semibold" : "font-medium"}`}>{label}</span>
    </button>
  );
}

// Car/truck steering wheel glyph (lucide has no car wheel): outer rim, hub,
// and three lower spokes, drawn in the same 24px stroke style as lucide icons.
function SteeringWheelIcon({ className, strokeWidth = 2 }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="2" />
      <path d="M12 14v7" />
      <path d="M10.3 13.2 4.2 16.5" />
      <path d="M13.7 13.2l6.1 3.3" />
    </svg>
  );
}

// Flat vector badge for history cards: clock face.
function HistoryBadge({ className }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <circle cx="20" cy="20" r="20" fill="#059669" />


      <circle cx="20" cy="20" r="10.5" fill="#ffffff" />
      <path d="M20 20 V13 M20 20 L24 22" fill="none" stroke="#059669" strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="20" cy="20" r="1.7" fill="#059669" />
    </svg>
  );
}

// Flat vector badge for assignment cards: winding route path.
function AssignmentBadge({ className }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <circle cx="20" cy="20" r="20" fill="#059669" />
      <g transform="translate(20 20) scale(0.7) translate(-20 -20)" fill="none" stroke="#ffffff" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="10" cy="31.7" r="5" />
        <path d="M15 31.7 h14.2 a5.8 5.8 0 0 0 0-11.7 h-18.3 a5.8 5.8 0 0 1 0-11.7 H25" />
        <circle cx="30" cy="8.3" r="5" />
      </g>
    </svg>
  );
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
  const [profileView, setProfileView] = useState("main"); // "main" | "password" | "mapview"
  const [mapView, setMapView] = useMapView("driver-map-view");
  // Tasks sub-screen: the list drills into one assignment's details.
  const [assignmentDetailId, setAssignmentDetailId] = useState(null);
  // Task ids already seen in the Tasks tab (persisted per truck) — drives
  // the tab badge so it clears once viewed and only returns for new work.
  const [seenByTruck, setSeenByTruck] = useState(() => {
    if (typeof window === "undefined") return {};
    try {
      const parsed = JSON.parse(window.localStorage.getItem("driver-tasks-seen") || "{}");
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  });
  const markTasksSeen = (truckId, ids) => {
    if (!truckId || ids.length === 0) return;
    setSeenByTruck((prev) => {
      const have = prev[truckId] || [];
      const fresh = ids.filter((id) => !have.includes(id));
      if (fresh.length === 0) return prev;
      const next = { ...prev, [truckId]: [...have, ...fresh].slice(-100) };
      try {
        window.localStorage.setItem("driver-tasks-seen", JSON.stringify(next));
      } catch {}
      return next;
    });
  };
  // Cancel-assignment confirm modal (task details screen).
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [confirmStart, setConfirmStart] = useState(false);
  const [confirmStopBy, setConfirmStopBy] = useState(false);
  const [confirmTilt, setConfirmTilt] = useState(false);
  const [cancelReason, setCancelReason] = useState("Truck breakdown");
  const [isCancelling, setIsCancelling] = useState(false);
  // History sub-screen: same drill-in for completed routes.
  const [historyDetailId, setHistoryDetailId] = useState(null);
  // History order: newest or oldest first (undated last in both).
  const [historySort, setHistorySort] = useState("newest");
  // Driver inbox: dispatch + broadcast notices for this truck.
  const [showDriverUpdates, setShowDriverUpdates] = useState(false);
  const driverAudiences = useMemo(
    () => ["drivers", ...(selectedTruckId ? [`driver:${selectedTruckId}`] : [])],
    [selectedTruckId]
  );
  const driverNotifs = useNotifications(driverAudiences);
  const driverUnread = driverNotifs.filter((n) => !n.isRead).length;
  // Render-time clock for relative timestamps (same discipline as the
  // resident Updates screen).
  const [driverNotifNow] = useState(() => Date.now());
  // History date filter: presets + native day picker (Manila day keys).
  const [histDateRange, setHistDateRange] = useState("all"); // "all" | "today" | "week" | "month" | "custom"
  const [histCustomDate, setHistCustomDate] = useState(""); // "YYYY-MM-DD"
  const [histRangeOpen, setHistRangeOpen] = useState(false);
  const histDateInputRef = useRef(null);
  const openHistDayPicker = () => {
    haptic();
    const el = histDateInputRef.current;
    if (!el) return;
    if (typeof el.showPicker === "function") {
      try { el.showPicker(); return; } catch { /* fallback below */ }
    }
    el.click();
  };
  const histManilaDayKey = (d = new Date()) =>
    new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
  const histInRange = (s) => {
    if (histDateRange === "all") return true;
    const key = (s.assignmentDate || "").slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return false;
    if (histDateRange === "custom") return histCustomDate ? key === histCustomDate : true;
    const toDays = (k) => Math.round(new Date(`${k}T00:00:00+08:00`).getTime() / 86400000);
    const diff = toDays(histManilaDayKey()) - toDays(key);
    if (histDateRange === "today") return diff === 0;
    if (histDateRange === "week") return diff >= 0 && diff < 7;
    if (histDateRange === "month") return diff >= 0 && diff < 30;
    return true;
  };
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const [pwErrors, setPwErrors] = useState({});
  const [pwSaving, setPwSaving] = useState(false);

  // Re-entering the Profile tab discards unsaved password edits (same as the
  // resident side): tabs never unmount, so without this a half-typed password
  // would still be sitting in the fields when coming back.
  const prevDriverTabRef = useRef(activeTab);
  useEffect(() => {
    const prev = prevDriverTabRef.current;
    prevDriverTabRef.current = activeTab;
    if (activeTab !== "profile" || prev === "profile") return;
    setCurrentPassword("");
    setNewPassword("");
    setConfirmNewPassword("");
    setPwErrors({});
  }, [activeTab]);

  const router = useRouter();
  const [sessionReady, setSessionReady] = useState(false);
  const [driverSession, setDriverSession] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace("/driver-login");
        return;
      }

      supabase.from('profiles').select('role, full_name, id, status').eq('id', session.user.id).maybeSingle().then(({ data: profile }) => {
        if ((profile?.status || "").toLowerCase() === "suspended") {
          supabase.auth.signOut().finally(() => router.replace("/driver-login"));
          return;
        }
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
  // True once the running watch accepted a fix this session; gates the
  // per-fix local marker path below (coords otherwise holds a stale or
  // fallback position). Batches with setCoords into a single render.
  const [hasLiveFix, setHasLiveFix] = useState(false);
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
      setShowPasswords(false);
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
  const soundEnabled = useSoundEnabled();
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

  // New-task ding: whenever the admin assigns work to this truck, the queued
  // count grows — play the same ding residents hear. The snapshot present on
  // mount (or after switching trucks) is only recorded so opening the page
  // with pending work never replays sound for past events. Completions and
  // removals shrink the count and stay silent.
  const assignmentSoundRef = useRef(null);
  useEffect(() => {
    const key = selectedTruckId || "";
    const prev = assignmentSoundRef.current;
    if (!prev || prev.truckId !== key) {
      assignmentSoundRef.current = { truckId: key, count: pendingAssignments };
      return;
    }
    if (pendingAssignments > prev.count && soundEnabled) {
      playDing();
    }
    assignmentSoundRef.current = { truckId: key, count: pendingAssignments };
  }, [pendingAssignments, selectedTruckId, soundEnabled]);

  const assignedZone = assignedSchedule
    ? mockPilotData.zones.find((z) => z.id === assignedSchedule.zoneId)
    : null;
  const assignedAreaName = assignedAreaTagline(assignedSchedule, assignedZone);

  // Tasks list: every queued assignment for this truck, most actionable first.
  const myAssignments = (() => {
    if (!selectedTruckId) return [];
    const status = live.scheduleStatus;
    const eff = (s) => status[s.id] ?? s.status;
    const mine = getSchedules().filter(
      (s) =>
        s.truckId === selectedTruckId &&
        !s.isArchived &&
        (eff(s) === "In Progress" ||
          eff(s) === "Accepted" ||
          eff(s) === "Scheduled" ||
          eff(s) === "Assigned")
    );
    const rank = (s) =>
      eff(s) === "In Progress" ? 0 : eff(s) === "Accepted" ? 1 : 2;
    // Same rank → earliest day first; undated last.
    const dayKey = (s) => s.assignmentDate || "9999-99-99";
    return [...mine].sort((a, b) => rank(a) - rank(b) || (dayKey(a) < dayKey(b) ? -1 : dayKey(a) > dayKey(b) ? 1 : 0));
  })();
  // Grouped by the day the admin set: Today, Tomorrow, dates, then unscheduled.
  const assignmentGroups = (() => {
    const byDay = new Map();
    for (const s of myAssignments) {
      const key = s.assignmentDate || "unscheduled";
      if (!byDay.has(key)) byDay.set(key, []);
      byDay.get(key).push(s);
    }
    const dated = [...byDay.entries()]
      .filter(([key]) => key !== "unscheduled")
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    if (byDay.has("unscheduled")) dated.push(["unscheduled", byDay.get("unscheduled")]);
    return dated.map(([key, items]) => ({
      key,
      label: key === "unscheduled" ? "Unscheduled" : (assignmentDayLabel(key) ?? key),
      items,
    }));
  })();
  const detailSchedule = assignmentDetailId
    ? (getSchedules().find((s) => s.id === assignmentDetailId && !s.isArchived) ?? null)
    : null;
  const detailStatus = detailSchedule
    ? (live.scheduleStatus[detailSchedule.id] ?? detailSchedule.status)
    : null;
  const isDetailAccepted =
    detailStatus === "Accepted" || detailStatus === "In Progress";
  const detailZone = detailSchedule
    ? mockPilotData.zones.find((z) => z.id === detailSchedule.zoneId)
    : null;
  const detailAreaName = assignedAreaTagline(detailSchedule, detailZone);

  // Unseen queued tasks = tab badge. Opening Tasks marks everything seen
  // (nothing is unseen while looking at the list); deletes, completions
  // and archives leave the queue so the badge drops.
  const seenTaskIds = seenByTruck[selectedTruckId] ?? [];
  const unseenTasks =
    activeTab === "assignment"
      ? 0
      : myAssignments.filter((s) => !seenTaskIds.includes(s.id)).length;

  // Completed routes for this truck — the permanent record. Never
  // dismissed from here; only the admin Bin can remove records.
  const completedHistory = getSchedules().filter(
    (s) =>
      s.truckId === selectedTruckId &&
      live.scheduleStatus[s.id] === "Completed" &&
      !s.isArchived
  );
  const compareHistory = (a, b) => {
    const ka = a.assignmentDate || "";
    const kb = b.assignmentDate || "";
    if (ka && kb) {
      if (ka === kb) return 0;
      const newerFirst = historySort !== "oldest";
      return (ka < kb) === newerFirst ? 1 : -1;
    }
    if (ka) return -1;
    if (kb) return 1;
    return 0;
  };
  const sortedHistory = [...completedHistory].sort(compareHistory);
  // TEMPORARY preview: two mock rows so the filter can be seen and tried
  // before any route is completed. Remove when real history exists.
  const previewHistoryRows = [
    {
      id: "preview",
      label: mockPilotData.zones[0]?.name ?? "Sitio Vilgon & Sitio Mac Arthur",
      time: "08:00 AM - 11:00 AM",
      assignmentDate: "2026-09-27",
    },
    {
      id: "preview-2",
      label: mockPilotData.zones[1]?.name ?? "Sitio Silangan & Sitio Daclan",
      time: "01:00 PM - 04:00 PM",
      assignmentDate: "2026-09-26",
    },
  ];
  const isHistoryPreview = sortedHistory.length === 0;
  const displayHistory = (isHistoryPreview ? previewHistoryRows : sortedHistory).filter(histInRange).slice().sort(compareHistory);
  // Completed route shown in the History details sub-screen.
  // "preview" rows are the temporary mock cards shown when history is
  // empty, so tapping them previews the details screen with sample data.
  const previewSchedules = {
    preview: { sched: mockPilotData.schedules[0], date: "2026-09-27" },
    "preview-2": { sched: mockPilotData.schedules[1], date: "2026-09-26" },
  };
  const historyDetail = historyDetailId
    ? (getSchedules().find((s) => s.id === historyDetailId && !s.isArchived) ??
       (previewSchedules[historyDetailId]
        ? {
            id: historyDetailId,
            zoneId: previewSchedules[historyDetailId].sched?.zoneId ?? null,
            truckId: selectedTruckId,
            status: "Completed",
            collectionType: previewSchedules[historyDetailId].sched?.type ?? "—",
            collectionDays: previewSchedules[historyDetailId].sched?.days ?? [],
            time: previewSchedules[historyDetailId].sched?.time ?? "—",
            routePoints: previewSchedules[historyDetailId].sched?.routePoints ?? [],
            assignmentDate: previewSchedules[historyDetailId].date,
          }
        : null))
    : null;
  const historyDetailZone = historyDetail
    ? mockPilotData.zones.find((z) => z.id === historyDetail.zoneId)
    : null;
  const historyDetailArea = assignedAreaTagline(historyDetail, historyDetailZone);

  const rawActiveSchedule = truckState?.scheduleId
    ? getSchedule(truckState.scheduleId)
    : null;
  // A cancelled or binned schedule must never drive the map: its pins
  // disappear even if the truck link survives (missed sync, partial save).
  const activeEffStatus = rawActiveSchedule
    ? (live.scheduleStatus[rawActiveSchedule.id] ?? rawActiveSchedule.status)
    : null;
  const activeSchedule =
    rawActiveSchedule && activeEffStatus !== "Cancelled" && !rawActiveSchedule.isArchived
      ? rawActiveSchedule
      : null;
  const routePoints = activeSchedule?.routePoints ?? [];
  const currentPoint = routePoints[truckState?.stopIndex ?? 0];
  const isLastPoint = truckState
    ? truckState.stopIndex >= routePoints.length - 1
    : false;

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
        icon: CheckCircle2,
        tone: "text-emerald-600",
        title: "Route completed",
        subtitle: zoneName ? `Next up: ${zoneName}` : "No more routes today",
      };
    }
    if (isOnDuty && truckState?.phase === "onsite") {
      return {
        id: "status",
        live: true,
        icon: CheckCircle2,
        tone: "text-emerald-600",
        title: `Collecting at ${currentPoint?.name ?? "stop"}`,
        subtitle: `Stop ${(truckState?.stopIndex ?? 0) + 1} of ${routePoints.length}`,
      };
    }
    if (isOnDuty) {
      return {
        id: "status",
        live: true,
        icon: Truck,
        tone: "text-emerald-600",
        title: `En route to ${currentPoint?.name ?? "next stop"}`,
        subtitle: `Stop ${(truckState?.stopIndex ?? 0) + 1} of ${routePoints.length}${startTime ? ` • ${startTime}` : ""}`,
      };
    }
    if (isPaused) {
      return {
        id: "status",
        icon: ClipboardList,
        tone: "text-amber-500",
        title: "Route paused",
        subtitle: "Start Route to resume",
      };
    }
    if (assignedSchedule) {
      return {
        id: "status",
        icon: ClipboardList,
        tone: "text-emerald-600",
        title: `${pendingAssignments} new assignment${pendingAssignments === 1 ? "" : "s"}`,
        subtitle: `${zoneName ?? "New route"}${startTime ? ` • ${startTime}` : ""}`,
      };
    }

    return {
      id: "greeting",
      icon: null,
      tone: "text-foreground",
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
    if (id === "assignment") {
      markTasksSeen(selectedTruckId, myAssignments.map((s) => s.id));
    }
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
      }
      releaseWakeLock();
    };
  }, []);

  const lastAcceptedGpsRef = useRef(null);
  // Smoothed-fix + sticky snap state for the GPS watch session (see
  // route-snap.js). Reset on start/resume/stop so a new session never
  // inherits a stale average or held road point.
  const smoothRef = useRef(null);
  const snapFilterRef = useRef(null);
  const resetFixFilters = () => {
    smoothRef.current = null;
    lastAcceptedGpsRef.current = null;
    setHasLiveFix(false);
    if (snapFilterRef.current) snapFilterRef.current.reset();
  };

  // Remaining-route snapshot for the offline route snap (see route-snap.js).
  // Synced on schedule/stop changes; the GPS handler reads it via ref so it
  // never works from a stale closure.
  const routeRef = useRef({ points: [], stopIndex: 0, scheduleId: null });
  useEffect(() => {
    routeRef.current = {
      points: routePoints,
      stopIndex: truckState?.stopIndex ?? 0,
      scheduleId: activeSchedule?.id ?? null,
    };
  }, [routePoints, truckState?.stopIndex, activeSchedule?.id]);

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
        // Speed-adaptive smoothing first: slow movement leans on history so
        // sidewalk-level jitter never reaches the snap or the marker, while
        // fast movement follows the new fix with minimal lag.
        const smoothed = smoothFix(smoothRef.current, latitude, longitude, { speedMps: s, accuracyM: accuracy });
        smoothRef.current = smoothed;
        const prev = lastAcceptedGpsRef.current;
        let course = null;

        if (prev) {
          const dx = (smoothed.lng - prev.lng) * 111320 * Math.cos((prev.lat * Math.PI) / 180);
          const dy = (smoothed.lat - prev.lat) * 111320;
          const distM = Math.hypot(dx, dy);
          // Ground course (direction of actual travel) — trusted once the
          // fix moved far enough to drown out GPS jitter.
          if (distM >= 8) course = compassBearing(prev, smoothed);

          // Waze-style stationary noise filter: if moving very slowly (speed <= 1 m/s)
          // and the GPS fix only jumped by < 10 meters, it's just satellite wobble while
          // parked. Ignore it so the truck marker doesn't slide back and forth.
          if (s <= 1 && distM < 10) {
            return;
          }

        }


        // Waze-style route snap with hysteresis: the filter projects the
        // smoothed fix onto the remaining collection-route path so the
        // marker rides the road instead of houses or GPS wobble, and holds
        // the last road point through brief off-corridor excursions instead
        // of teleporting off-road and back. Only consecutive off-corridor
        // fixes admit a real detour (raw position). While moving, face
        // along the road, not the noisy device heading.
        if (!snapFilterRef.current) snapFilterRef.current = createSnapFilter();
        const rte = routeRef.current;
        const solved = snapFilterRef.current.update(
          smoothed.lat,
          smoothed.lng,
          rte.points,
          rte.stopIndex,
          rte.scheduleId
        );
        const roadHeading = solved.heading;
        const outLat = solved.lat;
        const outLng = solved.lng;
        // Face the road, not the phone: road snap > ground course > device
        // compass (which follows the handset, not the truck). Parked holds
        // the last heading instead of swinging with compass wobble.
        finalHeading = resolveTravelHeading({
          road: roadHeading,
          course,
          device: (heading !== null && !isNaN(heading)) ? heading : null,
          prevHeading: prev ? prev.heading : null,
          speedMps: s,
        });
        lastAcceptedGpsRef.current = { lat: smoothed.lat, lng: smoothed.lng, heading: finalHeading };

        setCoords({
          lat: outLat,
          lng: outLng,
          speed: s ? Math.round(s * 3.6) : 0,
          heading: finalHeading,
          accuracy: Math.round(accuracy),
        });
        setHasLiveFix(true);

        if (truckFocusedRef.current) {
          setMapCenter([outLat, outLng]);
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
            lat: outLat,
            lng: outLng,
            // Device GPS reports a compass bearing (0 = North). The app's
            // heading convention is compass + 90 (segment headings from
            // route-snap.js are compass too), which is what the map marker
            // and course-up camera expect.
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
    // Drop session filter state so the next duty starts from a clean
    // average instead of dragging the marker from a stale position.
    resetFixFilters();
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

      // Misclick guard: confirm before GPS and wake lock engage.
      setConfirmStart(true);
      return;
    }

    if (truckState.phase === "enroute") {
      // Misclick guard: confirm before marking arrival (notifies admin).
      setConfirmStopBy(true);
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
        ? `Route completed. New assignment: ${compactScheduleLabel(next)}.`
        : "Route completed. No further assignments."
    );
  };

  // Runs only from the Start Route confirmation dialog.
  const proceedStartRoute = async () => {
    setConfirmStart(false);
    haptic(15);
    const wasPaused =
      !!truckState &&
      (truckState.phase === "enroute" || truckState.phase === "onsite") &&
      !truckState.tracking.isActive;

    if (!wasPaused && !assignedSchedule) {
      toast("No route assignments available.", { variant: "error" });
      return;
    }
    if (!wasPaused && !isAssignmentAccepted) {
      toast("Please accept your assignment in Tasks before starting the route.", { variant: "warning" });
      switchTab("assignment");
      return;
    }

    // Bug 4 fix: await startRoute so GPS and wake lock don't activate before route is recorded
    // Pass coords only with a live fix this session — the state otherwise
    // holds the Tejero Hall fallback (or a stale teardown position), which
    // used to teleport the marker there on every fresh start.
    const scheduleId = await startRoute(selectedTruckId, hasLiveFix ? coords : null);
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
    resetFixFilters();
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
  };

  // Runs only from the Stop By confirmation dialog.
  const proceedStopBy = () => {
    setConfirmStopBy(false);
    haptic(15);
    stopByAtPoint(selectedTruckId);
    toast(`Arrived at ${currentPoint?.name ?? "stop"}. Admin notified.`);
  };

  // Single "current stop" pin: shown only once the driver has started the route.
  // Once the driver arrives at a stop (Stop By puts the truck "onsite"), that
  // stop is done, so the highlight advances to the NEXT stop: the map always
  // points at where to drive next. Past the last stop there is nothing ahead.
  const dStopIdx = truckState?.stopIndex ?? 0;
  const highlightIdx = truckState?.phase === "onsite" ? dStopIdx + 1 : dStopIdx;
  const highlightPoint = routePoints[highlightIdx];
  const driverCurrentStop = (!activeSchedule || truckState?.phase === "completed")
    ? null
    : highlightPoint ? { ...highlightPoint, index: highlightIdx } : null;

  // Compact numbered pins for every stop after the highlighted one.
  const driverUpcomingStops = (!activeSchedule || truckState?.phase === "completed")
    ? []
    : routePoints.slice(highlightIdx + 1).map((p, i) => ({ ...p, index: highlightIdx + 1 + i }));

  // Fused travel heading: road snap > ground course > device (see route-snap).
  const bestHeading = truckState?.tracking.heading ?? 0;

  // Driver's own marker rides the per-fix local position (every accepted
  // GPS fix) instead of the store copy, which is throttled to the 2s
  // broadcast cadence — otherwise the marker visibly steps twice a second
  // behind reality. The store copy stays the fallback (no fix yet) and is
  // still what everyone else sees. coords.heading is compass-style, so it
  // is converted to the app convention like the broadcast does.
  const liveFixCoords = isOnDuty && hasLiveFix ? coords : null;
  const displayHeading =
    liveFixCoords?.heading != null
      ? (Math.round(liveFixCoords.heading) + 90) % 360
      : bestHeading;

  const trucksForMap = useMemo(() => {
    if (!currentTruck || !truckState) return [];
    return [
      {
        id: currentTruck.id,
        plate: currentTruck.plate,
        driver: liveDriver,
        capacity: currentTruck.capacity,
        lat: liveFixCoords?.lat ?? truckState.tracking.lat,
        lng: liveFixCoords?.lng ?? truckState.tracking.lng,
        heading: displayHeading,
        eta: isOnDuty ? "Active On Route" : "Standby",
        isActive: truckState.tracking.isActive,
        phase: truckState.phase,
      },
    ];
  }, [currentTruck, truckState, isOnDuty, liveDriver, displayHeading, liveFixCoords]);

  // Waze-style course-up camera while driving: heading up, auto-follow truck.
  const navBearing = isOnDuty ? Math.round((displayHeading ?? 0) / 6) * 6 : null;

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
      setMapZoom(16);
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

  // Center nav CTA: shown only once the driver has an actionable route —
  // accepted assignment, resumable pause, or active duty. The idle "No Task"
  // and pre-accept states render nothing so the tab bar holds only the four
  // tabs until acceptance, when the action button smoothly appears.
  const canResume =
    !!truckState &&
    (truckState.phase === "enroute" || truckState.phase === "onsite") &&
    !truckState.tracking.isActive;
  const showCenterAction = isOnDuty || canResume || isAssignmentAccepted;
  const cta =
    !isOnDuty
      ? canResume
        ? { tone: "bg-emerald-600", icon: <Play className="h-6 w-6 fill-white" />, label: "Resume Route", short: "Resume", disabled: false }
        : !isAssignmentAccepted
          ? { tone: "bg-emerald-600", icon: <Play className="h-6 w-6 fill-white" />, label: "Start Route", short: "Start", disabled: false }
          : { tone: "bg-emerald-600", icon: <Play className="h-6 w-6 fill-white" />, label: "Start Route", short: "Start", disabled: false }
      : truckState?.phase === "enroute"
        ? {
            tone: "bg-amber-500",
            icon: (
              <svg width="30" height="35" viewBox="0 0 24 28" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <circle cx="12" cy="10.5" r="7" fill="#ffffff" stroke="#059669" strokeWidth="3" />
                <path d="M8.5 16.5 L12 24 L15.5 16.5 Z" fill="#059669" />
                <circle cx="12" cy="10.5" r="2.5" fill="#059669" />
              </svg>
            ),
            label: "Stop By",
            short: "Stop By",
          }
        : !isLastPoint
          ? { tone: "bg-emerald-600", icon: <Play className="h-6 w-6 fill-white" />, label: "Continue Route", short: "Continue" }
          : { tone: "bg-emerald-600", icon: <Check className="h-6 w-6" strokeWidth={2.5} />, label: "Complete Route", short: "Complete" };

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
            tilted={mapView === "tilt"}
            hidePausedTrucks
          />
        </div>

        {/* Floating status banner — same card language as the pill nav */}
        <div className="pointer-events-none absolute inset-x-0 top-[calc(env(safe-area-inset-top)+0.75rem)] z-20 flex justify-center px-3">
        <div className="pointer-events-auto flex w-full max-w-md items-center select-none rounded-3xl border border-black/10 bg-card/95 px-4 py-2.5 shadow-[0_8px_30px_rgba(0,0,0,0.12)] backdrop-blur-xl">
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
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
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
          {/* Right: Updates inbox */}
          <button
            type="button"
            onClick={() => { setShowDriverUpdates(true); haptic(); }}
            className="relative ml-1 flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-foreground transition-all active:scale-95"
            aria-label="Notifications"
          >
            <Bell
              className="h-5 w-5 text-foreground"
              strokeWidth={2}
              fill="none"
              fillOpacity={0}
            />
            {driverUnread > 0 && (
              <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[9px] font-bold leading-none text-white">
                {driverUnread > 9 ? "9+" : driverUnread}
              </span>
            )}
          </button>
        </div>
        </div>

        {/* Floating native map action buttons, just above bottom nav */}
        {/* 1. Bottom-Left: Focus Compactor Unit (native style, just above bottom nav) */}
        <div className="pointer-events-none absolute bottom-[calc(6.75rem+env(safe-area-inset-bottom))] left-3 z-20">
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
                  className="pointer-events-auto flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full border border-black/10 bg-white text-zinc-800 shadow-md active:scale-95 transition-transform cursor-pointer touch-manipulation"
                  title="Focus Compactor Unit"
                  aria-label="Focus Compactor Unit"
                >
                  <SteeringWheelIcon className="h-6 w-6 sm:h-7 sm:w-7" strokeWidth={2} />
                </motion.button>
              );
            })()}
          </AnimatePresence>
        </div>

        {/* 2. Bottom-Right: Center GPS Location (native style, just above bottom nav) */}
        <div className="pointer-events-none absolute bottom-[calc(6.75rem+env(safe-area-inset-bottom))] right-3 z-20">
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
                    toast("GPS unavailable. Showing Brgy. Tejero Hall.");
                  }
                  setMapZoom(17);
                  setFlySignal((s) => s + 1);
                  haptic();
                }}
                className="pointer-events-auto flex h-12 w-12 sm:h-14 sm:w-14 items-center justify-center rounded-full border border-black/10 bg-white text-zinc-800 shadow-md active:scale-95 transition-transform cursor-pointer touch-manipulation"
                title="Center Driver Location"
                aria-label="Center Driver Location"
              >
                <LocateFixed className="h-6 w-6 sm:h-7 sm:w-7" strokeWidth={2} />
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* Bottom Navigation Bar - floating pill, only visible on map */}
        <AnimatePresence>
        {activeTab === "map" && (
        <motion.div
          key="driver-pill-nav"
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.96 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="pointer-events-none fixed inset-x-0 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-[100] flex justify-center px-4"
        >
          <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-black/10 bg-card/95 py-2 pl-2 pr-2 shadow-[0_8px_30px_rgba(0,0,0,0.12)] backdrop-blur-xl">
            <DriverTab
              id="assignment"
              label="Tasks"
              icon={ClipboardList}
              activeTab={activeTab}
              onSelect={() => { switchTab("assignment"); }}
              badge={unseenTasks}
            />
            <DriverTab
              id="history"
              label="History"
              icon={History}
              activeTab={activeTab}
              onSelect={() => { switchTab("history"); }}
            />
            <DriverTab
              id="profile"
              label="Profile"
              icon={User}
              activeTab={activeTab}
              onSelect={() => { setProfileView("main"); switchTab("profile"); }}
            />
            <AnimatePresence initial={false}>
              {showCenterAction && (
                <motion.span
                  key="route-action-wrap"
                  initial={{ opacity: 0, scale: 0.5 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.5 }}
                  transition={{ type: "spring", stiffness: 400, damping: 28 }}
                  className="flex shrink-0 items-center"
                >
                  <span aria-hidden="true" className="mx-1 h-8 w-px shrink-0 bg-black/10" />
                  <button
                    type="button"
                    onClick={() => { handlePrimaryAction(); }}
                    aria-label={cta.label}
                    title={cta.label}
                    disabled={cta.disabled}
                    className={cn("flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-white transition-all active:scale-95 disabled:cursor-not-allowed", cta.tone)}
                  >
                    {cta.icon}
                  </button>
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
        )}
        </AnimatePresence>

        {/* FULL SCREEN VIEWS - native app style fade transition */}
        <AnimatePresence mode="wait" initial={false}>

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
                    onClick={() => { detailSchedule ? setAssignmentDetailId(null) : switchTab("map"); }}
                    className="absolute left-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-foreground transition-all active:scale-95 cursor-pointer"
                    aria-label={detailSchedule ? "Back to assignments" : "Back to map"}
                  >
                    <ChevronLeft className="h-6 w-6" strokeWidth={2} />
                  </button>
                  <h1 className="text-[17px] font-semibold tracking-tight text-foreground">{detailSchedule ? "Details" : "Assignment"}</h1>
                </div>
              </div>
              <div className="flex flex-1 flex-col overflow-y-auto bg-muted/40 pb-10">
                <div className="flex flex-1 flex-col">
                    {/* Tab 2: Tasks — tappable cards like History, details on tap */}
                    {activeTab === "assignment" && (
                      <div className="flex flex-1 flex-col">
                        {!detailSchedule ? (
                          myAssignments.length > 0 ? (
                            <div className="flex flex-1 flex-col">
                              {assignmentGroups.map((group) => (
                                <div key={group.key} className="mt-5 px-4">
                                  <p className="px-1 pb-1.5 text-[13px] text-muted-foreground">{group.label}</p>
                                  <div className="divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/60 bg-card">
                                    {group.items.map((s) => (
                                      <button
                                        key={s.id}
                                        type="button"
                                        onClick={() => { haptic(); setAssignmentDetailId(s.id); }}
                                        className="flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-2.5 text-left transition-colors active:bg-muted"
                                      >
                                        <AssignmentBadge className="h-9 w-9 shrink-0" />
                                        <div className="min-w-0 flex-1">
                                          <p title={scheduleLabel(s)} className="text-[15px] leading-snug break-words text-foreground"><CompactScheduleLabel label={scheduleLabel(s)} /></p>
                                          <p className="mt-0.5 text-[13px] text-muted-foreground">{s.time || "No time specified"}</p>
                                        </div>
                                        <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" strokeWidth={2} />
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
                              <h3 className="mt-4 text-[17px] font-semibold tracking-tight text-foreground">No Route Assigned</h3>
                              <p className="mt-1 max-w-[240px] text-[13px] leading-normal text-muted-foreground">
                                New routes from dispatch will appear here.
                              </p>
                            </div>
                          )
                        ) : (
                        <>
                          {/* Centered header */}
                          <div className="flex flex-col items-center px-4 pb-2 pt-6 text-center">
                            <AssignmentBadge className="mb-2 h-16 w-16" />
                            <h2 title={detailSchedule ? scheduleLabel(detailSchedule) : undefined} className="text-[20px] font-semibold tracking-tight text-balance break-words text-foreground">{detailSchedule ? detailHeaderTitle(detailSchedule) : ""}</h2>
                            {([assignmentDayLabel(detailSchedule?.assignmentDate), detailSchedule?.time].filter(Boolean).join(" · ") || detailAreaName) && (
                              <p className="mt-0.5 text-[13px] text-muted-foreground">
                                {[assignmentDayLabel(detailSchedule?.assignmentDate), detailSchedule?.time].filter(Boolean).join(" · ") || detailAreaName}
                              </p>
                            )}
                          </div>

                          {/* Stops — every location on this route */}
                          <DetailStopsCard schedule={detailSchedule} />

                          {/* Details — single card, no section labels */}
                          <div className="mt-5 px-4">
                            <div className="divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/60 bg-card">
                              <div className="flex min-h-[48px] items-center justify-between gap-3 px-4 py-2.5">
                                <span className="shrink-0 text-[15px] text-foreground">Unit</span>
                                <span className="text-right text-[15px] leading-snug break-words text-muted-foreground">{`${currentTruck.id} (${currentTruck.plate})`}</span>
                              </div>
                              <div className="flex min-h-[48px] items-center justify-between gap-3 px-4 py-2.5">
                                <span className="shrink-0 text-[15px] text-foreground">Capacity</span>
                                <span className="text-right text-[15px] leading-snug break-words text-muted-foreground">{currentTruck.capacity}</span>
                              </div>
                              <div className="flex min-h-[48px] items-center justify-between gap-3 px-4 py-2.5">
                                <span className="shrink-0 text-[15px] text-foreground">Collection</span>
                                <span className="text-right text-[15px] leading-snug break-words text-muted-foreground">{detailSchedule?.collectionType ?? "—"}</span>
                              </div>
                              <div className="flex min-h-[48px] items-center justify-between gap-3 px-4 py-2.5">
                                <span className="shrink-0 text-[15px] text-foreground">Days</span>
                                <span className="text-right text-[15px] leading-snug break-words text-muted-foreground">
                                  {Array.isArray(detailSchedule?.collectionDays)
                                    ? detailSchedule.collectionDays.join(", ")
                                    : (detailSchedule?.collectionDays ?? "—")}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Action */}
                          <div className="mt-5 px-4 space-y-2.5">
                            {(!isOnDuty && !isDetailAccepted) && (
                              <button
                                type="button"
                                onClick={async () => {
                                  haptic(15);
                                  try {
                                    await acceptAssignment(detailSchedule.id);
                                    toast("Assignment accepted. Start the route from the map.");
                                    setAssignmentDetailId(null);
                                    switchTab("map");
                                  } catch {
                                    toast("Could not accept the assignment. Please try again.", { variant: "error" });
                                  }
                                }}
                                className="flex h-12 w-full items-center justify-center rounded-2xl bg-emerald-600 text-[15px] font-semibold text-white transition-all active:scale-[0.99] active:bg-emerald-700 cursor-pointer"
                              >
                                Accept Assignment
                              </button>
                            )}
                            {(!isOnDuty && isDetailAccepted && detailStatus === "Accepted") && (
                              <p className="text-center text-[13px] text-muted-foreground">
                                Assignment accepted. Start it from the map.
                              </p>
                            )}
                            {detailStatus === "In Progress" && (
                              <p className="text-center text-[13px] text-muted-foreground">
                                In progress. Manage it from the map.
                              </p>
                            )}
                            <button
                              type="button"
                              onClick={() => { setCancelReason("Truck breakdown"); setShowCancelModal(true); haptic(); }}
                              className="flex h-12 w-full cursor-pointer items-center justify-center rounded-2xl bg-rose-600 text-[15px] font-semibold text-white transition-all active:scale-[0.99] active:bg-rose-700"
                            >
                              Cancel Assignment
                            </button>
                          </div>
                        </>
                        )}
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
                    onClick={() => { historyDetail ? setHistoryDetailId(null) : switchTab("map"); }}
                    className="absolute left-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-foreground transition-all active:scale-95 cursor-pointer"
                    aria-label={historyDetail ? "Back to history" : "Back to map"}
                  >
                    <ChevronLeft className="h-6 w-6" strokeWidth={2} />
                  </button>
                  <h1 className="text-[17px] font-semibold tracking-tight text-foreground">{historyDetail ? "Details" : "History"}</h1>
                </div>
              </div>
              <div className="flex flex-1 flex-col overflow-y-auto bg-muted/40 pb-10">
                <div className="flex flex-1 flex-col">
                    {/* Tab 3: History — permanent record with newest/oldest order */}
                    {activeTab === "history" && (
                      <div className="flex flex-1 flex-col">
                        {!historyDetail ? (
                          <>
                            {/* Date filter + sort: filters left, sort pinned right */}
                            <div className="mt-5 flex items-center justify-between gap-2 px-4 pb-0.5">
                              <div className="flex min-w-0 flex-wrap items-center gap-2">
                                <div className="relative shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => { setHistRangeOpen((v) => !v); haptic(); }}
                                    aria-haspopup="menu"
                                    aria-expanded={histRangeOpen}
                                    className="flex min-w-[8rem] cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full border border-border/60 bg-card px-3.5 py-1.5 text-[13px] transition-colors active:scale-95"
                                  >
                                    <Calendar className="h-4 w-4 shrink-0 text-emerald-600" strokeWidth={2} />
                                    <span className="flex-1 text-left font-medium text-foreground">
                                      {histDateRange === "custom"
                                        ? "Custom"
                                        : { all: "All", today: "Today", week: "This week", month: "This month" }[histDateRange]}
                                    </span>
                                    <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={2} />
                                  </button>
                                  <AnimatePresence>
                                    {histRangeOpen && (
                                      <>
                                        <div
                                          className="fixed inset-0 z-30 cursor-default"
                                          onClick={() => setHistRangeOpen(false)}
                                        />
                                        <motion.div
                                          initial={{ opacity: 0, scale: 0.96, y: -4 }}
                                          animate={{ opacity: 1, scale: 1, y: 0 }}
                                          exit={{ opacity: 0, scale: 0.96, y: -4 }}
                                          transition={{ duration: 0.15, ease: "easeOut" }}
                                          role="menu"
                                          className="absolute left-0 z-40 mt-1 w-44 overflow-hidden rounded-2xl border border-border/60 bg-card p-1 shadow-lg"
                                        >
                                          {[
                                            { id: "all", label: "All" },
                                            { id: "today", label: "Today" },
                                            { id: "week", label: "This week" },
                                            { id: "month", label: "This month" },
                                          ].map((opt) => (
                                            <button
                                              key={opt.id}
                                              type="button"
                                              role="menuitemradio"
                                              aria-checked={histDateRange === opt.id}
                                              onClick={() => { setHistRangeOpen(false); setHistDateRange(opt.id); setHistCustomDate(""); haptic(); }}
                                              className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-[15px] transition-colors active:bg-muted"
                                            >
                                              <span className={histDateRange === opt.id ? "font-semibold text-foreground" : "text-muted-foreground"}>
                                                {opt.label}
                                              </span>
                                              {histDateRange === opt.id && (
                                                <Check className="h-4 w-4 shrink-0 text-emerald-600" strokeWidth={2.5} />
                                              )}
                                            </button>
                                          ))}
                                          <button
                                            type="button"
                                            role="menuitem"
                                            onClick={() => { setHistRangeOpen(false); openHistDayPicker(); }}
                                            className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-[15px] transition-colors active:bg-muted"
                                          >
                                            <span className={histDateRange === "custom" ? "font-semibold text-foreground" : "text-muted-foreground"}>
                                              Pick a day…
                                            </span>
                                            <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={2} />
                                          </button>
                                        </motion.div>
                                      </>
                                    )}
                                  </AnimatePresence>
                                </div>
                                {histDateRange === "custom" && histCustomDate ? (
                                  <button
                                    type="button"
                                    onClick={openHistDayPicker}
                                    aria-label="Change custom day"
                                    className="flex shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-full bg-emerald-600 px-3.5 py-1.5 text-[13px] font-semibold text-white transition-colors active:scale-95"
                                  >
                                    <Calendar className="h-4 w-4" strokeWidth={2} />
                                    {new Date(`${histCustomDate}T00:00:00+08:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                                  </button>
                                ) : null}
                                <input
                                  ref={histDateInputRef}
                                  type="date"
                                  aria-label="Filter history by day"
                                  className="sr-only"
                                  value={histCustomDate}
                                  max={histManilaDayKey()}
                                  onChange={(e) => { if (!e.target.value) return; setHistCustomDate(e.target.value); setHistDateRange("custom"); haptic(); }}
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => { setHistorySort((s) => (s === "newest" ? "oldest" : "newest")); haptic(); }}
                                aria-label={historySort === "newest" ? "Sort oldest first" : "Sort newest first"}
                                title={historySort === "newest" ? "Sort oldest first" : "Sort newest first"}
                                className="flex min-w-[6.75rem] shrink-0 cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-full border border-border/60 bg-card px-3.5 py-1.5 text-[13px] font-medium text-foreground transition-colors active:scale-95"
                              >
                                <ArrowUpDown className="h-4 w-4 text-emerald-600" strokeWidth={2} />
                                {historySort === "newest" ? "Newest" : "Oldest"}
                              </button>
                            </div>
                            {displayHistory.length === 0 ? (
                              <div className="flex flex-1 flex-col items-center justify-center px-6 py-10 text-center">
                                <h3 className="text-[15px] font-semibold tracking-tight text-foreground">No history in this period</h3>
                                <p className="mt-1 max-w-[240px] text-[13px] leading-normal text-muted-foreground">
                                  Try another day, or show everything.
                                </p>
                                <button
                                  type="button"
                                  onClick={() => { setHistDateRange("all"); setHistCustomDate(""); haptic(); }}
                                  className="mt-3 shrink-0 cursor-pointer rounded-full bg-emerald-600 px-4 py-2 text-[13px] font-semibold text-white transition-all active:scale-95"
                                >
                                  Show all
                                </button>
                              </div>
                            ) : (
                            <div className="mt-3 px-4">
                              <div className="divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/60 bg-card">
                                {displayHistory.map((s) => (
                                  <button
                                    key={s.id}
                                    type="button"
                                    onClick={() => { haptic(); setHistoryDetailId(s.id); }}
                                    className="flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-2.5 text-left transition-opacity active:opacity-60"
                                  >
                                    <HistoryBadge className="h-9 w-9 shrink-0" />
                                    <span className="min-w-0 flex-1">
                                      <p title={s.label ?? scheduleLabel(s)} className="text-[15px] leading-snug break-words text-foreground"><CompactScheduleLabel label={s.label ?? scheduleLabel(s)} /></p>
                                      <p className="mt-0.5 text-[13px] text-muted-foreground">
                                        {[formatHistoryDate(s.assignmentDate), s.time].filter(Boolean).join(" · ") || "No time specified"}
                                      </p>
                                    </span>
                                    <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" strokeWidth={2} />
                                  </button>
                                ))}
                              </div>
                            </div>
                            )}
                            {isHistoryPreview && (
                              <p className="mt-2.5 text-center text-[13px] text-muted-foreground">
                                Preview. Routes you finish will appear here.
                              </p>
                            )}
                          </>
                        ) : (
                        <>
                          {/* Centered header */}
                          <div className="flex flex-col items-center px-4 pb-2 pt-6 text-center">
                            <HistoryBadge className="mb-2 h-16 w-16" />
                            <h2 title={historyDetail ? scheduleLabel(historyDetail) : undefined} className="text-[20px] font-semibold tracking-tight text-balance break-words text-foreground">{historyDetail ? detailHeaderTitle(historyDetail) : ""}</h2>
                            {([formatHistoryDate(historyDetail?.assignmentDate), historyDetail?.time].filter(Boolean).join(" · ") || historyDetailArea) && (
                              <p className="mt-0.5 text-[13px] text-muted-foreground">
                                {[formatHistoryDate(historyDetail?.assignmentDate), historyDetail?.time].filter(Boolean).join(" · ") || historyDetailArea}
                              </p>
                            )}
                          </div>

                          {/* Stops — every location on this route */}
                          <DetailStopsCard schedule={historyDetail} />

                          {/* Details — single card, no section labels */}
                          <div className="mt-5 px-4">
                            <div className="divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/60 bg-card">
                              <div className="flex min-h-[48px] items-center justify-between gap-3 px-4 py-2.5">
                                <span className="shrink-0 text-[15px] text-foreground">Unit</span>
                                <span className="text-right text-[15px] leading-snug break-words text-muted-foreground">{`${currentTruck.id} (${currentTruck.plate})`}</span>
                              </div>
                              <div className="flex min-h-[48px] items-center justify-between gap-3 px-4 py-2.5">
                                <span className="shrink-0 text-[15px] text-foreground">Capacity</span>
                                <span className="text-right text-[15px] leading-snug break-words text-muted-foreground">{currentTruck.capacity}</span>
                              </div>
                              <div className="flex min-h-[48px] items-center justify-between gap-3 px-4 py-2.5">
                                <span className="shrink-0 text-[15px] text-foreground">Collection</span>
                                <span className="text-right text-[15px] leading-snug break-words text-muted-foreground">{historyDetail?.collectionType ?? "—"}</span>
                              </div>
                              <div className="flex min-h-[48px] items-center justify-between gap-3 px-4 py-2.5">
                                <span className="shrink-0 text-[15px] text-foreground">Days</span>
                                <span className="text-right text-[15px] leading-snug break-words text-muted-foreground">
                                  {Array.isArray(historyDetail?.collectionDays)
                                    ? historyDetail.collectionDays.join(", ")
                                    : (historyDetail?.collectionDays ?? "—")}
                                </span>
                              </div>
                            </div>
                          </div>
                        </>
                        )}
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
                    onClick={() => { profileView === "main" ? switchTab("map") : setProfileView("main"); }}
                    className="absolute left-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-foreground transition-all active:scale-95 cursor-pointer"
                    aria-label={profileView === "main" ? "Back to map" : "Back to profile"}
                  >
                    <ChevronLeft className="h-6 w-6" strokeWidth={2} />
                  </button>
                  <h1 className="text-[17px] font-semibold tracking-tight text-foreground">{profileView === "password" ? "Change Password" : profileView === "mapview" ? "Map Display" : "Profile"}</h1>
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
                placeholder: "Current password",
              },
              {
                field: "newPassword",
                value: newPassword,
                setter: setNewPassword,
                placeholder: "New password",
              },
              {
                field: "confirm",
                value: confirmNewPassword,
                setter: setConfirmNewPassword,
                placeholder: "Re-enter new password",
              },
            ].map((f) => (
              <div key={f.field} className="flex flex-col gap-1">
                <div className="relative">
                  <input
                    type={showPasswords ? "text" : "password"}
                    value={f.value}
                    onChange={(e) => handlePwFieldChange(f.field, e.target.value.replace(/\s/g, ""), f.setter)}
                    maxLength={64}
                    autoComplete={f.field === "current" ? "current-password" : "new-password"}
                    className={`w-full rounded-2xl border bg-card px-3.5 py-3.5 text-[16px] text-foreground placeholder:text-muted-foreground/50 outline-none transition-colors ${
                      pwErrors[f.field]
                        ? "border-rose-300 focus:border-rose-400"
                        : "border-border/60 focus:border-zinc-400"
                    }`}
                    placeholder={f.placeholder}
                  />
                </div>
                {f.field === "newPassword" && (
                  <p className="mt-1.5 text-[12px] font-medium text-muted-foreground/80">
                    Must be at least 8 characters with 1 letter and 1 number.
                  </p>
                )}
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

            <button
              type="button"
              onClick={() => setShowPasswords(!showPasswords)}
              className="flex items-center gap-2 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground cursor-pointer"
              aria-label={showPasswords ? "Hide passwords" : "Show passwords"}
            >
              {showPasswords ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
              {showPasswords ? "Hide passwords" : "Show passwords"}
            </button>

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
              ) : profileView === "mapview" ? (
              <motion.div
                key="profile-mapview"
                initial={{ x: 48, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 48, opacity: 0 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="flex flex-1 flex-col"
              >
          <div className="mt-5 px-4">
            <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-2.5">
              <p className="text-[13px] leading-normal text-muted-foreground">
                Choose how the map camera looks when you open it.
              </p>
              <div className="flex rounded-full bg-muted p-1">
                {[
                  { id: "default", label: "Default" },
                  { id: "tilt", label: "Camera Tilt" },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      // Tilt changes the camera perspective — confirm first
                      // since it affects how the truck marker looks.
                      if (opt.id === "tilt" && mapView !== "tilt") setConfirmTilt(true);
                      else setMapView(opt.id);
                      haptic();
                    }}
                    aria-pressed={mapView === opt.id}
                    className={cn(
                      "h-9 flex-1 cursor-pointer rounded-full text-[13px] transition-all active:scale-[0.98]",
                      mapView === opt.id
                        ? "bg-card font-semibold text-foreground shadow-sm"
                        : "font-medium text-muted-foreground"
                    )}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
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
                <span className="text-right text-[15px] leading-snug break-words text-muted-foreground">{selectedTruckId}</span>
              </div>
              <div className="flex min-h-[48px] items-center justify-between gap-3 px-4 py-2.5">
                <span className="shrink-0 text-[15px] text-foreground">Plate</span>
                <span className="text-right text-[15px] leading-snug break-words text-muted-foreground">{currentTruck.plate}</span>
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
              <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" strokeWidth={2} />
            </button>
          </div>

          {/* Preferences group */}
          <div className="mt-5 px-4">
            <p className="px-1 pb-1.5 text-[13px] text-muted-foreground">Preferences</p>
            <button
              type="button"
              onClick={() => { setProfileView("mapview"); haptic(); }}
              className="mb-2.5 flex min-h-[48px] w-full cursor-pointer items-center justify-between gap-3 rounded-2xl border border-border/60 bg-card px-4 py-2.5 transition-all active:bg-muted"
            >
              <span className="text-left">
                <span className="block text-[15px] text-foreground">Map Display</span>
                <span className="block text-[13px] text-muted-foreground">{mapView === "tilt" ? "Camera tilt" : "Default"}</span>
              </span>
              <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" strokeWidth={2} />
            </button>
            <div className="flex min-h-[48px] w-full items-center justify-between gap-3 rounded-2xl border border-border/60 bg-card px-4 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="text-[15px] text-foreground">Notification Sounds</p>
                <p className="mt-0.5 text-[13px] leading-normal text-muted-foreground">
                  Play a ding when a new assignment arrives
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={soundEnabled}
                aria-label="Toggle notification sounds"
                onClick={() => {
                  setSoundEnabled(!soundEnabled);
                  haptic();
                }}
                className={`relative h-7 w-12 shrink-0 rounded-full transition-colors cursor-pointer ${
                  soundEnabled ? "bg-emerald-600" : "bg-zinc-300 dark:bg-zinc-700"
                }`}
              >
                <span
                  className={`absolute left-1 top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                    soundEnabled ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
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

      {/* Cancel-assignment confirmation with reason */}
      {showCancelModal && detailSchedule && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 p-4"
          onClick={() => { if (!isCancelling) setShowCancelModal(false); }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="w-full max-w-[300px] overflow-hidden rounded-[14px] bg-white text-center shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 pb-3 pt-5">
              <h3 className="text-[17px] font-semibold tracking-tight text-zinc-900">Cancel Assignment?</h3>
              <p className="mt-1 text-[13px] leading-normal text-zinc-600">
                The admin will be notified and can give this task to another driver.
              </p>
              <div className="mt-3 grid grid-cols-2 gap-1.5">
                {["Truck breakdown", "Emergency", "Road blocked", "Other"].map((r) => (
                  <button
                    key={r}
                    type="button"
                    disabled={isCancelling}
                    onClick={() => { setCancelReason(r); haptic(); }}
                    className={`rounded-full border px-2 py-1.5 text-[12px] transition-all active:scale-95 cursor-pointer disabled:opacity-50 ${
                      cancelReason === r
                        ? "border-emerald-600 bg-emerald-600/10 font-semibold text-emerald-700"
                        : "border-black/10 text-zinc-600"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex divide-x divide-black/10 border-t border-black/10">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                disabled={isCancelling}
                className="h-11 flex-1 text-[17px] text-zinc-800 transition-colors hover:bg-black/5 active:bg-black/10 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
              >
                Back
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!detailSchedule || isCancelling) return;
                  setIsCancelling(true);
                  try {
                    if (truckState?.scheduleId === detailSchedule.id) {
                      await stopGpsWatch();
                    }
                    const result = await cancelAssignment({
                      scheduleId: detailSchedule.id,
                      truckId: selectedTruckId,
                      cancelledBy: "driver",
                      reason: cancelReason,
                    });
                    setShowCancelModal(false);
                    setAssignmentDetailId(null);
                    if (!result?.scheduleSaved) {
                      toast("Assignment cancelled locally, but the status could not be saved. Check the console.", { variant: "error" });
                    } else if (!result?.adminNotified) {
                      toast("Assignment cancelled, but admin could NOT be notified (check console).", { variant: "warning" });
                    } else {
                      toast("Assignment cancelled. Admin notified.");
                    }
                  } catch {
                    toast("Could not cancel the assignment. Please try again.", { variant: "error" });
                  } finally {
                    setIsCancelling(false);
                  }
                }}
                disabled={isCancelling}
                className="flex h-11 flex-1 items-center justify-center text-[17px] font-semibold text-rose-600 transition-colors hover:bg-black/5 active:bg-black/10 cursor-pointer disabled:pointer-events-none"
              >
                {isCancelling ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  "Cancel Task"
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Native iOS-style Sign Out Confirmation Alert */}
      {confirmStart && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 p-4"
          onClick={() => setConfirmStart(false)}
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
              <h3 className="text-[17px] font-semibold tracking-tight text-zinc-900">Start Route?</h3>
              <p className="mt-1 text-[13px] leading-normal text-zinc-600">
                {assignedSchedule
                  ? `Begin ${compactScheduleLabel(assignedSchedule)}? GPS broadcasting will turn on.`
                  : "Resume the route? GPS broadcasting will turn on."}
              </p>
            </div>
            <div className="flex divide-x divide-black/10 border-t border-black/10">
              <button
                type="button"
                onClick={() => setConfirmStart(false)}
                className="h-11 flex-1 text-[17px] text-zinc-800 transition-colors hover:bg-black/5 active:bg-black/10 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={proceedStartRoute}
                className="h-11 flex-1 text-[17px] font-semibold text-emerald-600 transition-colors hover:bg-black/5 active:bg-black/10 cursor-pointer"
              >
                Start
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Native iOS-style Stop By Confirmation Alert */}
      {confirmStopBy && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 p-4"
          onClick={() => setConfirmStopBy(false)}
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
              <h3 className="text-[17px] font-semibold tracking-tight text-zinc-900">Stop By?</h3>
              <p className="mt-1 text-[13px] leading-normal text-zinc-600">
                {`Arrived at ${currentPoint?.name ?? "this stop"}? Admin will be notified.`}
              </p>
            </div>
            <div className="flex divide-x divide-black/10 border-t border-black/10">
              <button
                type="button"
                onClick={() => setConfirmStopBy(false)}
                className="h-11 flex-1 text-[17px] text-zinc-800 transition-colors hover:bg-black/5 active:bg-black/10 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={proceedStopBy}
                className="h-11 flex-1 text-[17px] font-semibold text-amber-600 transition-colors hover:bg-black/5 active:bg-black/10 cursor-pointer"
              >
                Stop By
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Native iOS-style Camera Tilt Confirmation Alert */}
      {confirmTilt && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 p-4"
          onClick={() => setConfirmTilt(false)}
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
              <h3 className="text-[17px] font-semibold tracking-tight text-zinc-900">Camera Tilt?</h3>
              <p className="mt-1 text-[13px] leading-normal text-zinc-600">
                Tilt changes how the truck marker looks on the map. 3D markers aren&apos;t supported for now.
              </p>
            </div>
            <div className="flex divide-x divide-black/10 border-t border-black/10">
              <button
                type="button"
                onClick={() => setConfirmTilt(false)}
                className="h-11 flex-1 text-[17px] text-zinc-800 transition-colors hover:bg-black/5 active:bg-black/10 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => { setMapView("tilt"); setConfirmTilt(false); haptic(); }}
                className="h-11 flex-1 text-[17px] font-semibold text-emerald-600 transition-colors hover:bg-black/5 active:bg-black/10 cursor-pointer"
              >
                Use Tilt
              </button>
            </div>
          </motion.div>
        </div>
      )}

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
                className="h-11 flex-1 text-[17px] text-zinc-800 transition-colors hover:bg-black/5 active:bg-black/10 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
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
                className="flex h-11 flex-1 items-center justify-center text-[17px] font-semibold text-rose-600 transition-colors hover:bg-black/5 active:bg-black/10 cursor-pointer disabled:pointer-events-none"
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

      <AnimatePresence>
        {showDriverUpdates && (
          <motion.div
            key="fs-driver-updates"
            initial={{ opacity: 0, scale: 0.98, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 8 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="fixed inset-0 z-[101] flex flex-col bg-background"
          >
            <div className="relative z-20 shrink-0 border-b border-border/60 bg-background/80 backdrop-blur-md pt-[calc(env(safe-area-inset-top)+12px)] pb-3">
              <div className="relative flex h-[52px] items-center justify-center px-2">
                <button
                  type="button"
                  onClick={() => { setShowDriverUpdates(false); haptic(); }}
                  className="absolute left-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-foreground transition-all active:scale-95 cursor-pointer"
                  aria-label="Back"
                >
                  <ChevronLeft className="h-6 w-6" strokeWidth={2} />
                </button>
                <h1 className="text-[17px] font-semibold tracking-tight text-foreground">Updates</h1>
                {driverUnread > 0 && (
                  <button
                    type="button"
                    onClick={() => { markAllNotificationsRead(driverAudiences); haptic(); }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[13px] font-semibold text-emerald-600 active:text-emerald-700 cursor-pointer"
                  >
                    Mark all read
                  </button>
                )}
              </div>
            </div>
            <div className="flex flex-1 flex-col overflow-y-auto bg-muted/40 pb-10">
              {driverNotifs.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
                  <h3 className="mt-4 text-[17px] font-semibold tracking-tight text-foreground">No Updates Yet</h3>
                  <p className="mt-1 max-w-[240px] text-[13px] leading-normal text-muted-foreground">
                    Dispatch notices and assignment updates will appear here.
                  </p>
                </div>
              ) : (
                <div className="mt-5 px-4">
                  <div className="divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/60 bg-card">
                    {driverNotifs.map((notif) => (
                      <button
                        key={notif.id}
                        type="button"
                        onClick={() => { markNotificationRead(notif.id); haptic(); }}
                        className="flex w-full cursor-pointer items-start gap-3 px-4 py-3 text-left transition-colors active:bg-muted"
                      >
                        <span aria-hidden="true" className={cn("mt-[7px] h-2 w-2 shrink-0 rounded-full", !notif.isRead ? "bg-emerald-600" : "bg-transparent")} />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-baseline justify-between gap-2">
                            <span className={cn("text-[15px] tracking-tight text-foreground", !notif.isRead ? "font-semibold" : "font-normal")}>
                              {notif.title}
                            </span>
                            <span className="shrink-0 text-[12px] tabular-nums text-muted-foreground">
                              {notif.at ? driverTimeAgo(notif.at, driverNotifNow) : "—"}
                            </span>
                          </span>
                          <span className="mt-0.5 line-clamp-2 block text-[13px] leading-normal text-muted-foreground">
                            {notif.message}
                          </span>
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <DbStatusBanner />
      {ToastViewport}
    </div>
  );
}
