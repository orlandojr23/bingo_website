"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import ModernRobotCheckbox from "@/components/ui/ModernRobotCheckbox";
import {
  User,
  Mail,
  Building2,
  Phone,
  MessageSquare,
  Loader2,
  CheckCircle2,
  AlertCircle,
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
  const [isCaptchaVerified, setIsCaptchaVerified] = useState(false);
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});

    const newErrors = {};
    if (!name.trim()) {
      newErrors.name = "Full name is required";
    }
    if (!email.trim()) {
      newErrors.email = "Work email is required";
    } else if (!validateEmail(email.trim())) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!isCaptchaVerified) {
      newErrors.captcha = "Please check the box to verify you are not a robot.";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    try {
      if (typeof isCaptchaVerified === "string") {
        const verifyRes = await fetch("/api/verify-turnstile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: isCaptchaVerified, action: "demo" }),
        });
        const verifyData = await verifyRes.json();
        if (!verifyData.success && verifyData.error !== "Missing Turnstile secret key") {
          setErrors({ captcha: "Anti-bot verification failed. Please try again." });
          setIsSubmitting(false);
          return;
        }
      }

      const formspreeUrl =
        process.env.NEXT_PUBLIC_FORMSPREE_DEMO_URL || "https://formspree.io/f/xdeoyjlz";

      const formRes = await fetch(formspreeUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          organization: org.trim() || "N/A",
          notes: message.trim() || "N/A",
          _subject: `New Demo Request from ${name.trim()}`,
        }),
      });

      if (formRes.ok) {
        setSuccess(true);
      } else {
        const resData = await formRes.json().catch(() => ({}));
        setErrors({
          form: resData?.errors?.[0]?.message || "Submission failed. Please try again.",
        });
      }
    } catch (err) {
      console.error("Demo form submission error:", err);
      setErrors({ form: "Network error occurred. Please check your connection or ad blocker and try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const fieldClass = (hasError) =>
    `w-full pl-11 pr-4 py-3 bg-white rounded-xl border text-sm font-medium text-zinc-900 transition-all outline-none disabled:opacity-60 disabled:cursor-not-allowed ${
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
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="flex flex-col items-center text-center py-6 gap-3"
            >
              <h2 className="text-xl font-bold tracking-tight text-zinc-900">
                Demo request received!
              </h2>
              <p className="text-xs sm:text-sm text-zinc-500 font-medium leading-relaxed max-w-xs">
                Thank you, {name.trim().split(" ")[0]}. Our team will reach out at{" "}
                <span className="font-semibold text-emerald-600">{email.trim()}</span> to schedule your walkthrough.
              </p>
              <Link
                href="/"
                className="mt-2 px-6 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-all shadow-md shadow-emerald-600/20 hover:shadow-lg hover:-translate-y-0.5"
              >
                Back to Home
              </Link>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
              <AnimatePresence>
                {errors.form && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-xs font-semibold text-rose-500"
                  >
                    {errors.form}
                  </motion.p>
                )}
              </AnimatePresence>
              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
                  Full Name <span className="text-rose-500">*</span>
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
                    placeholder="e.g. Maria Santos"
                  />
                </div>
                <AnimatePresence>
                  {errors.name && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="text-xs font-semibold text-rose-500"
                    >
                      {errors.name}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
                  Work Email <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-400">
                    <Mail className="w-5 h-5" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => handleFieldChange("email", e.target.value, setEmail)}
                    onKeyDown={handleEmailKeyDown}
                    disabled={isSubmitting}
                    className={fieldClass(!!errors.email)}
                    placeholder="maria@barangay.gov.ph"
                  />
                  {emailSuggestionSuffix && !errors.email && (
                    <div className="absolute inset-y-0 left-0 pl-11 flex items-center pointer-events-none overflow-hidden pr-4">
                      <span className="text-sm font-medium opacity-0 select-none whitespace-pre">
                        {email}
                      </span>
                      <span className="text-sm font-medium text-zinc-400/60 select-none pointer-events-none">
                        {emailSuggestionSuffix}
                      </span>
                    </div>
                  )}
                </div>
                <AnimatePresence>
                  {errors.email && (
                    <motion.p
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="text-xs font-semibold text-rose-500"
                    >
                      {errors.email}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
                  Barangay / Organization (optional)
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
                    className={fieldClass(false)}
                    placeholder="e.g. Barangay Poblacion"
                  />
                </div>
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

              {/* Modern I'm Not A Robot Checkbox Widget */}
              <div className="pt-2">
                <ModernRobotCheckbox
                  onVerify={(val) => {
                    setIsCaptchaVerified(val);
                    if (errors.captcha) {
                      setErrors((prev) => {
                        const next = { ...prev };
                        delete next.captcha;
                        return next;
                      });
                    }
                  }}
                  isVerified={isCaptchaVerified}
                  errorMsg={errors.captcha}
                />
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
