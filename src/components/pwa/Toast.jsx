"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, AlertTriangle, AlertCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";

const ICONS = {
  success: CheckCircle2,
  warning: AlertTriangle,
  error: AlertCircle,
};

const ICON_COLORS = {
  success: "text-emerald-400",
  warning: "text-amber-400",
  error: "text-rose-400",
};

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
      className="pointer-events-none fixed top-[84px] inset-x-0 z-[70] flex flex-col items-center gap-1.5 px-4"
    >
      <AnimatePresence mode="wait">
        {toasts.map((t) => {
          const Icon = ICONS[t.variant] || CheckCircle2;
          return (
            <motion.div
              key={t.id}
              initial={{ y: -12, opacity: 0, scale: 0.96 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: -10, opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              onClick={() => dismissToast(t.id)}
              className="pointer-events-auto flex max-w-sm items-center gap-2 rounded-full border border-zinc-700/60 bg-zinc-950/90 px-3.5 py-1.5 text-xs font-semibold text-zinc-100 shadow-md backdrop-blur-md transition-all hover:bg-zinc-900 active:scale-95 cursor-pointer select-none"
              title="Tap to dismiss"
            >
              <Icon className={cn("h-3.5 w-3.5 shrink-0", ICON_COLORS[t.variant])} />
              <span className="truncate max-w-[260px] leading-tight">{t.message}</span>
              <X className="h-3 w-3 shrink-0 text-zinc-400 hover:text-zinc-200 ml-0.5" />
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );

  return { toast, ToastViewport };
}
