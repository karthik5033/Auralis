"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  BellRing, 
  AlertTriangle, 
  ShieldAlert, 
  CheckCircle2, 
  Orbit, 
  Clock, 
  ArrowRight, 
  TrendingUp, 
  Activity, 
  Check, 
  ExternalLink,
  Radio,
  Crosshair,
  Download,
  Flame,
  Search,
  RotateCcw,
  Sparkles,
  Layers,
  Filter,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { getConjunctions, getObjects, getShells, injectCrisis } from "@/lib/api";
import { useWebSocket } from "@/components/providers/WebSocketProvider";
import { formatScientificPc, formatCountdown, formatDistance, formatVelocity, formatOperator } from "@/lib/formatters";
import type { ConjunctionEvent, TrackedObject, ShellRiskSnapshot } from "@/types/contract";
import Link from "next/link";
import { downloadDataAsCsv } from "@/lib/utils";

type AlertTab = "ALL" | "CRITICAL" | "ELEVATED" | "CASCADE" | "ACKNOWLEDGED";

export default function AlertsPage() {
  const [conjunctions, setConjunctions] = useState<ConjunctionEvent[]>([]);
  const [objectsMap, setObjectsMap] = useState<Record<string, TrackedObject>>({});
  const [criticalShells, setCriticalShells] = useState<ShellRiskSnapshot[]>([]);
  const [allShells, setAllShells] = useState<ShellRiskSnapshot[]>([]);
  const [activeTab, setActiveTab] = useState<AlertTab>("ALL");
  const [shellFilter, setShellFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [acknowledgedIds, setAcknowledgedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [simulatingCrisis, setSimulatingCrisis] = useState(false);
  const [crisisNotification, setCrisisNotification] = useState<string | null>(null);
  const [nowMs, setNowMs] = useState(Date.now());

  // Real-time ticking clock for countdowns
  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const loadAlerts = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [conjRes, objRes, shellRes] = await Promise.all([
        getConjunctions({ limit: 100 }),
        getObjects({ limit: 1000 }),
        getShells(),
      ]);

      // Filter critical and elevated conjunctions only, sort by TCA (soonest first)
      const filtered = conjRes.data
        .filter((c) => c.riskLevel === "critical" || c.riskLevel === "elevated")
        .sort((a, b) => new Date(a.tca).getTime() - new Date(b.tca).getTime());

      setConjunctions(filtered);

      const map: Record<string, TrackedObject> = {};
      objRes.data.forEach((obj) => {
        map[obj.id] = obj;
      });
      setObjectsMap(map);

      const shells = shellRes.data;
      setAllShells(shells);
      setCriticalShells(shells.filter((s) => s.r0 >= 1.0));
    } catch (err) {
      console.error("Failed loading alerts telemetry:", err);
      setConjunctions([]);
      setObjectsMap({});
      setAllShells([]);
      setCriticalShells([]);
      setLoadError(err instanceof Error ? err.message : "Unable to load risk telemetry from the API");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, []);

  // Real-time WebSocket subscriptions
  useWebSocket("conjunction:created", (newConj) => {
    if (newConj.riskLevel === "critical" || newConj.riskLevel === "elevated") {
      setConjunctions((prev) => {
        const updated = [newConj, ...prev.filter((c) => c.id !== newConj.id)];
        return updated.sort((a, b) => new Date(a.tca).getTime() - new Date(b.tca).getTime());
      });
    }
  });

  useWebSocket("crisis:injected", (payload) => {
    const affected = payload.affectedShellIds.join(", ");
    setCrisisNotification(
      `CRISIS ALERT: Breakup injected into ${affected}! +${payload.injectedObjectCount} hypervelocity fragments tracked.`
    );
    loadAlerts();
    setTimeout(() => setCrisisNotification(null), 10000);
  });

  const handleSimulateCrisis = async () => {
    setSimulatingCrisis(true);
    try {
      const res = await injectCrisis({
        type: "fragmentation",
        altitude: 780,
        fragmentCount: 150,
        sourceObjectId: null,
        label: "Simulated Upper Stage Fragmentation — 780 km",
      });
      setCrisisNotification(
        `NASA BREAKUP SIMULATED: ${res.injectedObjectCount} fragments injected across shells [${res.affectedShellIds.join(", ")}]. +${res.newConjunctionEventCount} new conjunction threats screened.`
      );
      await loadAlerts();
    } catch (err) {
      console.error("Crisis simulation failed:", err);
    } finally {
      setSimulatingCrisis(false);
      setTimeout(() => setCrisisNotification(null), 8000);
    }
  };

  const handleAcknowledge = (id: string) => {
    setAcknowledgedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleAcknowledgeAll = () => {
    setAcknowledgedIds(new Set(conjunctions.map((c) => c.id)));
  };

  // Filtered conjunction alerts
  const filteredConjunctions = useMemo(() => {
    return conjunctions.filter((conj) => {
      // Tab filter
      if (activeTab === "CRITICAL" && conj.riskLevel !== "critical") return false;
      if (activeTab === "ELEVATED" && conj.riskLevel !== "elevated") return false;
      if (activeTab === "ACKNOWLEDGED" && !acknowledgedIds.has(conj.id)) return false;
      if (activeTab === "CASCADE") return false; // Cascade tab shows shells only

      const primary = objectsMap[conj.primaryObjectId];
      const secondary = objectsMap[conj.secondaryObjectId];

      // Shell filter
      if (shellFilter !== "ALL") {
        const matchesPrimary = primary?.shellId === shellFilter;
        const matchesSecondary = secondary?.shellId === shellFilter;
        if (!matchesPrimary && !matchesSecondary) return false;
      }

      // Search query
      if (search.trim()) {
        const q = search.toLowerCase();
        const searchTarget = [
          conj.id,
          primary?.name || "",
          primary?.noradId.toString() || "",
          primary?.shellId || "",
          secondary?.name || "",
          secondary?.noradId.toString() || "",
          secondary?.shellId || "",
          formatOperator(primary?.operatorId || null, primary?.name || ""),
          formatOperator(secondary?.operatorId || null, secondary?.name || ""),
        ].join(" ").toLowerCase();

        return searchTarget.includes(q);
      }

      return true;
    });
  }, [conjunctions, activeTab, acknowledgedIds, shellFilter, search, objectsMap]);

  // Filtered critical shells
  const filteredShells = useMemo(() => {
    if (activeTab === "CRITICAL" || activeTab === "ELEVATED" || activeTab === "ACKNOWLEDGED") {
      return [];
    }
    return criticalShells.filter((shell) => {
      if (shellFilter !== "ALL" && shell.shellId !== shellFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return shell.shellId.toLowerCase().includes(q);
      }
      return true;
    });
  }, [criticalShells, activeTab, shellFilter, search]);

  const activeCriticalCount = conjunctions.filter((c) => c.riskLevel === "critical" && c.status === "active").length;
  const criticalCount = conjunctions.filter((c) => c.riskLevel === "critical").length;
  const elevatedCount = conjunctions.filter((c) => c.riskLevel === "elevated").length;
  const ackedCount = conjunctions.filter((c) => acknowledgedIds.has(c.id)).length;
  const validTelemetryCount = Object.values(objectsMap).filter((object) =>
    Number.isFinite(object.position.x) &&
    Number.isFinite(object.position.y) &&
    Number.isFinite(object.position.z) &&
    Number.isFinite(object.velocity.vx) &&
    Number.isFinite(object.velocity.vy) &&
    Number.isFinite(object.velocity.vz) &&
    object.lastUpdated.length > 0,
  ).length;
  const propagationFidelity = Object.values(objectsMap).length > 0
    ? (validTelemetryCount / Object.values(objectsMap).length) * 100
    : 0;

  const handleExport = () => {
    const exportRows = filteredConjunctions.map((c) => {
      const primary = objectsMap[c.primaryObjectId];
      const secondary = objectsMap[c.secondaryObjectId];
      return {
        alertId: c.id,
        severity: c.riskLevel,
        primaryObject: primary?.name || c.primaryObjectId,
        primaryNorad: primary?.noradId || "N/A",
        primaryOperator: formatOperator(primary?.operatorId || null, primary?.name || ""),
        secondaryObject: secondary?.name || c.secondaryObjectId,
        secondaryNorad: secondary?.noradId || "N/A",
        secondaryOperator: formatOperator(secondary?.operatorId || null, secondary?.name || ""),
        tcaUtc: c.tca,
        countdown: formatCountdown(c.tca, nowMs),
        missDistanceKm: c.missDistance,
        missDistanceFormatted: formatDistance(c.missDistance),
        collisionProbability: c.collisionProbability,
        pcScientific: formatScientificPc(c.collisionProbability),
        status: acknowledgedIds.has(c.id) ? "Acknowledged" : c.status,
      };
    });
    downloadDataAsCsv(exportRows, "auralis-orbital-risk-alerts");
  };

  const highestUrgencyEvent = conjunctions.find((c) => c.riskLevel === "critical");

  return (
    <div className="flex-1 space-y-6 p-6 lg:p-8 max-w-7xl mx-auto w-full animate-in fade-in duration-300 font-sans">
      {/* Crisis Banner Notification if injected */}
      {crisisNotification && (
        <div className="p-3.5 rounded-xl border border-red-500/60 bg-red-950/80 text-red-200 flex items-center justify-between text-xs font-mono animate-in slide-in-from-top duration-300 shadow-lg">
          <div className="flex items-center gap-2.5">
            <Flame className="h-5 w-5 text-red-400 animate-bounce" />
            <span className="font-semibold">{crisisNotification}</span>
          </div>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => setCrisisNotification(null)}
            className="h-7 text-xs border-red-500/40 hover:bg-red-900/50"
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="text-[10px] font-mono text-red-400 border-red-500/30 bg-red-950/40">
              HIGH PRIORITY SCREENING FEED
            </Badge>
            <span className="text-xs font-mono text-muted-foreground">
              {conjunctions.length} THREAT GEOMETRIES SCREENED • {criticalShells.length} SUPERCRITICAL SHELLS
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2.5">
            <BellRing className="w-7 h-7 text-primary" />
            Orbital Risk Alerts & Collision Warnings
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Predictive screening engine identifying high collision probability conjunctions (Pc ≥ 10⁻⁴) and supercritical Kessler cascade density spikes (R₀ ≥ 1.0).
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            onClick={handleSimulateCrisis}
            disabled={simulatingCrisis}
            variant="outline" 
            size="sm" 
            className="text-xs font-mono gap-1.5 border-red-500/30 text-red-400 bg-red-950/20 hover:bg-red-950/40"
          >
            <Flame className={`w-3.5 h-3.5 ${simulatingCrisis ? "animate-spin" : "animate-pulse"}`} />
            {simulatingCrisis ? "Injecting Debris..." : "Simulate Crisis (Breakup)"}
          </Button>
          <Button 
            onClick={loadAlerts}
            variant="outline" 
            size="sm" 
            className="text-xs font-mono gap-1.5 border-border bg-card hover:bg-muted"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Sync
          </Button>
          <Button 
            onClick={handleExport}
            variant="outline" 
            size="sm" 
            className="text-xs font-semibold font-mono gap-1.5 border-border bg-card hover:bg-muted"
          >
            <Download className="w-3.5 h-3.5" />
            Export Alert Ledger
          </Button>
        </div>
      </div>

      {loadError && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-950/20 px-4 py-3 text-xs font-mono text-rose-300">
          Unable to load risk telemetry from the API. {loadError}
        </div>
      )}

      {/* Emergency Situational Warning Banner */}
      {criticalCount > 0 && highestUrgencyEvent && (
        <Card className="border-red-500/50 bg-gradient-to-r from-red-950/40 via-red-950/20 to-transparent shadow-md">
          <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-lg bg-red-500/20 text-red-400 shrink-0 mt-0.5 animate-pulse">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold uppercase tracking-wider text-red-400">
                    EMERGENCY MISSION CONTROL ALERT
                  </span>
                  <Badge variant="outline" className="text-[10px] font-mono border-red-500/40 text-red-400">
                    ACTIVE THREAT
                  </Badge>
                </div>
                <h2 className="text-base font-bold text-foreground">
                  {objectsMap[highestUrgencyEvent.primaryObjectId]?.name || "Primary Satellite"} & {objectsMap[highestUrgencyEvent.secondaryObjectId]?.name || "Debris Target"} in Terminal Conjunction Corridor
                </h2>
                <p className="text-xs text-muted-foreground font-mono">
                  Miss distance: {formatDistance(highestUrgencyEvent.missDistance)} • Collision Pc: {formatScientificPc(highestUrgencyEvent.collisionProbability)} • TCA in {formatCountdown(highestUrgencyEvent.tca, nowMs)}
                </p>
              </div>
            </div>
            <Link href={`/cases/${highestUrgencyEvent.id}`}>
              <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white font-mono text-xs gap-1.5 whitespace-nowrap shadow-sm">
                Authorize Avoidance Burn <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Metric Telemetry Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card 
          onClick={() => setActiveTab("CRITICAL")}
          className={`cursor-pointer transition-all border-border/80 bg-card/80 hover:border-red-500/50 ${activeTab === "CRITICAL" ? "ring-1 ring-red-500/50" : ""}`}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-mono font-semibold text-muted-foreground uppercase">
              Critical Conjunctions (Pc ≥ 10⁻³)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-red-400 flex items-center gap-2 font-mono">
              <ShieldAlert className="h-5 w-5 animate-pulse" />
              {activeCriticalCount} ACTIVE
            </div>
            <p className="text-xs text-muted-foreground mt-1 font-mono">Emergency autonomous yield protocol active.</p>
          </CardContent>
        </Card>

        <Card 
          onClick={() => setActiveTab("CASCADE")}
          className={`cursor-pointer transition-all border-border/80 bg-card/80 hover:border-amber-500/50 ${activeTab === "CASCADE" ? "ring-1 ring-amber-500/50" : ""}`}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-mono font-semibold text-muted-foreground uppercase">
              Cascade Risk Shells (R₀ ≥ 1.0)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-amber-400 flex items-center gap-2 font-mono">
              <Orbit className="h-5 w-5" />
              {criticalShells.length} SHELLS AT RISK
            </div>
            <p className="text-xs text-muted-foreground mt-1 font-mono">Supercritical fragmentation bands.</p>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-mono font-semibold text-muted-foreground uppercase">
              SGP4 Propagation Fidelity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-emerald-400 flex items-center gap-2 font-mono">
              <Activity className="h-5 w-5" />
              {propagationFidelity.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1 font-mono">{Object.values(objectsMap).length.toLocaleString()} API telemetry records synchronized.</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Controls */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 bg-card/80 p-3.5 rounded-xl border border-border/80 shadow-xs backdrop-blur-sm">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto flex-1 max-w-xl">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by satellite, debris name, event ID, or shell..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-xs bg-muted/40 border-border font-mono placeholder:text-muted-foreground"
            />
          </div>

          <select
            value={shellFilter}
            onChange={(e) => setShellFilter(e.target.value)}
            className="h-9 px-2.5 rounded-lg border border-border bg-muted/40 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="ALL">ALL ORBITAL SHELLS</option>
            {allShells.map((s) => (
              <option key={s.shellId} value={s.shellId}>
                {s.shellId} ({s.altitudeMin}-{s.altitudeMax} km)
              </option>
            ))}
          </select>
        </div>

        {/* Bulk Action */}
        <div className="flex items-center gap-2 w-full lg:w-auto justify-end">
          <Button
            size="sm"
            variant="outline"
            onClick={handleAcknowledgeAll}
            className="text-xs font-mono h-9 gap-1.5 border-border bg-muted/20 hover:bg-muted"
          >
            <Check className="w-3.5 h-3.5" />
            Acknowledge All
          </Button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-border/80">
        {[
          { key: "ALL", label: `ALL RISKS (${conjunctions.length + criticalShells.length})` },
          { key: "CRITICAL", label: `CRITICAL CONJUNCTIONS (${criticalCount})` },
          { key: "ELEVATED", label: `ELEVATED CONJUNCTIONS (${elevatedCount})` },
          { key: "CASCADE", label: `CASCADE RISK SHELLS (${criticalShells.length})` },
          { key: "ACKNOWLEDGED", label: `ACKNOWLEDGED (${ackedCount})` },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key as AlertTab)}
            className={`px-3 py-1.5 text-xs font-mono font-bold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === tab.key
                ? "bg-foreground text-background shadow-xs"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Cascade Shell Supercritical Alerts (When CASCADE or ALL tab is active) */}
      {(activeTab === "CASCADE" || activeTab === "ALL") && filteredShells.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <Orbit className="h-4 w-4" />
              Supercritical Kessler Cascade Altitude Bands (R₀ ≥ 1.0)
            </h2>
            <Link href="/analytics" className="text-xs font-mono text-primary hover:underline flex items-center gap-1">
              Cascade Simulator <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredShells.map((shell) => (
              <Card key={shell.shellId} className="border-amber-500/40 bg-amber-950/15 shadow-sm">
                <CardContent className="p-4 sm:p-5 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge className="font-mono text-[10px] font-bold bg-amber-500/20 text-amber-400 border-amber-500/40">
                          SUPERCRITICAL (R₀ = {shell.r0.toFixed(2)})
                        </Badge>
                        <span className="font-mono text-xs text-muted-foreground">
                          {shell.altitudeMin}–{shell.altitudeMax} km
                        </span>
                      </div>
                      <h3 className="font-bold text-base text-foreground mt-1 font-mono">
                        Orbital Shell: {shell.shellId}
                      </h3>
                    </div>

                    <Link href={`/analytics?shell=${shell.shellId}`}>
                      <Button size="sm" variant="outline" className="h-8 text-xs font-mono gap-1 border-amber-500/30 hover:bg-amber-900/30 text-amber-300">
                        Simulate <ArrowRight className="h-3 w-3" />
                      </Button>
                    </Link>
                  </div>

                  <div className="grid grid-cols-3 gap-2 p-2.5 rounded-lg bg-card/60 border border-border/60 text-xs font-mono">
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Active Satellites</span>
                      <span className="font-bold text-foreground">{shell.susceptibleCount} payloads</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Lethal Fragments</span>
                      <span className="font-bold text-rose-400">{shell.infectedCount} debris</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block">10-Yr Projection</span>
                      <span className="font-bold text-amber-400">
                        {(() => {
                          const tenYearIndex = shell.projectionYears.findIndex((year) => year === 10);
                          const projected = tenYearIndex >= 0 ? shell.projectedI[tenYearIndex] : undefined;
                          return projected !== undefined ? `+${projected - shell.infectedCount} frag` : "Elevated";
                        })()}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground font-mono">
                    Atmospheric density at {shell.altitudeMin} km provides insufficient natural drag to quench debris generation. Active Debris Removal (ADR) priority tier 1.
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Conjunction Threat Alerts Feed */}
      <div className="space-y-3">
        {(activeTab === "ALL" || activeTab === "CRITICAL" || activeTab === "ELEVATED" || activeTab === "ACKNOWLEDGED") && (
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Crosshair className="h-4 w-4 text-primary" />
              Pairwise Close-Approach Screening Feed ({filteredConjunctions.length} events)
            </h2>
          </div>
        )}

        {filteredConjunctions.length === 0 && (activeTab !== "CASCADE" || filteredShells.length === 0) ? (
          <Card className="border-border bg-card">
            <CardContent className="p-8 text-center space-y-2 font-mono text-xs text-muted-foreground">
              <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto opacity-60" />
              <div className="text-sm font-bold text-foreground">No Active Risk Alerts Found</div>
              <p>No orbital conjunctions or cascade hazards match your selected filter criteria.</p>
            </CardContent>
          </Card>
        ) : (
          filteredConjunctions.map((alert) => {
            const primary = objectsMap[alert.primaryObjectId];
            const secondary = objectsMap[alert.secondaryObjectId];
            const isAcked = acknowledgedIds.has(alert.id);
            const isCritical = alert.riskLevel === "critical";

            const primaryName = primary ? primary.name : "Primary Object";
            const primaryOp = formatOperator(primary?.operatorId || null, primary?.name || "");
            const secondaryName = secondary ? secondary.name : "Secondary Debris";
            const secondaryOp = formatOperator(secondary?.operatorId || null, secondary?.name || "");

            const shellDisplay = primary?.shellId || secondary?.shellId || "LEO";

            return (
              <Card 
                key={alert.id} 
                className={`transition-all ${
                  isAcked 
                    ? "opacity-60 bg-muted/20 border-border" 
                    : isCritical 
                    ? "border-red-500/40 bg-red-950/15 shadow-sm" 
                    : "border-amber-500/30 bg-amber-950/10 shadow-sm"
                }`}
              >
                <CardContent className="p-4 sm:p-5">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg mt-0.5 shrink-0 ${
                        isCritical ? "bg-red-500/20 text-red-400" : "bg-amber-500/20 text-amber-400"
                      }`}>
                        {isCritical ? <Flame className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
                      </div>
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge 
                            className={`font-mono text-[10px] font-bold uppercase ${
                              isCritical 
                                ? "bg-red-500/20 text-red-400 border-red-500/40" 
                                : "bg-amber-500/20 text-amber-400 border-amber-500/40"
                            }`}
                          >
                            {alert.riskLevel} ALERT
                          </Badge>
                          <span className="font-mono text-xs text-muted-foreground">
                            EVENT #{alert.id.slice(0, 11)}...
                          </span>
                          <Badge variant="outline" className="font-mono text-[10px] text-muted-foreground">
                            SHELL: {shellDisplay}
                          </Badge>
                          {isAcked && (
                            <Badge variant="secondary" className="font-mono text-[10px] bg-emerald-950/60 text-emerald-400 border border-emerald-500/30">
                              ACKNOWLEDGED
                            </Badge>
                          )}
                        </div>

                        {/* Primary & Secondary Encounter Names */}
                        <div className="pt-0.5">
                          <h3 className="font-bold text-base text-foreground flex flex-wrap items-center gap-1.5">
                            <span>{primaryName}</span>
                            <span className="text-xs text-muted-foreground font-mono font-normal">({primaryOp})</span>
                            <span className="text-rose-400">⚡</span>
                            <span>{secondaryName}</span>
                            <span className="text-xs text-muted-foreground font-mono font-normal">({secondaryOp})</span>
                          </h3>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-mono text-muted-foreground pt-1">
                          <span>TCA: <strong className="text-foreground">{alert.tca.replace("T", " ").replace("Z", " UTC")}</strong></span>
                          <span>Miss: <strong className="text-foreground">{formatDistance(alert.missDistance)}</strong></span>
                          <span>Rel Velocity: <strong className="text-foreground">{formatVelocity(alert.relativeVelocity)}</strong></span>
                          <span>Collision Pc: <strong className={isCritical ? "text-red-400" : "text-amber-400"}>{formatScientificPc(alert.collisionProbability)}</strong></span>
                        </div>

                        <p className="text-xs text-foreground/80 font-mono bg-muted/40 p-2.5 rounded border border-border/50 mt-2">
                          {alert.maneuverProposalId
                            ? "Bilateral autonomous avoidance burn proposal generated. Awaiting flight controller burn authorization."
                            : "SGP4 propagation indicates close-approach threshold breached. Monitoring orbital drift and covariance expansion."}
                        </p>
                      </div>
                    </div>

                    {/* Actions & Live Countdown */}
                    <div className="flex sm:flex-col items-end justify-between sm:justify-start gap-2 shrink-0">
                      <div className="text-right font-mono">
                        <span className="text-[10px] uppercase text-muted-foreground block">TCA Horizon</span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded inline-block mt-0.5 ${
                          isCritical ? "bg-red-950/90 text-red-400 border border-red-500/40 animate-pulse" : "bg-muted text-foreground border border-border"
                        }`}>
                          {formatCountdown(alert.tca, nowMs)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mt-2">
                        <Button
                          type="button"
                          variant={isAcked ? "outline" : "secondary"}
                          size="sm"
                          onClick={() => handleAcknowledge(alert.id)}
                          className="text-xs font-mono h-8 cursor-pointer"
                        >
                          {isAcked ? "Mark Active" : "Acknowledge"}
                        </Button>
                        <Link href={`/cases/${alert.id}`}>
                          <Button size="sm" className="text-xs font-mono h-8 gap-1">
                            Review <ArrowRight className="h-3 w-3" />
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
