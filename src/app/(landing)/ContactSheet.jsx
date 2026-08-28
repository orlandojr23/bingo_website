"use client";

import { useEffect, useState } from "react";
import { X, Mail, MessageSquare, Loader2, User } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

export default function ContactSheet({ isOpen, onClose }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (isOpen) {
      setError("");
      setSuccess("");
      setName("");
      setEmail("");
      setMessage("");
    }
  }, [isOpen]);

  const validateEmail = (emailStr) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailStr);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (name.trim().length < 2) {
      setError("Please enter your name.");
      return;
    }
    if (!validateEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (message.trim().length < 10) {
      setError("Please provide a bit more detail in your message.");
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
                    Get in touch
                  </h1>
                  <p className="text-zinc-500 font-medium leading-relaxed">
                    Have a question or need assistance with the Bin'Go platform? Send us a message and our support team will help you out.
                  </p>
                </div>

                {/* Form */}
                <form className="space-y-6" onSubmit={handleSubmit}>
                  
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">Your Name</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-400">
                        <User className="w-5 h-5" />
                      </div>
                      <input 
                        type="text" 
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        disabled={isSubmitting}
                        className="w-full pl-11 pr-4 py-3.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all placeholder:text-zinc-400 text-zinc-900 disabled:opacity-60"
                        placeholder="Juan Dela Cruz"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">Email Address</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-400">
                        <Mail className="w-5 h-5" />
                      </div>
                      <input 
                        type="email" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        disabled={isSubmitting}
                        className="w-full pl-11 pr-4 py-3.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all placeholder:text-zinc-400 text-zinc-900 disabled:opacity-60"
                        placeholder="juan@example.com"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">Message</label>
                    <div className="relative">
                      <div className="absolute top-3 left-0 pl-4 flex items-start pointer-events-none text-zinc-400">
                        <MessageSquare className="w-5 h-5" />
                      </div>
                      <textarea 
                        required
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        disabled={isSubmitting}
                        rows={4}
                        className="w-full pl-11 pr-4 py-3.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all placeholder:text-zinc-400 text-zinc-900 disabled:opacity-60 resize-none"
                        placeholder="How can we help you today?"
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
                      disabled={isSubmitting || !!success}
                      className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-600/70 text-white py-4 rounded-xl text-sm font-bold transition-all shadow-lg shadow-emerald-600/20 hover:shadow-xl hover:-translate-y-0.5 disabled:transform-none"
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
