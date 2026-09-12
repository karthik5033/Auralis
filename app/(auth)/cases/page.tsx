"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  Crosshair, 
  Search, 
  Download, 
  Clock, 
  ArrowRight,
  ShieldAlert,
  Orbit,
  Radio,
  ExternalLink,
  Flame,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Layers,
  BarChart3,
  SlidersHorizontal,
  ChevronRight,
  Boxes,
  Zap,
  Info
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ReferenceLine,
  Cell 
} from "recharts";
import { getApiMode, getConjunctions, getObjects, getShells } from "@/lib/api";
import { useWebSocket } from "@/components/providers/WebSocketProvider";
import { formatScientificPc, formatCountdown, formatDistance, formatVelocity } from "@/lib/formatters";
import type { ConjunctionEvent, TrackedObject, RiskLevel, ConjunctionStatus, ShellRiskSnapshot } from "@/types/contract";
import Link from "next/link";
import { downloadDataAsCsv } from "@/lib/utils";

export default function CasesPage() {
  const [conjunctions, setConjunctions] = useState<ConjunctionEvent[]>([]);
  const [objectsMap, setObjectsMap] = useState<Record<string, TrackedObject>>({});
  const [shells, setShells] = useState<ShellRiskSnapshot[]>([]);
  const [search, setSearch] = useState("");
  const [filterRisk, setFilterRisk] = useState<string>("ALL");
  const [filterShell, setFilterShell] = useState<string>("ALL");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState<number>(Date.now());

  // Live timer tick every second for accurate countdown
  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadConjunctionsData = async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const [conjRes, objRes, shellsRes] = await Promise.all([
        getConjunctions({ limit: 100 }),
        getObjects({ limit: 1000 }),
        getShells(),
      ]);

      setConjunctions(conjRes.data);
      setShells(shellsRes.data);

      const map: Record<string, TrackedObject> = {};
      objRes.data.forEach((obj) => {
        map[obj.id] = obj;
      });
      setObjectsMap(map);
    } catch (err) {
      console.error("Failed loading conjunction cases:", err);
      setConjunctions([]);
      setShells([]);
      setObjectsMap({});
      setLoadError(err instanceof Error ? err.message : "Unable to load conjunction data from the API");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConjunctionsData();
  }, []);

  // Subscribe to real-time conjunction WebSocket events
  useWebSocket("conjunction:created", (newConj) => {
    setConjunctions((prev) => [newConj, ...prev.filter((c) => c.id !== newConj.id)]);
  });

  useWebSocket("conjunction:updated", (updated) => {
    setConjunctions((prev) =>
      prev.map((c) => (c.id === updated.id ? updated : c))
    );
  });

  useWebSocket("conjunction:mitigated", (payload) => {
    setConjunctions((prev) =>
      prev.map((c) =>
        c.id === payload.conjunctionId
          ? {
              ...c,
              status: "mitigated",
              collisionProbability: payload.resultingPc,
              maneuverProposalId: payload.maneuverProposalId,
            }
          : c
      )
    );
  });

  useWebSocket("crisis:injected", () => {
    loadConjunctionsData();
  });

  // Filtered conjunction list
  const filteredConjunctions = useMemo(() => {
    return conjunctions.filter((c) => {
      const primary = objectsMap[c.primaryObjectId];
      const secondary = objectsMap[c.secondaryObjectId];

      // Shell filter
      if (filterShell !== "ALL") {
        const shellMatch = primary?.shellId === filterShell || secondary?.shellId === filterShell;
        if (!shellMatch) return false;
      }

      // Risk / Status filter
      if (filterRisk !== "ALL") {
        const matchesRisk = c.riskLevel.toUpperCase() === filterRisk.toUpperCase();
        const matchesStatus = c.status.toUpperCase() === filterRisk.toUpperCase();
        if (!matchesRisk && !matchesStatus) return false;
      }

      // Search text filter
      if (search.trim()) {
        const q = search.toLowerCase();
        const searchTarget = [
          c.id,
          primary?.name || "",
          primary?.noradId?.toString() || "",
          primary?.shellId || "",
          secondary?.name || "",
          secondary?.noradId?.toString() || "",
          secondary?.type || "",
          c.status,
          c.riskLevel,
        ].join(" ").toLowerCase();

        return searchTarget.includes(q);
      }

      return true;
    });
  }, [conjunctions, objectsMap, filterShell, filterRisk, search]);

  // Telemetry Aggregates
  const stats = useMemo(() => {
    const total = conjunctions.length;
    const critical = conjunctions.filter((c) => c.riskLevel === "critical").length;
    const elevated = conjunctions.filter((c) => c.riskLevel === "elevated").length;
    const mitigated = conjunctions.filter((c) => c.status === "mitigated").length;

    // Find next imminent TCA
    const futureConjs = conjunctions
      .filter((c) => new Date(c.tca).getTime() > nowMs)
      .sort((a, b) => new Date(a.tca).getTime() - new Date(b.tca).getTime());
    const nextImminent = futureConjs.length > 0 ? futureConjs[0] : null;

    return { total, critical, elevated, mitigated, nextImminent };
  }, [conjunctions, nowMs]);

  // Distribution chart data: Conjunctions bucketed by TCA horizon
  const distributionChartData = useMemo(() => {
    const buckets = [
      { label: "< 12h", count: 0, criticalCount: 0 },
      { label: "12-24h", count: 0, criticalCount: 0 },
      { label: "24-48h", count: 0, criticalCount: 0 },
      { label: "48-72h", count: 0, criticalCount: 0 },
      { label: "> 72h", count: 0, criticalCount: 0 },
    ];

    conjunctions.forEach((c) => {
      const diffHours = (new Date(c.tca).getTime() - nowMs) / 3600000;
      const isCritical = c.riskLevel === "critical";

      if (diffHours < 12) {
        buckets[0].count++;
        if (isCritical) buckets[0].criticalCount++;
      } else if (diffHours < 24) {
        buckets[1].count++;
        if (isCritical) buckets[1].criticalCount++;
      } else if (diffHours < 48) {
        buckets[2].count++;
        if (isCritical) buckets[2].criticalCount++;
      } else if (diffHours < 72) {
        buckets[3].count++;
        if (isCritical) buckets[3].criticalCount++;
      } else {
        buckets[4].count++;
        if (isCritical) buckets[4].criticalCount++;
      }
    });

    return buckets;
  }, [conjunctions, nowMs]);

  const handleExport = () => {
    const rows = filteredConjunctions.map((c) => ({
      eventId: c.id,
      primaryObjectName: objectsMap[c.primaryObjectId]?.name || c.primaryObjectId,
      primaryNoradId: objectsMap[c.primaryObjectId]?.noradId || "N/A",
      primaryShellId: objectsMap[c.primaryObjectId]?.shellId || "N/A",
      secondaryObjectName: objectsMap[c.secondaryObjectId]?.name || c.secondaryObjectId,
      secondaryNoradId: objectsMap[c.secondaryObjectId]?.noradId || "N/A",
      secondaryType: objectsMap[c.secondaryObjectId]?.type || "debris",
      tcaUtc: c.tca,
      countdown: formatCountdown(c.tca, nowMs),
      missDistanceKm: c.missDistance,
      missDistanceFormatted: formatDistance(c.missDistance),
      relativeVelocityKmS: c.relativeVelocity,
      collisionProbability: c.collisionProbability,
      pcScientific: formatScientificPc(c.collisionProbability),
      riskLevel: c.riskLevel,
      status: c.status,
      maneuverProposalId: c.maneuverProposalId || "NONE",
    }));
    downloadDataAsCsv(rows, "auralis-conjunction-events-screening");
  };

  const getRiskBadge = (risk: RiskLevel) => {
    switch (risk) {
      case "critical":
        return (
          <Badge className="font-mono text-[10px] font-bold uppercase text-rose-300 border-rose-500/50 bg-rose-950/70 shadow-xs">
            CRITICAL
          </Badge>
        );
      case "elevated":
        return (
          <Badge className="font-mono text-[10px] font-bold uppercase text-amber-300 border-amber-500/50 bg-amber-950/70 shadow-xs">
            ELEVATED
          </Badge>
        );
      default:
        return (
          <Badge className="font-mono text-[10px] font-bold uppercase text-emerald-300 border-emerald-500/50 bg-emerald-950/70 shadow-xs">
            NOMINAL
          </Badge>
        );
    }
  };

  const getStatusBadge = (status: ConjunctionStatus) => {
    switch (status) {
      case "active":
        return (
          <span className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-rose-400 bg-rose-950/40 border border-rose-500/30 px-2 py-0.5 rounded">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
            ACTIVE
          </span>
        );
      case "monitoring":
        return (
          <span className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-amber-400 bg-amber-950/40 border border-amber-500/30 px-2 py-0.5 rounded">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            MONITORING
          </span>
        );
      case "mitigated":
        return (
          <span className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-2 py-0.5 rounded">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            MITIGATED
          </span>
        );
      case "expired":
        return (
          <span className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-400 bg-zinc-900 border border-zinc-700 px-2 py-0.5 rounded">
            EXPIRED
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1.5 text-[10px] font-mono text-zinc-500 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded">
            FALSE ALARM
          </span>
        );
    }
  };

  return (
    <div className="flex-1 space-y-6 p-6 lg:p-8 max-w-7xl mx-auto w-full animate-in fade-in duration-300 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="text-[10px] font-mono text-primary border-primary/30">
              CONTRACT §1.2 • FOSTER-1992 COVARIANCE SCREENING
            </Badge>
            <span className="text-xs font-mono text-muted-foreground">
              {conjunctions.length} CATALOGED APPROACHES
            </span>
            <Badge variant="outline" className="text-[10px] font-mono text-emerald-400 border-emerald-500/30">
              API: {getApiMode().toUpperCase()}
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2.5">
            <Crosshair className="w-7 h-7 text-primary" />
            Conjunction Screening & Yield Events
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Multi-target orbital conjunction assessment with SGP4 ephemerides, live TCA countdowns, Foster-1992 collision probability, and bilateral maneuver negotiations.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            onClick={loadConjunctionsData}
            variant="outline" 
            size="sm" 
            className="text-xs font-mono gap-1.5 border-border bg-card hover:bg-muted"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Rescreen
          </Button>
          <Button 
            onClick={handleExport} 
            variant="outline" 
            size="sm"
            className="gap-1.5 text-xs font-semibold font-mono border-border bg-card hover:bg-muted"
          >
            <Download className="h-4 w-4" />
            Export Conjunction Manifest
          </Button>
        </div>
      </div>

      {loadError && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-950/20 px-4 py-3 text-xs font-mono text-rose-300">
          Unable to load conjunction data from the API. {loadError}
        </div>
      )}

      {/* KPI Overview Tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-border/80 bg-card/80 shadow-xs">
          <CardContent className="p-4 font-mono">
            <div className="text-[10px] uppercase text-muted-foreground font-semibold">Active Screening Envelopes</div>
            <div className="text-2xl font-black text-foreground mt-1">{stats.total}</div>
            <p className="text-[10px] text-muted-foreground mt-0.5">Automated orbital cross-tracks</p>
          </CardContent>
        </Card>

        <Card className="border-rose-500/30 bg-rose-950/10 shadow-xs">
          <CardContent className="p-4 font-mono">
            <div className="text-[10px] uppercase text-rose-400 font-semibold">Critical Threats (P_c &ge; 10⁻³)</div>
            <div className="text-2xl font-black text-rose-400 mt-1 flex items-center gap-2">
              {stats.critical}
              <span className="text-xs font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 animate-pulse">
                ACTION REQ
              </span>
            </div>
            <p className="text-[10px] text-rose-400/80 mt-0.5">Bilateral yield & burn required</p>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card/80 shadow-xs">
          <CardContent className="p-4 font-mono">
            <div className="text-[10px] uppercase text-muted-foreground font-semibold">Elevated Approaches</div>
            <div className="text-2xl font-black text-amber-400 mt-1">{stats.elevated}</div>
            <p className="text-[10px] text-amber-400/80 mt-0.5">10⁻⁴ &le; P_c &lt; 10⁻³ watch tier</p>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card/80 shadow-xs">
          <CardContent className="p-4 font-mono">
            <div className="text-[10px] uppercase text-muted-foreground font-semibold">Imminent Encounter</div>
            <div className="text-sm font-black text-foreground mt-1.5 truncate">
              {stats.nextImminent ? (
                <span className="text-rose-400 font-mono">
                  {formatCountdown(stats.nextImminent.tca, nowMs)}
                </span>
              ) : (
                <span className="text-emerald-400">NO IMMINENT TCA</span>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5 truncate">
              {stats.nextImminent ? `Target: ${objectsMap[stats.nextImminent.primaryObjectId]?.name || "Asset"}` : "Nominal spacing"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* TCA Distribution Histogram Card */}
      <Card className="border-border/80 bg-card/80 shadow-xs">
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                Conjunction Event Distribution by TCA Time Horizon
              </CardTitle>
              <CardDescription className="text-xs">
                Upcoming close approaches grouped by time until closest approach (TCA).
              </CardDescription>
            </div>
            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <span className="w-2.5 h-2.5 rounded-sm bg-primary inline-block" /> Total Approaches
              </span>
              <span className="flex items-center gap-1.5 text-[11px] text-rose-400">
                <span className="w-2.5 h-2.5 rounded-sm bg-rose-500 inline-block" /> Critical (P_c &ge; 10⁻³)
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-2">
          <div className="h-[140px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={distributionChartData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis 
                  dataKey="label" 
                  stroke="#71717a" 
                  tick={{ fontSize: 10, fill: "#a1a1aa" }}
                />
                <YAxis 
                  stroke="#71717a" 
                  tick={{ fontSize: 10, fill: "#a1a1aa" }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: "#18181b", 
                    borderColor: "#3f3f46", 
                    borderRadius: "8px", 
                    fontSize: "12px",
                    fontFamily: "monospace" 
                  }}
                  formatter={(val: any, name: any) => [val, name === "count" ? "Total Approaches" : "Critical"]}
                />
                <Bar dataKey="count" fill="#38bdf8" radius={[4, 4, 0, 0]} name="count" />
                <Bar dataKey="criticalCount" fill="#f43f5e" radius={[4, 4, 0, 0]} name="criticalCount" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Filter and Search Bar */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 bg-card/80 p-3.5 rounded-xl border border-border/80 backdrop-blur-sm shadow-xs">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto flex-1 max-w-xl">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search by ID, satellite name, NORAD catalog, debris..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-xs bg-muted/40 border-border font-mono placeholder:text-muted-foreground"
            />
          </div>

          {/* Shell Filter Dropdown */}
          <select
            value={filterShell}
            onChange={(e) => setFilterShell(e.target.value)}
            className="h-9 px-2.5 rounded-lg border border-border bg-muted/40 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="ALL">ALL ORBITAL SHELLS</option>
            {shells.map((s) => (
              <option key={s.shellId} value={s.shellId}>
                {s.shellId} ({s.altitudeMin}-{s.altitudeMax} km)
              </option>
            ))}
          </select>
        </div>

        {/* Risk / Status Filter Pills */}
        <div className="flex items-center gap-1 overflow-x-auto w-full lg:w-auto pb-1 lg:pb-0">
          {[
            { key: "ALL", label: "ALL" },
            { key: "CRITICAL", label: "CRITICAL" },
            { key: "ELEVATED", label: "ELEVATED" },
            { key: "ACTIVE", label: "ACTIVE" },
            { key: "MITIGATED", label: "MITIGATED" },
            { key: "MONITORING", label: "MONITORING" },
          ].map((filter) => (
            <button
              key={filter.key}
              type="button"
              onClick={() => setFilterRisk(filter.key)}
              className={`px-3 py-1.5 text-xs font-mono font-bold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                filterRisk === filter.key 
                  ? filter.key === "CRITICAL"
                    ? "bg-rose-600 text-white shadow-xs"
                    : "bg-foreground text-background shadow-xs" 
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Conjunctions Master Table */}
      <Card className="shadow-sm border-border/80 bg-card/80 backdrop-blur-sm">
        <CardHeader className="pb-3 border-b border-border/60">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Orbit className="h-4 w-4 text-primary" />
                Screened Conjunction Envelopes
              </CardTitle>
              <CardDescription className="text-xs">
                Hover or click any row to inspect Keplerian orbital elements, covariance uncertainty ellipses, and autonomous maneuver negotiations.
              </CardDescription>
            </div>
            <span className="text-xs font-mono text-muted-foreground">
              Showing {filteredConjunctions.length} of {conjunctions.length} Envelopes
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 border-b border-border text-[11px]">
                  <TableHead className="font-mono font-semibold">Event ID</TableHead>
                  <TableHead className="font-semibold">Primary Asset (Protected)</TableHead>
                  <TableHead className="font-semibold">Secondary Threat Object</TableHead>
                  <TableHead className="font-semibold">TCA (UTC)</TableHead>
                  <TableHead className="font-semibold">TCA Horizon</TableHead>
                  <TableHead className="font-semibold">Miss Distance</TableHead>
                  <TableHead className="font-semibold">Collision Prob (Pc)</TableHead>
                  <TableHead className="font-semibold">Rel Velocity</TableHead>
                  <TableHead className="font-semibold">Risk Level</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredConjunctions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8 text-muted-foreground font-mono text-xs">
                      No matching conjunction events found for current filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredConjunctions.map((conj) => {
                    const primary = objectsMap[conj.primaryObjectId];
                    const secondary = objectsMap[conj.secondaryObjectId];
                    const countdownStr = formatCountdown(conj.tca, nowMs);
                    const isCritical = conj.riskLevel === "critical";

                    return (
                      <TableRow 
                        key={conj.id} 
                        className={`hover:bg-muted/30 transition-colors border-b border-border/50 ${
                          isCritical ? "bg-rose-950/10" : ""
                        }`}
                      >
                        <TableCell className="font-mono text-xs font-bold text-primary whitespace-nowrap">
                          <Link href={`/cases/${conj.id}`} className="hover:underline flex items-center gap-1">
                            {conj.id.slice(0, 11)}...
                            <ExternalLink className="h-2.5 w-2.5 opacity-60" />
                          </Link>
                        </TableCell>
                        <TableCell className="text-xs font-semibold">
                          <div className="flex flex-col">
                            <span className="text-foreground">{primary ? primary.name : conj.primaryObjectId.slice(0, 8)}</span>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              {primary ? `NORAD ${primary.noradId} • ${primary.shellId}` : "LEO Asset"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs font-semibold">
                          <div className="flex flex-col">
                            <span className="text-foreground">{secondary ? secondary.name : conj.secondaryObjectId.slice(0, 8)}</span>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              {secondary ? `${secondary.type.toUpperCase()} • NORAD ${secondary.noradId || "N/A"}` : "Debris"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground whitespace-nowrap">
                          {conj.tca.replace("T", " ").replace("Z", "")}
                        </TableCell>
                        <TableCell className="text-xs font-mono font-bold whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded text-[11px] ${
                            countdownStr.includes("PAST") 
                              ? "bg-zinc-800 text-zinc-400" 
                              : isCritical 
                              ? "bg-rose-950/80 text-rose-300 border border-rose-500/40 animate-pulse" 
                              : "bg-muted text-foreground border border-border"
                          }`}>
                            {countdownStr}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs font-mono font-semibold whitespace-nowrap">
                          <span className={conj.missDistance < 0.5 ? "text-rose-400 font-bold" : conj.missDistance < 1.5 ? "text-amber-400" : "text-foreground"}>
                            {formatDistance(conj.missDistance)}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs font-mono font-bold whitespace-nowrap">
                          <span className={isCritical ? "text-rose-400 text-sm font-extrabold" : conj.riskLevel === "elevated" ? "text-amber-400" : "text-emerald-400"}>
                            {formatScientificPc(conj.collisionProbability)}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground whitespace-nowrap">
                          {formatVelocity(conj.relativeVelocity)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {getRiskBadge(conj.riskLevel)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {getStatusBadge(conj.status)}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          <Link href={`/cases/${conj.id}`}>
                            <Button size="sm" variant="ghost" className="h-7 text-xs font-mono gap-1 text-primary hover:text-primary hover:bg-primary/10">
                              Details <ArrowRight className="h-3 w-3" />
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
