"use client";

import { useState, useEffect } from "react";
import { Download, BarChart2, PieChart, ShieldAlert } from "lucide-react";
import { mockAnalyticsData } from "@/lib/mock-data";
import { PageHeader } from "@/components/ui/page-header";
import { PanelStat } from "@/components/ui/panel-stat";
import { Button } from "@/components/ui/button";

export default function AnalyticsPage() {
  const [downloading, setDownloading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleExportCSV = () => {
    setDownloading(true);
    setTimeout(() => {
      const csvContent =
        "data:text/csv;charset=utf-8," +
        "ID,Location,Barangay,Reporter,Urgency,Status,Date\n" +
        "TKT-001,Sitio Vilgon,Tejero,Juan Cruz,High,Pending,2023-10-24\n" +
        "TKT-002,Sitio ICM,Tejero,Maria Santos,Low,Resolved,2023-10-23\n" +
        "TKT-003,Sitio Daclan,Tejero,Pedro Reyes,Critical,In Progress,2023-10-24\n";
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

  const kpis = [
    { label: "Average Cleanup Time", value: "4.2 hrs", hint: "15% faster than last month", tone: "emerald" },
    { label: "Total Reports", value: "142", hint: "126 cleaned up, 16 active", tone: "zinc" },
    { label: "Overall Success Rate", value: "88.7%", hint: "+2.4% vs. last month (Target: 85%)", tone: "emerald" },
  ];

  return (
    <div className="flex min-h-full w-full min-w-0 overflow-x-hidden bg-background">
      <div className="flex flex-1 min-w-0 flex-col gap-5 p-4 [scrollbar-gutter:stable] sm:gap-6 sm:p-6 lg:p-8 pb-10 sm:pb-16 lg:pb-24">
        <PageHeader
          title="Data & Insights"
          description="Performance and cleanup analytics for Barangay Tejero"
          actions={
            <Button
              variant="secondary"
              onClick={handleExportCSV}
              disabled={downloading}
            >
              <Download className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span>{downloading ? "Generating CSV..." : "Download Report"}</span>
            </Button>
          }
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
              <BarChart2 className="h-4 w-4 text-muted-foreground" />
            </div>

            <div className="flex h-48 items-end justify-between gap-1 sm:gap-3 border-b border-border-subtle pb-2 pt-4">
              {mockAnalyticsData.monthlyReports.map((item) => {
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
                    <span className="font-mono text-xs font-medium text-muted-foreground">
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
              <PieChart className="h-4 w-4 text-muted-foreground" />
            </div>

            <div className="flex flex-col gap-3.5 py-1">
              {mockAnalyticsData.categories.map((cat, idx) => (
                <div key={cat.name} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-foreground">{cat.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">{cat.count} reports</span>
                      <span className="w-9 text-right font-mono font-semibold text-foreground">
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

        <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 sm:p-5">
          <div className="flex items-center justify-between border-b border-border-subtle pb-3">
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Tejero Pilot Quality Targets
              </h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Key performance goals for the Tejero pilot and how we&apos;re doing
              </p>
            </div>
            <ShieldAlert className="h-4 w-4 text-muted-foreground" />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="flex flex-col justify-between rounded-lg border border-border bg-muted/40 p-3 text-xs">
              <span className="font-medium text-muted-foreground">Cleanup Time Goal</span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="font-mono text-lg font-semibold text-foreground">&lt; 6.0 hrs</span>
                <span className="font-semibold text-emerald-600">Met (4.2 hrs)</span>
              </div>
            </div>

            <div className="flex flex-col justify-between rounded-lg border border-border bg-muted/40 p-3 text-xs">
              <span className="font-medium text-muted-foreground">Cleanup Success Rate</span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="font-mono text-lg font-semibold text-foreground">&gt; 85.0%</span>
                <span className="font-semibold text-emerald-600">Met (88.7%)</span>
              </div>
            </div>

            <div className="flex flex-col justify-between rounded-lg border border-border bg-muted/40 p-3 text-xs">
              <span className="font-medium text-muted-foreground">Confirmed by Residents</span>
              <div className="mt-2 flex items-baseline justify-between">
                <span className="font-mono text-lg font-semibold text-foreground">&gt; 90.0%</span>
                <span className="font-semibold text-emerald-600">Met (92.4%)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

