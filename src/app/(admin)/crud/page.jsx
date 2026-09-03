"use client";

import { useState } from "react";
import { CheckCircle2, Plus, X, FilePlus2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { StatusBadge, UrgencyBadge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { PanelStat } from "@/components/ui/panel-stat";
import { inputClass, labelClass } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import CrudDeleteModal from "@/components/modals/crud-delete-modal";
import { useTickets, addTicket, updateTicket, removeTicket, nextTicketId } from "@/lib/tickets";

export default function CrudPage() {
  const records = useTickets();
  const [editingId, setEditingId] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  const [form, setForm] = useState({
    id: "",
    location: "",
    barangay: "",
    reporter: "",
    urgency: "Medium",
    status: "Pending",
    description: "",
  });

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.location || !form.barangay || !form.reporter) {
      setToastMessage("Error: Please fill in location, barangay, and reporter.");
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }

    if (editingId) {
      updateTicket(editingId, { ...form });
      showToast(`Record ${editingId} updated.`);
    } else {
      const payload = {
        ...form,
        id: nextTicketId(),
        city: "Cebu City",
        date: new Date().toLocaleDateString("en-CA"),
        time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        lat: form.lat ?? 10.3016,
        lng: form.lng ?? 123.9086,
        category: form.category || "Solid Waste",
      };
      addTicket(payload);
      showToast(`Record ${payload.id} created.`);
    }

    resetForm();
  };

  const handleEdit = (record) => {
    setIsAdding(false);
    setEditingId(record.id);
    setForm(record);
  };

  const handleStartAdd = () => {
    setEditingId(null);
    setForm({
      id: "",
      location: "",
      barangay: "",
      reporter: "",
      urgency: "Medium",
      status: "Pending",
      description: "",
    });
    setIsAdding(true);
  };

  const handleDeleteConfirm = async () => {
    if (!recordToDelete) return;
    const id = recordToDelete.id;

    removeTicket(id);
    showToast(`Record ${id} deleted.`);
    setRecordToDelete(null);
  };

  const resetForm = () => {
    setEditingId(null);
    setIsAdding(false);
    setForm({
      id: "",
      location: "",
      barangay: "",
      reporter: "",
      urgency: "Medium",
      status: "Pending",
      description: "",
    });
  };

  const isSheetOpen = isAdding || editingId !== null;
  const pendingCount = records.filter((r) => r.status === "Pending").length;

  return (
    <div className="relative flex min-h-full w-full min-w-0 overflow-x-hidden bg-background bg-[url('/hero-bg.svg')] bg-cover bg-center bg-no-repeat">
      <div className="absolute inset-0 bg-background/40 pointer-events-none" />
      {toastMessage && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 z-50 flex animate-in-fade items-center gap-2.5 rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-xs text-white shadow-lg">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="relative z-10 flex flex-1 min-w-0 flex-col gap-5 p-4 [scrollbar-gutter:stable] sm:gap-6 sm:p-6 lg:p-8 pb-10 sm:pb-16 lg:pb-24">
        <PageHeader
          title="Data Management"
          description="Create, update, and remove waste reports"
          actions={
            <Button variant="primary" onClick={handleStartAdd}>
              <Plus className="h-4 w-4" />
              <span>Create New Report</span>
            </Button>
          }
        />

        <div className="grid shrink-0 grid-cols-2 gap-3 sm:gap-3.5 max-w-sm sm:max-w-md">
          <PanelStat label="Total Reports" value={records.length} hint="All reports on record" />
          <PanelStat label="Waiting" value={pendingCount} hint="Needs attention" tone="rose" />
        </div>

        <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border-subtle p-4 sm:p-5">
            <div>
              <h2 className="text-sm font-semibold text-foreground">All Waste Reports</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Click any row or card to open and update its details.
              </p>
            </div>
            <span className="font-mono text-xs text-muted-foreground">
              {records.length} {records.length === 1 ? "Record" : "Records"}
            </span>
          </div>

          {/* Mobile Cards View (< sm) */}
          <div className="flex flex-col divide-y divide-border-subtle sm:hidden">
            {records.length === 0 ? (
              <div className="flex flex-col items-center p-8 text-center">
                <FilePlus2 className="mb-2.5 h-8 w-8 text-zinc-300" />
                <h3 className="text-sm font-semibold text-foreground">No Reports Yet</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Click &quot;Create New Report&quot; to add your first record.
                </p>
              </div>
            ) : (
              records.map((r) => {
                const isSelected = editingId === r.id;

                return (
                  <div
                    key={r.id}
                    onClick={() => handleEdit(r)}
                    className={`flex cursor-pointer flex-col gap-2 p-4 transition-colors ${
                      isSelected ? "bg-muted/80 font-medium" : "hover:bg-muted/40"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-semibold text-foreground">{r.id}</span>
                      <div className="flex items-center gap-1.5">
                        <UrgencyBadge urgency={r.urgency} />
                        <StatusBadge status={r.status} />
                      </div>
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-xs font-semibold text-foreground">{r.location}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {r.barangay} · {r.reporter}
                      </p>
                    </div>
                    <div className="flex items-center justify-end gap-3 pt-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => handleEdit(r)}
                        className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 cursor-pointer"
                      >
                        Edit Record
                      </button>
                      <span className="text-border">|</span>
                      <button
                        type="button"
                        onClick={() => setRecordToDelete(r)}
                        className="text-xs font-semibold text-rose-600 hover:text-rose-700 cursor-pointer"
                      >
                        Delete Record
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Desktop & Tablet Table View (>= sm) */}
          <div className="hidden overflow-x-auto sm:block">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-muted/50 font-medium text-muted-foreground">
                <tr>
                  <th className="p-3.5 pl-5">ID</th>
                  <th className="p-3.5">Location</th>
                  <th className="p-3.5">Barangay</th>
                  <th className="p-3.5">Reporter</th>
                  <th className="p-3.5">Priority</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 pr-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {records.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-10">
                      <div className="flex flex-col items-center text-center">
                        <FilePlus2 className="mb-2.5 h-8 w-8 text-zinc-300" />
                        <h3 className="text-sm font-semibold text-foreground">No Reports Yet</h3>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Click &quot;Create New Report&quot; to add your first record.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  records.map((r) => {
                    const isSelected = editingId === r.id;

                    return (
                      <tr
                        key={r.id}
                        onClick={() => handleEdit(r)}
                        className={`cursor-pointer transition-colors ${
                          isSelected ? "bg-muted/80 font-medium" : "hover:bg-muted/40"
                        }`}
                      >
                        <td className="p-3.5 pl-5 font-mono font-semibold text-foreground">{r.id}</td>
                        <td className="p-3.5 font-medium text-foreground">{r.location}</td>
                        <td className="p-3.5 text-muted-foreground">{r.barangay}</td>
                        <td className="p-3.5 text-muted-foreground">{r.reporter}</td>
                        <td className="p-3.5">
                          <UrgencyBadge urgency={r.urgency} />
                        </td>
                        <td className="p-3.5">
                          <StatusBadge status={r.status} />
                        </td>
                        <td className="p-3.5 pr-5 text-right">
                          <div className="flex items-center justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => handleEdit(r)}
                              className="font-medium text-emerald-600 transition-colors hover:text-emerald-700 cursor-pointer"
                            >
                              Edit Record
                            </button>
                            <span className="text-border">|</span>
                            <button
                              type="button"
                              onClick={() => setRecordToDelete(r)}
                              className="font-medium text-rose-600 transition-colors hover:text-rose-700 cursor-pointer"
                            >
                              Delete Record
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
      </div>

      <AnimatePresence>
        {isSheetOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-stretch justify-end pointer-events-none overflow-hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/40 sm:bg-transparent pointer-events-auto"
              onClick={resetForm}
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="relative z-10 flex h-auto max-h-[85dvh] sm:h-full sm:max-h-full w-full max-w-md flex-col overflow-hidden rounded-t-2xl sm:rounded-none border-t sm:border-t-0 sm:border-l border-border bg-card p-4 sm:p-6 shadow-2xl pointer-events-auto self-end sm:self-auto"
            >
              <form onSubmit={handleSave} className="flex h-full flex-col justify-between overflow-hidden">
                <div className="flex shrink-0 items-start justify-between border-b border-border pb-3">
                  <div>
                    <h2 className="text-sm font-semibold text-foreground">
                      {editingId ? `Update Report` : "Create New Report"}
                    </h2>
                    {editingId && (
                      <span className="font-mono text-xs font-medium text-muted-foreground">
                        {editingId}
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={resetForm}
                    className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition-colors hover:text-foreground cursor-pointer"
                    aria-label="Close sheet"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto py-3 gap-5 flex flex-col min-h-0">
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className={labelClass}>Location</label>
                      <input
                        required
                        type="text"
                        placeholder="e.g. Sitio Vilgon"
                        value={form.location}
                        onChange={(e) => setForm({ ...form, location: formatNameInput(e.target.value) })}
                        onBlur={() => setForm({ ...form, location: formatNameInput(form.location) })}
                        className={inputClass}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1.5">
                        <label className={labelClass}>Barangay</label>
                        <input
                          required
                          type="text"
                          value={form.barangay}
                          onChange={(e) => setForm({ ...form, barangay: formatNameInput(e.target.value) })}
                          onBlur={() => setForm({ ...form, barangay: formatNameInput(form.barangay) })}
                          className={inputClass}
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className={labelClass}>Reporter Name</label>
                        <input
                          required
                          type="text"
                          placeholder="Resident name"
                          value={form.reporter}
                          onChange={(e) => setForm({ ...form, reporter: formatNameInput(e.target.value) })}
                          onBlur={() => setForm({ ...form, reporter: formatNameInput(form.reporter) })}
                          className={inputClass}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1.5">
                        <label className={labelClass}>Waste Category</label>
                        <select
                          value={form.category}
                          onChange={(e) => setForm({ ...form, category: e.target.value })}
                          className={cn(inputClass, "cursor-pointer")}
                        >
                          <option value="Malata (Nabubulok)">Malata (Nabubulok)</option>
                          <option value="Di-Malata (Di-Nabubulok)">Di-Malata (Di-Nabubulok)</option>
                          <option value="Special Waste / Hazardous">Special / Hazardous</option>
                          <option value="Recyclable">Recyclable</option>
                        </select>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className={labelClass}>Urgency Level</label>
                        <select
                          value={form.urgency}
                          onChange={(e) => setForm({ ...form, urgency: e.target.value })}
                          className={cn(inputClass, "cursor-pointer")}
                        >
                          <option value="Low">Low</option>
                          <option value="Normal">Normal</option>
                          <option value="High">High</option>
                          <option value="Urgent">Urgent</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className={labelClass}>Status</label>
                      <select
                        value={form.status}
                        onChange={(e) => setForm({ ...form, status: e.target.value })}
                        className={cn(inputClass, "cursor-pointer")}
                      >
                        <option value="Pending">Pending</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Resolved">Resolved</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className={labelClass}>Description / Notes</label>
                      <textarea
                        rows={3}
                        placeholder="Add any extra details about this report..."
                        value={form.description}
                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                        className={cn(inputClass, "resize-none")}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-auto shrink-0 flex items-center justify-end gap-2 border-t border-border-subtle pt-4">
                  <Button variant="secondary" size="sm" type="button" onClick={resetForm}>
                    Cancel
                  </Button>
                  <Button variant="primary" size="sm" type="submit">
                    {editingId ? "Save Changes" : "Create Report"}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <CrudDeleteModal
        isOpen={!!recordToDelete}
        onClose={() => setRecordToDelete(null)}
        onConfirm={handleDeleteConfirm}
        record={recordToDelete}
      />
    </div>
  );
}
