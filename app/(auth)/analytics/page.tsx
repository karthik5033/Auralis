"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
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
  RefreshCw,
  SlidersHorizontal,
  Sliders,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Info,
  Search,
  Filter,
  BarChart3,
  LineChart as LineChartIcon
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  AreaChart,
  Area,
  ReferenceLine,
  Cell
} from "recharts";
import { getShells, getAdvisories } from "@/lib/api";
import { useWebSocket } from "@/components/providers/WebSocketProvider";
import type { ShellRiskSnapshot, Advisory } from "@/types/contract";
import { downloadDataAsCsv } from "@/lib/utils";
import Link from "next/link";
import { AgenticRolesAndCascadeStack } from "@/components/analytics/AgenticRolesAndCascadeStack";

function AnalyticsContent() {
  const searchParams = useSearchParams();
  const requestedShellId = searchParams.get("shell");
  const [shells, setShells] = useState<ShellRiskSnapshot[]>([]);
  const [advisories, setAdvisories] = useState<Advisory[]>([]);
  const [selectedShellId, setSelectedShellId] = useState<string>("");
  const [searchFilter, setSearchFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "SUPERCRITICAL" | "STABLE">("ALL");
  const [chartMode, setChartMode] = useState<"LINES" | "AREA">("LINES");
  const [loading, setLoading] = useState(true);

  // Mitigation "What-If" Simulator State
  const [enablePmdMandate, setEnablePmdMandate] = useState<boolean>(false);
  const [adrRemovalRate, setAdrRemovalRate] = useState<number>(0); // 0, 5, 10, 20 objects/yr

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);
      const [shellsRes, advisoriesRes] = await Promise.all([
        getShells(),
        getAdvisories({ limit: 20 }),
      ]);

      const shellList = shellsRes.data || [];
      setShells(shellList);
      setAdvisories(advisoriesRes.data || []);

      if (shellList.length > 0 && requestedShellId && shellList.some((shell) => shell.shellId === requestedShellId)) {
        setSelectedShellId(requestedShellId);
      } else if (shellList.length > 0 && (!selectedShellId || !shellList.some(s => s.shellId === selectedShellId))) {
        // Select first supercritical shell by default, or the highest R0 shell
        const highestR0 = [...shellList].sort((a, b) => b.r0 - a.r0)[0];
        setSelectedShellId(highestR0 ? highestR0.shellId : shellList[0].shellId);
      }
    } catch (err) {
      console.error("Failed loading shell risk snapshots:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalyticsData();
  }, [requestedShellId]);

  // Real-time WebSocket Listeners
  useWebSocket("crisis:injected", () => {
    fetchAnalyticsData();
  });

  useWebSocket("shell:updated", (updatedShell) => {
    setShells((prev) =>
      prev.map((s) => (s.shellId === updatedShell.shellId ? updatedShell : s))
    );
  });

  // Selected shell details
  const selectedShell = useMemo(() => {
    return shells.find((s) => s.shellId === selectedShellId) || shells[0];
  }, [shells, selectedShellId]);

  // Advisories linked to the selected shell (deduplicated & prioritized)
  const shellAdvisories = useMemo(() => {
    if (!selectedShell) return [];
    const seen = new Set<string>();
    return advisories.filter((adv) => {
      const matchText = (adv.title || "").toLowerCase().includes(selectedShell.shellId.toLowerCase()) ||
                        (adv.body || "").toLowerCase().includes(selectedShell.shellId.toLowerCase());
      if (!matchText) return false;
      const key = `${adv.title || ""}-${(adv.body || "").slice(0, 40)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [selectedShell, advisories]);

  // Filtered shells list for the selector chips and matrix
  const filteredShells = useMemo(() => {
    return shells.filter((s) => {
      if (statusFilter === "SUPERCRITICAL" && s.r0 < 1.0) return false;
      if (statusFilter === "STABLE" && s.r0 >= 1.0) return false;
      if (searchFilter.trim()) {
        const q = searchFilter.toLowerCase();
        const matchesId = s.shellId.toLowerCase().includes(q);
        const matchesAlt = `${s.altitudeMin}-${s.altitudeMax}`.includes(q);
        return matchesId || matchesAlt;
      }
      return true;
    });
  }, [shells, statusFilter, searchFilter]);

  // Dynamic Multi-Shell Spectrum Data (R0 vs Altitude across all shells)
  const spectrumChartData = useMemo(() => {
    return [...shells]
      .sort((a, b) => a.altitudeMin - b.altitudeMin)
      .map((s) => ({
        shellId: s.shellId,
        shortName: `${s.altitudeMin}-${s.altitudeMax}`,
        r0: s.r0,
        density: s.debrisDensity,
        isCritical: s.r0 >= 1.0,
        totalObjects: s.totalObjectCount,
      }));
  }, [shells]);

  // Dynamic SIR 50-year projection data with "What-If" Mitigation adjustment
  const sirChartData = useMemo(() => {
    if (!selectedShell) return [];

    // If What-If simulator is active, compute adjusted trajectories
    const pmdFactor = enablePmdMandate ? 1.6 : 1.0;
    const adrReduction = adrRemovalRate * 1.5;

    return selectedShell.projectionYears.map((year, idx) => {
      const baseS = selectedShell.projectedS[idx];
      const baseI = selectedShell.projectedI[idx];
      const baseR = selectedShell.projectedR[idx];

      let simulatedI = baseI;
      let simulatedS = baseS;
      let simulatedR = baseR;

      if (year > 0 && (enablePmdMandate || adrRemovalRate > 0)) {
        const timeFactor = year / 10;
        // ADR and PMD reduce infected fragment growth and increase removal
        simulatedI = Math.max(0, Math.round(baseI - adrReduction * timeFactor * 1.8));
        simulatedR = Math.round(baseR + (baseI - simulatedI) * 0.9 * pmdFactor);
        simulatedS = Math.round(baseS + (baseI - simulatedI) * 0.1);
      }

      return {
        year: `+${year}y`,
        yearNum: year,
        susceptible: simulatedS,
        infected: simulatedI,
        removed: simulatedR,
        total: simulatedS + simulatedI + simulatedR,
      };
    });
  }, [selectedShell, enablePmdMandate, adrRemovalRate]);

  // Runaway Inflection Year Calculation: when I(t) >= S(t)
  const inflectionYear = useMemo(() => {
    if (!sirChartData.length) return null;
    const inflection = sirChartData.find((d) => d.infected >= d.susceptible);
    return inflection ? inflection.year : null;
  }, [sirChartData]);

  // Global KPIs across all shells
  const supercriticalCount = shells.filter((s) => s.r0 >= 1.0).length;
  const peakR0 = shells.length > 0 ? Math.max(...shells.map((s) => s.r0)) : 1.42;
  const totalObjectsCount = shells.reduce((acc, s) => acc + s.totalObjectCount, 0);

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
        return <TrendingUp className="h-4 w-4 text-rose-500" />;
      case "decreasing":
        return <TrendingDown className="h-4 w-4 text-emerald-500" />;
      default:
        return <Minus className="h-4 w-4 text-cyan-400" />;
    }
  };

  return (
    <div className="flex-1 space-y-6 p-6 lg:p-8 max-w-7xl mx-auto w-full animate-in fade-in duration-300 font-sans">
      {/* Executive Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="text-[10px] font-mono text-primary border-primary/30">
              CONTRACT §1.3 • EPIDEMIOLOGICAL SIR CASCADE DYNAMICS
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
            onClick={fetchAnalyticsData}
            variant="outline" 
            size="sm" 
            className="text-xs font-mono gap-1.5 border-border bg-card hover:bg-muted"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh SIR
          </Button>
          <Button 
            onClick={handleExport}
            variant="outline" 
            size="sm" 
            className="text-xs font-mono gap-1.5 border-border bg-card hover:bg-muted"
          >
            <Download className="w-3.5 h-3.5" />
            Export SIR Dataset
          </Button>
        </div>
      </div>

      {/* Global Astrodynamic KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-border/80 bg-card/80 shadow-xs">
          <CardContent className="p-4 font-mono">
            <div className="text-[10px] uppercase text-muted-foreground font-semibold">Cataloged Shells</div>
            <div className="text-2xl font-black text-foreground mt-1">{shells.length}</div>
            <p className="text-[10px] text-muted-foreground mt-0.5">LEO 200 km to 1,400 km</p>
          </CardContent>
        </Card>

        <Card className="border-rose-500/30 bg-rose-950/10 shadow-xs">
          <CardContent className="p-4 font-mono">
            <div className="text-[10px] uppercase text-rose-400 font-semibold">Supercritical Shells</div>
            <div className="text-2xl font-black text-rose-400 mt-1 flex items-center gap-2">
              {supercriticalCount}
              <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 animate-pulse">
                R₀ &ge; 1.0
              </span>
            </div>
            <p className="text-[10px] text-rose-400/80 mt-0.5">Runaway Kessler syndrome risk</p>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card/80 shadow-xs">
          <CardContent className="p-4 font-mono">
            <div className="text-[10px] uppercase text-muted-foreground font-semibold">Peak Shell R₀</div>
            <div className="text-2xl font-black text-amber-400 mt-1">
              {peakR0.toFixed(2)}
            </div>
            <p className="text-[10px] text-amber-400/80 mt-0.5">Highest collision reproduction</p>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card/80 shadow-xs">
          <CardContent className="p-4 font-mono">
            <div className="text-[10px] uppercase text-muted-foreground font-semibold">Tracked Population</div>
            <div className="text-2xl font-black text-emerald-400 mt-1">
              {totalObjectsCount.toLocaleString()}
            </div>
            <p className="text-[10px] text-emerald-400/80 mt-0.5">Active & derelict space assets</p>
          </CardContent>
        </Card>
      </div>

      {/* Kessler Cascade Risk Horizon Spectrum (Multi-Shell Overview) */}
      <Card className="border-border/80 bg-card/80 shadow-xs">
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                Orbital Altitude vs. Kessler Reproduction Number (R₀ Horizon)
              </CardTitle>
              <CardDescription className="text-xs">
                Click any altitude band bar to inspect its compartmental SIR projection and astrodynamics breakdown.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <span className="w-2.5 h-2.5 rounded-sm bg-rose-500 inline-block" /> Supercritical (R₀ &ge; 1.0)
              </span>
              <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" /> Subcritical (R₀ &lt; 1.0)
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={spectrumChartData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis 
                  dataKey="shortName" 
                  stroke="#71717a" 
                  tick={{ fontSize: 10, fill: "#a1a1aa" }}
                />
                <YAxis 
                  stroke="#71717a" 
                  tick={{ fontSize: 10, fill: "#a1a1aa" }}
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
                  formatter={(val: any) => [`R₀: ${Number(val).toFixed(2)}`, "Reproduction"]}
                  labelFormatter={(label) => `Altitude: ${label} km`}
                />
                <ReferenceLine 
                  y={1.0} 
                  stroke="#f43f5e" 
                  strokeDasharray="4 4" 
                  strokeWidth={2}
                  label={{ 
                    value: "KESSLER CASCADE THRESHOLD (R₀ = 1.0)", 
                    position: "top", 
                    fill: "#f43f5e", 
                    fontSize: 9, 
                    fontWeight: "bold",
                    fontFamily: "monospace"
                  }} 
                />
                <Bar 
                  dataKey="r0" 
                  radius={[4, 4, 0, 0]}
                  onClick={(entry) => {
                    if (entry && entry.shellId) setSelectedShellId(entry.shellId);
                  }}
                  className="cursor-pointer"
                >
                  {spectrumChartData.map((entry) => (
                    <Cell 
                      key={entry.shellId} 
                      fill={
                        entry.shellId === selectedShell?.shellId
                          ? "#38bdf8"
                          : entry.isCritical 
                          ? "#ef4444" 
                          : "#10b981"
                      }
                      stroke={entry.shellId === selectedShell?.shellId ? "#ffffff" : "transparent"}
                      strokeWidth={entry.shellId === selectedShell?.shellId ? 2 : 0}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Shell Selector Bar with Search & Filters */}
      <div className="space-y-3 p-4 rounded-xl border border-border/80 bg-card/70 backdrop-blur-md">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-foreground uppercase flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-primary" />
              Select Orbital Shell Corridor:
            </span>
            <span className="text-xs font-mono text-muted-foreground">
              ({filteredShells.length} shown)
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-48">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Filter shell alt..."
                className="pl-8 py-1 h-7 text-xs bg-muted/40 border-border font-mono"
              />
            </div>

            {/* Quick Status Filter Pills */}
            <div className="flex items-center bg-muted/40 p-0.5 rounded-lg border border-border text-[10px] font-mono">
              <button
                type="button"
                onClick={() => setStatusFilter("ALL")}
                className={`px-2 py-0.5 rounded ${statusFilter === "ALL" ? "bg-foreground text-background font-bold" : "text-muted-foreground hover:text-foreground"}`}
              >
                ALL
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("SUPERCRITICAL")}
                className={`px-2 py-0.5 rounded ${statusFilter === "SUPERCRITICAL" ? "bg-rose-600 text-white font-bold" : "text-muted-foreground hover:text-foreground"}`}
              >
                R₀ &ge; 1.0
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter("STABLE")}
                className={`px-2 py-0.5 rounded ${statusFilter === "STABLE" ? "bg-emerald-600 text-white font-bold" : "text-muted-foreground hover:text-foreground"}`}
              >
                STABLE
              </button>
            </div>
          </div>
        </div>

        {/* Shell Chips */}
        <div className="flex flex-wrap items-center gap-2 max-h-36 overflow-y-auto pt-1">
          {filteredShells.map((shell) => {
            const isSelected = shell.shellId === selectedShell?.shellId;
            const isSupercritical = shell.r0 >= 1.0;

            return (
              <button
                key={shell.shellId}
                type="button"
                onClick={() => setSelectedShellId(shell.shellId)}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer flex items-center gap-2 ${
                  isSelected
                    ? "bg-primary text-primary-foreground shadow-sm ring-2 ring-primary/40"
                    : isSupercritical
                    ? "bg-rose-950/40 text-rose-300 border border-rose-500/40 hover:bg-rose-950/70"
                    : "bg-muted/40 text-muted-foreground border border-border hover:text-foreground"
                }`}
              >
                <span>{shell.shellId}</span>
                <span className={`text-[10px] px-1 py-0.2 rounded font-mono ${
                  isSupercritical ? "bg-rose-500/20 text-rose-200" : "bg-black/40 text-zinc-400"
                }`}>
                  R₀: {shell.r0.toFixed(2)}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main SIR Growth Chart & Selected Shell Telemetry */}
      {selectedShell && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Chart (2 cols) */}
          <Card className="lg:col-span-2 border-border/80 bg-card/80 shadow-sm flex flex-col justify-between">
            <CardHeader className="pb-2 border-b border-border/60">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <Activity className="h-4 w-4 text-primary" />
                      50-Year SIR Population Projection: Shell {selectedShell.shellId}
                    </CardTitle>
                    <Badge 
                      className={`font-mono text-[10px] font-bold uppercase ${
                        selectedShell.r0 >= 1.0 
                          ? "bg-rose-950 text-rose-300 border-rose-500/50" 
                          : "bg-emerald-950 text-emerald-300 border-emerald-500/50"
                      }`}
                    >
                      {selectedShell.r0 >= 1.0 ? "SUPERCRITICAL CASCADE" : "SUBCRITICAL STABLE"}
                    </Badge>
                  </div>
                  <CardDescription className="text-xs font-mono mt-1">
                    Altitude Band: {selectedShell.altitudeMin}–{selectedShell.altitudeMax} km • Density: {selectedShell.debrisDensity.toExponential(2)} obj/km³ • {selectedShell.totalObjectCount} Baseline Assets
                  </CardDescription>
                </div>

                {/* Chart Mode Toggle */}
                <div className="flex items-center bg-muted/40 p-0.5 rounded-lg border border-border text-xs font-mono">
                  <button
                    onClick={() => setChartMode("LINES")}
                    className={`px-2 py-1 rounded transition-colors flex items-center gap-1 ${
                      chartMode === "LINES" ? "bg-foreground text-background font-bold shadow-xs" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <LineChartIcon className="w-3 h-3" />
                    Lines
                  </button>
                  <button
                    onClick={() => setChartMode("AREA")}
                    className={`px-2 py-1 rounded transition-colors flex items-center gap-1 ${
                      chartMode === "AREA" ? "bg-foreground text-background font-bold shadow-xs" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Layers className="w-3 h-3" />
                    Stacked Area
                  </button>
                </div>
              </div>
            </CardHeader>

            <CardContent className="pt-4 flex-1 flex flex-col justify-between">
              {/* Inflection Alert Callout */}
              {inflectionYear && selectedShell.r0 >= 1.0 && (
                <div className="mb-3 p-2.5 rounded-lg border border-rose-500/30 bg-rose-950/20 text-xs font-mono flex items-center justify-between">
                  <span className="flex items-center gap-2 text-rose-300 font-semibold">
                    <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
                    Kessler Tipping Horizon: Collision debris fragments overtake operational payloads at {inflectionYear}.
                  </span>
                  <span className="text-[10px] text-rose-400 font-bold px-1.5 py-0.5 rounded bg-rose-500/20">
                    CASCADE INFLECTION POINT
                  </span>
                </div>
              )}

              {/* Recharts Chart */}
              <div className="h-[340px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  {chartMode === "LINES" ? (
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
                        stroke="#38bdf8" 
                        strokeWidth={2.5}
                        dot={{ r: 3, fill: "#38bdf8" }}
                        activeDot={{ r: 5 }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="infected" 
                        name="Infected Debris (I)" 
                        stroke="#f43f5e" 
                        strokeWidth={2.5}
                        dot={{ r: 3, fill: "#f43f5e" }}
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
                  ) : (
                    <AreaChart data={sirChartData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
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
                      <Area 
                        type="monotone" 
                        dataKey="infected" 
                        name="Infected Debris (I)" 
                        stackId="1"
                        stroke="#f43f5e" 
                        fill="#f43f5e" 
                        fillOpacity={0.4}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="susceptible" 
                        name="Susceptible Payloads (S)" 
                        stackId="1"
                        stroke="#38bdf8" 
                        fill="#38bdf8" 
                        fillOpacity={0.4}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="removed" 
                        name="Removed / Drag Decay (R)" 
                        stackId="1"
                        stroke="#10b981" 
                        fill="#10b981" 
                        fillOpacity={0.3}
                      />
                    </AreaChart>
                  )}
                </ResponsiveContainer>
              </div>

              {/* Compartment Explanation Pills */}
              <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-border/50 text-center font-mono text-xs">
                <div className="p-2 rounded bg-sky-950/20 border border-sky-500/20">
                  <span className="text-sky-400 font-bold block">S (Susceptible)</span>
                  <span className="text-muted-foreground text-[11px]">Intact operational payloads</span>
                </div>
                <div className="p-2 rounded bg-rose-950/20 border border-rose-500/20">
                  <span className="text-rose-400 font-bold block">I (Infected)</span>
                  <span className="text-muted-foreground text-[11px]">Hypervelocity collision debris</span>
                </div>
                <div className="p-2 rounded bg-emerald-950/20 border border-emerald-500/20">
                  <span className="text-emerald-400 font-bold block">R (Removed)</span>
                  <span className="text-muted-foreground text-[11px]">Atmospheric de-orbit sink</span>
                </div>
              </div>

              {/* Interactive "What-If" Policy Simulator */}
              <div className="mt-4 p-3.5 rounded-xl border border-border/80 bg-muted/20 font-mono text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-foreground flex items-center gap-1.5 uppercase text-[11px]">
                    <Sliders className="h-3.5 w-3.5 text-primary" />
                    Proactive Mitigation Simulator (What-If Analysis)
                  </span>
                  {(enablePmdMandate || adrRemovalRate > 0) && (
                    <button
                      onClick={() => {
                        setEnablePmdMandate(false);
                        setAdrRemovalRate(0);
                      }}
                      className="text-[10px] text-muted-foreground hover:text-foreground underline"
                    >
                      Reset Policy
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {/* PMD Mandate Toggle */}
                  <div className="flex items-center justify-between p-2 rounded-lg bg-card border border-border">
                    <div>
                      <p className="font-semibold text-foreground text-[11px]">Accelerated Deorbit Mandate</p>
                      <p className="text-[10px] text-muted-foreground">Mandatory 5-yr PMD rule (&gamma; &times; 1.6)</p>
                    </div>
                    <Button
                      size="sm"
                      variant={enablePmdMandate ? "default" : "outline"}
                      onClick={() => setEnablePmdMandate(!enablePmdMandate)}
                      className="h-6 text-[10px] font-mono font-bold"
                    >
                      {enablePmdMandate ? "ACTIVE" : "OFF"}
                    </Button>
                  </div>

                  {/* ADR Active Debris Removal Slider */}
                  <div className="flex items-center justify-between p-2 rounded-lg bg-card border border-border">
                    <div>
                      <p className="font-semibold text-foreground text-[11px]">Active Debris Removal (ADR)</p>
                      <p className="text-[10px] text-muted-foreground">Extract {adrRemovalRate} lethal derelicts/yr</p>
                    </div>
                    <div className="flex items-center gap-1">
                      {[0, 5, 10, 20].map((rate) => (
                        <button
                          key={rate}
                          type="button"
                          onClick={() => setAdrRemovalRate(rate)}
                          className={`px-1.5 py-0.5 text-[10px] rounded font-bold transition-colors ${
                            adrRemovalRate === rate ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {rate}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Selected Shell Astrodynamic Physics & Advisories (1 col) */}
          <div className="space-y-4">
            {/* Shell Dynamics Profile */}
            <Card className="border-border/80 bg-card/80 shadow-sm">
              <CardHeader className="pb-3 border-b border-border/60">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Orbit className="h-4 w-4 text-primary" />
                  Shell Dynamics: {selectedShell.shellId}
                </CardTitle>
                <CardDescription className="text-xs">
                  Epidemiological transmission coefficient analysis.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-3 font-mono text-xs">
                <div className="p-3 rounded-lg border border-border/60 bg-muted/20">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase text-muted-foreground font-semibold">Reproduction Ratio (R₀)</span>
                    <span className={`text-base font-black ${selectedShell.r0 >= 1.0 ? "text-rose-400" : "text-emerald-400"}`}>
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
                    <span className="font-bold text-sky-400">{selectedShell.susceptibleCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Current Fragments (I):</span>
                    <span className="font-bold text-rose-400">{selectedShell.infectedCount}</span>
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

            {/* Contextual Shell Advisories Card */}
            {shellAdvisories.length > 0 && (
              <Card className="border-border/80 bg-card/80 shadow-sm">
                <CardHeader className="p-3 pb-2 border-b border-border/60">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xs font-bold font-mono uppercase flex items-center gap-1.5 text-foreground">
                      <Radio className="w-3.5 h-3.5 text-primary" />
                      Active Shell Advisories ({shellAdvisories.length})
                    </CardTitle>
                    <Link href="/chat" className="text-[10px] font-mono text-primary hover:underline flex items-center gap-1">
                      Advisory Feed <ChevronRight className="w-3 h-3" />
                    </Link>
                  </div>
                </CardHeader>
                <CardContent className="p-3 space-y-2 font-mono text-xs max-h-[220px] overflow-y-auto pr-1">
                  {shellAdvisories.slice(0, 3).map((adv) => (
                    <div key={adv.id} className="p-2 rounded-lg border border-border/70 bg-muted/20 hover:bg-muted/30 transition-colors">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-bold text-foreground text-[11px] leading-snug truncate">{adv.title}</p>
                        <Badge variant="outline" className={`text-[8px] uppercase font-bold shrink-0 px-1 py-0 ${
                          adv.severity === "critical" ? "text-red-400 border-red-500/40 bg-red-950/40" : "text-amber-400 border-amber-500/40"
                        }`}>
                          {adv.severity}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                        {adv.body}
                      </p>
                    </div>
                  ))}
                  {shellAdvisories.length > 3 && (
                    <div className="pt-1 text-center">
                      <Link href="/chat" className="text-[10px] font-mono text-primary hover:underline">
                        + {shellAdvisories.length - 3} more advisories in Feed &rarr;
                      </Link>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Complete Orbital Shells Population & Cascade Matrix Table */}
      <Card className="border-border/80 bg-card/80 shadow-sm">
        <CardHeader className="pb-3 border-b border-border/60">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" />
                Comprehensive LEO Orbital Shell Population & Cascade Matrix
              </CardTitle>
              <CardDescription className="text-xs">
                Real-time astrodynamic SIR census derived across all 50 km altitude shells.
              </CardDescription>
            </div>
            <span className="text-xs font-mono text-muted-foreground">
              Total Cataloged: {shells.length} Bands
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-[10px] text-muted-foreground uppercase">
                <th className="p-3">Shell Identifier</th>
                <th className="p-3">Altitude Range</th>
                <th className="p-3">Reproduction (R₀)</th>
                <th className="p-3">Trend</th>
                <th className="p-3">Debris Density</th>
                <th className="p-3">Total Objects</th>
                <th className="p-3">Active (S)</th>
                <th className="p-3">Fragments (I)</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {shells.map((shell) => {
                const isSelected = shell.shellId === selectedShell?.shellId;
                const isCritical = shell.r0 >= 1.0;

                return (
                  <tr 
                    key={shell.shellId} 
                    onClick={() => setSelectedShellId(shell.shellId)}
                    className={`hover:bg-muted/30 transition-colors cursor-pointer ${
                      isSelected ? "bg-primary/10" : ""
                    }`}
                  >
                    <td className="p-3 font-bold text-foreground flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${isCritical ? "bg-rose-500 animate-pulse" : "bg-emerald-500"}`} />
                      {shell.shellId}
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {shell.altitudeMin} – {shell.altitudeMax} km
                    </td>
                    <td className="p-3">
                      <span className={`font-bold px-1.5 py-0.5 rounded text-[11px] ${
                        isCritical 
                          ? "bg-rose-950 text-rose-300 border border-rose-500/50" 
                          : "bg-emerald-950 text-emerald-300 border border-emerald-500/50"
                      }`}>
                        {shell.r0.toFixed(2)}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className="flex items-center gap-1 uppercase text-[11px]">
                        {getTrendIcon(shell.trend)}
                        {shell.trend}
                      </span>
                    </td>
                    <td className="p-3 text-muted-foreground">
                      {shell.debrisDensity.toExponential(2)} / km³
                    </td>
                    <td className="p-3 font-bold text-foreground">
                      {shell.totalObjectCount}
                    </td>
                    <td className="p-3 text-sky-400">
                      {shell.susceptibleCount}
                    </td>
                    <td className="p-3 text-rose-400 font-semibold">
                      {shell.infectedCount}
                    </td>
                    <td className="p-3 text-right">
                      <Button
                        size="sm"
                        variant={isSelected ? "default" : "outline"}
                        className="h-6 text-[10px] font-mono"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedShellId(shell.shellId);
                        }}
                      >
                        {isSelected ? "FOCUSED" : "ANALYZE"}
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* 6 Autonomous Multi-Agent Swarm Roles & Complete Astrodynamics Stack */}
      <AgenticRolesAndCascadeStack />
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <React.Suspense fallback={<div className="p-6 text-xs font-mono text-muted-foreground animate-pulse">Initializing Orbital Analytics Engine...</div>}>
      <AnalyticsContent />
    </React.Suspense>
  );
}
