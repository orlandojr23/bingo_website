"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronDown,
  MessageCircle,
  LocateFixed,
  Camera,
  Map as MapIcon,
  MapPin,
  CheckCircle2,
  XCircle,
  Check,
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
import { TEJERO_SITOS, mockPilotData } from "@/lib/mock-data";
import { useTickets, addTicket, updateTicket, removeTicket } from "@/lib/tickets";
import { useAuth } from "@/context/AuthContext";
import { useLiveRoute, getSchedule, getSchedules, scheduleLabel, selectTruckHeading } from "@/lib/live-route";
import { playDing, playTrumpet, useSoundEnabled, setSoundEnabled } from "@/lib/sounds";
import { useFleet } from "@/lib/fleet";
import { clearResidentSession } from "@/lib/resident-session";
import { reverseGeocode } from "@/lib/geocode";
import { useSwipeToggle } from "@/lib/use-swipe-toggle";
import { cn, haptic, formatTicketDateTime, formatTicketDateLong, formatTicketTime } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { MapSkeleton, ResidentShellSkeleton } from "@/components/ui/skeletons";
import { InfoRow } from "@/components/ui/info-row";
import { useToast } from "@/components/pwa/Toast";
import {
  useNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "@/lib/notifications";
import AiAssistant from "@/components/chat/AiAssistant";
import OnboardingModal from "@/components/pwa/OnboardingModal";
import ProductTour from "@/components/pwa/ProductTour";

const MapCanvas = dynamic(() => import("@/components/map/map-canvas"), {
  ssr: false,
  loading: () => <MapSkeleton />,
});

const TAB_IDS = ["schedule", "map", "report", "tickets"];

// Relative time for notification rows ("2h ago", "Yesterday").
function timeAgo(iso, nowMs) {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return "—";
  const s = Math.max(0, Math.floor((nowMs - t) / 1000));
  if (s < 60) return "Just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return "Yesterday";
  if (d < 7) return `${d}d ago`;
  return new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// "2026-09-27" → "Today", "Tomorrow", or "Mon, Sep 28". Null → null.
function schedDayLabel(iso) {
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
      className={`flex flex-col items-center justify-center gap-1 transition-all active:scale-90 cursor-pointer ${active ? "text-emerald-600" : "text-zinc-500"}`}
    >
      <span className="relative flex h-8 items-center justify-center px-4">
        <Icon
          className="relative h-6 w-6"
          strokeWidth={active ? 2.25 : 2}
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

// Accepted-item guide per collection type for the Schedule details screen.
function wasteItemsFor(type) {
  const t = type || "";
  if (t.includes("Recyclable")) {
    return [
      "Plastic (PET) bottles",
      "Glass bottles and jars",
      "Tin and aluminum cans",
      "Cardboard and paper",
      "Clean metal scraps",
    ];
  }
  if (t.includes("Dili Malata")) {
    return [
      "Dirty plastic sachets and wrappers",
      "Styrofoam containers",
      "Diapers and sanitary products",
      "Used tissue and napkins",
      "Broken ceramics and glass",
    ];
  }
  if (t.includes("Malata")) {
    return [
      "Leftover food and rice",
      "Fruit and vegetable peelings",
      "Eggshells",
      "Coffee grounds and tea bags",
      "Leaves and yard trimmings",
    ];
  }
  return null;
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
      supabase.from('profiles').select('role, full_name, sitio, id').eq('id', session.user.id).maybeSingle().then(({ data }) => {
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
        supabase.from('profiles').select('phone').eq('id', session.user.id).maybeSingle().then(({ data: p, error: pErr }) => {
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
          ? "Verification sent. Tap the link in your new inbox to complete the email change."
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

  // Truthful countdown ETA: straight-line meters from truck to current stop
  // at the fleet's ~9 m/s working pace.
  const liveEta = useMemo(() => {
    if (!activeTs || routeCompleted || activeTs.onsite) return null;
    if (!stopPoint || activeTs.tracking?.lat == null) return null;
    const R = 6371000;
    const dLat = (stopPoint.lat - activeTs.tracking.lat) * Math.PI / 180;
    const dLng = (stopPoint.lng - activeTs.tracking.lng) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(activeTs.tracking.lat*Math.PI/180)*Math.cos(stopPoint.lat*Math.PI/180)*Math.sin(dLng/2)**2;
    const meters = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    if (meters <= 0) return null;
    if (meters < 120) return "Arriving now";
    const mins = Math.max(1, Math.round(meters / 9 / 60));
    return `${mins} min${mins === 1 ? "" : "s"}`;
  }, [activeTs, routeCompleted, stopPoint]);

  // Compact numbered pins for every stop after the current one.
  const upcomingStops =
    !activeTs || routeCompleted
      ? []
      : routePoints.slice(stopIndex + 1).map((p, i) => ({ ...p, index: stopIndex + 1 + i }));

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
  // Assistant chat, opened from the Profile support row (no floating button).
  const [chatOpen, setChatOpen] = useState(false);
  // Plain array (not memoized): useNotifications derives a new list each
  // render anyway, and the arrival effect below is ref-guarded, so identity
  // churn here is harmless.
  const residentAudiences = [
    "residents",
    ...(residentSession?.id ? [residentSession.id] : []),
    ...(residentSession?.name ? [`resident:${residentSession.name}`] : []),
  ];
  const residentNotifs = useNotifications(residentAudiences);
  // Broadcast announcements (audience "residents") share one DB row, so the
  // server-side is_read flag can't track per-resident reads — one reader
  // would clear it for everyone. Track dismissed broadcast ids per device.
  const [dismissedBroadcasts, setDismissedBroadcasts] = useState(() => {
    if (typeof window === "undefined") return [];
    try {
      const parsed = JSON.parse(window.localStorage.getItem("bingo-dismissed-broadcasts") || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });
  const dismissBroadcast = (id) => {
    setDismissedBroadcasts((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id].slice(-50);
      try {
        window.localStorage.setItem("bingo-dismissed-broadcasts", JSON.stringify(next));
      } catch {}
      return next;
    });
  };
  const isUpdateUnread = (n) =>
    n.audience === "residents" ? !dismissedBroadcasts.includes(n.id) : !n.isRead;
  const residentUnread = residentNotifs.filter(isUpdateUnread).length;
  // "Now" for relative notification timestamps (same render-time clock the
  // pickup banner already uses).
  const notifNow = new Date().getTime();

  // Open reports filed by this resident — drives the Tickets tab badge.
  const myOpenTickets = useMemo(
    () => tickets.filter((t) => t.reporter === residentSession?.name && t.status !== "Resolved").length,
    [tickets, residentSession?.name]
  );

  // Tickets list order, controlled by the native dropdown menu.
  const [ticketSort, setTicketSort] = useState("newest"); // "newest" | "oldest"
  const [ticketFilterOpen, setTicketFilterOpen] = useState(false);

  // Single truthful status message derived from real schedules: pickup today,
  // or no pickup today with the next collection day.
  const pickupStatus = useMemo(() => {
    if (liveBanner) return null;
    const now = new Date();
    const dayName = now.toLocaleDateString("en-US", { weekday: "long" });
    const open = getSchedules().filter(
      (s) => (live.scheduleStatus?.[s.id] ?? s.status) !== "Completed" &&
        (live.scheduleStatus?.[s.id] ?? s.status) !== "Cancelled"
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

  // Short cancelled notice: today's task was called off. Details live in
  // Updates — tapping the banner opens them.
  const cancelledBanner = useMemo(() => {
    if (liveBanner) return null;
    const now = new Date();
    const todayISO = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const hit = getSchedules().find(
      (s) =>
        (live.scheduleStatus?.[s.id] ?? s.status) === "Cancelled" &&
        (s.assignmentDate || "") === todayISO
    );
    if (!hit) return null;
    return {
      id: "pickup-cancelled",
      icon: XCircle,
      tone: "text-rose-600",
      title: "Collection cancelled",
      subtitle: "See Updates for details",
    };
  }, [liveBanner, live]);

  useEffect(() => {
    if (liveBanner || cancelledBanner || showOnboarding || runProductTour) {
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
  }, [liveBanner, cancelledBanner, showOnboarding, runProductTour]);

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
    if (cancelledBanner) return cancelledBanner;
    if (runProductTour && pickupStatus) return pickupStatus;
    return idleBanners[bannerStep % idleBanners.length] || idleBanners[0];
  }, [liveBanner, cancelledBanner, idleBanners, bannerStep, runProductTour, pickupStatus]);

  const handleHeaderClick = () => {
    if (currentBanner?.id === "pickup-cancelled") {
      openUpdates();
      return;
    }
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
    if (notif.audience === "residents") {
      dismissBroadcast(notif.id);
    } else {
      markNotificationRead(notif.id);
    }
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

  // Opening Updates clears the bell badge — personal items are marked read
  // in the DB, broadcasts are dismissed on this device only.
  const openUpdates = () => {
    markAllNotificationsRead(residentAudiences.filter((a) => a !== "residents"));
    residentNotifs.forEach((n) => {
      if (n.audience === "residents") dismissBroadcast(n.id);
    });
    setShowUpdates(true);
    haptic();
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
        return {
          id: t.id,
          plate: t.plate,
          driver: t.driver,
          capacity: t.capacity,
          lat: ts.tracking.lat || 10.3025,
          lng: ts.tracking.lng || 123.9095,
          heading: selectTruckHeading(ts, null),
          eta: ts.tracking.eta || "5 mins",
          isActive: true,
        };
      })
      .filter(Boolean);
  }, [live, activeTs, fleet]);

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
            `GPS pinned${accNote} outside Brgy. Tejero. Double-check your landmark so crews can find it.`,
            { variant: "error" }
          );
        } else if (fixAccuracy != null && fixAccuracy > POOR_GPS_ACCURACY_M) {
          toast(
            `GPS pinned${accNote}. Accuracy is low. Step outdoors and tap Retake GPS, and add a specific landmark.`,
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
    // Cancelled and archived schedules never list as upcoming.
    if (s.isArchived) return false;
    if ((live.scheduleStatus?.[s.id] ?? s.status) === "Cancelled") return false;
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

  // Schedule details sub-screen, mirroring the driver Tasks tab.
  const [scheduleDetailId, setScheduleDetailId] = useState(null);
  // TEMPORARY preview: mock schedules so upcoming + Past sections can be
  // seen before anything is posted. Remove when real schedules exist.
  const previewScheduleList = [
    {
      id: "preview-sch-1",
      zoneId: mockPilotData.zones[0]?.id ?? null,
      assignmentDate: "2026-09-27",
      time: "08:00 AM - 11:00 AM",
      collectionType: "Malata (Nabubulok)",
      collectionDays: ["Monday", "Wednesday", "Friday"],
      routePoints: [],
      status: "Scheduled",
    },
    {
      id: "preview-sch-2",
      zoneId: mockPilotData.zones[1]?.id ?? null,
      assignmentDate: "2026-09-20",
      time: "01:00 PM - 04:00 PM",
      collectionType: "Dili Malata (Di-Nabubulok)",
      collectionDays: ["Tuesday", "Thursday"],
      routePoints: [],
      status: "Completed",
    },
    {
      id: "preview-sch-3",
      zoneId: mockPilotData.zones[2]?.id ?? null,
      assignmentDate: "2026-09-13",
      time: "09:00 AM - 12:00 PM",
      collectionType: "Recyclable",
      collectionDays: ["Saturday"],
      routePoints: [],
      status: "Completed",
    },
  ];
  const scheduleDetail = scheduleDetailId
    ? (getSchedules().find(
        (s) =>
          s.id === scheduleDetailId &&
          !s.isArchived &&
          (live.scheduleStatus?.[s.id] ?? s.status) !== "Cancelled"
      ) ?? previewScheduleList.find((s) => s.id === scheduleDetailId) ?? null)
    : null;

  // Day grouping for the Schedule list: Today, Tomorrow, dates, unscheduled.
  // Finished collections sit in a "Past" section at the bottom.
  const schedStatusOf = (s) => live.scheduleStatus?.[s.id] ?? s.status;
  const isSchedulePreview = filteredSchedules.length === 0;
  const scheduleSource = isSchedulePreview ? previewScheduleList : filteredSchedules;
  const upcomingSchedules = scheduleSource.filter((s) => schedStatusOf(s) !== "Completed");
  // TEMPORARY: show mock past rows until a real route is completed.
  const realPastSchedules = scheduleSource.filter((s) => schedStatusOf(s) === "Completed");
  const showingPastPreview = realPastSchedules.length === 0;
  const pastSchedules = (showingPastPreview
    ? previewScheduleList.filter((s) => s.status === "Completed")
    : realPastSchedules
  ).sort((a, b) => {
      const ka = a.assignmentDate || "";
      const kb = b.assignmentDate || "";
      if (ka && kb) return ka < kb ? 1 : ka > kb ? -1 : 0;
      if (ka) return -1;
      if (kb) return 1;
      return 0;
    });
  const scheduleGroups = (() => {
    const byDay = new Map();
    for (const s of upcomingSchedules) {
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
      label: key === "unscheduled" ? "Unscheduled" : (schedDayLabel(key) ?? key),
      items,
    }));
  })();

  // One schedule row (upcoming + Past sections share it).
  const renderScheduleRow = (sch) => {
    // Category truth: the store uses collectionType while older shapes
    // used type.
    const t = sch.type ?? sch.collectionType ?? "";
    const isRecyclable = t.includes("Recyclable");
    const categoryShortLabel = isRecyclable
      ? "Recyclable"
      : (!isRecyclable && t.includes("Dili Malata"))
        ? "Dili Malata"
        : "Malata";
    return (
      <button
        key={sch.id}
        type="button"
        onClick={() => { setScheduleDetailId(sch.id); haptic(); }}
        className="flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-2.5 text-left transition-colors active:bg-muted"
      >
        <Calendar className="h-5 w-5 shrink-0 text-muted-foreground" strokeWidth={1.75} />
        <span className="min-w-0 flex-1">
          <p className="text-[15px] leading-snug break-words text-foreground">{scheduleLabel(sch)}</p>
          <p className="mt-0.5 text-[13px] text-muted-foreground">
            {[sch.time, categoryShortLabel].filter(Boolean).join(" · ") || "—"}
          </p>
        </span>
        <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground/50" />
      </button>
    );
  };

  // TEMPORARY preview: mock rows so the ticket cards + details can be
  // seen before any report is filed. Remove when real tickets exist.
  // Fixed timestamps keep render pure (no Date.now in the body).
  const previewTickets = [
    {
      id: "preview-tkt-1",
      location: "Sitio Vilgon",
      category: "Overflowing Bin",
            status: "In Progress",
            urgency: "High",
            timestamp: "2026-09-27T06:00:00+08:00",
      barangay: "Tejero",
      city: "Cebu City",
      description: "Overflowing garbage bin near the community center, spilling onto the sidewalk.",
      lat: 10.30125,
      lng: 123.9081,
      photo: null,
    },
    {
      id: "preview-tkt-2",
      location: "Sitio ICM",
      category: "Uncollected Waste",
      status: "Pending",
      urgency: "Medium",
      timestamp: "2026-09-26T14:00:00+08:00",
      barangay: "Tejero",
      city: "Cebu City",
      description: "Trash bags waiting for pickup for two days.",
      lat: 10.3039,
      lng: 123.90795,
      photo: null,
    },
    {
      id: "preview-tkt-3",
      location: "Sitio Daclan",
      category: "Illegal Dumping",
      status: "Resolved",
      urgency: "High",
      timestamp: "2026-08-12T09:30:00+08:00",
      barangay: "Tejero",
      city: "Cebu City",
      description: "Cleared the dumped pile blocking the pathway.",
      lat: 10.30545,
      lng: 123.90885,
      photo: null,
    },
  ];
  const myTickets = tickets.filter((t) => t.reporter === residentSession?.name);
  const compareTickets = (a, b) => {
    const ta = new Date(a.timestamp).getTime();
    const tb = new Date(b.timestamp).getTime();
    const aValid = Number.isFinite(ta);
    const bValid = Number.isFinite(tb);
    if (aValid && bValid) return ticketSort === "oldest" ? ta - tb : tb - ta;
    if (aValid) return -1;
    if (bValid) return 1;
    return 0;
  };
  const sortedTickets = [...myTickets].sort(compareTickets);
  // TEMPORARY preview uses the same ordering (remove with previewTickets).
  const sortedPreview = [...previewTickets].sort(compareTickets);
  const visibleTickets = myTickets.length > 0 ? sortedTickets : sortedPreview;

  // TEMPORARY preview: mock updates so the notification cards can be
  // seen before anything arrives. Remove when real updates exist.
  const previewNotifs = [
    {
      id: "preview-notif-1",
      audience: "residents",
      type: "Cancelled",
      title: "Collection cancelled",
      message: "Sitio Vilgon & Sitio Mac Arthur (08:00 AM - 11:00 AM) was cancelled: Truck breakdown. Please check back for the new schedule.",
      at: "2026-09-27T07:15:00+08:00",
      isRead: false,
      ticketId: null,
    },
    {
      id: "preview-notif-2",
      audience: "resident:Preview",
      type: "Resolved",
      title: "Your report was cleaned up",
      message: "Your report at Sitio Daclan was cleaned up. Thank you!",
      at: "2026-09-26T15:40:00+08:00",
      isRead: false,
      ticketId: null,
    },
  ];

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
              haptic();
              // Let the details overlay paint first — the map refocus
              // (animated setView + marker rebuild) runs on the next frame
              // so the two animations never fight over the same frame.
              requestAnimationFrame(() => {
                setMapFocusTicket(t);
                setFocusSignal((s) => s + 1);
                setMapZoom(17);
              });
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
          {/* Right: Assistant + Report updates */}
          <button
            type="button"
            onClick={() => { setChatOpen(true); haptic(); }}
            data-tour="binny-btn"
            className="ml-1 flex w-11 shrink-0 cursor-pointer flex-col items-center justify-center gap-[2px] transition-all active:scale-95"
            aria-label="Binny"
          >
            <MessageCircle
              className="h-5 w-5 text-foreground"
              strokeWidth={2}
            />
            <span className="text-[9px] font-semibold leading-none text-foreground">Binny</span>
          </button>
          <button
            type="button"
            onClick={openUpdates}
            className="relative ml-1 flex w-11 shrink-0 cursor-pointer flex-col items-center justify-center gap-[2px] transition-all active:scale-95"
            aria-label="Updates"
          >
            <Bell
              className={`h-5 w-5 ${residentUnread > 0 ? "text-emerald-600" : "text-foreground"}`}
              strokeWidth={2}
              fill={residentUnread > 0 ? "currentColor" : "none"}
              fillOpacity={residentUnread > 0 ? 0.18 : 0}
            />
            <span className={`text-[9px] font-semibold leading-none ${residentUnread > 0 ? "text-emerald-600" : "text-foreground"}`}>Updates</span>
            {residentUnread > 0 && (
              <span className="absolute right-1 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[9px] font-bold leading-none text-white">
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
                        toast("GPS unavailable. Showing Brgy. Tejero Hall.");
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
        {activeTab === "map" && !showUpdates && !selectedTicket && !chatOpen && (
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
                    onClick={() => { scheduleDetail ? setScheduleDetailId(null) : setActiveTab("map"); haptic(); }}
                    className="absolute left-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-foreground transition-all active:scale-95 cursor-pointer"
                    aria-label={scheduleDetail ? "Back to schedules" : "Back to map"}
                  >
                    <ChevronLeft className="h-6 w-6" strokeWidth={2} />
                  </button>
                  <h1 className="text-[17px] font-semibold tracking-tight text-foreground">{scheduleDetail ? "Details" : "Schedule"}</h1>
                </div>
              </div>
              <div className="flex flex-1 flex-col overflow-y-auto bg-muted/40 pb-10">
                {/* Schedule List */}
                <div className="flex flex-1 flex-col">
                  {!scheduleDetail ? (
                    scheduleSource.length === 0 ? (
                      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
                        <h3 className="mt-4 text-[17px] font-semibold tracking-tight text-foreground">No schedules found</h3>
                        <p className="mt-1 max-w-[240px] text-[13px] leading-normal text-muted-foreground">
                          There are no schedules matching your search.
                        </p>
                      </div>
                    ) : (
                      <div className="flex flex-1 flex-col">
                        {scheduleGroups.map((group) => (
                          <div key={group.key} className="mt-5 px-4">
                            <p className="px-1 pb-1.5 text-[13px] text-muted-foreground">{group.label}</p>
                            <div className="divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/60 bg-card">
                              {group.items.map((sch) => renderScheduleRow(sch))}
                            </div>
                          </div>
                        ))}
                        {pastSchedules.length > 0 && (
                          <div className="mt-5 px-4">
                            <p className="px-1 pb-1.5 text-[13px] text-muted-foreground">Past</p>
                            <div className="divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/60 bg-card">
                              {pastSchedules.map((sch) => renderScheduleRow(sch))}
                            </div>
                            {showingPastPreview && (
                              <p className="mt-2.5 text-center text-[13px] text-muted-foreground">
                                Preview. Finished collections will appear here.
                              </p>
                            )}
                          </div>
                        )}
                        {isSchedulePreview && (
                          <p className="mt-2.5 text-center text-[13px] text-muted-foreground">
                            Preview. Posted schedules will appear here.
                          </p>
                        )}
                      </div>
                    )
                  ) : (
                    <>
                      {/* Centered header */}
                      <div className="flex flex-col items-center px-4 pb-2 pt-6 text-center">
                        <h2 className="text-[20px] font-semibold tracking-tight text-foreground">{scheduleLabel(scheduleDetail)}</h2>
                        {([schedDayLabel(scheduleDetail?.assignmentDate), scheduleDetail?.time].filter(Boolean).join(" · ")) && (
                          <p className="mt-0.5 text-[13px] text-muted-foreground">
                            {[schedDayLabel(scheduleDetail?.assignmentDate), scheduleDetail?.time].filter(Boolean).join(" · ")}
                          </p>
                        )}
                      </div>

                      {/* Details — single card, no section labels */}
                      <div className="mt-5 px-4">
                        <div className="divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/60 bg-card">
                          <div className="flex min-h-[48px] items-center justify-between gap-3 px-4 py-2.5">
                            <span className="shrink-0 text-[15px] text-foreground">Collection</span>
                            <span className="text-right text-[15px] leading-snug break-words text-muted-foreground">{scheduleDetail?.type ?? scheduleDetail?.collectionType ?? "—"}</span>
                          </div>
                          <div className="flex min-h-[48px] items-center justify-between gap-3 px-4 py-2.5">
                            <span className="shrink-0 text-[15px] text-foreground">Days</span>
                            <span className="text-right text-[15px] leading-snug break-words text-muted-foreground">
                              {(() => {
                                const DAY_ABBR = {
                                  Monday: "Mon",
                                  Tuesday: "Tue",
                                  Wednesday: "Wed",
                                  Thursday: "Thu",
                                  Friday: "Fri",
                                  Saturday: "Sat",
                                  Sunday: "Sun",
                                };
                                const src = scheduleDetail?.days ?? scheduleDetail?.collectionDays ?? [];
                                const list = (Array.isArray(src) ? src : String(src).split(","))
                                  .map((d) => d.trim())
                                  .filter(Boolean);
                                return list.length ? list.map((d) => DAY_ABBR[d] || d).join(", ") : "—";
                              })()}
                            </span>
                          </div>
                        </div>
                      </div>

                      {(() => {
                        const items = wasteItemsFor(scheduleDetail?.type ?? scheduleDetail?.collectionType);
                        if (!items) return null;
                        return (
                          <div className="mt-5 px-4">
                            <p className="px-1 pb-1.5 text-[13px] text-muted-foreground">What to put out</p>
                            <div className="divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/60 bg-card">
                              {items.map((item) => (
                                <div key={item} className="flex items-center gap-3 px-4 py-2.5">
                                  <Check className="h-4 w-4 shrink-0 text-emerald-600" strokeWidth={2.5} />
                                  <span className="text-[15px] text-foreground">{item}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })()}
                    </>
                  )}
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
            className="absolute left-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-foreground transition-all active:scale-95 cursor-pointer"
            aria-label="Back to map"
          >
            <ChevronLeft className="h-6 w-6" strokeWidth={2} />
          </button>
          <h1 className="text-[17px] font-semibold tracking-tight text-foreground">New Report</h1>
        </div>
      </div>
      <div className={cn("flex flex-1 flex-col overflow-y-auto p-4", !submittedTicket && "pb-10")}>
        {submittedTicket ? (
        <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center mt-[-10%]">
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
                <div className="flex rounded-full bg-muted p-1">
                  {["Low", "Medium", "High", "Critical"].map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => {
                        setUrgency(lvl);
                        haptic();
                      }}
                      className={cn(
                        "h-9 flex-1 cursor-pointer rounded-full text-[13px] transition-all active:scale-[0.98]",
                        urgency === lvl
                          ? "bg-card font-semibold text-foreground shadow-sm"
                          : "font-medium text-muted-foreground"
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
                    ? `${gpsAccuracy != null ? `GPS ±${gpsAccuracy}m` : "GPS"}${gpsAddress ? ` ≈ ${gpsAddress}` : " attached"}. Still add a landmark.`
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
            className="absolute left-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-foreground transition-all active:scale-95 cursor-pointer"
            aria-label="Back to map"
          >
            <ChevronLeft className="h-6 w-6" strokeWidth={2} />
          </button>
          <h1 className="text-[17px] font-semibold tracking-tight text-foreground">My Tickets</h1>
        </div>
      </div>
      <div className="flex flex-1 flex-col overflow-y-auto bg-muted/40 pb-10">
        {myTickets.length === 0 && sortedPreview.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
            <h3 className="mt-4 text-[17px] font-semibold tracking-tight text-foreground">No Tickets Yet</h3>
            <p className="mt-1 max-w-[240px] text-[13px] leading-normal text-muted-foreground">When you submit a report, you can track its progress here.</p>
          </div>
        ) : (
          <>
            {visibleTickets.length > 1 && (
              <div className="mt-5 px-4 flex justify-end">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => { setTicketFilterOpen((v) => !v); haptic(); }}
                    aria-haspopup="menu"
                    aria-expanded={ticketFilterOpen}
                    className="inline-flex cursor-pointer items-center gap-1 text-[13px] font-semibold text-emerald-600 active:opacity-70"
                  >
                    {ticketSort === "newest" ? "Newest" : "Oldest"}
                    <ChevronDown className="h-4 w-4" strokeWidth={2} />
                  </button>
                  <AnimatePresence>
                    {ticketFilterOpen && (
                      <>
                        <div
                          className="fixed inset-0 z-30 cursor-default"
                          onClick={() => setTicketFilterOpen(false)}
                        />
                        <motion.div
                          initial={{ opacity: 0, scale: 0.96, y: -4 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.96, y: -4 }}
                          transition={{ duration: 0.15, ease: "easeOut" }}
                          role="menu"
                          className="absolute right-0 z-40 mt-1 w-44 overflow-hidden rounded-2xl border border-border/60 bg-card p-1 shadow-lg"
                        >
                          {[
                            { id: "newest", label: "Newest first" },
                            { id: "oldest", label: "Oldest first" },
                          ].map((opt) => (
                            <button
                              key={opt.id}
                              type="button"
                              role="menuitemradio"
                              aria-checked={ticketSort === opt.id}
                              onClick={() => { setTicketFilterOpen(false); haptic(); setTimeout(() => setTicketSort(opt.id), 160); }}
                              className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-[15px] transition-colors active:bg-muted"
                            >
                              <span className={ticketSort === opt.id ? "font-semibold text-foreground" : "text-muted-foreground"}>
                                {opt.label}
                              </span>
                              {ticketSort === opt.id && (
                                <Check className="h-4 w-4 shrink-0 text-emerald-600" strokeWidth={2.5} />
                              )}
                            </button>
                          ))}
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            )}
            <div className={visibleTickets.length > 1 ? "mt-3 px-4" : "mt-5 px-4"}>
              <div className="overflow-hidden rounded-2xl border border-border/60 bg-card">
                {visibleTickets.map((ticket) => (
                  <button
                    key={ticket.id}
                    type="button"
                    onClick={() => { setSelectedTicket(ticket); haptic(); }}
                    className="flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-2.5 border-b border-border/60 last:border-b-0 text-left transition-colors active:bg-muted"
                  >
                    <Ticket className="h-5 w-5 shrink-0 text-muted-foreground" strokeWidth={1.75} />
                    <span className="min-w-0 flex-1">
                      <p className="text-[15px] leading-snug break-words text-foreground">
                        {ticket.location}
                      </p>
                      <p className="mt-0.5 text-[13px] text-muted-foreground">
                        {[ticket.status, ticket.timestamp
                          ? formatTicketDateTime(ticket.timestamp)
                          : `${ticket.date || "—"}${ticket.time ? ` · ${ticket.time}` : ""}`].filter(Boolean).join(" · ")}
                      </p>
                    </span>
                    <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground/50" />
                  </button>
                ))}
              </div>
            </div>
            {myTickets.length === 0 && (
              <p className="mt-2.5 text-center text-[13px] text-muted-foreground">
                Preview. Reports you submit will appear here.
              </p>
            )}
          </>
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
            className="absolute left-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-foreground transition-all active:scale-95 cursor-pointer"
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
                  {f.field === "newPassword" && (
                    <p className="mt-1.5 text-[12px] font-medium text-muted-foreground/80">
                      Must be at least 8 characters with 1 letter and 1 number.
                    </p>
                  )}
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
            message={pendingEmail ? `Verification sent to ${pendingEmail}. Tap the link there to complete the change.` : ""}
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
            className="absolute left-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-foreground transition-all active:scale-95 cursor-pointer"
            aria-label="Back"
          >
            <ChevronLeft className="h-6 w-6" strokeWidth={2} />
          </button>
          <h1 className="text-[17px] font-semibold tracking-tight text-foreground">Details</h1>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto bg-muted/40 pb-10 select-text">
        <div className="flex flex-1 flex-col">
          {/* Centered header */}
          <div className="flex flex-col items-center px-4 pb-2 pt-6 text-center">
            <h2 className="text-[20px] font-semibold tracking-tight text-foreground">{selectedTicket.location}</h2>
            {(selectedTicket.category || selectedTicket.status) && (
              <p className="mt-0.5 text-[13px] text-muted-foreground">
                {[selectedTicket.category, selectedTicket.status].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>

          {selectedTicket.photo ? (
            <div className="mt-5 px-4">
              <img
                src={selectedTicket.photo}
                alt={`Waste report ${selectedTicket.id}`}
                decoding="async"
                className="h-52 w-full rounded-2xl border border-border/60 object-cover"
              />
            </div>
          ) : null}

          {selectedTicket.description || selectedTicket.notes ? (
            <div className="mt-5 px-4">
              <div className="rounded-2xl border border-border/60 bg-card px-4 py-3">
                <p className="text-[14px] leading-normal text-muted-foreground">
                  {selectedTicket.description || selectedTicket.notes}
                </p>
              </div>
            </div>
          ) : null}

          <div className="mt-5 px-4">
            <div className="divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/60 bg-card">
              <div className="flex min-h-[48px] items-center justify-between gap-3 px-4 py-2.5">
                <span className="shrink-0 text-[15px] text-foreground">Status</span>
                <span className="text-right text-[15px] leading-snug break-words text-muted-foreground">{selectedTicket.status || "—"}</span>
              </div>
              <div className="flex min-h-[48px] items-center justify-between gap-3 px-4 py-2.5">
                <span className="shrink-0 text-[15px] text-foreground">Priority</span>
                <span className="text-right text-[15px] leading-snug break-words text-muted-foreground">{selectedTicket.urgency || "—"}</span>
              </div>
              <div className="flex min-h-[48px] items-center justify-between gap-3 px-4 py-2.5">
                <span className="shrink-0 text-[15px] text-foreground">Date</span>
                <span className="text-right text-[15px] tabular-nums leading-snug break-words text-muted-foreground">
                  {selectedTicket.timestamp
                    ? formatTicketDateLong(selectedTicket.timestamp)
                    : selectedTicket.date || "—"}
                </span>
              </div>
              <div className="flex min-h-[48px] items-center justify-between gap-3 px-4 py-2.5">
                <span className="shrink-0 text-[15px] text-foreground">Time</span>
                <span className="text-right text-[15px] tabular-nums leading-snug break-words text-muted-foreground">
                  {selectedTicket.timestamp
                    ? formatTicketTime(selectedTicket.timestamp)
                    : selectedTicket.time || "—"}
                </span>
              </div>
              <div className="flex min-h-[48px] items-center justify-between gap-3 px-4 py-2.5">
                <span className="shrink-0 text-[15px] text-foreground">Address</span>
                <span className="text-right text-[15px] leading-snug break-words text-muted-foreground">{ticketAddress || "—"}</span>
              </div>
            </div>
          </div>

          <div className="mt-5 px-4">
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
            className="absolute left-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full text-foreground transition-all active:scale-95 cursor-pointer"
            aria-label="Back"
          >
            <ChevronLeft className="h-6 w-6" strokeWidth={2} />
          </button>
          <h1 className="text-[17px] font-semibold tracking-tight text-foreground">Updates</h1>
          {residentUnread > 0 && (
            <button
              type="button"
              onClick={() => { markAllNotificationsRead(residentAudiences.filter((a) => a !== "residents")); residentNotifs.forEach((n) => { if (n.audience === "residents") dismissBroadcast(n.id); }); haptic(); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[13px] font-semibold text-emerald-600 active:text-emerald-700 cursor-pointer"
            >
              Mark all read
            </button>
          )}
        </div>
      </div>
      <div className="flex flex-1 flex-col overflow-y-auto bg-muted/40 pb-10">
        {residentNotifs.length === 0 ? (
          <>
            <div className="mt-5 px-4">
              <div className="divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/60 bg-card">
                {previewNotifs.map((notif) => (
                  <button
                    key={notif.id}
                    type="button"
                    onClick={() => { toast("This is a preview."); haptic(); }}
                    className="flex w-full cursor-pointer items-start gap-3 px-4 py-3 text-left transition-colors active:bg-muted"
                  >
                    {notif.type === "Resolved" ? (
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" strokeWidth={2} />
                    ) : notif.type === "Cancelled" ? (
                      <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" strokeWidth={2} />
                    ) : (
                      <Ticket className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" strokeWidth={2} />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="text-[15px] font-semibold tracking-tight text-foreground">
                          {notif.title}
                        </span>
                        <span className="shrink-0 text-[12px] tabular-nums text-muted-foreground">
                          {notif.at ? timeAgo(notif.at, notifNow) : "—"}
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
            <p className="mt-2.5 text-center text-[13px] text-muted-foreground">
              Preview. Updates on your reports will appear here.
            </p>
          </>
        ) : (
          <div className="mt-5 px-4">
            <div className="divide-y divide-border/60 overflow-hidden rounded-2xl border border-border/60 bg-card">
              {residentNotifs.map((notif) => (
                <button
                  key={notif.id}
                  type="button"
                  onClick={() => openUpdate(notif)}
                  className="flex w-full cursor-pointer items-start gap-3 px-4 py-3 text-left transition-colors active:bg-muted"
                >
                  {notif.type === "Resolved" ? (
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" strokeWidth={2} />
                  ) : notif.type === "Cancelled" ? (
                    <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" strokeWidth={2} />
                  ) : (
                    <Ticket className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" strokeWidth={2} />
                  )}
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className={cn("text-[15px] tracking-tight text-foreground", isUpdateUnread(notif) ? "font-semibold" : "font-normal")}>
                          {notif.title}
                        </span>
                        <span className="shrink-0 text-[12px] tabular-nums text-muted-foreground">
                          {notif.at ? timeAgo(notif.at, notifNow) : "—"}
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
            className="h-11 flex-1 text-[17px] text-zinc-800 transition-colors hover:bg-black/5 active:bg-black/10 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
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

<AiAssistant
  isOpen={chatOpen}
  onOpenChange={setChatOpen}
  context={{
    sitio: residentSession?.sitio,
    pickupTitle: pickupStatus?.title,
    pickupSubtitle: pickupStatus?.subtitle,
    activeTab,
  }}
/>
{ ToastViewport }
    </div >
  );
}
