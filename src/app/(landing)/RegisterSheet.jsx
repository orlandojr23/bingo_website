"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock, User, MapPin, X, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function RegisterSheet({ isOpen, onClose, initialMode = "register" }) {
  const [mode, setMode] = useState(initialMode);
  const router = useRouter();

  // Form states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [municipality, setMunicipality] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => {
        setMode(initialMode);
        setError("");
        setSuccess("");
        setEmail("");
        setPassword("");
        setFullName("");
        setMunicipality("");
      }, 0);
      return () => clearTimeout(t);
    }
  }, [isOpen, initialMode]);

  const validateEmail = (emailStr) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailStr);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // Validations
    if (mode === "register") {
      if (fullName.trim().length < 3) { setError("Full name must be at least 3 characters."); return; }
      if (!validateEmail(email)) { setError("Please enter a valid email address format."); return; }
      if (municipality.trim().length < 3) { setError("Please enter a valid municipality."); return; }
      if (password.length < 8) { setError("Password must be at least 8 characters long."); return; }
    }

    setIsSubmitting(true);

    if (mode === "login") {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (signInError) {
        setError(signInError.message);
        setIsSubmitting(false);
        return;
      }

      const role = data.user?.user_metadata?.role;
      if (role === "admin" || role === "driver") {
        await supabase.auth.signOut();
        setError("This portal is for citizens only.");
        setIsSubmitting(false);
        return;
      }

      router.push("/track");
    } else {
      // Register
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            municipality: municipality.trim(),
            role: "citizen",
          },
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        setIsSubmitting(false);
        return;
      }

      if (signUpData?.session) {
        setIsSubmitting(false);
        router.push("/track");
        return;
      }

      setMode("login");
      setIsSubmitting(false);
      setSuccess("Account created! Please sign in.");
      setEmail("");
      setPassword("");
      setFullName("");
      setMunicipality("");
    }
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
            transition={{ type: "spring", stiffness: 65, damping: 20, mass: 0.8 }}
            className="relative w-full max-w-[500px] h-full bg-white flex flex-col shadow-[-10px_0_40px_rgba(0,0,0,0.1)] z-10"
          >
            {/* Close Button */}
            <button 
              onClick={onClose}
              disabled={isSubmitting}
              className="absolute top-6 right-6 p-2 transition-colors text-zinc-400 hover:text-zinc-900 z-20 disabled:opacity-50"
            >
              <X className="w-6 h-6" />
            </button>

            {/* Scrollable Form Panel */}
            <div className="w-full h-full overflow-y-auto flex flex-col px-8 sm:px-12 pt-24 pb-12">
              <div className="max-w-md w-full mx-auto my-auto">
                {/* Header */}
                <div className="mb-10">
                  <h1 className="text-4xl font-black tracking-tight text-zinc-900 mb-3 pr-4">
                    {mode === "login" ? "Welcome back" : "Create your account"}
                  </h1>
                  <p className="text-zinc-500 font-medium leading-relaxed">
                    {mode === "login" 
                      ? "Sign in to access your dashboard and track schedules." 
                      : "Join Bin'Go to start tracking your community's waste collection in real-time."}
                  </p>
                </div>

                {/* Form */}
                <form className="space-y-6" onSubmit={handleSubmit}>
                  
                  {mode === "register" && (
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">Full Name</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-400">
                          <User className="w-5 h-5" />
                        </div>
                        <input 
                          type="text" 
                          required
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          disabled={isSubmitting}
                          className="w-full pl-11 pr-4 py-3.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all placeholder:text-zinc-400 text-zinc-900 disabled:opacity-60"
                          placeholder="Juan Dela Cruz"
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
                      {mode === "login" ? "Email or Username" : "Email Address"}
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-400">
                        <Mail className="w-5 h-5" />
                      </div>
                      <input 
                        type={mode === "register" ? "email" : "text"}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        disabled={isSubmitting}
                        className="w-full pl-11 pr-4 py-3.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all placeholder:text-zinc-400 text-zinc-900 disabled:opacity-60"
                        placeholder={mode === "login" ? "user@example.com or 'user'" : "juan@example.com"}
                      />
                    </div>
                  </div>

                  {mode === "register" && (
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">Municipality / Barangay</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-400">
                          <MapPin className="w-5 h-5" />
                        </div>
                        <input 
                          type="text" 
                          required
                          value={municipality}
                          onChange={(e) => setMunicipality(e.target.value)}
                          disabled={isSubmitting}
                          className="w-full pl-11 pr-4 py-3.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all placeholder:text-zinc-400 text-zinc-900 disabled:opacity-60"
                          placeholder="e.g. Guadalupe, Cebu City"
                        />
                      </div>
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">Password</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-400">
                        <Lock className="w-5 h-5" />
                      </div>
                      <input 
                        type="password" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        disabled={isSubmitting}
                        className="w-full pl-11 pr-4 py-3.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all placeholder:text-zinc-400 text-zinc-900 disabled:opacity-60"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>

                  {error && (
                    <div className="text-center">
                      <p className="text-sm font-medium text-rose-500">
                        {error}
                      </p>
                    </div>
                  )}

                  {success && (
                    <div className="text-center">
                      <p className="text-sm font-medium text-emerald-600">
                        {success}
                      </p>
                    </div>
                  )}

                  <div className="pt-2">
                    <button 
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-600/70 text-white py-4 rounded-xl text-sm font-bold transition-all shadow-lg shadow-emerald-600/20 hover:shadow-xl hover:-translate-y-0.5 disabled:transform-none"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>Please wait...</span>
                        </>
                      ) : (
                        mode === "login" ? "Sign In" : "Create Account"
                      )}
                    </button>
                  </div>
                </form>
                  
                {/* Toggle Mode */}
                <div className="pt-6 text-center">
                  <p className="text-sm font-medium text-zinc-500">
                    {mode === "login" ? "Don't have an account?" : "Already have an account?"}
                    <button 
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => {
                        setMode(mode === "login" ? "register" : "login");
                        setError("");
                        setSuccess("");
                      }}
                      className="ml-2 font-bold text-emerald-600 hover:text-emerald-700 transition-colors disabled:opacity-50"
                    >
                      {mode === "login" ? "Create one" : "Sign in"}
                    </button>
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
