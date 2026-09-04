"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CrudDeleteModal({ isOpen, onClose, onConfirm, record, mode = "soft" }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(t);
  }, []);

  if (!isOpen || !record || !mounted) return null;

  const modalContent = (
    <div
      className="fixed inset-0 bg-zinc-950/40 backdrop-blur-xs z-[100] flex items-center justify-center p-4 animate-in-fade"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-xl max-w-sm w-full p-5 border border-border relative shadow-none"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground p-1.5 transition-colors cursor-pointer"
          aria-label="Close dialog"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex flex-col gap-1 mb-3">
          <h3 className="text-sm font-semibold text-foreground">
            {mode === "hard" ? "Permanently Delete Record" : "Delete Record"}
          </h3>
          <span className="text-xs font-mono font-medium text-muted-foreground">
            {record.id}
          </span>
        </div>

        <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
          {mode === "hard" 
            ? <>Are you sure you want to permanently delete the report for <strong className="text-foreground font-semibold">{record.location}</strong> ({record.barangay})? This action cannot be undone.</>
            : <>Are you sure you want to move the report for <strong className="text-foreground font-semibold">{record.location}</strong> ({record.barangay}) to the trash bin?</>
          }
        </p>

        <div className="flex items-center justify-end gap-2 pt-3.5 border-t border-border-subtle mt-2">
          <Button variant="ghost" size="sm" onClick={onClose}>
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
