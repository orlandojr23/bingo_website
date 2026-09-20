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
  Eye,
  EyeOff,
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
import PasswordStrengthHint from "@/components/ui/password-strength-hint";
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

// Bottom-nav tab: the active tab gets a duotone (tinted-fill + bold-stroke)
// emerald icon — no background pill, just the icon and label. `badge` shows
// a count bubble (open tickets). `tourId` preserves product-tour anchors.
function ResidentTab({ id, label, icon: Icon, active, onSelect, badge = 0, tourId }) {
  return (
    <button
      type="button"
      data-tour={tourId}
      onClick={onSelect}
      aria-label={label}
      className={`flex flex-col items-center justify-center gap-1 transition-all active:scale-90 cursor-pointer ${active ? "text-emerald-600" : "text-zinc-400"}`}
    >
      <span className="relative flex h-8 items-center justify-center px-4">
        <Icon
          className="relative h-6 w-6"
          strokeWidth={active ? 2.25 : 1.75}
          fill={active ? "currentColor" : "none"}
          fillOpacity={active ? 0.18 : 0}
        />
        {badge > 0 && (
          <span className="absolute right-1.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold leading-none text-white">
            {badge > 9 ? "9+" : badge}
          </span>
        )}
      </span>
      <span className={`text-[10px] leading-none ${active ? "font-semibold" : "font-medium"}`}>{label}</span>
    </button>
  );
}

// Philippine mobile numbers: 09xx xxx xxxx (11 digits). Accepts pasted
// +63… or 9xxxxxxxxx variants and folds them to the 09… form.
function normalizePhMobile(value) {
  let d = String(value || "").replace(/\D/g, "");
  if (d.startsWith("63") && d.length > 11) d = "0" + d.slice(2);
  else if (d.startsWith("9") && d.length === 10) d = "0" + d;
  return d.slice(0, 11);
}
function formatPhMobile(value) {
  const d = normalizePhMobile(value);
  if (d.length <= 4) return d;
  if (d.length <= 7) return `${d.slice(0, 4)} ${d.slice(4)}`;
  return `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7)}`;
}
const isValidPhMobile = (digits) => /^09\d{9}$/.test(digits);

