"use client";

import { useState, useEffect } from "react";
import { Search, Users, Plus, X, Loader2, Eye, EyeOff, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { StatusBadge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { PanelStat } from "@/components/ui/panel-stat";
import { InfoRow } from "@/components/ui/info-row";
import { Button } from "@/components/ui/button";
import { inputClass, labelClass } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import PasswordStrengthHint from "@/components/ui/password-strength-hint";
import OtpInput from "@/components/ui/otp-input";
import { useFleet } from "@/lib/fleet";
import { useLiveRoute, assignDriver } from "@/lib/live-route";
import {
  getDriverAccount,
  saveDriverAccount,
  removeDriverAccount,
  renameDriverAccount,
} from "@/lib/driver-accounts";
import { useStaffRoster, saveStaffRoster, fetchStaffRoster } from "@/lib/staff";
import ConfirmModal from "@/components/ui/confirm-modal";
import { useLockBodyScroll } from "@/lib/use-lock-body-scroll";
import { supabase } from "@/lib/supabase";
import { createClient } from "@supabase/supabase-js";

// Helper client to prevent auth operations from altering the current admin's session.
// A unique storageKey keeps it from colliding with the main client's session
// (which triggers the "Multiple GoTrueClient instances" warning and risks
// undefined session behavior sharing one key).
const authClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  {
    auth: {
      storageKey: "sb-staff-invite-auth-token",
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

const formatNameInput = (str) =>
  str ? str.replace(/\s+/g, " ").replace(/(^\w|\s\w)/g, (m) => m.toUpperCase()) : "";

// Writes the driver's `profiles` row — the ONLY source of truth for the admin
// roster (`fetchStaffRoster` reads role='driver' rows) and driver login.
// Returns the Supabase error, or null on success, so callers can surface it
// instead of silently leaving an Auth-only user that never appears.
async function upsertDriverProfile({ userId, fullName, fName, lName, loginEmail }) {
  const row = {
    role: "driver",
    full_name: fullName,
    first_name: fName,
    last_name: lName,
    email: loginEmail,
    status: "Active",
  };
  // id is the FK to auth.users — include it whenever we have it so the
  // profile links to the login account. Without it the insert may fail on
  // NOT NULL / FK, which the caller then reports.
  const payload = userId ? { ...row, id: userId } : row;
  const { error } = await supabase.from("profiles").upsert(payload);
  return error || null;
}

function profileErrorMessage(action, err) {
  const detail = err?.message || "unknown error";
  if (err?.code === "42501" || /row-level security|rls/i.test(detail)) {
    return (
      `${action} blocked by database permissions: ${detail}. ` +
      `Run supabase/migrations/20260924000000_profiles_admin_crud.sql in your ` +
      `Supabase SQL Editor, then try again.`
    );
  }
  return `${action} failed: ${detail}.`;
}

function Field({ label, children, hint }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className={labelClass}>{label}</label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export default function StaffPage() {
  const live = useLiveRoute();
  const fleet = useFleet();
  const [staff, setStaff] = useStaffRoster();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [driverToDelete, setDriverToDelete] = useState(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [truck, setTruck] = useState("");
  const [status, setStatus] = useState("Active");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [pendingDriver, setPendingDriver] = useState(null);
  const [resendTimer, setResendTimer] = useState(60);
  const [isResending, setIsResending] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 5000);
  };

  const truckOf = (driverName) =>
    fleet.find((t) => t.driver && t.driver.trim().toLowerCase() === driverName?.trim().toLowerCase()) || null;
  const truckLabel = (t) => `${t.id} (${t.plate})`;

  const resetForm = () => {
    setFirstName("");
    setLastName("");
    setUsername("");
    setPassword("");
    setShowPassword(false);
    setTruck("");
    setStatus("Active");
    setFormError("");
    setIsVerifyingOtp(false);
    setOtpCode("");
    setPendingDriver(null);
    setResendTimer(60);
    setIsResending(false);
  };

  // Countdown timer for OTP resend
  useEffect(() => {
    if (!isVerifyingOtp) return;
    setResendTimer(60);
    const interval = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) { clearInterval(interval); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isVerifyingOtp]);

  useEffect(() => {
    if (selectedDriver) {
      const parts = (selectedDriver.name || "").trim().split(" ");
      if (parts.length > 1) {
        setFirstName(parts.slice(0, -1).join(" "));
        setLastName(parts[parts.length - 1]);
      } else {
        setFirstName(selectedDriver.name || "");
        setLastName("");
      }
      setUsername(selectedDriver.username);
      setTruck(truckOf(selectedDriver.name)?.id ?? "");
      setStatus(selectedDriver.status || "Active");
      setPassword("");
      setShowPassword(false);
      setIsAdding(false);
    } else {
      resetForm();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDriver]);

  useEffect(() => {
    if (isAdding) {
      setSelectedDriver(null);
      resetForm();
    }
  }, [isAdding]);

  const [formError, setFormError] = useState("");

  const handleAddDriver = async (e) => {
    e.preventDefault();
    setFormError("");
    const loginEmail = username.trim().toLowerCase();
    const fName = firstName.trim();
    const lName = lastName.trim();

    if (!lName) {
      setFormError("Please enter the driver's last name.");
      return;
    }
    if (!fName) {
      setFormError("Please enter the driver's first name.");
      return;
    }
    if (!loginEmail) {
      setFormError("Please enter a login email.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginEmail)) {
      setFormError("Login email must be a valid email address.");
      return;
    }
    if (!password || password.length < 6) {
      setFormError("Temporary password must be at least 6 characters.");
      return;
    }

    setIsSubmitting(true);
    const fullName = `${fName} ${lName}`;

    // 1. Save locally for driver-accounts / mock login
    saveDriverAccount({ name: fullName, email: loginEmail, password });

    const newDriverObj = {
      id: `DRV-${String(staff.length + 1).padStart(3, "0")}`,
      name: fullName,
      role: "Driver",
      username: loginEmail,
      status: "Active",
    };

    try {
      // 2. Save in Supabase Auth (This will trigger an OTP email if email confirmations are enabled)
      // Using authClient so it doesn't log the admin out
      const { data, error: signUpError } = await authClient.auth.signUp({
        email: loginEmail,
        password,
        options: {
          data: {
            role: "driver",
            first_name: fName,
            last_name: lName,
            full_name: fullName,
          },
        },
      });

      if (signUpError) {
        setFormError(signUpError.message);
        setIsSubmitting(false);
        return;
      }

      const authUserId = data?.user?.id || null;
      if (!authUserId) {
        setFormError("Could not create account. This email might already be registered.");
        setIsSubmitting(false);
        return;
      }

      // Write the profiles row NOW (not only after OTP) so the driver shows
      // in the admin roster / driver login even while verification is pending.
      // If this fails we still continue to OTP (the Auth user already exists)
      // but warn — the verify step retries and surfaces the error.
      const earlyErr = await upsertDriverProfile({
        userId: authUserId,
        fullName,
        fName,
        lName,
        loginEmail,
      });

      let profileWarning = "";
      if (earlyErr) {
        console.warn("Driver profile upsert error:", earlyErr);
        profileWarning = profileErrorMessage("Profile save", earlyErr);
      } else {
        // DB write succeeded — show the driver immediately instead of
        // waiting for OTP, carrying the auth id for later edit/delete sync.
        const optimisticDriver = { ...newDriverObj, supabaseId: authUserId || undefined };
        setStaff((prev) => {
          if (prev.some((d) => (d.username || "").toLowerCase() === loginEmail.toLowerCase())) {
            return prev;
          }
          const updated = [...prev, optimisticDriver];
          saveStaffRoster(updated);
          return updated;
        });
      }

      // Transition to OTP verification step
      setPendingDriver({
        id: authUserId,
        newDriverObj,
        fullName,
        fName,
        lName,
        loginEmail,
        profileWarning,
      });
      if (profileWarning) setFormError(profileWarning);
      setIsVerifyingOtp(true);
      setIsSubmitting(false);
      return; // Stop here and wait for OTP input

    } catch (err) {
      console.warn("Supabase driver creation warning:", err);
      setFormError("Failed to create driver account.");
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setFormError("");

    if (!otpCode || otpCode.length !== 6) {
      setFormError("Please enter a valid 6-digit code.");
      return;
    }

    setIsSubmitting(true);

    try {
      // verifyOtp does not affect the current admin session because we use authClient
      const { data, error: verifyError } = await authClient.auth.verifyOtp({
        email: pendingDriver.loginEmail,
        token: otpCode,
        type: "signup",
      });

      if (verifyError) {
        setFormError(verifyError.message);
        setIsSubmitting(false);
        return;
      }

      const userId = pendingDriver.id || data?.user?.id;

      // Verification successful — (re)write the profile. This retry heals
      // drivers whose early insert was blocked, and is a no-op otherwise.
      // A failure here must block success: otherwise fetchStaffRoster() below
      // would wipe the optimistic row and the driver "disappears".
      const upsertErr = await upsertDriverProfile({
        userId,
        fullName: pendingDriver.fullName,
        fName: pendingDriver.fName,
        lName: pendingDriver.lName,
        loginEmail: pendingDriver.loginEmail,
      });
      if (upsertErr) {
        console.warn("Upsert error:", upsertErr);
        setFormError(profileErrorMessage("Profile save", upsertErr));
        setIsSubmitting(false);
        return;
      }

      // Update staff roster state and localStorage
      const verifiedDriver = { ...pendingDriver.newDriverObj, supabaseId: userId || undefined };
      setStaff((prev) => {
        if (prev.some((d) => (d.username || "").toLowerCase() === pendingDriver.loginEmail.toLowerCase())) {
          const updated = prev.map((d) =>
            (d.username || "").toLowerCase() === pendingDriver.loginEmail.toLowerCase()
              ? { ...d, ...verifiedDriver }
              : d
          );
          saveStaffRoster(updated);
          return updated;
        }
        const updated = [...prev, verifiedDriver];
        saveStaffRoster(updated);
        return updated;
      });

      if (truck) assignDriver(truck, pendingDriver.fullName);

      fetchStaffRoster();
      setIsSubmitting(false);
      setIsAdding(false);
      resetForm();

    } catch (err) {
      console.warn("OTP verification warning:", err);
      setFormError("Verification failed.");
      setIsSubmitting(false);
    }
  };

  const handleUpdateDriver = async (e) => {
    e.preventDefault();
    setFormError("");
    const loginEmail = username.trim().toLowerCase();
    const fName = firstName.trim();
    const lName = lastName.trim();

    if (!lName || !fName) {
      setFormError("Please enter both last name and first name.");
      return;
    }
    if (!loginEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginEmail)) {
      setFormError("Login email must be a valid email address.");
      return;
    }

    setIsSubmitting(true);
    const fullName = `${fName} ${lName}`;

    if (getDriverAccount(selectedDriver.username)) {
      renameDriverAccount(selectedDriver.username, loginEmail, fullName);
    }

    const prevTruck = truckOf(selectedDriver.name);
    if (prevTruck && prevTruck.id !== truck) assignDriver(prevTruck.id, null);
    if (truck) assignDriver(truck, fullName);

    // Bug 6 fix: sync updated name/email back to Supabase profiles table
    if (selectedDriver.supabaseId) {
      const { error: updateErr } = await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          first_name: fName,
          last_name: lName,
          email: loginEmail,
          status,
        })
        .eq("id", selectedDriver.supabaseId);
      if (updateErr) console.warn("Profile update error:", updateErr);
    }

    setStaff(
      staff.map((drv) =>
        drv.id === selectedDriver.id
          ? { ...drv, name: fullName, username: loginEmail, status }
          : drv
      )
    );
    await fetchStaffRoster(); // Refresh from DB to stay in sync
    setSelectedDriver(null);
    resetForm();
    setIsSubmitting(false);
  };

  // Deactivate by setting status to 'Suspended' (a valid status value).
  // NOTE: `role` has a DB check constraint (profiles_role_check) that rejects
  // values like 'inactive', so never write role here. Suspended drivers stay
  // visible in the roster with a Suspended badge and are blocked at driver login.
  // Full auth account deletion requires a service-role key and should be done from Supabase dashboard.
  const handleDeleteDriver = async (id) => {
    const person = staff.find((drv) => drv.id === id);
    let deactivated = true;
    if (person) {
      const held = truckOf(person.name);
      if (held) assignDriver(held.id, null);
      removeDriverAccount(person.username);

      // Suspend in Supabase so the driver can no longer sign in to the terminal
      if (person.supabaseId) {
        const { error } = await supabase
          .from("profiles")
          .update({ status: "Suspended" })
          .eq("id", person.supabaseId);
        if (error) {
          console.warn("Profile deactivation error:", error);
          showToast(`Could not deactivate ${person.name}: ${error.message}`);
          deactivated = false;
        }
      }
    }
    if (deactivated) {
      setStaff(staff.map((drv) => (drv.id === id ? { ...drv, status: "Suspended" } : drv)));
      if (person) showToast(`${person.name} deactivated.`);
    }
    if (selectedDriver?.id === id) {
      setSelectedDriver(null);
    }
    await fetchStaffRoster(); // Refresh from DB
    setDriverToDelete(null);
  };

  const filteredStaff = staff.filter(
    (person) =>
      person.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (truckOf(person.name)
        ? truckLabel(truckOf(person.name)).toLowerCase().includes(searchQuery.toLowerCase())
        : "unassigned".includes(searchQuery.toLowerCase()))
  );

  const totalDrivers = staff.length;
  const assignedCompactors = fleet.filter(
    (t) => live.driverByTruck[t.id]
  ).length;

  const formOpen = isAdding || selectedDriver !== null;

  // Lock background scroll while the form sheet is open so scrolling the
  // form never scrolls the page behind it.
  useLockBodyScroll(formOpen || isVerifyingOtp);

  return (
    <div className="relative flex min-h-full w-full min-w-0 overflow-x-hidden bg-background">
      {toastMessage && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 z-50 flex animate-in-fade items-center justify-center gap-2 rounded-[10px] bg-zinc-900 px-4 py-3 text-[13px] text-white shadow-lg">
          <span>{toastMessage}</span>
        </div>
      )}
      <div className="relative z-10 flex flex-1 min-w-0 flex-col gap-5 p-4 [scrollbar-gutter:stable] sm:gap-6 sm:p-6 lg:p-8 pb-6 sm:pb-8 lg:pb-10">
        <PageHeader
          title="Drivers"
          description="Manage driver accounts and assign them to trucks"
          actions={
            <Button variant="primary" className="h-10 w-full sm:w-auto rounded-xl px-4 text-[14px] font-semibold" onClick={() => setIsAdding(true)}>
              <Plus className="h-4 w-4" />
              <span>Add New Driver</span>
            </Button>
          }
        />

        <div className="grid shrink-0 grid-cols-2 gap-2.5 sm:gap-3.5 max-w-md">
          <PanelStat label="Drivers" value={totalDrivers} hint="Registered accounts" />
          <PanelStat label="Assigned Trucks" value={assignedCompactors} hint="Drivers with a truck" tone="emerald" />
        </div>

        <div className="flex shrink-0 items-center">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Filter by driver or truck..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn(inputClass, "pl-9")}
            />
          </div>
        </div>

        <div className="flex-1 min-w-0 rounded-2xl border border-border bg-card/95 shadow-sm overflow-hidden flex flex-col">
          <div className="flex-1 overflow-x-auto min-h-0">
            <table className="w-full min-w-[720px] text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/40 font-semibold text-muted-foreground">
                  <th className="py-3 px-4 whitespace-nowrap">Driver ID</th>
                  <th className="py-3 px-4 whitespace-nowrap">Full Name</th>
                  <th className="py-3 px-4 whitespace-nowrap hidden md:table-cell">Login Email</th>
                  <th className="py-3 px-4 whitespace-nowrap">Assigned Truck</th>
                  <th className="py-3 px-4 whitespace-nowrap">Status</th>
                  <th className="py-3 px-4 text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredStaff.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-4">
                      <div className="flex flex-col items-center justify-center px-4 py-14 text-center">
                        <Users className="h-12 w-12 text-muted-foreground/40" strokeWidth={1.5} />
                        <h3 className="mt-4 text-[17px] font-semibold tracking-tight text-foreground">No Staff Found</h3>
                        <p className="mt-1 max-w-[240px] text-[13px] leading-normal text-muted-foreground">
                          No drivers match your search filter.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredStaff.map((person) => {
                    const assigned = truckOf(person.name);
                    return (
                      <tr
                        key={person.id}
                        onClick={() => setSelectedDriver(person)}
                        className={`transition-colors cursor-pointer hover:bg-muted/50 ${
                          selectedDriver?.id === person.id ? "bg-emerald-50/50 dark:bg-emerald-950/20" : ""
                        }`}
                      >
                        <td className="py-3 px-4 font-mono font-bold text-foreground whitespace-nowrap">
                          {person.id}
                        </td>
                        <td className="py-3 px-4 font-bold text-foreground whitespace-nowrap">
                          {person.name}
                        </td>
                        <td className="py-3 px-4 font-mono text-muted-foreground whitespace-nowrap hidden md:table-cell">
                          {person.username}
                        </td>
                        <td className="py-3 px-4 font-medium text-foreground whitespace-nowrap">
                          {assigned ? (
                            <span className="inline-flex items-center gap-1.5 font-bold text-emerald-700 dark:text-emerald-400">
                              {truckLabel(assigned)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground/70 italic">Unassigned</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <StatusBadge status={person.status || "Active"} showDot={false} />
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedDriver(person);
                              }}
                              className="rounded-full bg-muted px-3 py-1 text-[13px] font-semibold text-foreground transition-all hover:bg-muted/80 active:scale-95 cursor-pointer"
                              title="Edit driver"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDriverToDelete(person);
                              }}
                              className="inline-flex items-center gap-1.5 rounded-full bg-rose-600/10 px-3 py-1 text-[13px] font-semibold text-rose-600 transition-all hover:bg-rose-600/20 active:scale-95 cursor-pointer"
                              title="Remove driver"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Remove
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Guaranteed bottom spacer element */}
        <div className="h-6 sm:h-8 lg:h-10 w-full shrink-0 pointer-events-none" aria-hidden="true" />
      </div>

      <AnimatePresence>
        {formOpen && (
          <div className="fixed inset-0 z-50 flex items-stretch justify-center sm:justify-end pointer-events-none overflow-hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 sm:bg-transparent pointer-events-auto"
              onClick={() => (isAdding ? setIsAdding(false) : setSelectedDriver(null))}
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="relative z-10 flex h-full h-dvh w-full min-w-0 flex-col overflow-hidden bg-card pointer-events-auto sm:max-w-md sm:border-l sm:border-border sm:shadow-2xl"
            >
              <form
                onSubmit={isVerifyingOtp ? handleVerifyOtp : (isAdding ? handleAddDriver : handleUpdateDriver)}
                className="mx-auto flex h-full w-full max-w-3xl flex-col justify-between overflow-hidden p-4 sm:p-6"
              >
                <div className="flex shrink-0 touch-none items-start justify-between border-b border-border/60 pb-3">
                  {isAdding ? (
                    <h2 className="text-[17px] font-semibold tracking-tight text-foreground">Add New Driver</h2>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-foreground tracking-tight tabular-nums">
                        {selectedDriver?.id}
                      </span>
                      <StatusBadge status={selectedDriver?.status || "Active"} />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => (isAdding ? setIsAdding(false) : setSelectedDriver(null))}
                    className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:text-foreground cursor-pointer"
                    aria-label="Close panel"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto overscroll-contain py-3 gap-5 flex flex-col min-h-0">
                  {isVerifyingOtp ? (
                    <div className="flex flex-col gap-6 items-center justify-center text-center py-8">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full text-emerald-600 mb-2">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-mail-check"><path d="M22 13V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v12c0 1.1.9 2 2 2h8"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/><path d="m16 19 2 2 4-4"/></svg>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-foreground mb-1">Verify Driver Email</h3>
                        <p className="text-sm text-muted-foreground px-4">
                          A 6-digit code has been sent to <br/><strong className="text-foreground">{pendingDriver?.loginEmail}</strong>.<br/><br/>
                          Ask the driver for the code to activate their account.
                        </p>
                      </div>
                      <div className="w-full max-w-[280px] flex flex-col gap-1.5">
                        <OtpInput
                          value={otpCode}
                          onChange={(v) => {
                            setOtpCode(v.replace(/\D/g, "").slice(0, 6));
                            if (formError) setFormError("");
                          }}
                          hasError={!!formError}
                          autoFocus={false}
                        />
                        <AnimatePresence initial={false}>
                          {formError && (
                            <motion.p
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.25, ease: "easeInOut" }}
                              className="overflow-hidden text-xs font-medium text-rose-500 text-center"
                            >
                              {formError}
                            </motion.p>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Resend row */}
                      <div className="flex flex-col items-center gap-1">
                        <button
                          type="button"
                          disabled={resendTimer > 0 || isResending}
                          onClick={async () => {
                            if (resendTimer > 0 || isResending || !pendingDriver?.loginEmail) return;
                            setIsResending(true);
                            setFormError("");
                            const { error } = await authClient.auth.resend({
                              type: "signup",
                              email: pendingDriver.loginEmail,
                            });
                            setIsResending(false);
                            if (error) {
                              setFormError(error.message);
                            } else {
                              setResendTimer(60);
                            }
                          }}
                          className="text-[13px] font-semibold text-emerald-600 hover:text-emerald-700 disabled:text-muted-foreground/50 disabled:cursor-not-allowed transition-colors"
                        >
                          {isResending
                            ? "Sending..."
                            : resendTimer > 0
                            ? `Resend Code (${resendTimer}s)`
                            : "Resend Code"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4">
                      <Field label="Last Name">
                        <input
                          required
                          type="text"
                          value={lastName}
                          onChange={(e) => setLastName(formatNameInput(e.target.value))}
                          onBlur={() => setLastName(formatNameInput(lastName))}
                          placeholder={isAdding ? "e.g. Santos" : undefined}
                          className={inputClass}
                        />
                      </Field>

                      <Field label="First Name">
                        <input
                          required
                          type="text"
                          value={firstName}
                          onChange={(e) => setFirstName(formatNameInput(e.target.value))}
                          onBlur={() => setFirstName(formatNameInput(firstName))}
                          placeholder={isAdding ? "e.g. Maria" : undefined}
                          className={inputClass}
                        />
                      </Field>

                      {!isAdding && (
                        <Field label="Assigned Truck">
                          <select
                            value={truck}
                            onChange={(e) => setTruck(e.target.value)}
                            className={cn(inputClass, "cursor-pointer")}
                          >
                            <option value="">Unassigned</option>
                            {fleet.map((t) => (
                              <option key={t.id} value={t.id}>
                                {truckLabel(t)}
                                {live.driverByTruck[t.id] ? ` — ${live.driverByTruck[t.id]}` : ""}
                              </option>
                            ))}
                          </select>
                        </Field>
                      )}

                      <div className={cn("flex flex-col gap-4", isAdding && "border-t border-border-subtle pt-4")}>
                        <Field label="Login Email">
                          <input
                            required
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder={isAdding ? "driver@bingo.com" : undefined}
                            className={cn(inputClass, "font-mono")}
                          />
                        </Field>

                        {isAdding ? (
                          <Field
                            label="Temporary Password"
                            hint="Share this temporary password with the driver to log in"
                          >
                            <div className="relative">
                              <input
                                required
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value.replace(/\s/g, ""))}
                                placeholder="Set temp password..."
                                className={cn(inputClass, "font-mono pr-10")}
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                                aria-label={showPassword ? "Hide password" : "Show password"}
                              >
                                {showPassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                              </button>
                            </div>
                            <PasswordStrengthHint password={password} />
                            {password && (
                              <div className="flex flex-wrap gap-x-3 gap-y-1 pt-0.5 text-[11px] font-medium text-muted-foreground/70">
                                <span className={password.length >= 6 ? "text-emerald-600 dark:text-emerald-400 font-semibold" : ""}>
                                  {password.length >= 6 ? "✓" : "•"} 6+ characters
                                </span>
                                <span className={/[a-zA-Z]/.test(password) ? "text-emerald-600 dark:text-emerald-400 font-semibold" : ""}>
                                  {/[a-zA-Z]/.test(password) ? "✓" : "•"} 1 letter
                                </span>
                                <span className={/\d/.test(password) ? "text-emerald-600 dark:text-emerald-400 font-semibold" : ""}>
                                  {/\d/.test(password) ? "✓" : "•"} 1 number
                                </span>
                              </div>
                            )}
                          </Field>
                        ) : (
                          <div className="flex shrink-0 flex-col gap-2">
                            <span className={labelClass}>Account Status</span>
                            <div className="grid grid-cols-2 gap-0.5 rounded-xl bg-muted p-1">
                              {["Active", "Suspended"].map((option) => (
                                <button
                                  key={option}
                                  type="button"
                                  onClick={() => setStatus(option)}
                                  className={`rounded-lg py-1.5 text-[13px] font-medium transition-colors cursor-pointer ${
                                    status === option
                                      ? option === "Active"
                                        ? "bg-emerald-600 text-white font-semibold"
                                        : "bg-rose-600 text-white font-semibold"
                                      : "text-muted-foreground hover:text-foreground"
                                  }`}
                                >
                                  {option}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-auto shrink-0 touch-none flex flex-col gap-3 border-t border-border-subtle pt-4">
                  <AnimatePresence initial={false}>
                    {formError && !isVerifyingOtp && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        <p className="rounded-2xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-[13px] font-medium text-rose-600">
                          {formError}
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <div className="grid grid-cols-2 gap-2 w-full sm:flex sm:w-auto sm:items-center sm:justify-end">
                    <Button
                      variant="secondary"
                      size="sm"
                      type="button"
                      className="h-10 w-full sm:w-auto rounded-xl px-4 text-[14px] font-semibold"
                      disabled={isSubmitting}
                      onClick={() => (isAdding ? setIsAdding(false) : setSelectedDriver(null))}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="primary"
                      type="submit"
                      disabled={isSubmitting || (isVerifyingOtp && otpCode.length !== 6)}
                      className="h-10 w-full sm:w-auto rounded-xl px-4 text-[14px] font-semibold"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          {isVerifyingOtp ? "Verifying..." : "Saving..."}
                        </>
                      ) : isAdding ? (
                        isVerifyingOtp ? "Verify & Confirm" : "Create Account"
                      ) : (
                        "Save Changes"
                      )}
                    </Button>
                  </div>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmModal
        open={!!driverToDelete}
        title="Deactivate Driver"
        description={`This will deactivate ${driverToDelete?.name} (status → Suspended) and unassign their truck. They will no longer be able to sign in to the Driver Terminal.`}
        onConfirm={() => handleDeleteDriver(driverToDelete?.id)}
        onCancel={() => setDriverToDelete(null)}
      />
    </div>
  );
}
