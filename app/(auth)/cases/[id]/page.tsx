"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  Crosshair, 
  Clock, 
  Activity, 
  Download, 
  Orbit, 
  ShieldCheck, 
  Radio, 
  AlertTriangle,
  GitBranch,
  Layers,
  Flame,
  CheckCircle2,
  Cpu,
  Check,
  Fuel,
  Network
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { getConjunctionById, getManeuverById } from "@/lib/api";
import { formatScientificPc, formatCountdown, formatDistance, formatVelocity } from "@/lib/formatters";
import type { ConjunctionDetailResponse, ManeuverProposal, NegotiationLogEntry } from "@/types/contract";
import Link from "next/link";
import { downloadDataAsCsv } from "@/lib/utils";

export default function CaseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const caseId = params?.id as string;

  const [detail, setDetail] = useState<ConjunctionDetailResponse | null>(null);
  const [maneuverProposal, setManeuverProposal] = useState<ManeuverProposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [nowMs, setNowMs] = useState(Date.now());
  const [isBurnApproved, setIsBurnApproved] = useState(false);
  const [approvalMessage, setApprovalMessage] = useState<string | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let mounted = true;
    async function loadData() {
      try {
        const res = await getConjunctionById(caseId);
        if (!mounted) return;
        setDetail(res);

        if (res?.conjunction.maneuverProposalId) {
          const m = await getManeuverById(res.conjunction.maneuverProposalId);
          if (mounted && m) {
            setManeuverProposal(m);
            if (m.negotiationStatus === "accepted") {
              setIsBurnApproved(true);
            }
          }
        }
      } catch (err) {
        console.error("Failed loading conjunction detail:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadData();
    return () => {
      mounted = false;
    };
  }, [caseId]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3 text-muted-foreground font-mono text-xs">
          <Activity className="h-6 w-6 animate-spin text-primary" />
          <span>Synchronizing SGP4 covariance and negotiation transcript...</span>
        </div>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="flex-1 p-8 max-w-4xl mx-auto space-y-4">
        <Button variant="outline" size="sm" onClick={() => router.back()} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back to Conjunction Events
        </Button>
        <Card className="border-border">
          <CardContent className="p-8 text-center space-y-2">
            <h2 className="text-lg font-bold">Conjunction Event Not Found</h2>
            <p className="text-xs text-muted-foreground">Event ID: {caseId}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { conjunction, primaryObject, secondaryObject } = detail;
  const isCritical = conjunction.riskLevel === "critical";

  const handleApproveBurn = () => {
    setIsBurnApproved(true);
    setApprovalMessage(
      `Burn execution committed: Delta-V magnitude ${maneuverProposal?.deltaV.magnitude} m/s approved for ${primaryObject.name}. Avoidance telemetry transmitted to flight computer.`
    );
  };

  const handleExportCdm = () => {
    const exportData = [
      {
        conjunctionId: conjunction.id,
        tca: conjunction.tca,
        missDistanceKm: conjunction.missDistance,
        relativeVelocityKmS: conjunction.relativeVelocity,
        collisionProbability: conjunction.collisionProbability,
        riskLevel: conjunction.riskLevel,
        status: isBurnApproved ? "mitigated" : conjunction.status,
        primaryObjectName: primaryObject.name,
        primaryNoradId: primaryObject.noradId,
        primaryAltitudeKm: primaryObject.altitude,
        secondaryObjectName: secondaryObject.name,
        secondaryNoradId: secondaryObject.noradId,
        secondaryAltitudeKm: secondaryObject.altitude,
        maneuverApproved: isBurnApproved,
        burnDeltaVMs: maneuverProposal?.deltaV.magnitude || "N/A",
      },
    ];
    downloadDataAsCsv(exportData, `CDM-${conjunction.id.slice(0, 8)}`);
  };

  return (
    <div className="flex-1 space-y-6 p-6 lg:p-8 max-w-7xl mx-auto w-full animate-in fade-in duration-300 font-sans">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => router.back()} className="h-8 w-8 border-border bg-card">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-foreground">{conjunction.id}</span>
              <Badge 
                variant="outline" 
                className={`text-[10px] font-mono font-bold uppercase ${
                  isCritical 
                    ? "text-red-400 border-red-500/40 bg-red-950/60" 
                    : "text-amber-400 border-amber-500/40 bg-amber-950/60"
                }`}
              >
                {conjunction.riskLevel}
              </Badge>
              <Badge variant="secondary" className="text-[10px] font-mono font-semibold uppercase">
                {isBurnApproved ? "MITIGATED" : conjunction.status}
              </Badge>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground mt-0.5">
              {primaryObject.name} ⚡ {secondaryObject.name}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            onClick={handleExportCdm}
            variant="outline" 
            size="sm" 
            className="gap-1.5 text-xs font-mono border-border bg-card"
          >
            <Download className="h-3.5 w-3.5" />
            Export CDM Message
          </Button>
          <Link href="/network">
            <Button size="sm" variant="outline" className="gap-1.5 text-xs">
              <Network className="h-3.5 w-3.5" />
              Object Graph
            </Button>
          </Link>
        </div>
      </div>

      {/* Burn Approval Banner */}
      {approvalMessage && (
        <div className="p-4 rounded-xl border border-emerald-500/40 bg-emerald-950/20 flex items-start gap-3 animate-in fade-in duration-300">
          <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
          <div className="text-xs font-mono">
            <div className="font-bold text-emerald-300">AUTONOMOUS MANEUVER BURN CONFIRMED</div>
            <p className="text-emerald-400/90 mt-0.5">{approvalMessage}</p>
          </div>
        </div>
      )}

      {/* Overview Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="border-border bg-card/80">
          <CardContent className="p-4 font-mono">
            <div className="text-[10px] uppercase text-muted-foreground font-semibold">TCA Countdown</div>
            <div className="text-lg font-black text-foreground mt-1">
              {formatCountdown(conjunction.tca, nowMs)}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">{conjunction.tca.replace("T", " ").replace("Z", " UTC")}</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card/80">
          <CardContent className="p-4 font-mono">
            <div className="text-[10px] uppercase text-muted-foreground font-semibold">Miss Distance</div>
            <div className={`text-lg font-black mt-1 ${conjunction.missDistance < 0.5 ? "text-red-400" : "text-foreground"}`}>
              {formatDistance(conjunction.missDistance)}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">Vector norm at conjunction</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card/80">
          <CardContent className="p-4 font-mono">
            <div className="text-[10px] uppercase text-muted-foreground font-semibold">Collision Probability</div>
            <div className={`text-lg font-black mt-1 ${isCritical ? "text-red-400" : "text-amber-400"}`}>
              {formatScientificPc(conjunction.collisionProbability)}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">Foster-1992 combined B-plane</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card/80">
          <CardContent className="p-4 font-mono">
            <div className="text-[10px] uppercase text-muted-foreground font-semibold">Relative Velocity</div>
            <div className="text-lg font-black text-foreground mt-1">
              {formatVelocity(conjunction.relativeVelocity)}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">Impact energy ~ hypersonic</p>
          </CardContent>
        </Card>
      </div>

      {/* Objects Orbital Elements Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Primary Object Card */}
        <Card className="border-border/80 bg-card/80 shadow-sm">
          <CardHeader className="pb-3 border-b border-border/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Orbit className="h-4 w-4 text-emerald-400" />
                <CardTitle className="text-sm font-bold">Primary Asset: {primaryObject.name}</CardTitle>
              </div>
              <Badge variant="outline" className="text-[10px] font-mono text-emerald-400 border-emerald-500/30">
                NORAD {primaryObject.noradId}
              </Badge>
            </div>
            <CardDescription className="text-xs">
              Type: {primaryObject.type.toUpperCase()} • Shell: {primaryObject.shellId} • Altitude: {primaryObject.altitude.toFixed(1)} km
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-4 font-mono text-xs">
            {/* Keplerian Elements */}
            <div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-2">
                Keplerian Orbital Elements
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <div className="p-2 rounded bg-muted/40 border border-border/50">
                  <div className="text-[10px] text-muted-foreground">Semi-Major Axis (a)</div>
                  <div className="font-bold text-foreground mt-0.5">{primaryObject.orbitalElements.semiMajorAxis.toFixed(2)} km</div>
                </div>
                <div className="p-2 rounded bg-muted/40 border border-border/50">
                  <div className="text-[10px] text-muted-foreground">Eccentricity (e)</div>
                  <div className="font-bold text-foreground mt-0.5">{primaryObject.orbitalElements.eccentricity.toFixed(6)}</div>
                </div>
                <div className="p-2 rounded bg-muted/40 border border-border/50">
                  <div className="text-[10px] text-muted-foreground">Inclination (i)</div>
                  <div className="font-bold text-foreground mt-0.5">{primaryObject.orbitalElements.inclination.toFixed(4)}°</div>
                </div>
                <div className="p-2 rounded bg-muted/40 border border-border/50">
                  <div className="text-[10px] text-muted-foreground">RAAN (Ω)</div>
                  <div className="font-bold text-foreground mt-0.5">{primaryObject.orbitalElements.raan.toFixed(4)}°</div>
                </div>
                <div className="p-2 rounded bg-muted/40 border border-border/50">
                  <div className="text-[10px] text-muted-foreground">Arg Perigee (ω)</div>
                  <div className="font-bold text-foreground mt-0.5">{primaryObject.orbitalElements.argOfPerigee.toFixed(4)}°</div>
                </div>
                <div className="p-2 rounded bg-muted/40 border border-border/50">
                  <div className="text-[10px] text-muted-foreground">Mean Anomaly (M)</div>
                  <div className="font-bold text-foreground mt-0.5">{primaryObject.orbitalElements.meanAnomaly.toFixed(4)}°</div>
                </div>
              </div>
            </div>

            {/* Position and Velocity Vectors */}
            <div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-2">
                State Vectors (ECI Frame)
              </span>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded bg-muted/40 border border-border/50">
                  <span className="text-[10px] text-muted-foreground block">Position [x, y, z] km</span>
                  <span className="font-semibold text-foreground text-[11px] mt-0.5 block">
                    [{primaryObject.position.x.toFixed(1)}, {primaryObject.position.y.toFixed(1)}, {primaryObject.position.z.toFixed(1)}]
                  </span>
                </div>
                <div className="p-2.5 rounded bg-muted/40 border border-border/50">
                  <span className="text-[10px] text-muted-foreground block">Velocity [vx, vy, vz] km/s</span>
                  <span className="font-semibold text-foreground text-[11px] mt-0.5 block">
                    [{primaryObject.velocity.vx.toFixed(3)}, {primaryObject.velocity.vy.toFixed(3)}, {primaryObject.velocity.vz.toFixed(3)}]
                  </span>
                </div>
              </div>
            </div>

            {/* Covariance Upper Triangle */}
            <div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                Covariance Upper Triangle (km²)
              </span>
              <div className="p-2 rounded bg-muted/30 border border-border/50 text-[11px] text-muted-foreground">
                [{primaryObject.covarianceUpperTriangle.map((v) => v.toExponential(2)).join(", ")}]
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Secondary Object Card */}
        <Card className="border-border/80 bg-card/80 shadow-sm">
          <CardHeader className="pb-3 border-b border-border/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Orbit className="h-4 w-4 text-red-400" />
                <CardTitle className="text-sm font-bold">Secondary Body: {secondaryObject.name}</CardTitle>
              </div>
              <Badge variant="outline" className="text-[10px] font-mono text-red-400 border-red-500/30">
                NORAD {secondaryObject.noradId}
              </Badge>
            </div>
            <CardDescription className="text-xs">
              Type: {secondaryObject.type.toUpperCase()} • Shell: {secondaryObject.shellId} • Altitude: {secondaryObject.altitude.toFixed(1)} km
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-4 font-mono text-xs">
            {/* Keplerian Elements */}
            <div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-2">
                Keplerian Orbital Elements
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <div className="p-2 rounded bg-muted/40 border border-border/50">
                  <div className="text-[10px] text-muted-foreground">Semi-Major Axis (a)</div>
                  <div className="font-bold text-foreground mt-0.5">{secondaryObject.orbitalElements.semiMajorAxis.toFixed(2)} km</div>
                </div>
                <div className="p-2 rounded bg-muted/40 border border-border/50">
                  <div className="text-[10px] text-muted-foreground">Eccentricity (e)</div>
                  <div className="font-bold text-foreground mt-0.5">{secondaryObject.orbitalElements.eccentricity.toFixed(6)}</div>
                </div>
                <div className="p-2 rounded bg-muted/40 border border-border/50">
                  <div className="text-[10px] text-muted-foreground">Inclination (i)</div>
                  <div className="font-bold text-foreground mt-0.5">{secondaryObject.orbitalElements.inclination.toFixed(4)}°</div>
                </div>
                <div className="p-2 rounded bg-muted/40 border border-border/50">
                  <div className="text-[10px] text-muted-foreground">RAAN (Ω)</div>
                  <div className="font-bold text-foreground mt-0.5">{secondaryObject.orbitalElements.raan.toFixed(4)}°</div>
                </div>
                <div className="p-2 rounded bg-muted/40 border border-border/50">
                  <div className="text-[10px] text-muted-foreground">Arg Perigee (ω)</div>
                  <div className="font-bold text-foreground mt-0.5">{secondaryObject.orbitalElements.argOfPerigee.toFixed(4)}°</div>
                </div>
                <div className="p-2 rounded bg-muted/40 border border-border/50">
                  <div className="text-[10px] text-muted-foreground">Mean Anomaly (M)</div>
                  <div className="font-bold text-foreground mt-0.5">{secondaryObject.orbitalElements.meanAnomaly.toFixed(4)}°</div>
                </div>
              </div>
            </div>

            {/* Position and Velocity Vectors */}
            <div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-2">
                State Vectors (ECI Frame)
              </span>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded bg-muted/40 border border-border/50">
                  <span className="text-[10px] text-muted-foreground block">Position [x, y, z] km</span>
                  <span className="font-semibold text-foreground text-[11px] mt-0.5 block">
                    [{secondaryObject.position.x.toFixed(1)}, {secondaryObject.position.y.toFixed(1)}, {secondaryObject.position.z.toFixed(1)}]
                  </span>
                </div>
                <div className="p-2.5 rounded bg-muted/40 border border-border/50">
                  <span className="text-[10px] text-muted-foreground block">Velocity [vx, vy, vz] km/s</span>
                  <span className="font-semibold text-foreground text-[11px] mt-0.5 block">
                    [{secondaryObject.velocity.vx.toFixed(3)}, {secondaryObject.velocity.vy.toFixed(3)}, {secondaryObject.velocity.vz.toFixed(3)}]
                  </span>
                </div>
              </div>
            </div>

            {/* Covariance Upper Triangle */}
            <div>
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                Covariance Upper Triangle (km²)
              </span>
              <div className="p-2 rounded bg-muted/30 border border-border/50 text-[11px] text-muted-foreground">
                [{secondaryObject.covarianceUpperTriangle.map((v) => v.toExponential(2)).join(", ")}]
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Maneuver Proposal & Autonomous Negotiation Transcript */}
      {maneuverProposal && (
        <div className="space-y-4">
          <Card className="border-border/80 bg-card/80 shadow-sm">
            <CardHeader className="pb-3 border-b border-border/60">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Flame className="h-5 w-5 text-amber-500 animate-pulse" />
                  <div>
                    <CardTitle className="text-base font-bold">
                      Autonomous Delta-V Maneuver Proposal
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Contract §1.3 Proposal ID: {maneuverProposal.id}
                    </CardDescription>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Badge 
                    className={`font-mono text-xs font-bold uppercase ${
                      isBurnApproved 
                        ? "bg-emerald-950/80 text-emerald-400 border-emerald-500" 
                        : "bg-amber-950/80 text-amber-400 border-amber-500"
                    }`}
                  >
                    {isBurnApproved ? "BURN COMMITTED" : maneuverProposal.negotiationStatus.toUpperCase()}
                  </Badge>
                  
                  {!isBurnApproved && (
                    <Button 
                      onClick={handleApproveBurn} 
                      size="sm" 
                      className="gap-1.5 font-mono text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm cursor-pointer"
                    >
                      <Check className="h-4 w-4" />
                      Approve Burn
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-4 font-mono text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-lg border border-border/60 bg-muted/30">
                  <span className="text-[10px] text-muted-foreground uppercase block">Δv Magnitude</span>
                  <span className="text-base font-bold text-foreground mt-0.5 block">
                    {maneuverProposal.deltaV.magnitude} m/s
                  </span>
                </div>
                <div className="p-3 rounded-lg border border-border/60 bg-muted/30">
                  <span className="text-[10px] text-muted-foreground uppercase block">Fuel Cost</span>
                  <span className="text-base font-bold text-foreground mt-0.5 block flex items-center gap-1">
                    <Fuel className="h-3.5 w-3.5 text-amber-500" />
                    {maneuverProposal.fuelCost} kg
                  </span>
                </div>
                <div className="p-3 rounded-lg border border-border/60 bg-muted/30">
                  <span className="text-[10px] text-muted-foreground uppercase block">Scheduled Burn Time</span>
                  <span className="text-xs font-bold text-foreground mt-0.5 block truncate">
                    {maneuverProposal.burnTime.replace("T", " ").replace("Z", "")}
                  </span>
                </div>
                <div className="p-3 rounded-lg border border-border/60 bg-muted/30">
                  <span className="text-[10px] text-muted-foreground uppercase block">Resulting Pc</span>
                  <span className="text-base font-bold text-emerald-400 mt-0.5 block">
                    {maneuverProposal.resultingPc !== null
                      ? formatScientificPc(maneuverProposal.resultingPc)
                      : "TBD (Negotiating)"}
                  </span>
                </div>
              </div>

              <div className="p-3.5 rounded-lg border border-border/60 bg-muted/20">
                <span className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">
                  Negotiation Rationale & Game Theoretic Tradeoff
                </span>
                <p className="text-foreground/90 font-sans leading-relaxed text-xs">
                  {maneuverProposal.rationale}
                </p>
              </div>

              {/* Negotiation Log Transcript */}
              <div>
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-2">
                  Bilateral Operator Negotiation Log (Contract §1.4)
                </span>
                <div className="space-y-2 border border-border/60 rounded-lg p-3 bg-muted/10">
                  {maneuverProposal.negotiationLog.map((log: NegotiationLogEntry, idx: number) => (
                    <div 
                      key={idx} 
                      className="p-2.5 rounded border border-border/40 bg-card/60 flex items-start justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px] font-mono font-bold text-primary">
                            {log.action}
                          </Badge>
                          <span className="text-[11px] font-bold text-foreground">{log.agentId}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-xs text-foreground/80 font-sans">{log.message}</p>
                      </div>
                      {log.deltaVBid !== null && (
                        <div className="shrink-0 text-right">
                          <span className="text-[10px] text-muted-foreground block">BID Δv</span>
                          <span className="text-xs font-bold text-foreground font-mono">{log.deltaVBid} m/s</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