// Proper name format (same as signup): letters only, single spaces,
// Title Case on every word — "juan dela cruz" → "Juan Dela Cruz".
const formatNameInput = (value) =>
  value
    .replace(/[^a-zA-ZÀ-ÿÑñ'’ .-]/g, "")
    .replace(/\s{2,}/g, " ")
    .toLowerCase()
    .replace(/(^|[\s\-.'])([a-zà-ÿñ])/g, (m, sep, c) => sep + c.toUpperCase());

// Glossy 3D-style waste-category icons for the Schedule cards — same
// gradient + highlight + ground-shadow language as the map truck marker.
function MalataIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 48 48" fill="none" style={{ filter: "drop-shadow(0 3px 4px rgba(0,0,0,0.20))" }}>
      <defs>
        <linearGradient id="waste-malata" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#34d399" />
          <stop offset="1" stopColor="#059669" />
        </linearGradient>
      </defs>
      <ellipse cx="24" cy="41" rx="10" ry="2.5" fill="#000" opacity="0.12" />
      <path d="M24 5 C36 13 38.5 29 24 42.5 C9.5 29 12 13 24 5 Z" fill="url(#waste-malata)" />
      <path d="M24 10 L24 37" stroke="#065f46" strokeWidth="1.6" strokeLinecap="round" opacity="0.55" />
      <path d="M24 17 L18.5 21 M24 17 L29.5 21 M24 25 L18 29.5 M24 25 L30 29.5" stroke="#065f46" strokeWidth="1.3" strokeLinecap="round" opacity="0.45" />
      <path d="M19 12 C15 18 14.5 26 18 33 C14.5 26 15.5 17 20.5 11 Z" fill="#fff" opacity="0.35" />
      <rect x="22.6" y="40" width="2.8" height="4" rx="1.4" fill="#065f46" />
    </svg>
  );
}

function RecyclableIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 48 48" fill="none" style={{ filter: "drop-shadow(0 3px 4px rgba(0,0,0,0.20))" }}>
      <defs>
        <linearGradient id="waste-recycle" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#60a5fa" />
          <stop offset="1" stopColor="#2563eb" />
        </linearGradient>
        <g id="waste-rc-arrow">
          <path d="M25.7,12.2 A10,10 0 0 1 33.4,25.4" fill="none" stroke="url(#waste-recycle)" strokeWidth="4.5" strokeLinecap="round" />
          <polygon points="32.2,28.7 36.3,24.9 31.5,23.1" fill="#2563eb" />
        </g>
      </defs>
      <ellipse cx="24" cy="41" rx="10" ry="2.5" fill="#000" opacity="0.12" />
      <use href="#waste-rc-arrow" />
      <use href="#waste-rc-arrow" transform="rotate(120 24 22)" />
      <use href="#waste-rc-arrow" transform="rotate(240 24 22)" />
      <path d="M14 12 A13,13 0 0 1 22 6.5" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" opacity="0.5" />
    </svg>
  );
}

function ResidualIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 48 48" fill="none" style={{ filter: "drop-shadow(0 3px 4px rgba(0,0,0,0.20))" }}>
      <defs>
        <linearGradient id="waste-residual" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fbbf24" />
          <stop offset="1" stopColor="#b45309" />
        </linearGradient>
      </defs>
      <ellipse cx="24" cy="41" rx="10" ry="2.5" fill="#000" opacity="0.12" />
      <path d="M20 6 L28 6 L26.5 11 L21.5 11 Z" fill="#92400e" />
      <rect x="19" y="10" width="10" height="2.6" rx="1.3" fill="#78350f" />
      <path d="M15 15 L33 15 L30.8 36.5 A4.5,4.5 0 0 1 26.3,41 L21.7,41 A4.5,4.5 0 0 1 17.2,36.5 Z" fill="url(#waste-residual)" />
      <path d="M19.5 18 L21.5 18 L20.2 36 L18.6 35.4 Z" fill="#fff" opacity="0.35" />
      <path d="M16.5 24 L31.5 24" stroke="#92400e" strokeWidth="1.2" opacity="0.4" />
      <path d="M17.2 30 L30.8 30" stroke="#92400e" strokeWidth="1.2" opacity="0.4" />
    </svg>
  );
}

