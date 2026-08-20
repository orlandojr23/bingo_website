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
            <Link href="/" className="text-sm font-bold text-zinc-600 hover:text-emerald-700 transition-colors hidden sm:block">Home</Link>
            <Link href="#about" className="text-sm font-bold text-zinc-600 hover:text-emerald-700 transition-colors hidden sm:block">About</Link>
            <Link href="#features" className="text-sm font-bold text-zinc-600 hover:text-emerald-700 transition-colors hidden sm:block">Features</Link>
            <Link href="#faq" className="text-sm font-bold text-zinc-600 hover:text-emerald-700 transition-colors hidden sm:block">FAQ</Link>
            <Link href="/dashboard" className="flex items-center gap-2 bg-zinc-900 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-full text-sm font-bold transition-all shadow-sm">
              Admin Portal <ArrowRight className="w-4 h-4" />
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1">
        {children}
      </main>
      <footer className="bg-zinc-50 border-t border-zinc-200/60 py-16 text-zinc-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-12 pb-12 border-b border-zinc-200/40">
            {/* Brand Column */}
            <div className="md:col-span-2 flex flex-col gap-4 items-center md:items-start text-center md:text-left">
              <div className="flex items-center gap-3">
                <img 
                  src="/logo-green-v2.png" 
                  alt="Bin-Go Logo" 
                  className="h-16 w-auto object-contain mix-blend-multiply origin-left scale-[1.3]" 
                />
              </div>
              <p className="text-sm text-zinc-500 max-w-sm leading-relaxed">
                Empowering communities with smart, real-time waste tracking and citizen reporting to keep Metro Cebu green and clean.
              </p>
            </div>
            
            {/* Quick Links Column */}
            <div className="flex flex-col gap-3 items-center md:items-start">
              <span className="font-bold text-xs uppercase tracking-wider text-zinc-900">Platform</span>
              <Link href="/dashboard" className="text-sm text-zinc-500 hover:text-emerald-700 transition-colors">Admin Portal</Link>
              <Link href="/live-map" className="text-sm text-zinc-500 hover:text-emerald-700 transition-colors">Incident Map</Link>
            </div>

            {/* Legal & Info Column */}
            <div className="flex flex-col gap-3 items-center md:items-start">
              <span className="font-bold text-xs uppercase tracking-wider text-zinc-900">Information</span>
              <Link href="#" className="text-sm text-zinc-500 hover:text-emerald-700 transition-colors">Privacy Policy</Link>
              <Link href="#" className="text-sm text-zinc-500 hover:text-emerald-700 transition-colors">Terms of Service</Link>
              <Link href="#" className="text-sm text-zinc-500 hover:text-emerald-700 transition-colors">Contact Support</Link>
            </div>
          </div>

          <div className="pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-medium text-zinc-400">
            <span>© {new Date().getFullYear()} Cebu City LGU. Open source waste management initiative.</span>
            <div className="flex gap-6">
              <span>Barangay Guadalupe Command Center</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
