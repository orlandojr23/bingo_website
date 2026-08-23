"use client";

import { useState, useEffect } from "react";
import { Clock, FileText, CheckCircle2, TrendingUp, Download, BarChart2, PieChart } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";
import { Button } from "@/components/ui/button";
import { mockAnalyticsData } from "@/lib/mock-data";

export default function AnalyticsPage() {
  const [downloading, setDownloading] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Trigger animations on mount
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleExportCSV = () => {
    setDownloading(true);
    setTimeout(() => {
      // Simulate CSV generation and trigger browser download
      const csvContent =
        "data:text/csv;charset=utf-8," +
        "ID,Location,Barangay,Reporter,Urgency,Status,Date\n" +
        "TKT-001,Osmeña Blvd,Capitol Site,Juan Cruz,High,Pending,2023-10-24\n" +
        "TKT-002,IT Park,Apas,Maria Santos,Low,Resolved,2023-10-23\n" +
        "TKT-003,Colon St,Parian,Pedro Reyes,Critical,In Progress,2023-10-24\n";
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", "bingo_incident_analytics_report.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setDownloading(false);
    }, 600);
  };

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      {/* Top Header & Export Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-white border border-zinc-200 rounded-xl">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900">
            Waste Collection Data & Insights
          </h2>
          <p className="text-xs text-zinc-500">
            Review how well we are collecting and cleaning up waste.
          </p>
        </div>

        <Button variant="secondary" size="sm" onClick={handleExportCSV} disabled={downloading}>
          <Download className="w-3.5 h-3.5" />
          <span>{downloading ? "Generating CSV..." : "Download Report"}</span>
        </Button>
      </div>

      {/* Primary KPI Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-5">
        <StatCard
          label="Average Time to Clean Up"
          value="4.2 hrs"
          icon={Clock}
          trend={{ value: "15% faster", isPositive: true }}
          description="Goal: under 6 hours"
        />
        <StatCard
          label="Total Reports (Last 30 Days)"
          value="142"
          icon={FileText}
          trend={{ value: "+8% volume", isPositive: false }}
          description="126 cleaned up, 16 active"
        />
        <StatCard
          className="col-span-2 lg:col-span-1"
          label="Overall Clean-Up Rate"
          value="88.7%"
          icon={CheckCircle2}
          trend={{ value: "+2.4% MoM", isPositive: true }}
          description="Goal: 85%"
        />
      </div>

      {/* Chart Visualizations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Incident Volume & Resolution Bar Chart */}
        <div className="bg-white border border-zinc-200 rounded-xl p-5 sm:p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-200/80">
            <div>
              <h3 className="text-sm font-semibold text-zinc-900">
                Monthly Reports vs. Clean-Ups
              </h3>
              <p className="text-xs text-zinc-500">6-Month historical comparison</p>
            </div>
            <BarChart2 className="w-4 h-4 text-zinc-400" />
          </div>

          <div className="flex items-end justify-between gap-3 h-48 pt-4 pb-2 border-b border-zinc-100">
            {mockAnalyticsData.monthlyReports.map((item) => {
              const maxVal = 160;
              const totalHeight = (item.count / maxVal) * 100;
              const resolvedHeight = (item.resolved / maxVal) * 100;

              return (
                <div key={item.month} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
                  <div className="w-full max-w-[32px] flex items-end justify-center gap-1 h-full">
                    {/* Total Reported Bar */}
                    <div
                      style={{ height: mounted ? `${totalHeight}%` : "0%" }}
                      className="w-1/2 bg-zinc-200 rounded-t transition-all duration-1000 ease-out hover:bg-zinc-300 relative group"
                    >
                      <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-zinc-900 text-white text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                        Total: {item.count}
                      </div>
                    </div>
                    {/* Resolved Bar */}
                    <div
                      style={{ height: mounted ? `${resolvedHeight}%` : "0%" }}
                      className="w-1/2 bg-emerald-600 rounded-t transition-all duration-1000 ease-out delay-75 hover:bg-emerald-700 relative group"
                    >
                      <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-zinc-900 text-white text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                        Resolved: {item.resolved}
                      </div>
                    </div>
                  </div>
                  <span className="text-[11px] font-medium text-zinc-600 font-mono">
                    {item.month}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-center gap-5 text-xs text-zinc-500 pt-1">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm bg-zinc-200" />
              <span>Total Reported</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-sm bg-emerald-600" />
              <span>Resolved</span>
            </div>
          </div>
        </div>

        {/* Category Breakdown Progress Bars */}
        <div className="bg-white border border-zinc-200 rounded-xl p-5 sm:p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-200/80">
            <div>
              <h3 className="text-sm font-semibold text-zinc-900">
                Reports by Category
              </h3>
              <p className="text-xs text-zinc-500">Distribution breakdown for current quarter</p>
            </div>
            <PieChart className="w-4 h-4 text-zinc-400" />
          </div>

          <div className="flex flex-col gap-3.5 py-1">
            {mockAnalyticsData.categories.map((cat, idx) => (
              <div key={cat.name} className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-zinc-800">{cat.name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-500">{cat.count} cases</span>
                    <span className="font-mono font-medium text-zinc-900 w-8 text-right">
                      {cat.percentage}
                    </span>
                  </div>
                </div>
                <div className="w-full bg-zinc-100 rounded-full h-2 overflow-hidden">
                  <div
                    style={{ 
                      width: mounted ? cat.percentage : "0%",
                      transitionDelay: mounted ? `${idx * 100}ms` : "0ms" 
                    }}
                    className="bg-emerald-600 h-2 rounded-full transition-all duration-1000 ease-out"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
