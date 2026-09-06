"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, Mail, Lock, Eye, EyeOff, Loader2, MapPin, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { TEJERO_SITOS, PILOT_AREA } from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import PasswordStrengthHint from "@/components/ui/password-strength-hint";

// Pilot launch covers Barangay Tejero only, so new accounts pick their home
// area from this fixed sitio list instead of typing a free-form address.
const SITIO_OPTIONS = Object.keys(TEJERO_SITOS);

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

const fieldClass = (hasError) =>
  `w-full rounded-xl border bg-card pl-10 pr-4 py-3 text-sm font-medium text-foreground placeholder:text-muted-foreground/50 outline-none transition-colors ${
    hasError
      ? "border-rose-300 focus:border-rose-400"
      : "border-border hover:border-zinc-300 focus:border-zinc-400"
  }`;

function ErrorLine({ message }) {
  return (
    <AnimatePresence initial={false}>
      {message && (
        <motion.p
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.25, ease: "easeInOut" }}
          className="overflow-hidden text-xs font-medium text-rose-500"
        >
          {message}
        </motion.p>
      )}
    </AnimatePresence>
  );
}

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [sitio, setSitio] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [needsOtp, setNeedsOtp] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpError, setOtpError] = useState("");
  const [isResending, setIsResending] = useState(false);
  const [resendStatus, setResendStatus] = useState("");

  const emailSuggestionSuffix = getEmailSuggestionSuffix(email);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace('/report');
      }
    });
  }, [router]);

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
      handleFieldChange("email", email + emailSuggestionSuffix, setEmail);
    }
  };

  const handleResendOtp = async () => {
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
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();

    const newErrors = {};
    if (name.trim().length < 2) {
      newErrors.name = "Please enter your full name (at least 2 characters).";
    }
    if (!email.trim()) {
      newErrors.email = "Please enter your email address.";
    } else if (!validateEmail(email)) {
      newErrors.email = "Please enter a valid email address.";
    }
    if (!sitio) {
      newErrors.sitio = `Please select your sitio — the pilot launch covers ${process.env.NEXT_PUBLIC_BARANGAY_NAME || "your barangay"} only.`;
    }
    if (!password) {
      newErrors.password = "Please create a password.";
    } else if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters.";
    }
    if (!confirm) {
      newErrors.confirm = "Please re-enter your password.";
    } else if (password && confirm !== password) {
      newErrors.confirm = "Passwords do not match.";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});
    setIsLoading(true);

    const trimmedEmail = email.trim().toLowerCase();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: trimmedEmail,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/report`,
        data: {
          role: 'resident',
          full_name: name.trim(),
          sitio: sitio,
          barangay: PILOT_AREA.barangay
        }
      }
    });

    if (signUpError) {
      setErrors({ email: signUpError.message });
      setIsLoading(false);
      return;
    }

    setNeedsOtp(true);
    setIsLoading(false);
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (otp.length < 6) {
      setOtpError("Please enter the 6-digit code.");
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

    router.replace("/report");
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-12">
        <div className="mb-8 flex flex-col items-center text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-green-v2.png"
            alt="Bin'Go Logo"
            className="h-28 w-28 object-contain"
          />
          {needsOtp ? (
            <>
              <h1 className="mt-5 text-2xl font-black tracking-tight text-foreground">
                Check your email
              </h1>
              <p className="mt-1.5 text-sm font-medium text-muted-foreground">
                We sent a 6-digit code to <span className="font-semibold text-foreground">{email}</span>
              </p>
            </>
          ) : (
            <>
              <h1 className="mt-5 text-2xl font-black tracking-tight text-foreground">
                Create your account
              </h1>
              <p className="mt-1.5 text-sm font-medium text-muted-foreground">
                Join Bin&apos;Go to track collections in your barangay
              </p>
            </>
          )}
        </div>

        {needsOtp ? (
          <form className="flex flex-col gap-4" onSubmit={handleVerifyOtp} noValidate>
            {resendStatus && (
              <p className="rounded-lg bg-emerald-500/10 p-3 text-center text-xs font-medium text-emerald-600 dark:text-emerald-400">
                {resendStatus}
              </p>
            )}

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
              <ErrorLine message={otpError} />
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
                disabled={isResending}
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 disabled:opacity-50 transition-colors"
              >
                {isResending ? "Sending code..." : "Resend Code"}
              </button>
              <button
                type="button"
                onClick={() => setNeedsOtp(false)}
                className="text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Use a different email
              </button>
            </div>
          </form>
        ) : (
          <form className="flex flex-col gap-4" onSubmit={handleSignup} noValidate>
          <div className="flex flex-col gap-1.5">
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground/70">
                <User className="h-4 w-4" />
              </div>
              <input
                type="text"
                value={name}
                onChange={(e) =>
                  handleFieldChange(
                    "name",
                    e.target.value.replace(/[^a-zA-ZÀ-ÿÑñ'’ .-]/g, "").replace(/\s{2,}/g, " "),
                    setName
                  )
                }
                maxLength={60}
                autoComplete="name"
                className={fieldClass(!!errors.name)}
                placeholder="Full name"
              />
            </div>
            <ErrorLine message={errors.name} />
          </div>

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
            <ErrorLine message={errors.email} />
          </div>

          {/* Service address: the pilot covers Barangay Tejero only, so the
              upper levels each offer one fixed option; the resident's real
              choice is the sitio. */}
          <div className="flex flex-col gap-2.5">
            <div className="grid grid-cols-2 gap-2.5">
              {[
                { label: "Region", value: PILOT_AREA.region },
                { label: "Province", value: PILOT_AREA.province },
                { label: "City / Municipality", value: PILOT_AREA.city },
                { label: "Barangay", value: PILOT_AREA.barangay },
              ].map((field) => (
                <div key={field.label} className="flex flex-col gap-1">
                  <span className="pl-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                    {field.label}
                  </span>
                  <select
                    aria-label={field.label}
                    className="w-full cursor-pointer rounded-xl border border-border bg-card px-3 py-2.5 text-xs font-semibold text-foreground outline-none transition-colors hover:border-zinc-300 focus:border-zinc-400"
                  >
                    <option value={field.value}>{field.value}</option>
                  </select>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-1">
              <span className="pl-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                Sitio
              </span>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground/70">
                  <MapPin className="h-4 w-4" />
                </div>
                <select
                  value={sitio}
                  onChange={(e) => handleFieldChange("sitio", e.target.value, setSitio)}
                  aria-label={`Home sitio in ${process.env.NEXT_PUBLIC_BARANGAY_NAME || "Barangay"}`}
                  className={`${fieldClass(!!errors.sitio)} cursor-pointer appearance-none ${
                    sitio ? "text-foreground font-medium" : "text-muted-foreground/60"
                  }`}
                >
                  <option value="" disabled className="text-zinc-400 bg-white dark:bg-zinc-900">
                    Select your sitio
                  </option>
                  {SITIO_OPTIONS.map((s) => (
                    <option key={s} value={s} className="text-zinc-900 bg-white font-semibold dark:bg-zinc-900 dark:text-zinc-100">
                      {s}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5 text-muted-foreground/70">
                  <ChevronDown className="h-4 w-4" />
                </div>
              </div>
            </div>
            <ErrorLine message={errors.sitio} />
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
                autoComplete="new-password"
                className={fieldClass(!!errors.password) + " pr-11"}
                placeholder="Create a password"
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
            <PasswordStrengthHint password={password} />
            <ErrorLine message={errors.password} />
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground/70">
                <Lock className="h-4 w-4" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                value={confirm}
                onChange={(e) => handleFieldChange("confirm", e.target.value.replace(/\s/g, ""), setConfirm)}
                maxLength={64}
                autoComplete="new-password"
                className={fieldClass(!!errors.confirm)}
                placeholder="Re-enter your password"
              />
            </div>
            <ErrorLine message={errors.confirm} />
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
                <span>Creating account...</span>
              </>
            ) : (
              "Create Account"
            )}
          </Button>
          </form>
        )}

        <p className="mt-6 text-center text-xs font-medium text-muted-foreground">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-semibold text-emerald-600 transition-colors hover:text-emerald-700"
          >
            Sign In
          </Link>
        </p>
      </div>

      <p className="pb-6 text-center text-xs font-medium text-muted-foreground/60">
        Bin&apos;Go &middot; Smart Waste Collection, Simplified
      </p>
    </div>
  );
}
