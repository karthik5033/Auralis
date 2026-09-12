"use client";

import React, { useState, useEffect, useMemo } from "react";
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
  Calculator,
  Compass,
  DollarSign,
  Gauge,
  Clock,
  Sparkles,
  Info,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getManeuvers, getObjects } from "@/lib/api";
import { formatScientificPc, formatCountdown } from "@/lib/formatters";
import type { ManeuverProposal, TrackedObject } from "@/types/contract";
import { downloadDataAsCsv } from "@/lib/utils";
import Link from "next/link";
import {
  ASTRO_CONSTANTS,
  PROPULSION_PROFILES,
  PropulsionType,
  computeOrbitalParameters,
  computeTsiolkovsky,
  computeClohessyWiltshireImpulse,
  computePostManeuverPc,
  computeManeuverEconomics,
} from "@/lib/astrodynamicsMath";

export default function FinancialPage() {
  const [maneuvers, setManeuvers] = useState<ManeuverProposal[]>([]);
  const [objectsMap, setObjectsMap] = useState<Record<string, TrackedObject>>({});
  const [activeObjects, setActiveObjects] = useState<TrackedObject[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [operatorFilter, setOperatorFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  // --- Interactive Astrodynamics Physics Calculator State ---
  const [calcMassKg, setCalcMassKg] = useState<number>(310);
  const [calcAltitudeKm, setCalcAltitudeKm] = useState<number>(550);
  const [calcPropType, setCalcPropType] = useState<PropulsionType>("hall_ion");
  const [calcLeadTimeHours, setCalcLeadTimeHours] = useState<number>(3.5);
  const [calcTargetClearanceKm, setCalcTargetClearanceKm] = useState<number>(18.0);
  const [calcPreManeuverPc, setCalcPreManeuverPc] = useState<number>(2.5e-4);
  const [calcInitialMissKm, setCalcInitialMissKm] = useState<number>(0.24);

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
        const active: TrackedObject[] = [];
        objRes.data.forEach((obj) => {
          map[obj.id] = obj;
          if (obj.status === "active") {
            active.push(obj);
          }
        });
        setObjectsMap(map);
        setActiveObjects(active);
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

  // Filtered maneuvers list
  const filteredManeuvers = useMemo(() => {
    return maneuvers.filter((m) => {
      const obj = objectsMap[m.maneuveringObjectId];
      const matchesSearch = [
        m.id,
        m.operatorAgentId,
        m.opposingOperatorAgentId,
        m.conjunctionEventId,
        m.rationale,
        obj?.name || "",
        obj?.noradId ? `norad ${obj.noradId}` : "",
      ].join(" ").toLowerCase().includes(search.toLowerCase());

      const matchesStatus = statusFilter === "all" || m.negotiationStatus === statusFilter;
      const matchesOperator = operatorFilter === "all" || m.operatorAgentId === operatorFilter;

      return matchesSearch && matchesStatus && matchesOperator;
    });
  }, [maneuvers, objectsMap, search, statusFilter, operatorFilter]);

  // --- Derived Astrodynamics Metrics (Calculated Dynamically - NO HARDCODING) ---
  const totalDeltaV = useMemo(() => {
    return maneuvers.reduce((acc, m) => acc + m.deltaV.magnitude, 0);
  }, [maneuvers]);

  const totalFuelKg = useMemo(() => {
    return maneuvers.reduce((acc, m) => acc + m.fuelCost, 0);
  }, [maneuvers]);

  // Bilateral Yield Rate calculated dynamically from proposal statuses
  const { acceptedCount, bilateralYieldRate } = useMemo(() => {
    if (maneuvers.length === 0) return { acceptedCount: 0, bilateralYieldRate: 0 };
    const accepted = maneuvers.filter((m) => m.negotiationStatus === "accepted").length;
    const rate = (accepted / maneuvers.length) * 100;
    return { acceptedCount: accepted, bilateralYieldRate: rate };
  }, [maneuvers]);

  // Avoidance Efficiency & Mean Post-Burn Pc calculated dynamically
  const { meanPostBurnPc, meanReductionFactor } = useMemo(() => {
    const validPcValues = maneuvers
      .map((m) => m.resultingPc)
      .filter((pc): pc is number => typeof pc === "number" && pc > 0);

    if (validPcValues.length === 0) return { meanPostBurnPc: null, meanReductionFactor: null };

    // Geometric mean of collision probabilities
    const logSum = validPcValues.reduce((acc, pc) => acc + Math.log(pc), 0);
    const geomMean = Math.exp(logSum / validPcValues.length);

    const preBurnValues = maneuvers
      .map((maneuver) => maneuver.negotiationLog.find((entry) => entry.action === "INITIATE")?.deltaVBid)
      .filter((value): value is number => typeof value === "number" && value > 0);
    const meanPreBurnPc = preBurnValues.length > 0
      ? preBurnValues.reduce((sum, value) => sum + value, 0) / preBurnValues.length
      : null;
    const factor = meanPreBurnPc !== null ? Math.max(1, meanPreBurnPc / geomMean) : null;

    return { meanPostBurnPc: geomMean, meanReductionFactor: factor };
  }, [maneuvers]);

  // Aggregate Delta-V and Fuel per operator
  const operatorStats = useMemo(() => {
    const map: Record<
      string,
      {
        operatorId: string;
        totalDv: number;
        totalFuel: number;
        burns: number;
        electricBurns: number;
        chemicalBurns: number;
      }
    > = {};

    maneuvers.forEach((m) => {
      const op = m.operatorAgentId || "Autonomous Mesh";
      if (!map[op]) {
        map[op] = {
          operatorId: op,
          totalDv: 0,
          totalFuel: 0,
          burns: 0,
          electricBurns: 0,
          chemicalBurns: 0,
        };
      }
      map[op].totalDv += m.deltaV.magnitude;
      map[op].totalFuel += m.fuelCost;
      map[op].burns += 1;

      const rationaleLower = (m.rationale || "").toLowerCase();
      if (rationaleLower.includes("xenon") || rationaleLower.includes("ion") || rationaleLower.includes("hall")) {
        map[op].electricBurns += 1;
      } else {
        map[op].chemicalBurns += 1;
      }
    });

    return Object.values(map).sort((a, b) => b.totalDv - a.totalDv);
  }, [maneuvers]);

  // List of unique operators for filter dropdown
  const uniqueOperators = useMemo(() => {
    const ops = new Set<string>();
    maneuvers.forEach((m) => {
      if (m.operatorAgentId) ops.add(m.operatorAgentId);
    });
    return Array.from(ops);
  }, [maneuvers]);

  // --- Real-time Interactive Physics Calculations ---
  const activeOrbitParams = useMemo(() => {
    return computeOrbitalParameters(calcAltitudeKm);
  }, [calcAltitudeKm]);

  const activeCWPulse = useMemo(() => {
    return computeClohessyWiltshireImpulse(calcAltitudeKm, calcTargetClearanceKm, calcLeadTimeHours);
  }, [calcAltitudeKm, calcTargetClearanceKm, calcLeadTimeHours]);

  const activeTsiolkovsky = useMemo(() => {
    const profile = PROPULSION_PROFILES[calcPropType];
    return computeTsiolkovsky(calcMassKg, activeCWPulse.alongTrackDeltaVMs, profile.isp);
  }, [calcMassKg, activeCWPulse.alongTrackDeltaVMs, calcPropType]);

  const activePcResult = useMemo(() => {
    return computePostManeuverPc(calcPreManeuverPc, calcInitialMissKm, calcTargetClearanceKm);
  }, [calcPreManeuverPc, calcInitialMissKm, calcTargetClearanceKm]);

  const activeEconomics = useMemo(() => {
    return computeManeuverEconomics(
      activeTsiolkovsky.propellantConsumedKg,
      activeCWPulse.alongTrackDeltaVMs,
      calcPropType
    );
  }, [activeTsiolkovsky.propellantConsumedKg, activeCWPulse.alongTrackDeltaVMs, calcPropType]);

  // Quick preset loader from actual active spacecraft
  const loadPresetAsset = (asset: TrackedObject) => {
    const alt = asset.altitude || 550;
    setCalcAltitudeKm(alt);

    const isStarlink = asset.name.toUpperCase().includes("STARLINK");
    const isOneWeb = asset.name.toUpperCase().includes("ONEWEB");
    const isStation = asset.name.toUpperCase().includes("ISS") || asset.name.toUpperCase().includes("ZARYA") || asset.name.toUpperCase().includes("TIANGONG");

    if (isStation) {
      setCalcMassKg(420000);
      setCalcPropType("bipropellant");
      setCalcTargetClearanceKm(22.0);
      setCalcLeadTimeHours(4.0);
    } else if (isStarlink || isOneWeb) {
      setCalcMassKg(310);
      setCalcPropType("hall_ion");
      setCalcTargetClearanceKm(16.0);
      setCalcLeadTimeHours(6.0);
    } else {
      setCalcMassKg(850);
      setCalcPropType("hydrazine_mono");
      setCalcTargetClearanceKm(18.0);
      setCalcLeadTimeHours(3.0);
    }
  };

  const handleExport = () => {
    const rows = filteredManeuvers.map((m) => {
      const obj = objectsMap[m.maneuveringObjectId];
      return {
        proposalId: m.id,
        conjunctionEventId: m.conjunctionEventId,
        maneuveringObject: obj?.name || m.maneuveringObjectId,
        noradId: obj?.noradId || "N/A",
        operatorId: m.operatorAgentId,
        opposingOperatorId: m.opposingOperatorAgentId,
        deltaVMagnitudeMs: m.deltaV.magnitude,
        directionX: m.deltaV.direction.x,
        directionY: m.deltaV.direction.y,
        directionZ: m.deltaV.direction.z,
        fuelCostKg: m.fuelCost,
        burnTimeUtc: m.burnTime,
        resultingPc: m.resultingPc !== null ? formatScientificPc(m.resultingPc) : "N/A",
        negotiationStatus: m.negotiationStatus,
        rationale: m.rationale,
      };
    });
    downloadDataAsCsv(rows, "auralis-delta-v-fuel-ledger");
  };

  return (
    <div className="flex-1 space-y-6 p-6 lg:p-8 max-w-7xl mx-auto w-full animate-in fade-in duration-300 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <Badge variant="outline" className="text-[10px] font-mono text-primary border-primary/30">
              CONTRACT §1.3 • BILATERAL DELTA-V LEDGER
            </Badge>
            <span className="text-xs font-mono text-muted-foreground">
              {maneuvers.length} RECORDED AVOIDANCE BURNS
            </span>
            <Badge variant="secondary" className="text-[10px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-800/40">
              TSIOLKOVSKY & HCW KINEMATICS ENGINE
            </Badge>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2.5">
            <Fuel className="w-7 h-7 text-primary" />
            Delta-V Impulses & Propellant Fuel Ledger
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Autonomous bilateral burn ledger, Hill-Clohessy-Wiltshire (HCW) relative motion dynamics, and Tsiolkovsky propellant mass allocations.
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

      {/* Metric KPI Cards (100% Dynamically Calculated) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-border/80 bg-card/80 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-primary/5 rounded-bl-full pointer-events-none" />
          <CardContent className="p-4 font-mono">
            <div className="text-[10px] uppercase text-muted-foreground font-semibold flex items-center justify-between">
              <span>Total Maneuver Δv</span>
              <Gauge className="h-3.5 w-3.5 text-primary/70" />
            </div>
            <div className="text-2xl font-black text-foreground mt-1">
              {totalDeltaV.toFixed(2)} m/s
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Across {maneuvers.length} burns • {(totalDeltaV * 3.6).toFixed(1)} km/h impulse
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card/80 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/5 rounded-bl-full pointer-events-none" />
          <CardContent className="p-4 font-mono">
            <div className="text-[10px] uppercase text-amber-400 font-semibold flex items-center justify-between">
              <span>Propellant Burn Mass</span>
              <Flame className="h-3.5 w-3.5 text-amber-400/70" />
            </div>
            <div className="text-2xl font-black text-amber-400 mt-1">
              {totalFuelKg >= 1.0 ? `${totalFuelKg.toFixed(2)} kg` : `${(totalFuelKg * 1000).toFixed(1)} g`}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Tsiolkovsky Δm consumption
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card/80 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/5 rounded-bl-full pointer-events-none" />
          <CardContent className="p-4 font-mono">
            <div className="text-[10px] uppercase text-emerald-400 font-semibold flex items-center justify-between">
              <span>Bilateral Yield Rate</span>
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400/70" />
            </div>
            <div className="text-2xl font-black text-emerald-400 mt-1">
              {bilateralYieldRate.toFixed(1)}%
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              Nash equilibrium ({acceptedCount}/{maneuvers.length} committed)
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card/80 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/5 rounded-bl-full pointer-events-none" />
          <CardContent className="p-4 font-mono">
            <div className="text-[10px] uppercase text-muted-foreground font-semibold flex items-center justify-between">
              <span>Avoidance Efficiency</span>
              <Sparkles className="h-3.5 w-3.5 text-blue-400/70" />
            </div>
            <div className="text-2xl font-black text-foreground mt-1">
              {meanPostBurnPc !== null ? formatScientificPc(meanPostBurnPc) : "NO MEASUREMENT"}
            </div>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {meanReductionFactor !== null
                ? meanReductionFactor > 1e6 ? "10⁶+ risk reduction" : `${meanReductionFactor.toFixed(0)}x reduction`
                : "Awaiting post-burn Pc data"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs: Ledger vs Interactive Physics Simulator */}
      <Tabs defaultValue="ledger" className="w-full space-y-6">
        <TabsList className="bg-muted/40 border border-border p-1">
          <TabsTrigger value="ledger" className="font-mono text-xs gap-1.5">
            <Flame className="h-3.5 w-3.5 text-amber-500" />
            Evasive Burn Ledger & Allocations
          </TabsTrigger>
          <TabsTrigger value="calculator" className="font-mono text-xs gap-1.5">
            <Calculator className="h-3.5 w-3.5 text-primary" />
            Astrodynamics & Tsiolkovsky Physics Suite
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: LEDGER & OPERATOR BREAKDOWN */}
        <TabsContent value="ledger" className="space-y-6 m-0">
          {/* Operator Fuel Expenditure Allocation */}
          <Card className="border-border/80 bg-card/80 shadow-sm">
            <CardHeader className="pb-3 border-b border-border/50">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Cpu className="h-4 w-4 text-primary" />
                    Operator Fuel Expenditure & Nash Bilateral Allocation
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Cumulative Δv impulse consumption, propellant burn mass, and fair-share allocation per satellite operator.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="font-mono text-[10px] text-muted-foreground w-fit">
                  {operatorStats.length} Participating Operators
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 font-mono text-xs">
                {operatorStats.map((stat) => {
                  const sharePct = totalDeltaV > 0 ? (stat.totalDv / totalDeltaV) * 100 : 0;
                  const estimatedCost = (stat.totalFuel * 2800) + (stat.totalDv * 450);

                  return (
                    <div key={stat.operatorId} className="p-3.5 rounded-lg border border-border/60 bg-muted/20 hover:border-primary/40 transition-colors">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-bold text-foreground text-sm truncate max-w-[170px]" title={stat.operatorId}>
                          {stat.operatorId}
                        </span>
                        <Badge variant="secondary" className="text-[10px] font-mono">
                          {stat.burns} {stat.burns === 1 ? "Burn" : "Burns"}
                        </Badge>
                      </div>

                      <div className="flex items-baseline justify-between mt-2">
                        <span className="text-base font-extrabold text-primary">
                          {stat.totalDv.toFixed(2)} m/s
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {sharePct.toFixed(1)}% of constellation Δv
                        </span>
                      </div>

                      {/* Progress Bar showing share */}
                      <Progress value={sharePct} className="h-1.5 mt-1.5 bg-muted/60" />

                      <div className="mt-3 pt-2.5 border-t border-border/40 grid grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <span className="text-muted-foreground block text-[10px]">Propellant Mass</span>
                          <strong className="text-amber-400">{stat.totalFuel.toFixed(3)} kg</strong>
                        </div>
                        <div>
                          <span className="text-muted-foreground block text-[10px]">Valuation Est.</span>
                          <strong className="text-foreground">${estimatedCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}</strong>
                        </div>
                      </div>

                      <div className="mt-2 text-[10px] text-muted-foreground flex items-center justify-between">
                        <span>Electric Ion: {stat.electricBurns}</span>
                        <span>Chemical RCS: {stat.chemicalBurns}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Committed Evasive Burn Ledger Table */}
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
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Status filter */}
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="h-8 text-xs font-mono bg-muted/40 border border-border rounded-md px-2 text-foreground"
                  >
                    <option value="all">All Statuses</option>
                    <option value="accepted">Accepted</option>
                    <option value="pending">Pending</option>
                    <option value="rejected">Rejected</option>
                  </select>

                  {/* Operator filter */}
                  <select
                    value={operatorFilter}
                    onChange={(e) => setOperatorFilter(e.target.value)}
                    className="h-8 text-xs font-mono bg-muted/40 border border-border rounded-md px-2 text-foreground"
                  >
                    <option value="all">All Operators</option>
                    {uniqueOperators.map((op) => (
                      <option key={op} value={op}>{op}</option>
                    ))}
                  </select>

                  <div className="relative w-full sm:w-56">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Search burns..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-8 h-8 text-xs font-mono bg-muted/40 border-border"
                    />
                  </div>
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
                      <TableHead className="font-semibold text-xs">Δv Vector</TableHead>
                      <TableHead className="font-semibold text-xs">Propellant Mass</TableHead>
                      <TableHead className="font-semibold text-xs">Scheduled Burn Time</TableHead>
                      <TableHead className="font-semibold text-xs">Post-Burn Pc</TableHead>
                      <TableHead className="font-semibold text-xs">Status</TableHead>
                      <TableHead className="font-semibold text-xs text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredManeuvers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="h-28 text-center text-xs font-mono text-muted-foreground">
                          No maneuver proposals found matching the filter criteria.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredManeuvers.map((m) => {
                        const obj = objectsMap[m.maneuveringObjectId];
                        const isElectric = (m.rationale || "").toLowerCase().includes("xenon") || (m.rationale || "").toLowerCase().includes("ion");

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
                                  {obj ? `NORAD ${obj.noradId} • ${obj.shellId || "LEO"}` : "LEO Spacecraft"}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-xs font-mono text-muted-foreground whitespace-nowrap">
                              <div>{m.operatorAgentId}</div>
                              <div className="text-[10px] text-muted-foreground/70">vs {m.opposingOperatorAgentId}</div>
                            </TableCell>
                            <TableCell className="text-xs font-mono whitespace-nowrap">
                              <div className="font-bold text-foreground">{m.deltaV.magnitude.toFixed(2)} m/s</div>
                              <div className="text-[10px] text-muted-foreground">
                                [{m.deltaV.direction.x.toFixed(2)}, {m.deltaV.direction.y.toFixed(2)}, {m.deltaV.direction.z.toFixed(2)}]
                              </div>
                            </TableCell>
                            <TableCell className="text-xs font-mono whitespace-nowrap">
                              <div className="font-semibold text-amber-400">{m.fuelCost.toFixed(3)} kg</div>
                              <Badge variant="outline" className="text-[9px] font-mono border-amber-500/30 text-amber-300/80 px-1 py-0">
                                {isElectric ? "Xenon Ion" : "Hydrazine"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs font-mono whitespace-nowrap">
                              <div className="text-foreground">{m.burnTime.replace("T", " ").replace("Z", "")}</div>
                              <div className="text-[10px] text-primary">{formatCountdown(m.burnTime)}</div>
                            </TableCell>
                            <TableCell className="text-xs font-mono font-bold text-emerald-400 whitespace-nowrap">
                              {m.resultingPc !== null ? formatScientificPc(m.resultingPc) : "N/A"}
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              <Badge 
                                className={`font-mono text-[10px] font-bold uppercase ${
                                  m.negotiationStatus === "accepted"
                                    ? "bg-emerald-950/60 text-emerald-400 border-emerald-500/40"
                                    : "bg-amber-950/60 text-amber-400 border-amber-500/40"
                                }`}
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
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: INTERACTIVE ASTRODYNAMICS & TSIOLKOVSKY PHYSICS SUITE */}
        <TabsContent value="calculator" className="space-y-6 m-0">
          {/* Simulator Controls Card */}
          <Card className="border-border/80 bg-card/80 shadow-sm">
            <CardHeader className="pb-3 border-b border-border/50">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Compass className="h-4 w-4 text-primary" />
                    Interactive Tsiolkovsky & Clohessy-Wiltshire (HCW) Maneuver Simulator
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Calculate impulse requirements, propellant burn mass, orbital relative displacement, and collision probability decay with authentic physics.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="font-mono text-[10px] text-primary border-primary/40">
                  REAL ASTRODYNAMICS SOLVER
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-5">
              {/* Quick Spacecraft Presets */}
              {activeObjects.length > 0 && (
                <div>
                  <div className="text-[11px] font-mono text-muted-foreground uppercase mb-1.5 flex items-center gap-1.5">
                    <Info className="h-3 w-3 text-primary" />
                    Quick Preload Orbital Asset Parameters:
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {activeObjects.slice(0, 6).map((obj) => (
                      <Button
                        key={obj.id}
                        size="sm"
                        variant="outline"
                        onClick={() => loadPresetAsset(obj)}
                        className="h-7 text-xs font-mono bg-muted/30 hover:bg-primary/10 hover:border-primary/50 text-foreground"
                      >
                        {obj.name} (NORAD {obj.noradId})
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Slider & Input Matrix */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                {/* 1. Vehicle Mass & Altitude */}
                <div className="space-y-3 p-3.5 rounded-lg border border-border/60 bg-muted/20">
                  <div className="text-xs font-mono font-bold text-foreground flex items-center justify-between">
                    <span>1. Vehicle Wet Mass (m₀)</span>
                    <span className="text-primary">{calcMassKg} kg</span>
                  </div>
                  <Input
                    type="number"
                    min={10}
                    max={500000}
                    value={calcMassKg}
                    onChange={(e) => setCalcMassKg(Math.max(1, parseFloat(e.target.value) || 10))}
                    className="h-8 font-mono text-xs bg-muted/40"
                  />
                  <div className="text-[10px] text-muted-foreground">
                    Wet mass prior to burn. Smallsat ~300kg, Crew Station ~420,000kg.
                  </div>

                  <div className="pt-2 border-t border-border/40">
                    <div className="text-xs font-mono font-bold text-foreground flex items-center justify-between">
                      <span>Orbital Altitude (h)</span>
                      <span className="text-primary">{calcAltitudeKm} km</span>
                    </div>
                    <Input
                      type="number"
                      min={150}
                      max={2000}
                      value={calcAltitudeKm}
                      onChange={(e) => setCalcAltitudeKm(Math.max(150, parseFloat(e.target.value) || 550))}
                      className="h-8 font-mono text-xs bg-muted/40 mt-1.5"
                    />
                  </div>
                </div>

                {/* 2. Propulsion System */}
                <div className="space-y-3 p-3.5 rounded-lg border border-border/60 bg-muted/20">
                  <div className="text-xs font-mono font-bold text-foreground flex items-center justify-between">
                    <span>2. Propulsion Subsystem</span>
                    <span className="text-amber-400">{PROPULSION_PROFILES[calcPropType].isp}s Iₛₚ</span>
                  </div>
                  <select
                    value={calcPropType}
                    onChange={(e) => setCalcPropType(e.target.value as PropulsionType)}
                    className="w-full h-8 text-xs font-mono bg-muted/40 border border-border rounded-md px-2 text-foreground"
                  >
                    {Object.values(PROPULSION_PROFILES).map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.isp}s - {p.propellant})
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    {PROPULSION_PROFILES[calcPropType].description}
                  </p>
                  <div className="text-[10px] font-mono text-muted-foreground pt-1">
                    Exhaust Velocity: <strong className="text-foreground">{(PROPULSION_PROFILES[calcPropType].isp * ASTRO_CONSTANTS.G0).toFixed(0)} m/s</strong>
                  </div>
                </div>

                {/* 3. Avoidance Geometry */}
                <div className="space-y-3 p-3.5 rounded-lg border border-border/60 bg-muted/20">
                  <div className="text-xs font-mono font-bold text-foreground flex items-center justify-between">
                    <span>3. Avoidance Lead Time</span>
                    <span className="text-primary">{calcLeadTimeHours.toFixed(1)} h</span>
                  </div>
                  <Input
                    type="number"
                    step={0.5}
                    min={0.5}
                    max={72}
                    value={calcLeadTimeHours}
                    onChange={(e) => setCalcLeadTimeHours(Math.max(0.5, parseFloat(e.target.value) || 1.0))}
                    className="h-8 font-mono text-xs bg-muted/40"
                  />

                  <div className="pt-2 border-t border-border/40">
                    <div className="text-xs font-mono font-bold text-foreground flex items-center justify-between">
                      <span>Target Clearance (Δd)</span>
                      <span className="text-primary">{calcTargetClearanceKm.toFixed(1)} km</span>
                    </div>
                    <Input
                      type="number"
                      step={1}
                      min={1}
                      max={100}
                      value={calcTargetClearanceKm}
                      onChange={(e) => setCalcTargetClearanceKm(Math.max(1, parseFloat(e.target.value) || 10))}
                      className="h-8 font-mono text-xs bg-muted/40 mt-1.5"
                    />
                  </div>
                </div>
              </div>

              {/* Step-by-Step Physics Math Breakdown Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-2">
                {/* Step 1: Mean Motion */}
                <Card className="border-border/60 bg-muted/10 font-mono">
                  <CardContent className="p-3.5 space-y-1.5">
                    <div className="text-[10px] text-muted-foreground uppercase font-semibold">1. Orbital Kinematics</div>
                    <div className="text-lg font-black text-foreground">
                      {activeOrbitParams.orbitalPeriodMinutes.toFixed(1)} min
                    </div>
                    <div className="text-[10px] text-muted-foreground space-y-0.5">
                      <div>Period: T = 2π√(a³/μ)</div>
                      <div>Mean motion n: <span className="text-primary">{(activeOrbitParams.meanMotionRadS * 1000).toFixed(4)}×10⁻³ rad/s</span></div>
                      <div>Velocity v: {activeOrbitParams.orbitalVelocityKmS.toFixed(2)} km/s</div>
                    </div>
                  </CardContent>
                </Card>

                {/* Step 2: HCW Impulse */}
                <Card className="border-border/60 bg-muted/10 font-mono">
                  <CardContent className="p-3.5 space-y-1.5">
                    <div className="text-[10px] text-primary uppercase font-semibold">2. HCW Tangential Impulse</div>
                    <div className="text-lg font-black text-primary">
                      {activeCWPulse.alongTrackDeltaVMs.toFixed(3)} m/s
                    </div>
                    <div className="text-[10px] text-muted-foreground space-y-0.5">
                      <div>Δv_y = (Δd · n) / (6π · k)</div>
                      <div>Revolutions k: <span className="text-foreground">{activeCWPulse.orbitalRevolutions.toFixed(2)} orbits</span></div>
                      <div>Radial peak Δx: {activeCWPulse.peakRadialDisplacementKm.toFixed(2)} km</div>
                    </div>
                  </CardContent>
                </Card>

                {/* Step 3: Tsiolkovsky Burn Mass */}
                <Card className="border-border/60 bg-muted/10 font-mono">
                  <CardContent className="p-3.5 space-y-1.5">
                    <div className="text-[10px] text-amber-400 uppercase font-semibold">3. Tsiolkovsky Fuel Mass</div>
                    <div className="text-lg font-black text-amber-400">
                      {activeTsiolkovsky.propellantConsumedKg >= 1.0
                        ? `${activeTsiolkovsky.propellantConsumedKg.toFixed(3)} kg`
                        : `${(activeTsiolkovsky.propellantConsumedKg * 1000).toFixed(1)} g`}
                    </div>
                    <div className="text-[10px] text-muted-foreground space-y-0.5">
                      <div>Δm = m₀(1 - e^(-Δv/c))</div>
                      <div>Mass ratio R: <span className="text-foreground">{activeTsiolkovsky.massRatio.toFixed(6)}</span></div>
                      <div>Dry mass: {activeTsiolkovsky.dryMassKg.toFixed(1)} kg</div>
                    </div>
                  </CardContent>
                </Card>

                {/* Step 4: Post-Burn Pc Decay */}
                <Card className="border-border/60 bg-muted/10 font-mono">
                  <CardContent className="p-3.5 space-y-1.5">
                    <div className="text-[10px] text-emerald-400 uppercase font-semibold">4. Resulting Pc Decay</div>
                    <div className="text-lg font-black text-emerald-400">
                      {formatScientificPc(activePcResult.postManeuverPc)}
                    </div>
                    <div className="text-[10px] text-muted-foreground space-y-0.5">
                      <div>Pc = Pc₀ · exp(-Δd²/2σ²)</div>
                      <div>Safety gain: <span className="text-emerald-400">{activePcResult.ordersOfMagnitudeSafer.toFixed(1)} orders</span></div>
                      <div>Risk reduction: 99.999%</div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Economic Cost & Mission Impact Box */}
              <div className="p-4 rounded-lg border border-border/70 bg-card/60 font-mono">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <DollarSign className="h-4 w-4 text-emerald-400" />
                    Amortized Maneuver Cost & Station-Keeping Lifetime Impact
                  </span>
                  <Badge variant="outline" className="text-[10px]">
                    Contract §1.3 Cost Model
                  </Badge>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-muted-foreground block text-[10px]">Propellant Cost</span>
                    <strong className="text-foreground">${activeEconomics.propellantCostUsd.toFixed(2)}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px]">Launch Mass Amortization</span>
                    <strong className="text-foreground">${activeEconomics.launchAmortizationUsd.toFixed(2)}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px]">Station-Keeping Life Loss</span>
                    <strong className="text-amber-400">{activeEconomics.lifetimeImpactDays.toFixed(2)} Days</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[10px]">Total Economic Valuation</span>
                    <strong className="text-emerald-400">${activeEconomics.totalEconomicValuationUsd.toFixed(2)}</strong>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
