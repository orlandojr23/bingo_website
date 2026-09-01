"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { X, Loader2, CheckCircle, Play, Apple, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { inputClass, labelClass } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export default function RegisterSheet({ isOpen, onClose }) {
  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [barangay, setBarangay] = useState("tejero");
  const [sitio, setSitio] = useState("Sitio Vilgon");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [registeredSuccessfully, setRegisteredSuccessfully] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => {
        setErrors({});
        setEmail("");
        setPassword("");
        setConfirmPassword("");
        setShowPassword(false);
        setShowConfirmPassword(false);
        setFullName("");
        setPhone("");
        setBarangay("tejero");
        setSitio("Sitio Vilgon");
        setRegisteredSuccessfully(false);
      }, 0);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  const validateEmail = (emailStr) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailStr);
  };

  const validatePhone = (phoneStr) => {
    // Validate standard Philippine 11-digit mobile number starting with 09
    return /^09\d{9}$/.test(phoneStr.trim());
  };

  const getPasswordStrength = (pwd) => {
    if (!pwd) return "";
    if (pwd.length < 6) return "weak";
    
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;
    
    if (score <= 1) return "weak";
    if (score === 2 || score === 3) return "medium";
    return "strong";
  };

  const passwordStrength = getPasswordStrength(password);

  const getEmailSuggestion = (val) => {
    if (!val || val.includes("@")) return "";
    return "@gmail.com";
  };

  const emailSuggestion = getEmailSuggestion(email);

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

  const handlePhoneChange = (val) => {
    // Restrict to numeric characters only
    const numericVal = val.replace(/\D/g, "");
    if (numericVal.length <= 11) {
      setPhone(numericVal);
      
      // Inline validation checks on the fly
      if (numericVal.length === 0) {
        setErrors((prev) => {
          const next = { ...prev };
          delete next.phone;
          return next;
        });
      } else if (!numericVal.startsWith("09")) {
        setErrors((prev) => ({ ...prev, phone: "Mobile number must start with 09." }));
      } else if (numericVal.length < 11) {
        setErrors((prev) => ({ ...prev, phone: "Mobile number must be exactly 11 digits." }));
      } else {
        setErrors((prev) => {
          const next = { ...prev };
          delete next.phone;
          return next;
        });
      }
    }
  };

  const handleEmailKeyDown = (e) => {
    if (e.key === "Tab" && emailSuggestion) {
      e.preventDefault(); // Stop focus navigation
      handleFieldChange("email", email + emailSuggestion, setEmail);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    const newErrors = {};

    // Validations
    if (fullName.trim().length < 3) {
      newErrors.fullName = "Full name must be at least 3 characters.";
    }
    if (!validateEmail(email)) {
      newErrors.email = "Please enter a valid email address format.";
    }
    if (!validatePhone(phone)) {
      newErrors.phone = "Please enter a valid PH mobile number (e.g. 09123456789).";
    }
    if (barangay !== "tejero") {
      newErrors.barangay = "Registration is currently restricted to Barangay Tejero.";
    }
    if (password.length < 8) {
      newErrors.password = "Password must be at least 8 characters long.";
    }
    if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match.";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);

    // Register
    const { error: signUpError } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: {
          full_name: fullName.trim(),
          phone: phone.trim(),
          barangay: "Barangay Tejero, Cebu City",
          sitio: sitio,
          role: "citizen",
        },
      },
    });

    if (signUpError) {
      setErrors({ general: signUpError.message });
      setIsSubmitting(false);
      return;
    }

    // Force sign out immediately, since Supabase might automatically sign in the registered user.
    // This ensures no active citizen session is kept on the browser website.
    await supabase.auth.signOut();

    setIsSubmitting(false);
    setRegisteredSuccessfully(true);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm"
          />
          
          {/* Sheet */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="relative w-full max-w-[500px] h-full bg-white flex flex-col shadow-[-10px_0_40px_rgba(0,0,0,0.1)] z-10"
          >
            {/* Close Button */}
            <button 
              onClick={onClose}
              disabled={isSubmitting}
              className="absolute top-4 sm:top-6 right-4 sm:right-6 p-2 transition-colors text-zinc-400 hover:text-zinc-900 z-20 disabled:opacity-50"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Scrollable Form Panel */}
            <div className="w-full h-full overflow-y-auto flex flex-col px-5 sm:px-10 pt-16 sm:pt-24 pb-8 sm:pb-12">
              <div className="max-w-md w-full mx-auto my-auto">
                <AnimatePresence mode="wait">
                  {!registeredSuccessfully ? (
                    <motion.div
                      key="form-container"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.2 }}
                    >
                      {/* Header */}
                      <div className="mb-6 sm:mb-8">
                        <h1 className="text-2xl font-semibold tracking-tight text-foreground mb-1.5 pr-4">
                          Create your account
                        </h1>
                        <p className="text-muted-foreground text-sm leading-relaxed">
                          Join Bin&apos;Go to start tracking your community&apos;s waste collection in real-time.
                        </p>
                      </div>

                      {/* Form */}
                      <form className="space-y-4" onSubmit={handleSubmit}>
                        
                        {/* Full Name */}
                        <div className="flex flex-col gap-1.5">
                          <label className={labelClass}>
                            Full Name <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            value={fullName}
                            onChange={(e) => handleFieldChange("fullName", e.target.value, setFullName)}
                            disabled={isSubmitting}
                            className={inputClass}
                            placeholder="Juan Dela Cruz"
                          />
                          {errors.fullName && (
                            <p className="text-xs text-rose-500">{errors.fullName}</p>
                          )}
                        </div>

                        {/* Email Address */}
                        <div className="flex flex-col gap-1.5">
                          <label className={labelClass}>
                            Email Address <span className="text-rose-500">*</span>
                          </label>
                          <div className="relative">
                            <input
                              type="email"
                              value={email}
                              onChange={(e) => handleFieldChange("email", e.target.value, setEmail)}
                              onKeyDown={handleEmailKeyDown}
                              required
                              disabled={isSubmitting}
                              className={inputClass}
                              placeholder="juan@example.com"
                            />

                            {/* Ghost Auto-complete Suggestion */}
                            {emailSuggestion && (
                              <div className="pointer-events-none absolute inset-y-0 left-0 flex w-full select-none items-center pl-3 text-sm">
                                {/* Invisible spacer mapping user typed text */}
                                <span className="whitespace-pre opacity-0">{email}</span>
                                {/* Visible ghost suggestion */}
                                <span className="animate-pulse text-muted-foreground/70">{emailSuggestion}</span>
                              </div>
                            )}
                          </div>

                          {errors.email ? (
                            <p className="text-xs text-rose-500">{errors.email}</p>
                          ) : emailSuggestion ? (
                            <p className="text-xs text-muted-foreground">
                              Press{" "}
                              <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 text-[9px] font-sans">
                                Tab
                              </kbd>{" "}
                              to autocomplete with {emailSuggestion}
                            </p>
                          ) : null}
                        </div>

                        {/* Mobile Number */}
                        <div className="flex flex-col gap-1.5">
                          <label className={labelClass}>
                            Mobile Number <span className="text-rose-500">*</span>
                          </label>
                          <input
                            type="tel"
                            required
                            value={phone}
                            onChange={(e) => handlePhoneChange(e.target.value)}
                            disabled={isSubmitting}
                            className={inputClass}
                            placeholder="09XXXXXXXXX"
                            maxLength={11}
                          />
                          {errors.phone ? (
                            <p className="text-xs text-rose-500">{errors.phone}</p>
                          ) : (
                            <p className="text-xs text-muted-foreground">
                              Used only for real-time truck arrival SMS notifications.
                            </p>
                          )}
                        </div>

                        {/* Barangay */}
                        <div className="flex flex-col gap-1.5">
                          <label className={labelClass}>Barangay</label>
                          <select
                            value={barangay}
                            onChange={(e) => handleFieldChange("barangay", e.target.value, setBarangay)}
                            disabled={isSubmitting}
                            className={cn(inputClass, "cursor-pointer")}
                          >
                            <option value="tejero">Barangay Tejero, Cebu City</option>
                            <option value="other">Other parts of Metro Cebu (Coming Soon...)</option>
                          </select>
                        </div>

                        {barangay === "tejero" ? (
                          /* Sitio / Area */
                          <div className="flex flex-col gap-1.5">
                            <label className={labelClass}>Sitio / Area</label>
                            <select
                              value={sitio}
                              onChange={(e) => setSitio(e.target.value)}
                              disabled={isSubmitting}
                              className={cn(inputClass, "cursor-pointer")}
                            >
                              <option value="Sitio Vilgon">Sitio Vilgon</option>
                              <option value="Sitio ICM">Sitio ICM</option>
                              <option value="Sitio Daclan">Sitio Daclan</option>
                              <option value="Sitio Sampaguita">Sitio Sampaguita</option>
                              <option value="Sitio Looban">Sitio Looban</option>
                              <option value="Sitio Bacaros">Sitio Bacaros</option>
                              <option value="Sitio Silangan">Sitio Silangan</option>
                              <option value="Sitio Mac Arthur">Sitio Mac Arthur</option>
                              <option value="Sitio Riverside">Sitio Riverside</option>
                              <option value="Sitio Zapanta">Sitio Zapanta</option>
                            </select>
                          </div>
                        ) : (
                          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3.5 text-xs leading-relaxed text-amber-800 animate-in-fade">
                            Registration is currently limited to Barangay Tejero during our pilot phase. We will be expanding to the rest of Metro Cebu soon!
                          </div>
                        )}

                        {/* Password */}
                        <div className="flex flex-col gap-1.5">
                          <label className={labelClass}>
                            Password <span className="text-rose-500">*</span>
                          </label>
                          <div className="relative">
                            <input
                              type={showPassword ? "text" : "password"}
                              value={password}
                              onChange={(e) => handleFieldChange("password", e.target.value, setPassword)}
                              required
                              disabled={isSubmitting}
                              className={cn(inputClass, "pr-9")}
                              placeholder="••••••••"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                            >
                              {showPassword ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                            </button>
                          </div>
                          {password && (
                            <div className="flex items-center gap-1.5">
                              <div className="flex gap-0.5">
                                <span className={`h-1 w-4 rounded-full transition-all duration-300 ${
                                  passwordStrength === "weak" ? "bg-rose-500" :
                                  passwordStrength === "medium" ? "bg-amber-400" :
                                  passwordStrength === "strong" ? "bg-emerald-500" : "bg-zinc-200"
                                }`} />
                                <span className={`h-1 w-4 rounded-full transition-all duration-300 ${
                                  passwordStrength === "medium" ? "bg-amber-400" :
                                  passwordStrength === "strong" ? "bg-emerald-500" : "bg-zinc-200"
                                }`} />
                                <span className={`h-1 w-4 rounded-full transition-all duration-300 ${
                                  passwordStrength === "strong" ? "bg-emerald-500" : "bg-zinc-200"
                                }`} />
                              </div>
                              <span className={`text-[9px] font-semibold uppercase tracking-wider ${
                                passwordStrength === "weak" ? "text-rose-500" :
                                passwordStrength === "medium" ? "text-amber-500" :
                                passwordStrength === "strong" ? "text-emerald-600" : "text-zinc-400"
                              }`}>
                                {passwordStrength}
                              </span>
                            </div>
                          )}
                          {errors.password && (
                            <p className="text-xs text-rose-500">{errors.password}</p>
                          )}
                        </div>

                        {/* Confirm Password */}
                        <div className="flex flex-col gap-1.5">
                          <label className={labelClass}>
                            Confirm Password <span className="text-rose-500">*</span>
                          </label>
                          <div className="relative">
                            <input
                              type={showConfirmPassword ? "text" : "password"}
                              value={confirmPassword}
                              onChange={(e) => handleFieldChange("confirmPassword", e.target.value, setConfirmPassword)}
                              required
                              disabled={isSubmitting}
                              className={cn(inputClass, "pr-9")}
                              placeholder="••••••••"
                            />
                            <button
                              type="button"
                              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                            >
                              {showConfirmPassword ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                            </button>
                          </div>
                          {errors.confirmPassword && (
                            <p className="text-xs text-rose-500">{errors.confirmPassword}</p>
                          )}
                        </div>

                        {errors.general && (
                          <p className="text-center text-xs text-rose-500">{errors.general}</p>
                        )}

                        <div className="border-t border-border-subtle pt-4">
                          <Button
                            variant="primary"
                            type="submit"
                            disabled={isSubmitting || barangay !== "tejero"}
                            className="w-full py-2.5"
                          >
                            {isSubmitting ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                <span>Creating Account...</span>
                              </>
                            ) : (
                              "Create Account"
                            )}
                          </Button>
                        </div>
                      </form>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="success-container"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ type: "spring", duration: 0.5 }}
                      className="flex flex-col items-center text-center"
                    >
                      <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mb-6">
                        <CheckCircle className="w-10 h-10 text-emerald-600" />
                      </div>
                      
                      <h1 className="text-3xl font-black text-zinc-900 tracking-tight mb-4">
                        Account Created!
                      </h1>
                      
                      <p className="text-zinc-500 text-sm font-medium leading-relaxed mb-6 sm:mb-8 max-w-sm">
                        Your account has been registered successfully. You can now download the Bin&apos;Go mobile app to start tracking waste collection in real-time.
                      </p>

                      <div className="w-full border-t border-zinc-100 pt-6 mb-6 sm:mb-8">
                        <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-4">
                          Download Bin&apos;Go App
                        </p>
                        
                        <div className="flex flex-col gap-3 max-w-xs mx-auto">
                          {/* Google Play */}
                          <div className="flex items-center gap-3 px-4 py-2.5 text-zinc-500 rounded-xl bg-zinc-50 border border-zinc-100/80 cursor-not-allowed">
                            <Play className="w-4 h-4 text-zinc-400 fill-zinc-400" />
                            <div className="text-left">
                              <p className="font-bold text-zinc-700 text-xs leading-none mb-1">Google Play</p>
                              <p className="text-[10px] text-zinc-400 leading-none">Coming Soon</p>
                            </div>
                          </div>
                          
                          {/* App Store */}
                          <div className="flex items-center gap-3 px-4 py-2.5 text-zinc-500 rounded-xl bg-zinc-50 border border-zinc-100/80 cursor-not-allowed">
                            <Apple className="w-4 h-4 text-zinc-400" />
                            <div className="text-left">
                              <p className="font-bold text-zinc-700 text-xs leading-none mb-1">App Store</p>
                              <p className="text-[10px] text-zinc-400 leading-none">Coming Soon</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={onClose}
                        className="w-full bg-zinc-900 hover:bg-zinc-800 text-white py-3.5 rounded-xl text-sm font-bold transition-all shadow-md"
                      >
                        Done
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
