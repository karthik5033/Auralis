"use client";

import React, { useState, useEffect } from "react";
import { 
  Bot, 
  Activity, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle, 
  RefreshCw,
  Cpu
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { mockWs } from "@/lib/mockWs";
import { getAgentStatuses } from "@/lib/api";
import type { AgentStatus, AgentType, AgentState } from "@/types/contract";

const AGENT_DISPLAY_META: Record<AgentType, { name: string; role: string }> = {
  tracker: { name: "Tracker", role: "SGP4 Propagation" },
  risk_assessor: { name: "Risk Assessor", role: "Foster-1992 Pc" },
  epidemic_forecaster: { name: "Forecaster", role: "SIR Cascade R₀" },
  maneuver_negotiation: { name: "Negotiator", role: "Bilateral Game Theory" },
  anomaly: { name: "Anomaly Agent", role: "Orbital Drift" },
  advisory: { name: "Advisory Agent", role: "Narrative Synthesis" },
};

export function AgentStatusBar() {
  const [agents, setAgents] = useState<AgentStatus[]>([]);
  const [lastEventTime, setLastEventTime] = useState<string>("");

  useEffect(() => {
    // Initial fetch
    getAgentStatuses()
      .then((res) => {
        setAgents(res.agents);
        setLastEventTime(new Date().toLocaleTimeString());
      })
      .catch((err) => console.error("Failed fetching agent telemetry:", err));

    // Live WebSocket subscription
    const unsub = mockWs.on("agent:status", (updatedAgent) => {
      setAgents((prev) =>
        prev.map((a) => (a.agentType === updatedAgent.agentType ? updatedAgent : a))
      );
      setLastEventTime(new Date().toLocaleTimeString());
    });

    return () => unsub();
  }, []);

  const getStateBadge = (state: AgentState) => {
    switch (state) {
      case "processing":
        return (
          <span className="flex items-center gap-1 text-[10px] font-mono font-bold text-blue-400 bg-blue-950/60 border border-blue-500/40 px-1.5 py-0.5 rounded">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping" />
            RUNNING
          </span>
        );
      case "alert":
        return (
          <span className="flex items-center gap-1 text-[10px] font-mono font-bold text-red-400 bg-red-950/60 border border-red-500/40 px-1.5 py-0.5 rounded">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            ALERT
          </span>
        );
      case "error":
        return (
          <span className="flex items-center gap-1 text-[10px] font-mono font-bold text-red-500 bg-red-950/80 border border-red-600 px-1.5 py-0.5 rounded">
            ERROR
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 text-[10px] font-mono text-zinc-400 bg-zinc-900 border border-zinc-700/60 px-1.5 py-0.5 rounded">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-500" />
            IDLE
          </span>
        );
    }
  };

  return (
    <div className="w-full bg-card/60 border border-border/70 rounded-xl p-3.5 backdrop-blur-md shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-border/50 mb-3">
        <div className="flex items-center gap-2">
          <Cpu className="h-4 w-4 text-primary animate-pulse" />
          <span className="text-xs font-mono font-bold text-foreground uppercase tracking-wider">
            Autonomous Agent Orchestration Mesh
          </span>
          <Badge variant="outline" className="text-[10px] font-mono text-emerald-400 border-emerald-500/30">
            6/6 HEALTHY
          </Badge>
        </div>
        <div className="text-[10px] font-mono text-muted-foreground">
          HEARTBEAT MESH: <span className="text-foreground font-bold">{lastEventTime || "SYNCHRONIZING"}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {agents.map((agent) => {
          const meta = AGENT_DISPLAY_META[agent.agentType] || { name: agent.agentName, role: "Agent" };
          return (
            <div
              key={agent.agentId}
              className="p-2.5 rounded-lg border border-border/60 bg-muted/20 hover:bg-muted/40 transition-colors flex flex-col justify-between gap-2 group cursor-default"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-foreground group-hover:text-primary transition-colors truncate">
                  {meta.name}
                </span>
                {getStateBadge(agent.state)}
              </div>
              <div>
                <div className="text-[10px] text-muted-foreground font-mono truncate">{meta.role}</div>
                <div className="text-[10px] text-zinc-400 mt-0.5 font-mono">
                  Cycles: <span className="text-foreground font-semibold">{agent.processedCount}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
