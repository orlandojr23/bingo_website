"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Lock, Eye, EyeOff, Loader2, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import InstallAppButton from "@/components/pwa/InstallAppButton";

const PUBLIC_DOMAINS = ["gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "icloud.com"];

const validateEmail = (emailStr) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailStr);

const getEmailSuggestionSuffix = (emailVal, domains = PUBLIC_DOMAINS) => {
  if (!emailVal || emailVal.includes(" ")) return "";
  if (!emailVal.includes("@")) {
    return "@" + domains[0];
  }
  const [prefix, domainPart] = emailVal.split("@");
  if (!prefix) return "";
  if (!domainPart) {
    return domains[0];
  }
  const match = domains.find((d) => d.startsWith(domainPart.toLowerCase()));
  if (match) {
    return match.slice(domainPart.length);
  }
  return "";
};

const nameFromEmail = (email) => {
  const local = email.split("@")[0] || "Resident";
  const token = local.split(/[._\-+]/)[0] || "Resident";
  return token.charAt(0).toUpperCase() + token.slice(1);
};

const fieldClass = (hasError) =>
  `w-full rounded-xl border bg-card pl-10 pr-4 py-3 text-sm font-medium text-foreground placeholder:text-muted-foreground/50 outline-none transition-colors ${
    hasError
      ? "border-rose-300 focus:border-rose-400"
      : "border-border hover:border-zinc-300 focus:border-zinc-400"
  }`;

