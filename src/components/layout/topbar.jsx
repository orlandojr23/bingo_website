"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Bell, PlusCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Topbar({ onMenuClick }) {
  const pathname = usePathname();

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

      
      </div>

      {/* Right: Quick Actions & Alerts */}
      <div className="flex items-center gap-3 sm:gap-4 shrink-0">
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
