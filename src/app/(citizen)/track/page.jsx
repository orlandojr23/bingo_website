"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { mockPilotData } from "@/lib/mock-data";
import { AlertCircle, Calendar, Clock, MapPin, Truck } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const MapCanvas = dynamic(() => import("@/components/map/map-canvas"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-zinc-50 text-zinc-400 text-xs">
      Loading live tracking map...
    </div>
  ),
});

export default function CitizenTrackPage() {
  const [isSheetExpanded, setIsSheetExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="relative w-full h-[100dvh] overflow-hidden bg-zinc-50 flex flex-col font-sans">
      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 z-20 bg-white/80 backdrop-blur-md border-b border-zinc-200/50 p-4 pt-safe flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center shadow-sm">
            <span className="font-black text-white text-lg leading-none tracking-tighter">B'G</span>
          </div>
          <div>
            <h1 className="font-bold text-zinc-900 text-sm leading-tight">Brgy. {mockPilotData.barangay}</h1>
            <p className="text-[10px] text-zinc-500 font-medium">{mockPilotData.city}</p>
          </div>
        </div>
        <Link href="/" className="text-xs font-semibold text-zinc-600 px-3 py-1.5 bg-zinc-100 rounded-full hover:bg-zinc-200 transition-colors">
          Sign Out
        </Link>
      </div>

      {/* Map Area */}
      <div className="flex-1 w-full relative z-10 h-full">
        <MapCanvas tickets={[]} mapMode="pins" />
      </div>

      {/* Bottom Sheet Overlay trigger */}
      {isSheetExpanded && (
        <motion.div 
          initial={{ opacity: 0 }} 
          animate={{ opacity: 1 }} 
          exit={{ opacity: 0 }}
          onClick={() => setIsSheetExpanded(false)}
          className="absolute inset-0 bg-zinc-900/20 backdrop-blur-[2px] z-30" 
        />
      )}

      {/* Bottom Sheet */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 z-40 bg-white rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.1)] flex flex-col max-h-[85vh]"
        animate={{ y: isSheetExpanded ? 0 : "calc(100% - 130px)" }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.2}
        onDragEnd={(e, { offset, velocity }) => {
          if (offset.y > 50 || velocity.y > 500) {
            setIsSheetExpanded(false);
          } else if (offset.y < -50 || velocity.y < -500) {
            setIsSheetExpanded(true);
          }
        }}
      >
        {/* Drag Handle & Glanceable Header */}
        <div 
          className="p-5 pb-4 shrink-0 cursor-grab active:cursor-grabbing"
          onClick={() => setIsSheetExpanded(!isSheetExpanded)}
        >
          <div className="w-12 h-1.5 bg-zinc-200 rounded-full mx-auto mb-4" />
          
          <div className="flex items-center justify-between gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Live Status
              </span>
              <h2 className="text-lg font-black text-zinc-900 leading-tight">
                Truck 01 is 5 mins away
              </h2>
            </div>
            <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
              <Truck className="w-6 h-6 text-emerald-600" />
            </div>
          </div>
          
          {!isSheetExpanded && (
            <p className="text-xs text-zinc-500 font-medium mt-3 text-center">
              Swipe up for schedules & reports
            </p>
          )}
        </div>

        {/* Expanded Content Area */}
        <div className="flex-1 overflow-y-auto px-5 pb-8 flex flex-col gap-6">
          
          {/* Schedule Card */}
          <div className="bg-zinc-50 border border-zinc-100 rounded-2xl p-4 flex flex-col gap-4">
            <div className="flex items-center gap-2 text-zinc-800 font-bold text-sm">
              <Calendar className="w-4 h-4 text-zinc-400" />
              <h3>This Week's Schedule</h3>
            </div>
            
            <div className="flex flex-col gap-3">
              {mockPilotData.schedules.map((sch) => (
                <div key={sch.id} className="flex items-start gap-3 bg-white p-3 rounded-xl border border-zinc-100 shadow-sm">
                  <div className={`w-2 h-2 mt-1.5 rounded-full shrink-0 ${sch.status === 'In Progress' ? 'bg-emerald-500' : 'bg-zinc-300'}`} />
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-bold text-zinc-900">{sch.type}</span>
                    <span className="text-[11px] text-zinc-500 font-medium">
                      {sch.days.join(", ")} &bull; {sch.time}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Report Actions */}
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-bold text-zinc-800">Help Keep {mockPilotData.barangay} Clean</h3>
            <button className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md text-sm font-bold flex items-center justify-center transition-colors">
              <AlertCircle className="w-4 h-4 mr-2" />
              Report Uncollected Waste
            </button>
            <button className="w-full py-4 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-xl text-sm font-bold flex items-center justify-center transition-colors">
              <MapPin className="w-4 h-4 mr-2" />
              Report Illegal Dumping
            </button>
          </div>
          
        </div>
      </motion.div>
    </div>
  );
}
