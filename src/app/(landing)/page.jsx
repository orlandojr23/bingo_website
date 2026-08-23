"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight, ShieldCheck, Clock, Wifi, Battery, MapPin, Download } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function LandingPage() {
  const [activeSection, setActiveSection] = useState("home");

  useEffect(() => {
    const handleHashChange = (e) => {
      const hash = window.location.hash;
      if (hash === "#about") {
        setActiveSection("about");
      } else if (hash === "#features") {
        setActiveSection("features");
      } else if (hash === "#faq") {
        setActiveSection("faq");
      } else {
        setActiveSection("home");
      }
      
      // If triggered by a user clicking a link (event exists), scroll back to top
      // so they can see the new section content instead of staring at the footer!
      if (e) {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    };
    window.addEventListener("hashchange", handleHashChange);
    window.addEventListener("popstate", handleHashChange);
    handleHashChange();

    return () => {
      window.removeEventListener("hashchange", handleHashChange);
      window.removeEventListener("popstate", handleHashChange);
    };
  }, []);

  return (
    <div className="flex flex-col w-full overflow-hidden">
      
      {/* Hero Section */}
      <section className="relative pt-24 pb-16 lg:py-0 lg:h-screen lg:min-h-[640px] flex items-center overflow-hidden bg-[url('/hero-bg.svg')] bg-cover bg-center bg-no-repeat">
        {/* Overlay to prevent background from overwhelming hero content */}
        <div className="absolute inset-0 bg-white/40 -z-10" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative w-full z-10">
          
          {/* Single Grid switching between left and right layout orders */}
          <div className={`w-full flex flex-col lg:flex-row items-center justify-center gap-12 lg:gap-16 xl:gap-20 ${
            activeSection === "about" || activeSection === "faq" ? "lg:flex-row-reverse" : "lg:flex-row"
          }`}>
            
            {/* Content Column (First in DOM so it stacks on top in Mobile) */}
            <motion.div 
              layout
              transition={{ type: "spring", stiffness: 50, damping: 20 }}
              className="relative flex justify-center w-full lg:w-[480px] xl:w-[540px] shrink-0"
            >
              <AnimatePresence mode="popLayout">
                <motion.div
                  key={activeSection}
                  layout
                  initial={{ opacity: 0, filter: "blur(8px)" }}
                  animate={{ opacity: 1, filter: "blur(0px)" }}
                  exit={{ opacity: 0, filter: "blur(8px)" }}
                  transition={{ duration: 0.6, ease: "easeInOut" }}
                  className={`flex flex-col items-center lg:items-start text-center lg:text-left ${
                    activeSection === "about" || activeSection === "faq"
                      ? "lg:border-l lg:pl-10 xl:pl-14"
                      : "lg:border-r lg:pr-10 xl:pr-14"
                  } lg:border-zinc-200/60 w-full`}
                >
                  
                  {activeSection === "home" && <HomeContent />}
                  {activeSection === "about" && <AboutContent />}
                  {activeSection === "features" && <FeaturesContent />}
                  {activeSection === "faq" && <FaqContent />}
                </motion.div>
              </AnimatePresence>
            </motion.div>

            {/* Phone Mockup Column (Second in DOM so it sits below text on Mobile) */}
            <motion.div
              layout
              initial={false}
              animate={{ rotateY: activeSection === "about" || activeSection === "faq" ? 360 : 0 }}
              transition={{ type: "spring", stiffness: 50, damping: 20 }}
              style={{ perspective: 1200 }}
              className="flex justify-center shrink-0 z-20"
            >
              <PhoneMockup activeSection={activeSection} />
            </motion.div>

          </div>
        </div>
      </section>

    </div>
  );
}

function HomeContent() {
  return (
    <>
      <h1 className="text-4xl sm:text-5xl lg:text-7xl [@media(max-height:800px)]:text-6xl [@media(max-height:720px)]:text-5xl font-black tracking-tight leading-[1.1] mb-6 [@media(max-height:800px)]:mb-4">
        <span className="text-[#0f172a]">
          Smart Waste <br className="hidden lg:block" /> Collection,
        </span>
        <br className="hidden lg:block" />
        <span className="relative inline-block mt-1 px-2">
          <span className="relative z-10 text-white">Simplified.</span>
          <span className="absolute inset-0 bg-emerald-500 rounded-xl -rotate-2 scale-[1.05] shadow-sm"></span>
        </span>
      </h1>

      <p className="text-base sm:text-lg [@media(max-height:800px)]:text-base text-zinc-700 font-medium mb-8 [@media(max-height:800px)]:mb-5 max-w-md leading-relaxed">
        Never miss a collection day again. Live track garbage trucks, receive instant arrival alerts, and help keep your community clean.
      </p>

      <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto mt-2">
        <button
          type="button"
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3.5 rounded-full text-sm sm:text-base font-bold transition-all shadow-lg shadow-emerald-600/20 hover:shadow-xl hover:-translate-y-0.5"
        >
          Request a Demo
        </button>
      </div>
    </>
  );
}

