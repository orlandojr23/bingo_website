"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getDriverSession, setDriverSession } from "@/lib/driver-session";
import { getDriverAccount, saveDriverAccount } from "@/lib/driver-accounts";
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
  const local = email.split("@")[0] || "Driver";
  const token = local.split(/[._\-+]/)[0] || "Driver";
  return token.charAt(0).toUpperCase() + token.slice(1);
};

const fieldClass = (hasError) =>
  `w-full rounded-xl border bg-card pl-10 pr-4 py-3 text-sm font-medium text-foreground placeholder:text-muted-foreground/50 outline-none transition-colors ${
    hasError
      ? "border-rose-300 focus:border-rose-400"
      : "border-border hover:border-zinc-300 focus:border-zinc-400"
  }`;

export default function DriverLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const emailSuggestionSuffix = getEmailSuggestionSuffix(email);

  useEffect(() => {
    if (getDriverSession()) router.replace("/driver");
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

  const handleLogin = (e) => {
    e.preventDefault();

    const newErrors = {};
    if (!email.trim()) {
      newErrors.email = "Please enter your email address.";
    } else if (!validateEmail(email)) {
      newErrors.email = "Please enter a valid email address.";
    }
    if (!password) {
      newErrors.password = "Please enter your password.";
    } else if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters.";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});

    const account = getDriverAccount(email);
    if (account && account.password !== password) {
      setErrors({ password: "Incorrect password. Please try again." });
      return;
    }

    setIsLoading(true);

    setTimeout(() => {
      const trimmedEmail = email.trim().toLowerCase();
      saveDriverAccount({
        email: trimmedEmail,
        name: account?.name || nameFromEmail(trimmedEmail),
        password,
      });
      setDriverSession({ email: trimmedEmail, name: account?.name || nameFromEmail(trimmedEmail) });
      router.replace("/driver");
    }, 900);
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
          <h1 className="mt-5 text-2xl font-black tracking-tight text-foreground">
            Welcome back!
          </h1>
          <p className="mt-1.5 text-sm font-medium text-muted-foreground">
            Sign in to continue to the Driver Terminal
          </p>
        </div>

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

        <p className="mt-8 text-center text-xs text-muted-foreground/80">
          Driver accounts are created by the barangay admin. You can change
          your password anytime in the Driver Terminal settings.
        </p>

        <p className="mt-3 text-center text-xs font-medium text-muted-foreground">
          Are you a resident?{" "}
          <Link
            href="/login"
            className="font-semibold text-emerald-600 transition-colors hover:text-emerald-700"
          >
            Resident Sign In
          </Link>
        </p>
      </div>

      <p className="pb-6 text-center text-xs font-medium text-muted-foreground/60">
        Bin&apos;Go &middot; Barangay Tejero Driver Terminal
      </p>
    </div>
  );
}
