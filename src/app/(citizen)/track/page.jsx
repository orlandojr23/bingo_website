"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { 
  Home, 
  Map as MapIcon, 
  Calendar, 
  AlertTriangle, 
  Plus, 
  ChevronRight, 
  Clock, 
  Truck, 
  LogOut, 
  Bell, 
  BellRing,
  CheckCircle2, 
  Camera, 
  X,
  Loader2,
  MapPin, 
  Search,
  Check,
  Phone,
  RefreshCw,
  Layers,
  Download
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";

// Dynamically import MapCanvas for Leaflet SSR safety
const MapCanvas = dynamic(() => import("@/components/map/map-canvas"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-zinc-50 text-zinc-400 text-xs">
      <div className="flex items-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
        <span>Initializing GPS Map...</span>
      </div>
    </div>
  ),
});

// Knowledge base for instant waste segregation search
const wasteKnowledgeBase = [
  { name: "Plastic Bottles & Containers", category: "Non-Biodegradable", bin: "Black Sack / Bin", advice: "Rinse and crush before disposal." },
  { name: "Food Scraps & Leftovers", category: "Biodegradable", bin: "Green Sack / Bin", advice: "Drain liquids; great for compost." },
  { name: "Fruit & Vegetable Peels", category: "Biodegradable", bin: "Green Sack / Bin", advice: "Can be mixed with organic soil compost." },
  { name: "Cardboard & Paper Boxes", category: "Dry Recyclables", bin: "Blue / Dry Sack", advice: "Flatten boxes to save space." },
  { name: "Glass Jars & Bottles", category: "Non-Biodegradable", bin: "Black Sack / Bin", advice: "Wrap broken glass safely before discarding." },
  { name: "Aluminum & Tin Cans", category: "Dry Recyclables", bin: "Blue / Dry Sack", advice: "Clean thoroughly of food residue." },
  { name: "Dry Leaves & Plant Branches", category: "Biodegradable", bin: "Green Sack / Bin", advice: "Tie loose branches into bundles." },
  { name: "Batteries & Electronics", category: "Hazardous / E-Waste", bin: "Barangay Drop-off", advice: "Do not mix with normal trash. Drop off at Barangay hall." },
  { name: "Styrofoam & Bubble Wrap", category: "Non-Biodegradable", bin: "Black Sack / Bin", advice: "Non-recyclable. Compact tightly." },
];

