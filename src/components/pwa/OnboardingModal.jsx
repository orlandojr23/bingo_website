"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

const ONBOARDING_STEPS = [
  {
    id: "welcome",
    mascot: "/mascot/arms-open-pose-clean.png",
    title: "Welcome to Bin'Go",
    subtitle: "Track collection trucks live, report uncollected waste, and keep your community clean.",
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
        className="fixed inset-0 z-[999] flex h-dvh min-h-screen w-full flex-col justify-between overflow-y-auto bg-background text-foreground px-6 py-8 sm:p-10 select-none"
        style={{
          paddingTop: "calc(1rem + env(safe-area-inset-top, 0px))",
          paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom, 0px))",
        }}
      >
        {/* Header Bar: Step Counter & Skip Button */}
        <div className="relative z-10 flex items-center justify-between w-full max-w-md mx-auto h-10">
          {/* Step Indicator */}
          <div className="flex items-center gap-1">
            <span className="text-[13px] text-muted-foreground">
              <span className="font-semibold text-emerald-600">{currentStep + 1}</span>
              <span className="mx-1">of</span>
              <span>{ONBOARDING_STEPS.length}</span>
            </span>
          </div>

          {/* Skip Button */}
          {!isLastStep && (
            <button
              type="button"
              onClick={handleSkip}
              className="text-[15px] text-muted-foreground transition-colors active:text-foreground cursor-pointer py-1 px-2"
            >
              Skip
            </button>
          )}
        </div>

        {/* Main Content Carousel Area */}
        <div className="relative z-10 my-auto flex flex-col items-center justify-center w-full max-w-md mx-auto space-y-6 py-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={stepData.id}
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              className="flex flex-col items-center text-center w-full"
            >
              {/* Mascot Pose Display */}
              <div className="relative w-40 h-40 sm:w-48 sm:h-48 max-h-[30vh] aspect-square flex items-center justify-center mb-6">
                <div className="w-full h-full relative">
                  <img
                    src={stepData.mascot}
                    alt={stepData.title}
                    fetchPriority="high"
                    loading="eager"
                    className="object-contain w-full h-full"
                  />
                </div>
              </div>

              {/* Typography */}
              <div className="px-2 max-w-xs sm:max-w-sm">
                <h1 className="text-[22px] font-semibold tracking-tight text-foreground leading-tight">
                  {stepData.title}
                </h1>
                <p className="mt-1.5 text-[14px] text-muted-foreground leading-normal">
                  {stepData.subtitle}
                </p>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Bottom Action Area: Pagination Dots & Action Button */}
        <div className="relative z-10 w-full max-w-xs sm:max-w-sm mx-auto space-y-5 pt-2">
          {/* Pagination Indicators */}
          <div className="flex items-center justify-center gap-1.5">
            {ONBOARDING_STEPS.map((step, idx) => (
              <button
                key={step.id}
                type="button"
                onClick={() => goToStep(idx)}
                aria-label={`Go to step ${idx + 1}`}
                className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                  currentStep === idx
                    ? "w-6 bg-emerald-600"
                    : "w-2 bg-zinc-300"
                }`}
              />
            ))}
          </div>

          {/* Action Button */}
          <button
            type="button"
            onClick={handleNext}
            className="w-full h-[50px] px-6 bg-emerald-600 active:bg-emerald-700 active:scale-[0.99] text-white rounded-2xl text-[17px] font-semibold transition-all duration-200 cursor-pointer flex items-center justify-center gap-2"
          >
            <span>{isLastStep ? "Let's get started" : "Continue"}</span>
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
