"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { inputClass, labelClass } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const ADMIN_DOMAINS = ["bingo.com", "gmail.com", "yahoo.com", "outlook.com"];

const getEmailSuggestionSuffix = (emailVal, domains = ADMIN_DOMAINS) => {
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

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const emailSuggestionSuffix = getEmailSuggestionSuffix(email);

  const handleEmailKeyDown = (e) => {
    if ((e.key === "Tab" || e.key === "ArrowRight") && emailSuggestionSuffix) {
      if (e.key === "ArrowRight" && e.target.selectionStart !== email.length) {
        return;
      }
      e.preventDefault();
      handleFieldChange("email", email + emailSuggestionSuffix, setEmail);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.user_metadata?.role === "admin") {
        router.replace("/dashboard");
      }
    });
  }, [router]);

  const validateEmail = (emailStr) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailStr);
  };

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

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

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

    const { data, error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (signInError) {
      setError(signInError.message);
      setIsLoading(false);
      return;
    }

    const role = data.user?.user_metadata?.role;
    if (role !== "admin") {
      await supabase.auth.signOut();
      setError("This account doesn't have admin access. Please sign in with an admin account.");
      setIsLoading(false);
      return;
    }

    router.push("/dashboard");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-green-v2.png"
            alt="Bin-Go Logo"
            className="h-24 w-auto object-contain"
          />
          <h1 className="mt-4 text-lg font-semibold tracking-tight text-foreground">
            Admin Portal
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Sign in to manage the Barangay Tejero dashboard
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-xs">
          <form className="space-y-4" onSubmit={handleLogin} noValidate>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className={labelClass}>
                Email Address
              </label>
              <div className="relative">
                {emailSuggestionSuffix && (
                  <div
                    className="absolute inset-0 px-3 py-2 flex items-center pointer-events-none text-sm text-foreground whitespace-pre overflow-hidden z-10"
                    aria-hidden="true"
                  >
                    <span className="opacity-0">{email}</span>
                    <span className="text-muted-foreground/40 select-none">{emailSuggestionSuffix}</span>
                  </div>
                )}
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => handleFieldChange("email", e.target.value, setEmail)}
                  onKeyDown={handleEmailKeyDown}
                  autoCapitalize="none"
                  autoCorrect="off"
                  className={cn(inputClass, errors.email && "border-rose-300")}
                  placeholder="admin@bingo.com"
                />
              </div>
              <AnimatePresence initial={false}>
                {errors.email && (
                  <motion.p
                    key="email-error"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    className="overflow-hidden text-xs text-rose-500"
                  >
                    {errors.email}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className={labelClass}>
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => handleFieldChange("password", e.target.value, setPassword)}
                  className={cn(inputClass, "pr-9", errors.password && "border-rose-300")}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
              <AnimatePresence initial={false}>
                {errors.password && (
                  <motion.p
                    key="password-error"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    className="overflow-hidden text-xs text-rose-500"
                  >
                    {errors.password}
                  </motion.p>
                )}
              </AnimatePresence>
              <AnimatePresence initial={false}>
                {error && (
                  <motion.p
                    key="form-error"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    className="w-full overflow-hidden text-center text-xs font-medium text-rose-500"
                  >
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            <div className="border-t border-border-subtle pt-4">
              <Button
                variant="primary"
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5"
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
            </div>
          </form>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            Demo account: admin@bingo.com &middot; password: admin123
          </p>
        </div>
      </div>
    </div>
  );
}
