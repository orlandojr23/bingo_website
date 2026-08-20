import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function LandingLayout({ children }) {
  return (
    <div className="min-h-screen flex flex-col font-sans bg-white">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-zinc-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-[72px] flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <img 
              src="/logo-green-v2.png" 
              alt="Bin-Go Logo" 
              className="h-16 w-auto object-contain mix-blend-multiply origin-left scale-[1.25]" 
            />
          </Link>
          <nav className="flex items-center gap-6">
            <Link href="#features" className="text-sm font-bold text-zinc-600 hover:text-emerald-700 transition-colors hidden sm:block">Features</Link>
            <Link href="#impact" className="text-sm font-bold text-zinc-600 hover:text-emerald-700 transition-colors hidden sm:block">Impact</Link>
            <Link href="/dashboard" className="flex items-center gap-2 bg-zinc-900 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-full text-sm font-bold transition-all shadow-sm">
              Admin Portal <ArrowRight className="w-4 h-4" />
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1">
        {children}
      </main>
      <footer className="bg-zinc-50 text-zinc-500 py-12 border-t border-zinc-200/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex flex-col gap-1 items-center md:items-start">
            <span className="font-bold text-lg text-zinc-900 tracking-tight">Bin&apos;Go Municipal</span>
            <span className="text-sm font-medium">© {new Date().getFullYear()} Cebu City LGU. Open source waste management.</span>
          </div>
          <div className="flex gap-6 text-sm font-bold">
            <Link href="#" className="hover:text-emerald-600 transition-colors">Privacy</Link>
            <Link href="#" className="hover:text-emerald-600 transition-colors">Terms</Link>
            <Link href="#" className="hover:text-emerald-600 transition-colors">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
