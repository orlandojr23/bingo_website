"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, KeyRound, Lock, Eye, EyeOff, Loader2, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getAccount, issueResetCode, resetPassword } from "@/lib/resident-accounts";
import { Button } from "@/components/ui/button";

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

export default function ForgotPasswordPage() {
  const [step, setStep] = useState("email"); // "email" | "reset" | "done"
  const [email, setEmail] = useState("");
  const [demoCode, setDemoCode] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const emailSuggestionSuffix = step === "email" ? getEmailSuggestionSuffix(email) : "";

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

  const handleSendCode = (e) => {
    e.preventDefault();

    const newErrors = {};
    if (!email.trim()) {
      newErrors.email = "Please enter your email address.";
    } else if (!validateEmail(email)) {
      newErrors.email = "Please enter a valid email address.";
    } else if (!getAccount(email)) {
      newErrors.email = "No account found for this email. Try creating one instead.";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});
    setIsLoading(true);

    setTimeout(() => {
      setDemoCode(issueResetCode(email));
      setIsLoading(false);
      setStep("reset");
    }, 900);
  };

  const handleReset = (e) => {
    e.preventDefault();

    const newErrors = {};
    if (!code.trim()) {
      newErrors.code = "Please enter the 6-digit reset code.";
    } else if (!/^\d{6}$/.test(code.trim())) {
      newErrors.code = "The reset code must be 6 digits.";
    }
    if (!password) {
      newErrors.password = "Please create a new password.";
    } else if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters.";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});
    setIsLoading(true);

    setTimeout(() => {
      const ok = resetPassword(email, code, password);
      setIsLoading(false);
      if (!ok) {
        setErrors({ code: "That reset code is incorrect. Please try again." });
        return;
      }
      setStep("done");
    }, 900);
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
          <h1 className="mt-5 text-2xl font-black tracking-tight text-foreground">
            {step === "done" ? "Password reset!" : "Forgot your password?"}
          </h1>
          <p className="mt-1.5 text-sm font-medium text-muted-foreground">
            {step === "email" && "Enter your account email and we'll send a reset code."}
            {step === "reset" && `Enter the code sent to ${email.trim()} and pick a new password.`}
            {step === "done" && "Your password has been updated successfully."}
          </p>
        </div>

        {step === "email" && (
          <form className="flex flex-col gap-4" onSubmit={handleSendCode} noValidate>
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
                  <span>Sending...</span>
                </>
              ) : (
                "Send Reset Code"
              )}
            </Button>
          </form>
        )}

        {step === "reset" && (
          <form className="flex flex-col gap-4" onSubmit={handleReset} noValidate>
            <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-medium text-amber-700">
              <KeyRound className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                Demo mode: no email is actually sent. Your reset code is{" "}
                <strong className="font-bold">{demoCode}</strong>.
              </span>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground/70">
                  <KeyRound className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  autoComplete="one-time-code"
                  value={code}
                  onChange={(e) => handleFieldChange("code", e.target.value.replace(/\D/g, ""), setCode)}
                  className={fieldClass(!!errors.code) + " tracking-[0.3em]"}
                  placeholder="6-digit code"
                />
              </div>
              <ErrorLine message={errors.code} />
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
                  placeholder="New password"
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
              <ErrorLine message={errors.password} />
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
                  <span>Resetting...</span>
                </>
              ) : (
                "Reset Password"
              )}
            </Button>

            <button
              type="button"
              onClick={() => {
                setStep("email");
                setCode("");
                setPassword("");
                setErrors({});
              }}
              className="cursor-pointer text-center text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
            >
              Use a different email
            </button>
          </form>
        )}

        {step === "done" && (
          <div className="flex flex-col items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
              <CheckCircle2 className="h-7 w-7 text-emerald-600" />
            </div>
            <Link
              href="/login"
              className="inline-flex w-full cursor-pointer items-center justify-center rounded-xl border border-emerald-600 bg-emerald-600 px-4 py-3.5 text-sm font-medium text-white shadow-xs transition-all hover:bg-emerald-700 active:scale-[0.98]"
            >
              Back to Sign In
            </Link>
          </div>
        )}

        {step === "email" && (
          <p className="mt-6 text-center text-xs font-medium text-muted-foreground">
            Remembered it?{" "}
            <Link
              href="/login"
              className="font-semibold text-emerald-600 transition-colors hover:text-emerald-700"
            >
              Back to Sign In
            </Link>
          </p>
        )}
      </div>

      <p className="pb-6 text-center text-xs font-medium text-muted-foreground/60">
        Bin&apos;Go &middot; Barangay Tejero Waste Collection
      </p>
    </div>
  );
}
