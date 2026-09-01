"use client";

import { useState, useEffect } from "react";
import { Search, Users, Plus, X, ArrowLeftRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { StatusBadge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { PanelStat } from "@/components/ui/panel-stat";
import { InfoRow } from "@/components/ui/info-row";
import { Button } from "@/components/ui/button";
import { inputClass, labelClass } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useFleet } from "@/lib/fleet";
import { useLiveRoute, assignDriver, swapDrivers } from "@/lib/live-route";
import {
  getDriverAccount,
  saveDriverAccount,
  removeDriverAccount,
  renameDriverAccount,
} from "@/lib/driver-accounts";
import ConfirmModal from "@/components/ui/confirm-modal";

const initialStaff = [
  { id: "DRV-001", name: "Juan Dela Cruz", role: "Driver", username: "juan.driver", status: "Active" },
  { id: "DRV-002", name: "Pedro Reyes", role: "Driver", username: "pedro.driver", status: "Active" },
];

const STAFF_KEY = "bingo-staff-v1";

function loadStaff() {
  try {
    const raw = window.localStorage.getItem(STAFF_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (Array.isArray(parsed) && parsed.every((p) => p && p.id)) {
      return parsed;
    }
  } catch {}
  return initialStaff;
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
  const [staff, setStaff] = useState(loadStaff);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    try {
      window.localStorage.setItem(STAFF_KEY, JSON.stringify(staff));
    } catch {}
  }, [staff]);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [swapSource, setSwapSource] = useState(null);
  const [pendingSwap, setPendingSwap] = useState(null);
  const [driverToDelete, setDriverToDelete] = useState(null);

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [truck, setTruck] = useState("");
  const [status, setStatus] = useState("Active");

  const truckOf = (driverName) =>
    fleet.find((t) => live.driverByTruck[t.id] === driverName) || null;
  const truckLabel = (t) => `${t.id} (${t.plate})`;

  const resetForm = () => {
    setName("");
    setUsername("");
    setPassword("");
    setTruck("");
    setStatus("Active");
    setFormError("");
  };

  useEffect(() => {
    if (selectedDriver) {
      setName(selectedDriver.name);
      setUsername(selectedDriver.username);
      setTruck(truckOf(selectedDriver.name)?.id ?? "");
      setStatus(selectedDriver.status || "Active");
      setPassword("");
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

  const handleAddDriver = (e) => {
    e.preventDefault();
    setFormError("");
    const loginEmail = username.trim().toLowerCase();
    if (!name.trim() || !loginEmail) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginEmail)) {
      setFormError("Login email must be a valid email address.");
      return;
    }
    if (!password || password.length < 6) {
      setFormError("Temporary password must be at least 6 characters.");
      return;
    }

    saveDriverAccount({ name: name.trim(), email: loginEmail, password });

    const newDriver = {
      id: `DRV-${String(staff.length + 1).padStart(3, "0")}`,
      name: name.trim(),
      role: "Driver",
      username: loginEmail,
      status,
    };

    if (truck) assignDriver(truck, newDriver.name);
    setStaff([...staff, newDriver]);
    setIsAdding(false);
    resetForm();
  };

  const handleUpdateDriver = (e) => {
    e.preventDefault();
    setFormError("");
    const loginEmail = username.trim().toLowerCase();
    if (!name.trim() || !loginEmail) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginEmail)) {
      setFormError("Login email must be a valid email address.");
      return;
    }

    if (getDriverAccount(selectedDriver.username)) {
      renameDriverAccount(selectedDriver.username, loginEmail, name.trim());
    }

    const prevTruck = truckOf(selectedDriver.name);
    if (prevTruck && prevTruck.id !== truck) assignDriver(prevTruck.id, null);
    if (truck) assignDriver(truck, name.trim());

    setStaff(
      staff.map((drv) =>
        drv.id === selectedDriver.id
          ? { ...drv, name: name.trim(), username: loginEmail, status }
          : drv
      )
    );
    setSelectedDriver(null);
    resetForm();
  };

  const handleDeleteDriver = (id) => {
    const person = staff.find((drv) => drv.id === id);
    if (person) {
      const held = truckOf(person.name);
      if (held) assignDriver(held.id, null);
      removeDriverAccount(person.username);
    }
    setStaff(staff.filter((drv) => drv.id !== id));
    if (selectedDriver?.id === id) {
      setSelectedDriver(null);
    }
    if (swapSource?.id === id) {
      setSwapSource(null);
    }
    setDriverToDelete(null);
  };

  const handleSwapClick = (person, personTruck) => {
    if (!swapSource) {
      setSwapSource(person);
      return;
    }
    if (swapSource.id === person.id) {
      setSwapSource(null);
      return;
    }
    setPendingSwap({ source: swapSource, target: person });
  };

  const handleSwapConfirm = () => {
    if (!pendingSwap) return;
    const { source, target } = pendingSwap;
    const sourceTruck = truckOf(source.name);
    const targetTruck = truckOf(target.name);
    if (sourceTruck && targetTruck) {
      swapDrivers(sourceTruck.id, targetTruck.id);
    } else if (sourceTruck && !targetTruck) {
      assignDriver(sourceTruck.id, target.name);
    }
    setPendingSwap(null);
    setSwapSource(null);
  };

  const swapDescription = (() => {
    if (!pendingSwap) return "";
    const s = pendingSwap.source;
    const t = pendingSwap.target;
    const st = truckOf(s.name);
    const tt = truckOf(t.name);
    if (st && tt) {
      return `${s.name} (${truckLabel(st)}) will swap trucks with ${t.name} (${truckLabel(tt)}).`;
    }
    return `${s.name}'s truck (${truckLabel(st)}) will be reassigned to ${t.name}.`;
  })();

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
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-6 [scrollbar-gutter:stable] lg:p-8">
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
              placeholder="Search driver or truck..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={cn(inputClass, "pl-9")}
            />
          </div>
        </div>

        <AnimatePresence>
          {swapSource && (
            <motion.div
              key="swap-banner"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="shrink-0 overflow-hidden"
            >
              <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5">
                <p className="text-xs font-semibold text-amber-800">
                  Select a driver to swap trucks with {swapSource.name} (
                  {truckOf(swapSource.name) ? truckLabel(truckOf(swapSource.name)) : "Unassigned"}).
                </p>
                <button
                  type="button"
                  onClick={() => setSwapSource(null)}
                  className="shrink-0 rounded-md border border-amber-300 bg-card px-2.5 py-1 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-100 cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {filteredStaff.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-border bg-card p-10 text-center">
            <Users className="mb-2.5 h-8 w-8 text-zinc-300" />
            <h3 className="text-sm font-semibold text-foreground">
              {searchQuery ? "No Drivers Found" : "No Drivers Yet"}
            </h3>
            <p className="mt-1 max-w-[240px] text-xs text-muted-foreground">
              {searchQuery ? (
                <>We couldn&apos;t find any drivers matching &quot;{searchQuery}&quot;.</>
              ) : (
                "Add your first driver to start assigning trucks and managing collections."
              )}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredStaff.map((person) => {
              const isSelected = selectedDriver?.id === person.id;
              const personTruck = truckOf(person.name);
              const isSwapSource = swapSource?.id === person.id;

              return (
                <div
                  key={person.id}
                  onClick={() =>
                    swapSource
                      ? handleSwapClick(person, personTruck)
                      : setSelectedDriver(person)
                  }
                  className={`group flex w-full cursor-pointer select-none flex-col justify-between rounded-xl border bg-card p-4 text-left transition-all ${
                    isSwapSource
                      ? "border-amber-400 shadow-xs ring-1 ring-amber-400/20"
                      : isSelected
                        ? "border-emerald-400 shadow-xs ring-1 ring-emerald-400/20"
                        : "border-border hover:border-zinc-300 hover:bg-muted/40"
                  }`}
                >
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="font-mono text-xs font-semibold text-foreground">{person.id}</span>
                      <StatusBadge status={person.status} />
                    </div>

                    <div className="truncate text-sm font-semibold leading-tight text-foreground">
                      {person.name}
                    </div>
                    <div className="mt-1 text-xs font-medium uppercase tracking-wide text-emerald-600">
                      {person.role}
                    </div>

                    <div className="mt-4 border-t border-border-subtle pt-2">
                      <InfoRow
                        label="Assigned Truck"
                        value={personTruck ? truckLabel(personTruck) : "Unassigned"}
                      />
                      <InfoRow
                        label="Login Email"
                        value={<span className="font-mono text-xs">{person.username}</span>}
                      />
                    </div>
                  </div>

                  <div className="mt-2 flex shrink-0 items-center justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSwapClick(person, personTruck);
                      }}
                      disabled={!personTruck && !swapSource}
                      className="flex items-center gap-1 rounded-md border border-amber-200 bg-card px-2.5 py-1 text-xs font-medium text-amber-600 transition-colors hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                      title="Swap Truck Assignment"
                    >
                      <ArrowLeftRight className="h-3 w-3" />
                      Swap
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDriverToDelete(person);
                      }}
                      className="rounded-md border border-rose-200 bg-card px-2.5 py-1 text-xs font-medium text-rose-600 transition-colors hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700 cursor-pointer"
                      title="Delete Driver"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <AnimatePresence>
        {formOpen && (
          <div className="fixed inset-0 z-50 flex justify-end pointer-events-none overflow-hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-transparent pointer-events-auto"
              onClick={() => (isAdding ? setIsAdding(false) : setSelectedDriver(null))}
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="relative z-10 flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-border bg-card p-6 shadow-2xl pointer-events-auto"
            >
              <form
                onSubmit={isAdding ? handleAddDriver : handleUpdateDriver}
                className="flex h-full flex-col overflow-hidden"
              >
                <div className="flex flex-1 flex-col gap-5 overflow-y-auto">
                  <div className="flex shrink-0 items-start justify-between border-b border-border pb-3">
                    {isAdding ? (
                      <h2 className="text-sm font-semibold text-foreground">Add New Driver</h2>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-foreground">
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

                  <div className="flex flex-col gap-4">
                    <Field label="Full Name">
                      <input
                        required
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder={isAdding ? "e.g. Maria Santos" : undefined}
                        className={inputClass}
                      />
                    </Field>

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

                    <div className={cn("flex flex-col gap-4", isAdding && "border-t border-border-subtle pt-4")}>
                      <Field label="Login Email">
                        <input
                          required
                          type="text"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          placeholder={isAdding ? "e.g. maria.santos@example.com" : undefined}
                          className={cn(inputClass, "font-mono")}
                        />
                      </Field>

                      {isAdding ? (
                        <Field
                          label="Temporary Password"
                          hint="The driver can change this after their initial login."
                        >
                          <input
                            required
                            type="text"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="e.g. default123"
                            className={cn(inputClass, "font-mono")}
                          />
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
                                className={`rounded-md py-1.5 text-xs font-medium transition-colors ${
                                  status === option
                                    ? "bg-card text-foreground shadow-xs"
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

                <div className="mt-6 flex shrink-0 flex-col gap-3 border-t border-border-subtle pt-4">
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
                      onClick={() => (isAdding ? setIsAdding(false) : setSelectedDriver(null))}
                    >
                      Cancel
                    </Button>
                    <Button variant="primary" size="sm" type="submit">
                      {isAdding ? "Create" : "Save"}
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

      <ConfirmModal
        open={!!pendingSwap}
        title="Swap Truck Assignment"
        description={swapDescription}
        confirmLabel="Swap"
        onConfirm={handleSwapConfirm}
        onCancel={() => setPendingSwap(null)}
      />
    </div>
  );
}
