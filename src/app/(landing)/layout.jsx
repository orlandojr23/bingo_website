"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Play, Apple, Menu, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import ContactSheet from "./ContactSheet";
import { supabase } from "@/lib/supabase";

export default function LandingLayout({ children }) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [hideLogo, setHideLogo] = useState(false);
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [sessionUser, setSessionUser] = useState(null);
  const [sessionRole, setSessionRole] = useState(null);
  const [activeSection, setActiveSection] = useState("home");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSessionUser(session?.user ?? null);
      setSessionRole(session?.user?.user_metadata?.role ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessionUser(session?.user ?? null);
      setSessionRole(session?.user?.user_metadata?.role ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);


  useEffect(() => {
    const handleHashChange = () => {
      if (pathname !== "/") {
        setActiveSection("");
        return;
      }

      const hash = window.location.hash;
      if (hash === "#about") setActiveSection("about");
      else if (hash === "#features") setActiveSection("features");
      else if (hash === "#faq") setActiveSection("faq");
      else setActiveSection("home");
    };
    window.addEventListener("hashchange", handleHashChange);
    window.addEventListener("popstate", handleHashChange);
    handleHashChange();
    
    return () => {
      window.removeEventListener("hashchange", handleHashChange);
      window.removeEventListener("popstate", handleHashChange);
    };
  }, [pathname]);

  useEffect(() => {
    const handleOpenContact = () => setIsContactOpen(true);
    window.addEventListener("openContactSheet", handleOpenContact);
    return () => window.removeEventListener("openContactSheet", handleOpenContact);
  }, []);

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
        <div className="max-w-7xl mx-auto px-6 lg:px-8 h-[72px] flex items-center">
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
        <div className="max-w-7xl mx-auto px-6 lg:px-8 h-[72px] flex items-center justify-between relative">
          {/* Spacer to match the logo width on the left */}
          <div className="hidden md:block w-[230px] shrink-0" />
          
          {/* Centered Navigation Links */}
          <nav className="absolute left-1/2 -translate-x-1/2 hidden md:flex items-center justify-center gap-2">
            <a href="/#home" className={`text-sm font-bold transition-all px-4 py-2 rounded-xl ${activeSection === "home" ? "text-emerald-700" : "text-zinc-600 hover:text-emerald-700 hover:bg-zinc-50"}`}>Home</a>
            <a href="/#about" className={`text-sm font-bold transition-all px-4 py-2 rounded-xl ${activeSection === "about" ? "text-emerald-700" : "text-zinc-600 hover:text-emerald-700 hover:bg-zinc-50"}`}>About</a>
            <a href="/#features" className={`text-sm font-bold transition-all px-4 py-2 rounded-xl ${activeSection === "features" ? "text-emerald-700" : "text-zinc-600 hover:text-emerald-700 hover:bg-zinc-50"}`}>Features</a>
            <a href="/#faq" className={`text-sm font-bold transition-all px-4 py-2 rounded-xl ${activeSection === "faq" ? "text-emerald-700" : "text-zinc-600 hover:text-emerald-700 hover:bg-zinc-50"}`}>FAQ</a>
            
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
          
          <div className="flex-1 md:flex-none shrink-0 flex justify-end items-center gap-3">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden flex items-center justify-center w-10 h-10 rounded-xl text-zinc-600 transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>
      <main className="flex-1">
        {children}
      </main>
      <ContactSheet isOpen={isContactOpen} onClose={() => setIsContactOpen(false)} />
      <footer className="relative pt-20 pb-12 overflow-hidden border-t border-emerald-900/30 bg-[url('/footer-bg.svg')] bg-cover bg-top bg-no-repeat text-emerald-100">
        {/* Subtle dark overlay to ensure text contrast */}
        <div className="absolute inset-0 bg-[#0b1e19]/30 -z-0" />
        <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
          
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
                Helping barangays manage waste collection with live truck tracking, easy waste reporting, and fast cleanups.
              </p>
            </div>
            
            {/* Platform links column matching bin-go-website */}
            <div className="flex flex-col gap-3 items-center md:items-start">
              <span className="font-bold text-xs uppercase tracking-wider text-emerald-400 font-mono">Platform</span>
              <a href="#" className="text-sm text-emerald-200 hover:text-white transition-colors font-medium">Home</a>
              <a href="#about" className="text-sm text-emerald-200 hover:text-white transition-colors font-medium">About</a>
              <a href="#features" className="text-sm text-emerald-200 hover:text-white transition-colors font-medium">Features</a>
              <a href="#faq" className="text-sm text-emerald-200 hover:text-white transition-colors font-medium">FAQ</a>
            </div>

            {/* Legal Links Column matching bin-go-website */}
            <div className="flex flex-col gap-3 items-center md:items-start">
              <span className="font-bold text-xs uppercase tracking-wider text-emerald-400 font-mono">Legal & Support</span>
              <Link href="/privacy" className="text-sm text-emerald-200 hover:text-white transition-colors font-medium">Privacy Policy</Link>
              <Link href="/terms" className="text-sm text-emerald-200 hover:text-white transition-colors font-medium">Terms of Service</Link>
              <button onClick={() => setIsContactOpen(true)} className="text-sm text-emerald-200 hover:text-white transition-colors font-medium">Contact Support</button>
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
            <div className="flex items-center justify-end pt-4 shrink-0">
              <button 
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-10 h-10 flex items-center justify-center text-zinc-400 hover:text-zinc-900 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Centered Navigation */}
            <div className="flex-1 flex flex-col justify-center items-center">
              <nav className="flex flex-col gap-6 text-3xl font-black tracking-tight text-center">
                <a href="/#home" onClick={() => setIsMobileMenuOpen(false)} className={`transition-all px-6 py-2 rounded-2xl ${activeSection === "home" ? "text-emerald-700" : "text-zinc-900 hover:text-emerald-600 hover:bg-zinc-50"}`}>Home</a>
                <a href="/#about" onClick={() => setIsMobileMenuOpen(false)} className={`transition-all px-6 py-2 rounded-2xl ${activeSection === "about" ? "text-emerald-700" : "text-zinc-900 hover:text-emerald-600 hover:bg-zinc-50"}`}>About</a>
                <a href="/#features" onClick={() => setIsMobileMenuOpen(false)} className={`transition-all px-6 py-2 rounded-2xl ${activeSection === "features" ? "text-emerald-700" : "text-zinc-900 hover:text-emerald-600 hover:bg-zinc-50"}`}>Features</a>
                <a href="/#faq" onClick={() => setIsMobileMenuOpen(false)} className={`transition-all px-6 py-2 rounded-2xl ${activeSection === "faq" ? "text-emerald-700" : "text-zinc-900 hover:text-emerald-600 hover:bg-zinc-50"}`}>FAQ</a>

                <button 
                  onClick={() => { setIsMobileMenuOpen(false); setIsContactOpen(true); }} 
                  className="transition-all px-6 py-2 rounded-2xl text-emerald-600 hover:bg-emerald-50 text-left cursor-pointer"
                >
                  Contact Us
                </button>
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