function AboutContent() {
  return (
    <>
      <h2 className="text-4xl sm:text-5xl lg:text-7xl [@media(max-height:800px)]:text-6xl [@media(max-height:720px)]:text-5xl font-black tracking-tight leading-[1.1] mb-6 [@media(max-height:800px)]:mb-4 text-[#0f172a]">
        Community Cleanups, <br className="hidden lg:block" />
        <span className="relative inline-block mt-1 px-2">
          <span className="relative z-10 text-white">Accelerated.</span>
          <span className="absolute inset-0 bg-emerald-500 rounded-xl -rotate-2 scale-[1.05] shadow-sm"></span>
        </span>
      </h2>

      <p className="text-base sm:text-lg [@media(max-height:800px)]:text-base text-zinc-700 font-medium mb-8 [@media(max-height:800px)]:mb-5 max-w-md leading-relaxed">
        Connect waste collection services directly with local neighborhoods. Track routes, log waste reports in real-time, and ensure quick cleanups.
      </p>

      <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
        <Link
          href="/about"
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-full text-sm sm:text-base font-bold transition-all shadow-lg shadow-emerald-600/20 hover:shadow-xl hover:-translate-y-0.5"
        >
          Learn More <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </>
  );
}

function FeaturesContent() {
  return (
    <>
      <h2 className="text-4xl sm:text-5xl lg:text-7xl [@media(max-height:800px)]:text-6xl [@media(max-height:720px)]:text-5xl font-black tracking-tight leading-[1.1] mb-6 [@media(max-height:800px)]:mb-4 text-[#0f172a]">
        Powerful Tools, <br className="hidden lg:block" />
        <span className="relative inline-block mt-1 px-2">
          <span className="relative z-10 text-white">Unleashed.</span>
          <span className="absolute inset-0 bg-emerald-500 rounded-xl -rotate-2 scale-[1.05] shadow-sm"></span>
        </span>
      </h2>

      <p className="text-base sm:text-lg [@media(max-height:800px)]:text-base text-zinc-700 font-medium mb-8 [@media(max-height:800px)]:mb-5 max-w-md leading-relaxed">
        Experience real-time tracking, smart truck routing, and community-driven waste reports in one beautifully designed platform.
      </p>

      <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
        <Link
          href="/features"
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-full text-sm sm:text-base font-bold transition-all shadow-lg shadow-emerald-600/20 hover:shadow-xl hover:-translate-y-0.5"
        >
          Explore Features <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </>
  );
}

function FaqContent() {
  return (
    <>
      <h2 className="text-4xl sm:text-5xl lg:text-7xl [@media(max-height:800px)]:text-6xl [@media(max-height:720px)]:text-5xl font-black tracking-tight leading-[1.1] mb-6 [@media(max-height:800px)]:mb-4 text-[#0f172a]">
        Your Questions, <br className="hidden lg:block" />
        <span className="relative inline-block mt-1 px-2">
          <span className="relative z-10 text-white">Answered.</span>
          <span className="absolute inset-0 bg-emerald-500 rounded-xl -rotate-2 scale-[1.05] shadow-sm"></span>
        </span>
      </h2>

      <p className="text-base sm:text-lg [@media(max-height:800px)]:text-base text-zinc-700 font-medium mb-8 [@media(max-height:800px)]:mb-5 max-w-md leading-relaxed">
        Everything you need to know about using our smart waste management solution in your community.
      </p>

      <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
        <Link
          href="/faqs"
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-full text-sm sm:text-base font-bold transition-all shadow-lg shadow-emerald-600/20 hover:shadow-xl hover:-translate-y-0.5"
        >
          View All FAQs <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </>
  );
}

function PhoneMockup({ activeSection }) {
  return (
    <div className="relative w-[280px] sm:w-[320px] md:w-[280px] lg:w-[300px] xl:w-[340px] h-[580px] xl:h-[620px] z-10 transition-transform duration-700 hover:-translate-y-2 scale-90 sm:scale-95 lg:scale-90 xl:scale-95 [@media(max-height:800px)]:scale-[0.8] [@media(max-height:720px)]:scale-[0.7] origin-top -mb-[60px] sm:-mb-[30px] lg:-mb-[60px] xl:-mb-[30px] [@media(max-height:800px)]:-mb-[120px] [@media(max-height:720px)]:-mb-[170px]">
      {/* Outer Phone Bezel */}
      <div className="absolute inset-0 bg-slate-900 rounded-[2.5rem] sm:rounded-[3rem] shadow-2xl overflow-hidden border-[6px] sm:border-[8px] border-slate-900 flex flex-col pointer-events-auto">
        
        {/* Screen Content Area */}
        <div className="flex-1 bg-white relative w-full h-full overflow-hidden rounded-[2rem] sm:rounded-[2.5rem] flex flex-col justify-between">
          
          {/* Top Status Bar & Dynamic Island */}
          <div className="pt-3 px-6 flex justify-between items-center shrink-0 z-30 bg-white">
            <span className="text-[10px] font-semibold tracking-wide text-slate-900">
              12:00
            </span>
            
            {/* Dynamic Island */}
            <div className="absolute left-1/2 -translate-x-1/2 top-2.5 w-[85px] h-[22px] bg-black rounded-full flex items-center justify-between px-2">
              <div className="w-1.5 h-1.5 rounded-full bg-slate-800/80"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-slate-800/80 border-[0.5px] border-slate-700/50"></div>
            </div>
            
            <div className="flex items-center gap-1.5 text-slate-900">
              <MapPin className="w-2.5 h-2.5" />
              <Wifi className="w-3 h-3" />
              <Battery className="w-4 h-4" />
            </div>
          </div>

          {/* Dynamic App Mockup Content */}
          <div className="flex-1 relative w-full overflow-hidden bg-zinc-50 flex flex-col pt-2" />

          {/* Bottom iOS Home Bar */}
          <div className="pb-1.5 pt-1 flex justify-center shrink-0 z-30 bg-white border-t border-slate-100">
            <div className="w-20 xl:w-24 h-1 bg-slate-900 rounded-full" />
          </div>
          
        </div>
      </div>
    </div>
  );
}
