"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Database,
  Map,
  Ticket,
  BarChart3,
  Bell,
  Settings,
  LogOut,
  X,
  Globe,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Create Report", href: "/crud", icon: Database },
  { name: "Live Map", href: "/live-map", icon: Map },
  { name: "Tickets Log", href: "/tickets", icon: Ticket },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
  { name: "Notifications", href: "/notifications", icon: Bell, badge: 2 },
];

export default function Sidebar({ isOpen, onClose }) {
  const pathname = usePathname();
  const [showSignOutModal, setShowSignOutModal] = useState(false);

  const sidebarContent = (
    <div className="flex flex-col h-full bg-slate-100 border-r border-slate-200 w-72 lg:w-80 shrink-0">
      {/* Brand Header */}
      <div className="h-20 px-6 flex items-center justify-between border-b border-slate-200/80">
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <img 
            src="/logo-green-v2.png" 
            alt="Bin-Go Logo" 
            className="h-20 w-auto object-contain mix-blend-multiply scale-[1.4] origin-left" 
          />
        </Link>

        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200"
            aria-label="Close navigation"
          >
            <X className="w-6 h-6" />
          </button>
        )}
      </div>

      {/* Nav List */}
      <div className="flex-1 py-5 px-3 flex flex-col gap-1.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname?.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => onClose && onClose()}
              className={cn(
                "flex items-center justify-between px-3.5 py-3 rounded-xl text-sm transition-colors group",
                isActive
                  ? "bg-white shadow-sm ring-1 ring-slate-200/80 text-emerald-600 font-bold"
                  : "text-slate-600 font-medium hover:bg-slate-200 hover:text-slate-900"
              )}
            >
              <div className="flex items-center gap-3">
                <item.icon
                  className={cn(
                    "w-4 h-4 shrink-0 transition-colors",
                    isActive
                      ? "text-emerald-600"
                      : "text-slate-400 group-hover:text-slate-600"
                  )}
                  strokeWidth={2}
                />
                <span>{item.name}</span>
              </div>
              {item.badge && (
                <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* Footer Profile & Actions */}
      <div className="px-3 pb-4 pt-2 border-t border-slate-200/60 flex flex-col gap-3 mt-auto">
        <div className="px-2 py-2 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-white ring-1 ring-slate-200 text-slate-600 flex items-center justify-center font-bold text-sm shrink-0 shadow-sm">
            GC
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-semibold text-slate-900 truncate leading-tight">
              Brgy. Guadalupe
            </span>
            <span className="text-xs text-slate-500 truncate leading-tight mt-0.5 font-medium">
              Officer Maria Santos
            </span>
          </div>
        </div>

        <Link 
          href="/" 
          className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-emerald-700 hover:border-emerald-200 transition-colors shadow-sm mb-1"
        >
          <Globe className="w-4 h-4 text-slate-500" />
          <span>View Public Site</span>
        </Link>

        <div className="grid grid-cols-2 gap-2">
          <Link
            href="/settings"
            onClick={() => onClose && onClose()}
            className={cn(
              "flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold border transition-colors shadow-sm",
              pathname === "/settings"
                ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300"
            )}
          >
            <Settings className={cn("w-4 h-4", pathname === "/settings" ? "text-emerald-600" : "text-slate-500")} />
            <span>Settings</span>
          </Link>

          <button
            type="button"
            onClick={() => setShowSignOutModal(true)}
            className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold border border-slate-200 bg-white text-slate-700 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 transition-colors shadow-sm cursor-pointer"
          >
            <LogOut className="w-4 h-4 text-slate-500" />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {/* Sign Out Confirmation Modal */}
      {showSignOutModal && (
        <div
          className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowSignOutModal(false)}
        >
          <div
            className="bg-white rounded-xl shadow-xl max-w-[280px] w-full p-5 border border-slate-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 mb-1">
              <LogOut className="w-4 h-4 text-rose-500" />
              <h4 className="text-sm font-bold text-slate-900">Sign Out</h4>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Are you sure you want to exit your administrator session?
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowSignOutModal(false)}
                className="flex-1 py-2 px-4 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => setShowSignOutModal(false)}
                className="flex-1 py-2 px-4 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 shadow-sm"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex sticky top-0 h-screen z-30">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <aside className="relative flex flex-col z-50 h-full shadow-2xl">
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}
