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
import { Activity, Target, AlertCircle, Radio, ShieldCheck, Zap } from "lucide-react";

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
      <div className="bg-card border border-border p-2.5 rounded-lg shadow-md flex flex-col gap-1.5 min-w-[160px]">
        <div className="flex items-center justify-between border-b border-border pb-1 mb-0.5">
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
            <div key={index} className="flex items-center justify-between text-[11px] font-medium">
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
    <div className="flex flex-col lg:flex-row gap-4 w-full min-w-0">
      {/* Main Chart Area */}
      <div className="flex-1 min-w-0 w-full flex flex-col justify-between">
        {/* Toggle & Legends */}
        <div className="flex flex-wrap items-center justify-between mb-2 gap-2">
          <div className="flex items-center gap-1 p-0.5 bg-muted/40 border border-border/50 rounded-lg">
            <button
              type="button"
              onClick={() => setChartMode("trends")}
              className={`flex items-center gap-1.5 px-2 py-1 text-[11px] rounded-md font-medium transition-all ${
                chartMode === "trends"
                  ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              }`}
            >
              <Target className="h-3 w-3" />
              Conjunction Trends (7 Mo)
            </button>
            <button
              type="button"
              onClick={() => setChartMode("telemetry")}
              className={`flex items-center gap-1.5 px-2 py-1 text-[11px] rounded-md font-medium transition-all ${
                chartMode === "telemetry"
                  ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              }`}
            >
              <Activity className="h-3 w-3" />
              Live Pattern Telemetry
            </button>
          </div>

          {chartMode === "trends" ? (
            <div className="text-[10px] text-muted-foreground uppercase flex flex-wrap items-center gap-2.5 font-semibold">
              <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-amber-500" /> FLAGGED CONJUNCTIONS</span>
              <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> SUCCESSFULLY AVOIDED</span>
            </div>
          ) : (
            <div className="text-[10px] text-muted-foreground uppercase flex flex-wrap items-center gap-2.5 font-semibold">
              <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" /> BASELINE</span>
              <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-primary" /> ACTUAL</span>
              <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-destructive" /> ANOMALY</span>
            </div>
          )}
        </div>

        {/* Recharts with explicit height to guarantee instant rendering */}
        <div className="w-full min-w-0 h-[210px]">
          <ResponsiveContainer width="100%" height={210}>
            {chartMode === "trends" ? (
              <ComposedChart
                data={sample7MonthTrends}
                margin={{ top: 8, right: 10, left: -18, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="flaggedGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="avoidedGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" strokeOpacity={0.5} />
                <XAxis 
                  dataKey="date" 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'var(--muted-foreground)', fontSize: 10, fontWeight: 500 }}
                  dy={6}
                />
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'var(--muted-foreground)', fontSize: 10, fontWeight: 500 }}
                  dx={-6}
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
                margin={{ top: 8, right: 10, left: -18, bottom: 0 }}
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
                  tick={{ fill: 'var(--muted-foreground)', fontSize: 10, fontWeight: 500 }}
                  dy={6}
                />
                
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'var(--muted-foreground)', fontSize: 10, fontWeight: 500 }}
                  dx={-6}
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
      </div>

      {/* Compact Telemetry Panel - Pinned to right */}
      <div className="w-full lg:w-64 xl:w-72 shrink-0 flex flex-col justify-between p-3 bg-muted/20 border border-border/60 rounded-lg space-y-2">
        {/* Tile 1: SGP4 Accuracy */}
        <div>
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold tracking-wider text-muted-foreground uppercase flex items-center gap-1 font-mono">
              <Target className="h-2.5 w-2.5 text-primary" />
              SGP4 ACCURACY
            </span>
            <span className="text-[9px] font-mono text-muted-foreground">RMS ±14.2m</span>
          </div>
          <div className="text-lg font-bold tracking-tight text-foreground font-mono mt-0.5">98.1%</div>
          <div className="w-full bg-muted h-1 rounded-full mt-1 overflow-hidden">
            <div className="bg-primary h-full rounded-full w-[98.1%]" />
          </div>
        </div>

        {/* Tile 2: Cascade Threat Index */}
        <div className="pt-2 border-t border-border/40">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold tracking-wider text-amber-500 uppercase flex items-center gap-1 font-mono">
              <AlertCircle className="h-2.5 w-2.5 text-amber-500" />
              CASCADE THREAT
            </span>
            <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-amber-500/10 text-amber-400 font-bold">
              R₀ = 1.18
            </span>
          </div>
          <div className="text-xs font-bold tracking-tight text-amber-500 font-mono mt-0.5">ELEVATED</div>
          <p className="text-[10px] text-muted-foreground mt-0.5 leading-snug line-clamp-1">
            LEO 550–780km shell density near percolation limit.
          </p>
        </div>

        {/* Tile 3: Autonomous Yield */}
        <div className="pt-2 border-t border-border/40">
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-bold tracking-wider text-emerald-400 uppercase flex items-center gap-1 font-mono">
              <ShieldCheck className="h-2.5 w-2.5 text-emerald-400" />
              AUTO YIELD RATIO
            </span>
            <span className="text-[9px] font-mono text-emerald-400 font-bold">391/410</span>
          </div>
          <div className="text-xs font-bold tracking-tight text-emerald-400 font-mono mt-0.5">95.4% Auto-Yielded</div>
        </div>

        {/* Status Footer */}
        <div className="pt-1.5 border-t border-border/40 flex items-center justify-between text-[10px]">
          <span className="text-muted-foreground font-mono text-[9px] flex items-center gap-1">
            <Zap className="w-2.5 h-2.5 text-primary" />
            SGP4 ENGINE
          </span>
          <span className="font-mono text-[9px] text-emerald-500 font-bold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            ONLINE (25.4ms)
          </span>
        </div>
      </div>
    </div>
  );
}
