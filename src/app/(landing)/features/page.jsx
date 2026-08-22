"use client";

import { motion } from "framer-motion";
import Link from "next/link";

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-zinc-50 pt-32 pb-24">
      <div className="max-w-5xl mx-auto px-6 sm:px-12">
        
        {/* Header Section */}
        <div className="text-center mb-20">
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-zinc-900 mb-6 leading-[1.1]">
            Powerful Features, <br className="hidden sm:block" />
            <span className="text-emerald-600">Simplified.</span>
          </h1>
          <p className="text-lg text-zinc-600 font-medium max-w-2xl mx-auto leading-relaxed">
            Everything your municipality needs to track fleets, manage incident reports, and empower the community in one single platform.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-24">
          
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-zinc-100 flex flex-col items-start transition-all hover:shadow-md hover:-translate-y-1">
            <h3 className="text-xl font-bold text-zinc-900 mb-3">Live Telemetry Map</h3>
            <p className="text-zinc-600 font-medium leading-relaxed text-sm">
              Track your entire compactor truck fleet in real-time. Optimize routes and predict arrival times accurately.
            </p>
          </div>

          <div className="bg-white p-8 rounded-3xl shadow-sm border border-zinc-100 flex flex-col items-start transition-all hover:shadow-md hover:-translate-y-1">
            <h3 className="text-xl font-bold text-zinc-900 mb-3">Citizen Mobile App</h3>
            <p className="text-zinc-600 font-medium leading-relaxed text-sm">
              Empower residents to report illegal dumping with photo evidence and exact GPS coordinates instantly.
            </p>
          </div>

          <div className="bg-white p-8 rounded-3xl shadow-sm border border-zinc-100 flex flex-col items-start transition-all hover:shadow-md hover:-translate-y-1">
            <h3 className="text-xl font-bold text-zinc-900 mb-3">Analytics Dashboard</h3>
            <p className="text-zinc-600 font-medium leading-relaxed text-sm">
              Turn raw data into actionable insights. Monitor SLA resolution times and identify problematic hotspots.
            </p>
          </div>

          <div className="bg-white p-8 rounded-3xl shadow-sm border border-zinc-100 flex flex-col items-start transition-all hover:shadow-md hover:-translate-y-1">
            <h3 className="text-xl font-bold text-zinc-900 mb-3">Automated Dispatch</h3>
            <p className="text-zinc-600 font-medium leading-relaxed text-sm">
              Intelligently assign the nearest available cleanup crew to urgent incident reports without manual overhead.
            </p>
          </div>

          <div className="bg-white p-8 rounded-3xl shadow-sm border border-zinc-100 flex flex-col items-start transition-all hover:shadow-md hover:-translate-y-1">
            <h3 className="text-xl font-bold text-zinc-900 mb-3">Real-time Alerts</h3>
            <p className="text-zinc-600 font-medium leading-relaxed text-sm">
              Get notified immediately when critical incidents occur or when trucks deviate from their scheduled routes.
            </p>
          </div>

          <div className="bg-white p-8 rounded-3xl shadow-sm border border-zinc-100 flex flex-col items-start transition-all hover:shadow-md hover:-translate-y-1">
            <h3 className="text-xl font-bold text-zinc-900 mb-3">Role-based Access</h3>
            <p className="text-zinc-600 font-medium leading-relaxed text-sm">
              Secure your operations with strict permission levels for dispatchers, drivers, and top-level administrators.
            </p>
          </div>

        </div>

        {/* CTA */}
        <div className="bg-zinc-900 rounded-3xl p-8 sm:p-12 text-center relative overflow-hidden">
          <div className="relative z-10">
            <h3 className="text-2xl sm:text-3xl font-black text-white mb-4">See these features in action.</h3>
            <p className="text-zinc-400 font-medium mb-8 max-w-lg mx-auto">
              Request a live demo to see how Bin'Go can transform your municipality's waste management workflow.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/#home" className="w-full sm:w-auto px-8 py-3 bg-emerald-600 text-white rounded-full font-bold hover:bg-emerald-500 transition-colors">
                Back to Home
              </Link>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
