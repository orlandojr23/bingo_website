"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { mockPilotData } from "@/lib/mock-data";
import { Calendar, Truck, User, MapPin, Clock, Plus, CheckCircle2 } from "lucide-react";
import { StatusBadge } from "@/components/ui/badge";

export default function DispatchPage() {
  const [selectedZone, setSelectedZone] = useState(mockPilotData.zones[0].id);
  const [selectedTruck, setSelectedTruck] = useState(mockPilotData.trucks[0].id);
  const [isScheduled, setIsScheduled] = useState(false);
  const [isCreateSheetOpen, setIsCreateSheetOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleDispatch = (e) => {
    e.preventDefault();
    setIsScheduled(true);
    setTimeout(() => {
      setIsScheduled(false);
      setIsCreateSheetOpen(false);
    }, 1500);
  };

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto pb-8 font-sans relative h-full">
      
      {/* Toolbar */}
      <div className="bg-white border-2 border-zinc-200 rounded-2xl p-4 flex flex-col sm:flex-row gap-4 items-center justify-between shadow-sm">
        <div>
          <h2 className="text-xl font-black text-zinc-900">Active Collection Schedules</h2>
          <p className="text-sm font-medium text-zinc-500">Brgy. {mockPilotData.barangay}</p>
        </div>
        <div className="flex items-center gap-4 shrink-0 w-full sm:w-auto">
          <button 
            onClick={() => setIsCreateSheetOpen(true)}
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Create Assignment
          </button>
        </div>
      </div>

      {/* Main Content: Active Schedules Table */}
      <div className="bg-white border-2 border-zinc-200 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse whitespace-nowrap">
            <thead>
              <tr className="border-b-2 border-zinc-200 bg-zinc-50/50">
                <th className="py-5 px-6 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Target Zone</th>
                <th className="py-5 px-6 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Status</th>
                <th className="py-5 px-6 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Schedule</th>
                <th className="py-5 px-6 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Assigned Truck</th>
                <th className="py-5 px-6 text-[10px] font-bold uppercase tracking-wider text-zinc-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {mockPilotData.schedules.map(sch => {
                const zone = mockPilotData.zones.find(z => z.id === sch.zoneId);
                const truck = mockPilotData.trucks.find(t => t.id === sch.activeTruckId);
                const isLive = sch.status === "In Progress";

                return (
                  <tr key={sch.id} className={`transition-colors hover:bg-zinc-50 ${isLive ? 'bg-blue-50/20' : ''}`}>
                    <td className="py-4 px-6">
                      <div className="font-bold text-zinc-900 text-sm truncate max-w-[250px]" title={zone.name}>
                        {zone.name}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <StatusBadge status={sch.status} />
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-sm font-bold text-zinc-800">{sch.days.join(", ")}</div>
                      <div className="text-xs font-medium text-zinc-500 mt-0.5">{sch.time}</div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-sm font-bold text-zinc-800">{truck.id} <span className="font-normal text-zinc-500">({truck.plate})</span></div>
                      <div className="text-xs font-medium text-zinc-500 mt-0.5 truncate max-w-[180px]">{truck.driver}</div>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button className="text-xs font-bold text-zinc-400 hover:text-emerald-600 transition-colors px-3 py-1.5 rounded-lg hover:bg-emerald-50">
                        Edit
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Assignment Side Sheet */}
      {mounted && createPortal(
        <AnimatePresence>
          {isCreateSheetOpen && (
            <div className="fixed inset-0 z-[100] flex justify-end">
              {/* Backdrop */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm" 
                onClick={() => setIsCreateSheetOpen(false)} 
              />
              
              {/* Right Sheet */}
              <motion.div 
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", stiffness: 65, damping: 20, mass: 0.8 }}
                className="relative w-full max-w-md bg-white h-full shadow-2xl border-l border-zinc-200 flex flex-col z-10"
              >
                
                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-6 flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xl font-black text-zinc-900">Create Assignment</h2>
                <button
                  onClick={() => setIsCreateSheetOpen(false)}
                  className="text-zinc-400 hover:text-zinc-900 p-2 transition-colors"
                >
                  <span className="sr-only">Close</span>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
              </div>
              <p className="text-sm font-medium text-zinc-500 mb-8">Deploy a truck to a specific zone for collection.</p>
              
              <form id="create-assignment-form" onSubmit={handleDispatch} className="space-y-5">
                
                {/* Zone Select */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">Target Zone</label>
                  <div className="relative">
                    <select 
                      value={selectedZone}
                      onChange={(e) => setSelectedZone(e.target.value)}
                      className="w-full pl-4 pr-10 py-3.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-bold text-zinc-900 focus:ring-2 focus:ring-emerald-500 outline-none appearance-none cursor-pointer truncate"
                    >
                      {mockPilotData.zones.map(zone => (
                        <option key={zone.id} value={zone.id}>{zone.name}</option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-zinc-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                  </div>
                </div>

                {/* Truck Select */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">Assign Truck</label>
                  <div className="relative">
                    <select 
                      value={selectedTruck}
                      onChange={(e) => setSelectedTruck(e.target.value)}
                      className="w-full pl-4 pr-10 py-3.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-bold text-zinc-900 focus:ring-2 focus:ring-emerald-500 outline-none appearance-none cursor-pointer truncate"
                    >
                      {mockPilotData.trucks.map(truck => (
                        <option key={truck.id} value={truck.id}>{truck.id} ({truck.plate}) - {truck.driver}</option>
                      ))}
                    </select>
                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-zinc-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                  </div>
                </div>

                {/* Schedule Type */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">Collection Type</label>
                  <div className="relative">
                    <select className="w-full pl-4 pr-10 py-3.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-bold text-zinc-900 focus:ring-2 focus:ring-emerald-500 outline-none appearance-none cursor-pointer truncate">
                      <option>Biodegradable (Malata)</option>
                      <option>Non-Biodegradable (Dili Malata)</option>
                      <option>Recyclable</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-zinc-400">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                    </div>
                  </div>
                </div>

              </form>
            </div>
            
            {/* Sticky Footer */}
            <div className="p-5 border-t border-zinc-200 bg-zinc-50 flex items-center justify-end gap-3 shrink-0">
              <button 
                type="button" 
                onClick={() => setIsCreateSheetOpen(false)} 
                className="px-5 py-2.5 text-sm font-bold text-zinc-700 bg-zinc-200 hover:bg-zinc-300 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button 
                form="create-assignment-form"
                type="submit" 
                disabled={isScheduled}
                className="min-w-[170px] justify-center px-5 py-2.5 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-80 rounded-xl shadow-md transition-all flex items-center gap-2"
              >
                {isScheduled && <CheckCircle2 className="w-4 h-4" />}
                {isScheduled ? "Truck Dispatched!" : "Dispatch Truck"}
              </button>
            </div>
            </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </div>
  );
}
