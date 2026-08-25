"use client";

import { useState } from "react";
import Sidebar from "@/components/layout/sidebar";

export default function AdminLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] text-slate-900">
      {/* Sidebar Navigation */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <button
          onClick={() => setSidebarOpen(true)}
          className="lg:hidden m-4 mb-0 p-2.5 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-200 self-start"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
        </button>
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto animate-in-fade">
          {children}
        </main>
      </div>
    </div>
  );
}
