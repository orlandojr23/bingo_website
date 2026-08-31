"use client";

import { Button } from "@/components/ui/button";

export default function ConfirmModal({
  open,
  title,
  description,
  confirmLabel = "Delete",
  onConfirm,
  onCancel,
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-zinc-950/40 p-4 backdrop-blur-sm animate-in-fade"
      onClick={onCancel}
    >
      <div
        className="flex w-full max-w-xs flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          <p className="mt-1 text-xs font-medium text-muted-foreground">{description}</p>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={onConfirm}
            className="border-rose-200 text-rose-600 hover:border-rose-300 hover:bg-rose-50/50 hover:text-rose-700"
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
