"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Loader2 } from "lucide-react";

export default function CrudDeleteModal({ isOpen, onClose, onConfirm, record, mode = "soft", isBusy = false }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(t);
  }, []);

  if (!isOpen || !record || !mounted) return null;

  const modalContent = (
    <div
      className="fixed inset-0 bg-black/40 z-[100] flex items-center justify-center p-4"
      onClick={() => { if (!isBusy) onClose?.(); }}
    >
      <div
        className="w-full max-w-[270px] overflow-hidden rounded-[14px] bg-white text-center shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 pb-4 pt-5">
          <h3 className="text-[17px] font-semibold tracking-tight text-zinc-900">
            {mode === "hard" ? "Permanently Delete Record" : "Delete Record"}
          </h3>
          <p className="mt-1 text-[13px] leading-normal text-zinc-600">
            {mode === "hard"
              ? <>Permanently delete the report for <strong className="font-semibold">{record.location}</strong>? This cannot be undone.</>
              : <>Move the report for <strong className="font-semibold">{record.location}</strong> to the trash bin?</>
            }
          </p>
        </div>
        <div className="flex divide-x divide-black/10 border-t border-black/10">
          <button
            type="button"
            onClick={onClose}
            disabled={isBusy}
            className="h-11 flex-1 text-[17px] text-zinc-800 transition-colors active:bg-black/5 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isBusy}
            className="flex h-11 flex-1 items-center justify-center text-[17px] font-semibold text-rose-600 transition-colors active:bg-black/5 cursor-pointer disabled:pointer-events-none"
          >
            {isBusy ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              "Delete"
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
