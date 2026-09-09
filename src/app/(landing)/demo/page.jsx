"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  User,
  Mail,
  Building2,
  MessageSquare,
  Loader2,
  CheckCircle2,
} from "lucide-react";

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

export default function DemoPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [org, setOrg] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(false);

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

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrors({});

    const newErrors = {};
    if (name.trim().length < 2) {
      newErrors.name = "Please enter your name (at least 2 characters).";
    }
    if (!email.trim()) {
      newErrors.email = "Please enter your email address.";
    } else if (!validateEmail(email)) {
      newErrors.email = "Please enter a valid email address.";
    }
    if (org.trim().length < 2) {
      newErrors.org = "Please tell us your barangay or organization.";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setSuccess(true);
    }, 1200);
  };

  const fieldClass = (hasError) =>
    `w-full pl-11 pr-4 py-3.5 bg-zinc-50 border rounded-xl text-sm font-medium outline-none transition-all placeholder:text-zinc-400 text-zinc-900 disabled:opacity-60 resize-none ${
      hasError
        ? "border-rose-300 focus:border-rose-400"
        : "border-zinc-200 focus:border-zinc-400"
    }`;

  return (
    <div className="min-h-screen bg-zinc-50 pt-24 sm:pt-32 pb-16 sm:pb-24">
      <div className="max-w-xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-10 sm:mb-14">
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-zinc-900 mb-4 leading-[1.15]">
            Request a <span className="text-emerald-600">Demo.</span>
          </h1>
          <p className="text-sm sm:text-base text-zinc-600 font-medium max-w-md mx-auto leading-relaxed">
            Want to see Bin&apos;Go in action for your community? Tell us about
            your barangay or organization and our team will set up a walkthrough.
          </p>
        </div>

        <div className="bg-white rounded-3xl border border-zinc-100 shadow-sm p-6 sm:p-10">
          {success ? (
            <div className="flex flex-col items-center text-center gap-4 py-8">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50">
                <CheckCircle2 className="w-7 h-7 text-emerald-600" />
              </div>
              <h2 className="text-xl font-black tracking-tight text-zinc-900">
                Demo request received!
              </h2>
              <p className="text-sm text-zinc-500 font-medium leading-relaxed max-w-sm">
                Thank you, {name.trim().split(" ")[0]}. Our team will reach out
                at {email.trim()} to schedule your walkthrough.
              </p>
              <Link
                href="/#home"
                className="mt-2 px-8 py-3 bg-zinc-900 text-white rounded-xl text-sm font-bold hover:bg-zinc-800 transition-colors"
              >
                Back to Home
              </Link>
            </div>
          ) : (
            <form className="space-y-5" onSubmit={handleSubmit} noValidate>
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
                  Your Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-400">
                    <User className="w-5 h-5" />
                  </div>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => handleFieldChange("name", e.target.value, setName)}
                    disabled={isSubmitting}
                    className={fieldClass(!!errors.name)}
                    placeholder="Ramon Villanueva"
                  />
                </div>
                <AnimatePresence initial={false}>
                  {errors.name && (
                    <motion.p
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                      className="overflow-hidden mt-1 text-xs font-medium text-rose-500"
                    >
                      {errors.name}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-400 z-10">
                    <Mail className="w-5 h-5" />
                  </div>
                  {emailSuggestionSuffix && (
                    <div
                      className="absolute inset-0 pl-11 pr-4 py-3.5 flex items-center pointer-events-none text-sm font-medium whitespace-pre overflow-hidden z-10"
                      aria-hidden="true"
                    >
                      <span className="opacity-0">{email}</span>
                      <span className="text-zinc-400/60 select-none">{emailSuggestionSuffix}</span>
                    </div>
                  )}
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => handleFieldChange("email", e.target.value, setEmail)}
                    onKeyDown={handleEmailKeyDown}
                    disabled={isSubmitting}
                    className={fieldClass(!!errors.email)}
                    placeholder="ramon.villanueva@gmail.com"
                  />
                </div>
                <AnimatePresence initial={false}>
                  {errors.email && (
                    <motion.p
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                      className="overflow-hidden mt-1 text-xs font-medium text-rose-500"
                    >
                      {errors.email}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
                  Barangay / Organization
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-400">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <input
                    type="text"
                    value={org}
                    onChange={(e) => handleFieldChange("org", e.target.value, setOrg)}
                    disabled={isSubmitting}
                    className={fieldClass(!!errors.org)}
                    placeholder="Brgy. Tejero, Cebu City"
                  />
                </div>
                <AnimatePresence initial={false}>
                  {errors.org && (
                    <motion.p
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: "easeInOut" }}
                      className="overflow-hidden mt-1 text-xs font-medium text-rose-500"
                    >
                      {errors.org}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
                  Notes (optional)
                </label>
                <div className="relative">
                  <div className="absolute top-3 left-0 pl-4 flex items-start pointer-events-none text-zinc-400">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <textarea
                    value={message}
                    onChange={(e) => handleFieldChange("message", e.target.value, setMessage)}
                    disabled={isSubmitting}
                    rows={4}
                    className={fieldClass(false)}
                    placeholder="What would you like to see? e.g. live truck tracking, dispatch dashboard..."
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-600/70 text-white py-4 rounded-xl text-sm font-bold transition-all shadow-lg shadow-emerald-600/20 hover:shadow-xl hover:-translate-y-0.5 disabled:transform-none cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    "Request Demo"
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
