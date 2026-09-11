"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

const ONBOARDING_STEPS = [
  {
    id: "welcome",
    mascot: "/mascot/arms-open-pose-clean.png",
    title: "Welcome to Bin'Go",
    subtitle: "Your personal companion that helps you track waste collection in real-time.",
  },
  {
    id: "tracking",
    mascot: "/mascot/pointing-pose.png",
    title: "Track Trucks Live",
    subtitle: "Watch garbage trucks navigate routes on the live map and know exactly when they reach your sitio.",
  },
  {
    id: "alerts",
    mascot: "/mascot/coffee-pose.png",
    title: "Never Miss a Pickup",
    subtitle: "Relax with your morning coffee! Get real-time updates when waste collection is approaching your area.",
  },
  {
    id: "get-started",
    mascot: "/mascot/arms-open-pose-clean.png",
    title: "Report & Stay Informed",
    subtitle: "Submit collection tickets, view schedules, and keep your neighborhood clean.",
  },
];

export default function OnboardingModal({ isOpen, onComplete }) {
  const [[currentStep, direction], setStepState] = useState([0, 1]);

  if (!isOpen) return null;

  const isLastStep = currentStep === ONBOARDING_STEPS.length - 1;
  const stepData = ONBOARDING_STEPS[currentStep];

  const goToStep = (newStep) => {
    const dir = newStep > currentStep ? 1 : -1;
    setStepState([newStep, dir]);
  };

  const handleNext = () => {
    if (isLastStep) {
      onComplete();
    } else {
      goToStep(currentStep + 1);
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  // Clean, crisp opacity fade transition for steps
  const stepVariants = {
    enter: { opacity: 0 },
    center: {
      opacity: 1,
      transition: { duration: 0.3, ease: "easeOut" },
    },
    exit: {
      opacity: 0,
      transition: { duration: 0.2, ease: "easeIn" },
    },
  };

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
        {/* Subtle Dark Scrim Overlay for optimal contrast */}
        <div className="absolute inset-0 bg-[#04170e]/60 bg-gradient-to-b from-[#09291b]/70 via-[#04170e]/50 to-[#04170e] backdrop-blur-[0.5px] pointer-events-none" />

        {/* Soft Ambient Radial Glow behind Mascot */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 sm:w-96 sm:h-96 bg-emerald-400/15 rounded-full blur-3xl pointer-events-none" />

        {/* Header Bar: Minimalist Step Counter & Skip Button */}
        <div className="relative z-10 flex items-center justify-between w-full max-w-md mx-auto h-10">
          {/* Step Indicator */}
          <div className="flex items-center gap-1">
            <span className="text-xs font-semibold text-white/50 tracking-wide">
              <span className="text-emerald-400 font-bold">{currentStep + 1}</span>
              <span className="mx-1 text-white/40 font-normal">of</span>
              <span className="text-white/70">{ONBOARDING_STEPS.length}</span>
              <span className="ml-1 text-white/40 font-normal">steps</span>
            </span>
          </div>

          {/* Skip Button */}
          {!isLastStep && (
            <button
              type="button"
              onClick={handleSkip}
              className="text-xs font-medium text-white/60 hover:text-white transition-colors cursor-pointer py-1 px-2"
            >
              Skip
            </button>
          )}
        </div>

        {/* Main Content Carousel Area */}
        <div className="relative z-10 my-auto flex flex-col items-center justify-center w-full max-w-md mx-auto space-y-6 sm:space-y-8 py-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={stepData.id}
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="flex flex-col items-center text-center w-full"
            >
              {/* Mascot Pose Display (Clean & Stable) */}
              <div className="relative w-52 h-52 xs:w-60 xs:h-60 sm:w-72 sm:h-72 max-h-[38vh] aspect-square flex items-center justify-center mb-6 sm:mb-8">
                <div className="w-full h-full relative drop-shadow-2xl">
                  <Image
                    src={stepData.mascot}
                    alt={stepData.title}
                    fill
                    priority
                    className="object-contain"
                  />
                </div>
              </div>

              {/* Typography */}
              <div className="px-2 max-w-xs sm:max-w-sm">
                <h1
                  className="text-3xl xs:text-4xl sm:text-5xl font-extrabold tracking-tight text-white drop-shadow-md leading-tight"
                  style={{ fontFamily: "var(--font-fredoka), sans-serif" }}
                >
                  {stepData.title}
                </h1>
                <p className="mt-3 text-sm xs:text-base sm:text-lg text-emerald-100/90 font-medium leading-relaxed">
                  {stepData.subtitle}
                </p>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Bottom Action Area: Pagination Dots & Action Button */}
        <div className="relative z-10 w-full max-w-xs sm:max-w-sm mx-auto space-y-5 pt-2">
          {/* Pagination Indicators */}
          <div className="flex items-center justify-center gap-2">
            {ONBOARDING_STEPS.map((step, idx) => (
              <button
                key={step.id}
                type="button"
                onClick={() => goToStep(idx)}
                aria-label={`Go to step ${idx + 1}`}
                className={`h-2.5 rounded-full transition-all duration-300 cursor-pointer ${
                  currentStep === idx
                    ? "w-8 bg-emerald-500 shadow-xs shadow-emerald-500/50"
                    : "w-2.5 bg-white/25 hover:bg-white/40"
                }`}
              />
            ))}
          </div>

          {/* Action Button */}
          <button
            type="button"
            onClick={handleNext}
            className="w-full py-3.5 sm:py-4 px-6 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.98] text-white font-semibold rounded-2xl text-base sm:text-lg transition-all duration-200 cursor-pointer shadow-md shadow-emerald-950/40 flex items-center justify-center gap-2"
          >
            <span>{isLastStep ? "Let's get started" : "Continue"}</span>
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}


