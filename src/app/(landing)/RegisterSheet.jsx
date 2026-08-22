"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, CheckCircle2, Smartphone, ShieldCheck, Mail, Lock, User, MapPin, Laptop, X } from "lucide-react";
import Link from "next/link";

export default function RegisterSheet({ isOpen, onClose }) {
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
            className="relative w-full max-w-[500px] h-full bg-white flex shadow-[-10px_0_40px_rgba(0,0,0,0.1)] z-10"
          >
            {/* Form Panel */}
            <div className="w-full h-full overflow-y-auto flex flex-col justify-center px-8 sm:px-12 py-12 relative">
              {/* Close Button */}
              <button 
                onClick={onClose}
                className="absolute top-6 right-6 p-2 rounded-full hover:bg-zinc-100 transition-colors text-zinc-400 hover:text-zinc-600"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="max-w-md w-full mx-auto mt-8">
                {/* Header */}
                <div className="mb-10">
                  <h1 className="text-4xl font-black tracking-tight text-zinc-900 mb-3">
                    Create your account
                  </h1>
                  <p className="text-zinc-500 font-medium">
                    Join Bin'Go to start tracking municipal waste collection in real-time.
                  </p>
                </div>

                {/* Form */}
                <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
                  
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">Full Name</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-400">
                        <User className="w-5 h-5" />
                      </div>
                      <input 
                        type="text" 
                        className="w-full pl-11 pr-4 py-3.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all placeholder:text-zinc-400 text-zinc-900"
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
                        className="w-full pl-11 pr-4 py-3.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all placeholder:text-zinc-400 text-zinc-900"
                        placeholder="juan@example.com"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">Municipality / Barangay</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-400">
                        <MapPin className="w-5 h-5" />
                      </div>
                      <input 
                        type="text" 
                        className="w-full pl-11 pr-4 py-3.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all placeholder:text-zinc-400 text-zinc-900"
                        placeholder="e.g. Guadalupe, Cebu City"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">Password</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-400">
                        <Lock className="w-5 h-5" />
                      </div>
                      <input 
                        type="password" 
                        className="w-full pl-11 pr-4 py-3.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all placeholder:text-zinc-400 text-zinc-900"
                        placeholder="••••••••"
                      />
                    </div>
                  </div>

                  <div className="pt-2">
                    <button 
                      type="submit"
                      className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-xl text-sm font-bold transition-all shadow-lg shadow-emerald-600/20 hover:shadow-xl hover:-translate-y-0.5"
                    >
                      Create Account
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
