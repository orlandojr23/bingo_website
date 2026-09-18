"use client";

import { Loader2 } from "lucide-react";

export default function ConfirmModal({
  open,
  title,
  description,
  confirmLabel = "Delete",
  onConfirm,
  onCancel,
  isBusy = false,
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40 p-4"
      onClick={() => { if (!isBusy) onCancel?.(); }}
    >
      <div
        className="w-full max-w-[270px] overflow-hidden rounded-[14px] bg-white text-center shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 pb-4 pt-5">
          <h3 className="text-[17px] font-semibold tracking-tight text-zinc-900">{title}</h3>
          {description && (
            <p className="mt-1 text-[13px] leading-normal text-zinc-600">{description}</p>
          )}
        </div>
        <div className="flex divide-x divide-black/10 border-t border-black/10">
          <button
            type="button"
            onClick={onCancel}
            disabled={isBusy}
            className="h-11 flex-1 text-[17px] text-zinc-800 transition-colors active:bg-black/5 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isBusy}
            className="flex h-11 flex-1 items-center justify-center gap-1.5 text-[17px] font-semibold text-rose-600 transition-colors active:bg-black/5 cursor-pointer disabled:pointer-events-none"
          >
            {isBusy ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              confirmLabel
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
