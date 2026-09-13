"use client";

import React, { useState, useEffect } from "react";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  AlertTriangle, 
  TrendingUp, 
  Boxes, 
  Crosshair,
  ArrowRight, 
  ShieldCheck, 
  Download,
  Orbit,
  Radio,
  ExternalLink,
  ShieldAlert,
  Trash2,
  Satellite,
  Bomb,
  Flame,
  X
} from "lucide-react";
import { OrbitalTrendChart } from "@/components/charts/OrbitalTrendChart";
import { LiveMap } from "@/components/dashboard/LiveMap";
import { LiveEventFeed } from "@/components/dashboard/LiveEventFeed";
import { EarlyWarningSection } from "@/components/dashboard/EarlyWarningSection";
import { AgentStatusBar } from "@/components/dashboard/AgentStatusBar";
import { QuickMLBar } from "@/components/dashboard/QuickMLBar";
import { CrisisInjectionModal } from "@/components/dashboard/CrisisInjectionModal";
import { getDashboardSummary, getConjunctions, getObjects } from "@/lib/api";
import { useWebSocket } from "@/components/providers/WebSocketProvider";
import { formatScientificPc } from "@/lib/formatters";
import type { DashboardSummary, ConjunctionEvent, TrackedObject, CrisisInjectionResponse } from "@/types/contract";
import { downloadDataAsCsv } from "@/lib/utils";
import Link from "next/link";

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [conjunctions, setConjunctions] = useState<ConjunctionEvent[]>([]);
  const [objectsMap, setObjectsMap] = useState<Record<string, TrackedObject>>({});
  const [loading, setLoading] = useState(true);
  const [isCrisisModalOpen, setIsCrisisModalOpen] = useState(false);
  const [crisisAlert, setCrisisAlert] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function fetchDashboardData() {
      try {
        const [sumRes, conjRes, objRes] = await Promise.all([
          getDashboardSummary(),
          getConjunctions({ limit: 20 }),
          getObjects({ limit: 150 }),
        ]);

        if (!mounted) return;

        setSummary(sumRes);
        setConjunctions(conjRes.data);

        const map: Record<string, TrackedObject> = {};
        objRes.data.forEach((obj) => {
          map[obj.id] = obj;
        });
        setObjectsMap(map);
      } catch (err) {
        console.error("Failed fetching dashboard data:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    fetchDashboardData();

    return () => {
      mounted = false;
    };
  }, []);

  // Wire live WebSocket events for real-time dashboard updates via unified provider
  useWebSocket("conjunction:created", (newConj) => {
    setConjunctions((prev) => [newConj, ...prev.slice(0, 19)]);
    setSummary((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        activeConjunctions: prev.activeConjunctions + 1,
        criticalConjunctions:
          newConj.riskLevel === "critical"
            ? prev.criticalConjunctions + 1
            : prev.criticalConjunctions,
      };
    });
  });

  useWebSocket("conjunction:updated", (updated) => {
    setConjunctions((prev) =>
      prev.map((c) => (c.id === updated.id ? updated : c))
    );
  });

  useWebSocket("crisis:injected", (crisis: CrisisInjectionResponse) => {
    setCrisisAlert(
      `Injected ${crisis.injectedObjectCount} fragments into ${crisis.affectedShellIds.join(" & ")}. +${crisis.newConjunctionEventCount} critical conjunction geometries generated.`
    );
    setSummary((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        totalTrackedObjects: prev.totalTrackedObjects + crisis.injectedObjectCount,
        debrisObjects: prev.debrisObjects + crisis.injectedObjectCount,
        activeConjunctions: prev.activeConjunctions + crisis.newConjunctionEventCount,
        criticalConjunctions: prev.criticalConjunctions + crisis.newConjunctionEventCount,
        shellsAtRisk: Math.max(prev.shellsAtRisk, crisis.affectedShellIds.length),
      };
    });
  });

  const handleExportCsv = () => {
    const exportRows = conjunctions.map((c) => ({
      eventId: c.id,
      primaryObject: objectsMap[c.primaryObjectId]?.name || c.primaryObjectId,
      secondaryObject: objectsMap[c.secondaryObjectId]?.name || c.secondaryObjectId,
      tca: c.tca,
      missDistanceKm: c.missDistance,
      relativeVelocityKmS: c.relativeVelocity,
      collisionProbability: c.collisionProbability,
      riskLevel: c.riskLevel,
      status: c.status,
      maneuverProposalId: c.maneuverProposalId || "N/A",
    }));
    downloadDataAsCsv(exportRows, "auralis-active-conjunctions");
  };

  return (
    <div className="flex-1 space-y-6 p-6 lg:p-8 max-w-7xl mx-auto w-full animate-in fade-in duration-300 font-sans">
      {/* Top Header & Crisis Injection Trigger */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex-1">
          <QuickMLBar />
        </div>
        <Button
          type="button"
          onClick={() => setIsCrisisModalOpen(true)}
          className="h-10 px-4 font-mono font-bold text-xs uppercase tracking-wider bg-red-600 hover:bg-red-500 text-white shadow-lg border border-red-500/60 gap-2 shrink-0 cursor-pointer animate-pulse"
        >
          <Bomb className="h-4 w-4" />
          Inject Crisis
        </Button>
      </div>

      {/* Dynamic Crisis Alert Banner */}
      {crisisAlert && (
        <div className="p-4 rounded-xl border border-red-500/50 bg-red-950/40 text-red-200 flex items-center justify-between gap-3 shadow-lg animate-in slide-in-from-top duration-300 font-mono text-xs">
          <div className="flex items-center gap-2.5">
            <Flame className="h-5 w-5 text-red-500 animate-pulse shrink-0" />
            <div>
              <span className="font-bold text-red-400 uppercase">KINETIC BREAKUP CASCADE DETECTED: </span>
              <span>{crisisAlert}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setCrisisAlert(null)}
            className="p-1 rounded text-red-400 hover:text-white hover:bg-red-900/50 cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Autonomous Agent Orchestration Mesh Status Bar */}
      <AgentStatusBar />

      {/* 6 Top Metric KPI Cards - Matching INTERFACE_CONTRACT §3.1 DashboardSummary */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Total Tracked Objects */}
        <Card className="shadow-sm hover:shadow transition-shadow border-border/80 bg-card/70">
          <CardHeader className="flex flex-row items-center justify-between pb-1.5 p-3.5">
            <CardTitle className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground font-mono truncate">
              Tracked Objects
            </CardTitle>
            <div className="p-1.5 rounded-lg bg-muted text-foreground">
              <Boxes className="h-3.5 w-3.5" />
            </div>
          </CardHeader>
          <CardContent className="p-3.5 pt-0">
            <div className="text-2xl font-extrabold tracking-tight text-foreground font-mono">
              {summary ? (
                summary.totalTrackedObjects.toLocaleString()
              ) : loading ? (
                <span className="inline-block h-7 w-20 bg-muted/60 rounded animate-pulse" />
              ) : (
                "—"
              )}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1 font-mono truncate">
              Catalog SGP4 synched
            </p>
          </CardContent>
        </Card>

        {/* Active Satellites */}
        <Card className="shadow-sm hover:shadow transition-shadow border-border/80 bg-card/70">
          <CardHeader className="flex flex-row items-center justify-between pb-1.5 p-3.5">
            <CardTitle className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground font-mono truncate">
              Active Satellites
            </CardTitle>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Satellite className="h-3.5 w-3.5" />
            </div>
          </CardHeader>
          <CardContent className="p-3.5 pt-0">
            <div className="text-2xl font-extrabold tracking-tight text-emerald-400 font-mono">
              {summary ? (
                summary.activeSatellites.toLocaleString()
              ) : loading ? (
                <span className="inline-block h-7 w-16 bg-emerald-500/20 rounded animate-pulse" />
              ) : (
                "—"
              )}
            </div>
            <p className="text-[10px] text-emerald-500/80 mt-1 font-mono truncate">
              Active LEO payloads
            </p>
          </CardContent>
        </Card>

        {/* Debris Objects */}
        <Card className="shadow-sm hover:shadow transition-shadow border-border/80 bg-card/70">
          <CardHeader className="flex flex-row items-center justify-between pb-1.5 p-3.5">
            <CardTitle className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground font-mono truncate">
              Debris & Fragments
            </CardTitle>
            <div className="p-1.5 rounded-lg bg-zinc-500/10 text-zinc-400">
              <Trash2 className="h-3.5 w-3.5" />
            </div>
          </CardHeader>
          <CardContent className="p-3.5 pt-0">
            <div className="text-2xl font-extrabold tracking-tight text-foreground font-mono">
              {summary ? (
                summary.debrisObjects.toLocaleString()
              ) : loading ? (
                <span className="inline-block h-7 w-20 bg-muted/60 rounded animate-pulse" />
              ) : (
                "—"
              )}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1 font-mono truncate">
              Non-steerable bodies
            </p>
          </CardContent>
        </Card>

        {/* Active Conjunctions */}
        <Card className="shadow-sm hover:shadow transition-shadow border-border/80 bg-card/70">
          <CardHeader className="flex flex-row items-center justify-between pb-1.5 p-3.5">
            <CardTitle className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground font-mono truncate">
              Conjunctions
            </CardTitle>
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
              <Crosshair className="h-3.5 w-3.5" />
            </div>
          </CardHeader>
          <CardContent className="p-3.5 pt-0">
            <div className="text-2xl font-extrabold tracking-tight text-foreground font-mono">
              {summary ? (
                summary.activeConjunctions
              ) : loading ? (
                <span className="inline-block h-7 w-12 bg-amber-500/20 rounded animate-pulse" />
              ) : (
                "—"
              )}
            </div>
            <p className="text-[10px] text-amber-500 mt-1 font-mono truncate">
              Approaches in 72h
            </p>
          </CardContent>
        </Card>

        {/* Critical Conjunctions */}
        <Card className="shadow-sm hover:shadow transition-shadow border-red-500/30 bg-red-950/10">
          <CardHeader className="flex flex-row items-center justify-between pb-1.5 p-3.5">
            <CardTitle className="text-[11px] font-semibold uppercase tracking-wider text-red-400 font-mono truncate">
              Critical Risk
            </CardTitle>
            <div className="p-1.5 rounded-lg bg-red-500/20 text-red-400">
              <ShieldAlert className="h-3.5 w-3.5 animate-pulse" />
            </div>
          </CardHeader>
          <CardContent className="p-3.5 pt-0">
            <div className="text-2xl font-extrabold tracking-tight text-red-400 font-mono">
              {summary ? (
                summary.criticalConjunctions
              ) : loading ? (
                <span className="inline-block h-7 w-12 bg-red-500/20 rounded animate-pulse" />
              ) : (
                "—"
              )}
            </div>
            <p className="text-[10px] text-red-400 mt-1 font-mono truncate">
              Pc &ge; 10⁻³ action trigger
            </p>
          </CardContent>
        </Card>

        {/* Shells at Risk */}
        <Card className="shadow-sm hover:shadow transition-shadow border-amber-500/30 bg-amber-950/10">
          <CardHeader className="flex flex-row items-center justify-between pb-1.5 p-3.5">
            <CardTitle className="text-[11px] font-semibold uppercase tracking-wider text-amber-400 font-mono truncate">
              Shells at Risk
            </CardTitle>
            <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
              <Orbit className="h-3.5 w-3.5" />
            </div>
          </CardHeader>
          <CardContent className="p-3.5 pt-0">
            <div className="text-2xl font-extrabold tracking-tight text-amber-400 font-mono">
              {summary ? (
                summary.shellsAtRisk
              ) : loading ? (
                <span className="inline-block h-7 w-12 bg-amber-500/20 rounded animate-pulse" />
              ) : (
                "—"
              )}
            </div>
            <p className="text-[10px] text-amber-400 mt-1 font-mono truncate">
              R₀ &ge; 1.0 Supercritical
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid: Conjunction Telemetry + Live Orbital Event Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 min-w-0 items-start">
        <div className="lg:col-span-2 min-w-0">
          <Card className="shadow-sm border-border/80 min-w-0 bg-card">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Orbit className="h-4 w-4 text-primary" />
                    Conjunction Trends & Telemetry
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Flagged collision risks vs successfully avoided maneuvers with SGP4 error covariance.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-1 pb-3.5 min-w-0 w-full">
              <OrbitalTrendChart />
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1 min-w-0">
          <Card className="shadow-sm border-border/80 min-w-0 bg-card">
            <CardContent className="p-4 min-w-0">
              <LiveEventFeed />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Early Warning Section */}
      <EarlyWarningSection />

      {/* 3D Tactical Globe & Conjunction Radar Display */}
      <Card className="shadow-sm border-border/80">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-lg font-bold flex items-center gap-2">
                <Radio className="h-5 w-5 text-primary animate-pulse" />
                Orbital Shell Density & Conjunction Radar
              </CardTitle>
              <CardDescription className="text-xs">
                Photorealistic 3D interactive Earth globe tracking active payloads, fragment clouds, and close-approach geometries.
              </CardDescription>
            </div>
            <Link href="/network">
              <Button variant="outline" size="sm" className="text-xs font-semibold">
                Open Object Graph <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          <LiveMap />
        </CardContent>
      </Card>

      {/* Active Conjunctions Table - Sourced from INTERFACE_CONTRACT §3.1 */}
      <Card className="shadow-sm border-border/80">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-lg font-bold">Active Conjunction Events & Yield Protocols</CardTitle>
              <CardDescription className="text-xs">
                Close approach events requiring autonomous delta-v scheduling or operator confirmation.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleExportCsv} className="text-xs font-semibold gap-1.5 font-mono">
                <Download className="h-3.5 w-3.5" />
                Export CSV
              </Button>
              <Link href="/cases">
                <Button size="sm" className="text-xs font-semibold gap-1.5">
                  View All Events <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-border/80 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="font-mono font-semibold text-xs">Event ID</TableHead>
                  <TableHead className="font-semibold text-xs">Primary Object (At Risk)</TableHead>
                  <TableHead className="font-semibold text-xs">Secondary Object</TableHead>
                  <TableHead className="font-semibold text-xs">TCA (UTC)</TableHead>
                  <TableHead className="font-semibold text-xs">Miss Distance</TableHead>
                  <TableHead className="font-semibold text-xs">Collision Prob (Pc)</TableHead>
                  <TableHead className="font-semibold text-xs">Severity</TableHead>
                  <TableHead className="font-semibold text-xs">Status</TableHead>
                  <TableHead className="font-semibold text-xs text-right">Protocol</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {conjunctions.map((conj) => {
                  const primary = objectsMap[conj.primaryObjectId];
                  const secondary = objectsMap[conj.secondaryObjectId];

                  return (
                    <TableRow key={conj.id} className="hover:bg-muted/30 cursor-pointer">
                      <TableCell className="font-mono text-xs font-bold text-primary">
                        <Link href={`/cases/${conj.id}`} className="hover:underline">
                          {conj.id.slice(0, 11)}...
                        </Link>
                      </TableCell>
                      <TableCell className="text-xs font-semibold">
                        <div className="flex flex-col">
                          <span className="text-foreground">{primary ? primary.name : conj.primaryObjectId.slice(0, 8)}</span>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {primary ? `NORAD ${primary.noradId} • ${primary.shellId}` : "LEO Shell"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs font-semibold">
                        <div className="flex flex-col">
                          <span className="text-foreground">{secondary ? secondary.name : conj.secondaryObjectId.slice(0, 8)}</span>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {secondary ? `${secondary.type.toUpperCase()}` : "Debris"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap font-mono">
                        {conj.tca.replace("T", " ").replace("Z", "")}
                      </TableCell>
                      <TableCell className="text-xs font-mono font-semibold">
                        <span className={conj.missDistance < 0.5 ? "text-red-400" : conj.missDistance < 1.5 ? "text-amber-400" : "text-foreground"}>
                          {(conj.missDistance * 1000).toFixed(0)} m
                        </span>
                      </TableCell>
                      <TableCell className="text-xs font-mono font-bold">
                        <span className={conj.riskLevel === "critical" ? "text-red-500" : conj.riskLevel === "elevated" ? "text-amber-500" : "text-emerald-500"}>
                          {formatScientificPc(conj.collisionProbability)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline" 
                          className={`text-[10px] font-mono font-bold uppercase ${
                            conj.riskLevel === 'critical' ? 'text-red-500 border-red-500/30 bg-red-500/10' :
                            conj.riskLevel === 'elevated' ? 'text-amber-500 border-amber-500/30 bg-amber-500/10' :
                            'text-emerald-500 border-emerald-500/30 bg-emerald-500/10'
                          }`}
                        >
                          {conj.riskLevel}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-[10px] font-mono font-semibold uppercase">
                          {conj.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {conj.maneuverProposalId ? (
                          <Link href={`/financial`}>
                            <Badge className="text-[10px] font-mono bg-primary/20 text-primary hover:bg-primary/30 border-primary/30 gap-1 cursor-pointer">
                              Maneuver <ExternalLink className="h-2.5 w-2.5" />
                            </Badge>
                          </Link>
                        ) : (
                          <span className="text-[11px] text-muted-foreground font-mono">Tracking</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Crisis Injection Modal */}
      <CrisisInjectionModal
        isOpen={isCrisisModalOpen}
        onClose={() => setIsCrisisModalOpen(false)}
        onInjected={(res: CrisisInjectionResponse) => {
          setCrisisAlert(
            `Injected ${res.injectedObjectCount} fragments into ${res.affectedShellIds.join(" & ")}. +${res.newConjunctionEventCount} critical conjunction geometries generated.`
          );
        }}
      />
    </div>
  );
}
