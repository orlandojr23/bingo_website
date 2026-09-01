"use client";

import { useState, useEffect } from "react";
import { Download, X, Share2, PlusSquare, Smartphone } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export default function InstallAppButton({ className = "" }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isIOS, setIsIOS] = useState(false);
  const [hidden, setHidden] = useState(true);
  const [showIOSModal, setShowIOSModal] = useState(false);

  useEffect(() => {
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true ||
      document.referrer.includes("android-app://");
    if (standalone) return;

    const ua = window.navigator.userAgent.toLowerCase();
    const ios =
      /iphone|ipad|ipod/.test(ua) && !ua.includes("crios") && !ua.includes("fxios");
    setIsIOS(ios);
    if (ios) {
      setHidden(false);
      return;
    }

    // The event often fires before React hydrates; the inline script in the
    // root layout caches it on window.__bingoInstallPrompt for us.
    const cached = window.__bingoInstallPrompt;
    if (cached) {
      setDeferredPrompt(cached);
      setHidden(false);
    }

    const onBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setHidden(false);
    };
    const onInstalled = () => {
      setHidden(true);
      setDeferredPrompt(null);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const handleClick = async () => {
    if (isIOS) {
      setShowIOSModal(true);
      return;
    }
    if (!deferredPrompt || typeof deferredPrompt.prompt !== "function") return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setHidden(true);
      setDeferredPrompt(null);
    }
  };

  if (hidden) return null;

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className={cn(
          "flex cursor-pointer items-center gap-1.5 rounded-full border border-emerald-200 bg-card px-3.5 py-2 text-xs font-bold text-emerald-700 shadow-xs transition-all hover:border-emerald-300 hover:bg-emerald-50 active:scale-95",
          className
        )}
      >
        <Download className="h-3.5 w-3.5" strokeWidth={2.25} />
        Install App
      </button>

      {/* iOS Add-to-Home-Screen instructions */}
      <AnimatePresence>
        {showIOSModal && (
          <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 p-4 backdrop-blur-xs sm:items-center">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-6 text-zinc-900 shadow-xl"
            >
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600">
                    <Smartphone className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="mb-1 text-base font-semibold leading-none text-zinc-900">
                      Install on iPhone
                    </h3>
                    <p className="text-xs text-zinc-500">Add to Home Screen in 2 taps</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowIOSModal(false)}
                  className="cursor-pointer rounded-full p-1 text-zinc-400 transition-colors hover:bg-zinc-100"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mb-5 space-y-3.5 rounded-2xl border border-zinc-100 bg-zinc-50 p-4 text-xs text-zinc-600">
                <div className="flex items-start gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[11px] font-bold text-emerald-800">
                    1
                  </span>
                  <div className="flex-1">
                    Tap the <strong className="font-semibold text-zinc-900">Share</strong> button
                    at the bottom of Safari:
                    <div className="mt-1 flex w-fit items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-2 py-1 font-medium text-zinc-900">
                      <Share2 className="h-3.5 w-3.5 text-emerald-600" /> Share Icon
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[11px] font-bold text-emerald-800">
                    2
                  </span>
                  <div className="flex-1">
                    Scroll down and tap{" "}
                    <strong className="font-semibold text-zinc-900">Add to Home Screen</strong>:
                    <div className="mt-1 flex w-fit items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-2 py-1 font-medium text-zinc-900">
                      <PlusSquare className="h-3.5 w-3.5 text-emerald-600" /> Add to Home Screen
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowIOSModal(false)}
                className="w-full cursor-pointer rounded-lg bg-emerald-600 py-3 text-sm font-semibold text-white transition-all hover:bg-emerald-700"
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
