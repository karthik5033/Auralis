"use client";

import React, { useState, useEffect } from "react";
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
  CheckCircle2
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getConjunctions, getObjects } from "@/lib/api";
import { useWebSocket } from "@/components/providers/WebSocketProvider";
import { formatScientificPc, formatCountdown, formatDistance, formatVelocity } from "@/lib/formatters";
import type { ConjunctionEvent, TrackedObject, RiskLevel, ConjunctionStatus } from "@/types/contract";
import Link from "next/link";
import { downloadDataAsCsv } from "@/lib/utils";

export default function CasesPage() {
  const [conjunctions, setConjunctions] = useState<ConjunctionEvent[]>([]);
  const [objectsMap, setObjectsMap] = useState<Record<string, TrackedObject>>({});
  const [search, setSearch] = useState("");
  const [filterRisk, setFilterRisk] = useState<string>("ALL");
  const [loading, setLoading] = useState(true);
  const [nowMs, setNowMs] = useState<number>(Date.now());

  // Tick live timer every second for accurate TCA countdown
  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadConjunctionsData() {
      try {
        const [conjRes, objRes] = await Promise.all([
          getConjunctions({ limit: 50 }),
          getObjects({ limit: 150 }),
        ]);

        if (!mounted) return;

        setConjunctions(conjRes.data);

        const map: Record<string, TrackedObject> = {};
        objRes.data.forEach((obj) => {
          map[obj.id] = obj;
        });
        setObjectsMap(map);
      } catch (err) {
        console.error("Failed loading conjunction cases:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadConjunctionsData();

    return () => {
      mounted = false;
    };
  }, []);

  // Subscribe to real-time conjunction WebSocket events via unified provider
  useWebSocket("conjunction:created", (newConj) => {
    setConjunctions((prev) => [newConj, ...prev]);
  });

  useWebSocket("conjunction:updated", (updated) => {
    setConjunctions((prev) =>
      prev.map((c) => (c.id === updated.id ? updated : c))
    );
  });

  const filteredConjunctions = conjunctions.filter((c) => {
    const primary = objectsMap[c.primaryObjectId];
    const secondary = objectsMap[c.secondaryObjectId];

    const searchTarget = [
      c.id,
      primary?.name || "",
      primary?.noradId?.toString() || "",
      secondary?.name || "",
      secondary?.noradId?.toString() || "",
      c.status,
      c.riskLevel,
    ].join(" ").toLowerCase();

    const matchesSearch = searchTarget.includes(search.toLowerCase());
    const matchesRisk =
      filterRisk === "ALL" ||
      c.riskLevel.toUpperCase() === filterRisk.toUpperCase() ||
      c.status.toUpperCase() === filterRisk.toUpperCase();

    return matchesSearch && matchesRisk;
  });

  const handleExport = () => {
    const rows = filteredConjunctions.map((c) => ({
      eventId: c.id,
      primaryObjectName: objectsMap[c.primaryObjectId]?.name || c.primaryObjectId,
      primaryNoradId: objectsMap[c.primaryObjectId]?.noradId || "N/A",
      secondaryObjectName: objectsMap[c.secondaryObjectId]?.name || c.secondaryObjectId,
      secondaryNoradId: objectsMap[c.secondaryObjectId]?.noradId || "N/A",
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
          <Badge className="font-mono text-[10px] font-bold uppercase text-red-400 border-red-500/40 bg-red-950/60">
            CRITICAL
          </Badge>
        );
      case "elevated":
        return (
          <Badge className="font-mono text-[10px] font-bold uppercase text-amber-400 border-amber-500/40 bg-amber-950/60">
            ELEVATED
          </Badge>
        );
      default:
        return (
          <Badge className="font-mono text-[10px] font-bold uppercase text-emerald-400 border-emerald-500/40 bg-emerald-950/60">
            NOMINAL
          </Badge>
        );
    }
  };

  const getStatusBadge = (status: ConjunctionStatus) => {
    switch (status) {
      case "active":
        return (
          <span className="flex items-center gap-1 text-[10px] font-mono font-bold text-red-400 bg-red-950/50 border border-red-500/30 px-2 py-0.5 rounded">
            <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
            ACTIVE
          </span>
        );
      case "monitoring":
        return (
          <span className="flex items-center gap-1 text-[10px] font-mono font-bold text-amber-400 bg-amber-950/50 border border-amber-500/30 px-2 py-0.5 rounded">
            MONITORING
          </span>
        );
      case "mitigated":
        return (
          <span className="flex items-center gap-1 text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/50 border border-emerald-500/30 px-2 py-0.5 rounded">
            MITIGATED
          </span>
        );
      case "expired":
        return (
          <span className="flex items-center gap-1 text-[10px] font-mono text-zinc-400 bg-zinc-900 border border-zinc-700 px-2 py-0.5 rounded">
            EXPIRED
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 text-[10px] font-mono text-zinc-500 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded">
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
              CONTRACT §1.2 • FOSTER-1992 COVARIANCE
            </Badge>
            <span className="text-xs font-mono text-muted-foreground">
              {conjunctions.length} ACTIVE CLOSE APPROACHES
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2.5">
            <Crosshair className="w-7 h-7 text-primary" />
            Conjunction Screening & Yield Events
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Multi-target orbital conjunction assessment with SGP4 ephemerides, live TCA countdowns, and bilateral maneuver proposals.
          </p>
        </div>
        <Button 
          onClick={handleExport} 
          variant="outline" 
          className="gap-1.5 text-xs font-semibold font-mono border-border bg-card hover:bg-muted"
        >
          <Download className="h-4 w-4" />
          Export Conjunction Manifest
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card/80 p-3 rounded-xl border border-border/80 backdrop-blur-sm shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search by ID, satellite name, NORAD catalog, or status..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs bg-muted/40 border-border font-mono"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto">
          {["ALL", "CRITICAL", "ELEVATED", "ACTIVE", "MITIGATED", "MONITORING"].map((filterKey) => (
            <button
              key={filterKey}
              type="button"
              onClick={() => setFilterRisk(filterKey)}
              className={`px-3 py-1.5 text-xs font-mono font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                filterRisk === filterKey 
                  ? "bg-primary text-primary-foreground shadow-xs" 
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {filterKey}
            </button>
          ))}
        </div>
      </div>

      {/* Conjunctions Master Table */}
      <Card className="shadow-sm border-border/80 bg-card/80 backdrop-blur-sm">
        <CardHeader className="pb-3">
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
              Showing {filteredConjunctions.length} of {conjunctions.length}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-border/70 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="font-mono font-semibold text-xs">Event ID</TableHead>
                  <TableHead className="font-semibold text-xs">Primary Asset (Protected)</TableHead>
                  <TableHead className="font-semibold text-xs">Secondary Object</TableHead>
                  <TableHead className="font-semibold text-xs">TCA (UTC)</TableHead>
                  <TableHead className="font-semibold text-xs">TCA Horizon</TableHead>
                  <TableHead className="font-semibold text-xs">Miss Distance</TableHead>
                  <TableHead className="font-semibold text-xs">Collision Prob (Pc)</TableHead>
                  <TableHead className="font-semibold text-xs">Rel Velocity</TableHead>
                  <TableHead className="font-semibold text-xs">Risk Level</TableHead>
                  <TableHead className="font-semibold text-xs">Status</TableHead>
                  <TableHead className="font-semibold text-xs text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredConjunctions.map((conj) => {
                  const primary = objectsMap[conj.primaryObjectId];
                  const secondary = objectsMap[conj.secondaryObjectId];
                  const countdownStr = formatCountdown(conj.tca, nowMs);
                  const isCritical = conj.riskLevel === "critical";

                  return (
                    <TableRow 
                      key={conj.id} 
                      className={`hover:bg-muted/30 transition-colors ${
                        isCritical ? "bg-red-950/10" : ""
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
                            {secondary ? `${secondary.type.toUpperCase()}` : "Debris"}
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
                            ? "bg-red-950/80 text-red-400 border border-red-500/40" 
                            : "bg-muted text-foreground border border-border"
                        }`}>
                          {countdownStr}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs font-mono font-semibold whitespace-nowrap">
                        <span className={conj.missDistance < 0.5 ? "text-red-400" : conj.missDistance < 1.5 ? "text-amber-400" : "text-foreground"}>
                          {formatDistance(conj.missDistance)}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs font-mono font-bold whitespace-nowrap">
                        <span className={isCritical ? "text-red-400 text-sm" : conj.riskLevel === "elevated" ? "text-amber-400" : "text-emerald-400"}>
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
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
