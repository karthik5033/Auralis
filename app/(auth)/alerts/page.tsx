"use client";

import React, { useState, useEffect } from "react";
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
  Flame
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { getConjunctions, getObjects, getShells } from "@/lib/api";
import { useWebSocket } from "@/components/providers/WebSocketProvider";
import { formatScientificPc, formatCountdown, formatDistance, formatVelocity } from "@/lib/formatters";
import type { ConjunctionEvent, TrackedObject, ShellRiskSnapshot } from "@/types/contract";
import Link from "next/link";
import { downloadDataAsCsv } from "@/lib/utils";

export default function AlertsPage() {
  const [conjunctions, setConjunctions] = useState<ConjunctionEvent[]>([]);
  const [objectsMap, setObjectsMap] = useState<Record<string, TrackedObject>>({});
  const [criticalShells, setCriticalShells] = useState<ShellRiskSnapshot[]>([]);
  const [activeFilter, setActiveFilter] = useState<string>("ALL");
  const [acknowledgedIds, setAcknowledgedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [nowMs, setNowMs] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadAlerts() {
      try {
        const [conjRes, objRes, shellRes] = await Promise.all([
          getConjunctions({ limit: 50 }),
          getObjects({ limit: 150 }),
          getShells(),
        ]);

        if (!mounted) return;

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

        setCriticalShells(shellRes.data.filter((s) => s.r0 >= 1.0));
      } catch (err) {
        console.error("Failed loading alerts:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadAlerts();

    return () => {
      mounted = false;
    };
  }, []);

  // Subscribe to new incoming conjunctions in real-time via unified provider
  useWebSocket("conjunction:created", (newConj) => {
    if (newConj.riskLevel === "critical" || newConj.riskLevel === "elevated") {
      setConjunctions((prev) => {
        const updated = [newConj, ...prev.filter((c) => c.id !== newConj.id)];
        return updated.sort((a, b) => new Date(a.tca).getTime() - new Date(b.tca).getTime());
      });
    }
  });

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

  const displayedAlerts = conjunctions.filter((conj) => {
    if (activeFilter === "CRITICAL") return conj.riskLevel === "critical";
    if (activeFilter === "ELEVATED") return conj.riskLevel === "elevated";
    return true;
  });

  const handleExport = () => {
    const exportRows = displayedAlerts.map((c) => ({
      alertId: c.id,
      severity: c.riskLevel,
      primaryObject: objectsMap[c.primaryObjectId]?.name || c.primaryObjectId,
      secondaryObject: objectsMap[c.secondaryObjectId]?.name || c.secondaryObjectId,
      tcaUtc: c.tca,
      countdown: formatCountdown(c.tca, nowMs),
      missDistanceKm: c.missDistance,
      missDistanceFormatted: formatDistance(c.missDistance),
      collisionProbability: c.collisionProbability,
      pcScientific: formatScientificPc(c.collisionProbability),
      status: acknowledgedIds.has(c.id) ? "Acknowledged" : c.status,
    }));
    downloadDataAsCsv(exportRows, "auralis-active-orbital-alerts");
  };

  return (
    <div className="flex-1 space-y-6 p-6 lg:p-8 max-w-7xl mx-auto w-full animate-in fade-in duration-300 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="text-[10px] font-mono text-red-400 border-red-500/30 bg-red-950/40">
              HIGH PRIORITY SCREENING FEED
            </Badge>
            <span className="text-xs font-mono text-muted-foreground">
              {conjunctions.length} THREAT GEOMETRIES ACTIVE
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2.5">
            <BellRing className="w-7 h-7 text-primary" />
            Orbital Risk Alerts & Collision Warnings
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Predictive screening engine identifying high collision probability conjunctions ($P_c \ge 10^{-4}$) and supercritical Kessler cascade density spikes ($R_0 \ge 1.0$).
          </p>
        </div>
        <div className="flex items-center gap-2">
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

      {/* Metric Telemetry Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border/80 bg-card/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-mono font-semibold text-muted-foreground uppercase">
              Critical Conjunctions ($P_c \ge 10^{-3}$)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-red-400 flex items-center gap-2 font-mono">
              <ShieldAlert className="h-5 w-5 animate-pulse" />
              {conjunctions.filter((c) => c.riskLevel === "critical").length} ACTIVE
            </div>
            <p className="text-xs text-muted-foreground mt-1 font-mono">Emergency autonomous yield protocol active.</p>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-mono font-semibold text-muted-foreground uppercase">
              Cascade Risk Shells ($R_0 \ge 1.0$)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-amber-400 flex items-center gap-2 font-mono">
              <Orbit className="h-5 w-5" />
              {criticalShells.length} SHELLS AT RISK
            </div>
            <p className="text-xs text-muted-foreground mt-1 font-mono">Supercritical fragmentation band.</p>
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
              99.4%
            </div>
            <p className="text-xs text-muted-foreground mt-1 font-mono">CelesTrak ephemerides synchronized.</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-border/80 pb-3">
        {[
          { key: "ALL", label: `ALL RISKS (${conjunctions.length})` },
          { key: "CRITICAL", label: `CRITICAL (${conjunctions.filter((c) => c.riskLevel === "critical").length})` },
          { key: "ELEVATED", label: `ELEVATED (${conjunctions.filter((c) => c.riskLevel === "elevated").length})` },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveFilter(tab.key)}
            className={`px-3 py-1.5 text-xs font-mono font-bold rounded-lg transition-colors cursor-pointer ${
              activeFilter === tab.key
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Alerts Feed */}
      <div className="space-y-3">
        {displayedAlerts.map((alert) => {
          const primary = objectsMap[alert.primaryObjectId];
          const secondary = objectsMap[alert.secondaryObjectId];
          const isAcked = acknowledgedIds.has(alert.id);
          const isCritical = alert.riskLevel === "critical";

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
                        {isAcked && (
                          <Badge variant="secondary" className="font-mono text-[10px]">
                            ACKNOWLEDGED
                          </Badge>
                        )}
                      </div>

                      <h3 className="font-bold text-base text-foreground flex items-center gap-1.5">
                        {primary ? primary.name : "Primary Object"} ⚡ {secondary ? secondary.name : "Secondary Debris"}
                      </h3>

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
                        isCritical ? "bg-red-950/90 text-red-400 border border-red-500/40" : "bg-muted text-foreground border border-border"
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
        })}
      </div>
    </div>
  );
}
