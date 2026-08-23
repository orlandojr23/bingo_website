"use client";

import { useState, useEffect } from "react";
import { mockPilotData } from "@/lib/mock-data";
import { CheckCircle2, Clock, MapPin, Navigation, Truck, LogOut, AlertTriangle, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import dynamic from "next/dynamic";

const MapCanvas = dynamic(() => import("@/components/map/map-canvas"), {
  ssr: false,
  loading: () => <div className="w-full h-full bg-zinc-100" />,
});

export default function DriverRoutePage() {
  const [isRouteActive, setIsRouteActive] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isSheetExpanded, setIsSheetExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  // Assign driver to the first schedule
  const currentAssignment = mockPilotData.schedules[0];

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="flex flex-col h-[100dvh] bg-zinc-50 font-sans select-none">
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col relative overflow-hidden">
        
        {/* Driver Dashboard View */}
        {!isRouteActive ? (
          <div className="flex-1 flex flex-col bg-zinc-50 animate-in-fade">

            {/* Dashboard Content */}
            <div className="flex-1 overflow-y-auto px-6 pt-8 pb-5">
              <div className="mb-6">
                <h2 className="text-2xl font-black text-zinc-900 tracking-tight">Today's Routes</h2>
                <p className="text-sm text-zinc-500 font-medium mt-1">You have 2 scheduled collection runs.</p>
              </div>
              
              <div className="flex flex-col gap-3">
                
                {[
                  { id: 1, name: mockPilotData.zones[0].name, time: currentAssignment.time, type: currentAssignment.type, active: true },
                  { id: 2, name: "South Sector (Labangon)", time: "3:00 PM - 6:00 PM", type: "Non-Biodegradable", active: false }
                ].map((route, i) => (
                  <div key={route.id} className={`p-4 rounded-2xl border-2 flex items-center justify-between transition-all ${route.active ? 'bg-white border-zinc-200 shadow-sm' : 'bg-transparent border-zinc-200/50 opacity-70'}`}>
                    <div className="flex flex-col gap-1">
                      <h3 className={`font-bold text-[15px] leading-tight ${route.active ? 'text-zinc-900' : 'text-zinc-600'}`}>
                        {route.name}
                      </h3>
                      <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-500">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{route.time}</span>
                      </div>
                    </div>
                    
                    {route.active ? (
                      <button 
                        onClick={() => setIsRouteActive(true)}
                        className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full font-bold text-xs shadow-sm active:scale-95 transition-all"
                      >
                        Start
                      </button>
                    ) : (
                      <span className="text-[11px] font-bold uppercase tracking-widest text-zinc-400 px-3">
                        Later
                      </span>
                    )}
                  </div>
                ))}

              </div>
            </div>

            {/* Driver Profile Footer */}
            <div 
              className="bg-zinc-900 text-white p-5 shrink-0 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] z-20"
              style={{ paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom))' }}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 bg-emerald-600 rounded-full flex items-center justify-center border border-emerald-500/50 shadow-sm shrink-0">
                    <span className="text-[15px] font-bold text-white tracking-widest">JD</span>
                  </div>
                  <div>
                    <h1 className="font-bold text-base leading-tight">Juan Dela Cruz</h1>
                    <p className="text-xs text-zinc-400 font-medium">Driving Truck 01 (GW-8821)</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowLogoutModal(true)}
                  className="px-4 py-2 flex items-center gap-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 active:scale-95 text-zinc-300 hover:text-white transition-all text-xs font-bold uppercase tracking-wide border border-zinc-700"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Logout</span>
                </button>
              </div>
            </div>

          </div>
        ) : (
          /* Active Route Map View */
          <div className="flex-1 relative flex flex-col bg-zinc-100 animate-in-slide-up">
            
            {/* Top Navigation / Minimize */}
            <div className="absolute top-6 left-6 z-[400] pt-safe pointer-events-none">
              <button 
                onClick={() => setIsRouteActive(false)}
                className="w-12 h-12 bg-white text-zinc-700 rounded-full shadow-lg pointer-events-auto flex items-center justify-center border border-zinc-100 active:scale-95 transition-all"
                title="Back to Dashboard"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            </div>
            
            <MapCanvas tickets={[]} mapMode="pins" />
            
            {/* Map Controls */}
            <div className="absolute bottom-28 right-6 z-[400] pb-safe flex flex-col gap-3 pointer-events-none">
              <button className="w-12 h-12 bg-white text-blue-600 rounded-full shadow-lg pointer-events-auto flex items-center justify-center border border-zinc-100 active:scale-95 transition-all" title="Follow my location">
                <Navigation className="w-5 h-5 fill-current" />
              </button>
            </div>

            {/* Floating Action Buttons */}
            <div className="absolute bottom-8 left-0 right-0 z-[400] pb-safe pointer-events-none flex justify-center">
              {/* Main Primary Action */}
              <button 
                onClick={() => setIsRouteActive(false)}
                className="px-8 py-4 bg-rose-600 active:bg-rose-700 text-white rounded-full font-bold text-[15px] shadow-[0_8px_30px_rgba(225,29,72,0.3)] pointer-events-auto transition-all active:scale-[0.98] flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-5 h-5" />
                Finish Route
              </button>
            </div>
            
          </div>
        )}
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-[1000] bg-black/50 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm flex flex-col gap-6 shadow-2xl">
            <h3 className="text-lg font-bold text-zinc-900">Sign out?</h3>
            <div className="flex justify-end gap-2 font-bold text-sm">
              <button 
                onClick={() => setShowLogoutModal(false)}
                className="px-5 py-2.5 text-zinc-500 hover:text-zinc-700 active:scale-95 transition-all"
              >
                Cancel
              </button>
              <Link 
                href="/driver-login"
                className="px-5 py-2.5 text-rose-600 hover:text-rose-700 active:scale-95 transition-all"
              >
                Sign Out
              </Link>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
