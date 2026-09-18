"use client";

import { useState, useEffect, useLayoutEffect, useSyncExternalStore } from "react";
import Link from "next/link";
import { ArrowRight, ShieldCheck, Clock, Wifi, Battery, MapPin, Download, Camera, CalendarDays, Map, Bell, Truck, FileText, CheckCircle2, Menu, X, LogOut, ChevronRight, Check, Ticket } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => {
    if (typeof window !== "undefined") {
      return window.matchMedia(query).matches;
    }
    return false;
  });

  useEffect(() => {
    const mq = window.matchMedia(query);
    setMatches(mq.matches);
    const onChange = (e) => setMatches(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}

const SECTION_BY_HASH = { "#about": "about", "#features": "features", "#faq": "faq" };

const getSectionFromHash = () => SECTION_BY_HASH[window.location.hash] ?? "home";

function subscribeToHash(callback) {
  window.addEventListener("hashchange", callback);
  window.addEventListener("popstate", callback);
  return () => {
    window.removeEventListener("hashchange", callback);
    window.removeEventListener("popstate", callback);
  };
}

export default function LandingPage() {
  // Read the section straight from the URL hash so loads of /#about etc.
  // never flash the home layout (phone on the right) before jumping into place.
  const activeSection = useSyncExternalStore(subscribeToHash, getSectionFromHash, () => "home");
  // False until just after mount, so a page refresh snaps the phone to the
  // section's orientation instead of replaying the spin.
  const [hashInitialized, setHashInitialized] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  // The SSR markup always renders the home layout, and it paints before the
  // hash-driven section switch commits. Keep the hero invisible until
  // hydration completes with the correct section so section-hash loads never
  // flash the phone on the wrong side.
  const [hydrated, setHydrated] = useState(false);
  useLayoutEffect(() => { setHydrated(true); }, []);
  const sectionSettled = hydrated && activeSection === getSectionFromHash();
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  const [phTime, setPhTime] = useState("12:00");

  useEffect(() => {
    const updateTime = () => {
      const timeStr = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Manila",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      }).format(new Date()).replace(/ [AP]M/, '');
      setPhTime(timeStr);
    };

    updateTime();
    const interval = setInterval(updateTime, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Section links scroll back to the top so the hero is visible
    // instead of staying down near the footer.
    const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });
    window.addEventListener("hashchange", scrollToTop);
    window.addEventListener("popstate", scrollToTop);
    // Enable the spring transition only after the initial hash-driven
    // orientation snap has committed, so reloads never replay the spin.
    const t = setTimeout(() => setHashInitialized(true), 100);

    let resizeTimer;
    const handleWindowResize = () => {
      setIsResizing(true);
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => setIsResizing(false), 200);
    };
    window.addEventListener("resize", handleWindowResize);

    return () => {
      window.removeEventListener("hashchange", scrollToTop);
      window.removeEventListener("popstate", scrollToTop);
      window.removeEventListener("resize", handleWindowResize);
      clearTimeout(t);
      clearTimeout(resizeTimer);
    };
  }, []);

  return (
    <div className="flex flex-col w-full overflow-hidden">
      
      {/* Hero Section */}
      <section className="relative min-w-0 w-full pt-20 sm:pt-24 pb-10 sm:pb-16 lg:py-0 lg:h-screen lg:min-h-[640px] flex items-center overflow-hidden bg-[url('/hero-bg.svg')] bg-cover bg-center bg-no-repeat">
        {/* Overlay to prevent background from overwhelming hero content */}
        <div className="absolute inset-0 bg-white/40 -z-10" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative w-full z-10">
          
          {/* Single Grid switching between left and right layout orders */}
          <div className={`w-full flex flex-col lg:flex-row items-center justify-center gap-8 sm:gap-12 lg:gap-16 xl:gap-20 ${
            activeSection === "about" || activeSection === "faq" ? "lg:flex-row-reverse" : "lg:flex-row"
          }`}>
            
            {/* Content Column (First in DOM so it stacks on top in Mobile) */}
            <motion.div 
              layout
              transition={hashInitialized && !isResizing ? { type: "spring", stiffness: 50, damping: 20 } : { duration: 0 }}
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
              animate={{ rotateY: isDesktop && (activeSection === "about" || activeSection === "faq") ? 360 : 0 }}
              transition={hashInitialized && !isResizing ? { type: "spring", stiffness: 50, damping: 20 } : { duration: 0 }}
              style={{ perspective: 1200 }}
              className="flex justify-center shrink-0 z-20"
            >
              <PhoneMockup activeSection={activeSection} phTime={phTime} />
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
      <h1 className="text-[clamp(1.875rem,min(9vw,8vh),2.25rem)] sm:text-5xl max-lg:[@media(max-height:480px)]:text-3xl lg:text-7xl lg:[@media(max-height:800px)]:text-6xl lg:[@media(max-height:720px)]:text-5xl font-black tracking-tight leading-[1.1] mb-4 sm:mb-6 lg:[@media(max-height:800px)]:mb-4">
        <span className="text-[#0f172a]">
          Smart Waste <br className="hidden lg:block" />Collection,
        </span>
        <br />
        <span className="relative inline-block mt-2 px-2">
          <span className="relative z-10 text-white">Simplified.</span>
          <span className="absolute inset-0 bg-emerald-500 rounded-xl -rotate-2 scale-[1.05] shadow-sm"></span>
        </span>
      </h1>

      <p className="text-sm sm:text-lg lg:[@media(max-height:800px)]:text-base text-zinc-700 font-medium mb-6 sm:mb-8 lg:[@media(max-height:800px)]:mb-5 max-w-md leading-relaxed">
        Never miss a collection day again. Track garbage trucks live, get instant arrival alerts, and help keep your community clean.
      </p>

      <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto mt-2">
        <Link
          href="/demo"
          className="group w-48 sm:w-auto flex items-center justify-center bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3.5 rounded-xl text-sm sm:text-base font-bold transition-all shadow-lg shadow-emerald-600/20 hover:shadow-xl hover:-translate-y-0.5 cursor-pointer"
        >
          Request a Demo
          <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 max-w-0 opacity-0 transition-all duration-300 group-hover:max-w-4 group-hover:ml-2 group-hover:opacity-100 sm:group-hover:max-w-5" />
        </Link>
      </div>
    </>
  );
}

