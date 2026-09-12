"use client";

import React, { useState } from "react";
import { 
  Crosshair, 
  Search, 
  Filter, 
  ArrowUpDown, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  ArrowRight,
  ShieldAlert,
  ChevronRight,
  ExternalLink,
  Activity,
  Orbit,
  Radio,
  Download
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MOCK_CASES, MockCase } from "@/lib/mockData";
import Link from "next/link";
import { downloadDataAsCsv } from "@/lib/utils";

export default function CasesPage() {
  const [cases] = useState<MockCase[]>(MOCK_CASES);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedCase, setSelectedCase] = useState<MockCase | null>(MOCK_CASES[0]);

  const filteredCases = cases.filter((c) => {
    const matchesSearch = c.case_no.toLowerCase().includes(search.toLowerCase()) || 
                          c.title.toLowerCase().includes(search.toLowerCase()) ||
                          c.summary.toLowerCase().includes(search.toLowerCase()) ||
                          (c.primary_object && c.primary_object.toLowerCase().includes(search.toLowerCase())) ||
                          (c.secondary_object && c.secondary_object.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus = statusFilter === "ALL" || c.status.toUpperCase() === statusFilter.toUpperCase();
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status.toUpperCase()) {
      case "ACTIVE":
        return <Badge variant="outline" className="text-amber-500 border-amber-500/30 bg-amber-500/10 font-mono text-[11px]">ACTIVE SCREENING</Badge>;
      case "UNDER INVESTIGATION":
        return <Badge variant="outline" className="text-zinc-400 border-zinc-700 bg-zinc-800/40 font-mono text-[11px]">NEGOTIATING</Badge>;
      case "CLOSED":
        return <Badge variant="outline" className="text-emerald-500 border-emerald-500/30 bg-emerald-500/10 font-mono text-[11px]">AVOIDED</Badge>;
      default:
        return <Badge variant="outline" className="text-zinc-400 border-border bg-muted font-mono text-[11px]">{status}</Badge>;
    }
  };

  return (
    <div className="flex-1 space-y-6 p-6 lg:p-8 max-w-7xl mx-auto w-full animate-in fade-in duration-300 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            <Crosshair className="w-7 h-7 text-foreground" />
            Conjunction Events &amp; Close Approaches
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 font-normal">
            Screening 37 active close-approaches across low-Earth orbit. Computing Foster-1992 2D collision probabilities and autonomous maneuver yields.
          </p>
        </div>
        <Button 
          onClick={() => downloadDataAsCsv(cases, "auralis-conjunction-events")} 
          variant="outline" 
          className="gap-1.5 text-xs font-semibold border-border bg-card hover:bg-muted"
        >
          <Download className="h-4 w-4" />
          Export Conjunction Report
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search by event ID, satellite, NORAD catalog, or shell..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs bg-muted/40 border-border"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto">
          {["ALL", "ACTIVE", "UNDER INVESTIGATION", "CLOSED"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 text-xs font-mono font-semibold rounded-lg transition-colors whitespace-nowrap ${
                statusFilter === st 
                  ? "bg-foreground text-background shadow-xs" 
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {st === "ALL" ? "ALL EVENTS" : st === "UNDER INVESTIGATION" ? "NEGOTIATING" : st === "CLOSED" ? "RESOLVED" : st}
            </button>
          ))}
        </div>
      </div>

      {/* Grid: Events Table + Selected Event Drawer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Events Table */}
        <div className="lg:col-span-2">
          <Card className="border-border bg-card shadow-xs">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 border-b border-border">
                    <TableHead className="text-xs font-mono font-semibold">EVENT ID</TableHead>
                    <TableHead className="text-xs font-mono font-semibold">OBJECT PAIR</TableHead>
                    <TableHead className="text-xs font-mono font-semibold">MISS DISTANCE</TableHead>
                    <TableHead className="text-xs font-mono font-semibold">COLLISION PROB (Pc)</TableHead>
                    <TableHead className="text-xs font-mono font-semibold text-right">STATUS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-border/60">
                  {filteredCases.map((c) => (
                    <TableRow 
                      key={c.id} 
                      onClick={() => setSelectedCase(c)}
                      className={`cursor-pointer transition-colors ${selectedCase?.id === c.id ? "bg-muted/60" : "hover:bg-muted/30"}`}
                    >
                      <TableCell className="font-mono text-xs font-bold text-foreground">
                        {c.case_no}
                      </TableCell>
                      <TableCell>
                        <div className="text-xs font-medium text-foreground">{c.primary_object || c.title}</div>
                        <div className="text-[11px] font-mono text-muted-foreground">vs {c.secondary_object || "Debris fragment"}</div>
                      </TableCell>
                      <TableCell className="font-mono text-xs font-bold">
                        <span className={c.miss_distance?.includes("48") ? "text-amber-500" : "text-foreground"}>
                          {c.miss_distance || "120 m"}
                        </span>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        <span className={c.collision_probability?.includes("Critical") ? "text-rose-500 font-bold" : "text-muted-foreground"}>
                          {c.collision_probability || "1.2e-4"}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {getStatusBadge(c.status)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredCases.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-xs text-muted-foreground">
                        No orbital conjunction events match your search query.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Selected Event Detail Dossier */}
        <div className="lg:col-span-1">
          {selectedCase ? (
            <Card className="border-border bg-card shadow-xs sticky top-24">
              <CardHeader className="pb-3 border-b border-border/60">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-foreground">{selectedCase.case_no}</span>
                  {getStatusBadge(selectedCase.status)}
                </div>
                <CardTitle className="text-base font-bold text-foreground mt-2">
                  {selectedCase.title}
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground font-mono">
                  Orbital Shell: {selectedCase.primary_district}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-4 text-xs font-sans">
                <div>
                  <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider block">Astrodynamics Assessment</span>
                  <p className="text-muted-foreground mt-1 leading-relaxed bg-muted/40 p-3 rounded-lg border border-border/60">
                    {selectedCase.summary}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1 font-mono">
                  <div className="p-2.5 rounded-lg border border-border bg-card">
                    <span className="text-[10px] text-muted-foreground uppercase block">TCA (Est. Time)</span>
                    <span className="font-bold text-foreground mt-0.5 block">{selectedCase.tca || "2026-09-13T04:18Z"}</span>
                  </div>
                  <div className="p-2.5 rounded-lg border border-border bg-card">
                    <span className="text-[10px] text-muted-foreground uppercase block">Planned Δv Burn</span>
                    <span className="font-bold text-amber-500 mt-0.5 block">{selectedCase.delta_v || "0.22 m/s"}</span>
                  </div>
                  <div className="p-2.5 rounded-lg border border-border bg-card">
                    <span className="text-[10px] text-muted-foreground uppercase block">Primary Body</span>
                    <span className="font-semibold text-foreground text-[11px] truncate mt-0.5 block">{selectedCase.primary_object || "Starlink-4821"}</span>
                  </div>
                  <div className="p-2.5 rounded-lg border border-border bg-card">
                    <span className="text-[10px] text-muted-foreground uppercase block">Secondary Body</span>
                    <span className="font-semibold text-foreground text-[11px] truncate mt-0.5 block">{selectedCase.secondary_object || "Cosmos-2251"}</span>
                  </div>
                </div>

                <div className="pt-2">
                  <Link href={`/cases/${selectedCase.id}`}>
                    <Button className="w-full text-xs font-semibold bg-foreground text-background hover:opacity-90 transition-opacity">
                      Inspect Full Conjunction Telemetry
                      <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border bg-card p-6 text-center text-muted-foreground text-xs">
              Select an event to view conjunction telemetry.
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
