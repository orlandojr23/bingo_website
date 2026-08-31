"use client";

import { motion } from "framer-motion";
import Link from "next/link";

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-zinc-50 pt-24 sm:pt-32 pb-16 sm:pb-24">
      <div className="max-w-5xl mx-auto px-6 sm:px-12">
        
        {/* Header Section */}
        <div className="text-center mb-10 sm:mb-20">
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-zinc-900 mb-4 sm:mb-6 leading-[1.15]">
            Powerful Features, <br className="hidden sm:block" />
            <span className="text-emerald-600">Simplified.</span>
          </h1>
          <p className="text-sm sm:text-lg text-zinc-600 font-medium max-w-2xl mx-auto leading-relaxed">
            Everything your barangay needs to track collection trucks, manage waste reports, and keep the community clean, all in one place.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-24">
          
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-zinc-100 flex flex-col items-start transition-all hover:shadow-md hover:-translate-y-1">
            <h3 className="text-xl font-bold text-zinc-900 mb-3">Live Tracking Map</h3>
            <p className="text-zinc-600 font-medium leading-relaxed text-sm">
              See all your garbage trucks on a live map, plan better routes, and know exactly when they will arrive.
            </p>
          </div>

          <div className="bg-white p-8 rounded-3xl shadow-sm border border-zinc-100 flex flex-col items-start transition-all hover:shadow-md hover:-translate-y-1">
            <h3 className="text-xl font-bold text-zinc-900 mb-3">Resident Mobile App</h3>
            <p className="text-zinc-600 font-medium leading-relaxed text-sm">
              Let residents report uncollected garbage or dumping in seconds, complete with a photo and the exact location.
            </p>
          </div>

          <div className="bg-white p-8 rounded-3xl shadow-sm border border-zinc-100 flex flex-col items-start transition-all hover:shadow-md hover:-translate-y-1">
            <h3 className="text-xl font-bold text-zinc-900 mb-3">Data & Insights Dashboard</h3>
            <p className="text-zinc-600 font-medium leading-relaxed text-sm">
              See how fast reports get resolved and spot which areas need the most attention, all in one clear view.
            </p>
          </div>

          <div className="bg-white p-8 rounded-3xl shadow-sm border border-zinc-100 flex flex-col items-start transition-all hover:shadow-md hover:-translate-y-1">
            <h3 className="text-xl font-bold text-zinc-900 mb-3">Automatic Team Assignment</h3>
            <p className="text-zinc-600 font-medium leading-relaxed text-sm">
              The nearest available cleanup team is automatically assigned to urgent reports, so nothing waits too long.
            </p>
          </div>

          <div className="bg-white p-8 rounded-3xl shadow-sm border border-zinc-100 flex flex-col items-start transition-all hover:shadow-md hover:-translate-y-1">
            <h3 className="text-xl font-bold text-zinc-900 mb-3">Instant Alerts</h3>
            <p className="text-zinc-600 font-medium leading-relaxed text-sm">
              Get notified right away when urgent reports come in or when a truck goes off its scheduled route.
            </p>
          </div>

          <div className="bg-white p-8 rounded-3xl shadow-sm border border-zinc-100 flex flex-col items-start transition-all hover:shadow-md hover:-translate-y-1">
            <h3 className="text-xl font-bold text-zinc-900 mb-3">Team Accounts & Permissions</h3>
            <p className="text-zinc-600 font-medium leading-relaxed text-sm">
              Everyone on your team gets just the right level of access, from drivers to administrators.
            </p>
          </div>

        </div>

        {/* CTA */}
        <div className="bg-zinc-900 rounded-3xl p-8 sm:p-12 text-center relative overflow-hidden">
          <div className="relative z-10">
            <h3 className="text-2xl sm:text-3xl font-black text-white mb-4">See these features in action.</h3>
            <p className="text-zinc-400 font-medium mb-8 max-w-lg mx-auto">
              Request a demo to see how Bin'Go can make waste collection easier for your barangay.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/demo"
                className="w-48 sm:w-auto px-8 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-500 transition-colors cursor-pointer text-center"
              >
                Request a Demo
              </Link>
              <a href="/#home" className="w-48 sm:w-auto px-8 py-3 bg-zinc-800 text-white rounded-xl font-bold hover:bg-zinc-700 transition-colors cursor-pointer">
                Back to Home
              </a>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
