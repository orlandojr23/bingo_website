"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Bell, PlusCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const routeMeta = {
  "/dashboard": { title: "Dashboard Overview" },
  "/crud": { title: "Create Report" },
  "/live-map": { title: "Live Map" },
  "/tickets": { title: "Reports Log" },
  "/analytics": { title: "Data & Insights" },
  "/notifications": { title: "Notifications" },
  "/settings": { title: "Settings" },
};

export default function Topbar({ onMenuClick }) {
  const pathname = usePathname();
  const current = routeMeta[pathname] || {
    title: "Admin Portal",
  };

  return (
    <header className="h-16 lg:h-20 px-4 sm:px-8 bg-white border-b border-zinc-200 sticky top-0 z-20 flex items-center justify-between gap-4">
      {/* Left: Mobile Menu & Breadcrumb */}
      <div className="flex items-center gap-4 min-w-0">
        <button
          type="button"
          onClick={onMenuClick}
          className="lg:hidden p-2.5 -ml-2 rounded-xl text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 flex items-center justify-center cursor-pointer"
          aria-label="Open Navigation Menu"
        >
          <Menu className="w-6 h-6" />
        </button>

        <div className="flex flex-col min-w-0">
          <h1 className="text-lg lg:text-2xl font-black text-zinc-900 tracking-tight truncate">
            {current.title}
          </h1>
        </div>
      </div>

      {/* Right: Quick Actions & Alerts */}
      <div className="flex items-center gap-3 sm:gap-4 shrink-0">
        <Link
          href="/crud"
          className="hidden sm:inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold transition-all shadow-sm"
        >
          <PlusCircle className="w-4 h-4" />
          <span>New Report</span>
        </Link>

        <Link
          href="/notifications"
          className="relative p-2.5 rounded-xl text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 flex items-center justify-center"
          aria-label="View Notifications"
        >
          <Bell className="w-5 h-5" />
        </Link>
      </div>
    </header>
  );
}
