import Link from "next/link";
import { ArrowRight, ShieldCheck, Clock, Wifi, Battery, MapPin, Truck, Download } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="flex flex-col w-full overflow-hidden">
      {/* Hero Section */}
      <section className="relative pt-24 pb-16 lg:py-0 lg:h-screen lg:min-h-[640px] flex items-center overflow-hidden bg-[url('/hero-bg.jpg')] bg-cover bg-center bg-no-repeat">
        {/* Subtle overlay to ensure high text contrast */}
        <div className="absolute inset-0 bg-white/20 -z-10" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-4 items-center lg:items-center pt-2 lg:pt-0">
            
            {/* Phone Side (Now Left) */}
            <div className="flex justify-center lg:justify-center xl:justify-start relative animate-in-fade xl:pl-8" style={{ animationDelay: "400ms" }}>
               <PhoneMockup />
            </div>

            {/* Text Side (Now Right) */}
            <div className="flex flex-col items-center lg:items-start text-center lg:text-left lg:pl-12 xl:pl-16 lg:pr-12 xl:pr-24 lg:border-l lg:border-zinc-200/60">
              <h1 className="text-5xl sm:text-6xl lg:text-7xl [@media(max-height:800px)]:text-6xl [@media(max-height:720px)]:text-5xl font-bold tracking-tight text-zinc-900 mb-6 [@media(max-height:800px)]:mb-4 leading-[1.1] animate-in-fade" style={{ animationDelay: "100ms" }}>
                Smart waste collection, <br className="hidden lg:block"/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500">simplified.</span>
              </h1>
              
              <p className="text-lg sm:text-xl [@media(max-height:800px)]:text-base text-zinc-600 mb-8 [@media(max-height:800px)]:mb-6 max-w-xl leading-relaxed font-medium animate-in-fade" style={{ animationDelay: "200ms" }}>
                Never miss a collection day again. Live track garbage trucks, receive instant arrival alerts, and help keep your community clean.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto animate-in-fade" style={{ animationDelay: "300ms" }}>
                <Link 
                  href="#" 
                  className="w-full sm:w-auto flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-full text-sm sm:text-base font-bold transition-all shadow-lg shadow-emerald-600/20 hover:shadow-xl hover:-translate-y-0.5"
                >
                  Download the App <Download className="w-4 h-4" />
                </Link>
                <button 
                  type="button"
                  className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white hover:bg-zinc-50 text-zinc-900 border-2 border-zinc-200 px-6 py-3 rounded-full text-sm sm:text-base font-bold transition-all"
                >
                  Request Demo
                </button>
              </div>
            </div>

          </div>
        </div>
      </section>
    </div>
  );
}

function PhoneMockup() {
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
          <div className="flex-1 relative w-full overflow-hidden bg-zinc-50 flex flex-col pt-2">
            <div className="p-4 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center border border-emerald-200">
                    <span className="text-emerald-700 font-bold text-xs">GC</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-zinc-900 leading-tight">Hello, Maria!</h3>
                    <p className="text-[10px] text-zinc-500 font-medium">Brgy. Guadalupe</p>
                  </div>
                </div>
                <div className="w-8 h-8 rounded-full bg-white border border-zinc-200 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-zinc-600" />
                </div>
              </div>

              <div className="bg-white p-4 rounded-2xl shadow-sm border border-zinc-100 relative overflow-hidden">
                <div className="absolute right-0 top-0 w-24 h-24 bg-emerald-50 rounded-bl-full -z-0 opacity-50" />
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-zinc-900">Next Collection</span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">Today</span>
                  </div>
                  <h4 className="text-2xl font-black text-emerald-600 mb-1">02:30 PM</h4>
                  <p className="text-xs text-zinc-500 font-medium flex items-center gap-1.5">
                    <Truck className="w-3 h-3" /> Biodegradable Waste
                  </p>
                </div>
              </div>

              <div className="bg-emerald-600 p-4 rounded-2xl shadow-md text-white relative overflow-hidden">
                <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-white/10 rounded-full blur-xl" />
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-emerald-50">Report Issue</span>
                    <ShieldCheck className="w-4 h-4 text-emerald-100" />
                  </div>
                  <h4 className="text-sm font-bold mb-1">See uncollected trash?</h4>
                  <p className="text-[10px] text-emerald-100 mb-4">Snap a photo and we&apos;ll handle it.</p>
                  <button type="button" className="w-full bg-white text-emerald-700 hover:bg-emerald-50 transition-colors text-xs font-bold py-2.5 rounded-xl flex justify-center items-center gap-1.5">
                    <MapPin className="w-3 h-3" /> Report Now
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom iOS Home Bar */}
          <div className="pb-1.5 pt-1 flex justify-center shrink-0 z-30 bg-white border-t border-slate-100">
            <div className="w-20 xl:w-24 h-1 bg-slate-900 rounded-full" />
          </div>
          
        </div>
      </div>
    </div>
  );
}
