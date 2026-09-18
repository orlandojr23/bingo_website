"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

export function useToast() {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef(new Map());
  const idRef = useRef(0);

  useEffect(() => {
    const timers = timersRef.current;
    return () => timers.forEach((t) => clearTimeout(t));
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    if (timersRef.current.has(id)) {
      clearTimeout(timersRef.current.get(id));
      timersRef.current.delete(id);
    }
  }, []);

  const toast = useCallback((message, { variant = "success", duration = 2800 } = {}) => {
    const id = ++idRef.current;
    // Keep max 1 active toast so notifications never stack or obstruct the screen
    setToasts([{ id, message, variant }]);

    // Clear ALL previous timers so rapid-fire toasts never leave orphaned dismissals
    timersRef.current.forEach((timer) => clearTimeout(timer));
    timersRef.current.clear();

    timersRef.current.set(
      id,
      setTimeout(() => {
        dismissToast(id);
      }, duration)
    );
  }, [dismissToast]);

  const ToastViewport = (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] inset-x-0 z-[110] flex flex-col items-center gap-1.5 px-6"
    >
      <AnimatePresence mode="wait">
        {toasts.map((t) => {
          return (
            <motion.div
              key={t.id}
              initial={{ y: 16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 8, opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              onClick={() => dismissToast(t.id)}
              className="pointer-events-auto max-w-sm rounded-[10px] bg-zinc-900 px-4 py-3 text-center text-[13px] leading-snug text-white shadow-lg cursor-pointer select-none"
              title="Tap to dismiss"
            >
              {t.message}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );

  return { toast, ToastViewport };
}