// Animated field note for the profile screens: expands/collapses with
// height + fade (same language as signup's ErrorLine) so error, lock, and
// pending messages never pop the layout.
function ProfileFieldNote({ message, tone = "rose" }) {
  return (
    <AnimatePresence initial={false}>
      {message && (
        <motion.p
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.25, ease: "easeInOut" }}
          className={`overflow-hidden px-1 pt-1.5 text-[12px] font-medium ${
            tone === "emerald" ? "text-emerald-600" : tone === "muted" ? "text-muted-foreground" : "text-rose-500"
          }`}
        >
          {message}
        </motion.p>
      )}
    </AnimatePresence>
  );
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
          nameChangedAt: session.user.user_metadata?.nameChangedAt || null,
          id: session.user.id
        });
        setSessionReady(true);

        // Shared phone copy (migrations/20260923000000_profiles_phone.sql).
        // Fetched separately and best-effort: if the column doesn't exist yet
        // (migration not run), this fails quietly and metadata stands.
        // Metadata is the source of truth for display; when it holds a number
        // the column lacks, heal the column so admins/searches can see it.
        supabase.from('profiles').select('phone').eq('id', session.user.id).single().then(({ data: p, error: pErr }) => {
          if (pErr || !p) return;
          const rowPhone = p.phone || null;
          const metaPhone = session.user.user_metadata?.phone || null;
          if (metaPhone && metaPhone !== rowPhone) {
            supabase.from('profiles').update({ phone: metaPhone }).eq('id', session.user.id)
              .then(({ error: upErr }) => { if (upErr) console.warn("Profiles phone backfill failed:", upErr); });
          }
        });
      });
    });
  }, [router, user, authLoading]);

  const [showOnboarding, setShowOnboarding] = useState(false);
  const [runProductTour, setRunProductTour] = useState(false);

  // Editable mobile number: drafted locally, persisted to the auth
  // user_metadata.phone the profile already reads from (see session load
  // above) ONLY when the resident presses Save — typing never writes.
  const [phoneDraft, setPhoneDraft] = useState("");
  const [phoneSaving, setPhoneSaving] = useState(false);
  const [phoneError, setPhoneError] = useState("");
  // Editable email: same draft-only discipline as the phone number.
  const [emailDraft, setEmailDraft] = useState("");
  const [emailError, setEmailError] = useState("");
  // New address awaiting confirmation (Supabase only switches the login
  // email after the verification link is tapped). Persisted locally so the
  // notice survives reloads; cleared once the session email catches up.
  const [pendingEmail, setPendingEmail] = useState("");
  // Returning to the Profile tab discards unsaved edits: the tab never
  // unmounts when navigating, so without this an erased-but-unsaved field
  // would still be empty when coming back instead of the stored value.
  const syncedPhoneRef = useRef("");
  const syncedEmailRef = useRef("");
  const syncedNameRef = useRef("");
  const prevTabRef = useRef(activeTab);
  useEffect(() => {
    const prev = prevTabRef.current;
    prevTabRef.current = activeTab;
    if (activeTab !== "profile" || prev === "profile") return;
    const sessionPhone = formatPhMobile(residentSession?.phone || "");
    const sessionEmail = residentSession?.email || "";
    const sessionName = residentSession?.name || "";
    syncedPhoneRef.current = sessionPhone;
    syncedEmailRef.current = sessionEmail;
    syncedNameRef.current = sessionName;
    setPhoneDraft(sessionPhone);
    setEmailDraft(sessionEmail);
    setNameDraft(sessionName);
    setPhoneError("");
    setEmailError("");
    setNameError("");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmNewPassword("");
    setPwErrors({});
  }, [activeTab, residentSession]);
  // Editable full name with a 30-day cooldown: the display name keys tickets
  // and one notification audience, so renames are rationed. The other
  // audience is the user id, which never changes.
  const [nameDraft, setNameDraft] = useState("");
  const [nameError, setNameError] = useState("");
  const NAME_COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000;
  const nameChangedAt = residentSession?.nameChangedAt || null;
  const nameUnlockAt = nameChangedAt ? nameChangedAt + NAME_COOLDOWN_MS : 0;
  const nameLocked = nameUnlockAt > Date.now();
  const nameUnlockLabel = nameLocked
    ? new Date(nameUnlockAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : "";
  useEffect(() => {
    // Re-sync a field only when untouched (empty or still matching the last
    // synced value): a session refresh never wipes what the resident is
    // typing, but a genuinely new session value (e.g. email after the
    // verification link is tapped) flows into the field.
    const sessionPhone = formatPhMobile(residentSession?.phone || "");
    if (!phoneDraft || phoneDraft === syncedPhoneRef.current) {
      syncedPhoneRef.current = sessionPhone;
      if (phoneDraft !== sessionPhone) setPhoneDraft(sessionPhone);
    }
    const sessionEmail = residentSession?.email || "";
    if (!emailDraft || emailDraft === syncedEmailRef.current) {
      syncedEmailRef.current = sessionEmail;
      if (emailDraft !== sessionEmail) setEmailDraft(sessionEmail);
    }
    const sessionName = residentSession?.name || "";
    if (!nameDraft || nameDraft === syncedNameRef.current) {
      syncedNameRef.current = sessionName;
      if (nameDraft !== sessionName) setNameDraft(sessionName);
    }
    try {
      const stored = window.localStorage.getItem(`bingo_pending_email_${residentSession?.id || "noid"}`);
      if (stored && stored.toLowerCase() === sessionEmail.toLowerCase()) {
        window.localStorage.removeItem(`bingo_pending_email_${residentSession?.id}`);
        setPendingEmail("");
      } else {
        setPendingEmail(stored || "");
      }
    } catch {}
  }, [residentSession]);

  // Save is only enabled when the draft actually differs from what's stored.
  const phoneDirty =
    normalizePhMobile(phoneDraft) !== normalizePhMobile(residentSession?.phone || "");
  const emailDirty =
    emailDraft.trim().toLowerCase() !== (residentSession?.email || "").toLowerCase();
  const nameDirty =
    !nameLocked && nameDraft.trim() !== (residentSession?.name || "");
  const profileDirty = phoneDirty || emailDirty || nameDirty;

  // Resident password change (mirrors the driver flow): validate locally,
  // verify the current password by re-authenticating, then update via Auth.
  const [residentProfileView, setResidentProfileView] = useState("main");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showPwFields, setShowPwFields] = useState(false);
  const [pwErrors, setPwErrors] = useState({});
  const [pwSaving, setPwSaving] = useState(false);

  const handlePwFieldChange = (value, setter) => {
    setter(value.replace(/\s/g, ""));
    if (Object.keys(pwErrors).length > 0) setPwErrors({});
  };

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
      const { error: verifyErr } = await supabase.auth.signInWithPassword({
        email: residentSession?.email || "",
        password: currentPassword,
      });
      if (verifyErr) {
        setPwErrors({ current: "Your current password is incorrect." });
        setPwSaving(false);
        return;
      }

      const { error: updateErr } = await supabase.auth.updateUser({ password: newPassword });
      if (updateErr) {
        setPwErrors({ newPassword: updateErr.message });
        setPwSaving(false);
        return;
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      setShowPwFields(false);
      setResidentProfileView("main");
      toast("Password changed successfully.");
      haptic();
    } catch {
      setPwErrors({ current: "Something went wrong. Please try again." });
    } finally {
      setPwSaving(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!profileDirty || phoneSaving) return;
    const digits = normalizePhMobile(phoneDraft);
    const nextEmail = emailDraft.trim().toLowerCase();
    const currentEmail = (residentSession?.email || "").toLowerCase();
    const newName = nameDraft.trim();
    const currentName = residentSession?.name || "";

    // Validate everything up front — nothing saves unless all of it is valid
    // and the resident pressed this button (drafts never write on type).
    if (digits && !isValidPhMobile(digits)) {
      setPhoneError("Enter a valid 11-digit mobile number (09xx xxx xxxx).");
      return;
    }
    if (nameDirty && newName.length < 2) {
      setNameError("Enter your full name (at least 2 characters).");
      return;
    }
    if (emailDirty && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(nextEmail)) {
      setEmailError("Enter a valid email address.");
      return;
    }
    setPhoneError("");
    setNameError("");
    setEmailError("");
    setPhoneSaving(true);
    try {
      // Email first: Supabase keeps the old login until the new address is
      // verified via the emailed link — the session email does NOT change yet.
      if (emailDirty) {
        const { error: emailErr } = await supabase.auth.updateUser(
          { email: nextEmail },
          { emailRedirectTo: `${window.location.origin}/report` }
        );
        if (emailErr) throw emailErr;
        try {
          window.localStorage.setItem(`bingo_pending_email_${residentSession?.id}`, nextEmail);
        } catch {}
        setPendingEmail(nextEmail);
        // Revert the field to the still-current login email; the pending
        // notice below carries the new address until confirmation lands.
        syncedEmailRef.current = currentEmail;
        setEmailDraft(residentSession?.email || "");
      }
      // Phone + name share one metadata write (name carries the 30-day stamp).
      const metaData = {};
      if (phoneDirty) metaData.phone = digits || null;
      if (nameDirty) {
        metaData.full_name = newName;
        metaData.nameChangedAt = Date.now();
      }
      if (Object.keys(metaData).length > 0) {
        const { error } = await supabase.auth.updateUser({ data: metaData });
        if (error) throw error;
      }
      if (phoneDirty) {
        setResidentSession((prev) => (prev ? { ...prev, phone: digits || null } : prev));
        syncedPhoneRef.current = digits;
      }
      if (phoneDirty) {
        setResidentSession((prev) => (prev ? { ...prev, phone: digits || null } : prev));
        syncedPhoneRef.current = digits;
        // Mirror into the queryable profiles.phone column (best-effort: the
        // metadata write above is what the display actually reads).
        if (residentSession?.id) {
          supabase.from('profiles').update({ phone: digits || null }).eq('id', residentSession.id)
            .then(({ error: colErr }) => { if (colErr) console.warn("Profiles phone update failed:", colErr); });
        }
      }
      if (nameDirty) {
        setResidentSession((prev) =>
          prev ? { ...prev, name: newName, nameChangedAt: Date.now() } : prev
        );
        syncedNameRef.current = newName;
        // Mirror into profiles (best-effort) and migrate the resident's own
        // tickets to the new reporter name so history doesn't orphan. Scoped
        // by ticket id so same-name collisions are impossible.
        if (residentSession?.id) {
          supabase.from('profiles').update({ full_name: newName }).eq('id', residentSession.id)
            .then(({ error: colErr }) => { if (colErr) console.warn("Profiles name update failed:", colErr); });
          const ownIds = tickets.filter((t) => t.reporter === currentName && t.id).map((t) => t.id);
          if (ownIds.length > 0) {
            const results = await Promise.allSettled(ownIds.map((id) => updateTicket(id, { reporter: newName })));
            if (results.some((r) => r.status === "rejected")) {
              console.warn("Some ticket renames failed; history refreshes on next sync.");
            }
          }
        }
      }
      toast(
        emailDirty
          ? "Verification sent — tap the link in your new inbox to complete the email change."
          : nameDirty ? "Name updated." : digits ? "Mobile number saved." : "Mobile number removed."
      );
      haptic();
    } catch (err) {
      const msg = err?.message || "Could not save changes. Check connection.";
      // Attribute auth errors to the email row when an email change was in
      // flight, otherwise surface a generic failure toast.
      if (emailDirty) setEmailError(msg);
      else toast(msg, { variant: "error" });
    } finally {
      setPhoneSaving(false);
    }
  };

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
    // The drawn leg starts at the map-matched road point; the marker below
    // uses routePath.snappedOrigin so line and marker share one source.
    pinToRoad: true,
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
        icon: CheckCircle2,
        tone: "text-emerald-600",
        title: "Collection complete",
        subtitle: "All pickups complete",
      };
    }
    const point = activeSchedule.routePoints?.[activeTs.stopIndex] || activeSchedule.routePoints?.[0];
    if (activeTs.onsite) {
      return {
        id: "truck-live-arrived",
        live: true,
        icon: CheckCircle2,
        tone: "text-emerald-600",
        title: "Truck arrived",
        subtitle: `Collecting at ${point?.name ?? "your stop"}`,
      };
    }
    return {
      id: "truck-live-enroute",
      live: true,
      icon: Truck,
      tone: "text-emerald-600",
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

  // Open reports filed by this resident — drives the Tickets tab badge.
  const myOpenTickets = useMemo(
    () => tickets.filter((t) => t.reporter === residentSession?.name && t.status !== "Resolved").length,
    [tickets, residentSession?.name]
  );

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
        icon: Calendar,
        tone: "text-emerald-600",
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
          icon: Calendar,
          tone: "text-muted-foreground",
          title: "No pickup today",
          subtitle: `Next: ${label}${start ? ` at ${start}` : ""}`,
        };
      }
    }
    return {
      id: "pickup-status-none",
      icon: Calendar,
      tone: "text-muted-foreground",
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
        icon: null,
        tone: "text-foreground",
        title: greetingTitle,
        subtitle: new Date().toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
        }),
      },
      {
        id: "report-action",
        icon: Camera,
        tone: "text-emerald-600",
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
  // Marker rides at the same map-matched road point the drawn leg starts at
  // (routePath.snappedOrigin) — line and marker share one source.
  const activeTrucks = useMemo(() => {
    return (fleet || [])
      .map((t) => {
        const ts = (live.trucks || {})[t.id];
        if (!ts || !ts.tracking.isActive) return null;
        let lat = ts.tracking.lat || 10.3025;
        let lng = ts.tracking.lng || 123.9095;
        let heading =
          t.id === activeTs?.truckId
            ? selectTruckHeading(ts, routePath.heading)
            : selectTruckHeading(ts, null);
        if (t.id === activeTs?.truckId && routePath.snappedOrigin) {
          lat = routePath.snappedOrigin.lat;
          lng = routePath.snappedOrigin.lng;
          if (routePath.heading != null) heading = routePath.heading;
        }
        return {
          id: t.id,
          plate: t.plate,
          driver: t.driver,
          capacity: t.capacity,
          lat,
          lng,
          heading,
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
    // No zone filter UI on this tab — match the search box only. Field
    // lookups are guarded: the store uses collectionType/collectionDays
    // while older shapes used type/days.
    const q = searchQuery.toLowerCase();
    const type = s.type ?? s.collectionType ?? "";
    const rawDays = s.days ?? s.collectionDays ?? [];
    const daysList = Array.isArray(rawDays)
      ? rawDays
      : String(rawDays).split(",").map((d) => d.trim());
    const matchesQuery =
      !searchQuery ||
      type.toLowerCase().includes(q) ||
      daysList.some((d) => d.toLowerCase().includes(q)) ||
      scheduleLabel(s).toLowerCase().includes(q) ||
      (s.routePoints || []).some((p) => (p.name || "").toLowerCase().includes(q));
    return matchesQuery;
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
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className="flex items-center gap-2.5 min-w-0 w-full"
                >
                  {currentBanner.live && (
                    <span className="relative flex h-2 w-2 shrink-0">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-600" />
                    </span>
                  )}
                  {currentBanner.icon && (
                    <currentBanner.icon
                      className={`h-6 w-6 shrink-0 ${currentBanner.tone ?? "text-foreground"}`}
                      strokeWidth={2.25}
                      fill="currentColor"
                      fillOpacity={0.18}
                    />
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
            <Bell
              className={`h-5 w-5 ${residentUnread > 0 ? "text-emerald-600" : ""}`}
              strokeWidth={2}
              fill={residentUnread > 0 ? "currentColor" : "none"}
              fillOpacity={residentUnread > 0 ? 0.18 : 0}
            />
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
                    const s = routePath.snappedOrigin;
                    setMapCenter(s ? [s.lat, s.lng] : [activeTs.tracking.lat, activeTs.tracking.lng]);
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
            <ResidentTab
              id="map"
              label="Map"
              icon={MapIcon}
              active={activeTab === "map"}
              onSelect={() => { setActiveTab("map"); haptic(); }}
            />
            <ResidentTab
              id="schedule"
              label="Schedule"
              icon={Calendar}
              active={activeTab === "schedule"}
              onSelect={() => { setActiveTab("schedule"); haptic(); }}
              tourId="nav-tab-schedule"
            />

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

            <ResidentTab
              id="tickets"
              label="Tickets"
              icon={Ticket}
              active={activeTab === "tickets"}
              onSelect={() => { setActiveTab("tickets"); haptic(); }}
              badge={myOpenTickets}
              tourId="nav-tab-tickets"
            />
            <ResidentTab
              id="profile"
              label="Profile"
              icon={User}
              active={activeTab === "profile"}
              onSelect={() => { setResidentProfileView("main"); setActiveTab("profile"); haptic(); }}
              tourId="profile-btn"
            />
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
                    // Category truth: the store uses collectionType while older
                    // shapes used type — icon and badge read both so they agree.
                    const wasteKind = (() => {
                      const t = sch.type ?? sch.collectionType ?? "";
                      if (t.includes("Recyclable")) return "recyclable";
                      if (t.includes("Dili Malata")) return "residual";
                      return "malata";
                    })();
                    const isRecyclable = wasteKind === "recyclable";
                    const isDiliMalata = wasteKind === "residual";
                    const isBiodegradable = wasteKind === "malata";

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
                    const formattedDaysSource = sch.days ?? sch.collectionDays ?? [];
                    const daysList = (Array.isArray(formattedDaysSource) ? formattedDaysSource : String(formattedDaysSource).split(","))
                      .map((d) => d.trim())
                      .filter(Boolean);
                    const formattedDays = daysList.map((d) => DAY_ABBR[d] || d).join(", ");
                    // Subtle "today" signal from the device weekday — no
                    // timestamps stored or shown, just a highlight when this
                    // card collects today.
                    const todayName = new Date().toLocaleDateString("en-US", { weekday: "long" });
                    const isToday = daysList.includes(todayName);

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
                        <div className="flex items-center gap-3">
                          <span
                            className={cn(
                              "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl",
                              isBiodegradable
                                ? "bg-emerald-600/10"
                                : isRecyclable
                                  ? "bg-blue-600/10"
                                  : "bg-amber-600/10"
                            )}
                          >
                            {isBiodegradable ? <MalataIcon /> : isRecyclable ? <RecyclableIcon /> : <ResidualIcon />}
                          </span>
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
                          <span className="text-[13px] text-muted-foreground">
                            {isToday && (
                              <span className="mr-1.5 inline-flex items-center rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                                Today
                              </span>
                            )}
                            {formattedDays}
                          </span>
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
      <div className="flex flex-1 flex-col overflow-y-auto p-4 pb-10">
        {submittedTicket ? (
        <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
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
                  <Loader2 className="h-5 w-5 animate-spin" strokeWidth={2} />
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
            <Bell
              className={`h-5 w-5 ${residentUnread > 0 ? "text-emerald-600" : ""}`}
              strokeWidth={2}
              fill={residentUnread > 0 ? "currentColor" : "none"}
              fillOpacity={residentUnread > 0 ? 0.18 : 0}
            />
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
                      <p className="text-[16px] font-semibold tracking-tight leading-snug break-words text-foreground">
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
            onClick={() => { residentProfileView === "password" ? setResidentProfileView("main") : setActiveTab("map"); haptic(); }}
            className="absolute left-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-foreground transition-all hover:bg-muted active:scale-95 active:bg-muted cursor-pointer"
            aria-label={residentProfileView === "password" ? "Back to profile" : "Back to map"}
          >
            <ChevronLeft className="h-6 w-6" strokeWidth={2} />
          </button>
          <h1 className="text-[17px] font-semibold tracking-tight text-foreground">{residentProfileView === "password" ? "Change Password" : "Profile"}</h1>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto bg-muted/40 pb-10">
      <AnimatePresence mode="wait" initial={false}>
      {residentProfileView === "password" ? (
        <motion.div
          key="resident-profile-password"
          initial={{ x: 48, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 48, opacity: 0 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
        >
          <div className="mt-5 px-4">
            <div className="rounded-2xl border border-border/60 bg-card p-4 space-y-2.5">
              {[
                { field: "current", value: currentPassword, setter: setCurrentPassword, placeholder: "Current password", auto: "current-password" },
                { field: "newPassword", value: newPassword, setter: setNewPassword, placeholder: "New password", auto: "new-password" },
                { field: "confirm", value: confirmNewPassword, setter: setConfirmNewPassword, placeholder: "Re-enter new password", auto: "new-password" },
              ].map((f) => (
                <div key={f.field} className="flex flex-col gap-1">
                  <input
                    type={showPwFields ? "text" : "password"}
                    value={f.value}
                    onChange={(e) => handlePwFieldChange(e.target.value, f.setter)}
                    maxLength={64}
                    autoComplete={f.auto}
                    placeholder={f.placeholder}
                    className={`w-full rounded-2xl border bg-card px-3.5 py-3.5 text-[16px] text-foreground placeholder:text-muted-foreground/50 outline-none transition-colors ${
                      pwErrors[f.field]
                        ? "border-rose-300 focus:border-rose-400"
                        : "border-border/60 focus:border-zinc-400"
                    }`}
                  />
                  {f.field === "newPassword" && <PasswordStrengthHint password={f.value} />}
                  <ProfileFieldNote message={pwErrors[f.field]} />
                </div>
              ))}
              <button
                type="button"
                onClick={() => setShowPwFields(!showPwFields)}
                className="flex items-center gap-2 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground cursor-pointer"
                aria-label={showPwFields ? "Hide passwords" : "Show passwords"}
              >
                {showPwFields ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                {showPwFields ? "Hide passwords" : "Show passwords"}
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
      ) : (
        <motion.div
          key="resident-profile-main"
          initial={{ x: -48, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -48, opacity: 0 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
        >
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
              <span className="shrink-0 text-[15px] text-foreground">Full Name</span>
              <input
                type="text"
                value={nameDraft}
                disabled={nameLocked}
                onChange={(e) => {
                  setNameDraft(formatNameInput(e.target.value).slice(0, 70));
                  if (nameError) setNameError("");
                }}
                maxLength={70}
                autoComplete="name"
                placeholder="Your full name"
                aria-label="Full name"
                className="w-full min-w-0 flex-1 bg-transparent text-right text-[15px] text-foreground placeholder:text-muted-foreground/50 outline-none disabled:opacity-60"
              />
            </div>
            <div className="flex min-h-[48px] items-center justify-between gap-3 px-4 py-2.5">
              <span className="shrink-0 text-[15px] text-foreground">Email</span>
              <input
                type="email"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                value={emailDraft}
                onChange={(e) => {
                  setEmailDraft(e.target.value.replace(/\s/g, ""));
                  if (emailError) setEmailError("");
                }}
                placeholder="you@gmail.com"
                aria-label="Email address"
                className="w-full min-w-0 flex-1 bg-transparent text-right text-[15px] text-foreground placeholder:text-muted-foreground/50 outline-none"
              />
            </div>
            <div className="flex min-h-[48px] items-center justify-between gap-3 px-4 py-2.5">
              <span className="shrink-0 text-[15px] text-foreground">Mobile Phone</span>
              <input
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                value={phoneDraft}
                onChange={(e) => {
                  setPhoneDraft(formatPhMobile(e.target.value));
                  if (phoneError) setPhoneError("");
                }}
                placeholder="09xx xxx xxxx"
                aria-label="Mobile phone number"
                className="w-full min-w-0 flex-1 bg-transparent text-right text-[15px] text-foreground placeholder:text-muted-foreground/50 outline-none"
              />
            </div>
            <div className="flex min-h-[48px] items-center justify-between gap-3 px-4 py-2.5">
              <span className="shrink-0 text-[15px] text-foreground">Reports Filed</span>
              <span className="text-right text-[15px] text-muted-foreground">{`${tickets.length} tickets`}</span>
            </div>
          </div>
          <ProfileFieldNote message={phoneError} />
          <ProfileFieldNote message={nameError} />
          <ProfileFieldNote
            message={nameLocked ? `Name can be changed again on ${nameUnlockLabel}.` : ""}
            tone="muted"
          />
          <ProfileFieldNote message={emailError} />
          <ProfileFieldNote
            message={pendingEmail ? `Verification sent to ${pendingEmail} — tap the link there to complete the change.` : ""}
            tone="emerald"
          />
        </div>

        {/* Security group */}
        <div className="mt-5 px-4">
          <p className="px-1 pb-1.5 text-[13px] text-muted-foreground">Security</p>
          <button
            type="button"
            onClick={() => { setResidentProfileView("password"); haptic(); }}
            className="flex min-h-[48px] w-full cursor-pointer items-center justify-between gap-3 rounded-2xl border border-border/60 bg-card px-4 py-2.5 transition-all active:bg-muted"
          >
            <span className="text-[15px] text-foreground">Change Password</span>
            <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground/50" />
          </button>
        </div>

        {/* Preferences group */}
        <div className="mt-5 px-4">
          <p className="px-1 pb-1.5 text-[13px] text-muted-foreground">Preferences</p>
          <div className="flex min-h-[48px] w-full items-center justify-between gap-3 rounded-2xl border border-border/60 bg-card px-4 py-2.5">
            <div className="min-w-0 flex-1">
              <p className="text-[15px] text-foreground">Notification Sounds</p>
              <p className="mt-0.5 text-[13px] leading-normal text-muted-foreground">
                Play a ding and chime for pickup alerts and report updates
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
        <div className="mt-5 space-y-2.5 px-4">
          <button
            type="button"
            onClick={handleSaveProfile}
            disabled={phoneSaving || !profileDirty}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-6 text-[15px] font-semibold text-white transition-all hover:bg-emerald-700 active:scale-[0.99] cursor-pointer disabled:opacity-60 disabled:pointer-events-none"
          >
            {phoneSaving ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              "Save Changes"
            )}
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
        </motion.div>
      )}
      </AnimatePresence>
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
              <span className="text-right text-[15px] leading-snug break-words text-foreground">{selectedTicket.category}</span>
            </div>
            <div className="flex min-h-[48px] items-center justify-between gap-3 py-2.5">
              <span className="shrink-0 text-[15px] text-muted-foreground">Barangay</span>
              <span className="text-right text-[15px] leading-snug break-words text-foreground">{`${selectedTicket.barangay}, ${selectedTicket.city || "Cebu City"}`}</span>
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
