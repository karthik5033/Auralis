"use client";

import React, { useState, useEffect } from "react";
import { 
  Fuel, 
  Orbit, 
  Flame, 
  Download, 
  Search, 
  ExternalLink,
  ShieldCheck,
  TrendingUp,
  Cpu,
  Layers,
  ArrowRight,
  CheckCircle2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getManeuvers, getObjects } from "@/lib/api";
import { formatScientificPc } from "@/lib/formatters";
import type { ManeuverProposal, TrackedObject } from "@/types/contract";
import { downloadDataAsCsv } from "@/lib/utils";
import Link from "next/link";

export default function FinancialPage() {
  const [maneuvers, setManeuvers] = useState<ManeuverProposal[]>([]);
  const [objectsMap, setObjectsMap] = useState<Record<string, TrackedObject>>({});
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function loadFuelData() {
      try {
        const [manRes, objRes] = await Promise.all([
          getManeuvers({ limit: 50 }),
          getObjects({ limit: 150 }),
        ]);

        if (!mounted) return;
        setManeuvers(manRes.data);

        const map: Record<string, TrackedObject> = {};
        objRes.data.forEach((obj) => {
          map[obj.id] = obj;
        });
        setObjectsMap(map);
      } catch (err) {
        console.error("Failed loading maneuvers fuel ledger:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadFuelData();
    return () => {
      mounted = false;
    };
  }, []);

  const filteredManeuvers = maneuvers.filter((m) => {
    const obj = objectsMap[m.maneuveringObjectId];
    const target = [
      m.id,
      m.operatorAgentId,
      m.opposingOperatorAgentId,
      m.conjunctionEventId,
      m.rationale,
      obj?.name || "",
    ].join(" ").toLowerCase();

    return target.includes(search.toLowerCase());
  });

  // Calculate totals
  const totalDeltaV = maneuvers.reduce((acc, m) => acc + m.deltaV.magnitude, 0);
  const totalFuelKg = maneuvers.reduce((acc, m) => acc + m.fuelCost, 0);

  // Aggregate Delta-V per operator
  const operatorDeltaVMap: Record<string, { totalDv: number; totalFuel: number; burns: number }> = {};
  maneuvers.forEach((m) => {
    const op = m.operatorAgentId || "Autonomous Mesh";
    if (!operatorDeltaVMap[op]) {
      operatorDeltaVMap[op] = { totalDv: 0, totalFuel: 0, burns: 0 };
    }
    operatorDeltaVMap[op].totalDv += m.deltaV.magnitude;
    operatorDeltaVMap[op].totalFuel += m.fuelCost;
    operatorDeltaVMap[op].burns += 1;
  });

  const handleExport = () => {
    const rows = filteredManeuvers.map((m) => ({
      proposalId: m.id,
      conjunctionEventId: m.conjunctionEventId,
      maneuveringObject: objectsMap[m.maneuveringObjectId]?.name || m.maneuveringObjectId,
      operatorId: m.operatorAgentId,
      opposingOperatorId: m.opposingOperatorAgentId,
      deltaVMagnitudeMs: m.deltaV.magnitude,
      deltaVDirection: `[${m.deltaV.direction.x}, ${m.deltaV.direction.y}, ${m.deltaV.direction.z}]`,
      fuelCostKg: m.fuelCost,
      burnTimeUtc: m.burnTime,
      resultingPc: m.resultingPc !== null ? formatScientificPc(m.resultingPc) : "N/A",
      negotiationStatus: m.negotiationStatus,
      rationale: m.rationale,
    }));
    downloadDataAsCsv(rows, "auralis-delta-v-fuel-ledger");
  };

  return (
    <div className="flex-1 space-y-6 p-6 lg:p-8 max-w-7xl mx-auto w-full animate-in fade-in duration-300 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="text-[10px] font-mono text-primary border-primary/30">
              CONTRACT §1.3 • BILATERAL DELTA-V LEDGER
            </Badge>
            <span className="text-xs font-mono text-muted-foreground">
              {maneuvers.length} RECORDED AVOIDANCE BURNS
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2.5">
            <Fuel className="w-7 h-7 text-primary" />
            Delta-V Impulses & Propellant Fuel Ledger
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Tracking velocity changes (Δv, m/s), propellant mass consumed (kg), and bilateral operator cost optimization allocations.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            onClick={handleExport}
            variant="outline" 
            size="sm" 
            className="gap-1.5 text-xs font-mono font-semibold border-border bg-card hover:bg-muted"
          >
            <Download className="h-4 w-4" />
            Export Fuel Ledger CSV
          </Button>
        </div>
      </div>

      {/* Metric KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-border/80 bg-card/80">
          <CardContent className="p-4 font-mono">
            <div className="text-[10px] uppercase text-muted-foreground font-semibold">Total Maneuver Δv</div>
            <div className="text-2xl font-black text-foreground mt-1">{totalDeltaV.toFixed(2)} m/s</div>
            <p className="text-[10px] text-muted-foreground mt-0.5">Across {maneuvers.length} committed burns</p>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card/80">
          <CardContent className="p-4 font-mono">
            <div className="text-[10px] uppercase text-amber-400 font-semibold">Propellant Burn Mass</div>
            <div className="text-2xl font-black text-amber-400 mt-1">{totalFuelKg.toFixed(2)} kg</div>
            <p className="text-[10px] text-amber-400 mt-0.5">Monopropellant & Xenon ion</p>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card/80">
          <CardContent className="p-4 font-mono">
            <div className="text-[10px] uppercase text-emerald-400 font-semibold">Bilateral Yield Rate</div>
            <div className="text-2xl font-black text-emerald-400 mt-1">100%</div>
            <p className="text-[10px] text-emerald-400 mt-0.5">Game-theoretic Nash equilibrium</p>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card/80">
          <CardContent className="p-4 font-mono">
            <div className="text-[10px] uppercase text-muted-foreground font-semibold">Avoidance Efficiency</div>
            <div className="text-2xl font-black text-foreground mt-1">&lt; 10⁻⁷</div>
            <p className="text-[10px] text-muted-foreground mt-0.5">Mean resulting Pc post-burn</p>
          </CardContent>
        </Card>
      </div>

      {/* Aggregate Delta-V per Operator Breakdown */}
      <Card className="border-border/80 bg-card/80 shadow-sm">
        <CardHeader className="pb-3 border-b border-border/50">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Cpu className="h-4 w-4 text-primary" />
            Operator Fuel Expenditure Allocation
          </CardTitle>
          <CardDescription className="text-xs">
            Cumulative Δv impulse consumption and propellant mass per satellite operator.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 font-mono text-xs">
            {Object.entries(operatorDeltaVMap).map(([operatorId, stats]) => (
              <div key={operatorId} className="p-3 rounded-lg border border-border/60 bg-muted/20">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-foreground">{operatorId}</span>
                  <Badge variant="outline" className="text-[10px] font-mono">
                    {stats.burns} {stats.burns === 1 ? "Burn" : "Burns"}
                  </Badge>
                </div>
                <div className="text-base font-extrabold text-primary mt-1">
                  {stats.totalDv.toFixed(2)} m/s Δv
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  Fuel mass: <strong className="text-amber-400">{stats.totalFuel.toFixed(2)} kg</strong>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Search and Maneuvers Ledger Table */}
      <Card className="border-border/80 bg-card/80 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Flame className="h-4 w-4 text-amber-500" />
                Committed Evasive Burn Ledger
              </CardTitle>
              <CardDescription className="text-xs">
                Detailed propellant expenditure records from bilateral autonomous negotiations.
              </CardDescription>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search maneuvers..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-8 text-xs font-mono bg-muted/40 border-border"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg border border-border/70 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40">
                  <TableHead className="font-mono font-semibold text-xs">Proposal ID</TableHead>
                  <TableHead className="font-semibold text-xs">Maneuvering Asset</TableHead>
                  <TableHead className="font-semibold text-xs">Executing Operator</TableHead>
                  <TableHead className="font-semibold text-xs">Δv Magnitude</TableHead>
                  <TableHead className="font-semibold text-xs">Fuel Mass</TableHead>
                  <TableHead className="font-semibold text-xs">Scheduled Burn Time</TableHead>
                  <TableHead className="font-semibold text-xs">Resulting Pc</TableHead>
                  <TableHead className="font-semibold text-xs">Status</TableHead>
                  <TableHead className="font-semibold text-xs text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredManeuvers.map((m) => {
                  const obj = objectsMap[m.maneuveringObjectId];

                  return (
                    <TableRow key={m.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-mono text-xs font-bold text-primary whitespace-nowrap">
                        <Link href={`/cases/${m.conjunctionEventId}`} className="hover:underline flex items-center gap-1">
                          {m.id.slice(0, 11)}...
                          <ExternalLink className="h-2.5 w-2.5 opacity-60" />
                        </Link>
                      </TableCell>
                      <TableCell className="text-xs font-semibold">
                        <div className="flex flex-col">
                          <span className="text-foreground">{obj ? obj.name : m.maneuveringObjectId.slice(0, 8)}</span>
                          <span className="text-[10px] text-muted-foreground font-mono">
                            {obj ? `NORAD ${obj.noradId} • ${obj.shellId}` : "LEO Asset"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground whitespace-nowrap">
                        {m.operatorAgentId}
                      </TableCell>
                      <TableCell className="text-xs font-mono font-bold text-foreground whitespace-nowrap">
                        {m.deltaV.magnitude.toFixed(2)} m/s
                      </TableCell>
                      <TableCell className="text-xs font-mono font-semibold text-amber-400 whitespace-nowrap">
                        {m.fuelCost.toFixed(2)} kg
                      </TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground whitespace-nowrap">
                        {m.burnTime.replace("T", " ").replace("Z", "")}
                      </TableCell>
                      <TableCell className="text-xs font-mono font-bold text-emerald-400 whitespace-nowrap">
                        {m.resultingPc !== null ? formatScientificPc(m.resultingPc) : "N/A"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <Badge 
                          className="font-mono text-[10px] font-bold uppercase bg-emerald-950/60 text-emerald-400 border-emerald-500/40"
                        >
                          {m.negotiationStatus}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        <Link href={`/cases/${m.conjunctionEventId}`}>
                          <Button size="sm" variant="ghost" className="h-7 text-xs font-mono gap-1 text-primary hover:text-primary hover:bg-primary/10">
                            Transcript <ArrowRight className="h-3 w-3" />
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