function AboutContent() {
  return (
    <>
      <h2 className="text-[clamp(1.875rem,min(9vw,8vh),2.25rem)] sm:text-5xl max-lg:[@media(max-height:480px)]:text-3xl lg:text-7xl lg:[@media(max-height:800px)]:text-6xl lg:[@media(max-height:720px)]:text-5xl font-black tracking-tight leading-[1.1] mb-4 sm:mb-6 lg:[@media(max-height:800px)]:mb-4 text-[#0f172a]">
        Community Cleanups, <br className="hidden lg:block" />
        <span className="relative inline-block mt-2 px-2">
          <span className="relative z-10 text-white">Accelerated.</span>
          <span className="absolute inset-0 bg-emerald-500 rounded-xl -rotate-2 scale-[1.05] shadow-sm"></span>
        </span>
      </h2>

      <p className="text-sm sm:text-lg lg:[@media(max-height:800px)]:text-base text-zinc-700 font-medium mb-6 sm:mb-8 lg:[@media(max-height:800px)]:mb-5 max-w-md leading-relaxed">
        Connect waste collection services directly with local neighborhoods. Track routes, log waste reports in real-time, and ensure quick cleanups.
      </p>

      <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
        <Link
          href="/about"
          className="group w-48 sm:w-auto flex items-center justify-center bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl text-sm sm:text-base font-bold transition-all shadow-lg shadow-emerald-600/20 hover:shadow-xl hover:-translate-y-0.5"
        >
          Learn More <ArrowRight className="h-4 w-4 max-w-0 opacity-0 transition-all duration-300 group-hover:max-w-4 group-hover:ml-2 group-hover:opacity-100" />
        </Link>
      </div>
    </>
  );
}

function FeaturesContent() {
  return (
    <>
      <h2 className="text-[clamp(1.875rem,min(9vw,8vh),2.25rem)] sm:text-5xl max-lg:[@media(max-height:480px)]:text-3xl lg:text-7xl lg:[@media(max-height:800px)]:text-6xl lg:[@media(max-height:720px)]:text-5xl font-black tracking-tight leading-[1.1] mb-4 sm:mb-6 lg:[@media(max-height:800px)]:mb-4 text-[#0f172a]">
        Powerful Tools, <br className="hidden lg:block" />
        <span className="relative inline-block mt-2 px-2">
          <span className="relative z-10 text-white">Unleashed.</span>
          <span className="absolute inset-0 bg-emerald-500 rounded-xl -rotate-2 scale-[1.05] shadow-sm"></span>
        </span>
      </h2>

      <p className="text-sm sm:text-lg lg:[@media(max-height:800px)]:text-base text-zinc-700 font-medium mb-6 sm:mb-8 lg:[@media(max-height:800px)]:mb-5 max-w-md leading-relaxed">
        Experience real-time tracking, smart truck routing, and community-driven waste reports in one beautifully designed platform.
      </p>

      <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
        <Link
          href="/features"
          className="group w-48 sm:w-auto flex items-center justify-center bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl text-sm sm:text-base font-bold transition-all shadow-lg shadow-emerald-600/20 hover:shadow-xl hover:-translate-y-0.5"
        >
          Explore Features <ArrowRight className="h-4 w-4 max-w-0 opacity-0 transition-all duration-300 group-hover:max-w-4 group-hover:ml-2 group-hover:opacity-100" />
        </Link>
      </div>
    </>
  );
}

