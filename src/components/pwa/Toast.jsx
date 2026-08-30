"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, AlertTriangle, AlertCircle } from "lucide-react";
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

  const toast = useCallback((message, { variant = "success" } = {}) => {
    const id = ++idRef.current;
    setToasts((prev) => [...prev.slice(-2), { id, message, variant }]);
    timersRef.current.set(
      id,
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
        timersRef.current.delete(id);
      }, 3000)
    );
  }, []);

  const ToastViewport = (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-[70] flex flex-col items-center gap-2 px-4"
    >
      <AnimatePresence>
        {toasts.map((t) => {
          const Icon = ICONS[t.variant] || CheckCircle2;
          return (
            <motion.div
              key={t.id}
              initial={{ y: 16, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 8, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="pointer-events-auto flex max-w-sm items-center gap-2.5 rounded-lg border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-xs font-medium text-white shadow-lg"
            >
              <Icon className={cn("h-4 w-4 shrink-0", ICON_COLORS[t.variant])} />
              <span>{t.message}</span>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );

  return { toast, ToastViewport };
}
