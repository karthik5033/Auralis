"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ArrowRight, Orbit, Flame, ShieldAlert, Radio, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { getConjunctions, getShells, getObjects } from "@/lib/api";
import { useWebSocket } from "@/components/providers/WebSocketProvider";
import { formatScientificPc } from "@/lib/formatters";
import type { ConjunctionEvent, ShellRiskSnapshot, TrackedObject } from "@/types/contract";

export function EarlyWarningSection() {
  const [criticalConjunctions, setCriticalConjunctions] = useState<ConjunctionEvent[]>([]);
  const [criticalShells, setCriticalShells] = useState<ShellRiskSnapshot[]>([]);
  const [objectsMap, setObjectsMap] = useState<Record<string, TrackedObject>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadAlerts() {
      try {
        const [conjRes, shellRes, objRes] = await Promise.all([
          getConjunctions({ riskLevel: "critical", limit: 5 }),
          getShells(),
          getObjects({ limit: 150 }),
        ]);

        if (!mounted) return;

        setCriticalConjunctions(conjRes.data);

        // Filter shells that exceed percolation threshold R0 > 1.0 or are in 'increasing' trend
        const riskyShells = shellRes.data.filter((s) => s.r0 >= 1.0 || s.trend === "increasing");
        setCriticalShells(riskyShells);

        const map: Record<string, TrackedObject> = {};
        objRes.data.forEach((obj) => {
          map[obj.id] = obj;
        });
        setObjectsMap(map);
      } catch (err) {
        console.error("Failed loading early warning alerts:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadAlerts();

    return () => {
      mounted = false;
    };
  }, []);

  // Listen to real-time events from WebSocket via unified provider
  useWebSocket("conjunction:created", (newConj) => {
    if (newConj.riskLevel === "critical") {
      setCriticalConjunctions((prev) => [newConj, ...prev.slice(0, 4)]);
    }
  });

  useWebSocket("crisis:injected", () => {
    // Re-fetch shells when crisis is injected
    getShells().then((res) => {
      setCriticalShells(res.data.filter((s) => s.r0 >= 1.0 || s.trend === "increasing"));
    });
  });

  return (
    <Card className="border-red-500/30 bg-red-950/10 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-red-500/20 text-red-400">
              <ShieldAlert className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                Automated Early Warning & Cascade Alerts
                <Badge variant="outline" className="text-[10px] font-mono text-red-400 border-red-500/30 bg-red-950/50">
                  LIVE TELEMETRY
                </Badge>
              </CardTitle>
              <CardDescription className="text-xs">
                Real-time Foster-1992 covariance collision forecasts & epidemiological SIR cascade warnings predicting runaway events.
              </CardDescription>
            </div>
          </div>
          <Link href="/alerts">
            <Button variant="ghost" size="sm" className="text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-red-950/30">
              View All Alerts <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
        {loading ? (
          <div className="col-span-full grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="h-44 rounded-lg bg-card/60 border border-border/40 animate-pulse flex flex-col justify-between p-4">
              <div className="space-y-2">
                <div className="h-4 w-28 bg-red-500/20 rounded" />
                <div className="h-5 w-48 bg-muted/50 rounded" />
                <div className="h-3 w-36 bg-muted/40 rounded" />
              </div>
              <div className="h-10 bg-muted/40 rounded" />
            </div>
            <div className="h-44 rounded-lg bg-card/60 border border-border/40 animate-pulse flex flex-col justify-between p-4">
              <div className="space-y-2">
                <div className="h-4 w-28 bg-amber-500/20 rounded" />
                <div className="h-5 w-48 bg-muted/50 rounded" />
                <div className="h-3 w-36 bg-muted/40 rounded" />
              </div>
              <div className="h-10 bg-muted/40 rounded" />
            </div>
          </div>
        ) : criticalConjunctions.length === 0 && criticalShells.length === 0 ? (
          <div className="col-span-full p-6 text-center rounded-lg border border-border/40 bg-card/40 flex flex-col items-center justify-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            <span className="font-semibold text-xs text-foreground">Nominal Orbital Space</span>
            <p className="text-[11px] text-muted-foreground max-w-md font-mono">
              All monitored orbital shells remain within subcritical regimes (R₀ &lt; 1.0) and no critical conjunctions (Pc &ge; 10⁻³) are active.
            </p>
          </div>
        ) : (
          <>
            {/* Critical Conjunction Cards */}
            {criticalConjunctions.slice(0, 2).map((conj) => {
              const primary = objectsMap[conj.primaryObjectId];
              const secondary = objectsMap[conj.secondaryObjectId];
              const primaryName = primary
                ? primary.name
                : conj.primaryObjectId.startsWith("norad-")
                ? `NORAD ${conj.primaryObjectId.replace("norad-", "")}`
                : conj.primaryObjectId;
              const secondaryName = secondary
                ? secondary.name
                : conj.secondaryObjectId.startsWith("norad-")
                ? `NORAD ${conj.secondaryObjectId.replace("norad-", "")}`
                : conj.secondaryObjectId;

              return (
                <div
                  key={conj.id}
                  className="p-4 rounded-lg border border-red-500/30 bg-card/90 flex flex-col justify-between shadow-sm relative overflow-hidden group"
                >
                  <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-full blur-2xl pointer-events-none" />
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Badge className="text-[10px] font-bold font-mono bg-red-500/20 text-red-400 border-red-500/40">
                        CRITICAL COLLISION RISK
                      </Badge>
                      <span className="text-[11px] font-mono text-red-300 font-semibold">
                        Pc: {formatScientificPc(conj.collisionProbability)}
                      </span>
                    </div>
                    <h4 className="font-bold text-sm text-foreground mb-1 flex items-center gap-1.5">
                      <Flame className="h-4 w-4 text-red-500" />
                      {primaryName} vs {secondaryName}
                    </h4>
                    <p className="text-xs font-mono text-muted-foreground mb-2">
                      TCA: {conj.tca.replace("T", " ").replace("Z", " UTC")} | Miss: {(conj.missDistance * 1000).toFixed(0)}m
                    </p>
                    <div className="text-xs text-foreground/90 bg-muted/60 p-2.5 rounded border border-border/60 font-mono flex flex-col gap-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-muted-foreground">Rel Velocity: {conj.relativeVelocity.toFixed(2)} km/s</span>
                        <span className="text-amber-400 font-bold uppercase">{conj.status}</span>
                      </div>
                      <div className="text-[11px] text-zinc-300">
                        {conj.maneuverProposalId
                          ? "Bilateral autonomous delta-v negotiation scheduled. Operator burn approval pending."
                          : "SGP4 covariance threshold exceeded. Autonomous evasion geometry synthesized."}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 pt-2 border-t border-border/40 flex items-center justify-between">
                    <span className="text-[10px] font-mono text-muted-foreground">EVENT: {conj.id.slice(0, 16)}...</span>
                    <Link href={`/cases/${conj.id}`}>
                      <Button variant="link" size="sm" className="h-auto p-0 text-xs font-semibold text-primary">
                        Review Geometry <ArrowRight className="ml-1 h-3 w-3" />
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            })}

            {/* Critical Orbital Shell Cascade Cards */}
            {criticalShells.slice(0, 2).map((shell) => (
              <div
                key={shell.shellId}
                className="p-4 rounded-lg border border-amber-500/30 bg-card/90 flex flex-col justify-between shadow-sm relative overflow-hidden group"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Badge className="text-[10px] font-bold font-mono bg-amber-500/20 text-amber-400 border-amber-500/40">
                      KESSLER CASCADE ALERT
                    </Badge>
                    <span className="text-[11px] font-mono text-amber-300 font-semibold">
                      R₀ = {shell.r0.toFixed(2)} &gt; 1.0
                    </span>
                  </div>
                  <h4 className="font-bold text-sm text-foreground mb-1 flex items-center gap-1.5">
                    <Orbit className="h-4 w-4 text-amber-500" />
                    Shell {shell.shellId} ({shell.altitudeMin}–{shell.altitudeMax} km)
                  </h4>
                  <p className="text-xs font-mono text-muted-foreground mb-2">
                    Total Objects: {shell.totalObjectCount.toLocaleString()} | Debris Density: {shell.debrisDensity.toExponential(2)} obj/km³
                  </p>
                  <div className="text-xs text-foreground/90 bg-muted/60 p-2.5 rounded border border-border/60 font-mono flex flex-col gap-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-muted-foreground">Infected / Debris: {shell.infectedCount}</span>
                      <span className="text-amber-400 font-bold uppercase">{shell.trend} risk</span>
                    </div>
                    <div className="text-[11px] text-zinc-300">
                      Percolation threshold exceeded. Critical cascade regime where secondary collisions outpace atmospheric drag decay.
                    </div>
                  </div>
                </div>
                <div className="mt-3 pt-2 border-t border-border/40 flex items-center justify-between">
                  <span className="text-[10px] font-mono text-muted-foreground">BAND: {shell.altitudeMin}–{shell.altitudeMax} KM</span>
                  <Link href="/analytics">
                    <Button variant="link" size="sm" className="h-auto p-0 text-xs font-semibold text-amber-400 hover:text-amber-300">
                      Inspect SIR Curves <ArrowRight className="ml-1 h-3 w-3" />
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </>
        )}
      </CardContent>
    </Card>
  );
}