export default function CitizenDashboardPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  
  // App Navigation & Selected Sector
  const [activeTab, setActiveTab] = useState("home"); // home | map | schedule | profile
  const [selectedSitio, setSelectedSitio] = useState("Sitio Kamagong");
  const [mapCenter, setMapCenter] = useState(null);
  
  // Mobile UI States
  const [toastNotice, setToastNotice] = useState(null);
  const [reminderActive, setReminderActive] = useState(false);
  const [wasteSearchQuery, setWasteSearchQuery] = useState("");
  const [selectedScheduleDay, setSelectedScheduleDay] = useState("Monday");
  const [reportFilter, setReportFilter] = useState("All");

  // Mobile Bottom Modals
  const [reportSheetOpen, setReportSheetOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [signOutSheetOpen, setSignOutSheetOpen] = useState(false);
  const [sitioSheetOpen, setSitioSheetOpen] = useState(false);

  // Form State
  const [formCategory, setFormCategory] = useState("Overflowing Bin");
  const [formLocation, setFormLocation] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formUrgency, setFormUrgency] = useState("Medium");
  const [formPhoto, setFormPhoto] = useState(false);
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);

  // Profile Settings Toggles
  const [smsAlerts, setSmsAlerts] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(false);

  // PWA Install Prompt State
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  // User Reports State
  const [userTickets, setUserTickets] = useState([
    {
      id: "TKT-C101",
      location: "Kamagong Basketball Court",
      sitio: "Sitio Kamagong",
      barangay: "Guadalupe",
      city: "Cebu City",
      reporter: "Orlan (You)",
      urgency: "Medium",
      status: "Resolved",
      date: "2026-08-24",
      time: "03:15 PM",
      lat: 10.326,
      lng: 123.882,
      category: "Overflowing Bin",
      description: "The commercial garbage bin near the Kamagong court was overflowing onto the walkway.",
      timeline: [
        { label: "Report Submitted", time: "03:15 PM, Aug 24", done: true },
        { label: "Dispatched to Truck 01", time: "03:45 PM, Aug 24", done: true },
        { label: "Cleaned & Cleared", time: "05:10 PM, Aug 24", done: true },
      ]
    },
    {
      id: "TKT-C102",
      location: "V. Rama Ave corner Banawa St",
      sitio: "V. Rama",
      barangay: "Guadalupe",
      city: "Cebu City",
      reporter: "Orlan (You)",
      urgency: "High",
      status: "In Progress",
      date: "2026-08-25",
      time: "09:10 AM",
      lat: 10.320,
      lng: 123.881,
      category: "Uncollected Waste",
      description: "Pile of uncollected trash bags sitting for 2 days attracting stray dogs.",
      timeline: [
        { label: "Report Submitted", time: "09:10 AM, Today", done: true },
        { label: "Dispatched to Truck 01", time: "09:30 AM, Today", done: true },
        { label: "Truck En Route to Area", time: "ETA 4 mins", done: false },
        { label: "Collection & Verified", time: "Pending", done: false },
      ]
    }
  ]);

  // Live Truck Telemetry
  const liveTruck = {
    id: "01",
    plate: "GW-8821",
    driver: "Juan Dela Cruz",
    capacity: "10 Tons",
    load: "72%",
    status: "Collecting in Sector A",
    eta: "4 mins",
    distance: "850m away",
    lat: 10.3245,
    lng: 123.8820,
  };

  useEffect(() => {
    // Auth guard — check active citizen session
    const checkAuth = (session) => {
      if (!session) {
        router.replace("/");
        return false;
      }
      const role = session?.user?.user_metadata?.role;
      if (role === "admin" || role === "driver") {
        router.replace("/");
        return false;
      }
      return true;
    };

    let mountedTimer;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (checkAuth(session)) {
        mountedTimer = setTimeout(() => setMounted(true), 0);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT" || !session) {
        router.replace("/");
      }
    });

    // Detect if already installed as PWA (standalone)
    const isStandaloneMode = window.matchMedia("(display-mode: standalone)").matches || 
                             window.navigator.standalone || 
                             document.referrer.includes("android-app://");

    // Detect iOS
    const userAgent = window.navigator.userAgent.toLowerCase();
    const ios = /iphone|ipad|ipod/.test(userAgent);
    setTimeout(() => setIsIOS(ios), 0);

    // Listen for Chrome/Android PWA install prompt
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      const dismissed = localStorage.getItem("pwa_prompt_dismissed");
      if (!isStandaloneMode && dismissed !== "true") {
        setShowInstallPrompt(true);
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Show iOS Guide if on mobile iOS browser, not installed, and not dismissed
    const dismissed = localStorage.getItem("pwa_prompt_dismissed");
    let timer;
    if (ios && !isStandaloneMode && dismissed !== "true") {
      timer = setTimeout(() => setShowInstallPrompt(true), 2500);
    }

    return () => {
      subscription.unsubscribe();
      if (mountedTimer) clearTimeout(mountedTimer);
      if (timer) clearTimeout(timer);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, [router]);

  const showToast = (message, icon = CheckCircle2) => {
    setToastNotice({ message, icon });
    setTimeout(() => setToastNotice(null), 3000);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const handleFileReport = (e) => {
    e.preventDefault();
    if (!formLocation || !formDescription) return;

    setIsSubmittingReport(true);
    setTimeout(() => {
      const newTkt = {
        id: `TKT-C${Math.floor(100 + Math.random() * 900)}`,
        location: formLocation,
        sitio: selectedSitio,
        barangay: "Guadalupe",
        city: "Cebu City",
        reporter: "Orlan (You)",
        urgency: formUrgency,
        status: "Pending",
        date: new Date().toISOString().split("T")[0],
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        lat: 10.322 + (Math.random() - 0.5) * 0.008,
        lng: 123.881 + (Math.random() - 0.5) * 0.008,
        category: formCategory,
        description: formDescription,
        photo: formPhoto,
        timeline: [
          { label: "Report Submitted", time: "Just now", done: true },
          { label: "Barangay Verification", time: "In Queue", done: false },
          { label: "Dispatch Sanitation Unit", time: "Pending", done: false },
        ]
      };

      setUserTickets(prev => [newTkt, ...prev]);
      setIsSubmittingReport(false);
      setReportSuccess(true);

      setTimeout(() => {
        setReportSuccess(false);
        setReportSheetOpen(false);
        setFormLocation("");
        setFormDescription("");
        setFormPhoto(false);
        setActiveTab("profile"); // Switched back to profile/history list
        setReportFilter("Pending");
        showToast("Report submitted successfully!", CheckCircle2);
      }, 1200);
    }, 900);
  };

  const focusMapOn = (coords) => {
    setMapCenter(coords);
    setActiveTab("map");
    setSheetExpanded(false);
  };

  const filteredWasteItems = useMemo(() => {
    if (!wasteSearchQuery.trim()) return wasteKnowledgeBase.slice(0, 4);
    return wasteKnowledgeBase.filter(item => 
      item.name.toLowerCase().includes(wasteSearchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(wasteSearchQuery.toLowerCase())
    );
  }, [wasteSearchQuery]);

  const filteredTickets = useMemo(() => {
    if (reportFilter === "All") return userTickets;
    return userTickets.filter(t => t.status === reportFilter);
  }, [userTickets, reportFilter]);

  const handleInstallPWA = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setDeferredPrompt(null);
        setShowInstallPrompt(false);
      }
    }
  };

  const handleDismissPWA = () => {
    localStorage.setItem("pwa_prompt_dismissed", "true");
    setShowInstallPrompt(false);
  };

  if (!mounted) return null;

  return (
    <div className="h-[100dvh] w-full flex flex-col bg-zinc-150 font-sans antialiased text-zinc-900 overflow-hidden select-none overscroll-none [-webkit-tap-highlight-color:transparent] touch-manipulation">
      
      {/* Centered Mobile Canvas Frame */}
      <div className="w-full max-w-md mx-auto h-full flex flex-col bg-zinc-50 border-x border-zinc-200/60 shadow-xl relative overflow-hidden">
        
        {/* Dynamic Toast System */}
        <AnimatePresence>
          {toastNotice && (
            <motion.div
              initial={{ y: -60, opacity: 0 }}
              animate={{ y: 16, opacity: 1 }}
              exit={{ y: -60, opacity: 0 }}
              transition={{ type: "spring", stiffness: 380, damping: 28 }}
              className="absolute top-0 left-4 right-4 z-50 pointer-events-none flex justify-center"
            >
              <div className="bg-zinc-900 text-white px-4 py-2.5 rounded-full text-xs font-semibold shadow-lg border border-white/5 flex items-center gap-2 max-w-sm pointer-events-auto">
                <toastNotice.icon className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="truncate">{toastNotice.message}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Minimalist Top Nav Header */}
        {activeTab !== "map" && (
          <header className="bg-white/80 backdrop-blur-md px-5 flex items-center justify-between shrink-0 z-30 sticky top-0 h-14 border-b border-zinc-100 pt-[env(safe-area-inset-top)]">
            <div className="flex items-center shrink-0 w-36 h-10 select-none">
              <img 
                src="/logo-green-v2.png" 
                alt="Bin-Go Logo" 
                className="h-14 w-auto object-contain mix-blend-multiply scale-[1.35] origin-left" 
              />
            </div>

            <motion.button 
              whileTap={{ scale: 0.95 }}
              onClick={() => setActiveTab("profile")}
              className={`flex items-center justify-center w-8 h-8 rounded-full bg-zinc-100 text-zinc-650 font-semibold text-xs transition-all border border-zinc-200/50 ${activeTab === 'profile' ? 'border-emerald-600 ring-2 ring-emerald-500/20' : ''}`}
            >
              O
            </motion.button>
          </header>
        )}

        {/* Main Workspace Viewport */}
        <main className="flex-1 overflow-hidden flex flex-col relative bg-zinc-50">
          <AnimatePresence mode="wait">
            
            {/* TAB: HOME */}
            {activeTab === "home" && (
              <motion.div
                key="home"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.12 }}
                className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-6 pb-24"
              >
                {/* Greeting */}
                <div className="flex flex-col gap-0.5">
                  <h2 className="text-xl font-black text-zinc-900 tracking-tight">Maayong Adlaw, Orlan 👋</h2>
                  <p className="text-[11px] text-zinc-400 font-medium">Here&apos;s your neighborhood collection update.</p>
                </div>

                {/* Today Status Strip */}
                <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm px-4 py-3.5 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                      <Truck className="w-4.5 h-4.5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-[11px] font-extrabold text-zinc-800 leading-tight">Biodegradable Pickup Today</p>
                      <p className="text-[10px] text-zinc-400 font-medium mt-0.5">08:00 AM – 11:00 AM · {selectedSitio}</p>
                    </div>
                  </div>
                  <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg shrink-0">
                    Active
                  </span>
                </div>

                {/* Quick Actions */}
                <div className="flex flex-col gap-2.5">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-350 px-0.5">Quick Actions</span>
                  <div className="grid grid-cols-2 gap-3">
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setReportSheetOpen(true)}
                      className="flex flex-col items-start gap-3 bg-rose-500 text-white p-4 rounded-2xl cursor-pointer shadow-[0_8px_20px_rgba(244,63,94,0.25),inset_-4px_-4px_8px_rgba(159,18,57,0.3),inset_3px_3px_6px_rgba(255,255,255,0.35)] transition-all border-0"
                    >
                      <AlertTriangle className="w-5 h-5 text-white/90" />
                      <div>
                        <span className="text-xs font-bold block leading-tight">Report Dump</span>
                        <span className="text-[9px] text-white/60 font-semibold block mt-0.5">File an issue</span>
                      </div>
                    </motion.button>

                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setActiveTab("map")}
                      className="flex flex-col items-start gap-3 bg-emerald-500 text-white p-4 rounded-2xl cursor-pointer shadow-[0_8px_20px_rgba(16,185,129,0.25),inset_-4px_-4px_8px_rgba(6,95,70,0.3),inset_3px_3px_6px_rgba(255,255,255,0.35)] transition-all border-0"
                    >
                      <MapPin className="w-5 h-5 text-white/90" />
                      <div>
                        <span className="text-xs font-bold block leading-tight">Track Truck</span>
                        <span className="text-[9px] text-white/60 font-semibold block mt-0.5">Live map</span>
                      </div>
                    </motion.button>
                  </div>
                </div>

                {/* Waste Sorting Search */}
                <div className="flex flex-col gap-2.5">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-zinc-350 px-0.5">Disposal Guide</span>

                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search item (e.g. bottle, scraps)..."
                      value={wasteSearchQuery}
                      onChange={(e) => setWasteSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-9 py-2.5 bg-white rounded-xl text-xs text-zinc-800 placeholder:text-zinc-350 shadow-xs border border-zinc-100 focus:outline-none focus:border-zinc-300 transition-colors font-medium"
                    />
                    {wasteSearchQuery && (
                      <button onClick={() => setWasteSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="flex flex-col rounded-2xl overflow-hidden border border-zinc-100 bg-white shadow-xs">
                    {filteredWasteItems.map((item, idx) => (
                      <div key={idx} className={`px-4 py-3 flex items-center justify-between gap-3 ${idx !== filteredWasteItems.length - 1 ? 'border-b border-zinc-50' : ''}`}>
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <span className="text-xs font-bold text-zinc-800 truncate">{item.name}</span>
                          <span className="text-[10px] text-zinc-400 font-medium leading-snug">{item.bin}</span>
                        </div>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                          item.category.includes("Bio") && !item.category.includes("Non")
                            ? "text-emerald-600 bg-emerald-50"
                            : item.category.includes("Hazardous")
                            ? "text-rose-600 bg-rose-50"
                            : "text-blue-600 bg-blue-50"
                        }`}>
                          {item.category.split(" ")[0]}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* TAB: LIVE MAP */}
            {activeTab === "map" && (
              <motion.div
                key="map"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex-1 relative w-full h-full"
              >
                {/* Maps Frame */}
                <div className="w-full h-full">
                  <MapCanvas 
                    tickets={userTickets} 
                    trucks={[{
                      id: liveTruck.id,
                      plate: liveTruck.plate,
                      driver: liveTruck.driver,
                      capacity: liveTruck.capacity,
                      lat: liveTruck.lat,
                      lng: liveTruck.lng,
                      eta: liveTruck.eta
                    }]}
                    mapMode="pins"
                    center={mapCenter}
                  />
                </div>

                {/* Minimalist Bottom Info Drawer - Claymorphic styled */}
                <div className="absolute bottom-3 left-3 right-3 z-20 bg-white/95 backdrop-blur-md rounded-[24px] shadow-[0_16px_32px_rgba(15,23,42,0.06),inset_-5px_-5px_10px_rgba(0,0,0,0.02),inset_3px_3px_6px_rgba(255,255,255,0.85)] flex flex-col border border-zinc-200/30 p-4 gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Truck className="w-5 h-5 text-emerald-600 shrink-0" />
                      <div>
                        <span className="text-xs font-extrabold text-zinc-800 block leading-tight">
                          {liveTruck.status}
                        </span>
                        <span className="text-[10px] text-zinc-400 font-bold">{liveTruck.driver} • {liveTruck.plate}</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-extrabold text-zinc-800">
                      ETA {liveTruck.eta}
                    </span>
                  </div>

                  {/* Horizontal Route Progress Stepper */}
                  <div className="border-t border-zinc-100 pt-3 flex flex-col gap-1">
                    <div className="flex justify-between items-center px-0.5">
                      <span className="text-[9px] font-extrabold uppercase tracking-wider text-zinc-400">Collection Route</span>
                      <span className="text-[9px] font-extrabold text-zinc-500">Stop 3 of 5</span>
                    </div>

                    <div className="flex flex-col gap-2.5 py-1 pt-1.5">
                      {/* Segmented Progress Track */}
                      <div className="flex gap-1 h-1.5 w-full bg-transparent px-0.5">
                        <div className="flex-1 bg-emerald-500 rounded-full h-full" />
                        <div className="flex-1 bg-emerald-500 rounded-full h-full" />
                        <div className="flex-1 bg-zinc-200/60 rounded-full h-full" />
                        <div className="flex-1 bg-zinc-200/60 rounded-full h-full" />
                      </div>

                      {/* Stop Labels */}
                      <div className="flex justify-between items-center px-0.5 text-[9px] font-extrabold tracking-tight">
                        <span className="text-zinc-650">Garage</span>
                        <span className="text-zinc-650">Sitio A</span>
                        <span className="text-emerald-600 flex items-center gap-0.5 font-black">
                          <Truck className="w-3 h-3 shrink-0" /> Kamagong
                        </span>
                        <span className="text-zinc-400">Sitio B</span>
                        <span className="text-zinc-400">Disposal</span>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* TAB: SCHEDULES */}
            {activeTab === "schedule" && (
              <motion.div
                key="schedule"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.12 }}
                className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4 pb-24"
              >
                <div>
                  <h2 className="text-base font-bold text-zinc-900 leading-tight">Pickup Calendars</h2>
                  <p className="text-[10px] text-zinc-400 font-medium">Choose days to inspect your neighborhood segregation types.</p>
                </div>

                {/* Horizontal day chips */}
                <div className="flex gap-1.5 overflow-x-auto pb-1.5 scrollbar-hide shrink-0">
                  {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((day) => {
                    const isSelected = selectedScheduleDay === day;
                    const isToday = day === "Monday";
                    return (
                      <button
                        key={day}
                        onClick={() => setSelectedScheduleDay(day)}
                        className={`py-1.5 px-3 rounded-xl border text-[11px] font-bold transition-all shrink-0 cursor-pointer active:scale-95 ${
                          isSelected
                            ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                            : "bg-white text-zinc-500 border-zinc-200/70 hover:border-zinc-300"
                        }`}
                      >
                        {isToday ? "Today" : day.slice(0, 3)}
                      </button>
                    );
                  })}
                </div>

                {/* Day Schedule Panel */}
                <div className="bg-white border border-zinc-200/50 rounded-xl p-4 flex flex-col gap-3 shadow-xs shrink-0">
                  <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-800">
                      <Calendar className="w-4 h-4 text-emerald-600" />
                      <span>{selectedScheduleDay} Details</span>
                    </div>
                    <span className="text-[9px] font-bold text-emerald-600 border border-zinc-200/60 bg-white px-2 py-0.5 rounded-md">
                      {selectedScheduleDay === "Tuesday" || selectedScheduleDay === "Thursday" 
                        ? "Di-Nabubulok" 
                        : "Nabubulok"}
                    </span>
                  </div>

                  <div className="flex flex-col gap-1 text-[11px] font-medium text-zinc-550 leading-relaxed">
                    <span className="font-bold text-zinc-800 text-xs block leading-tight">
                      {selectedScheduleDay === "Tuesday" || selectedScheduleDay === "Thursday" 
                        ? "Non-Biodegradable (Dry Trash / Recyclables)" 
                        : "Biodegradable (Kitchen & Organic Trash)"}
                    </span>
                    <p className="mt-1">Covered areas: {selectedSitio}, banawa district pathways, and riversides.</p>
                    <div className="flex items-center gap-1 mt-2 text-zinc-400">
                      <Clock className="w-3.5 h-3.5 text-emerald-600/70" />
                      <span>
                        {selectedScheduleDay === "Tuesday" || selectedScheduleDay === "Thursday" 
                          ? "01:00 PM - 04:00 PM" 
                          : "08:00 AM - 11:00 AM"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Prompt Card */}
                <div 
                  onClick={() => setActiveTab("home")}
                  className="bg-white border border-zinc-200/50 rounded-xl p-4 flex items-center justify-between shadow-xs shrink-0 cursor-pointer hover:bg-zinc-50 active:scale-98 transition-all"
                >
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-zinc-800">Segregation Doubts?</span>
                    <span className="text-[10px] text-zinc-400 font-medium mt-0.5">Use our sorting search library</span>
                  </div>
                  <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                    <Search className="w-3.5 h-3.5" />
                  </div>
                </div>

              </motion.div>
            )}

            {/* TAB: PROFILE & LOGS */}
            {activeTab === "profile" && (
              <motion.div
                key="profile"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.12 }}
                className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-4 pb-24"
              >
                {/* Profile Widget */}
                <button 
                  onClick={() => setSitioSheetOpen(true)}
                  className="flex items-center text-left gap-3 bg-white hover:bg-zinc-50 active:scale-98 transition-all border border-zinc-200/50 p-4 rounded-xl shadow-xs w-full group cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shadow-sm shrink-0">
                    O
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <h3 className="text-xs font-bold text-zinc-900 leading-tight">Orlan (Guadalupe Resident)</h3>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[10px] text-emerald-700 font-bold">{selectedSitio}</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-350 transition-colors shrink-0" />
                </button>

                {/* Scorecards grid */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-white border border-zinc-200/50 p-3 rounded-xl flex flex-col items-center justify-center text-center shadow-xs">
                    <span className="text-sm font-extrabold text-zinc-900 leading-tight">{userTickets.length}</span>
                    <span className="text-[8px] text-zinc-400 font-bold uppercase tracking-wider mt-1">Total Logs</span>
                  </div>
                  <div className="bg-white border border-zinc-200/50 p-3 rounded-xl flex flex-col items-center justify-center text-center shadow-xs">
                    <span className="text-sm font-extrabold text-zinc-900 leading-tight">{userTickets.filter(t => t.status === "Resolved").length}</span>
                    <span className="text-[8px] text-zinc-400 font-bold uppercase tracking-wider mt-1">Resolved</span>
                  </div>
                  <div className="bg-white border border-zinc-200/50 p-3 rounded-xl flex flex-col items-center justify-center text-center shadow-xs">
                    <span className="text-sm font-extrabold text-emerald-600 leading-tight">120</span>
                    <span className="text-[8px] text-zinc-400 font-bold uppercase tracking-wider mt-1">Eco Points</span>
                  </div>
                </div>

                {/* Ticket Logs list */}
                <div className="bg-white border border-zinc-200/50 rounded-xl p-4 flex flex-col gap-3 shadow-xs">
                  <div className="flex flex-col gap-2 border-b border-zinc-100 pb-3">
                    <h3 className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">Incident Reports History</h3>
                    <div className="flex gap-1 overflow-x-auto scrollbar-hide">
                      {["All", "Pending", "In Progress", "Resolved"].map((status) => {
                        const isActive = reportFilter === status;
                        return (
                          <button
                            key={status}
                            onClick={() => setReportFilter(status)}
                            className={`px-2.5 py-1 rounded-lg text-[9px] font-bold transition-all shrink-0 cursor-pointer ${
                              isActive 
                                ? "bg-zinc-900 text-white shadow-2xs" 
                                : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200/70"
                            }`}
                          >
                            {status}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 max-h-[190px] overflow-y-auto pr-0.5">
                    {filteredTickets.length === 0 ? (
                      <div className="text-center py-5 flex flex-col items-center justify-center bg-zinc-50 border border-zinc-200/50 rounded-xl p-3">
                        <CheckCircle2 className="w-5 h-5 text-zinc-350 mb-1" />
                        <h4 className="text-[10px] font-bold text-zinc-800">Clean Records</h4>
                        <p className="text-[8px] text-zinc-400 mt-0.5">No reports logged under this filter.</p>
                      </div>
                    ) : (
                      filteredTickets.map((t) => (
                        <div 
                          key={t.id}
                          onClick={() => setSelectedTicket(t)}
                          className="bg-white border border-zinc-250/70 hover:border-zinc-350 p-3 rounded-lg flex flex-col gap-2 transition-all cursor-pointer shadow-2xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-[9px] font-bold text-zinc-400 uppercase">{t.id}</span>
                            <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded-sm ${
                              t.status === "Resolved" 
                                ? "text-emerald-700 bg-emerald-50 border border-emerald-150" 
                                : t.status === "In Progress"
                                ? "text-blue-700 bg-blue-50 border border-blue-150"
                                : "text-amber-700 bg-amber-50 border border-amber-150"
                            }`}>
                              {t.status}
                            </span>
                          </div>
                          <div>
                            <h4 className="text-[11px] font-bold text-zinc-800 leading-tight">{t.category}</h4>
                            <p className="text-[9px] text-zinc-450 line-clamp-1 mt-0.5 font-medium">{t.description}</p>
                          </div>
                          <div className="border-t border-zinc-100 pt-1.5 mt-0.5 flex items-center justify-between text-[8px] font-bold text-zinc-400">
                            <span className="truncate pr-2">{t.location}</span>
                            <span>{t.date}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Notifications & Toggles */}
                <div className="bg-white border border-zinc-200/50 rounded-xl p-4 flex flex-col gap-3.5 shadow-xs">
                  <h3 className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider border-b border-zinc-100 pb-1.5">Notification Toggles</h3>
                  
                  <div className="flex items-center justify-between py-0.5 text-[11px]">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-bold text-zinc-800">SMS Arrival Alerts (10m away)</span>
                      <p className="text-[8px] text-zinc-400 font-medium">Alert when pickup compactor is near</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer select-none">
                      <input type="checkbox" checked={smsAlerts} onChange={() => setSmsAlerts(!smsAlerts)} className="sr-only peer" />
                      <div className="w-8 h-4.5 bg-zinc-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-emerald-600" />
                    </label>
                  </div>

                  <div className="flex items-center justify-between py-0.5 text-[11px] border-t border-zinc-100 pt-3">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-bold text-zinc-800">Weekly Schedule Digest</span>
                      <p className="text-[8px] text-zinc-400 font-medium">Receive pickup reminders dynamically</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer select-none">
                      <input type="checkbox" checked={weeklyDigest} onChange={() => setWeeklyDigest(!weeklyDigest)} className="sr-only peer" />
                      <div className="w-8 h-4.5 bg-zinc-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-emerald-600" />
                    </label>
                  </div>
                </div>

                <div className="bg-white border border-zinc-200/50 rounded-xl p-3.5 flex flex-col gap-2 shadow-xs text-[11px] font-semibold text-zinc-700">
                  <h3 className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider border-b border-zinc-100 pb-1.5">Barangay Directory</h3>
                  <div className="flex items-center justify-between mt-1">
                    <div className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Guadalupe Sanitation</span>
                    </div>
                    <span className="font-bold text-zinc-500">(032) 254-8891</span>
                  </div>
                </div>

                {/* Log Out button */}
                <button 
                  onClick={() => setSignOutSheetOpen(true)}
                  className="w-full bg-white border border-zinc-200 hover:bg-rose-50/50 hover:text-rose-600 hover:border-rose-100 text-zinc-600 font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs mt-1"
                >
                  <LogOut className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Sign Out</span>
                </button>
              </motion.div>
            )}

          </AnimatePresence>
        </main>

        {/* Minimalist Bottom Tab Bar - Attached Clay Dock */}
        <div className="shrink-0 z-30 relative w-full bg-white border-t border-zinc-200/40 shadow-[0_-8px_24px_rgba(15,23,42,0.04),inset_0_3px_6px_rgba(255,255,255,0.85)] pb-[calc(8px+env(safe-area-inset-bottom))] pt-2.5 px-4">
          <nav className="w-full flex justify-around items-center h-12 bg-transparent">
            {[
              { id: "home", label: "Home", icon: Home },
              { id: "map", label: "Track", icon: MapIcon },
              { id: "schedule", label: "Schedule", icon: Calendar }
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <motion.button
                  whileTap={{ scale: 0.92 }}
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className="flex flex-col items-center justify-center gap-1 transition-all cursor-pointer w-14 group"
                >
                  <Icon className={`w-5 h-5 transition-colors ${isActive ? "text-emerald-600" : "text-zinc-400 group-hover:text-zinc-500"}`} strokeWidth={isActive ? 2.5 : 2} />
                  <span className={`text-[9px] font-bold tracking-wide transition-colors ${isActive ? "text-emerald-600" : "text-zinc-400"}`}>
                    {tab.label}
                  </span>
                </motion.button>
              );
            })}
          </nav>
        </div>

        {/* Floating PWA Install Prompt Widget (Drawer style) */}
        <AnimatePresence>
          {showInstallPrompt && (
            <div className="absolute bottom-16 left-3 right-3 z-[60] bg-zinc-900 text-white rounded-2xl shadow-xl border border-white/5 p-4 flex flex-col gap-3.5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 bg-emerald-600 rounded-lg flex items-center justify-center shrink-0">
                    <Download className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold leading-tight">Install Bin-Go App</h3>
                    <p className="text-[9px] text-zinc-450 font-medium mt-0.5">Place on Home Screen for live telemetry alerts.</p>
                  </div>
                </div>
                <button onClick={handleDismissPWA} className="text-zinc-400 hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {isIOS ? (
                <div className="bg-zinc-800 p-2.5 rounded-xl text-[10px] text-zinc-300 font-medium leading-relaxed">
                  Tap the Safari <span className="font-bold text-white">Share</span> button, then select <span className="font-bold text-emerald-400">Add to Home Screen</span>.
                </div>
              ) : (
                <div className="flex gap-2 text-[10px] font-bold justify-end pt-1">
                  <button onClick={handleDismissPWA} className="text-zinc-400 px-3 py-1.5">Later</button>
                  <button onClick={handleInstallPWA} className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg">Install Now</button>
                </div>
              )}
            </div>
          )}
        </AnimatePresence>

      </div>

      {/* BOTTOM SHEET MODAL: FILE A REPORT */}
      <AnimatePresence>
        {reportSheetOpen && (
          <div className="fixed inset-0 z-50 flex items-end justify-center">
            {/* Backdrop overlay */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isSubmittingReport && setReportSheetOpen(false)}
              className="absolute inset-0 bg-zinc-900/40 backdrop-blur-xs" 
            />

            {/* Content drawer */}
            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 360, damping: 29 }}
              className="relative w-full max-w-md bg-white rounded-t-2xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[85vh] border border-zinc-200"
            >
              <div className="pt-2 pb-0.5 flex justify-center cursor-grab shrink-0">
                <div className="w-10 h-1 bg-zinc-200 rounded-full" />
              </div>

              <div className="px-5 py-3 border-b border-zinc-100 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-500" />
                  <span className="text-xs font-bold text-zinc-900">File Incident Report</span>
                </div>
                <button 
                  onClick={() => setReportSheetOpen(false)}
                  disabled={isSubmittingReport}
                  className="p-1 bg-zinc-100 hover:bg-zinc-200/70 rounded-md text-zinc-500"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Form Body */}
              <div className="p-5 overflow-y-auto">
                {reportSuccess ? (
                  <div className="text-center py-6 flex flex-col items-center justify-center">
                    <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 mb-3 animate-bounce">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <h4 className="text-xs font-bold text-zinc-900">Report Dispatched!</h4>
                    <p className="text-[10px] text-zinc-400 mt-1 max-w-[200px] leading-tight">Your ticket has been sent to the live driver queue.</p>
                  </div>
                ) : (
                  <form onSubmit={handleFileReport} className="flex flex-col gap-3.5 text-xs">
                    
                    {/* Category Selection */}
                    <div className="flex flex-col gap-1">
                      <label className="font-bold text-zinc-700">Issue Category</label>
                      <div className="grid grid-cols-2 gap-1.5">
                        {["Overflowing Bin", "Illegal Dumping", "Uncollected Trash", "Drainage Clog"].map((cat) => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setFormCategory(cat)}
                            className={`py-2 px-2.5 rounded-lg text-[11px] font-bold text-left border transition-all active:scale-[0.97] cursor-pointer ${
                              formCategory === cat
                                ? "bg-emerald-50/50 border-emerald-600 text-emerald-800 font-extrabold"
                                : "bg-white border-zinc-200 text-zinc-600 hover:border-zinc-300"
                            }`}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Location Landmark */}
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <label className="font-bold text-zinc-700">Location Details</label>
                        <button
                          type="button"
                          onClick={() => setFormLocation(`Near ${selectedSitio}, Guadalupe`)}
                          className="text-[9px] font-bold text-emerald-650 hover:underline"
                        >
                          Use Current Sitio
                        </button>
                      </div>
                      <input 
                        type="text"
                        placeholder="e.g. Near Chapel, Basketball Court..."
                        value={formLocation}
                        onChange={(e) => setFormLocation(e.target.value)}
                        required
                        className="px-3 py-2 border border-zinc-200 rounded-lg bg-zinc-50/50 focus:bg-white focus:border-zinc-400 outline-none font-medium"
                      />
                    </div>

                    {/* Urgency */}
                    <div className="flex flex-col gap-1">
                      <label className="font-bold text-zinc-700">Urgency Level</label>
                      <div className="grid grid-cols-4 gap-1.5">
                        {["Low", "Medium", "High", "Critical"].map((urg) => (
                          <button
                            key={urg}
                            type="button"
                            onClick={() => setFormUrgency(urg)}
                            className={`py-1.5 rounded-lg text-[9px] font-bold uppercase border transition-all active:scale-95 ${
                              formUrgency === urg
                                ? "bg-zinc-900 text-white border-zinc-900"
                                : "bg-white text-zinc-500 border-zinc-200"
                            }`}
                          >
                            {urg}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Description */}
                    <div className="flex flex-col gap-1">
                      <label className="font-bold text-zinc-700">Details</label>
                      <textarea 
                        rows={2}
                        placeholder="Describe the pile size, odors, or visual notes..."
                        value={formDescription}
                        onChange={(e) => setFormDescription(e.target.value)}
                        required
                        className="px-3 py-2 border border-zinc-200 rounded-lg bg-zinc-50/50 focus:bg-white focus:border-zinc-400 outline-none font-medium resize-none leading-relaxed"
                      />
                    </div>

                    {/* Photo Attachment */}
                    <div className="flex flex-col gap-1">
                      <label className="font-bold text-zinc-700">Photo Attachment</label>
                      {formPhoto ? (
                        <div className="border border-zinc-200 p-2 rounded-lg flex items-center justify-between bg-zinc-50">
                          <div className="flex items-center gap-1.5">
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-[10px] font-semibold text-zinc-600">trash_photo_geo.jpg</span>
                          </div>
                          <button type="button" onClick={() => setFormPhoto(false)} className="text-zinc-400 hover:text-zinc-655">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setFormPhoto(true)}
                          className="border border-dashed border-zinc-250 p-2.5 rounded-lg flex items-center justify-center gap-1.5 text-zinc-500 hover:border-emerald-500 hover:text-emerald-700 font-bold bg-zinc-50/40 active:scale-[0.98] transition-all"
                        >
                          <Camera className="w-3.5 h-3.5 text-zinc-400" />
                          <span>Attach Photo</span>
                        </button>
                      )}
                    </div>

                    <button 
                      type="submit"
                      disabled={isSubmittingReport}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold py-2.5 rounded-lg shadow-2xs mt-1 flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      {isSubmittingReport ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Dispatching...</span>
                        </>
                      ) : (
                        "Submit Report"
                      )}
                    </button>
                  </form>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* BOTTOM SHEET: TICKET TIMELINE */}
      <AnimatePresence>
        {selectedTicket && (
          <div className="fixed inset-0 z-50 flex items-end justify-center">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedTicket(null)}
              className="absolute inset-0 bg-zinc-900/40 backdrop-blur-xs" 
            />

            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 360, damping: 29 }}
              className="relative w-full max-w-md bg-white rounded-t-2xl shadow-2xl overflow-hidden z-10 flex flex-col max-h-[80vh] border border-zinc-200"
            >
              <div className="pt-2 pb-0.5 flex justify-center cursor-grab shrink-0">
                <div className="w-10 h-1 bg-zinc-200 rounded-full" />
              </div>

              <div className="px-5 py-3 border-b border-zinc-100 flex items-center justify-between shrink-0">
                <div>
                  <span className="font-mono text-[8px] font-bold text-zinc-400 uppercase">{selectedTicket.id}</span>
                  <h3 className="text-xs font-bold text-zinc-900 mt-0.5">{selectedTicket.category}</h3>
                </div>
                <button onClick={() => setSelectedTicket(null)} className="p-1 bg-zinc-100 hover:bg-zinc-200 rounded-md text-zinc-500">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="p-5 overflow-y-auto flex flex-col gap-3 text-xs">
                <div className="flex justify-between items-center text-[11px] font-bold">
                  <span className="text-zinc-450 uppercase text-[9px]">Report Status</span>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                    selectedTicket.status === "Resolved" 
                      ? "text-emerald-700 bg-emerald-50 border border-emerald-100" 
                      : selectedTicket.status === "In Progress"
                      ? "text-blue-700 bg-blue-50 border border-blue-100"
                      : "text-amber-700 bg-amber-50 border border-amber-100"
                  }`}>
                    {selectedTicket.status}
                  </span>
                </div>

                <div className="flex justify-between items-center border-t border-zinc-100 pt-2 text-[11px] font-bold">
                  <span className="text-zinc-450 uppercase text-[9px]">Priority Level</span>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                    selectedTicket.urgency === "Critical" 
                      ? "text-rose-700 bg-rose-50 border border-rose-100 animate-pulse" 
                      : selectedTicket.urgency === "High"
                      ? "text-orange-700 bg-orange-50 border border-orange-100"
                      : selectedTicket.urgency === "Medium"
                      ? "text-amber-700 bg-amber-50 border border-amber-100"
                      : "text-emerald-700 bg-emerald-50 border border-emerald-100"
                  }`}>
                    {selectedTicket.urgency}
                  </span>
                </div>

                <div className="flex flex-col gap-1 border-t border-zinc-100 pt-2 font-medium">
                  <span className="text-[9px] text-zinc-400 font-bold uppercase">Location details</span>
                  <p className="font-bold text-zinc-800">{selectedTicket.location}</p>
                </div>

                <div className="flex flex-col gap-1 border-t border-zinc-100 pt-2">
                  <span className="text-[9px] text-zinc-400 font-bold uppercase">Detailed description</span>
                  <p className="text-zinc-650 bg-zinc-50/50 p-2.5 rounded-lg border border-zinc-200/50 leading-relaxed font-medium">
                    {selectedTicket.description}
                  </p>
                </div>

                {/* Timeline progress */}
                {selectedTicket.timeline && (
                  <div className="flex flex-col gap-2 border-t border-zinc-100 pt-2">
                    <span className="text-[9px] text-zinc-400 font-bold uppercase">Timeline Progress</span>
                    <div className="flex flex-col gap-2.5 pl-1.5">
                      {selectedTicket.timeline.map((step, idx) => (
                        <div key={idx} className="flex items-start gap-2.5 text-[10px]">
                          <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                            step.done ? "bg-emerald-600 text-white" : "bg-zinc-200 text-zinc-400"
                          }`}>
                            <Check className="w-2 h-2 stroke-[3.5]" />
                          </div>
                          <div className="flex flex-col leading-tight">
                            <span className={`font-bold ${step.done ? "text-zinc-800" : "text-zinc-400"}`}>{step.label}</span>
                            <span className="text-[8px] text-zinc-400 font-semibold">{step.time}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <button 
                  onClick={() => {
                    setSelectedTicket(null);
                    focusMapOn([selectedTicket.lat, selectedTicket.lng]);
                  }}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold py-2.5 rounded-lg flex items-center justify-center gap-1.5 shadow-2xs mt-2 cursor-pointer"
                >
                  <MapIcon className="w-3.5 h-3.5" />
                  <span>Show on Live Map</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* BOTTOM SHEET: SITIO SWITCHER */}
      <AnimatePresence>
        {sitioSheetOpen && (
          <div className="fixed inset-0 z-50 flex items-end justify-center">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSitioSheetOpen(false)}
              className="absolute inset-0 bg-zinc-900/40 backdrop-blur-xs" 
            />

            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 360, damping: 29 }}
              className="relative w-full max-w-md bg-white rounded-t-2xl shadow-2xl overflow-hidden z-10 flex flex-col border border-zinc-200 p-5 gap-3"
            >
              <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
                <div>
                  <h3 className="text-xs font-bold text-zinc-900">Select Barangay Sector</h3>
                  <p className="text-[9px] text-zinc-400 mt-0.5">Filter pickup schedules and compaction routing</p>
                </div>
                <button onClick={() => setSitioSheetOpen(false)} className="p-1 bg-zinc-100 rounded-md text-zinc-500">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="flex flex-col gap-2">
                {[
                  { name: "Sitio Kamagong", detail: "North Zone • Banawa Street Sector" },
                  { name: "Sitio Riverside", detail: "South Zone • V. Rama Avenue Sector" },
                  { name: "Guadalupe Proper", detail: "Central Zone • Parish Church Sector" }
                ].map((sitio) => (
                  <button
                    key={sitio.name}
                    onClick={() => {
                      setSelectedSitio(sitio.name);
                      setSitioSheetOpen(false);
                      showToast(`Switched to ${sitio.name}`, MapPin);
                    }}
                    className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all active:scale-98 cursor-pointer ${
                      selectedSitio === sitio.name
                        ? "bg-emerald-50/50 border-emerald-500 text-emerald-950 font-bold"
                        : "bg-white border-zinc-200 text-zinc-700 hover:bg-zinc-50"
                    }`}
                  >
                    <div className="flex flex-col text-xs font-semibold">
                      <span>{sitio.name}</span>
                      <span className="text-[9px] text-zinc-450 font-medium">{sitio.detail}</span>
                    </div>
                    {selectedSitio === sitio.name && <Check className="w-4 h-4 text-emerald-600" />}
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* BOTTOM SHEET: SIGN OUT CONFIRMATION */}
      <AnimatePresence>
        {signOutSheetOpen && (
          <div className="fixed inset-0 z-50 flex items-end justify-center">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSignOutSheetOpen(false)}
              className="absolute inset-0 bg-zinc-900/40 backdrop-blur-xs" 
            />

            <motion.div 
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 360, damping: 29 }}
              className="relative w-full max-w-md bg-white rounded-t-2xl shadow-2xl overflow-hidden z-10 flex flex-col p-5 gap-4 border border-zinc-200"
            >
              <div className="flex flex-col gap-1">
                <h3 className="text-xs font-bold text-zinc-900">Sign out of Bin&apos;Go?</h3>
                <p className="text-[10px] text-zinc-500 leading-relaxed font-medium">
                  You&apos;ll need to authenticate again to track live compactor routes and access your report history.
                </p>
              </div>

              <div className="flex gap-2 text-xs font-bold">
                <button 
                  onClick={() => setSignOutSheetOpen(false)}
                  className="flex-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 py-2.5 rounded-xl cursor-pointer active:scale-98 transition-all"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSignOut}
                  className="flex-1 bg-rose-600 hover:bg-rose-700 text-white py-2.5 rounded-xl cursor-pointer active:scale-98 transition-all shadow-xs"
                >
                  Sign Out
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
