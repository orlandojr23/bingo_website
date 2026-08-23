"use client";

import { useState } from "react";
import { mockPilotData } from "@/lib/mock-data";
import { Calendar, Truck, User, MapPin, Clock, Plus, CheckCircle2 } from "lucide-react";
import { StatusBadge } from "@/components/ui/badge";

export default function DispatchPage() {
  const [selectedZone, setSelectedZone] = useState(mockPilotData.zones[0].id);
  const [selectedTruck, setSelectedTruck] = useState(mockPilotData.trucks[0].id);
  const [isScheduled, setIsScheduled] = useState(false);

  const handleDispatch = () => {
    setIsScheduled(true);
    setTimeout(() => setIsScheduled(false), 3000);
  };

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto pb-8 font-sans">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-zinc-900 tracking-tight">Fleet Dispatch</h1>
          <p className="text-zinc-500 font-medium text-sm mt-1">
            Assign trucks to specific barangay zones and manage schedules.
          </p>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Form */}
        <div className="lg:col-span-1 flex flex-col gap-6">
          <div className="bg-white border-2 border-zinc-200 rounded-3xl p-6 shadow-sm">
            <h2 className="text-lg font-bold text-zinc-900 mb-6">Create Assignment</h2>
            
            <div className="space-y-5">
              
              {/* Zone Select */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Target Zone</label>
                <div className="relative">
                  <select 
                    value={selectedZone}
                    onChange={(e) => setSelectedZone(e.target.value)}
                    className="w-full pl-4 pr-10 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-bold text-zinc-900 focus:ring-2 focus:ring-emerald-500 outline-none appearance-none cursor-pointer truncate"
                  >
                    {mockPilotData.zones.map(zone => (
                      <option key={zone.id} value={zone.id}>{zone.name}</option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-zinc-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </div>
              </div>

              {/* Truck Select */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Assign Truck</label>
                <div className="relative">
                  <select 
                    value={selectedTruck}
                    onChange={(e) => setSelectedTruck(e.target.value)}
                    className="w-full pl-4 pr-10 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-bold text-zinc-900 focus:ring-2 focus:ring-emerald-500 outline-none appearance-none cursor-pointer truncate"
                  >
                    {mockPilotData.trucks.map(truck => (
                      <option key={truck.id} value={truck.id}>{truck.id} ({truck.plate}) - {truck.driver}</option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-zinc-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </div>
              </div>

              {/* Schedule Type */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Collection Type</label>
                <div className="relative">
                  <select className="w-full pl-4 pr-10 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-bold text-zinc-900 focus:ring-2 focus:ring-emerald-500 outline-none appearance-none cursor-pointer truncate">
                    <option>Biodegradable (Malata)</option>
                    <option>Non-Biodegradable (Dili Malata)</option>
                    <option>Recyclable</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-zinc-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </div>
              </div>

              {/* Submit */}
              <button 
                onClick={handleDispatch}
                className="w-full py-4 mt-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2"
              >
                {isScheduled ? "Assigned Successfully" : "Publish Schedule"}
              </button>

            </div>
          </div>
        </div>

        {/* Right Column: Active Schedules */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="bg-white border-2 border-zinc-200 rounded-3xl p-6 shadow-sm h-full">
            <h2 className="text-lg font-bold text-zinc-900 mb-6 flex items-center justify-between">
              <span>Active Pilot Schedules</span>
              <span className="text-sm font-bold text-zinc-500">Brgy. {mockPilotData.barangay}</span>
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {mockPilotData.schedules.map(sch => {
                const zone = mockPilotData.zones.find(z => z.id === sch.zoneId);
                const truck = mockPilotData.trucks.find(t => t.id === sch.activeTruckId);
                const isLive = sch.status === "In Progress";

                return (
                  <div key={sch.id} className={`border-2 rounded-2xl p-5 ${isLive ? 'border-blue-500 bg-blue-50/30' : 'border-zinc-200 bg-zinc-50'}`}>
                    <div className="flex justify-between items-start mb-4 gap-3">
                      <div className="flex-1">
                        <span className="text-[10px] font-bold uppercase text-zinc-500 tracking-wider block mb-1">Zone</span>
                        <h3 className="font-bold text-zinc-900 text-sm leading-snug">{zone.name}</h3>
                      </div>
                      <div className="shrink-0 mt-2">
                        <StatusBadge status={sch.status} />
                      </div>
                    </div>

                    <div className="flex flex-col gap-3">
                      <div className="flex items-center gap-3">
                        <Calendar className="w-4 h-4 text-zinc-400 shrink-0" />
                        <span className="text-xs font-medium text-zinc-700">{sch.days.join(", ")} &bull; {sch.time}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Truck className="w-4 h-4 text-zinc-400 shrink-0" />
                        <span className="text-xs font-medium text-zinc-700">{truck.id} ({truck.plate}) &bull; {truck.driver}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
