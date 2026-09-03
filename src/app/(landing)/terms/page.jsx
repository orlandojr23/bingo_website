"use client";

import { motion } from "framer-motion";

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-zinc-50 pt-24 sm:pt-32 pb-16 sm:pb-24">
      <div className="max-w-4xl mx-auto px-4 sm:px-12">
        {/* Header Section */}
        <div className="text-center mb-10 sm:mb-16">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl sm:text-5xl font-black tracking-tight text-zinc-900 mb-4 sm:mb-6"
          >
            Terms of Service
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-sm sm:text-lg text-zinc-500 font-medium max-w-2xl mx-auto leading-relaxed"
          >
            Please read these terms carefully before using the Bin'Go platform to understand your rights and obligations.
          </motion.p>
        </div>

        {/* Content Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-3xl shadow-sm border border-zinc-200 p-6 sm:p-12 space-y-8 sm:space-y-12"
        >
          {/* Term Item */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-zinc-900">1. Acceptance of Terms</h2>
            <div className="space-y-3 text-zinc-600 font-medium leading-relaxed">
              <p>
                By accessing or using the Bin'Go mobile application and web dashboard, you agree to be bound by these Terms of Service. If you disagree with any part of the terms, you may not access the platform.
              </p>
            </div>
          </section>

          <hr className="border-zinc-100" />

          {/* Term Item */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-zinc-900">2. User Responsibilities</h2>
            <div className="space-y-3 text-zinc-600 font-medium leading-relaxed">
              <ul className="list-disc pl-5 space-y-2">
                <li>You must provide accurate and complete information when creating an account.</li>
                <li>You are responsible for safeguarding the password that you use to access the service.</li>
                <li>When reporting illegal dumping or waste collection issues, you agree to submit truthful and accurate information to the best of your knowledge.</li>
              </ul>
            </div>
          </section>

          <hr className="border-zinc-100" />

          {/* Term Item */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-zinc-900">3. Platform Misuse</h2>
            <div className="space-y-3 text-zinc-600 font-medium leading-relaxed">
              <p>
                Any abuse of the reporting system, including submitting fake reports or spamming the barangay or the Bin'Go team, may result in the immediate suspension or termination of your account without prior notice.
              </p>
              <p className="text-sm bg-zinc-50 p-4 rounded-xl border border-zinc-100">
                Last Updated: August 25, 2026
              </p>
            </div>
          </section>
        </motion.div>
      </div>
    </div>
  );
}
