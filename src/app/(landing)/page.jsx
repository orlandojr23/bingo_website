import Link from "next/link";
import { ArrowRight, Leaf, ShieldCheck, Map, BarChart3, Clock, Users } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="flex flex-col w-full overflow-hidden">
      {/* Hero Section */}
      <section className="relative pt-24 pb-32 lg:pt-36 lg:pb-40 overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-white -z-10" />
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-emerald-100/40 rounded-full blur-3xl opacity-50 -translate-y-1/2 translate-x-1/3 -z-10 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-sky-50/50 rounded-full blur-3xl opacity-60 translate-y-1/3 -translate-x-1/4 -z-10 pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="max-w-3xl mx-auto text-center flex flex-col items-center">

            
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-zinc-900 mb-8 leading-[1.1] animate-in-fade" style={{ animationDelay: "100ms" }}>
              Smarter waste management for a <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500">greener city.</span>
            </h1>
            
            <p className="text-lg sm:text-xl text-zinc-600 mb-10 max-w-2xl leading-relaxed font-medium animate-in-fade" style={{ animationDelay: "200ms" }}>
              Bin&apos;Go empowers citizens to report uncollected garbage and enables local governments to track, route, and resolve waste incidents in real-time.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto animate-in-fade" style={{ animationDelay: "300ms" }}>
              <Link 
                href="/dashboard" 
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-4 rounded-full text-base font-bold transition-all shadow-lg shadow-emerald-600/20 hover:shadow-xl hover:-translate-y-0.5"
              >
                Access Admin Dashboard <ArrowRight className="w-5 h-5" />
              </Link>
              <button 
                type="button"
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white hover:bg-zinc-50 text-zinc-900 border-2 border-zinc-200 px-8 py-4 rounded-full text-base font-bold transition-all"
              >
                Report an Incident
              </button>
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