export default function ResidentLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [needsOtp, setNeedsOtp] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState("");
  const [isResending, setIsResending] = useState(false);
  const [resendStatus, setResendStatus] = useState("");
  const [resendTimer, setResendTimer] = useState(60);

  const emailSuggestionSuffix = getEmailSuggestionSuffix(email);

  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      window.location.href = '/report';
    }
  }, [user]);

  useEffect(() => {
    let interval = null;
    if (needsOtp && resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [needsOtp, resendTimer]);

  useEffect(() => {
    if (resendStatus) {
      const timer = setTimeout(() => {
        setResendStatus("");
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [resendStatus]);

  const handleFieldChange = (field, value, setter) => {
    setter(value);
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleEmailKeyDown = (e) => {
    if ((e.key === "Tab" || e.key === "ArrowRight") && emailSuggestionSuffix) {
      if (e.key === "ArrowRight" && e.target.selectionStart !== email.length) {
        return;
      }
      e.preventDefault();
      handleFieldChange("email", e.target.value + emailSuggestionSuffix, setEmail);
    }
  };

  const handleResendOtp = async () => {
    if (resendTimer > 0 || isResending) return;
    setIsResending(true);
    setResendStatus("");
    setOtpError("");
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email.trim().toLowerCase(),
    });
    setIsResending(false);
    if (error) {
      setOtpError(error.message);
    } else {
      setResendStatus("A new 6-digit code has been sent to your email.");
      setResendTimer(60);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    const newErrors = {};
    if (!email.trim()) {
      newErrors.email = "Please enter your email address.";
    } else if (!validateEmail(email)) {
      newErrors.email = "Please enter a valid email address.";
    }
    if (!password) {
      newErrors.password = "Please enter your password.";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setIsLoading(true);

    try {
      const targetEmail = email.trim().toLowerCase();
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: targetEmail,
        password,
      });

      if (signInError) {
        if (signInError.message.toLowerCase().includes("not confirmed")) {
          setResendTimer(60);
          setNeedsOtp(true);
          setIsLoading(false);
          setResendStatus("A new 6-digit verification code has been automatically sent to your email.");
          // Automatically dispatch a fresh OTP email for unconfirmed accounts
          supabase.auth.resend({
            type: 'signup',
            email: targetEmail,
          }).catch(() => {});
          return;
        }
        setErrors({ password: signInError.message });
        setIsLoading(false);
        return;
      }
      window.location.href = "/report";
    } catch (err) {
      console.error("Login exception:", err);
      setErrors({ password: err?.message || "Connection error. Please try again." });
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (otp.length < 6) {
      setOtpError("Please enter the 6-digit verification code.");
      return;
    }
    setOtpError("");
    setIsLoading(true);

    const { error } = await supabase.auth.verifyOtp({
      email: email.trim().toLowerCase(),
      token: otp,
      type: 'signup'
    });

    if (error) {
      setOtpError(error.message);
      setIsLoading(false);
      return;
    }

    window.location.href = "/report";
  };

  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      <InstallAppButton className="absolute right-4 top-4 z-20" />
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-12">
        <div className="mb-10 flex flex-col items-center text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-green-v2.png"
            alt="Bin'Go Logo"
            className="h-32 w-32 object-contain"
          />
          {needsOtp ? (
            <>
              <h1 className="mt-5 text-2xl font-black tracking-tight text-foreground">
                Verify your email
              </h1>
              <p className="mt-1.5 text-sm font-medium text-muted-foreground">
                Enter the 6-digit code sent to <span className="font-semibold text-foreground">{email}</span>
              </p>
            </>
          ) : (
            <>
              <h1 className="mt-5 text-2xl font-black tracking-tight text-foreground">
                Welcome back!
              </h1>
              <p className="mt-1.5 text-sm font-medium text-muted-foreground">
                Sign in to continue to Bin&apos;Go
              </p>
            </>
          )}
        </div>

        {needsOtp ? (
          <form className="flex flex-col gap-4" onSubmit={handleVerifyOtp} noValidate>
            <AnimatePresence>
              {resendStatus && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.98 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="flex items-center justify-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3.5 py-2.5 text-center text-xs font-medium text-emerald-600 dark:text-emerald-400 backdrop-blur-sm"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                  <span>{resendStatus}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex flex-col gap-1.5">
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
                autoComplete="one-time-code"
                className="w-full rounded-xl border border-border bg-card px-3 py-4 text-center text-3xl font-bold tracking-[0.2em] text-foreground outline-none transition-colors focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                placeholder="000000"
              />
              <AnimatePresence initial={false}>
                {otpError && (
                  <motion.p
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    className="overflow-hidden text-xs font-medium text-rose-500 text-center"
                  >
                    {otpError}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            <Button
              variant="primary"
              size="lg"
              type="submit"
              disabled={isLoading || otp.length < 6}
              className="mt-2 w-full py-3.5"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Verifying...</span>
                </>
              ) : (
                "Verify Code"
              )}
            </Button>

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={isResending || resendTimer > 0}
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 disabled:text-muted-foreground/60 disabled:cursor-not-allowed transition-colors"
              >
                {isResending
                  ? "Sending code..."
                  : resendTimer > 0
                  ? `Resend Code (${resendTimer}s)`
                  : "Resend Code"}
              </button>
              <button
                type="button"
                onClick={() => setNeedsOtp(false)}
                className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Back to Sign In
              </button>
            </div>
          </form>
        ) : (
          <form className="flex flex-col gap-4" onSubmit={handleLogin} noValidate>
            <div className="flex flex-col gap-1.5">
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground/70">
                  <Mail className="h-4 w-4" />
                </div>
                {emailSuggestionSuffix && (
                  <div
                    className="pointer-events-none absolute inset-0 z-10 flex items-center overflow-hidden whitespace-pre pl-10 pr-4 text-sm font-medium"
                    aria-hidden="true"
                  >
                    <span className="opacity-0">{email}</span>
                    <span className="select-none text-muted-foreground/40">{emailSuggestionSuffix}</span>
                  </div>
                )}
                <input
                  type="email"
                  value={email}
                  onChange={(e) => handleFieldChange("email", e.target.value.replace(/\s/g, ""), setEmail)}
                  onKeyDown={handleEmailKeyDown}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  maxLength={254}
                  autoComplete="email"
                  className={fieldClass(!!errors.email)}
                  placeholder="you@gmail.com"
                />
              </div>
              <AnimatePresence initial={false}>
                {errors.email && (
                  <motion.p
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    className="overflow-hidden text-xs font-medium text-rose-500"
                  >
                    {errors.email}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground/70">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => handleFieldChange("password", e.target.value.replace(/\s/g, ""), setPassword)}
                  maxLength={64}
                  autoComplete="current-password"
                  className={fieldClass(!!errors.password) + " pr-11"}
                  placeholder="Your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-muted-foreground/70 transition-colors hover:text-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </button>
              </div>
              <AnimatePresence initial={false}>
                {errors.password && (
                  <motion.p
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    className="overflow-hidden text-xs font-medium text-rose-500"
                  >
                    {errors.password}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            <div className="flex justify-end">
              <Link
                href="/forgot-password"
                className="text-xs font-semibold text-emerald-600 transition-colors hover:text-emerald-700"
              >
                Forgot Password?
              </Link>
            </div>

            <Button
              variant="primary"
              size="lg"
              type="submit"
              disabled={isLoading}
              className="mt-2 w-full py-3.5"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>
        )}

        <p className="mt-6 text-center text-xs font-medium text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link
            href="/signup"
            className="font-semibold text-emerald-600 transition-colors hover:text-emerald-700"
          >
            Sign Up
          </Link>
        </p>

        <p className="mt-3 text-center text-xs font-medium text-muted-foreground">
          Are you a barangay driver?{" "}
          <Link
            href="/driver-login"
            className="font-semibold text-emerald-600 transition-colors hover:text-emerald-700"
          >
            Driver Sign In
          </Link>
        </p>
      </div>

      <p className="pb-6 text-center text-xs font-medium text-muted-foreground/60">
        Bin&apos;Go &middot; Smart Waste Collection, Simplified
      </p>
    </div>
  );
}
