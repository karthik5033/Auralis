"use client";

import React, { useState } from "react";
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
  Radio
} from "lucide-react";
import { CrimeTrendChart } from "@/components/charts/CrimeTrendChart";
import { LiveMap } from "@/components/dashboard/LiveMap";
import { LiveEventFeed } from "@/components/dashboard/LiveEventFeed";
import { EarlyWarningSection } from "@/components/dashboard/EarlyWarningSection";
import { QuickMLBar } from "@/components/dashboard/QuickMLBar";
import { MOCK_DASHBOARD_STATS, MOCK_FIRS } from "@/lib/mockData";
import { downloadDataAsCsv } from "@/lib/utils";
import Link from "next/link";

export default function DashboardPage() {
  const [firs] = useState(MOCK_FIRS);
  const [stats] = useState(MOCK_DASHBOARD_STATS);

  const handleExportCsv = () => {
    downloadDataAsCsv(firs, "auralis-active-conjunctions");
  };

  return (
    <div className="flex-1 space-y-6 p-6 lg:p-8 max-w-7xl mx-auto w-full animate-in fade-in duration-300 font-sans">
      {/* Quick AI Search Copilot Bar */}
      <QuickMLBar />

      {/* Top Metric Cards - Matching PRD Section 3c */}
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
              {stats.activeInvestigations}
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
              {stats.personsOfInterest}
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-xs font-medium text-emerald-500">
              <Radio className="h-3.5 w-3.5" />
              <span>CelesTrak & Space-Track Live</span>
            </div>
          </CardContent>
        </Card>

        {/* High-Risk Alerts */}
        <Card className="shadow-sm hover:shadow transition-shadow border-border/80">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">
              High-Risk Alerts
            </CardTitle>
            <div className="p-2 rounded-lg bg-red-500/10 text-red-500">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold tracking-tight text-red-500 font-mono">
              {stats.highRiskAlerts}
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-xs font-medium text-red-500">
              <span>Pc &gt; 10⁻⁴ critical threshold</span>
            </div>
          </CardContent>
        </Card>

        {/* Maneuvers Resolved */}
        <Card className="shadow-sm hover:shadow transition-shadow border-border/80">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">
              Maneuvers Resolved
            </CardTitle>
            <div className="p-2 rounded-lg bg-muted text-foreground">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold tracking-tight text-foreground font-mono">
              {stats.resolutionRate}
            </div>
            <div className="flex items-center gap-1.5 mt-2 text-xs font-medium text-muted-foreground">
              <span>Autonomous agent yield rate</span>
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

      {/* Orbital Radar Ground Track Map */}
      <Card className="shadow-sm border-border/80">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-bold">Orbital Shell Density & Conjunction Radar</CardTitle>
              <CardDescription className="text-xs">
                Real-time orbital altitude shells and relative velocity intersection tracking.
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

      {/* Active Conjunctions Table */}
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
                  <TableHead className="font-semibold text-xs">Encounter Type</TableHead>
                  <TableHead className="font-semibold text-xs">Orbital Shell & Parameters</TableHead>
                  <TableHead className="font-semibold text-xs">Detection Epoch</TableHead>
                  <TableHead className="font-semibold text-xs">Severity</TableHead>
                  <TableHead className="font-semibold text-xs">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {firs.map((fir) => (
                  <TableRow key={fir.id} className="hover:bg-muted/30 cursor-pointer">
                    <TableCell className="font-mono text-xs font-bold text-primary">
                      {fir.fir_number}
                    </TableCell>
                    <TableCell className="text-xs font-semibold">
                      {fir.crime_type_en}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground font-mono">
                      {fir.station_name} • {fir.location.address}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground whitespace-nowrap font-mono">
                      {fir.date}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={`text-[10px] font-mono font-bold ${
                          fir.severity === 'CRITICAL' ? 'text-red-500 border-red-500/30 bg-red-500/10' :
                          fir.severity === 'HIGH' ? 'text-amber-500 border-amber-500/30 bg-amber-500/10' :
                          'text-zinc-400 border-zinc-700 bg-muted/40'
                        }`}
                      >
                        {fir.severity}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-[10px] font-mono font-semibold">
                        {fir.status_en}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
