"use client";

import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

export default function OnboardingModal({ isOpen, onComplete }) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[999] flex h-dvh min-h-screen w-full flex-col justify-between overflow-y-auto bg-[#04170e] bg-[url('/onboarding-bg.jpg')] bg-cover bg-center bg-no-repeat text-white px-6 py-8 sm:p-10 select-none"
        style={{
          paddingTop: "calc(2rem + env(safe-area-inset-top, 0px))",
          paddingBottom: "calc(2rem + env(safe-area-inset-bottom, 0px))",
        }}
      >
        {/* Subtle Dark Scrim Overlay for optimal contrast & legibility */}
        <div className="absolute inset-0 bg-[#04170e]/60 bg-gradient-to-b from-[#09291b]/70 via-[#04170e]/50 to-[#04170e] backdrop-blur-[0.5px] pointer-events-none" />

        {/* Soft Ambient Radial Glow behind Mascot */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 sm:w-96 sm:h-96 bg-emerald-400/15 rounded-full blur-3xl pointer-events-none" />

        {/* Content Wrapper for perfect vertical alignment */}
        <div className="relative z-10 my-auto flex flex-col items-center justify-center w-full max-w-md mx-auto space-y-6 sm:space-y-8">
          
          {/* Mascot Container */}
          <motion.div
            initial={{ y: 20, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-52 h-52 xs:w-60 xs:h-60 sm:w-72 sm:h-72 max-h-[40vh] aspect-square flex items-center justify-center"
          >
            <div className="w-full h-full relative drop-shadow-2xl">
              <Image
                src="/mascot/arms-open-pose-clean.png"
                alt="Bin'Go Mascot"
                fill
                priority
                className="object-contain"
              />
            </div>
          </motion.div>

          {/* Typography */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.45 }}
            className="text-center px-2"
          >
            <h1
              className="text-4xl xs:text-5xl sm:text-6xl font-extrabold tracking-tight text-white drop-shadow-md"
              style={{ fontFamily: "var(--font-fredoka), sans-serif" }}
            >
              Bin&apos;Go
            </h1>
            <p className="mt-3 text-sm xs:text-base sm:text-lg text-emerald-100/90 font-medium leading-relaxed max-w-xs sm:max-w-sm mx-auto">
              Your personal companion that helps you track waste collection in real-time.
            </p>
          </motion.div>
        </div>

        {/* Bottom Action Area */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.45 }}
          className="relative z-10 w-full max-w-xs sm:max-w-sm mx-auto pt-4"
        >
          <button
            type="button"
            onClick={onComplete}
            className="w-full py-3.5 sm:py-4 px-6 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white font-semibold rounded-2xl text-base sm:text-lg transition-all duration-200 cursor-pointer shadow-md shadow-emerald-950/40"
          >
            Let&apos;s get started
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
