"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Download, X, Share2, PlusSquare, Smartphone } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export default function PWAInstallPrompt() {
  const pathname = usePathname();
  const isAppShell = pathname === "/report" || pathname === "/driver";
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(true); // default true to prevent flash
  const [isVisible, setIsVisible] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);

  useEffect(() => {
    // Check if already installed / running in standalone mode
    const checkStandalone = () => {
      const isStandaloneMode =
        window.matchMedia("(display-mode: standalone)").matches ||
        window.navigator.standalone === true ||
        document.referrer.includes("android-app://");
      setIsStandalone(isStandaloneMode);
      return isStandaloneMode;
    };

    if (checkStandalone()) return;

    // Check if previously dismissed in this session
    const isDismissed = sessionStorage.getItem("bingo_pwa_dismissed");
    if (isDismissed) return;

    // Check iOS Safari
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice =
      /iphone|ipad|ipod/.test(userAgent) &&
      !window.MSStream &&
      !userAgent.includes("crios") &&
      !userAgent.includes("fxios");
    setIsIOS(isIosDevice);

    if (isIosDevice) {
      // Show prompt after a small delay for iOS users
      const timer = setTimeout(() => setIsVisible(true), 2500);
      return () => clearTimeout(timer);
    }

    // Android & Chromium browsers
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsVisible(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSModal(true);
      return;
    }

    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setIsVisible(false);
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setIsVisible(false);
    sessionStorage.setItem("bingo_pwa_dismissed", "true");
  };

  if (isStandalone || !isVisible) return null;

  return (
    <>
      <AnimatePresence>
        <motion.aside
          aria-label="App installation banner"
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: "spring", stiffness: 350, damping: 30 }}
          className={cn(
            "fixed left-4 right-4 z-50 mx-auto max-w-md",
            isAppShell
              ? "bottom-[calc(5.25rem+env(safe-area-inset-bottom))]"
              : "bottom-4"
          )}
        >
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-500/20 bg-zinc-900/95 p-3.5 text-white shadow-xl backdrop-blur-md">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-600">
                <Smartphone className="h-5 w-5 text-white" strokeWidth={1.75} />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-zinc-100">Install Bin&apos;Go App</span>
                <span className="text-[11px] text-zinc-400">Instant alerts &amp; live GPS truck tracking</span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleInstallClick}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white transition-all hover:bg-emerald-500 active:scale-95 cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" />
                Install
              </button>
              <button
                type="button"
                onClick={handleDismiss}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors cursor-pointer"
                title="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </motion.aside>
      </AnimatePresence>

      {/* iOS Instructions Modal */}
      <AnimatePresence>
        {showIOSModal && (
          <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-6 shadow-xl text-zinc-900"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="h-9 w-9 rounded-xl bg-emerald-600 flex items-center justify-center">
                    <Smartphone className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-zinc-900 leading-none mb-1">Install on iPhone</h3>
                    <p className="text-xs text-zinc-500">Add to Home Screen in 2 taps</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowIOSModal(false)}
                  className="rounded-full p-1 text-zinc-400 hover:bg-zinc-100 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-3.5 text-xs text-zinc-600 bg-zinc-50 rounded-2xl p-4 border border-zinc-100 mb-5">
                <div className="flex items-start gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                    1
                  </span>
                  <div className="flex-1">
                    Tap the <strong className="font-semibold text-zinc-900">Share</strong> button at the bottom of Safari:
                    <div className="mt-1 flex items-center gap-1.5 text-zinc-900 font-medium bg-white px-2 py-1 rounded-md border border-zinc-200 w-fit">
                      <Share2 className="h-3.5 w-3.5 text-emerald-600" /> Share Icon
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                    2
                  </span>
                  <div className="flex-1">
                    Scroll down and tap <strong className="font-semibold text-zinc-900">Add to Home Screen</strong>:
                    <div className="mt-1 flex items-center gap-1.5 text-zinc-900 font-medium bg-white px-2 py-1 rounded-md border border-zinc-200 w-fit">
                      <PlusSquare className="h-3.5 w-3.5 text-emerald-600" /> Add to Home Screen
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowIOSModal(false)}
                className="w-full rounded-lg bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-700 transition-all cursor-pointer"
              >
                Got It
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
