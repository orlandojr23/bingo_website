"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { Plus, Edit2, Trash2, CheckCircle2, RotateCcw, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge, UrgencyBadge } from "@/components/ui/badge";
import CrudDeleteModal from "@/components/modals/crud-delete-modal";
import { initialTestRecords, getSupabaseClient } from "@/lib/supabase";

export default function CrudPage() {
  const [records, setRecords] = useState(initialTestRecords);
  const [editingId, setEditingId] = useState(null);
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

  // Sync with Supabase on mount
  useEffect(() => {
    const fetchSupabase = async () => {
      const client = getSupabaseClient();
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
      alert("Please fill in location, barangay, and reporter.");
      return;
    }

    const payload = {
      ...form,
      id: form.id || `TKT-${Math.floor(100 + Math.random() * 900)}`,
      created_at: new Date().toISOString(),
    };

    const client = getSupabaseClient();
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
    setEditingId(record.id);
    setForm(record);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDeleteConfirm = async () => {
    if (!recordToDelete) return;
    const id = recordToDelete.id;

    const client = getSupabaseClient();
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

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-2.5 bg-zinc-900 text-white rounded-lg shadow-lg border border-zinc-800 text-xs animate-in-fade">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* CRUD Form Card */}
      <form
        onSubmit={handleSave}
        className="bg-white border border-zinc-200 rounded-xl p-5 sm:p-6 flex flex-col gap-4"
      >
        <div className="flex items-center justify-between pb-3 border-b border-zinc-200/80">
          <div>
            <h2 className="text-sm sm:text-base font-semibold text-zinc-900">
              {editingId ? `Update Report (${editingId})` : "Create New Report"}
            </h2>
            <p className="text-xs text-zinc-500">
              {editingId
                ? "Edit the details of this report"
                : "Enter the details to log a new waste report"}
            </p>
          </div>
          {editingId && (
            <button
              type="button"
              onClick={resetForm}
              className="text-xs font-medium text-zinc-500 hover:text-zinc-800 px-2.5 py-1 rounded-md hover:bg-zinc-100 transition-colors"
            >
              Cancel Edit
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-700">Location Address</label>
            <input
              type="text"
              required
              placeholder="e.g. Osmeña Blvd & Colon St"
              value={form.location}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
              className="px-3 py-2 border border-zinc-200 rounded-lg text-xs sm:text-sm bg-white text-zinc-900 focus:border-zinc-900 focus:outline-none"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-700">Barangay</label>
            <input
              type="text"
              required
              placeholder="e.g. Capitol Site"
              value={form.barangay}
              onChange={(e) => setForm({ ...form, barangay: e.target.value })}
              className="px-3 py-2 border border-zinc-200 rounded-lg text-xs sm:text-sm bg-white text-zinc-900 focus:border-zinc-900 focus:outline-none"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-700">Reporter Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Juan Dela Cruz"
              value={form.reporter}
              onChange={(e) => setForm({ ...form, reporter: e.target.value })}
              className="px-3 py-2 border border-zinc-200 rounded-lg text-xs sm:text-sm bg-white text-zinc-900 focus:border-zinc-900 focus:outline-none"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-700">Priority</label>
            <select
              value={form.urgency}
              onChange={(e) => setForm({ ...form, urgency: e.target.value })}
              className="px-3 py-2 border border-zinc-200 rounded-lg text-xs sm:text-sm bg-white text-zinc-900 focus:border-zinc-900 focus:outline-none font-medium"
            >
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
              <option value="Critical">Emergency</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-700">Status</label>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="px-3 py-2 border border-zinc-200 rounded-lg text-xs sm:text-sm bg-white text-zinc-900 focus:border-zinc-900 focus:outline-none font-medium"
            >
              <option value="Pending">Waiting</option>
              <option value="In Progress">On the Way</option>
              <option value="Resolved">Cleaned Up</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-zinc-700">Additional Details</label>
            <input
              type="text"
              placeholder="Brief description notes..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="px-3 py-2 border border-zinc-200 rounded-lg text-xs sm:text-sm bg-white text-zinc-900 focus:border-zinc-900 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-zinc-100">
          {editingId && (
            <Button variant="secondary" size="sm" onClick={resetForm}>
              Cancel
            </Button>
          )}
          <Button variant="primary" size="sm" type="submit">
            <span>{editingId ? "Save Changes" : "Save New Report"}</span>
          </Button>
        </div>
      </form>

      {/* Records Table Card */}
      <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden flex flex-col">
        <div className="p-4 sm:p-5 border-b border-zinc-200/80 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-zinc-900">
              Submitted Reports ({records.length} reports)
            </h3>
            <p className="text-xs text-zinc-500">
              A list of all reports in the system
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-zinc-600">
            <thead className="bg-zinc-50/80 text-zinc-700 font-medium border-b border-zinc-200/60">
              <tr>
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Location & Barangay</th>
                <th className="px-4 py-3">Reporter</th>
                <th className="px-4 py-3">Priority</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {records.map((r) => (
                <tr key={r.id} className="hover:bg-zinc-50/70 transition-colors">
                  <td className="px-4 py-3.5 font-mono font-medium text-zinc-900 whitespace-nowrap">
                    {r.id}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="font-medium text-zinc-900">{r.location}</div>
                    <div className="text-[11px] text-zinc-500">{r.barangay}</div>
                  </td>
                  <td className="px-4 py-3.5 font-medium text-zinc-800 whitespace-nowrap">
                    {r.reporter}
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <UrgencyBadge urgency={r.urgency} />
                  </td>
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="px-4 py-3.5 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleEdit(r)}
                        className="text-xs font-medium text-zinc-600 hover:text-zinc-900 px-2.5 py-1 rounded hover:bg-zinc-100 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => setRecordToDelete(r)}
                        className="text-xs font-medium text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2.5 py-1 rounded transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <CrudDeleteModal
        isOpen={!!recordToDelete}
        onClose={() => setRecordToDelete(null)}
        onConfirm={handleDeleteConfirm}
        record={recordToDelete}
      />
    </div>
  );
}
