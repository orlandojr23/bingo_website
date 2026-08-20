import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function LandingLayout({ children }) {
  return (
    <div className="min-h-screen flex flex-col font-sans bg-white">
      {/* Floating Sticky Logo */}
      <div className="fixed top-1 z-50 pointer-events-none w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-[72px] flex items-center">
          <Link href="/" className="inline-flex items-center gap-3 group pointer-events-auto">
            <img 
              src="/logo-green-v2.png" 
              alt="Bin-Go Logo" 
              className="h-20 w-auto object-contain mix-blend-multiply origin-left scale-[1.65]" 
            />
          </Link>
        </div>
      </div>

      <header className="absolute top-0 left-0 w-full z-40 bg-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-[72px] flex items-center justify-between">
          {/* Spacer to match the logo width and maintain layout alignment */}
          <div className="w-[220px] shrink-0" />
          
          <nav className="flex items-center gap-6">
            <Link href="/" className="text-sm font-bold text-zinc-600 hover:text-emerald-700 transition-colors hidden sm:block">Home</Link>
            <Link href="#about" className="text-sm font-bold text-zinc-600 hover:text-emerald-700 transition-colors hidden sm:block">About</Link>
            <Link href="#features" className="text-sm font-bold text-zinc-600 hover:text-emerald-700 transition-colors hidden sm:block">Features</Link>
            <Link href="#faq" className="text-sm font-bold text-zinc-600 hover:text-emerald-700 transition-colors hidden sm:block">FAQ</Link>
            <Link href="#" className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-full text-sm font-bold transition-all shadow-sm">
              Register <ArrowRight className="w-4 h-4" />
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1">
        {children}
      </main>
      <footer className="relative pt-20 pb-12 overflow-hidden border-t border-[#b8dfcc] bg-[url('/hero-bg.jpg')] bg-cover bg-bottom bg-no-repeat text-emerald-950">
        {/* Soft mint overlay to blend the background and ensure text readability */}
        <div className="absolute inset-0 bg-[#cde7dc]/90 -z-0" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          
          {/* Top Section */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 pb-16 border-b border-emerald-900/20">
            {/* Brand / Info Column */}
            <div className="md:col-span-2 flex flex-col gap-5 items-center md:items-start text-center md:text-left">
              <div className="flex items-center gap-3">
                <img 
                  src="/logo-green-v2.png" 
                  alt="Bin-Go Logo" 
                  className="h-24 w-auto object-contain mix-blend-multiply origin-left scale-[1.3]" 
                />
              </div>
              <p className="text-sm text-emerald-900/80 max-w-sm leading-relaxed font-medium">
                Empowering communities with smart, real-time waste tracking and citizen reporting to keep Metro Cebu green and clean.
              </p>
            </div>
            
            {/* Navigation Column */}
            <div className="flex flex-col gap-3 items-center md:items-start">
              <span className="font-bold text-xs uppercase tracking-wider text-emerald-900">Platform</span>
              <Link href="#" className="text-sm text-emerald-900/80 hover:text-white transition-colors font-medium">Register</Link>
              <Link href="/live-map" className="text-sm text-emerald-900/80 hover:text-white transition-colors font-medium">Incident Map</Link>
              <Link href="/dashboard" className="text-sm text-emerald-900/80 hover:text-white transition-colors font-medium">Dashboard</Link>
            </div>

            {/* Legal Column */}
            <div className="flex flex-col gap-3 items-center md:items-start">
              <span className="font-bold text-xs uppercase tracking-wider text-emerald-900">Information</span>
              <Link href="#" className="text-sm text-emerald-900/80 hover:text-white transition-colors font-medium">Privacy Policy</Link>
              <Link href="#" className="text-sm text-emerald-900/80 hover:text-white transition-colors font-medium">Terms of Service</Link>
              <Link href="#" className="text-sm text-emerald-900/80 hover:text-white transition-colors font-medium">Contact Support</Link>
            </div>
          </div>

          {/* Bottom Section with Giant Brand Text */}
          <div className="pt-12 flex flex-col items-center">
            <h2 className="text-[12vw] font-black text-emerald-900/10 tracking-tighter uppercase leading-none select-none my-8 text-center w-full">
              Bin&apos;Go
            </h2>
            <div className="w-full flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-semibold text-emerald-900/60 pt-8 border-t border-emerald-900/10">
              <span>© {new Date().getFullYear()} Cebu City LGU. Open source waste management initiative.</span>
              <span>Barangay Guadalupe Command Center</span>
            </div>
          </div>

        </div>
      </footer>
    </div>
  );
}