function FaqContent() {
  return (
    <>
      <h2 className="text-[clamp(1.875rem,min(9vw,8vh),2.25rem)] sm:text-5xl max-lg:[@media(max-height:480px)]:text-3xl lg:text-7xl lg:[@media(max-height:800px)]:text-6xl lg:[@media(max-height:720px)]:text-5xl font-black tracking-tight leading-[1.1] mb-4 sm:mb-6 lg:[@media(max-height:800px)]:mb-4 text-[#0f172a]">
        Your Questions, <br className="hidden lg:block" />
        <span className="relative inline-block mt-2 px-2">
          <span className="relative z-10 text-white">Answered.</span>
          <span className="absolute inset-0 bg-emerald-500 rounded-xl -rotate-2 scale-[1.05] shadow-sm"></span>
        </span>
      </h2>

      <p className="text-sm sm:text-lg lg:[@media(max-height:800px)]:text-base text-zinc-700 font-medium mb-6 sm:mb-8 lg:[@media(max-height:800px)]:mb-5 max-w-md leading-relaxed">
        Everything you need to know about using Bin&apos;Go in your community.
      </p>

      <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
        <Link
          href="/faqs"
          className="group w-48 sm:w-auto flex items-center justify-center bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl text-sm sm:text-base font-bold transition-all shadow-lg shadow-emerald-600/20 hover:shadow-xl hover:-translate-y-0.5"
        >
          View All FAQs <ArrowRight className="h-4 w-4 max-w-0 opacity-0 transition-all duration-300 group-hover:max-w-4 group-hover:ml-2 group-hover:opacity-100" />
        </Link>
      </div>
    </>
  );
}

// ---------------- UI Mockups ----------------

