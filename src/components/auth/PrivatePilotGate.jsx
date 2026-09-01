"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Lock, ShieldCheck, KeyRound, ArrowRight, CheckCircle2, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const VALID_PILOT_TOKENS = ["TEJERO2026", "BINGO2026", "PILOT-CEBU", "DEMO2026"];
const STORAGE_KEY = "bingo_private_pilot_authorized";
const STORAGE_TOKEN_NAME = "bingo_pilot_token";

function GateContent({ children }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [passcode, setPasscode] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [welcomeBanner, setWelcomeBanner] = useState(null);

  useEffect(() => {
    // 1. Check if access token is provided in the URL from email (e.g. ?access=TEJERO2026 or ?token=TEJERO2026)
    const urlAccess = searchParams.get("access") || searchParams.get("token") || searchParams.get("code");

    if (urlAccess) {
      const normalizedToken = urlAccess.trim().toUpperCase();
      if (VALID_PILOT_TOKENS.includes(normalizedToken)) {
        localStorage.setItem(STORAGE_KEY, "true");
        localStorage.setItem(STORAGE_TOKEN_NAME, normalizedToken);
        setIsAuthorized(true);
        setWelcomeBanner(`Private Access Granted: Welcome Barangay Pilot Team!`);
        
        // Clean URL query params without reloading
        const url = new URL(window.location.href);
        url.searchParams.delete("access");
        url.searchParams.delete("token");
        url.searchParams.delete("code");
        window.history.replaceState({}, "", url.pathname + url.search);

        setTimeout(() => setWelcomeBanner(null), 5000);
        setLoading(false);
        return;
      }
    }

    // 2. Check existing local storage authorization
    const savedAuth = localStorage.getItem(STORAGE_KEY);
    if (savedAuth === "true") {
      setIsAuthorized(true);
    }

    setLoading(false);
  }, [searchParams]);

  const handleUnlock = (e) => {
    e.preventDefault();
    const inputToken = passcode.trim().toUpperCase();

    if (!inputToken) {
      setErrorMsg("Please enter your barangay access code.");
      return;
    }

    if (VALID_PILOT_TOKENS.includes(inputToken)) {
      localStorage.setItem(STORAGE_KEY, "true");
      localStorage.setItem(STORAGE_TOKEN_NAME, inputToken);
      setIsAuthorized(true);
      setErrorMsg("");
      setWelcomeBanner("Access Granted — Welcome to Bin'Go Pilot!");
      setTimeout(() => setWelcomeBanner(null), 5000);
    } else {
      setErrorMsg("Invalid pilot passcode. Please check your invitation email.");
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-zinc-950 text-white font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
          <span className="text-xs text-zinc-400 font-medium">Verifying private invitation...</span>
        </div>
      </div>
    );
  }

  // If not authorized, display the Private Gate Screen
  if (!isAuthorized) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-zinc-950 px-4 py-8 text-white font-sans selection:bg-emerald-500 selection:text-white">
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 sm:p-8"
        >
          {/* Lock Header */}
          <div className="mb-6 flex flex-col items-center text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30">
              <Lock className="h-6 w-6" strokeWidth={1.75} />
            </div>
            <span className="mb-2 rounded-full bg-emerald-950 px-3 py-0.5 text-[11px] font-medium text-emerald-400 border border-emerald-800/80">
              Private Pilot Launch
            </span>
            <h1 className="text-xl sm:text-2xl font-semibold text-white tracking-tight">
              Barangay Access Required
            </h1>
            <p className="mt-1.5 text-xs text-zinc-400 leading-relaxed max-w-xs">
              This Bin&apos;Go system is currently operating under a private pilot invitation. Please enter the passcode provided in your email.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleUnlock} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5">
                Barangay Passcode
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Enter passcode (e.g. TEJERO2026)"
                  value={passcode}
                  onChange={(e) => {
                    setPasscode(e.target.value);
                    setErrorMsg("");
                  }}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 pl-10 pr-4 py-3 text-sm font-mono font-medium text-white placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none transition-colors uppercase"
                  autoFocus
                />
              </div>
              {errorMsg && (
                <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-rose-400">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  {errorMsg}
                </p>
              )}
            </div>

            <button
              type="submit"
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 py-3 text-sm font-semibold text-white hover:bg-emerald-500 transition-all active:scale-[0.98] cursor-pointer"
            >
              Unlock Private App <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
            </button>
          </form>

          {/* Email Hint Notice */}
          <div className="mt-6 border-t border-zinc-800 pt-4 text-center">
            <p className="text-[11px] text-zinc-500 leading-normal">
              Need access? Ask your Barangay Sanitation Officer for your direct email invitation link.
            </p>
            <div className="mt-2 inline-flex items-center gap-1 text-[10px] text-zinc-400 font-mono bg-zinc-950 px-2.5 py-1 rounded-lg border border-zinc-800">
              <span>Demo Passcode: </span>
              <button
                type="button"
                onClick={() => setPasscode("TEJERO2026")}
                className="text-emerald-400 font-bold hover:underline cursor-pointer"
              >
                TEJERO2026
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // Render children when authorized
  return (
    <>
      {welcomeBanner && (
        <div className="fixed top-2 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 rounded-full border border-emerald-500/40 bg-zinc-900/95 px-4 py-2 text-xs font-bold text-emerald-400 shadow-2xl backdrop-blur-md">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>{welcomeBanner}</span>
        </div>
      )}
      {children}
    </>
  );
}

export default function PrivatePilotGate({ children }) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen w-full items-center justify-center bg-zinc-950 text-white font-sans">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent" />
            <span className="text-xs text-zinc-400 font-medium">Loading private portal...</span>
          </div>
        </div>
      }
    >
      <GateContent>{children}</GateContent>
    </Suspense>
  );
}
