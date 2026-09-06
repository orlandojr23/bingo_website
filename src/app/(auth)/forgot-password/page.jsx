"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, Loader2, ArrowLeft } from "lucide-react";
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
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-12">
        <div className="mb-8 flex flex-col items-center text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-green-v2.png"
            alt="Bin'Go Logo"
            className="h-28 w-28 object-contain"
          />
          <h1 className="mt-5 text-2xl font-black tracking-tight text-foreground">
            {step === "done" ? "Check your email" : "Forgot your password?"}
          </h1>
          <p className="mt-1.5 text-sm font-medium text-muted-foreground">
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
              disabled={isLoading || !email.trim()}
              className="mt-2 w-full py-3.5"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Sending Link...</span>
                </>
              ) : (
                "Send Reset Link"
              )}
            </Button>
          </form>
        )}

        <div className="mt-6 flex justify-center">
          <Link
            href="/login"
            className="flex items-center text-xs font-semibold text-emerald-600 transition-colors hover:text-emerald-700"
          >
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
            Back to Sign In
          </Link>
        </div>
      </div>
      <p className="pb-6 text-center text-xs font-medium text-muted-foreground/60">
        Bin&apos;Go &middot; Smart Waste Collection, Simplified
      </p>
    </div>
  );
}
