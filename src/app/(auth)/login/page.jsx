"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function LoginRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect /login directly to /dashboard
    router.replace("/dashboard");
  }, [router]);

  return (
    <div className="min-h-screen bg-zinc-900 flex items-center justify-center">
      <div className="w-6 h-6 rounded-full border-2 border-emerald-500/30 border-t-emerald-500 animate-spin" />
    </div>
  );
}
