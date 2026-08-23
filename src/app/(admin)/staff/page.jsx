"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Plus, Search, Truck, User, UserPlus, MoreVertical, Edit2, Trash2 } from "lucide-react";

// Mock data for initial staff
const initialStaff = [
  { id: "DRV-001", name: "Juan Dela Cruz", role: "Driver", truck: "Truck 01 (GW-8821)", username: "juan.driver", status: "Active" },
  { id: "DRV-002", name: "Pedro Reyes", role: "Driver", truck: "Truck 02 (XYZ-1234)", username: "pedro.driver", status: "Active" },
];

export default function StaffPage() {
  const [staff, setStaff] = useState(initialStaff);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Form state
  const [newName, setNewName] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newTruck, setNewTruck] = useState("Truck 03 (Unassigned)");

  const handleAddDriver = (e) => {
    e.preventDefault();
    const newDriver = {
      id: `DRV-00${staff.length + 1}`,
      name: newName,
      role: "Driver",
      truck: newTruck,
      username: newUsername,
      status: "Active",
    };
    setStaff([...staff, newDriver]);
    setIsAddModalOpen(false);
    // Reset form
    setNewName("");
    setNewUsername("");
    setNewPassword("");
    setNewTruck("Truck 03 (Unassigned)");
  };

  const filteredStaff = staff.filter(person => 
    person.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    person.truck.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto pb-8 font-sans relative h-full">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-zinc-900 tracking-tight">Staff & Drivers</h1>
          <p className="text-zinc-500 font-medium text-sm mt-1">
            Manage internal municipal accounts and fleet assignments.
          </p>
        </div>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm"
        >
          <UserPlus className="w-4 h-4" />
          Add Driver
        </button>
      </div>

      {/* Toolbar */}
      <div className="bg-white border-2 border-zinc-200 rounded-2xl p-4 flex flex-col sm:flex-row gap-4 items-center justify-between shadow-sm">
        <div className="relative w-full sm:max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-zinc-400" />
          </div>
          <input
            type="text"
            placeholder="Search by name or truck..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border-2 border-zinc-100 bg-zinc-50 rounded-xl text-sm font-medium focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:bg-white outline-none transition-all"
          />
        </div>
        <div className="flex items-center gap-2 text-sm font-bold text-zinc-500">
          Total Staff: <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">{staff.length}</span>
        </div>
      </div>

      {/* Staff Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredStaff.map((person) => (
          <div key={person.id} className="bg-white border-2 border-zinc-200 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow group flex flex-col h-full">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-lg">
                  {person.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-black text-zinc-900 leading-tight">{person.name}</h3>
                  <p className="text-xs font-bold text-emerald-600 tracking-wide uppercase mt-1">{person.role}</p>
                </div>
              </div>
              <button className="text-zinc-400 hover:text-zinc-600 transition-colors p-1 opacity-0 group-hover:opacity-100">
                <MoreVertical className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 flex flex-col gap-3 mt-2">
              <div className="flex items-center justify-between py-2 border-b border-zinc-100 gap-4">
                <span className="text-xs font-bold text-zinc-400 flex items-center gap-1.5 shrink-0"><User className="w-4 h-4" /> Username</span>
                <span className="text-sm font-bold text-zinc-700 font-mono text-right truncate">{person.username}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-zinc-100 gap-4">
                <span className="text-xs font-bold text-zinc-400 flex items-center gap-1.5 shrink-0"><Truck className="w-4 h-4" /> Assignment</span>
                <span className="text-sm font-bold text-zinc-700 text-right">{person.truck}</span>
              </div>
            </div>

            <div className="mt-6 flex items-center gap-2">
              <button className="flex-1 py-2 text-xs font-bold text-zinc-600 bg-zinc-50 hover:bg-zinc-100 border border-zinc-200 rounded-xl transition-colors flex items-center justify-center gap-1">
                <Edit2 className="w-3 h-3" /> Edit
              </button>
              <button className="flex-1 py-2 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-100 rounded-xl transition-colors flex items-center justify-center gap-1">
                <Trash2 className="w-3 h-3" /> Revoke
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Driver Side Sheet */}
      {isAddModalOpen && mounted && createPortal(
        <div className="fixed inset-0 z-[100] flex justify-end">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm animate-in-fade" 
            onClick={() => setIsAddModalOpen(false)} 
          />
          
          {/* Right Sheet */}
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl border-l border-zinc-200 flex flex-col animate-slide-in-right">
            
            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xl font-black text-zinc-900">Add New Driver</h2>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="text-zinc-500 hover:text-zinc-900 p-2 rounded-xl transition-colors hover:bg-zinc-100"
                >
                  <Search className="w-5 h-5 hidden" /> {/* Dummy to keep X matching layout logic */}
                  <span className="sr-only">Close</span>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
              </div>
              <p className="text-sm font-medium text-zinc-500 mb-8">Create a secure login for internal fleet staff.</p>
              
              <form id="add-driver-form" onSubmit={handleAddDriver} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">Full Name</label>
                  <input required type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Maria Santos" className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none transition-all" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">Assign Truck</label>
                  <select value={newTruck} onChange={(e) => setNewTruck(e.target.value)} className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none transition-all cursor-pointer">
                    <option>Truck 01 (GW-8821)</option>
                    <option>Truck 02 (XYZ-1234)</option>
                    <option>Truck 03 (Unassigned)</option>
                  </select>
                </div>
                <div className="pt-4 border-t border-zinc-100 mt-4 space-y-5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">Login Username</label>
                    <input required type="text" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} placeholder="e.g. maria.driver" className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-bold font-mono focus:ring-2 focus:ring-emerald-500 outline-none transition-all" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-700 uppercase tracking-wider">Temporary Password</label>
                    <input required type="text" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="e.g. default123" className="w-full px-4 py-3 bg-zinc-50 border border-zinc-200 rounded-xl text-sm font-bold font-mono focus:ring-2 focus:ring-emerald-500 outline-none transition-all" />
                    <p className="text-[10px] text-zinc-500 font-medium mt-1">The driver can change this after their first login.</p>
                  </div>
                </div>
              </form>
            </div>
            
            {/* Sticky Footer */}
            <div className="p-5 border-t border-zinc-200 bg-zinc-50 flex items-center justify-end gap-3 shrink-0">
              <button 
                type="button" 
                onClick={() => setIsAddModalOpen(false)} 
                className="px-5 py-2.5 text-sm font-bold text-zinc-700 bg-zinc-200 hover:bg-zinc-300 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button 
                form="add-driver-form"
                type="submit" 
                className="px-5 py-2.5 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md transition-all"
              >
                Create Account
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
