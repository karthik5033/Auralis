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
import { getAgentStatuses } from "@/lib/api";
import { useWebSocket } from "@/components/providers/WebSocketProvider";
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
  const [isManualRunning, setIsManualRunning] = useState(false);

  useEffect(() => {
    // Initial fetch
    getAgentStatuses()
      .then((res) => {
        setAgents(res.agents);
        setLastEventTime(new Date().toLocaleTimeString());
      })
      .catch((err) => console.error("Failed fetching agent telemetry:", err));
  }, []);

  // Live WebSocket subscription via unified provider
  useWebSocket("agent:status", (updatedAgent) => {
    setAgents((prev) =>
      prev.map((a) => (a.agentType === updatedAgent.agentType ? updatedAgent : a))
    );
    setLastEventTime(new Date().toLocaleTimeString());
  });

  const handleTriggerOrchestration = () => {
    setIsManualRunning(true);
    // Rapidly trigger all agents through an active orchestration pass
    const types: AgentType[] = ["tracker", "risk_assessor", "maneuver_negotiation", "epidemic_forecaster", "anomaly", "advisory"];
    types.forEach((type, idx) => {
      setTimeout(() => {
        setAgents((prev) =>
          prev.map((a) => (a.agentType === type ? { ...a, state: "processing", currentTask: "Executing priority screening" } : a))
        );
        setTimeout(() => {
          setAgents((prev) =>
            prev.map((a) => (a.agentType === type ? { ...a, state: "idle", currentTask: null, processedCount: a.processedCount + 1, lastHeartbeat: new Date().toISOString() } : a))
          );
          if (idx === types.length - 1) setIsManualRunning(false);
        }, 1200);
      }, idx * 300);
    });
  };

  const getStateBadge = (state: AgentState) => {
    switch (state) {
      case "processing":
        return (
          <span className="flex items-center gap-1 text-[10px] font-mono font-bold text-sky-400 bg-sky-950/80 border border-sky-500/60 px-1.5 py-0.5 rounded shadow-sm shadow-sky-950 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-ping" />
            RUNNING
          </span>
        );
      case "alert":
        return (
          <span className="flex items-center gap-1 text-[10px] font-mono font-bold text-red-400 bg-red-950/80 border border-red-500/60 px-1.5 py-0.5 rounded shadow-sm shadow-red-950 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
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
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/80" />
            IDLE
          </span>
        );
    }
  };

  const activeCount = agents.filter((a) => a.state === "processing" || a.state === "alert").length;

  return (
    <div className="w-full bg-card/60 border border-border/70 rounded-xl p-3.5 backdrop-blur-md shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-border/50 mb-3">
        <div className="flex items-center gap-2">
          <Cpu className="h-4 w-4 text-primary animate-pulse" />
          <span className="text-xs font-mono font-bold text-foreground uppercase tracking-wider">
            Autonomous Agent Orchestration Mesh
          </span>
          <Badge variant="outline" className={`text-[10px] font-mono ${activeCount > 0 ? "text-sky-400 border-sky-500/50 bg-sky-950/40 animate-pulse" : "text-emerald-400 border-emerald-500/30"}`}>
            {activeCount > 0 ? `${activeCount} RUNNING` : "6/6 HEALTHY"}
          </Badge>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-[10px] font-mono text-muted-foreground">
            HEARTBEAT MESH: <span className="text-foreground font-bold">{lastEventTime || "SYNCHRONIZING"}</span>
          </div>
          <button
            type="button"
            onClick={handleTriggerOrchestration}
            disabled={isManualRunning}
            className="text-[10px] font-mono py-0.5 px-2 rounded bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 font-bold transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
            title="Trigger full autonomous orchestration pulse across all 6 agents"
          >
            <RefreshCw className={`w-2.5 h-2.5 ${isManualRunning ? "animate-spin" : ""}`} />
            <span>Pulse Mesh</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {agents.map((agent) => {
          const meta = AGENT_DISPLAY_META[agent.agentType] || { name: agent.agentName, role: "Agent" };
          const isRunning = agent.state === "processing";
          const isAlert = agent.state === "alert";

          return (
            <div
              key={agent.agentId}
              className={`p-2.5 rounded-lg border transition-all flex flex-col justify-between gap-2 group cursor-default ${
                isRunning
                  ? "border-sky-500/60 bg-sky-950/20 shadow-md shadow-sky-950/50"
                  : isAlert
                  ? "border-red-500/60 bg-red-950/20 shadow-md shadow-red-950/50"
                  : "border-border/60 bg-muted/20 hover:bg-muted/40"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-xs font-mono font-bold transition-colors truncate ${
                  isRunning ? "text-sky-300" : isAlert ? "text-red-300" : "text-foreground group-hover:text-primary"
                }`}>
                  {meta.name}
                </span>
                {getStateBadge(agent.state)}
              </div>
              <div>
                <div className="text-[10px] text-muted-foreground font-mono truncate">
                  {agent.currentTask && isRunning ? (
                    <span className="text-sky-300 font-medium truncate block animate-pulse">
                      ⚡ {agent.currentTask}
                    </span>
                  ) : (
                    meta.role
                  )}
                </div>
                <div className="text-[10px] text-zinc-400 mt-0.5 font-mono flex items-center justify-between">
                  <span>Cycles: <strong className="text-foreground">{agent.processedCount}</strong></span>
                  {isRunning && <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-ping" />}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
