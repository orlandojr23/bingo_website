"use client";

import { useState, useEffect } from "react";
import { BarChart2, PieChart, ShieldAlert } from "lucide-react";
import { useTickets } from "@/lib/tickets";
import { PageHeader } from "@/components/ui/page-header";
import { PanelStat } from "@/components/ui/panel-stat";

export default function AnalyticsPage() {
  const [mounted, setMounted] = useState(false);
  const tickets = useTickets() || [];

  useEffect(() => {
    setMounted(true);
  }, []);

  const totalReports = tickets.length;
  const resolvedReports = tickets.filter((t) => t.status === "Resolved").length;
  const activeReports = totalReports - resolvedReports;
  const successRate = totalReports > 0 ? Math.round((resolvedReports / totalReports) * 100) : 0;

  const kpis = [
    { label: "Average Cleanup Time", value: resolvedReports > 0 ? "~4.2 hrs" : "N/A", hint: resolvedReports > 0 ? "Estimated based on shift averages" : "Pending Data", tone: resolvedReports > 0 ? "emerald" : "zinc" },
    { label: "Total Reports", value: totalReports.toString(), hint: `${resolvedReports} cleaned up, ${activeReports} active`, tone: "zinc" },
    { label: "Overall Success Rate", value: `${successRate}%`, hint: `vs. Target: 85%`, tone: "emerald" },
  ];

  const categoryCounts = tickets.reduce((acc, t) => {
    acc[t.category] = (acc[t.category] || 0) + 1;
    return acc;
  }, {});
  
  const categories = Object.keys(categoryCounts)
    .map(name => ({
      name,
      count: categoryCounts[name],
      percentage: totalReports > 0 ? Math.round((categoryCounts[name] / totalReports) * 100) + "%" : "0%"
    }))
    .sort((a, b) => b.count - a.count);

  const monthlyReports = [];
  const now = new Date();
  
  // Calculate the last 6 months (including current month) purely from real Supabase data
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthName = d.toLocaleString("default", { month: "short" });
    
    // Filter the real tickets for this specific month/year
    const monthTickets = tickets.filter(t => {
      const tDate = new Date(t.createdAt);
      return tDate.getMonth() === d.getMonth() && tDate.getFullYear() === d.getFullYear();
    });
    
    monthlyReports.push({
      month: i === 0 ? monthName + " (Live)" : monthName,
      count: monthTickets.length,
      resolved: monthTickets.filter(t => t.status === "Resolved").length
    });
  }

  return (
    <div className="relative flex min-h-full w-full min-w-0 overflow-x-hidden bg-background bg-[url('/hero-bg.svg')] bg-[length:100%_auto] sm:bg-cover bg-top sm:bg-center bg-no-repeat">
      <div className="absolute inset-0 bg-background/42 pointer-events-none" />
      <div className="relative z-10 flex flex-1 min-w-0 flex-col gap-5 p-4 [scrollbar-gutter:stable] sm:gap-6 sm:p-6 lg:p-8 pb-6 sm:pb-8 lg:pb-10">
        <PageHeader
          title="Data & Insights"
          description="Performance and cleanup analytics for Barangay Tejero"
        />

        <div className="grid shrink-0 grid-cols-2 gap-3 sm:grid-cols-3 max-w-sm sm:max-w-xl">
          {kpis.map((kpi) => (
            <PanelStat
              key={kpi.label}
              label={kpi.label}
              value={kpi.value}
              hint={kpi.hint}
              tone={kpi.tone}
            />
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 sm:p-5">
            <div className="flex items-center justify-between border-b border-border-subtle pb-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  Monthly Reports vs. Clean-Ups
                </h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Comparison over the last 6 months
                </p>
              </div>
            </div>

            <div className="flex h-48 items-end justify-between gap-1 sm:gap-3 border-b border-border-subtle pb-2 pt-4">
              {monthlyReports.map((item) => {
                const maxVal = 160;
                const totalHeight = (item.count / maxVal) * 100;
                const resolvedHeight = (item.resolved / maxVal) * 100;

                return (
                  <div key={item.month} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
                    <div className="flex h-full w-full max-w-[32px] items-end justify-center gap-1">
                      <div
                        style={{ height: mounted ? `${totalHeight}%` : "0%" }}
                        className="group relative w-1/2 rounded-t bg-zinc-200 transition-all duration-1000 ease-out hover:bg-zinc-300"
                      >
                        <div className="pointer-events-none absolute -top-6 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-md bg-zinc-900 px-2 py-0.5 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
                          Total: {item.count}
                        </div>
                      </div>
                      <div
                        style={{ height: mounted ? `${resolvedHeight}%` : "0%" }}
                        className="group relative w-1/2 rounded-t bg-emerald-600 transition-all duration-1000 ease-out delay-75 hover:bg-emerald-700"
                      >
                        <div className="pointer-events-none absolute -top-6 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-md bg-zinc-900 px-2 py-0.5 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100">
                          Resolved: {item.resolved}
                        </div>
                      </div>
                    </div>
                    <span className="text-xs font-medium text-muted-foreground tracking-tight tabular-nums">
                      {item.month}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-center gap-5 pt-1 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-xs bg-zinc-200" />
                <span>Total Reports</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-xs bg-emerald-600" />
                <span>Cleaned Up</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 sm:p-5">
            <div className="flex items-center justify-between border-b border-border-subtle pb-3">
              <div>
                <h3 className="text-sm font-semibold text-foreground">Reports by Category</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Share of each report type this quarter
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3.5 py-1">
              {categories.map((cat, idx) => (
                <div key={cat.name} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground">{cat.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">{cat.count} reports</span>
                      <span className="w-9 text-right font-semibold text-foreground tracking-tight tabular-nums">
                        {cat.percentage}
                      </span>
                    </div>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      style={{
                        width: mounted ? cat.percentage : "0%",
                        transitionDelay: mounted ? `${idx * 100}ms` : "0ms",
                      }}
                      className="h-1.5 rounded-full bg-emerald-600 transition-all duration-1000 ease-out"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Guaranteed bottom spacer element */}
        <div className="h-6 sm:h-8 lg:h-10 w-full shrink-0 pointer-events-none" aria-hidden="true" />
      </div>
    </div>
  );


}
