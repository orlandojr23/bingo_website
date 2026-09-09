"use client";

import { useState } from "react";
import { Check, ShieldCheck, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

export default function ModernRobotCheckbox({ onVerify, isVerified, errorMsg }) {
  const [checking, setChecking] = useState(false);

  const handleClick = () => {
    if (isVerified || checking) return;
    setChecking(true);
    setTimeout(() => {
      setChecking(false);
      onVerify(true);
    }, 650);
  };

  return (
    <div className="w-full flex flex-col items-center">
      <div
        onClick={handleClick}
        className={`w-full max-w-sm flex items-center justify-between px-4 py-3.5 rounded-2xl border transition-all select-none cursor-pointer touch-manipulation shadow-xs ${
          isVerified
            ? "border-emerald-300 bg-emerald-50/70"
            : errorMsg
            ? "border-rose-300 bg-rose-50/40"
            : "border-zinc-200 bg-zinc-50/90 hover:bg-zinc-100/80 hover:border-zinc-300"
        }`}
      >
        <div className="flex items-center gap-3">
          {/* Custom Checkbox Button */}
          <div
            className={`flex h-7 w-7 items-center justify-center rounded-lg border-2 transition-all ${
              isVerified
                ? "border-emerald-600 bg-emerald-600 text-white shadow-xs"
                : checking
                ? "border-emerald-500 bg-white"
                : "border-zinc-300 bg-white"
            }`}
          >
            {checking ? (
              <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
            ) : isVerified ? (
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                <Check className="w-4 h-4 stroke-[3]" />
              </motion.div>
            ) : null}
          </div>

          <span className="text-xs sm:text-sm font-semibold text-zinc-700">
            I&apos;m not a robot
          </span>
        </div>

        <div className="flex flex-col items-end opacity-70">
          <div className="flex items-center gap-1 text-[#059669]">
            <ShieldCheck className="w-4 h-4" />
            <span className="text-[10px] font-black tracking-wider uppercase">Bin&apos;Go Shield</span>
          </div>
          <span className="text-[9px] text-zinc-400 font-medium">Privacy & Terms</span>
        </div>
      </div>

      {errorMsg && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xs font-semibold text-rose-500 mt-1.5"
        >
          {errorMsg}
        </motion.p>
      )}
    </div>
  );
}
