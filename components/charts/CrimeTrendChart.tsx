"use client";

import React, { useState } from "react";
import {
  ComposedChart,
  Line,
  Area,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";
import { Activity, Target, AlertCircle, Radio } from "lucide-react";
import { useLanguage } from "@/lib/LanguageContext";

const sample7MonthTrends = [
  { date: "Feb", flagged: 42, avoided: 39 },
  { date: "Mar", flagged: 55, avoided: 51 },
  { date: "Apr", flagged: 48, avoided: 45 },
  { date: "May", flagged: 62, avoided: 58 },
  { date: "Jun", flagged: 74, avoided: 69 },
  { date: "Jul", flagged: 68, avoided: 63 },
  { date: "Aug", flagged: 81, avoided: 74 }
];

const sampleTelemetry = [
  { time: "Day 1", date: "Sep 01", baseline: 2.1, actual: 2.0, anomaly: null },
  { time: "Day 2", date: "Sep 02", baseline: 2.2, actual: 2.1, anomaly: null },
  { time: "Day 3", date: "Sep 03", baseline: 2.0, actual: 2.4, anomaly: null },
  { time: "Day 4", date: "Sep 04", baseline: 2.3, actual: 2.2, anomaly: null },
  { time: "Day 5", date: "Sep 05", baseline: 2.2, actual: 2.2, anomaly: null },
  { time: "Day 6", date: "Sep 06", baseline: 2.4, actual: 2.5, anomaly: null },
  { time: "Day 7", date: "Sep 07", baseline: 2.3, actual: 2.1, anomaly: null },
  { time: "Day 8", date: "Sep 08", baseline: 2.5, actual: 4.1, anomaly: 4.1 },
  { time: "Day 9", date: "Sep 09", baseline: 2.4, actual: 5.6, anomaly: 5.6 },
  { time: "Day 10", date: "Sep 10", baseline: 2.3, actual: 3.2, anomaly: null },
  { time: "Day 11", date: "Sep 11", baseline: 2.2, actual: 2.4, anomaly: null },
  { time: "Day 12", date: "Sep 12", baseline: 2.5, actual: 7.2, anomaly: 7.2 }
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border p-3 rounded-lg shadow-md flex flex-col gap-2 min-w-[180px]">
        <div className="flex items-center justify-between border-b border-border pb-2 mb-1">
          <span className="text-primary text-[10px] font-bold uppercase tracking-widest">{label}</span>
          <Radio className="h-3 w-3 text-primary animate-pulse" />
        </div>
        
        {payload.map((entry: any, index: number) => {
          if (entry.dataKey === 'anomaly' && !entry.value) return null;
          
          const displayName = entry.name;
          let color = entry.color;
          if (entry.dataKey === 'anomaly') {
            color = "var(--destructive)";
          }

          return (
            <div key={index} className="flex items-center justify-between text-xs font-medium">
              <span className="text-muted-foreground uppercase">{displayName}</span>
              <span className="font-bold" style={{ color }}>
                {entry.value}
              </span>
            </div>
          );
        })}
      </div>
    );
  }
  return null;
};

