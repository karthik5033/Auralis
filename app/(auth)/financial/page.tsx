"use client";

import React, { useState } from "react";
import { 
  Fuel, 
  ArrowRightLeft, 
  AlertTriangle, 
  ShieldAlert, 
  TrendingUp, 
  Download, 
  Search, 
  ExternalLink,
  Layers,
  ArrowRight,
  Orbit,
  Gauge
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MOCK_FINANCIAL_TX, MockFinancialTx } from "@/lib/mockData";
import { downloadDataAsCsv } from "@/lib/utils";

export default function FinancialPage() {
  const [transactions] = useState<MockFinancialTx[]>(MOCK_FINANCIAL_TX);
  const [search, setSearch] = useState("");

  const filteredTx = transactions.filter(t => {
    const fromStr = (t.from_account || t.sender_name || "").toLowerCase();
    const toStr = (t.to_account || t.receiver_name || "").toLowerCase();
    const idStr = (t.id || t.tx_id || "").toLowerCase();
    const query = search.toLowerCase();
    return fromStr.includes(query) || toStr.includes(query) || idStr.includes(query);
  });

  const handleExport = () => {
    downloadDataAsCsv(transactions, "auralis-delta-v-fuel-ledger");
  };

  return (
    <div className="flex-1 space-y-6 p-6 lg:p-8 max-w-7xl mx-auto w-full animate-in fade-in duration-300 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            <Fuel className="w-7 h-7 text-foreground" />
            Delta-V &amp; Maneuver Fuel Ledger
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Tracking cumulative velocity change impulses (Δv), propellant burn mass (kg), and multi-operator maneuver expense allocations.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5 text-xs font-semibold border-border bg-card hover:bg-muted">
            <Download className="h-4 w-4" />
            Export Fuel Ledger CSV
          </Button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-mono font-semibold text-muted-foreground uppercase">Total Maneuver Δv</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-foreground font-mono">1.99 m/s</div>
            <p className="text-xs text-muted-foreground mt-1">Across 4 active evasive burns</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-mono font-semibold text-muted-foreground uppercase">Propellant Burn Mass</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-amber-500 font-mono">2.71 kg</div>
            <p className="text-xs text-muted-foreground mt-1">Xenon ion &amp; hydrazine consumed</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-mono font-semibold text-muted-foreground uppercase">Autonomous Yield Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-emerald-500 font-mono">91.3%</div>
            <p className="text-xs text-muted-foreground mt-1">Game-theoretic Nash equilibrium</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-mono font-semibold text-muted-foreground uppercase">Uncoordinated Maneuvers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-black text-rose-500 font-mono">1 Burn</div>
            <p className="text-xs text-muted-foreground mt-1">Flagged high delta-v burn (Sat-7)</p>
          </CardContent>
        </Card>
      </div>

      {/* Search Bar */}
      <div className="bg-card p-3 rounded-xl border border-border">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search by satellite, operator, or burn transaction ID..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs bg-muted/40 border-border"
          />
        </div>
      </div>

      {/* Transactions Table */}
      <Card className="border-border bg-card shadow-xs">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 border-b border-border">
                <TableHead className="text-xs font-mono font-semibold">BURN ID</TableHead>
                <TableHead className="text-xs font-mono font-semibold">SPACECRAFT / OPERATOR</TableHead>
                <TableHead className="text-xs font-mono font-semibold">PURPOSE / TARGET</TableHead>
                <TableHead className="text-xs font-mono font-semibold">ΔV IMPULSE</TableHead>
                <TableHead className="text-xs font-mono font-semibold">PROPELLANT</TableHead>
                <TableHead className="text-xs font-mono font-semibold">TIMESTAMP</TableHead>
                <TableHead className="text-xs font-mono font-semibold text-right">STATUS</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-border/60 font-mono text-xs">
              {filteredTx.map((tx) => (
                <TableRow key={tx.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="font-bold text-foreground">{tx.id}</TableCell>
                  <TableCell>
                    <div className="font-semibold text-foreground">{tx.from_account}</div>
                    <div className="text-[11px] text-muted-foreground">{tx.satellite || tx.operator}</div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{tx.to_account}</TableCell>
                  <TableCell className="font-bold text-amber-500">{tx.amount} m/s</TableCell>
                  <TableCell className="text-foreground">{tx.fuel_burn_kg || 0.15} kg</TableCell>
                  <TableCell className="text-muted-foreground text-[11px]">{tx.timestamp}</TableCell>
                  <TableCell className="text-right">
                    {tx.flagged ? (
                      <Badge variant="outline" className="text-[10px] text-rose-500 border-rose-500/30 bg-rose-500/10">
                        FLAGGED UNCOORDINATED
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] text-emerald-500 border-emerald-500/30 bg-emerald-500/10">
                        COORDINATED YIELD
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
