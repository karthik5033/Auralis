"use client";

import React, { useState, useEffect } from "react";
import { 
  Orbit, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Download, 
  Activity,
  Layers,
  Radio,
  ShieldAlert,
  Flame,
  CheckCircle2,
  RefreshCw
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  AreaChart,
  Area
} from "recharts";
import { getShells } from "@/lib/api";
import { mockWs } from "@/lib/mockWs";
import type { ShellRiskSnapshot } from "@/types/contract";
import { downloadDataAsCsv } from "@/lib/utils";

export default function AnalyticsPage() {
  const [shells, setShells] = useState<ShellRiskSnapshot[]>([]);
  const [selectedShellId, setSelectedShellId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const fetchShellsData = async () => {
    try {
      const res = await getShells();
      setShells(res.data);
      if (res.data.length > 0 && !selectedShellId) {
        // Select first critical shell, or first shell
        const critical = res.data.find((s) => s.r0 >= 1.0);
        setSelectedShellId(critical ? critical.shellId : res.data[0].shellId);
      }
    } catch (err) {
      console.error("Failed loading shell risk snapshots:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShellsData();

    // Subscribe to crisis injection for real-time SIR curve shifts
    const unsub = mockWs.on("crisis:injected", () => {
      fetchShellsData();
    });

    return () => unsub();
  }, []);

  const selectedShell = shells.find((s) => s.shellId === selectedShellId) || shells[0];

  // Transform SIR data into Recharts friendly array
  const sirChartData = selectedShell
    ? selectedShell.projectionYears.map((year, idx) => ({
        year: `+${year}y`,
        susceptible: selectedShell.projectedS[idx],
        infected: selectedShell.projectedI[idx],
        removed: selectedShell.projectedR[idx],
      }))
    : [];

  const handleExport = () => {
    const exportRows = shells.map((s) => ({
      shellId: s.shellId,
      altitudeMinKm: s.altitudeMin,
      altitudeMaxKm: s.altitudeMax,
      r0: s.r0,
      trend: s.trend,
      debrisDensity: s.debrisDensity,
      totalObjects: s.totalObjectCount,
      susceptible: s.susceptibleCount,
      infected: s.infectedCount,
      removed: s.removedCount,
    }));
    downloadDataAsCsv(exportRows, "auralis-sir-cascade-model-snapshots");
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "increasing":
        return <TrendingUp className="h-4 w-4 text-red-500" />;
      case "decreasing":
        return <TrendingDown className="h-4 w-4 text-emerald-500" />;
      default:
        return <Minus className="h-4 w-4 text-blue-400" />;
    }
  };

  return (
    <div className="flex-1 space-y-6 p-6 lg:p-8 max-w-7xl mx-auto w-full animate-in fade-in duration-300 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="text-[10px] font-mono text-primary border-primary/30">
              CONTRACT §1.2 • SIR EPIDEMIOLOGICAL CASCADE
            </Badge>
            <span className="text-xs font-mono text-muted-foreground">
              {shells.length} ORBITAL SHELLS SCREENED
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2.5">
            <Orbit className="w-7 h-7 text-primary" />
            Epidemiological SIR Cascade Curves & R₀ Dynamics
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Macroscopic debris propagation modeled as an infectious epidemic (Susceptible payloads, Infected debris fragments, Removed drag sinks) with critical percolation thresholds.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            onClick={fetchShellsData}
            variant="outline" 
            size="sm" 
            className="text-xs font-mono gap-1.5 border-border bg-card hover:bg-muted"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh SIR
          </Button>
          <Button 
            onClick={handleExport}
            variant="outline" 
            size="sm" 
            className="text-xs font-mono gap-1.5 border-border bg-card hover:bg-muted"
          >
            <Download className="w-3.5 h-3.5" />
            Export SIR Data
          </Button>
        </div>
      </div>

      {/* Metric KPI Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-border/80 bg-card/80">
          <CardContent className="p-4 font-mono">
            <div className="text-[10px] uppercase text-muted-foreground font-semibold">Screened Shells</div>
            <div className="text-2xl font-black text-foreground mt-1">{shells.length}</div>
            <p className="text-[10px] text-muted-foreground mt-0.5">LEO 200 km to 1,400 km</p>
          </CardContent>
        </Card>

        <Card className="border-red-500/30 bg-red-950/10">
          <CardContent className="p-4 font-mono">
            <div className="text-[10px] uppercase text-red-400 font-semibold">Supercritical Shells</div>
            <div className="text-2xl font-black text-red-400 mt-1">
              {shells.filter((s) => s.r0 >= 1.0).length}
            </div>
            <p className="text-[10px] text-red-400 mt-0.5">R₀ &ge; 1.0 Runaway chain risk</p>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card/80">
          <CardContent className="p-4 font-mono">
            <div className="text-[10px] uppercase text-muted-foreground font-semibold">Peak Shell R₀</div>
            <div className="text-2xl font-black text-amber-400 mt-1">
              {shells.length > 0 ? Math.max(...shells.map((s) => s.r0)).toFixed(2) : "1.42"}
            </div>
            <p className="text-[10px] text-amber-400 mt-0.5">Highest collision reproduction</p>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card/80">
          <CardContent className="p-4 font-mono">
            <div className="text-[10px] uppercase text-muted-foreground font-semibold">Stable / Decay Sink</div>
            <div className="text-2xl font-black text-emerald-400 mt-1">
              {shells.filter((s) => s.r0 < 1.0).length}
            </div>
            <p className="text-[10px] text-emerald-400 mt-0.5">Atmospheric drag dominating</p>
          </CardContent>
        </Card>
      </div>

      {/* Shell Selector Chips */}
      <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl border border-border/70 bg-card/60 backdrop-blur-sm">
        <span className="text-xs font-mono font-bold text-muted-foreground uppercase mr-1">
          Select Orbital Shell:
        </span>
        {shells.map((shell) => {
          const isSelected = shell.shellId === selectedShell?.shellId;
          const isSupercritical = shell.r0 >= 1.0;

          return (
            <button
              key={shell.shellId}
              type="button"
              onClick={() => setSelectedShellId(shell.shellId)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                isSelected
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : isSupercritical
                  ? "bg-red-950/40 text-red-400 border border-red-500/40 hover:bg-red-950/60"
                  : "bg-muted/40 text-muted-foreground border border-border hover:text-foreground"
              }`}
            >
              <span>{shell.shellId}</span>
              <span className={`text-[10px] px-1 py-0.2 rounded font-mono ${
                isSupercritical ? "bg-red-500/20 text-red-300" : "bg-black/40 text-zinc-400"
              }`}>
                R₀: {shell.r0.toFixed(2)}
              </span>
            </button>
          );
        })}
      </div>

      {/* Main SIR Growth Chart & Selected Shell Telemetry */}
      {selectedShell && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Chart (2 cols) */}
          <Card className="lg:col-span-2 border-border/80 bg-card/80 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Activity className="h-4 w-4 text-primary" />
                    50-Year SIR Population Projection: Shell {selectedShell.shellId}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Altitude: {selectedShell.altitudeMin}–{selectedShell.altitudeMax} km • Density: {selectedShell.debrisDensity.toExponential(2)} obj/km³
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Badge 
                    className={`font-mono text-xs font-bold uppercase ${
                      selectedShell.r0 >= 1.0 
                        ? "bg-red-950/80 text-red-400 border-red-500/40" 
                        : "bg-emerald-950/80 text-emerald-400 border-emerald-500/40"
                    }`}
                  >
                    {selectedShell.r0 >= 1.0 ? "SUPERCRITICAL CASCADE" : "SUBCRITICAL STABLE"}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="h-[340px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={sirChartData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                    <XAxis 
                      dataKey="year" 
                      stroke="#71717a" 
                      tick={{ fontSize: 11, fill: "#a1a1aa" }}
                    />
                    <YAxis 
                      stroke="#71717a" 
                      tick={{ fontSize: 11, fill: "#a1a1aa" }}
                      domain={[0, "auto"]}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: "#18181b", 
                        borderColor: "#3f3f46", 
                        borderRadius: "8px", 
                        fontSize: "12px",
                        fontFamily: "monospace" 
                      }} 
                    />
                    <Legend 
                      wrapperStyle={{ fontSize: "12px", fontFamily: "monospace", paddingTop: "10px" }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="susceptible" 
                      name="Susceptible Payloads (S)" 
                      stroke="#3b82f6" 
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: "#3b82f6" }}
                      activeDot={{ r: 5 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="infected" 
                      name="Infected Debris (I)" 
                      stroke="#ef4444" 
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: "#ef4444" }}
                      activeDot={{ r: 5 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="removed" 
                      name="Removed / Drag Decay (R)" 
                      stroke="#10b981" 
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: "#10b981" }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-border/50 text-center font-mono text-xs">
                <div className="p-2 rounded bg-blue-950/20 border border-blue-500/20">
                  <span className="text-blue-400 font-bold block">S (Susceptible)</span>
                  <span className="text-muted-foreground text-[11px]">Intact operational payloads</span>
                </div>
                <div className="p-2 rounded bg-red-950/20 border border-red-500/20">
                  <span className="text-red-400 font-bold block">I (Infected)</span>
                  <span className="text-muted-foreground text-[11px]">Hypervelocity collision debris</span>
                </div>
                <div className="p-2 rounded bg-emerald-950/20 border border-emerald-500/20">
                  <span className="text-emerald-400 font-bold block">R (Removed)</span>
                  <span className="text-muted-foreground text-[11px]">Atmospheric de-orbit sink</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Selected Shell Astrodynamic Metrics (1 col) */}
          <Card className="border-border/80 bg-card/80 shadow-sm flex flex-col justify-between">
            <CardHeader className="pb-3 border-b border-border/60">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Orbit className="h-4 w-4 text-primary" />
                Shell Dynamics: {selectedShell.shellId}
              </CardTitle>
              <CardDescription className="text-xs">
                Epidemiological transmission coefficient analysis.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-3 font-mono text-xs flex-1">
              <div className="p-3 rounded-lg border border-border/60 bg-muted/20">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase text-muted-foreground font-semibold">Reproduction Ratio (R₀)</span>
                  <span className={`text-base font-black ${selectedShell.r0 >= 1.0 ? "text-red-400" : "text-emerald-400"}`}>
                    {selectedShell.r0.toFixed(2)}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1 font-sans">
                  {selectedShell.r0 >= 1.0
                    ? "R₀ ≥ 1.0: Each collision generates more debris than atmospheric drag clears. Runaway Kessler syndrome."
                    : "R₀ < 1.0: Atmospheric drag removes fragments faster than secondary collisions occur. Self-healing shell."}
                </p>
              </div>

              <div className="space-y-2 p-3 rounded-lg border border-border/60 bg-muted/20">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shell Trend:</span>
                  <span className="font-bold flex items-center gap-1 uppercase">
                    {getTrendIcon(selectedShell.trend)}
                    {selectedShell.trend}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Population:</span>
                  <span className="font-bold text-foreground">{selectedShell.totalObjectCount.toLocaleString()} objects</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Debris Density:</span>
                  <span className="font-bold text-foreground">{selectedShell.debrisDensity.toExponential(2)} obj/km³</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Current Active (S):</span>
                  <span className="font-bold text-blue-400">{selectedShell.susceptibleCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Current Fragments (I):</span>
                  <span className="font-bold text-red-400">{selectedShell.infectedCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Historic Sinks (R):</span>
                  <span className="font-bold text-emerald-400">{selectedShell.removedCount}</span>
                </div>
              </div>

              <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-950/15">
                <span className="text-[10px] font-bold text-amber-400 uppercase block mb-1">
                  Proactive Mitigation Recommendation
                </span>
                <p className="text-[11px] text-amber-200/90 font-sans leading-relaxed">
                  {selectedShell.r0 >= 1.0
                    ? "Recommend coordinated altitude de-confliction burns and mandatory 25-year deorbit pacing for all constellations in this altitude corridor."
                    : "Maintain baseline radar screening. Natural atmospheric drag maintains safe equilibrium."}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
