"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, Loader2, ChevronLeft, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
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
  `w-full rounded-2xl border bg-card pl-10 pr-4 py-3.5 text-[16px] text-foreground placeholder:text-muted-foreground/50 outline-none transition-colors ${
    hasError
      ? "border-rose-300 focus:border-rose-400"
      : "border-border/60 focus:border-zinc-400"
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
  const [step, setStep] = useState("email"); // "email" | "done"
  const [email, setEmail] = useState("");
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

  const handleSendLink = async (e) => {
    e.preventDefault();

    const newErrors = {};
    if (!email.trim()) {
      newErrors.email = "Please enter your email address.";
    } else if (!validateEmail(email)) {
      newErrors.email = "Please enter a valid email address.";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});
    setIsLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/update-password`,
    });

    setIsLoading(false);

    if (error) {
      setErrors({ email: error.message });
      return;
    }

    setStep("done");
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="mx-auto w-full max-w-sm px-2 pt-[calc(env(safe-area-inset-top)+12px)]">
        <div className="flex h-[52px] items-center">
          <Link
            href="/login"
            aria-label="Back to Sign In"
            className="flex h-10 w-10 items-center justify-center rounded-full text-foreground transition-all hover:bg-muted active:scale-95 active:bg-muted"
          >
            <ChevronLeft className="h-6 w-6" strokeWidth={2} />
          </Link>
        </div>
      </div>
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-8">
        <div className="mb-8 flex flex-col items-center text-center">
          {step === "done" ? (
            <CheckCircle2 className="h-12 w-12 text-emerald-600" strokeWidth={1.5} />
          ) : (
            <Mail className="h-12 w-12 text-muted-foreground/40" strokeWidth={1.5} />
          )}
          <h1 className="mt-4 text-[22px] font-semibold tracking-tight text-foreground">
            {step === "done" ? "Check your email" : "Forgot your password?"}
          </h1>
          <p className="mt-1.5 max-w-[280px] text-[14px] leading-normal text-muted-foreground">
            {step === "email" && "Enter your account email and we'll send a reset link."}
            {step === "done" && `We sent a password reset link to ${email.trim()}. Click the link in the email to choose a new password.`}
          </p>
        </div>

        {step === "email" && (
          <form className="flex flex-col gap-4" onSubmit={handleSendLink} noValidate>
            <div className="flex flex-col gap-1.5">
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-foreground/70">
                  <Mail className="h-4 w-4" />
                </div>
                {emailSuggestionSuffix && (
                  <div
                    className="pointer-events-none absolute inset-0 z-10 flex items-center overflow-hidden whitespace-pre pl-10 pr-4 text-[16px]"
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
              disabled={isLoading || !email.trim()}
              className="mt-1 h-[50px] w-full rounded-2xl text-[17px] font-semibold"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Sending Link...</span>
                </>
              ) : (
                "Send Reset Link"
              )}
            </Button>
          </form>
        )}

        {step === "done" && (
          <Link
            href="/login"
            className="flex h-[50px] w-full items-center justify-center rounded-2xl bg-emerald-600 text-[17px] font-semibold text-white transition-all hover:bg-emerald-700 active:scale-[0.99]"
          >
            Back to Sign In
          </Link>
        )}
      </div>
      <p className="pb-6 text-center text-xs font-medium text-muted-foreground/60">
        Bin&apos;Go &middot; Smart Waste Collection, Simplified
      </p>
    </div>
  );
}