export function CrimeTrendChart() {
  const [chartMode, setChartMode] = useState<"trends" | "telemetry">("trends");

  return (
    <div className="flex flex-col xl:flex-row gap-6 w-full h-full mt-2">
      {/* Main Chart Area */}
      <div className="flex-1 h-[320px] relative z-10">
        <div className="flex flex-wrap items-center justify-between mb-4 gap-2">
          <div className="flex items-center gap-1.5 p-1 bg-muted/40 border border-border/50 rounded-lg">
            <button
              type="button"
              onClick={() => setChartMode("trends")}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md font-medium transition-all ${
                chartMode === "trends"
                  ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              }`}
            >
              <Target className="h-3.5 w-3.5" />
              Conjunction Trends (7 Mo)
            </button>
            <button
              type="button"
              onClick={() => setChartMode("telemetry")}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md font-medium transition-all ${
                chartMode === "telemetry"
                  ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              }`}
            >
              <Activity className="h-3.5 w-3.5" />
              Live Pattern Telemetry
            </button>
          </div>

          {chartMode === "trends" ? (
            <div className="text-[10px] text-muted-foreground uppercase flex gap-4 font-semibold">
              <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-500" /> FLAGGED CONJUNCTIONS</span>
              <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500" /> SUCCESSFULLY AVOIDED</span>
            </div>
          ) : (
            <div className="text-[10px] text-muted-foreground uppercase flex gap-4 font-semibold">
              <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-muted-foreground/30" /> BASELINE</span>
              <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-primary" /> ACTUAL</span>
              <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-destructive" /> ANOMALY</span>
            </div>
          )}
        </div>

        <ResponsiveContainer width="100%" height="90%">
          {chartMode === "trends" ? (
            <ComposedChart
              data={sample7MonthTrends}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="flaggedGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="avoidedGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" strokeOpacity={0.5} />
              <XAxis 
                dataKey="date" 
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'var(--muted-foreground)', fontSize: 11, fontWeight: 500 }}
                dy={10}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'var(--muted-foreground)', fontSize: 11, fontWeight: 500 }}
                dx={-10}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area 
                type="monotone" 
                dataKey="flagged" 
                name="Flagged Conjunctions" 
                stroke="#f59e0b" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#flaggedGrad)" 
                isAnimationActive={false}
              />
              <Line 
                type="monotone" 
                dataKey="avoided" 
                name="Successfully Avoided" 
                stroke="#10b981" 
                strokeWidth={2.5} 
                dot={{ r: 3, fill: "#10b981" }}
                isAnimationActive={false}
              />
            </ComposedChart>
          ) : (
            <ComposedChart
              data={sampleTelemetry}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="var(--primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" strokeOpacity={0.5} />
              
              <XAxis 
                dataKey="date" 
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'var(--muted-foreground)', fontSize: 11, fontWeight: 500 }}
                dy={10}
              />
              
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'var(--muted-foreground)', fontSize: 11, fontWeight: 500 }}
                dx={-10}
              />
              
              <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--muted)', strokeWidth: 1, strokeDasharray: '4 4', fill: 'var(--muted)', opacity: 0.1 }} />
              
              <Line 
                type="monotone" 
                dataKey="baseline" 
                name="Baseline" 
                stroke="var(--muted-foreground)" 
                strokeWidth={1.5} 
                strokeDasharray="4 4"
                dot={false}
                isAnimationActive={false}
              />

              <Area 
                type="monotone" 
                dataKey="actual" 
                name="Actual Volume" 
                stroke="var(--primary)" 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#areaFill)" 
                isAnimationActive={false}
              />

              <Scatter 
                dataKey="anomaly" 
                name="Anomaly Spike" 
                fill="var(--destructive)" 
                isAnimationActive={false}
              />
            </ComposedChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Accuracy & Threat Telemetry Card */}
      <div className="xl:w-64 flex flex-col justify-between p-4 bg-muted/20 border border-border/50 rounded-xl">
        <div className="space-y-4">
          <div>
            <span className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase flex items-center gap-1.5 font-mono">
              <Target className="h-3 w-3 text-primary" />
              PROPAGATION ACCURACY
            </span>
            <div className="text-2xl font-bold tracking-tight text-foreground font-mono mt-1">98.1%</div>
            <div className="w-full bg-muted h-1.5 rounded-full mt-2 overflow-hidden">
              <div className="bg-primary h-full rounded-full w-[98.1%]" />
            </div>
          </div>

          <div className="pt-2 border-t border-border/50">
            <span className="text-[10px] font-bold tracking-wider text-amber-500 uppercase flex items-center gap-1.5 font-mono">
              <AlertCircle className="h-3 w-3 text-amber-500" />
              CASCADE THREAT INDEX
            </span>
            <div className="text-sm font-bold tracking-tight text-amber-500 font-mono mt-1">ELEVATED</div>
            <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
              LEO 550-780km shell density approaching critical percolation limit.
            </p>
          </div>
        </div>

        <div className="pt-4 border-t border-border/50 mt-4">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground font-mono text-[10px]">TLE PROPAGATOR</span>
            <span className="font-mono text-[10px] text-emerald-500 font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              SGP4 ONLINE
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
