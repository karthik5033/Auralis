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
  ExternalLink
} from "lucide-react";
import { CrimeTrendChart } from "@/components/charts/CrimeTrendChart";
import { LiveMap } from "@/components/dashboard/LiveMap";
import { LiveEventFeed } from "@/components/dashboard/LiveEventFeed";
import { EarlyWarningSection } from "@/components/dashboard/EarlyWarningSection";
import { QuickMLBar } from "@/components/dashboard/QuickMLBar";
import { getDashboardSummary, getConjunctions, getObjects } from "@/lib/api";
import type { DashboardSummary, ConjunctionEvent, TrackedObject } from "@/types/contract";
import { downloadDataAsCsv } from "@/lib/utils";
import Link from "next/link";

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [conjunctions, setConjunctions] = useState<ConjunctionEvent[]>([]);
  const [objectsMap, setObjectsMap] = useState<Record<string, TrackedObject>>({});

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        const [sumRes, conjRes, objRes] = await Promise.all([
          getDashboardSummary(),
          getConjunctions({ limit: 20 }),
          getObjects({ limit: 100 }),
        ]);

        setSummary(sumRes);
        setConjunctions(conjRes.data);

        const map: Record<string, TrackedObject> = {};
        objRes.data.forEach((obj) => {
          map[obj.id] = obj;
        });
        setObjectsMap(map);
      } catch (err) {
        console.error("Failed fetching dashboard data:", err);
      }
    }
    fetchDashboardData();
  }, []);

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
      {/* Quick AI Search Copilot Bar */}
      <QuickMLBar />

      {/* Top Metric Cards - Matching INTERFACE_CONTRACT §3.1 DashboardSummary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Conjunctions */}
        <Card className="shadow-sm hover:shadow transition-shadow border-border/80">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">
              Active Conjunctions
            </CardTitle>
            <div className="p-2 rounded-lg bg-muted text-foreground">
              <Crosshair className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold tracking-tight text-foreground font-mono">
              {summary ? summary.activeConjunctions : 23}
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-xs font-medium text-amber-500">
              <TrendingUp className="h-3.5 w-3.5" />
              <span>+3 close approaches in 24h</span>
            </div>
          </CardContent>
        </Card>

        {/* Tracked Objects */}
        <Card className="shadow-sm hover:shadow transition-shadow border-border/80">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">
              Tracked Objects
            </CardTitle>
            <div className="p-2 rounded-lg bg-muted text-foreground">
              <Boxes className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold tracking-tight text-foreground font-mono">
              {summary ? summary.totalTrackedObjects.toLocaleString() : "1,847"}
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-xs font-medium text-emerald-500">
              <Radio className="h-3.5 w-3.5" />
              <span>{summary ? summary.activeSatellites : 623} active satellites in LEO</span>
            </div>
          </CardContent>
        </Card>

        {/* High-Risk Alerts */}
        <Card className="shadow-sm hover:shadow transition-shadow border-border/80">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">
              Critical Conjunctions
            </CardTitle>
            <div className="p-2 rounded-lg bg-red-500/10 text-red-500">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold tracking-tight text-red-500 font-mono">
              {summary ? summary.criticalConjunctions : 2}
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-xs font-medium text-red-500">
              <span>Pc &ge; 10⁻³ emergency threshold</span>
            </div>
          </CardContent>
        </Card>

        {/* Maneuvers Resolved */}
        <Card className="shadow-sm hover:shadow transition-shadow border-border/80">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">
              Maneuvered (24h)
            </CardTitle>
            <div className="p-2 rounded-lg bg-muted text-foreground">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold tracking-tight text-foreground font-mono">
              {summary ? summary.maneuveredLast24h : 1}
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-xs font-medium text-muted-foreground">
              <span>Bilateral autonomous yield rate: 100%</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid: Conjunction Telemetry + Live Orbital Event Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="shadow-sm h-full flex flex-col justify-between border-border/80">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <Orbit className="h-5 w-5 text-primary" />
                    Conjunction Trends & Telemetry
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Flagged collision risks vs successfully avoided maneuvers with SGP4 error covariance.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col justify-between pt-2">
              <CrimeTrendChart />
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card className="shadow-sm h-full flex flex-col justify-between border-border/80">
            <CardContent className="p-5 flex-1">
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
                        {conj.id.slice(0, 11)}...
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
                          {conj.collisionProbability.toExponential(2)}
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
                          <Link href="/financial">
                            <Badge className="text-[10px] font-mono bg-primary/20 text-primary hover:bg-primary/30 border-primary/30 gap-1">
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
    </div>
  );
}
