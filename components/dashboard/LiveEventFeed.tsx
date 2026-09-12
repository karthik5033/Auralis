"use client";

import React, { useState, useEffect } from "react";
import { 
  Activity, 
  Crosshair, 
  CheckCircle2, 
  Flame, 
  ArrowRight, 
  Radio, 
  FileText, 
  Cpu 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAuditLog } from "@/lib/api";
import { useWebSocketMessage } from "@/components/providers/WebSocketProvider";
import { formatScientificPc } from "@/lib/formatters";
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
    shell: "LEO Critical",
    message: "Conjunction ce-9f8e7... Pc updated to 2.32 × 10⁻³ (Miss: 347m).",
    time: "Just now",
    severity: "critical",
  },
  {
    id: "evt_2",
    type: "AGENT_UPDATE",
    shell: "TRACKER",
    message: "Tracker Agent transitioned to PROCESSING: Screening epoch 16:08:46.",
    time: "2 mins ago",
    severity: "nominal",
  },
  {
    id: "evt_3",
    type: "MANEUVER_NEGOTIATED",
    shell: "MANEUVER",
    message: "Maneuver negotiation resolved: Operator A prograde burn scheduled.",
    time: "5 mins ago",
    severity: "nominal",
  },
  {
    id: "evt_4",
    type: "TLE_UPDATED",
    shell: "SHELL",
    message: "SGP4 propagation cycle complete for 632 cataloged satellites.",
    time: "10 mins ago",
    severity: "nominal",
  },
];

export function LiveEventFeed() {
  const [events, setEvents] = useState<OrbitalEvent[]>(INITIAL_EVENTS);
  const [isLive, setIsLive] = useState(true);

  useEffect(() => {
    // Initial fetch from audit log if available
    getAuditLog({ limit: 4 })
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
            time: new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            severity: entry.action.includes("critical") ? "critical" : "nominal",
          }));
          setEvents((prev) => {
            const combined = [...auditEvents, ...prev];
            const unique = Array.from(new Map(combined.map((e) => [e.id, e])).values());
            return unique.slice(0, 4);
          });
        }
      })
      .catch((err) => console.error("Could not load initial audit events:", err));
  }, []);

  // WebSocket real-time subscription via unified provider
  useWebSocketMessage((msg: WsMessage) => {
    if (!isLive) return;

    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (msg.event === "conjunction:updated") {
      const conj = msg.payload as any;
      const newEvt: OrbitalEvent = {
        id: `ws-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: "CONJUNCTION_DETECTED",
        shell: "LEO Critical",
        message: `Conjunction ${conj.id.slice(0, 8)}... Pc updated to ${formatScientificPc(conj.collisionProbability)} (Miss: ${(conj.missDistance * 1000).toFixed(0)}m).`,
        time: now,
        severity: conj.riskLevel,
      };
      setEvents((prev) => [newEvt, ...prev.slice(0, 3)]);
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
        setEvents((prev) => [newEvt, ...prev.slice(0, 3)]);
      }
    } else if (msg.event === "advisory:new") {
      const adv = msg.payload as any;
      const newEvt: OrbitalEvent = {
        id: `ws-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        type: "ADVISORY_ISSUED",
        shell: "Advisory Mesh",
        message: `${adv.title}: ${adv.body.slice(0, 80)}...`,
        time: now,
        severity: adv.severity,
      };
      setEvents((prev) => [newEvt, ...prev.slice(0, 3)]);
    }
  });

  const getEventIcon = (type: string, severity?: string) => {
    switch (type) {
      case "CONJUNCTION_DETECTED":
        return <Crosshair className={`w-3.5 h-3.5 ${severity === "critical" ? "text-red-500" : "text-amber-500"}`} />;
      case "MANEUVER_NEGOTIATED":
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />;
      case "ANOMALY_BURN":
        return <Flame className="w-3.5 h-3.5 text-red-500" />;
      case "ADVISORY_ISSUED":
        return <FileText className="w-3.5 h-3.5 text-cyan-400" />;
      case "AGENT_UPDATE":
        return <Cpu className="w-3.5 h-3.5 text-blue-400" />;
      case "TLE_UPDATED":
      default:
        return <Activity className="w-3.5 h-3.5 text-primary" />;
    }
  };

  return (
    <div className="flex flex-col h-full justify-between">
      <div>
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/50">
          <div className="flex items-center gap-1.5">
            <Radio className="h-3.5 w-3.5 text-primary animate-pulse" />
            <h3 className="font-semibold text-xs text-foreground font-mono">Live Telemetry Feed</h3>
          </div>
          <button 
            type="button"
            onClick={() => setIsLive(!isLive)}
            className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <span className={`w-1.5 h-1.5 rounded-full ${isLive ? 'bg-emerald-500 animate-pulse' : 'bg-muted-foreground'}`} />
            <span className="font-mono font-bold">{isLive ? 'STREAMING' : 'PAUSED'}</span>
          </button>
        </div>

        {/* Shortened compact notification list with max height */}
        <div className="space-y-2 max-h-[220px] overflow-y-auto pr-0.5">
          {events.map((evt) => (
            <div 
              key={evt.id}
              className={`p-2 rounded-lg border transition-all flex items-start gap-2.5 ${
                evt.severity === "critical" 
                  ? "border-red-500/40 bg-red-950/20 hover:bg-red-950/30" 
                  : "border-border/60 bg-muted/20 hover:bg-muted/40"
              }`}
            >
              <div className="p-1 rounded bg-card border border-border/60 shrink-0 mt-0.5">
                {getEventIcon(evt.type, evt.severity)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1 mb-0.5">
                  <span className="font-mono text-[9px] font-bold text-primary truncate">{evt.shell}</span>
                  <span className="text-[9px] font-mono text-muted-foreground shrink-0">{evt.time}</span>
                </div>
                <p className="text-[11px] text-foreground font-medium leading-snug line-clamp-2">
                  {evt.message}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="pt-2 border-t border-border/50 mt-2">
        <Link href="/audit">
          <Button variant="outline" size="sm" className="w-full h-7 text-[10px] font-mono font-semibold justify-center gap-1">
            View Audit Ledger <ArrowRight className="h-3 w-3" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
