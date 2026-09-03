"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, Mail, Lock, Eye, EyeOff, Loader2, MapPin, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { setResidentSession } from "@/lib/resident-session";
import { getAccount, createAccount } from "@/lib/resident-accounts";
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

  const emailSuggestionSuffix = getEmailSuggestionSuffix(email);

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

  const handleSignup = (e) => {
    e.preventDefault();

    const newErrors = {};
    if (name.trim().length < 2) {
      newErrors.name = "Please enter your full name (at least 2 characters).";
    }
    if (!email.trim()) {
      newErrors.email = "Please enter your email address.";
    } else if (!validateEmail(email)) {
      newErrors.email = "Please enter a valid email address.";
    } else if (getAccount(email)) {
      newErrors.email = "An account with this email already exists. Try signing in.";
    }
    if (!sitio) {
      newErrors.sitio = "Please select your sitio — the pilot launch covers Barangay Tejero only.";
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

    setTimeout(() => {
      const trimmedEmail = email.trim().toLowerCase();
      createAccount({ name: name.trim(), email: trimmedEmail, password, sitio, address: { ...PILOT_AREA } });
      setResidentSession({ email: trimmedEmail, name: name.trim(), sitio, address: { ...PILOT_AREA } });
      router.replace("/report");
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
            Create your account
          </h1>
          <p className="mt-1.5 text-sm font-medium text-muted-foreground">
            Join Bin&apos;Go to track collections in your barangay
          </p>
        </div>

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
                  aria-label="Home sitio in Barangay Tejero"
                  className={`${fieldClass(!!errors.sitio)} cursor-pointer appearance-none ${
                    sitio ? "" : "text-muted-foreground/50"
                  }`}
                >
                  <option value="" disabled>
                    Select your sitio
                  </option>
                  {SITIO_OPTIONS.map((s) => (
                    <option key={s} value={s}>
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
        Bin&apos;Go &middot; Barangay Tejero Waste Collection
      </p>
    </div>
  );
}
