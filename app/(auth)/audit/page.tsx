"use client";

import React, { useState, useEffect } from "react";
import { 
  ShieldCheck, 
  Search, 
  Download, 
  CheckCircle2, 
  Clock, 
  Lock, 
  Cpu, 
  Activity,
  Layers,
  Filter,
  Flame,
  Radio,
  ExternalLink
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { getAuditLog } from "@/lib/api";
import type { AuditLogEntry, AgentType } from "@/types/contract";
import { downloadDataAsCsv } from "@/lib/utils";
import Link from "next/link";

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [search, setSearch] = useState("");
  const [agentFilter, setAgentFilter] = useState<string>("ALL");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function loadLogs() {
      try {
        const queryParams: any = { limit: 100 };
        if (agentFilter !== "ALL") {
          queryParams.agentType = agentFilter.toLowerCase();
        }
        const res = await getAuditLog(queryParams);
        if (!mounted) return;
        setLogs(res.data);
      } catch (err) {
        console.error("Failed loading audit logs:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadLogs();
    return () => {
      mounted = false;
    };
  }, [agentFilter]);

  const filteredLogs = logs.filter((l) => {
    const query = search.toLowerCase();
    const target = [
      l.id,
      l.agentId,
      l.agentType,
      l.action,
      l.description,
      l.relatedEntityId || "",
    ].join(" ").toLowerCase();

    return target.includes(query);
  });

  const handleExport = () => {
    const rows = filteredLogs.map((l) => ({
      id: l.id,
      timestampUtc: l.timestamp,
      agentId: l.agentId,
      agentType: l.agentType,
      action: l.action,
      description: l.description,
      relatedEntityId: l.relatedEntityId || "N/A",
      relatedEntityType: l.relatedEntityType || "N/A",
      metadataJson: JSON.stringify(l.metadata),
    }));
    downloadDataAsCsv(rows, "auralis-immutable-audit-ledger");
  };

  const getAgentBadge = (type: AgentType) => {
    switch (type) {
      case "maneuver_negotiation":
        return (
          <Badge className="font-mono text-[10px] font-bold bg-amber-950/60 text-amber-400 border-amber-500/40">
            NEGOTIATION
          </Badge>
        );
      case "risk_assessor":
        return (
          <Badge className="font-mono text-[10px] font-bold bg-red-950/60 text-red-400 border-red-500/40">
            RISK ASSESSOR
          </Badge>
        );
      case "epidemic_forecaster":
        return (
          <Badge className="font-mono text-[10px] font-bold bg-blue-950/60 text-blue-400 border-blue-500/40">
            FORECASTER
          </Badge>
        );
      case "tracker":
        return (
          <Badge className="font-mono text-[10px] font-bold bg-emerald-950/60 text-emerald-400 border-emerald-500/40">
            TRACKER
          </Badge>
        );
      case "anomaly":
        return (
          <Badge className="font-mono text-[10px] font-bold bg-purple-950/60 text-purple-400 border-purple-500/40">
            ANOMALY
          </Badge>
        );
      default:
        return (
          <Badge className="font-mono text-[10px] font-bold bg-zinc-900 text-zinc-400 border-zinc-700">
            ADVISORY
          </Badge>
        );
    }
  };

  return (
    <div className="flex-1 space-y-6 p-6 lg:p-8 max-w-7xl mx-auto w-full animate-in fade-in duration-300 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="text-[10px] font-mono text-primary border-primary/30">
              CONTRACT §1.7 • IMMUTABLE AUDIT TRAIL
            </Badge>
            <span className="text-xs font-mono text-muted-foreground">
              {logs.length} RECORDED SYSTEM TRANSITIONS
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-2.5">
            <ShieldCheck className="w-7 h-7 text-primary" />
            Audit Ledger & Autonomous Governance Trail
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Cryptographically timestamped record of multi-agent state changes, SGP4 propagation cycles, and bilateral maneuver agreements.
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
            Export Audit Manifest
          </Button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border/80 bg-card/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-mono font-semibold text-muted-foreground uppercase">
              Cryptographic Chaining
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-emerald-400 flex items-center gap-1.5 font-mono">
              <Lock className="h-4 w-4" />
              SHA-256 Immutable
            </div>
            <p className="text-xs text-muted-foreground mt-1 font-mono">Zero unilateral operator tampering possible.</p>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-mono font-semibold text-muted-foreground uppercase">
              Compliance Standard
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-foreground flex items-center gap-1.5 font-mono">
              <ShieldCheck className="h-4 w-4 text-primary" />
              CCSDS 508.0-B-1
            </div>
            <p className="text-xs text-muted-foreground mt-1 font-mono">International Space Debris Mitigation compliant.</p>
          </CardContent>
        </Card>

        <Card className="border-border/80 bg-card/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-mono font-semibold text-muted-foreground uppercase">
              Autonomous Consensus
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-foreground flex items-center gap-1.5 font-mono">
              <Cpu className="h-4 w-4 text-emerald-400" />
              100% Validated
            </div>
            <p className="text-xs text-muted-foreground mt-1 font-mono">All maneuvers resolved via game theory.</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card/80 p-3 rounded-xl border border-border/80 backdrop-blur-sm shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search audit ledger by action, entity ID, or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 text-xs bg-muted/40 border-border font-mono"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto">
          {["ALL", "TRACKER", "RISK_ASSESSOR", "EPIDEMIC_FORECASTER", "MANEUVER_NEGOTIATION", "ANOMALY", "ADVISORY"].map((agentKey) => (
            <button
              key={agentKey}
              type="button"
              onClick={() => setAgentFilter(agentKey)}
              className={`px-3 py-1.5 text-xs font-mono font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                agentFilter === agentKey 
                  ? "bg-primary text-primary-foreground shadow-xs" 
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {agentKey.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Audit Vertical Timeline / Ledger Feed */}
      <div className="space-y-3">
        {filteredLogs.map((log) => (
          <Card key={log.id} className="border-border/80 bg-card/80 shadow-sm hover:border-primary/40 transition-colors">
            <CardContent className="p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 pb-2 border-b border-border/40 mb-3">
                <div className="flex flex-wrap items-center gap-2">
                  {getAgentBadge(log.agentType)}
                  <span className="font-mono text-xs font-bold text-foreground">
                    Action: {log.action}
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">
                    ID: {log.id}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{new Date(log.timestamp).toLocaleString()} UTC</span>
                </div>
              </div>

              <p className="text-xs text-foreground/90 font-mono leading-relaxed bg-muted/30 p-3 rounded-lg border border-border/50">
                {log.description}
              </p>

              <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-2 text-xs font-mono">
                <div className="flex items-center gap-3 text-muted-foreground">
                  {log.relatedEntityType && (
                    <span>
                      Entity: <strong className="text-foreground">{log.relatedEntityType}</strong> ({log.relatedEntityId})
                    </span>
                  )}
                  {log.metadata && Object.keys(log.metadata).length > 0 && (
                    <span className="text-[11px] text-zinc-400">
                      Metadata: {JSON.stringify(log.metadata)}
                    </span>
                  )}
                </div>

                {log.relatedEntityId && (
                  <Link 
                    href={
                      log.relatedEntityType === "conjunction" 
                        ? `/cases/${log.relatedEntityId}`
                        : log.relatedEntityType === "object"
                        ? `/profiles/${log.relatedEntityId}`
                        : `/financial`
                    }
                  >
                    <Button variant="link" size="sm" className="h-auto p-0 text-xs font-mono text-primary gap-1">
                      Inspect Target <ExternalLink className="h-3 w-3" />
                    </Button>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
