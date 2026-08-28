"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Menu } from "lucide-react";
import Sidebar from "@/components/layout/sidebar";
import { supabase } from "@/lib/supabase";

export default function AdminLayout({ children }) {
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [checking, setChecking] = useState(true);
  const [authorized, setAuthorized] = useState(false);

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
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-500/30 border-t-emerald-500" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <button
          onClick={() => setSidebarOpen(true)}
          className="m-4 mb-0 self-start rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground lg:hidden"
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" strokeWidth={1.75} />
        </button>
        <main className="flex min-h-0 min-w-0 flex-1 flex-col animate-in-fade">
          {children}
        </main>
      </div>
    </div>
  );
}
