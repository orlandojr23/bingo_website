"use client";

import { useEffect, useState } from "react";
import { X, Mail, MessageSquare, Loader2, User } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

const PUBLIC_DOMAINS = ["gmail.com", "yahoo.com", "outlook.com", "hotmail.com", "icloud.com"];

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

export default function ContactSheet({ isOpen, onClose }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState("");

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
    if (isOpen) {
      setErrors({});
      setSuccess("");
      setName("");
      setEmail("");
      setMessage("");
    }
  }, [isOpen]);

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

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrors({});
    setSuccess("");

    const newErrors = {};
    if (name.trim().length < 2) {
      newErrors.name = "Please enter your name (at least 2 characters).";
    }
    if (!email.trim()) {
      newErrors.email = "Please enter your email address.";
    } else if (!validateEmail(email)) {
      newErrors.email = "Please enter a valid email address.";
    }
    if (message.trim().length < 10) {
      newErrors.message = "Please provide a bit more detail (at least 10 characters).";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);
    
    // Simulate sending
    setTimeout(() => {
      setIsSubmitting(false);
      setSuccess("Message sent successfully! Our team will get back to you shortly.");
      setName("");
      setEmail("");
      setMessage("");
    }, 1200);
  };

  const fieldClass = (hasError) =>
    `w-full pl-11 pr-4 py-3.5 bg-zinc-50 border rounded-xl text-sm font-medium focus:ring-2 outline-none transition-all placeholder:text-zinc-400 text-zinc-900 disabled:opacity-60 resize-none ${
      hasError
        ? "border-rose-300 focus:ring-rose-500 focus:border-rose-500"
        : "border-zinc-200 focus:ring-emerald-500 focus:border-emerald-500"
    }`;

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
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="absolute top-4 right-4 sm:top-6 sm:right-6 p-2 transition-colors text-zinc-400 hover:text-zinc-900 z-20 disabled:opacity-50 cursor-pointer"
            >
              <X className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>

            {/* Scrollable Form Panel */}
            <div className="w-full h-full overflow-y-auto flex flex-col px-5 sm:px-12 pt-16 sm:pt-24 pb-8 sm:pb-12">
              <div className="max-w-md w-full mx-auto my-auto">
                {/* Header */}
                <div className="mb-6 sm:mb-10">
                  <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-zinc-900 mb-2 sm:mb-3 pr-4">
                    Get in touch
                  </h1>
                  <p className="text-xs sm:text-sm text-zinc-500 font-medium leading-relaxed">
                    Have a question or need assistance with the Bin'Go platform? Send us a message and our support team will help you out.
                  </p>
                </div>

                {/* Form */}
                <form className="space-y-4 sm:space-y-6" onSubmit={handleSubmit} noValidate>
                  
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">Your Name</label>
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
                    <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">Email Address</label>
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
                        placeholder="juan@example.com"
                      />
                    </div>
                    {errors.email && (
                      <p className="mt-1 text-xs font-medium text-rose-500">{errors.email}</p>
                    )}
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">Message</label>
                    <div className="relative">
                      <div className="absolute top-3 left-0 pl-4 flex items-start pointer-events-none text-zinc-400">
                        <MessageSquare className="w-5 h-5" />
                      </div>
                      <textarea 
                        value={message}
                        onChange={(e) => handleFieldChange("message", e.target.value, setMessage)}
                        disabled={isSubmitting}
                        rows={4}
                        className={fieldClass(!!errors.message)}
                        placeholder="How can we help you today?"
                      />
                    </div>
                    {errors.message && (
                      <p className="mt-1 text-xs font-medium text-rose-500">{errors.message}</p>
                    )}
                  </div>

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
                      disabled={isSubmitting || !!success}
                      className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-600/70 text-white py-4 rounded-xl text-sm font-bold transition-all shadow-lg shadow-emerald-600/20 hover:shadow-xl hover:-translate-y-0.5 disabled:transform-none cursor-pointer"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          <span>Sending...</span>
                        </>
                      ) : success ? (
                        "Sent!"
                      ) : (
                        "Send Message"
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
