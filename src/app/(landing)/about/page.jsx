"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Leaf, Users, Map, ShieldCheck } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-zinc-50 pt-24 sm:pt-32 pb-16 sm:pb-24">
      <div className="max-w-4xl mx-auto px-6 sm:px-12">
        
        {/* Header Section */}
        <div className="text-center mb-10 sm:mb-20">
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-zinc-900 mb-4 sm:mb-6 leading-[1.15]">
            Building Cleaner Communities,{" "}
            <br className="hidden sm:block" />
            <span className="text-emerald-600">Together.</span>
          </h1>
          <p className="text-sm sm:text-lg text-zinc-600 font-medium max-w-2xl mx-auto leading-relaxed">
            Bin'Go was built with one simple mission: to connect residents with their barangay so garbage collection is clear, on time, and easy for everyone.
          </p>
        </div>

        {/* Mission Content */}
        <div className="prose prose-lg prose-zinc mx-auto mb-24">
          <p className="text-zinc-700 font-medium leading-relaxed">
            For years, garbage collection has been hard to keep track of. Residents bring out their trash without knowing exactly when the truck will arrive, and collection teams have no easy way to see where their trucks are. When garbage piles up or gets dumped in the wrong place, it often goes unnoticed for weeks.
          </p>
          <p className="text-zinc-700 font-medium leading-relaxed mt-6">
            We built Bin'Go to change that. By putting live truck tracking in the hands of residents and a clear, easy-to-use dashboard in the hands of barangay officials, we are turning garbage collection into a team effort for the whole community.
          </p>
        </div>

        {/* Core Values Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-24">
          
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-zinc-100">
            <div className="mb-4">
              <h3 className="text-xl font-bold text-zinc-900">Transparency</h3>
            </div>
            <p className="text-zinc-600 font-medium leading-relaxed">
              No more guessing games. Every garbage truck is shown live on the map, so residents can plan their day around actual arrival times.
            </p>
          </div>

          <div className="bg-white p-8 rounded-3xl shadow-sm border border-zinc-100">
            <div className="mb-4">
              <h3 className="text-xl font-bold text-zinc-900">Community First</h3>
            </div>
            <p className="text-zinc-600 font-medium leading-relaxed">
              We make it easy for residents to help keep their neighborhoods clean with simple, fast waste reporting tools.
            </p>
          </div>

          <div className="bg-white p-8 rounded-3xl shadow-sm border border-zinc-100">
            <div className="mb-4">
              <h3 className="text-xl font-bold text-zinc-900">Sustainability</h3>
            </div>
            <p className="text-zinc-600 font-medium leading-relaxed">
              Better-planned collection routes mean less fuel used, less pollution, and a cleaner environment for everyone.
            </p>
          </div>

          <div className="bg-white p-8 rounded-3xl shadow-sm border border-zinc-100">
            <div className="mb-4">
              <h3 className="text-xl font-bold text-zinc-900">Accountability</h3>
            </div>
            <p className="text-zinc-600 font-medium leading-relaxed">
              Every scheduled collection and resolved report is recorded, so your barangay can always see what was done and when.
            </p>
          </div>

        </div>

        {/* Join Us CTA */}
        <div className="bg-zinc-900 rounded-3xl p-8 sm:p-12 text-center relative overflow-hidden">
          <div className="relative z-10">
            <h3 className="text-2xl sm:text-3xl font-black text-white mb-4">Ready to transform your city?</h3>
            <p className="text-zinc-400 font-medium mb-8 max-w-lg mx-auto">
              Whether you're a resident waiting to try the app, or a barangay official ready to use the dashboard, we'd love to help you get started.
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
