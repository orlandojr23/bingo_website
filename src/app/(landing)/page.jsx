import Link from "next/link";
import { ArrowRight, Leaf, ShieldCheck, Map, BarChart3, Clock, Users, Wifi, Battery, MapPin, Truck } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="flex flex-col w-full overflow-hidden">
      {/* Hero Section */}
      <section className="relative pt-8 pb-16 lg:py-0 lg:h-[calc(100vh-72px)] lg:min-h-[580px] flex items-center overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-white -z-10" />
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-emerald-100/40 rounded-full blur-3xl opacity-50 -translate-y-1/2 translate-x-1/3 -z-10 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-sky-50/50 rounded-full blur-3xl opacity-60 translate-y-1/3 -translate-x-1/4 -z-10 pointer-events-none" />

        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-4 items-center lg:items-center pt-2 lg:pt-0">
            
            {/* Text Side */}
            <div className="flex flex-col items-center lg:items-start text-center lg:text-left">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-zinc-900 mb-4 leading-[1.1] animate-in-fade" style={{ animationDelay: "100ms" }}>
                Smart waste collection, <br className="hidden lg:block"/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500">simplified.</span>
              </h1>
              
              <p className="text-base sm:text-lg text-zinc-600 mb-6 max-w-lg leading-relaxed font-medium animate-in-fade" style={{ animationDelay: "200ms" }}>
                Bin&apos;Go empowers citizens to report uncollected garbage and enables local governments to track, route, and resolve waste incidents in real-time.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto animate-in-fade" style={{ animationDelay: "300ms" }}>
                <Link 
                  href="/dashboard" 
                  className="w-full sm:w-auto flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-full text-sm sm:text-base font-bold transition-all shadow-lg shadow-emerald-600/20 hover:shadow-xl hover:-translate-y-0.5"
                >
                  Access Dashboard <ArrowRight className="w-5 h-5" />
                </Link>
                <button 
                  type="button"
                  className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white hover:bg-zinc-50 text-zinc-900 border-2 border-zinc-200 px-6 py-3 rounded-full text-sm sm:text-base font-bold transition-all"
                >
                  Request Demo
                </button>
              </div>
            </div>

            {/* Phone Side */}
            <div className="flex justify-center lg:justify-center xl:justify-end relative animate-in-fade xl:pr-8" style={{ animationDelay: "400ms" }}>
               <PhoneMockup />
            </div>

          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 border-y border-zinc-200/80 bg-zinc-50/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 divide-x divide-zinc-200/60 text-center">
            <div className="flex flex-col gap-1">
              <span className="text-4xl font-bold text-zinc-900">12k+</span>
              <span className="text-sm font-bold text-zinc-500">Incidents Resolved</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-4xl font-bold text-zinc-900">45</span>
              <span className="text-sm font-bold text-zinc-500">Active Trucks</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-4xl font-bold text-zinc-900">&lt;2h</span>
              <span className="text-sm font-bold text-zinc-500">Avg. Response Time</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-4xl font-bold text-zinc-900">80</span>
              <span className="text-sm font-bold text-zinc-500">Barangays Covered</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-zinc-900 mb-4 tracking-tight">Everything you need to keep streets clean.</h2>
            <p className="text-lg text-zinc-600 font-medium">A complete suite of tools for citizens, collectors, and city administrators.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 sm:gap-8">
            <FeatureCard 
              icon={Map}
              title="Live Fleet Tracking"
              description="Monitor the real-time location of garbage trucks and optimize collection routes dynamically."
            />
            <FeatureCard 
              icon={ShieldCheck}
              title="Verified Citizen Reports"
              description="Empower residents to drop pins on uncollected waste with photo evidence and priority tagging."
            />
            <FeatureCard 
              icon={BarChart3}
              title="Predictive Analytics"
              description="Identify waste hotspots and forecast collection needs based on historical data."
            />
            <FeatureCard 
              icon={Clock}
              title="Instant Dispatching"
              description="Automatically assign the nearest available truck to high-priority overflow incidents."
            />
            <FeatureCard 
              icon={Users}
              title="Community Engagement"
              description="Keep citizens informed with SMS or push notifications when their reported area is cleaned."
            />
            <FeatureCard 
              icon={Leaf}
              title="Eco-Impact Metrics"
              description="Track total tonnage collected, recycling rates, and carbon footprint reduction over time."
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-zinc-900 text-white relative overflow-hidden">
        <div className="absolute inset-0 bg-emerald-950/20 mix-blend-overlay"></div>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center relative z-10">
          <h2 className="text-4xl sm:text-5xl font-bold mb-6 tracking-tight text-white">Ready to transform your municipality?</h2>
          <p className="text-xl text-zinc-400 mb-10 font-medium">Join the growing network of LGUs using Bin&apos;Go to modernize their sanitation operations.</p>
          <Link 
            href="/dashboard" 
            className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-4 rounded-full text-base font-bold transition-all shadow-lg hover:-translate-y-0.5"
          >
            Explore the Admin Dashboard <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, description }) {
  return (
    <div className="bg-white rounded-3xl p-8 border-2 border-zinc-100 shadow-sm hover:shadow-md hover:border-emerald-100 transition-all group">
      <div className="w-14 h-14 bg-zinc-50 group-hover:bg-emerald-50 rounded-2xl flex items-center justify-center mb-6 border border-zinc-200 group-hover:border-emerald-200 transition-colors">
        <Icon className="w-6 h-6 text-zinc-600 group-hover:text-emerald-600 transition-colors" />
      </div>
      <h3 className="text-xl font-bold text-zinc-900 mb-3">{title}</h3>
      <p className="text-zinc-600 font-medium leading-relaxed">{description}</p>
    </div>
  );
}

function PhoneMockup() {
  return (
    <div className="relative w-[260px] sm:w-[280px] lg:w-[280px] xl:w-[300px] h-[500px] xl:h-[540px] z-10 transition-transform duration-700 hover:-translate-y-2">
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
