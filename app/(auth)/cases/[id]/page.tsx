"use client";

import React from "react";
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
  Network
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { MOCK_CASES } from "@/lib/mockData";
import Link from "next/link";
import { downloadDataAsCsv } from "@/lib/utils";

export default function CaseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const caseId = params?.id as string;
  
  const caseData = MOCK_CASES.find(c => c.id === caseId) || MOCK_CASES[0];

  return (
    <div className="flex-1 space-y-6 p-6 lg:p-8 max-w-6xl mx-auto w-full animate-in fade-in duration-300 font-sans">
      {/* Top Breadcrumb & Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => router.back()} className="h-8 w-8 border-border bg-card">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-foreground">{caseData.case_no}</span>
              <Badge variant="outline" className="text-[10px] font-mono text-amber-500 border-amber-500/30 bg-amber-500/10 font-semibold">
                {caseData.status.toUpperCase()}
              </Badge>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground mt-0.5">{caseData.title}</h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            onClick={() => downloadDataAsCsv([caseData], `auralis-conjunction-${caseData.case_no}`)}
            variant="outline" 
            size="sm" 
            className="gap-1.5 text-xs border-border bg-card"
          >
            <Download className="h-3.5 w-3.5" />
            Export CDM
          </Button>
          <Link href="/network">
            <Button size="sm" className="gap-1.5 text-xs bg-foreground text-background">
              <Network className="h-3.5 w-3.5" />
              View on Object Graph
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Details & Timeline */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-border bg-card">
            <CardHeader className="pb-3 border-b border-border/60">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Orbit className="h-4 w-4" />
                Orbital Conjunction Telemetry Assessment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-xs pt-4 leading-relaxed">
              <p className="text-foreground/90 bg-muted/40 p-4 rounded-xl border border-border/60">
                {caseData.summary}
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 font-mono">
                <div className="p-3 rounded-lg border border-border bg-card">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">Orbital Shell</span>
                  <span className="font-bold text-foreground mt-0.5 block">{caseData.primary_district}</span>
                </div>
                <div className="p-3 rounded-lg border border-border bg-card">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">Negotiating Agent</span>
                  <span className="font-bold text-foreground mt-0.5 block truncate">{caseData.lead_investigator}</span>
                </div>
                <div className="p-3 rounded-lg border border-border bg-card">
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider block">Detection Date</span>
                  <span className="font-bold text-foreground mt-0.5 block">{caseData.latest_date}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Autonomous Negotiation Timeline */}
          <Card className="border-border bg-card">
            <CardHeader className="pb-3 border-b border-border/60">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Autonomous Maneuver Negotiation Timeline
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground font-mono">
                Cryptographic audit trail of agent delta-v negotiation steps
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="space-y-4 text-xs font-mono">
                <div className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <div className="w-px h-full bg-border my-1" />
                  </div>
                  <div>
                    <div className="font-bold text-foreground">Close Approach Screening Triggered</div>
                    <div className="text-muted-foreground text-[11px]">TCA: {caseData.tca || "2026-09-13T04:18Z"} • Space-Track SGP4 propagation confirmed miss &lt; 100m.</div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <div className="w-px h-full bg-border my-1" />
                  </div>
                  <div>
                    <div className="font-bold text-foreground">Autonomous Agent Yield Protocol Initiated</div>
                    <div className="text-muted-foreground text-[11px]">Evaluating fuel capacity and mission lifespan for {caseData.primary_object}.</div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-2.5 h-2.5 rounded-full bg-foreground" />
                  </div>
                  <div>
                    <div className="font-bold text-foreground">Burn Planned &amp; Cleared with USSPACECOM</div>
                    <div className="text-muted-foreground text-[11px]">Impulse burn: {caseData.delta_v || "0.22 m/s"} scheduled 4 hours before TCA.</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right 1 Col: Astrodynamic Vectors */}
        <div className="space-y-6">
          <Card className="border-border bg-card">
            <CardHeader className="pb-3 border-b border-border/60">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Crosshair className="h-4 w-4" />
                Covariance &amp; Miss Vector
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3 font-mono text-xs">
              <div className="flex justify-between py-1.5 border-b border-border/60">
                <span className="text-muted-foreground">Miss Distance</span>
                <span className="font-bold text-amber-500">{caseData.miss_distance || "48 meters"}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-border/60">
                <span className="text-muted-foreground">Collision Prob (Pc)</span>
                <span className="font-bold text-rose-500">{caseData.collision_probability || "3.8e-4"}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-border/60">
                <span className="text-muted-foreground">Delta-v Requirement</span>
                <span className="font-bold text-foreground">{caseData.delta_v || "0.22 m/s"}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-border/60">
                <span className="text-muted-foreground">Radial Separation</span>
                <span className="font-bold text-foreground">12.4 m</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-border/60">
                <span className="text-muted-foreground">Along-Track Separation</span>
                <span className="font-bold text-foreground">34.8 m</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-muted-foreground">Cross-Track Separation</span>
                <span className="font-bold text-foreground">28.1 m</span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader className="pb-3 border-b border-border/60">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-500" />
                Avoidance Status
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3 text-xs">
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 font-mono font-semibold">
                No secondary conjunctions detected along proposed burn trajectory.
              </div>
              <p className="text-muted-foreground text-[11px] leading-relaxed">
                Post-burn trajectory screening verified across 8,412 cataloged bodies within a 5-day horizon.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
