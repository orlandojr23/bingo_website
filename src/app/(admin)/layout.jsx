"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Menu } from "lucide-react";
import Sidebar from "@/components/layout/sidebar";
import { AdminShellSkeleton } from "@/components/ui/skeletons";
import { supabase } from "@/lib/supabase";
import { useNotifications } from "@/lib/notifications";
import { playDing } from "@/lib/sounds";
import { useToast } from "@/components/pwa/Toast";
import { reinitSupabaseSync } from "@/lib/live-route";

// Announces every new admin notification (route started, truck arrived at a
// stop, new resident report, ...): ding + toast. Sound alone is unreliable —
// browsers keep audio suspended until the next click, so an idle tab would
// stay silent; the toast guarantees a visible signal regardless. "Seen" is
// remembered in localStorage, so a reload — or a slow first sync that starts
// empty — never replays for old entries.
function useAdminNotificationSound(notify) {
  const items = useNotifications("admin");
  const seenRef = useRef(undefined);
  useEffect(() => {
    const KEY = "bingo_seen_notif_admin";
    const latest = items[0];
    if (seenRef.current === undefined) {
      let stored = null;
      try {
        stored = localStorage.getItem(KEY);
      } catch {}
      if (stored) {
        seenRef.current = stored;
        return;
      }
      if (items.length === 0) return;
      seenRef.current = latest?.id ?? null;
      try {
        if (latest) localStorage.setItem(KEY, latest.id);
      } catch {}
      return;
    }
    if (latest && latest.id !== seenRef.current) {
      seenRef.current = latest.id;
      try {
        localStorage.setItem(KEY, latest.id);
      } catch {}
      playDing();
      notify?.(latest.title || "New notification.");
    }
  }, [items, notify]);
}

export default function AdminLayout({ children }) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const { toast, ToastViewport } = useToast();
  useAdminNotificationSound(toast);

  useEffect(() => {
    let active = true;

    const checkAdmin = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          if (active) {
            setChecking(false);
            router.replace("/admin-login");
          }
          return;
        }

        // Check profiles table for the admin role
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();

        const role = profile?.role || session.user?.user_metadata?.role;
        
        if (active) {
          if (role === "admin") {
            reinitSupabaseSync().then(() => {
              if (active) setAuthorized(true);
            });
          } else {
            router.replace("/admin-login");
          }
          setChecking(false);
        }
      } catch (err) {
        if (active) {
          setChecking(false);
          router.replace("/admin-login");
        }
      }
    };

    checkAdmin();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setAuthorized(false);
        router.replace("/admin-login");
      } else {
        // Re-check profile on session change
        checkAdmin();
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
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

      {ToastViewport}
    </div>
  );
}
