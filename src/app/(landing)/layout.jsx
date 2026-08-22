"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronDown, Play, Apple, Menu, X } from "lucide-react";
import RegisterSheet from "./RegisterSheet";
import { AnimatePresence, motion } from "framer-motion";

export default function LandingLayout({ children }) {
  const [scrolled, setScrolled] = useState(false);
  const [hideLogo, setHideLogo] = useState(false);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
          <a 
            href="/#home" 
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
          </a>
        </div>
      </div>

      <header className="absolute top-0 left-0 w-full z-40 bg-transparent">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-[72px] flex items-center justify-between">
          {/* Spacer to match the logo width on the left */}
          <div className="hidden md:block w-[230px] shrink-0" />
          
          {/* Centered Navigation Links */}
          <nav className="hidden md:flex items-center justify-center gap-8">
            <a href="/#home" className="text-sm font-bold text-zinc-600 hover:text-emerald-700 transition-colors">Home</a>
            <a href="/#about" className="text-sm font-bold text-zinc-600 hover:text-emerald-700 transition-colors">About</a>
            <a href="/#features" className="text-sm font-bold text-zinc-600 hover:text-emerald-700 transition-colors">Features</a>
            <a href="/#faq" className="text-sm font-bold text-zinc-600 hover:text-emerald-700 transition-colors">FAQ</a>
            
            {/* Download Dropdown */}
            <div className="relative group">
              <button type="button" className="text-sm font-bold text-zinc-600 hover:text-emerald-700 transition-colors flex items-center gap-1 py-1 cursor-pointer">
                Download <ChevronDown className="w-4 h-4 transition-transform duration-300 group-hover:rotate-180" />
              </button>
              
              {/* Dropdown Box */}
              <div className="absolute left-1/2 -translate-x-1/2 top-full pt-2 w-52 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 transform scale-95 group-hover:scale-100 origin-top z-50">
                <div className="bg-white rounded-2xl border border-zinc-100 shadow-xl p-2.5 flex flex-col gap-1.5">
                  <div className="px-3 py-1 text-[10px] font-bold text-zinc-400 uppercase tracking-wider text-left">
                    Mobile App
                  </div>
                  
                  {/* Google Play */}
                  <div className="flex items-center gap-3 px-3 py-2 text-zinc-500 rounded-xl bg-zinc-50/50 hover:bg-zinc-50 transition-colors cursor-not-allowed border border-zinc-100">
                    <Play className="w-4 h-4 text-zinc-400 fill-zinc-400" />
                    <div className="text-left">
                      <p className="font-bold text-zinc-700 text-xs leading-none mb-1">Google Play</p>
                      <p className="text-[10px] text-zinc-400 leading-none">Coming Soon</p>
                    </div>
                  </div>
                  
                  {/* App Store */}
                  <div className="flex items-center gap-3 px-3 py-2 text-zinc-500 rounded-xl bg-zinc-50/50 hover:bg-zinc-50 transition-colors cursor-not-allowed border border-zinc-100">
                    <Apple className="w-4 h-4 text-zinc-400" />
                    <div className="text-left">
                      <p className="font-bold text-zinc-700 text-xs leading-none mb-1">App Store</p>
                      <p className="text-[10px] text-zinc-400 leading-none">Coming Soon</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </nav>
          
          {/* Right Side Actions */}
          <div className="flex-1 md:flex-none md:w-[220px] shrink-0 flex justify-end items-center gap-3">
            <button onClick={() => setIsRegisterOpen(true)} className="group flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-full text-sm font-bold transition-all shadow-sm">
              Register <ArrowRight className="hidden sm:block w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
            </button>
            <button 
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden flex items-center justify-center w-10 h-10 rounded-full bg-zinc-100 text-zinc-600 hover:bg-zinc-200 transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>
      <main className="flex-1">
        {children}
      </main>
      <RegisterSheet isOpen={isRegisterOpen} onClose={() => setIsRegisterOpen(false)} />
      <footer className="relative pt-20 pb-12 overflow-hidden border-t border-emerald-900/30 bg-[url('/footer-bg.svg')] bg-cover bg-top bg-no-repeat text-emerald-100">
        {/* Subtle dark overlay to ensure text contrast */}
        <div className="absolute inset-0 bg-[#0b1e19]/30 -z-0" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          
          {/* Top Section */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 pb-16 border-b border-emerald-800/20">
            {/* Brand / Info Column */}
            <div className="md:col-span-2 flex flex-col gap-5 items-center md:items-start text-center md:text-left">
              <div className="flex items-center gap-3">
                <img 
                  src="/logo-green-v2.png" 
                  alt="Bin-Go Logo" 
                  className="h-20 w-auto object-contain brightness-0 invert origin-left scale-[1.3]" 
                />
              </div>
              <p className="text-sm text-emerald-300/80 max-w-sm leading-relaxed font-medium">
                Empowering barangays with smart waste management, live compactor truck telemetry, and rapid illegal dumping response.
              </p>
            </div>
            
            {/* Platform links column matching bin-go-website */}
            <div className="flex flex-col gap-3 items-center md:items-start">
              <span className="font-bold text-xs uppercase tracking-wider text-emerald-400 font-mono">Platform</span>
              <a href="#" className="text-sm text-emerald-200 hover:text-white transition-colors font-medium">Home</a>
              <a href="#about" className="text-sm text-emerald-200 hover:text-white transition-colors font-medium">About</a>
              <a href="#features" className="text-sm text-emerald-200 hover:text-white transition-colors font-medium">Features</a>
              <a href="#faq" className="text-sm text-emerald-200 hover:text-white transition-colors font-medium">FAQ</a>
              <Link href="#" className="text-sm text-emerald-200 hover:text-white transition-colors font-medium">Register</Link>
              <Link href="/live-map" className="text-sm text-emerald-200 hover:text-white transition-colors font-medium">Incident Map</Link>
            </div>

            {/* Legal Links Column matching bin-go-website */}
            <div className="flex flex-col gap-3 items-center md:items-start">
              <span className="font-bold text-xs uppercase tracking-wider text-emerald-400 font-mono">Legal & Support</span>
              <Link href="#" className="text-sm text-emerald-200 hover:text-white transition-colors font-medium">Privacy Policy</Link>
              <Link href="#" className="text-sm text-emerald-200 hover:text-white transition-colors font-medium">Terms of Service</Link>
              <Link href="#" className="text-sm text-emerald-200 hover:text-white transition-colors font-medium">Contact Support</Link>
            </div>
          </div>

          {/* Bottom Section with Giant Brand Text */}
          <div className="pt-12 flex flex-col items-center">
            <h2 className="text-[12vw] font-black text-white/8 tracking-tighter uppercase leading-none select-none my-8 text-center w-full">
              Bin&apos;Go
            </h2>
            <div className="w-full flex justify-center text-center text-xs font-semibold text-emerald-400/60 pt-8 border-t border-emerald-800/10">
              <span>© {new Date().getFullYear()} Bin&apos;Go Waste Management Platform. All rights reserved.</span>
            </div>
          </div>

        </div>
      </footer>
      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] bg-white flex flex-col px-6 md:hidden"
          >
            {/* Top Bar inside Menu */}
            <div className="flex items-center justify-between h-[72px] mt-2 shrink-0">
              <a href="/#home" onClick={() => setIsMobileMenuOpen(false)}>
                <img 
                  src="/logo-green-v2.png" 
                  alt="Bin-Go Logo" 
                  className="h-14 w-auto object-contain origin-left scale-[1.3] mix-blend-multiply" 
                />
              </a>
              <button 
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-10 h-10 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-600 hover:bg-zinc-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Centered Navigation */}
            <div className="flex-1 flex flex-col justify-center items-center">
              <nav className="flex flex-col gap-8 text-3xl font-black text-zinc-900 tracking-tight text-center">
                <a href="/#home" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-emerald-600 transition-colors">Home</a>
                <a href="/#about" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-emerald-600 transition-colors">About</a>
                <a href="/#features" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-emerald-600 transition-colors">Features</a>
                <a href="/#faq" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-emerald-600 transition-colors">FAQ</a>
              </nav>
            </div>

            {/* Bottom App Links */}
            <div className="pb-8 shrink-0">
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-4 text-center">Coming Soon to Mobile</p>
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3 px-4 py-3 text-zinc-500 rounded-2xl bg-zinc-50 border border-zinc-100 justify-center">
                  <Play className="w-5 h-5 text-zinc-400 fill-zinc-400" />
                  <div className="text-left">
                    <p className="font-bold text-zinc-700 text-sm leading-none mb-1">Google Play</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 px-4 py-3 text-zinc-500 rounded-2xl bg-zinc-50 border border-zinc-100 justify-center">
                  <Apple className="w-5 h-5 text-zinc-400" />
                  <div className="text-left">
                    <p className="font-bold text-zinc-700 text-sm leading-none mb-1">App Store</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
