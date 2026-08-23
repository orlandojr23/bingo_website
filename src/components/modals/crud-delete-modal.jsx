"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CrudDeleteModal({ isOpen, onClose, onConfirm, record }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(t);
  }, []);

  if (!isOpen || !record || !mounted) return null;

  const modalContent = (
    <div
      className="fixed inset-0 bg-zinc-900/40 backdrop-blur-xs z-[100] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl max-w-sm w-full p-5 border border-zinc-200 animate-in-fade relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-zinc-600 p-1"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-lg bg-rose-50 border border-rose-200/80 flex items-center justify-center text-rose-600 shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-900">
              Delete Record
            </h3>
            <p className="text-xs font-mono text-zinc-500">{record.id}</p>
          </div>
        </div>

        <p className="text-xs text-zinc-600 mb-4 leading-relaxed">
          Are you sure you want to permanently remove the incident report for{" "}
          <strong className="text-zinc-900 font-semibold">{record.location}</strong> ({record.barangay})? This action cannot be undone.
        </p>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="danger-solid" size="sm" onClick={onConfirm}>
            Confirm Delete
          </Button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
