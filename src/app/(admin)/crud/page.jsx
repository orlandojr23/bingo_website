"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, Plus, X, FilePlus2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { StatusBadge, UrgencyBadge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { PanelStat } from "@/components/ui/panel-stat";
import { inputClass, labelClass } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import CrudDeleteModal from "@/components/modals/crud-delete-modal";
import { supabase } from "@/lib/supabase";
import { mockTickets as initialTestRecords } from "@/lib/mock-data";

export default function CrudPage() {
  const [records, setRecords] = useState(initialTestRecords);
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

  useEffect(() => {
    const fetchSupabase = async () => {
      const client = supabase;
      if (!client) return;
      try {
        const { data, error } = await client.from("crud_tickets").select("*");
        if (!error && data && data.length > 0) {
          setRecords(data);
        }
      } catch (err) {
        console.warn("Supabase fetch failed, utilizing local state:", err);
      }
    };
    fetchSupabase();
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.location || !form.barangay || !form.reporter) {
      setToastMessage("Error: Please fill in location, barangay, and reporter.");
      setTimeout(() => setToastMessage(null), 3000);
      return;
    }

    const payload = {
      ...form,
      id: form.id || `TKT-${Math.floor(100 + Math.random() * 900)}`,
      created_at: new Date().toISOString(),
    };

    const client = supabase;
    if (client) {
      try {
        if (editingId) {
          await client.from("crud_tickets").update(payload).eq("id", editingId);
        } else {
          await client.from("crud_tickets").insert([payload]);
        }
      } catch (err) {
        console.warn("Supabase sync error:", err);
      }
    }

    if (editingId) {
      setRecords((prev) => prev.map((r) => (r.id === editingId ? payload : r)));
      showToast(`Record ${editingId} updated.`);
    } else {
      setRecords((prev) => [payload, ...prev]);
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

    const client = supabase;
    if (client) {
      try {
        await client.from("crud_tickets").delete().eq("id", id);
      } catch (err) {
        console.warn("Supabase delete failed:", err);
      }
    }

    setRecords((prev) => prev.filter((r) => r.id !== id));
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
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex animate-in-fade items-center gap-2.5 rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-xs text-white shadow-lg">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-6 [scrollbar-gutter:stable] lg:p-8">
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

        <div className="grid shrink-0 grid-cols-2 gap-3.5 max-w-sm sm:max-w-md">
          <PanelStat label="Total Reports" value={records.length} hint="All reports on record" />
          <PanelStat label="Waiting" value={pendingCount} hint="Needs attention" tone="rose" />
        </div>

        <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border-subtle p-4 sm:p-5">
            <div>
              <h2 className="text-sm font-semibold text-foreground">All Waste Reports</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Click any row or Edit to open and update its details.
              </p>
            </div>
            <span className="font-mono text-xs text-muted-foreground">
              {records.length} {records.length === 1 ? "Record" : "Records"}
            </span>
          </div>

          <div className="overflow-x-auto">
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
                              Edit
                            </button>
                            <span className="text-border">|</span>
                            <button
                              type="button"
                              onClick={() => setRecordToDelete(r)}
                              className="font-medium text-rose-600 transition-colors hover:text-rose-700 cursor-pointer"
                            >
                              Delete
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
          <div className="fixed inset-0 z-50 flex justify-end pointer-events-none overflow-hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-transparent pointer-events-auto"
              onClick={resetForm}
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="relative z-10 flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-border bg-card p-6 shadow-2xl pointer-events-auto"
            >
              <form onSubmit={handleSave} className="flex h-full flex-col overflow-hidden">
                <div className="flex flex-1 flex-col gap-5 overflow-y-auto">
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

                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className={labelClass}>Location</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Osmeña Blvd & Colon St"
                        value={form.location}
                        onChange={(e) => setForm({ ...form, location: e.target.value })}
                        className={inputClass}
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className={labelClass}>Barangay</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Capitol Site"
                        value={form.barangay}
                        onChange={(e) => setForm({ ...form, barangay: e.target.value })}
                        className={inputClass}
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className={labelClass}>Reporter Name</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Juan Dela Cruz"
                        value={form.reporter}
                        onChange={(e) => setForm({ ...form, reporter: e.target.value })}
                        className={inputClass}
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className={labelClass}>Priority</label>
                      <select
                        value={form.urgency}
                        onChange={(e) => setForm({ ...form, urgency: e.target.value })}
                        className={cn(inputClass, "cursor-pointer")}
                      >
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                        <option value="Critical">Emergency</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className={labelClass}>Status</label>
                      <select
                        value={form.status}
                        onChange={(e) => setForm({ ...form, status: e.target.value })}
                        className={cn(inputClass, "cursor-pointer")}
                      >
                        <option value="Pending">Waiting</option>
                        <option value="In Progress">On the Way</option>
                        <option value="Resolved">Cleaned Up</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className={labelClass}>Additional Details</label>
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

                <div className="mt-6 flex shrink-0 items-center justify-end gap-2 border-t border-border-subtle pt-4">
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
