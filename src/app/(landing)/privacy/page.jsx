"use client";

import { motion } from "framer-motion";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-zinc-50 pt-32 pb-24">
      <div className="max-w-4xl mx-auto px-6 sm:px-12">
        {/* Header Section */}
        <div className="text-center mb-16">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl sm:text-5xl font-black tracking-tight text-zinc-900 mb-6"
          >
            Privacy Policy
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-lg text-zinc-500 font-medium max-w-2xl mx-auto leading-relaxed"
          >
            Your privacy is our priority. Learn how we collect, use, and protect your data across the Bin'Go platform.
          </motion.p>
        </div>

        {/* Content Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-3xl shadow-sm border border-zinc-200 p-8 sm:p-12 space-y-12"
        >
          {/* Policy Item */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-zinc-900">Information We Collect</h2>
            <div className="space-y-3 text-zinc-600 font-medium leading-relaxed">
              <p>
                When you register for a Bin'Go account, we collect basic information such as your name, email address, and designated municipality/barangay. This information is strictly used to tailor your dashboard experience and authenticate you into our platform.
              </p>
              <p>
                If you use the mobile application to track trucks or report waste, we may request access to your device's location services. This data is only processed when the app is actively in use.
              </p>
            </div>
          </section>

          <hr className="border-zinc-100" />

          {/* Policy Item */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-zinc-900">How We Use Your Data</h2>
            <div className="space-y-3 text-zinc-600 font-medium leading-relaxed">
              <ul className="list-disc pl-5 space-y-2">
                <li><strong className="text-zinc-800">To Provide Service:</strong> Displaying garbage truck telemetry relative to your home area.</li>
                <li><strong className="text-zinc-800">For Citizen Reports:</strong> Sending your waste reports directly to local government dispatchers.</li>
                <li><strong className="text-zinc-800">Communication:</strong> Delivering important push notifications (like when a truck is arriving) or email updates regarding policy changes.</li>
              </ul>
            </div>
          </section>

          <hr className="border-zinc-100" />

          {/* Policy Item */}
          <section className="space-y-4">
            <h2 className="text-2xl font-bold text-zinc-900">Data Security</h2>
            <div className="space-y-3 text-zinc-600 font-medium leading-relaxed">
              <p>
                Bin'Go employs industry-standard security protocols to ensure that your personal information is kept safe. We utilize secure socket layer (SSL) technology for all network transmissions and encrypt sensitive databases. We will never sell, rent, or lease your data to third parties.
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
