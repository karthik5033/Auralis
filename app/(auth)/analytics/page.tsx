"use client";

import React, { useState } from "react";
import { 
  BarChart2, 
  AlertTriangle, 
  LineChart, 
  TrendingUp, 
  Download, 
  Compass, 
  Activity,
  Layers,
  Orbit
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend
} from "recharts";

const MOCK_CASCADE_DATA = [
  { shell: "LEO 400km", altitudeKm: 400, debrisDensity: 142 },
  { shell: "LEO 500km", altitudeKm: 500, debrisDensity: 284 },
  { shell: "LEO 550km", altitudeKm: 550, debrisDensity: 612 },
  { shell: "LEO 650km", altitudeKm: 650, debrisDensity: 420 },
  { shell: "LEO 780km", altitudeKm: 780, debrisDensity: 890 },
  { shell: "SSO 850km", altitudeKm: 850, debrisDensity: 940 },
  { shell: "LEO 1000km", altitudeKm: 1000, debrisDensity: 520 },
  { shell: "LEO 1200km", altitudeKm: 1200, debrisDensity: 310 }
];

const MOCK_ANOMALIES = [
  {
    id: "ANM-01",
    district: "LEO 550km Starlink Shell",
    type: "Micro-conjunction Surge Rate Breach",
    baseline: "1.8 / day",
    detected: "5.4 / day",
    deviation: "+200%",
    severity: "CRITICAL",
    timestamp: "Last 48 Hours"
  },
  {
    id: "ANM-02",
    district: "LEO 780km Iridium Shell",
    type: "Uncoordinated Delta-V Thrust Spike",
    baseline: "0.2 m/s",
    detected: "1.8 m/s",
    deviation: "+800%",
    severity: "CRITICAL",
    timestamp: "Last 6 Hours"
  },
  {
    id: "ANM-03",
    district: "SSO 850km Debris Band",
    type: "Cosmos-2251 Cloud Dispersion Cluster",
    baseline: "0.4 / day",
    detected: "1.9 / day",
    deviation: "+375%",
    severity: "HIGH",
    timestamp: "Last 3 Days"
  }
];

