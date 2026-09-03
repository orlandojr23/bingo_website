"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Menu } from "lucide-react";
import Sidebar from "@/components/layout/sidebar";
import { AdminShellSkeleton } from "@/components/ui/skeletons";
import { supabase } from "@/lib/supabase";
import { useNotifications } from "@/lib/notifications";
import { playDing } from "@/lib/sounds";

// Dings whenever a new admin notification lands (route started, truck arrived
// at a stop, ...). The snapshot present on mount is only recorded, so opening
// an admin page never replays sounds for old entries.
function useAdminNotificationSound() {
  const items = useNotifications("admin");
  const seenRef = useRef(undefined);
  useEffect(() => {
    const latest = items[0];
    if (seenRef.current === undefined) {
      seenRef.current = latest?.id ?? null;
      return;
    }
    if (latest && latest.id !== seenRef.current) {
      seenRef.current = latest.id;
      playDing();
    }
  }, [items]);
}

export default function AdminLayout({ children }) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  useAdminNotificationSound();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.user_metadata?.role === "admin") {
        setAuthorized(true);
      } else {
        router.replace("/admin-login");
      }
      setChecking(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const isAdmin = session?.user?.user_metadata?.role === "admin";
      setAuthorized(isAdmin);
      if (!isAdmin) router.replace("/admin-login");
    });

    return () => subscription.unsubscribe();
  }, [router]);

  if (checking || !authorized) {
    return <AdminShellSkeleton />;
  }

  return (
    <div className="flex min-h-[100dvh] w-full bg-background text-foreground lg:h-screen lg:overflow-hidden">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <div className="sticky top-0 z-20 flex p-3 pb-0 lg:hidden">
          <button
            type="button"
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" strokeWidth={1.75} />
          </button>
        </div>

        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto overflow-x-hidden animate-in-fade">
          {children}
        </main>
      </div>
    </div>
  );
}
