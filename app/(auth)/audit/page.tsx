"use client";

import React, { useState } from "react";
import { 
  ShieldCheck, 
  Search, 
  Filter, 
  Download, 
  FileText, 
  CheckCircle2, 
  Clock, 
  Lock,
  ChevronRight,
  GitBranch,
  Terminal,
  Cpu
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { MOCK_AUDIT_LOGS, MockAuditLog } from "@/lib/mockData";
import { downloadDataAsCsv } from "@/lib/utils";

export default function AuditPage() {
  const [logs] = useState<MockAuditLog[]>(MOCK_AUDIT_LOGS);
  const [search, setSearch] = useState("");
  const [selectedLog, setSelectedLog] = useState<MockAuditLog | null>(MOCK_AUDIT_LOGS[0]);

  const filteredLogs = logs.filter(l => {
    const userStr = (l.user_id || l.user_name || "").toLowerCase();
    const eventStr = (l.event_type || l.action || "").toLowerCase();
    const query = search.toLowerCase();
    return userStr.includes(query) || eventStr.includes(query) || (l.details && JSON.stringify(l.details).toLowerCase().includes(query));
  });

  const handleExport = () => {
    downloadDataAsCsv(logs, "auralis-agent-audit-ledger");
  };

  return (
    <div className="flex-1 space-y-6 p-6 lg:p-8 max-w-7xl mx-auto w-full animate-in fade-in duration-300 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2">
            <ShieldCheck className="w-7 h-7 text-foreground" />
            Audit &amp; Agent Governance Ledger
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Immutable cryptographic audit trail of multi-agent collision avoidance negotiations, maneuver agreements, and operator authorizations.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleExport} className="gap-1.5 text-xs font-semibold border-border bg-card hover:bg-muted">
            <Download className="h-4 w-4" />
            Export Audit Ledger
          </Button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-mono font-semibold text-muted-foreground uppercase">Cryptographic Integrity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-emerald-500 flex items-center gap-1.5 font-mono">
              <ShieldCheck className="h-5 w-5" />
              SHA-256 Validated
            </div>
            <p className="text-xs text-muted-foreground mt-1">Negotiation blocks cryptographically chained.</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-mono font-semibold text-muted-foreground uppercase">Governance Standard</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-foreground flex items-center gap-1.5 font-mono">
              <Lock className="h-5 w-5" />
              CCSDS 508.0-B-1
            </div>
            <p className="text-xs text-muted-foreground mt-1">Complies with International Space Debris Mitigation standards.</p>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-mono font-semibold text-muted-foreground uppercase">Negotiation Resolution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-foreground flex items-center gap-1.5 font-mono">
              <Cpu className="h-5 w-5 text-emerald-500" />
              91.3% Autonomous
            </div>
            <p className="text-xs text-muted-foreground mt-1">Conjunctions settled without manual escalation.</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search */}
      <div className="bg-card p-3 rounded-xl border border-border">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search by agent ID, event type, or conjunction ID..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs bg-muted/40 border-border"
          />
        </div>
      </div>

      {/* Main Grid: Logs Table + Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Table */}
        <div className="lg:col-span-2">
          <Card className="border-border bg-card shadow-xs">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 border-b border-border">
                    <TableHead className="text-xs font-mono font-semibold">AGENT / ENTITY</TableHead>
                    <TableHead className="text-xs font-mono font-semibold">EVENT TYPE</TableHead>
                    <TableHead className="text-xs font-mono font-semibold">TIMESTAMP</TableHead>
                    <TableHead className="text-xs font-mono font-semibold text-right">HASH</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-border/60">
                  {filteredLogs.map((log) => (
                    <TableRow 
                      key={log.id} 
                      onClick={() => setSelectedLog(log)}
                      className={`cursor-pointer transition-colors ${selectedLog?.id === log.id ? "bg-muted/60" : "hover:bg-muted/30"}`}
                    >
                      <TableCell>
                        <div className="font-mono text-xs font-bold text-foreground">{log.user_id}</div>
                        <div className="text-[10px] font-mono text-muted-foreground">{log.user_role}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono text-[10px] text-foreground border-border bg-muted">
                          {log.event_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {log.timestamp}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-right text-muted-foreground">
                        {log.integrity_hash ? `${log.integrity_hash.slice(0, 8)}...` : "VERIFIED"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Inspector */}
        <div className="lg:col-span-1">
          {selectedLog ? (
            <Card className="border-border bg-card shadow-xs sticky top-24">
              <CardHeader className="pb-3 border-b border-border/60">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-bold text-foreground">{selectedLog.id}</span>
                  <Badge variant="outline" className="font-mono text-[10px] text-emerald-500 border-emerald-500/30 bg-emerald-500/10">
                    VERIFIED
                  </Badge>
                </div>
                <CardTitle className="text-base font-bold text-foreground mt-2">
                  Negotiation Audit Record
                </CardTitle>
                <CardDescription className="text-xs text-muted-foreground font-mono">
                  {selectedLog.timestamp}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-4 text-xs font-mono">
                <div className="space-y-1">
                  <span className="text-[10px] text-muted-foreground uppercase block">Agent Actor</span>
                  <p className="font-bold text-foreground">{selectedLog.user_id}</p>
                  <p className="text-[11px] text-muted-foreground">{selectedLog.user_role}</p>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-muted-foreground uppercase block">Network Origin</span>
                  <p className="font-semibold text-foreground">{selectedLog.ip_address}</p>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-muted-foreground uppercase block">Negotiated Parameters</span>
                  <div className="p-3 rounded-lg bg-muted/40 border border-border text-[11px] text-foreground space-y-1">
                    {Object.entries(selectedLog.details || {}).map(([key, val]) => (
                      <div key={key} className="flex justify-between">
                        <span className="text-muted-foreground">{key}:</span>
                        <span className="font-bold">{String(val)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-1 pt-1">
                  <span className="text-[10px] text-muted-foreground uppercase block">Cryptographic Proof</span>
                  <p className="p-2 rounded bg-muted/30 border border-border/60 text-[10px] text-muted-foreground break-all">
                    {selectedLog.integrity_hash || "0x9f4a2b1c8e7d6a5f4c3b2a1e0f9d8c7b"}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border bg-card p-6 text-center text-muted-foreground text-xs">
              Select an audit entry to inspect cryptographic details.
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
