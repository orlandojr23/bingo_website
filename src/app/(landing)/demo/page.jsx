"use client";

import { useState } from "react";
import Link from "next/link";
import {
  User,
  Mail,
  Building2,
  MessageSquare,
  Loader2,
  CheckCircle2,
} from "lucide-react";

const validateEmail = (emailStr) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailStr);

export default function DemoPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [org, setOrg] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(false);

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
    `w-full pl-11 pr-4 py-3.5 bg-zinc-50 border rounded-xl text-sm font-medium focus:ring-2 outline-none transition-all placeholder:text-zinc-400 text-zinc-900 disabled:opacity-60 resize-none ${
      hasError
        ? "border-rose-300 focus:ring-rose-500 focus:border-rose-500"
        : "border-zinc-200 focus:ring-emerald-500 focus:border-emerald-500"
    }`;

  return (
    <div className="min-h-screen bg-zinc-50 pt-24 sm:pt-32 pb-16 sm:pb-24">
      <div className="max-w-xl mx-auto px-6">
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
                    placeholder="Juan Dela Cruz"
                  />
                </div>
                {errors.name && (
                  <p className="mt-1 text-xs font-medium text-rose-500">{errors.name}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-400">
                    <Mail className="w-5 h-5" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => handleFieldChange("email", e.target.value, setEmail)}
                    disabled={isSubmitting}
                    className={fieldClass(!!errors.email)}
                    placeholder="juan@example.com"
                  />
                </div>
                {errors.email && (
                  <p className="mt-1 text-xs font-medium text-rose-500">{errors.email}</p>
                )}
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
                {errors.org && (
                  <p className="mt-1 text-xs font-medium text-rose-500">{errors.org}</p>
                )}
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
