"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Native auth tokens (local override; the shared admin inputClass stays untouched)
const fieldClass = (hasError) =>
  `w-full rounded-2xl border bg-card px-3.5 py-3.5 text-[16px] text-foreground placeholder:text-muted-foreground/50 outline-none transition-colors ${
    hasError
      ? "border-rose-300 focus:border-rose-400"
      : "border-border/60 focus:border-zinc-400"
  }`;
const fieldLabelClass = "text-[13px] text-muted-foreground";

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

    // Check the profiles table to see if this user was granted the 'admin' role
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .maybeSingle();

    // Fallback to user_metadata just in case (for the old mock setup)
    const role = profile?.role || data.user?.user_metadata?.role;
    
    if (role !== "admin") {
      await supabase.auth.signOut();
      setError("This account doesn't have admin access. Please sign in with an admin account.");
      setIsLoading(false);
      return;
    }

    router.push("/dashboard");
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-6 py-8">
        <div className="mb-8 flex flex-col items-center text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo-green-v2.png"
            alt="Bin-Go Logo"
            fetchPriority="high"
            loading="eager"
            className="h-28 w-28 object-contain"
          />
          <h1 className="mt-4 text-[22px] font-semibold tracking-tight text-foreground">
            Log in to your account
          </h1>
          <p className="mt-1.5 text-[14px] leading-normal text-muted-foreground">
            Enter your credentials to access the Admin Portal
          </p>
        </div>

          <form className="flex flex-col gap-4" onSubmit={handleLogin} noValidate>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className={fieldLabelClass}>
                Email Address
              </label>
              <div className="relative">
                {emailSuggestionSuffix && (
                  <div
                    className="absolute inset-0 px-3.5 flex items-center pointer-events-none text-[16px] text-foreground whitespace-pre overflow-hidden z-10"
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
                  className={cn(fieldClass(!!errors.email))}
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
              <label htmlFor="password" className={fieldLabelClass}>
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => handleFieldChange("password", e.target.value, setPassword)}
                  className={cn(fieldClass(!!errors.password), "pr-11")}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground cursor-pointer"
                >
                  {showPassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
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

            <div className="pt-1">
              <Button
                variant="primary"
                type="submit"
                disabled={isLoading}
                className="h-[50px] w-full rounded-2xl text-[17px] font-semibold"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
            </div>
          </form>
      </div>
      <p className="pb-6 text-center text-xs font-medium text-muted-foreground/60">
        Bin&apos;Go &middot; Smart Waste Collection, Simplified
      </p>
    </div>
  );
}
