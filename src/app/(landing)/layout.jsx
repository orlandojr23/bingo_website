"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function LandingLayout({ children }) {
  const [scrolled, setScrolled] = useState(false);
  const [hideLogo, setHideLogo] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      setScrolled(scrollY > 40);
      
      const scrollHeight = document.documentElement.scrollHeight;
      const clientHeight = window.innerHeight;
      const totalScrollable = scrollHeight - clientHeight;
      
      // Hide the logo when the user is within 380px of the bottom (near the footer)
      setHideLogo(totalScrollable - scrollY < 380);
    };
    
    handleScroll();
    window.addEventListener("scroll", handleScroll);
    window.addEventListener("resize", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col font-sans bg-white">
      {/* Floating Sticky Logo */}
      <div className="fixed top-2 z-50 pointer-events-none w-full">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-[72px] flex items-center">
          <Link 
            href="/" 
            className="inline-flex items-center group pointer-events-auto transition-all duration-500 ease-out"
          >
            <img 
              src="/logo-green-v2.png" 
              alt="Bin-Go Logo" 
              className={`h-16 w-auto object-contain origin-left scale-[1.65] transition-all duration-500 ease-out ${
                hideLogo 
                  ? "opacity-0 scale-90 pointer-events-none" 
                  : scrolled 
                    ? "brightness-0 opacity-85" 
                    : "mix-blend-multiply"
              }`} 
            />
          </Link>
        </div>
      </div>

      <header className="absolute top-0 left-0 w-full z-40 bg-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-[72px] flex items-center justify-between">
          {/* Spacer to match the logo width on the left */}
          <div className="w-[230px] shrink-0" />
          
          {/* Centered Navigation Links */}
          <nav className="hidden md:flex items-center justify-center gap-8">
            <Link href="/" className="text-sm font-bold text-zinc-600 hover:text-emerald-700 transition-colors">Home</Link>
            <Link href="#about" className="text-sm font-bold text-zinc-600 hover:text-emerald-700 transition-colors">About</Link>
            <Link href="#features" className="text-sm font-bold text-zinc-600 hover:text-emerald-700 transition-colors">Features</Link>
            <Link href="#faq" className="text-sm font-bold text-zinc-600 hover:text-emerald-700 transition-colors">FAQ</Link>
          </nav>
          
          {/* Register Button Container on the right (balances the left spacer) */}
          <div className="w-[220px] shrink-0 flex justify-end">
            <Link href="#" className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-full text-sm font-bold transition-all shadow-sm">
              Register <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>
      <main className="flex-1">
        {children}
      </main>
      <footer className="relative pt-20 pb-12 overflow-hidden border-t border-emerald-900/30 bg-[url('/hero-bg.jpg')] bg-cover bg-bottom bg-no-repeat text-emerald-100">
        {/* Deep forest green overlay to blend the background and ensure high text contrast */}
        <div className="absolute inset-0 bg-[#0b1e19]/92 -z-0" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          
          {/* Top Section */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 pb-16 border-b border-emerald-800/20">
            {/* Brand / Info Column */}
            <div className="md:col-span-2 flex flex-col gap-5 items-center md:items-start text-center md:text-left">
              <div className="flex items-center gap-3">
                <img 
                  src="/logo-green-v2.png" 
                  alt="Bin-Go Logo" 
                  className="h-24 w-auto object-contain brightness-0 invert origin-left scale-[1.3]" 
                />
              </div>
              <p className="text-sm text-emerald-300/80 max-w-sm leading-relaxed font-medium">
                Empowering communities with smart, real-time waste tracking and citizen reporting to keep Metro Cebu green and clean.
              </p>
            </div>
            
            {/* Navigation Column */}
            <div className="flex flex-col gap-3 items-center md:items-start">
              <span className="font-bold text-xs uppercase tracking-wider text-emerald-400">Platform</span>
              <Link href="#" className="text-sm text-emerald-200 hover:text-white transition-colors font-medium">Register</Link>
              <Link href="/live-map" className="text-sm text-emerald-200 hover:text-white transition-colors font-medium">Incident Map</Link>
              <Link href="/dashboard" className="text-sm text-emerald-200 hover:text-white transition-colors font-medium">Dashboard</Link>
            </div>

            {/* Legal Column */}
            <div className="flex flex-col gap-3 items-center md:items-start">
              <span className="font-bold text-xs uppercase tracking-wider text-emerald-400">Information</span>
              <Link href="#" className="text-sm text-emerald-200 hover:text-white transition-colors font-medium">Privacy Policy</Link>
              <Link href="#" className="text-sm text-emerald-200 hover:text-white transition-colors font-medium">Terms of Service</Link>
              <Link href="#" className="text-sm text-emerald-200 hover:text-white transition-colors font-medium">Contact Support</Link>
            </div>
          </div>

          {/* Bottom Section with Giant Brand Text */}
          <div className="pt-12 flex flex-col items-center">
            <h2 className="text-[12vw] font-black text-emerald-900/30 tracking-tighter uppercase leading-none select-none my-8 text-center w-full">
              Bin&apos;Go
            </h2>
            <div className="w-full flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-semibold text-emerald-400/60 pt-8 border-t border-emerald-800/10">
              <span>© {new Date().getFullYear()} Cebu City LGU. Open source waste management initiative.</span>
              <span>Barangay Guadalupe Command Center</span>
            </div>
          </div>

        </div>
      </footer>
    </div>
  );
}
