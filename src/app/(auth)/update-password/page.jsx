"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import PasswordStrengthHint from "@/components/ui/password-strength-hint";

const fieldClass = (hasError) =>
  `w-full rounded-xl border bg-card pl-10 pr-11 py-3 text-sm font-medium text-foreground placeholder:text-muted-foreground/50 outline-none transition-colors ${
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

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [sessionLoading, setSessionLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'PASSWORD_RECOVERY') {
        if (!session && event === 'INITIAL_SESSION') {
          router.replace("/login");
        } else if (session) {
          setSessionLoading(false);
        }
      }
    });
    return () => subscription.unsubscribe();
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

  const handleUpdatePassword = async (e) => {
    e.preventDefault();

    const newErrors = {};
    if (!password) {
      newErrors.password = "Please create a new password.";
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

    const { error } = await supabase.auth.updateUser({
      password: password
    });

    if (error) {
      setErrors({ form: error.message });
      setIsLoading(false);
      return;
    }

    // Success! Redirect them to the main app dashboard.
    router.replace("/report");
  };

  if (sessionLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
      </div>
    );
  }

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
            Update your password
          </h1>
          <p className="mt-1.5 text-sm font-medium text-muted-foreground">
            Please enter your new password below.
          </p>
        </div>

        <form className="flex flex-col gap-4" onSubmit={handleUpdatePassword} noValidate>
          {errors.form && (
            <div className="rounded-md bg-rose-50 p-3 text-sm text-rose-500">
              {errors.form}
            </div>
          )}

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
                className={fieldClass(!!errors.password)}
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
                placeholder="Confirm new password"
              />
            </div>
            <ErrorLine message={errors.confirm} />
          </div>

          <Button
            variant="primary"
            size="lg"
            type="submit"
            disabled={isLoading || !password || !confirm}
            className="mt-2 w-full py-3.5"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Updating Password...</span>
              </>
            ) : (
              "Update Password"
            )}
          </Button>
        </form>
      </div>
      <p className="pb-6 text-center text-xs font-medium text-muted-foreground/60">
        Bin&apos;Go &middot; Smart Waste Collection, Simplified
      </p>
    </div>
  );
}
