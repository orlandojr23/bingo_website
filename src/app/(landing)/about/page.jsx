"use client";

import { motion } from "framer-motion";
import { Leaf, Users, Map, ShieldCheck } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-zinc-50 pt-32 pb-24">
      <div className="max-w-4xl mx-auto px-6 sm:px-12">
        
        {/* Header Section */}
        <div className="text-center mb-20">
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-zinc-900 mb-6 leading-[1.1]">
            Building Cleaner Communities,{" "}
            <br className="hidden sm:block" />
            <span className="text-emerald-600">Together.</span>
          </h1>
          <p className="text-lg text-zinc-600 font-medium max-w-2xl mx-auto leading-relaxed">
            Bin'Go was founded with a singular mission: to bridge the gap between citizens and local government units (LGUs) through transparent, real-time waste management technology.
          </p>
        </div>

        {/* Mission Content */}
        <div className="prose prose-lg prose-zinc mx-auto mb-24">
          <p className="text-zinc-700 font-medium leading-relaxed">
            For decades, municipal waste collection has operated in the dark. Citizens drag their bins to the curb not knowing exactly when the truck will arrive, and dispatchers struggle to optimize routes without real-time telemetry. When illegal dumping occurs, it often goes unreported for weeks.
          </p>
          <p className="text-zinc-700 font-medium leading-relaxed mt-6">
            We built Bin'Go to change that. By putting live tracking apps in the hands of citizens, and powerful, data-driven dashboards in the offices of LGUs, we are turning waste management into a collaborative, community-driven effort.
          </p>
        </div>

        {/* Core Values Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-24">
          
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-zinc-100">
            <div className="mb-4">
              <h3 className="text-xl font-bold text-zinc-900">Transparency</h3>
            </div>
            <p className="text-zinc-600 font-medium leading-relaxed">
              No more guessing games. We provide real-time GPS tracking of all sanitation vehicles so citizens can plan their day around actual arrival times.
            </p>
          </div>

          <div className="bg-white p-8 rounded-3xl shadow-sm border border-zinc-100">
            <div className="mb-4">
              <h3 className="text-xl font-bold text-zinc-900">Community First</h3>
            </div>
            <p className="text-zinc-600 font-medium leading-relaxed">
              We empower citizens to actively participate in keeping their neighborhoods clean through intuitive, rapid incident reporting tools.
            </p>
          </div>

          <div className="bg-white p-8 rounded-3xl shadow-sm border border-zinc-100">
            <div className="mb-4">
              <h3 className="text-xl font-bold text-zinc-900">Sustainability</h3>
            </div>
            <p className="text-zinc-600 font-medium leading-relaxed">
              By optimizing routes with real-time data, we help municipalities reduce fuel consumption, lower emissions, and run greener fleets.
            </p>
          </div>

          <div className="bg-white p-8 rounded-3xl shadow-sm border border-zinc-100">
            <div className="mb-4">
              <h3 className="text-xl font-bold text-zinc-900">Accountability</h3>
            </div>
            <p className="text-zinc-600 font-medium leading-relaxed">
              Every dispatched truck, collected bin, and resolved incident is logged on the blockchain-inspired immutable ledger for complete LGU accountability.
            </p>
          </div>

        </div>

        {/* Join Us CTA */}
        <div className="bg-zinc-900 rounded-3xl p-8 sm:p-12 text-center relative overflow-hidden">
          <div className="relative z-10">
            <h3 className="text-2xl sm:text-3xl font-black text-white mb-4">Ready to transform your city?</h3>
            <p className="text-zinc-400 font-medium mb-8 max-w-lg mx-auto">
              Whether you are a citizen looking to download the app, or an LGU official wanting to deploy the dashboard.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button className="w-full sm:w-auto px-8 py-3 bg-emerald-600 text-white rounded-full font-bold hover:bg-emerald-500 transition-colors">
                Request Demo
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