const MOCK_RADAR_DATA = [
  { metric: "Spatial Density", LEO550: 92, LEO780: 84, SSO850: 70 },
  { metric: "Collision Flux", LEO550: 85, LEO780: 88, SSO850: 75 },
  { metric: "Fragment Growth", LEO550: 55, LEO780: 82, SSO850: 90 },
  { metric: "Cascade R0", LEO550: 60, LEO780: 86, SSO850: 80 },
  { metric: "Maneuver Rate", LEO550: 94, LEO780: 65, SSO850: 45 },
  { metric: "Decay Latency", LEO550: 82, LEO780: 45, SSO850: 30 }
];

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<"correlations" | "anomalies" | "comparative">("correlations");

  return (
    <div className="flex-1 space-y-6 p-6 lg:p-8 max-w-7xl mx-auto w-full animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Analytics & Trend Models</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Kessler cascade growth curves, epidemiological SIR shell percolation models, and orbital anomaly detection.
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-1.5 self-start sm:self-auto text-xs font-semibold">
          <Download className="h-4 w-4" />
          Export Telemetry Report
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex max-w-md bg-muted p-1 rounded-lg border">
        <button
          onClick={() => setActiveTab("correlations")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-xs font-bold transition-all ${
            activeTab === 'correlations' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <BarChart2 className="w-3.5 h-3.5" />
          Debris Growth & SIR
        </button>
        <button
          onClick={() => setActiveTab("anomalies")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-xs font-bold transition-all ${
            activeTab === 'anomalies' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          Anomaly Detection
        </button>
        <button
          onClick={() => setActiveTab("comparative")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-md text-xs font-bold transition-all ${
            activeTab === 'comparative' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Compass className="w-3.5 h-3.5" />
          Shell Benchmark
        </button>
      </div>

      {/* Tab 1: Correlation Matrix / Debris Growth SIR */}
      {activeTab === "correlations" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-bold">Altitude vs Spatial Debris Density (Kessler Model)</CardTitle>
                    <CardDescription className="text-xs">
                      Scatter distribution evaluating orbital shell altitude (km) against lethal fragment density (objects/km³).
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="text-[10px] text-primary">R₀ = 1.18 (Critical Threshold at 780km)</Badge>
                </div>
              </CardHeader>
              <CardContent className="h-[340px] pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis 
                      type="number" 
                      dataKey="altitudeKm" 
                      name="Altitude" 
                      unit=" km" 
                      tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
                    />
                    <YAxis 
                      type="number" 
                      dataKey="debrisDensity" 
                      name="Density" 
                      unit=" obj" 
                      tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
                    />
                    <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                    <Scatter name="Orbital Shells" data={MOCK_CASCADE_DATA} fill="var(--primary)" />
                  </ScatterChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold">Cascade Sensitivity Weights</CardTitle>
                <CardDescription className="text-xs">
                  Key drivers determining Kessler runaway probability in orbital shells.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                <div>
                  <div className="flex justify-between font-semibold mb-1">
                    <span>Shell Spatial Density</span>
                    <span className="text-primary font-mono">44%</span>
                  </div>
                  <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full w-[44%]" />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between font-semibold mb-1">
                    <span>Relative Impact Velocity</span>
                    <span className="text-primary font-mono">32%</span>
                  </div>
                  <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full w-[32%]" />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between font-semibold mb-1">
                    <span>Atmospheric Drag Decay Latency</span>
                    <span className="text-primary font-mono">24%</span>
                  </div>
                  <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full w-[24%]" />
                  </div>
                </div>

                <div className="pt-2 border-t text-muted-foreground text-[11px] leading-relaxed">
                  Calibrated via NASA EVM 5.0 and ESA MASTER empirical fragmentation models cross-referenced with CelesTrak.
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Tab 2: Anomaly Detection */}
      {activeTab === "anomalies" && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Activity className="h-5 w-5 text-rose-500" />
                Real-Time Deviations & Surge Warnings
              </CardTitle>
              <CardDescription className="text-xs">
                Z-Score thresholds triggered where conjunction frequencies or unexpected burns breach 3-sigma baselines.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {MOCK_ANOMALIES.map((a) => (
                <div key={a.id} className="p-4 rounded-xl border bg-card/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px] font-bold text-rose-600 border-rose-300 bg-rose-50 dark:bg-rose-950/20">
                        {a.severity}
                      </Badge>
                      <span className="font-semibold text-sm text-foreground">{a.district}</span>
                      <span className="text-xs text-muted-foreground">• {a.timestamp}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{a.type}</p>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="text-xs text-muted-foreground">Baseline / Detected</div>
                      <div className="text-xs font-mono font-bold text-foreground">{a.baseline} → {a.detected}</div>
                    </div>
                    <div className="text-right min-w-[70px]">
                      <div className="text-xs text-muted-foreground">Deviation</div>
                      <div className="text-sm font-extrabold text-rose-600">{a.deviation}</div>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab 3: Comparative Profiling Radar */}
      {activeTab === "comparative" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold">Orbital Shell Risk Profile Comparison</CardTitle>
              <CardDescription className="text-xs">
                Radar comparison across high-density orbital altitude regimes.
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[360px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={MOCK_RADAR_DATA}>
                  <PolarGrid stroke="var(--border)" />
                  <PolarAngleAxis dataKey="metric" tick={{ fill: 'var(--foreground)', fontSize: 11 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} />
                  <Radar name="LEO 550km" dataKey="LEO550" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.25} />
                  <Radar name="LEO 780km" dataKey="LEO780" stroke="#10b981" fill="#10b981" fillOpacity={0.25} />
                  <Radar name="SSO 850km" dataKey="SSO850" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.25} />
                  <Legend />
                  <Tooltip />
                </RadarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold">Flight Dynamics Observations</CardTitle>
              <CardDescription className="text-xs">Synthesized comparative takeaways</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-xs leading-relaxed text-muted-foreground">
              <div className="p-3 rounded-lg border bg-muted/20">
                <span className="font-bold text-foreground block mb-1">LEO 550km Mega-Constellation Shell:</span>
                Highest maneuver execution rate (94) with rapid 5-year natural orbital decay latency (82).
              </div>
              <div className="p-3 rounded-lg border bg-muted/20">
                <span className="font-bold text-foreground block mb-1">LEO 780km Polar Iridium Shell:</span>
                Critical collision flux (88) and elevated cascade reproduction number R₀ approaching threshold.
              </div>
              <div className="p-3 rounded-lg border bg-muted/20">
                <span className="font-bold text-foreground block mb-1">SSO 850km Sun-Sync Corridor:</span>
                Max fragment persistence (90) due to low atmospheric density, requiring active debris removal.
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
