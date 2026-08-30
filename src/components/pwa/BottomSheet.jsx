"use client";

import { useEffect } from "react";
import { AnimatePresence, motion, useDragControls } from "framer-motion";

export default function BottomSheet({ open, onClose, title, children }) {
  const dragControls = useDragControls();

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="sheet-scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-[60] bg-black/40"
          />
          <motion.div
            key="sheet-panel"
            role="dialog"
            aria-modal="true"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            drag="y"
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 100 || info.velocity.y > 500) onClose();
            }}
            className="fixed inset-x-0 bottom-0 z-[61] mx-auto flex max-h-[85dvh] w-full max-w-lg flex-col rounded-t-2xl border-t border-border bg-card pb-safe shadow-xl"
          >
            <button
              type="button"
              aria-label="Dismiss"
              onClick={onClose}
              onPointerDown={(e) => dragControls.start(e)}
              className="flex cursor-pointer touch-none select-none flex-col items-center pb-1 pt-2.5 group"
            >
              <span className="h-1.5 w-10 rounded-full bg-muted-foreground/30 group-hover:bg-muted-foreground/60 transition-colors" />
            </button>
            {title && (
              <div className="px-5 pb-1 pt-2 text-sm font-semibold text-foreground">
                {title}
              </div>
            )}
            <div className="overflow-y-auto overscroll-contain p-5 pt-3">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