function MockupMinimalist({ pose, title, icon: Icon, bgClass, imgClass, delay = 0 }) {
  const [imgLoaded, setImgLoaded] = useState(false);

  // Use a ref-callback so we can check img.complete immediately after the DOM
  // node is assigned. This handles already-cached images where onLoad never
  // fires, which was causing the mascot to stay invisible on revisits.
  const imgRef = (node) => {
    if (!node) return;
    if (node.complete) {
      setImgLoaded(true);
    }
  };

  return (
    <div className={`flex h-full w-full flex-col items-center justify-center relative overflow-hidden select-none ${bgClass}`}>
      
      {/* Subtle Minimalist Grid Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#00000006_1px,transparent_1px),linear-gradient(to_bottom,#00000006_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,#000_60%,transparent_100%)]"></div>
      
      {/* Very Soft Static Glow Behind Mascot for Depth */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[280px] h-[280px] rounded-full bg-white/60 filter blur-3xl pointer-events-none"></div>

      {/* Floating Center Mascot - animates in once the image is ready */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 15 }}
        animate={imgLoaded ? { scale: 1, opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay }}
        className="relative z-10 flex flex-col items-center justify-center pt-2"
      >
        <div className="relative">
          <img
            key={pose}
            ref={imgRef}
            src={`/mascot/${pose}.webp`}
            alt="Binny"
            onLoad={() => setImgLoaded(true)}
            className={`object-contain relative z-10 drop-shadow-[0_15px_25px_rgba(0,0,0,0.1)] ${imgClass || "w-56 h-56"}`}
            loading="eager"
            fetchPriority="high"
          />
        </div>
      </motion.div>

      {/* Refined Minimalist Floating Pill */}
      <motion.div 
        initial={{ y: 15, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut", delay: delay + 0.2 }}
        className="absolute bottom-12 sm:bottom-16 z-20 flex items-center gap-2 sm:gap-3 rounded-full bg-white/90 backdrop-blur-xl p-1.5 sm:p-2 pr-4 sm:pr-5 shadow-[0_8px_24px_-6px_rgba(0,0,0,0.08)] border border-white ring-1 ring-slate-900/5"
      >
        {Icon && (
          <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm relative overflow-hidden">
            <Icon className="h-4 w-4 relative z-10" />
          </div>
        )}
        <span className="text-[12px] sm:text-[14px] font-bold tracking-tight text-slate-800">{title}</span>
      </motion.div>
    </div>
  );
}

function MockupUserHome() {
  return (
    <MockupMinimalist 
      pose="arms-open-pose" 
      title="Arriving in 5 mins" 
      icon={MapPin}
      bgClass="bg-[#f8fafc]"
      delay={0.1}
      imgClass="w-48 h-48 sm:w-56 sm:h-56 scale-100 sm:scale-110 lg:scale-[1.2] -mt-2 sm:-mt-4"
    />
  );
}

function MockupUserFeatures() {
  return (
    <MockupMinimalist 
      pose="arms-open-pose-clean" 
      title="Tap to Snap" 
      icon={Camera}
      bgClass="bg-[#f8fafc]"
      delay={0.2}
      imgClass="w-48 h-48 sm:w-56 sm:h-56 scale-100 sm:scale-[1.15] lg:scale-[1.25] -mt-2 sm:-mt-5"
    />
  );
}

function MockupDriverAbout() {
  return (
    <MockupMinimalist 
      pose="coffee-pose" 
      title="Status: On Duty" 
      icon={Truck}
      bgClass="bg-[#f8fafc]"
      delay={0.3}
      imgClass="w-48 h-48 sm:w-56 sm:h-56"
    />
  );
}

function MockupFaq() {
  return (
    <MockupMinimalist 
      pose="pointing-pose" 
      title="Got questions?" 
      icon={Bell}
      bgClass="bg-[#f8fafc]"
      delay={0.4}
      imgClass="w-48 h-48 sm:w-56 sm:h-56 scale-100 sm:scale-110 lg:scale-[1.2] -mt-2 sm:-mt-4"
    />
  );
}

function PhoneMockup({ activeSection, phTime }) {
  return (
    <div className="relative w-[240px] sm:w-[280px] md:w-[280px] lg:w-[300px] xl:w-[340px] h-[500px] sm:h-[580px] xl:h-[620px] z-10 transition-transform duration-700 hover:-translate-y-2 scale-[0.78] sm:scale-95 lg:scale-90 xl:scale-95 [@media(max-height:800px)]:scale-[0.8] [@media(max-height:720px)]:scale-[0.7] origin-top -mb-[80px] sm:-mb-[30px] lg:-mb-[60px] xl:-mb-[30px] [@media(max-height:800px)]:-mb-[120px] [@media(max-height:720px)]:-mb-[170px]">
      {/* Outer Phone Bezel */}
      <div className="absolute inset-0 bg-slate-900 rounded-[2.5rem] sm:rounded-[3rem] shadow-2xl overflow-hidden border-[6px] sm:border-[8px] border-slate-900 flex flex-col pointer-events-auto">
        
        {/* Screen Content Area */}
        <div className="flex-1 relative w-full h-full overflow-hidden rounded-[2rem] sm:rounded-[2.5rem] bg-zinc-50">
          
          {/* Dynamic App Mockup Content (Fills entire screen) */}
          <div className="absolute inset-0 z-0">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeSection}
                initial={{ opacity: 0, scale: 0.98, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98, y: -10 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="absolute inset-0 w-full h-full"
              >
                {activeSection === "home" && <MockupUserHome />}
                {activeSection === "features" && <MockupUserFeatures />}
                {activeSection === "about" && <MockupDriverAbout />}
                {activeSection === "faq" && <MockupFaq />}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Top Status Bar & Dynamic Island (Absolute Overlay) */}
          <div className="absolute top-0 inset-x-0 pt-3 px-4 sm:px-6 flex justify-between items-center z-30 pointer-events-none">
            <span className="text-[10px] font-semibold tracking-wide text-slate-900">
              {phTime}
            </span>
            
            {/* Dynamic Island */}
            <div className="absolute left-1/2 -translate-x-1/2 top-2.5 w-[70px] sm:w-[85px] h-[22px] bg-black rounded-full flex items-center justify-between px-2">
              <div className="w-1.5 h-1.5 rounded-full bg-slate-800/80"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-slate-800/80 border-[0.5px] border-slate-700/50"></div>
            </div>
            
            <div className="flex items-center gap-1.5 text-slate-900">
              <MapPin className="w-2.5 h-2.5" />
              <Wifi className="w-3 h-3" />
              <Battery className="w-4 h-4" />
            </div>
          </div>

          {/* Bottom iOS Home Bar (Absolute Overlay) */}
          <div className="absolute bottom-2 inset-x-0 flex justify-center z-30 pointer-events-none">
            <div className="w-20 xl:w-24 h-1 bg-slate-900 rounded-full shadow-sm opacity-80" />
          </div>
          
        </div>
      </div>
    </div>
  );
}
