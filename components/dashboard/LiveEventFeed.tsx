"use client";

import React, { useState, useEffect } from "react";
import { 
  Activity, 
  AlertTriangle, 
  Crosshair, 
  CheckCircle2, 
  Flame, 
  ArrowRight, 
  Radio,
  FileText,
  Cpu
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { mockWs } from "@/lib/mockWs";
import { getAuditLog, getAdvisories } from "@/lib/api";
import type { WsMessage } from "@/types/contract";
import Link from "next/link";

export interface OrbitalEvent {
  id: string;
  type: "CONJUNCTION_DETECTED" | "MANEUVER_NEGOTIATED" | "ANOMALY_BURN" | "TLE_UPDATED" | "ADVISORY_ISSUED" | "AGENT_UPDATE";
  shell: string;
  message: string;
  time: string;
  severity?: "critical" | "elevated" | "nominal";
}

const INITIAL_EVENTS: OrbitalEvent[] = [
  {
    id: "evt_1",
    type: "CONJUNCTION_DETECTED",
    shell: "LEO_400_450",
    message: "Critical conjunction flagged: ISS (ZARYA) vs COSMOS 2251 DEB (Miss: 347m, Pc: 2.3e-3).",
    time: "Just now",
    severity: "critical",
  },
  {
    id: "evt_2",
    type: "MANEUVER_NEGOTIATED",
    shell: "LEO_400_450",
    message: "Bilateral agreement: Operator A executes 0.4 m/s burn. Post-maneuver Pc: 4.1e-7.",
    time: "2 mins ago",
    severity: "nominal",
  },
  {
    id: "evt_3",
    type: "ADVISORY_ISSUED",
    shell: "LEO_750_800",
    message: "Epidemic cascade R₀ spike: reproduction number 1.24 in SSO corridor.",
    time: "8 mins ago",
    severity: "elevated",
  },
  {
    id: "evt_4",
    type: "TLE_UPDATED",
    shell: "LEO Mesh",
    message: "SGP4 propagation cycle complete for 632 cataloged satellites and debris assets.",
    time: "14 mins ago",
    severity: "nominal",
  },
];

export function LiveEventFeed() {
  const [events, setEvents] = useState<OrbitalEvent[]>(INITIAL_EVENTS);
  const [isLive, setIsLive] = useState(true);

  useEffect(() => {
    // Initial fetch from audit log if available
    getAuditLog({ limit: 5 })
      .then((res) => {
        if (res.data.length > 0) {
          const auditEvents: OrbitalEvent[] = res.data.map((entry) => ({
            id: entry.id,
            type: entry.action.includes("conjunction")
              ? "CONJUNCTION_DETECTED"
              : entry.action.includes("maneuver")
              ? "MANEUVER_NEGOTIATED"
              : entry.action.includes("advisory")
              ? "ADVISORY_ISSUED"
              : "TLE_UPDATED",
            shell: entry.relatedEntityType ? `${entry.relatedEntityType.toUpperCase()}` : "LEO Mesh",
            message: entry.description,
            time: new Date(entry.timestamp).toLocaleTimeString(),
            severity: entry.action.includes("critical") ? "critical" : "nominal",
          }));
          setEvents((prev) => {
            const combined = [...auditEvents, ...prev];
            const unique = Array.from(new Map(combined.map((e) => [e.id, e])).values());
            return unique.slice(0, 8);
          });
        }
      })
      .catch((err) => console.error("Could not load initial audit events:", err));

    // WebSocket real-time subscription
    const unsub = mockWs.onMessage((msg: WsMessage) => {
      if (!isLive) return;

      const now = new Date().toLocaleTimeString();

      if (msg.event === "conjunction:updated") {
        const conj = msg.payload as any;
        const newEvt: OrbitalEvent = {
          id: `ws-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          type: "CONJUNCTION_DETECTED",
          shell: "LEO Critical",
          message: `Conjunction ${conj.id.slice(0, 8)}... Pc updated to ${Number(conj.collisionProbability).toExponential(2)} (Miss: ${(conj.missDistance * 1000).toFixed(0)}m).`,
          time: now,
          severity: conj.riskLevel,
        };
        setEvents((prev) => [newEvt, ...prev.slice(0, 7)]);
      } else if (msg.event === "agent:status") {
        const agent = msg.payload as any;
        if (agent.state === "processing" || agent.state === "alert") {
          const newEvt: OrbitalEvent = {
            id: `ws-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            type: "AGENT_UPDATE",
            shell: `${agent.agentId.toUpperCase()}`,
            message: `${agent.agentName} transitioned to ${agent.state.toUpperCase()}${agent.currentTask ? `: ${agent.currentTask}` : "."}`,
            time: now,
            severity: agent.state === "alert" ? "critical" : "nominal",
          };
          setEvents((prev) => [newEvt, ...prev.slice(0, 7)]);
        }
      } else if (msg.event === "advisory:new") {
        const adv = msg.payload as any;
        const newEvt: OrbitalEvent = {
          id: `ws-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          type: "ADVISORY_ISSUED",
          shell: "Advisory Mesh",
          message: `${adv.title}: ${adv.body.slice(0, 95)}...`,
          time: now,
          severity: adv.severity,
        };
        setEvents((prev) => [newEvt, ...prev.slice(0, 7)]);
      }
    });

    return () => unsub();
  }, [isLive]);

  const getEventIcon = (type: string, severity?: string) => {
    switch (type) {
      case "CONJUNCTION_DETECTED":
        return <Crosshair className={`w-4 h-4 ${severity === "critical" ? "text-red-500" : "text-amber-500"}`} />;
      case "MANEUVER_NEGOTIATED":
        return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      case "ANOMALY_BURN":
        return <Flame className="w-4 h-4 text-red-500" />;
      case "ADVISORY_ISSUED":
        return <FileText className="w-4 h-4 text-cyan-400" />;
      case "AGENT_UPDATE":
        return <Cpu className="w-4 h-4 text-blue-400" />;
      case "TLE_UPDATED":
      default:
        return <Activity className="w-4 h-4 text-primary" />;
    }
  };

  return (
    <div className="flex flex-col h-full justify-between">
      <div>
        <div className="flex items-center justify-between pb-3 border-b border-border/50">
          <div className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-primary animate-pulse" />
            <h3 className="font-semibold text-sm text-foreground font-mono">Live Telemetry Feed</h3>
          </div>
          <button 
            type="button"
            onClick={() => setIsLive(!isLive)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground'}`} />
            <span className="font-mono text-[10px] font-bold">{isLive ? 'STREAMING' : 'PAUSED'}</span>
          </button>
        </div>

        <div className="space-y-2.5 mt-3">
          {events.map((evt) => (
            <div 
              key={evt.id}
              className={`p-2.5 rounded-lg border transition-all flex items-start gap-3 group ${
                evt.severity === "critical" 
                  ? "border-red-500/30 bg-red-950/15 hover:bg-red-950/25" 
                  : "border-border/50 bg-muted/20 hover:bg-muted/40"
              }`}
            >
              <div className="p-1.5 rounded-md bg-card border border-border/50 mt-0.5 group-hover:border-primary/50 transition-colors">
                {getEventIcon(evt.type, evt.severity)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="font-mono text-[10px] font-bold text-primary">{evt.shell}</span>
                  <span className="text-[10px] font-mono text-muted-foreground">{evt.time}</span>
                </div>
                <p className="text-xs text-foreground font-medium leading-snug">
                  {evt.message}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="pt-4 border-t border-border/50 mt-4">
        <Link href="/audit">
          <Button variant="outline" size="sm" className="w-full text-xs font-mono font-semibold justify-center gap-1">
            View Immutable Audit Ledger <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
