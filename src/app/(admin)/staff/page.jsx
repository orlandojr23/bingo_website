"use client";

import { useState, useEffect } from "react";
import { Search, ShieldAlert, Plus, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { StatusBadge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { PanelStat } from "@/components/ui/panel-stat";
import { InfoRow } from "@/components/ui/info-row";
import { Button } from "@/components/ui/button";
import { inputClass, labelClass } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const initialStaff = [
  { id: "DRV-001", name: "Juan Dela Cruz", role: "Driver", truck: "Truck 01 (GW-8821)", username: "juan.driver", status: "Active" },
  { id: "DRV-002", name: "Pedro Reyes", role: "Driver", truck: "Truck 02 (XYZ-1234)", username: "pedro.driver", status: "Active" },
];

const truckOptions = [
  "Truck 01 (GW-8821)",
  "Truck 02 (XYZ-1234)",
  "Truck 03 (Unassigned)",
  "Truck 04 (Unassigned)",
];

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
  const [staff, setStaff] = useState(initialStaff);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [isAdding, setIsAdding] = useState(false);

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [truck, setTruck] = useState("Truck 03 (Unassigned)");
  const [status, setStatus] = useState("Active");

  const resetForm = () => {
    setName("");
    setUsername("");
    setPassword("");
    setTruck("Truck 03 (Unassigned)");
    setStatus("Active");
  };

  useEffect(() => {
    if (selectedDriver) {
      setName(selectedDriver.name);
      setUsername(selectedDriver.username);
      setTruck(selectedDriver.truck);
      setStatus(selectedDriver.status || "Active");
      setPassword("");
      setIsAdding(false);
    } else {
      resetForm();
    }
  }, [selectedDriver]);

  useEffect(() => {
    if (isAdding) {
      setSelectedDriver(null);
      resetForm();
    }
  }, [isAdding]);

  const handleAddDriver = (e) => {
    e.preventDefault();
    if (!name || !username) return;

    const newDriver = {
      id: `DRV-00${staff.length + 1}`,
      name,
      role: "Driver",
      truck,
      username,
      status,
    };

    setStaff([...staff, newDriver]);
    setIsAdding(false);
    resetForm();
  };

  const handleUpdateDriver = (e) => {
    e.preventDefault();
    if (!name || !username) return;

    setStaff(
      staff.map((drv) =>
        drv.id === selectedDriver.id
          ? { ...drv, name, username, truck, status }
          : drv
      )
    );
    setSelectedDriver(null);
    resetForm();
  };

  const handleDeleteDriver = (id, e) => {
    e.stopPropagation();
    setStaff(staff.filter((drv) => drv.id !== id));
    if (selectedDriver?.id === id) {
      setSelectedDriver(null);
    }
  };

  const filteredStaff = staff.filter(
    (person) =>
      person.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      person.truck.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalDrivers = staff.length;
  const assignedCompactors = staff.filter((d) => !d.truck.includes("Unassigned")).length;

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

        {filteredStaff.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-border bg-card p-10 text-center">
            <ShieldAlert className="mb-2.5 h-8 w-8 text-zinc-300" />
            <h3 className="text-sm font-semibold text-foreground">No Drivers Found</h3>
            <p className="mt-1 max-w-[220px] text-xs text-muted-foreground">
              We couldn&apos;t find any drivers matching &quot;{searchQuery}&quot;.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredStaff.map((person) => {
              const isSelected = selectedDriver?.id === person.id;

              return (
                <div
                  key={person.id}
                  onClick={() => setSelectedDriver(person)}
                  className={`group flex w-full cursor-pointer select-none flex-col justify-between rounded-xl border bg-card p-4 text-left transition-all ${
                    isSelected
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
                      <InfoRow label="Assigned Truck" value={person.truck} />
                      <InfoRow
                        label="Username"
                        value={<span className="font-mono text-xs">{person.username}</span>}
                      />
                    </div>
                  </div>

                  <div className="mt-2 flex shrink-0 items-center justify-end">
                    <button
                      type="button"
                      onClick={(e) => handleDeleteDriver(person.id, e)}
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
                      className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
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
                        {truckOptions.map((option) => (
                          <option key={option}>{option}</option>
                        ))}
                      </select>
                    </Field>

                    <div className={cn("flex flex-col gap-4", isAdding && "border-t border-border-subtle pt-4")}>
                      <Field label="Username">
                        <input
                          required
                          type="text"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          placeholder={isAdding ? "e.g. maria.driver" : undefined}
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

                <div className="mt-6 flex shrink-0 items-center justify-end gap-2 border-t border-border-subtle pt-4">
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
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
