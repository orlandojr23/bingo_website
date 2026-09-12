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
import { supabase } from "@/lib/supabase";

const formatNameInput = (str) =>
  str ? str.replace(/\s+/g, " ").replace(/(^\w|\s\w)/g, (m) => m.toUpperCase()) : "";

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

  const truckOf = (driverName) =>
    fleet.find((t) => live.driverByTruck[t.id] === driverName) || null;
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
  };

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
      // 2. Save in Supabase Auth & profiles table
      const { data, error: signUpError } = await supabase.auth.signUp({
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

      if (!signUpError && data?.user?.id) {
        const { error: upsertErr } = await supabase.from("profiles").upsert({
          id: data.user.id,
          role: "driver",
          full_name: fullName,
          first_name: fName,
          last_name: lName,
          email: loginEmail,
          status: "Active",
        });
        if (upsertErr) console.warn("Upsert error:", upsertErr);
      } else {
        const { error: upsertErr } = await supabase.from("profiles").upsert({
          role: "driver",
          full_name: fullName,
          first_name: fName,
          last_name: lName,
          email: loginEmail,
          status: "Active",
        });
        if (upsertErr) console.warn("Upsert error:", upsertErr);
      }
    } catch (err) {
      console.warn("Supabase driver creation warning:", err);
    }

    // 3. Update staff roster state and localStorage
    setStaff((prev) => {
      if (prev.some((d) => (d.username || "").toLowerCase() === loginEmail.toLowerCase())) {
        return prev;
      }
      const updated = [...prev, newDriverObj];
      saveStaffRoster(updated);
      return updated;
    });

    if (truck) assignDriver(truck, fullName);

    // 4. Fetch updated roster asynchronously and stop loading state
    fetchStaffRoster();
    setIsSubmitting(false);
    setIsAdding(false);
    resetForm();
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

  // Bug 3 fix: soft-delete from Supabase by setting role to 'inactive'.
  // This prevents the driver from appearing in the roster and blocks driver terminal access.
  // Full auth account deletion requires a service-role key and should be done from Supabase dashboard.
  const handleDeleteDriver = async (id) => {
    const person = staff.find((drv) => drv.id === id);
    if (person) {
      const held = truckOf(person.name);
      if (held) assignDriver(held.id, null);
      removeDriverAccount(person.username);

      // Soft-delete: mark role as inactive in Supabase so they no longer appear
      if (person.supabaseId) {
        const { error } = await supabase
          .from("profiles")
          .update({ role: "inactive" })
          .eq("id", person.supabaseId);
        if (error) console.warn("Profile deactivation error:", error);
      }
    }
    setStaff(staff.filter((drv) => drv.id !== id));
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

  return (
    <div className="relative flex min-h-full w-full min-w-0 overflow-x-hidden bg-background bg-[url('/hero-bg.svg')] bg-[length:100%_auto] sm:bg-cover bg-top sm:bg-center bg-no-repeat">
      <div className="absolute inset-0 bg-background/42 pointer-events-none" />
      <div className="relative z-10 flex flex-1 min-w-0 flex-col gap-5 p-4 [scrollbar-gutter:stable] sm:gap-6 sm:p-6 lg:p-8 pb-6 sm:pb-8 lg:pb-10">
        <PageHeader
          title="Drivers"
          description="Manage driver accounts and assign them to trucks"
          actions={
            <Button variant="primary" onClick={() => setIsAdding(true)}>
              <Plus className="h-4 w-4" />
              <span>Add New Driver</span>
            </Button>
          }
        />

        <div className="grid shrink-0 grid-cols-2 gap-3.5 max-w-sm sm:max-w-md">
          <PanelStat label="Drivers" value={totalDrivers} hint="Registered accounts" />
          <PanelStat label="Assigned Trucks" value={assignedCompactors} hint="Drivers with a truck" tone="emerald" />
        </div>

        <div className="flex shrink-0 items-center">
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Filter by driver or truck..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-border bg-card/80 pl-9 pr-4 py-2 text-xs font-medium text-foreground placeholder:text-muted-foreground/60 outline-none transition-colors hover:border-zinc-300 focus:border-emerald-500 focus:bg-card"
            />
          </div>
        </div>

        <div className="flex-1 min-w-0 rounded-2xl border border-border bg-card/95 shadow-sm overflow-hidden flex flex-col">
          <div className="flex-1 overflow-x-auto min-h-0">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border bg-muted/40 font-semibold text-muted-foreground">
                  <th className="py-3 px-4">Driver ID</th>
                  <th className="py-3 px-4">Full Name</th>
                  <th className="py-3 px-4">Login Email</th>
                  <th className="py-3 px-4">Assigned Truck</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filteredStaff.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted-foreground">
                      No drivers match your search filter.
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
                        <td className="py-3 px-4 font-mono font-bold text-foreground">
                          {person.id}
                        </td>
                        <td className="py-3 px-4 font-bold text-foreground">
                          {person.name}
                        </td>
                        <td className="py-3 px-4 font-mono text-muted-foreground">
                          {person.username}
                        </td>
                        <td className="py-3 px-4 font-medium text-foreground">
                          {assigned ? (
                            <span className="inline-flex items-center gap-1.5 font-bold text-emerald-700 dark:text-emerald-400">
                              {truckLabel(assigned)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground/70 italic">Unassigned</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <StatusBadge status={person.status || "Active"} />
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDriverToDelete(person);
                            }}
                            className="gap-1.5 shadow-xs"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Remove
                          </Button>
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
          <div className="fixed inset-0 z-50 flex items-end sm:items-stretch justify-end pointer-events-none overflow-hidden">
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
              className="relative z-10 flex h-auto max-h-[85dvh] sm:h-full sm:max-h-full w-full max-w-md flex-col overflow-hidden rounded-t-2xl sm:rounded-none border-t sm:border-t-0 sm:border-l border-border bg-card p-4 sm:p-6 shadow-2xl pointer-events-auto self-end sm:self-auto"
            >
              <form
                onSubmit={isAdding ? handleAddDriver : handleUpdateDriver}
                className="flex h-full flex-col justify-between overflow-hidden"
              >
                <div className="flex shrink-0 items-start justify-between border-b border-border pb-3">
                  {isAdding ? (
                    <h2 className="text-sm font-semibold text-foreground">Add New Driver</h2>
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

                <div className="flex-1 overflow-y-auto py-3 gap-5 flex flex-col min-h-0">
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
                          <div className="grid grid-cols-2 gap-0.5 rounded-lg bg-muted p-0.5">
                            {["Active", "Suspended"].map((option) => (
                              <button
                                key={option}
                                type="button"
                                onClick={() => setStatus(option)}
                                className={`rounded-md py-1.5 text-xs font-medium transition-colors cursor-pointer ${
                                  status === option
                                    ? option === "Active"
                                      ? "bg-emerald-600 text-white shadow-xs"
                                      : "bg-rose-600 text-white shadow-xs"
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
                </div>

                <div className="mt-auto shrink-0 flex flex-col gap-3 border-t border-border-subtle pt-4">
                  {formError && (
                    <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-600">
                      {formError}
                    </p>
                  )}
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => (isAdding ? setIsAdding(false) : setSelectedDriver(null))}
                    >
                      Cancel
                    </Button>
                    <Button variant="primary" size="sm" type="submit" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          <span>Creating...</span>
                        </>
                      ) : isAdding ? (
                        "Create Driver"
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
        title="Delete Driver"
        description={`This will permanently remove ${driverToDelete?.name} and unassign their truck. This action cannot be undone.`}
        onConfirm={() => handleDeleteDriver(driverToDelete?.id)}
        onCancel={() => setDriverToDelete(null)}
      />
    </div>
  );
}
