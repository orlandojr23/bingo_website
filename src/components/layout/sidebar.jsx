"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  LayoutGrid,
  Map,
  Ticket,
  BarChart3,
  Bell,
  Settings,
  LogOut,
  X,
  Truck,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useUnreadCount } from "@/lib/notifications";
import { motion, AnimatePresence } from "framer-motion";

const navItems = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutGrid },
  { name: "Fleet Dispatch", href: "/dispatch", icon: Truck },
  { name: "Drivers", href: "/staff", icon: Users },
  { name: "Live Map", href: "/live-map", icon: Map },
  { name: "Reports", href: "/tickets", icon: Ticket },
  { name: "Data & Insights", href: "/analytics", icon: BarChart3 },
  { name: "Notifications", href: "/notifications", icon: Bell },
];

export default function Sidebar({ isOpen, onClose }) {
  const pathname = usePathname();
  const router = useRouter();
  const [showSignOutModal, setShowSignOutModal] = useState(false);
  const unreadNotifications = useUnreadCount("admin");

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch {}
    router.replace("/admin-login");
  };

  const sidebarContent = (
    <div className="flex h-full w-[280px] sm:w-64 shrink-0 flex-col border-r border-border-subtle bg-card lg:w-72">
      <div className="flex h-16 shrink-0 items-center justify-between overflow-hidden border-b border-border-subtle px-5">
        <Link href="/dashboard" className="flex items-center" onClick={() => onClose && onClose()}>
          <img
            src="/logo-green-v2.png"
            alt="Bin-Go Logo"
            className="h-12 w-auto shrink-0 object-contain origin-left scale-[2.05]"
          />
        </Link>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:text-foreground lg:hidden cursor-pointer"
            aria-label="Close navigation"
          >
            <X className="h-5 w-5" />
          </button>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname?.startsWith(`${item.href}/`);
          const badge =
            item.href === "/notifications" ? unreadNotifications : 0;
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => onClose && onClose()}
              className={cn(
                "group flex items-center justify-between rounded-lg px-3.5 py-2.5 text-sm font-medium transition-colors sm:py-2",
                isActive
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              )}
            >
              <div className="flex items-center gap-3">
                <item.icon
                  className={cn(
                    "h-4 w-4 shrink-0 transition-colors",
                    isActive
                      ? "text-accent-emerald"
                      : "text-muted-foreground/70 group-hover:text-muted-foreground"
                  )}
                  strokeWidth={1.75}
                />
                <span>{item.name}</span>
              </div>
              {badge > 0 && (
                <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-emerald-600 px-1.5 text-[10px] font-bold leading-none text-white">
                  {badge > 99 ? "99+" : badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      <div className="mt-auto flex shrink-0 flex-col gap-3 border-t border-border-subtle px-3 pb-4 pt-3">
        <div className="flex items-center gap-3 px-2 py-1">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-xs font-semibold text-zinc-700">
            MS
          </div>
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-semibold leading-tight text-foreground">
              Brgy. Tejero
            </span>
            <span className="mt-0.5 truncate text-xs leading-tight text-muted-foreground">
              Officer Maria Santos
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Link
            href="/settings"
            onClick={() => onClose && onClose()}
            className={cn(
              "flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-border px-3 py-2 text-xs font-medium transition-colors",
              pathname === "/settings"
                ? "bg-muted text-foreground"
                : "bg-card text-zinc-700 hover:border-zinc-300 hover:bg-muted/60"
            )}
          >
            <Settings
              className={cn(
                "h-3.5 w-3.5",
                pathname === "/settings"
                  ? "text-accent-emerald"
                  : "text-muted-foreground"
              )}
              strokeWidth={1.75}
            />
            <span>Settings</span>
          </Link>

          <button
            type="button"
            onClick={() => setShowSignOutModal(true)}
            className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-zinc-700 transition-colors hover:border-rose-300 hover:text-rose-600"
          >
            <LogOut className="h-3.5 w-3.5 text-muted-foreground" strokeWidth={1.75} />
            <span>Sign Out</span>
          </button>
        </div>
      </div>

      {showSignOutModal && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-zinc-950/40 p-4 backdrop-blur-sm animate-in-fade"
          onClick={() => setShowSignOutModal(false)}
        >
          <div
            className="flex w-full max-w-xs flex-col gap-4 rounded-xl border border-border bg-card p-5 shadow-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <h3 className="text-sm font-semibold text-foreground">Sign Out</h3>
              <p className="mt-1 text-xs font-medium text-muted-foreground">
                You will need to log back in to access the dashboard.
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSignOutModal(false)}
              >
                Cancel
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleSignOut}
                className="border-rose-200 text-rose-600 hover:border-rose-600 hover:bg-rose-600 hover:text-white"
              >
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      <aside className="sticky top-0 z-30 hidden h-screen lg:flex">
        {sidebarContent}
      </aside>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex pointer-events-none lg:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="fixed inset-0 bg-zinc-950/50 backdrop-blur-xs pointer-events-auto"
              onClick={onClose}
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className="relative z-50 flex h-full flex-col shadow-2xl pointer-events-auto"
            >
              {sidebarContent}
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
