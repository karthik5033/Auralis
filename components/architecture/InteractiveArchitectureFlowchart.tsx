"use client";

import React, { useState, useEffect } from "react";
import {
  Radio,
  Orbit,
  Cpu,
  Database,
  Layers,
  ArrowRight,
  Sparkles,
  Play,
  RotateCcw,
  Zap,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  GitBranch,
  Terminal,
  Activity,
  Boxes,
  FileCode,
  Flame,
  Bomb,
  Compass,
  Check
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface FlowNode {
  id: string;
  stageNumber: string;
  title: string;
  subtitle: string;
  layer: "ingestion" | "astrodynamics" | "agents" | "bus" | "presentation" | "crisis";
  icon: React.ElementType;
  sourceFile: string;
  mathFormula?: string;
  inputPayload?: string;
  outputPayload?: string;
  description: string;
  keyMetric: string;
}

export interface FlowConnection {
  from: string;
  to: string;
  label?: string;
}

const PIPELINES = [
  {
    id: "e2e",
    name: "End-to-End System Pipeline",
    description: "Full telemetry cycle from US Space Force ingestion to 3D WebGL Tactical Globe visualization.",
    nodes: [
      {
        id: "space_track",
        stageNumber: "01",
        title: "Space-Track / CelesTrak Ingestion",
        subtitle: "External Telemetry Harvester",
        layer: "ingestion",
        icon: Radio,
        sourceFile: "data/spacetrack.ts",
        mathFormula: "Rate Limit: 20-30 req/min | 10-min Cache Policy",
        inputPayload: "Raw US Space Force Conjunction Data Messages (CDMs) & NORAD GP TLEs",
        outputPayload: "Canonical raw telemetry JSON stream",
        description: "Authenticated session login against Space-Track (/ajaxauth/login) with rate-limited caching and public CelesTrak active ephemeris fallback.",
        keyMetric: "630+ Active Ephemerides"
      },
      {
        id: "parser",
        stageNumber: "02",
        title: "Parser & Astrodynamic Validator",
        subtitle: "Coordinate Frame Transformation",
        layer: "ingestion",
        icon: GitBranch,
        sourceFile: "data/parser.ts",
        mathFormula: "TEME (True Equator, Mean Equinox) → WGS-84 ECEF & ECI J2000",
        inputPayload: "Raw TLE text lines (Line 1 & Line 2)",
        outputPayload: "TrackedObject { id, position: [x,y,z], velocity: [vx,vy,vz], covariance: 3x3 }",
        description: "Validates orbital parameters, calculates initial 3D position/velocity state vectors, and initializes 6-element position covariance upper triangles.",
        keyMetric: "< 1.2ms / 100 objects"
      },
      {
        id: "sgp4",
        stageNumber: "03",
        title: "SGP4 Perturbation Propagator",
        subtitle: "High-Speed Astrodynamics Engine",
        layer: "astrodynamics",
        icon: Orbit,
        sourceFile: "data/propagator.ts",
        mathFormula: "r(t), v(t) = SGP4(TLE, t) with Kozai-Brouwer mean motion & B* drag",
        inputPayload: "TrackedObject[] catalog + Target Epoch Timestamp (UTC)",
        outputPayload: "StateVectorsUpdatedPayload { epoch, objects: TrackedObject[], isDelta }",
        description: "Propagates 630+ orbital bodies in parallel incorporating Earth geopotential harmonics (J2, J3, J4) and atmospheric density decay.",
        keyMetric: "24.7ms Propagation Cycle"
      },
      {
        id: "screening",
        stageNumber: "04",
        title: "B-Plane Conjunction Screening",
        subtitle: "Foster-1992 Collision Probability Math",
        layer: "astrodynamics",
        icon: ShieldAlert,
        sourceFile: "data/collision.ts",
        mathFormula: "Pc = (1 / 2π√|C|) ∬ exp(-0.5 rᵀ C⁻¹ r) dx dy across 2D encounter ellipse",
        inputPayload: "Primary TrackedObject + Secondary TrackedObject state vectors",
        outputPayload: "ConjunctionEvent { id, missDistance, relativeVelocity, Pc, riskLevel }",
        description: "Hierarchical bounding-sphere proximity culling followed by combined 3D covariance projection onto the B-plane encounter ellipse.",
        keyMetric: "Screening miss < 5.0 km"
      },
      {
        id: "cascade_math",
        stageNumber: "05",
        title: "SIR Epidemic Cascade Forecaster",
        subtitle: "Orbital Shell Density & Kessler Model",
        layer: "astrodynamics",
        icon: Activity,
        sourceFile: "data/cascade.ts",
        mathFormula: "dS/dt = -β S I + α,  dI/dt = β S I - γ I,  R₀ = (β S) / γ",
        inputPayload: "Shell population counts across 50 km altitude bands",
        outputPayload: "ShellRiskSnapshot[] with 50-year time series projections",
        description: "Evaluates spatial collision frequency across 51 altitude shells to detect super-critical cascade tipping points (R₀ ≥ 1.0).",
        keyMetric: "51 Monitored Altitude Bands"
      },
      {
        id: "agents_swarm",
        stageNumber: "06",
        title: "Autonomous Gemini 2.5 Flash Swarm",
        subtitle: "6-Agent Bilateral Negotiation & Advisory",
        layer: "agents",
        icon: Cpu,
        sourceFile: "lib/backend/runtime.ts",
        mathFormula: "Nash Bargaining Solution: max (u₁ - d₁)(u₂ - d₂) s.t. ΔV fuel bounds",
        inputPayload: "HighPcConjunctionPayload, CascadeForecastPayload, AnomalyReport",
        outputPayload: "ManeuverProposal, AdvisoryMessage, AnomalyDetectionReport",
        description: "Multi-agent coordinator managing Tracker, Risk Assessor, Maneuver Negotiation, Epidemic Forecaster, Advisory Copilot, and Anomaly Forensics.",
        keyMetric: "12-Key Load Balancer"
      },
      {
        id: "message_bus",
        stageNumber: "07",
        title: "Message Bus & In-Memory Store",
        subtitle: "Thread-Safe Authoritative State",
        layer: "bus",
        icon: Database,
        sourceFile: "lib/messageBus.ts",
        mathFormula: "Pub/Sub Typed Message Envelope Routing with Correlation IDs",
        inputPayload: "AgentMessage<T> { id, source, target, type, payload, timestamp }",
        outputPayload: "Persistent state store updates & SSE real-time broadcast",
        description: "Zero-copy pub/sub nervous system connecting all backend agents and maintaining authoritative state in store.ts with audit ledger.",
        keyMetric: "Sub-millisecond latency"
      },
      {
        id: "presentation",
        stageNumber: "08",
        title: "Presentation & Mission Control UI",
        subtitle: "3D Tactical Globe & Command Center",
        layer: "presentation",
        icon: Layers,
        sourceFile: "components/globe/GlobeView.tsx",
        mathFormula: "Hardware-accelerated Three.js / WebGL with custom Keplerian orbit rings",
        inputPayload: "Live SSE streams (/api/v1/events) + REST API endpoints",
        outputPayload: "Interactive 3D tactical visualization & flight director dossiers",
        description: "Next.js 16 client presentation with 3D Globe.gl canvas, real-time telemetry meters, AI copilot chat, and conjunction dossiers.",
        keyMetric: "60 FPS WebGL Render"
      }
    ] as FlowNode[],
    connections: [
      { from: "space_track", to: "parser", label: "Raw TLE Stream" },
      { from: "parser", to: "sgp4", label: "Tracked Objects" },
      { from: "sgp4", to: "screening", label: "State Vectors" },
      { from: "sgp4", to: "cascade_math", label: "Shell Counts" },
      { from: "screening", to: "agents_swarm", label: "Pc > 1e-4 Alert" },
      { from: "cascade_math", to: "agents_swarm", label: "R₀ Forecast" },
      { from: "agents_swarm", to: "message_bus", label: "Proposals & Advisories" },
      { from: "message_bus", to: "presentation", label: "SSE / REST Push" }
    ] as FlowConnection[]
  },
  {
    id: "agents",
    name: "Autonomous Multi-Agent Sequence",
    description: "Interactive arbitration sequence between Tracker, Risk Assessor, Maneuver Negotiator, and Advisory Copilot.",
    nodes: [
      {
        id: "ag_tracker",
        stageNumber: "01",
        title: "Tracker Agent",
        subtitle: "Catalog Ingestion & SGP4 Propagation",
        layer: "agents",
        icon: Radio,
        sourceFile: "lib/backend/tracker.ts",
        mathFormula: "State Vector Update: [x,y,z,vx,vy,vz] at epoch T",
        inputPayload: "Space-Track CDM & CelesTrak TLE feeds",
        outputPayload: "state_vectors_updated & shell_population_updated",
        description: "Continuously runs SGP4 orbital propagation cycles, publishes delta state vectors, and tracks object status.",
        keyMetric: "Event: state_vectors_updated"
      },
      {
        id: "ag_risk",
        stageNumber: "02",
        title: "Risk Assessor Agent",
        subtitle: "Foster-1992 B-Plane Encounter Screener",
        layer: "agents",
        icon: ShieldAlert,
        sourceFile: "lib/backend/riskAssessor.ts",
        mathFormula: "Action Threshold: Pc ≥ 1.0 × 10⁻⁴ (Miss < 5.0 km)",
        inputPayload: "state_vectors_updated (objects delta)",
        outputPayload: "high_pc_conjunction & risk_assessment_complete",
        description: "Screens close approaches, derives 3D covariance ellipses, computes collision probability, and classifies risk level.",
        keyMetric: "Event: high_pc_conjunction"
      },
      {
        id: "ag_maneuver",
        stageNumber: "03",
        title: "Maneuver Negotiation Agent",
        subtitle: "Bilateral Autonomous LLM Game Theory",
        layer: "agents",
        icon: Cpu,
        sourceFile: "lib/backend/maneuverNegotiation.ts",
        mathFormula: "ΔV Minimization: min (ΔV₁ + ΔV₂) s.t. Pc_post < 10⁻⁷",
        inputPayload: "high_pc_conjunction (Primary vs Secondary objects)",
        outputPayload: "maneuver_proposed & maneuver_resolved",
        description: "Executes automated bilateral bargaining between commercial operators using Gemini 2.5 Flash to assign fuel-optimal avoidance burns.",
        keyMetric: "Event: maneuver_resolved"
      },
      {
        id: "ag_advisory",
        stageNumber: "04",
        title: "Advisory Agent Copilot",
        subtitle: "Natural Language Flight Director Briefing",
        layer: "agents",
        icon: Sparkles,
        sourceFile: "lib/backend/advisory.ts",
        mathFormula: "Grounding: In-memory live telemetry + SGP4 ephemerides",
        inputPayload: "cascade_forecast_complete, negotiation_complete, user queries",
        outputPayload: "advisory:new & /api/v1/chat responses",
        description: "Synthesizes concise, actionable operational flight directives and answers natural-language astrodynamics queries.",
        keyMetric: "Event: advisory:new"
      },
      {
        id: "ag_audit",
        stageNumber: "05",
        title: "Cryptographic Audit Ledger",
        subtitle: "Immutable Governance & Compliance",
        layer: "bus",
        icon: Database,
        sourceFile: "lib/backend/audit.ts",
        mathFormula: "SHA-256 Hash Chain: H_n = Hash(H_{n-1} || Action || Timestamp)",
        inputPayload: "All agent actions, maneuver approvals, and crisis injections",
        outputPayload: "AuditEntry[] records queried via GET /api/v1/audit",
        description: "Maintains an immutable, cryptographically verifiable record of all automated collision avoidance decisions and human approvals.",
        keyMetric: "Zero Data Tampering"
      }
    ] as FlowNode[],
    connections: [
      { from: "ag_tracker", to: "ag_risk", label: "State Vectors Delta" },
      { from: "ag_risk", to: "ag_maneuver", label: "High Pc Alert (Pc > 1e-4)" },
      { from: "ag_maneuver", to: "ag_risk", label: "Mitigated State Vector" },
      { from: "ag_maneuver", to: "ag_advisory", label: "Negotiation Complete" },
      { from: "ag_advisory", to: "ag_audit", label: "Advisory Record" },
      { from: "ag_maneuver", to: "ag_audit", label: "Executed Burn Record" }
    ] as FlowConnection[]
  },
  {
    id: "crisis",
    name: "Crisis Breakup & Cascade Simulation",
    description: "Physics pipeline for simulated ASAT kinetic strikes, hypervelocity collisions, and Kessler cascade propagation.",
    nodes: [
      {
        id: "cr_trigger",
        stageNumber: "01",
        title: "Kinetic Breakup Trigger",
        subtitle: "ASAT / Collision / Explosion",
        layer: "crisis",
        icon: Bomb,
        sourceFile: "app/api/v1/crisis/inject/route.ts",
        mathFormula: "POST /api/v1/crisis/inject { type, altitude, fragmentCount, sourceObjectId }",
        inputPayload: "Chaos injection parameters from Command Center modal",
        outputPayload: "CrisisInjectionRequest validated payload",
        description: "Initiates simulated hypervelocity orbital breakup event at designated altitude band with customizable fragment count.",
        keyMetric: "Up to 1,000 fragments"
      },
      {
        id: "cr_gabbard",
        stageNumber: "02",
        title: "Gabbard Velocity Kick Dispersion",
        subtitle: "Isotropic Box-Muller Perturbation",
        layer: "crisis",
        icon: Flame,
        sourceFile: "data/crisis.ts",
        mathFormula: "Δv ~ N(0, σ²),  rBase = R_earth + h,  vCirc = √(μ / rBase)",
        inputPayload: "Breakup options (altitude, fragment count, epicenter)",
        outputPayload: "TrackedObject[] synthetic debris fragments",
        description: "Synthesizes NASA standard breakup fragments with realistic isotropic Gabbard velocity dispersion (±0.08 km/s) and orbital elements.",
        keyMetric: "NASA Standard Breakup Model"
      },
      {
        id: "cr_screening",
        stageNumber: "03",
        title: "Immediate Cascade Screening",
        subtitle: "Multi-Pair Conjunction Detection",
        layer: "astrodynamics",
        icon: ShieldAlert,
        sourceFile: "lib/backend/riskAssessor.ts",
        mathFormula: "ProcessStateUpdate({ epoch, objects: fragments, isDelta: true })",
        inputPayload: "Newly injected fragments inserted into store",
        outputPayload: "Newly flagged close-approach ConjunctionEvent records",
        description: "Runs high-frequency collision screening between injected debris cloud and operational constellations in adjacent shells.",
        keyMetric: "Instantaneous Pair Screening"
      },
      {
        id: "cr_sir",
        stageNumber: "04",
        title: "Shell Density & R₀ Surge",
        subtitle: "SIR Epidemic Runaway Model",
        layer: "astrodynamics",
        icon: Activity,
        sourceFile: "data/cascade.ts",
        mathFormula: "ΔI = +N_fragments,  R₀_new = (β · S_shell) / γ >> 1.0",
        inputPayload: "Updated shell population distributions",
        outputPayload: "cascade_forecast_complete with surge in critical shells",
        description: "Recomputes orbital spatial density and updates Kessler reproduction numbers across all impacted altitude bands.",
        keyMetric: "R₀ shift: e.g. 14.1 → 95.4"
      },
      {
        id: "cr_broadcast",
        stageNumber: "05",
        title: "Broadcast & Evacuation Advisory",
        subtitle: "Real-Time Emergency Alerts",
        layer: "presentation",
        icon: Radio,
        sourceFile: "lib/backend/advisory.ts",
        mathFormula: "Event Broadcast: crisis:injected & advisory:new over SSE/WS",
        inputPayload: "Cascade forecast + Conjunction event spike",
        outputPayload: "Emergency Flight Director Advisory & 3D Globe debris cloud",
        description: "Pushes real-time alerts across mission control dashboards, updates 3D tactical globe, and logs immutable audit records.",
        keyMetric: "Sub-second broadcast"
      }
    ] as FlowNode[],
    connections: [
      { from: "cr_trigger", to: "cr_gabbard", label: "Breakup Specs" },
      { from: "cr_gabbard", to: "cr_screening", label: "Debris Fragment Cloud" },
      { from: "cr_gabbard", to: "cr_sir", label: "Population Delta" },
      { from: "cr_screening", to: "cr_broadcast", label: "New Conjunctions" },
      { from: "cr_sir", to: "cr_broadcast", label: "Supercritical R₀ Alert" }
    ] as FlowConnection[]
  }
];

export function InteractiveArchitectureFlowchart() {
  const [selectedPipelineId, setSelectedPipelineId] = useState<string>("e2e");
  const [selectedNodeId, setSelectedNodeId] = useState<string>("space_track");
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [activeStepIndex, setActiveStepIndex] = useState<number>(-1);

  const currentPipeline = PIPELINES.find((p) => p.id === selectedPipelineId) || PIPELINES[0];
  const selectedNode = currentPipeline.nodes.find((n) => n.id === selectedNodeId) || currentPipeline.nodes[0];

  // Simulation runner
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isSimulating) {
      if (activeStepIndex < currentPipeline.nodes.length - 1) {
        timer = setTimeout(() => {
          const nextIdx = activeStepIndex + 1;
          setActiveStepIndex(nextIdx);
          setSelectedNodeId(currentPipeline.nodes[nextIdx].id);
        }, 1200);
      } else {
        timer = setTimeout(() => {
          setIsSimulating(false);
          setActiveStepIndex(-1);
        }, 1500);
      }
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isSimulating, activeStepIndex, currentPipeline.nodes]);

  const handleStartSimulation = () => {
    setIsSimulating(true);
    setActiveStepIndex(0);
    setSelectedNodeId(currentPipeline.nodes[0].id);
  };

  const handleReset = () => {
    setIsSimulating(false);
    setActiveStepIndex(-1);
    setSelectedNodeId(currentPipeline.nodes[0].id);
  };

  const getLayerColor = (layer: FlowNode["layer"]) => {
    switch (layer) {
      case "ingestion":
        return {
          border: "border-cyan-500/40 hover:border-cyan-400",
          bg: "bg-cyan-950/20",
          text: "text-cyan-400",
          badge: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
          glow: "shadow-[0_0_20px_rgba(6,182,212,0.15)]",
        };
      case "astrodynamics":
        return {
          border: "border-indigo-500/40 hover:border-indigo-400",
          bg: "bg-indigo-950/20",
          text: "text-indigo-400",
          badge: "bg-indigo-500/10 text-indigo-400 border-indigo-500/30",
          glow: "shadow-[0_0_20px_rgba(99,102,241,0.15)]",
        };
      case "agents":
        return {
          border: "border-sky-500/40 hover:border-sky-400",
          bg: "bg-sky-950/20",
          text: "text-sky-400",
          badge: "bg-sky-500/10 text-sky-400 border-sky-500/30",
          glow: "shadow-[0_0_20px_rgba(56,189,248,0.15)]",
        };
      case "bus":
        return {
          border: "border-amber-500/40 hover:border-amber-400",
          bg: "bg-amber-950/20",
          text: "text-amber-400",
          badge: "bg-amber-500/10 text-amber-400 border-amber-500/30",
          glow: "shadow-[0_0_20px_rgba(245,158,11,0.15)]",
        };
      case "presentation":
        return {
          border: "border-emerald-500/40 hover:border-emerald-400",
          bg: "bg-emerald-950/20",
          text: "text-emerald-400",
          badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
          glow: "shadow-[0_0_20px_rgba(16,185,129,0.15)]",
        };
      case "crisis":
        return {
          border: "border-red-500/40 hover:border-red-400",
          bg: "bg-red-950/20",
          text: "text-red-400",
          badge: "bg-red-500/10 text-red-400 border-red-500/30",
          glow: "shadow-[0_0_20px_rgba(239,68,68,0.15)]",
        };
    }
  };

  return (
    <div className="w-full space-y-6 font-sans">
      {/* Top Controls Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-card border border-border/80 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px] font-mono text-cyan-400 border-cyan-500/30 gap-1">
              <Sparkles className="w-3 h-3" /> NOTEBOOK-STYLE ARCHITECTURE CANVAS
            </Badge>
            <span className="text-xs font-mono text-muted-foreground">
              {currentPipeline.nodes.length} STAGES • LIVE ASTRODYNAMICS
            </span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-foreground mt-1 flex items-center gap-2">
            <Compass className="w-5 h-5 text-cyan-400" />
            Interactive System Flowchart & Protocol Graph
          </h2>
        </div>

        {/* Pipeline Mode Switcher & Simulation Button */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-muted/60 p-1 rounded-xl border border-border/70 font-mono text-xs">
            {PIPELINES.map((pipe) => (
              <button
                key={pipe.id}
                type="button"
                onClick={() => {
                  setSelectedPipelineId(pipe.id);
                  setSelectedNodeId(pipe.nodes[0].id);
                  setIsSimulating(false);
                  setActiveStepIndex(-1);
                }}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  selectedPipelineId === pipe.id
                    ? "bg-card text-foreground font-bold shadow-sm border border-border"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {pipe.name.split(" ")[0]} Flow
              </button>
            ))}
          </div>

          <Button
            size="sm"
            onClick={isSimulating ? handleReset : handleStartSimulation}
            className={`gap-1.5 font-mono text-xs font-bold shrink-0 ${
              isSimulating
                ? "bg-amber-500 hover:bg-amber-600 text-black animate-pulse"
                : "bg-cyan-500 hover:bg-cyan-400 text-black shadow-md"
            }`}
          >
            {isSimulating ? (
              <>
                <RotateCcw className="w-3.5 h-3.5" /> Stop Pulse ({activeStepIndex + 1}/{currentPipeline.nodes.length})
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" /> Run Simulated Telemetry Pulse
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Main Flowchart Canvas & Node Inspector Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Visual Node Flow Grid */}
        <div className="xl:col-span-8 space-y-4">
          <div className="p-6 rounded-2xl bg-card border border-border/80 shadow-md relative overflow-hidden">
            {/* Ambient Background Grid */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-border/50">
                <div>
                  <h3 className="font-extrabold text-base text-foreground flex items-center gap-2">
                    <Boxes className="w-4 h-4 text-cyan-400" />
                    {currentPipeline.name}
                  </h3>
                  <p className="text-xs text-muted-foreground font-mono mt-0.5">
                    {currentPipeline.description}
                  </p>
                </div>
                <Badge variant="outline" className="font-mono text-[10px] text-muted-foreground">
                  CLICK ANY NODE TO INSPECT
                </Badge>
              </div>

              {/* Node Cards Stream */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentPipeline.nodes.map((node, index) => {
                  const Icon = node.icon;
                  const isSelected = selectedNodeId === node.id;
                  const isSimulatingActive = activeStepIndex === index;
                  const styling = getLayerColor(node.layer);

                  return (
                    <div
                      key={node.id}
                      onClick={() => {
                        setSelectedNodeId(node.id);
                        if (!isSimulating) setActiveStepIndex(index);
                      }}
                      className={`group p-4 rounded-xl border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between min-h-[140px] ${
                        isSelected
                          ? `${styling.border} ${styling.bg} ${styling.glow} ring-2 ring-cyan-500/50 scale-[1.02]`
                          : "bg-muted/20 border-border/70 hover:border-border hover:bg-muted/40"
                      } ${isSimulatingActive ? "ring-4 ring-cyan-400 animate-pulse bg-cyan-950/30" : ""}`}
                    >
                      {/* Top Bar of Card */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[11px] font-extrabold px-2 py-0.5 rounded bg-background border border-border text-foreground/80">
                            STAGE {node.stageNumber}
                          </span>
                          <span className={`text-[9px] font-mono px-2 py-0.5 rounded uppercase font-bold border ${styling.badge}`}>
                            {node.layer}
                          </span>
                        </div>
                        <div className={`p-1.5 rounded-lg border ${isSelected ? "bg-background text-cyan-400 border-cyan-500/40" : "bg-card text-muted-foreground border-border"}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                      </div>

                      {/* Main Title & Subtitle */}
                      <div>
                        <h4 className="font-bold text-sm text-foreground group-hover:text-cyan-400 transition-colors flex items-center gap-1.5">
                          {node.title}
                        </h4>
                        <p className="text-[11px] font-mono text-muted-foreground mt-0.5">
                          {node.subtitle}
                        </p>
                      </div>

                      {/* Bottom Footer Info */}
                      <div className="mt-3 pt-2 border-t border-border/40 flex items-center justify-between text-[10px] font-mono">
                        <span className="text-muted-foreground truncate max-w-[150px]">
                          {node.sourceFile}
                        </span>
                        <span className={`font-semibold ${styling.text}`}>
                          {node.keyMetric}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Data Connections Footprint */}
              <div className="mt-6 pt-4 border-t border-border/50">
                <span className="text-[10px] font-mono uppercase text-muted-foreground font-bold block mb-2">
                  Active Inter-Agent Data Flow Envelopes:
                </span>
                <div className="flex flex-wrap gap-2 font-mono text-[11px]">
                  {currentPipeline.connections.map((conn, cIdx) => (
                    <div
                      key={cIdx}
                      className="px-2.5 py-1 rounded-lg bg-muted/40 border border-border/70 text-foreground/90 flex items-center gap-1.5"
                    >
                      <span className="text-cyan-400 font-bold">{conn.from}</span>
                      <ArrowRight className="w-3 h-3 text-muted-foreground" />
                      <span className="text-emerald-400 font-bold">{conn.to}</span>
                      {conn.label && (
                        <span className="text-[10px] text-muted-foreground ml-1">
                          ({conn.label})
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Selected Node Deep-Dive Inspector */}
        <div className="xl:col-span-4 space-y-4">
          {selectedNode && (
            <div className="p-6 rounded-2xl bg-card border border-border/80 shadow-md space-y-5 sticky top-20">
              {/* Header */}
              <div className="pb-3 border-b border-border/60">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-mono text-cyan-400 font-bold">
                    NODE INSPECTOR • STAGE {selectedNode.stageNumber}
                  </span>
                  <Badge className="font-mono text-[10px] uppercase font-bold bg-primary/20 text-primary border-primary/30">
                    {selectedNode.layer}
                  </Badge>
                </div>
                <h3 className="text-lg font-bold text-foreground mt-1">
                  {selectedNode.title}
                </h3>
                <p className="text-xs font-mono text-muted-foreground mt-0.5">
                  {selectedNode.subtitle}
                </p>
              </div>

              {/* Description */}
              <div>
                <span className="text-[10px] font-mono uppercase text-muted-foreground font-bold block mb-1">
                  Operational Purpose:
                </span>
                <p className="text-xs text-foreground/90 leading-relaxed font-sans">
                  {selectedNode.description}
                </p>
              </div>

              {/* Math Formulation */}
              {selectedNode.mathFormula && (
                <div>
                  <span className="text-[10px] font-mono uppercase text-amber-400 font-bold block mb-1">
                    Governing Physics / Math:
                  </span>
                  <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/30 font-mono text-xs text-amber-300 leading-relaxed">
                    {selectedNode.mathFormula}
                  </div>
                </div>
              )}

              {/* Payload Inputs & Outputs */}
              <div className="space-y-3 font-mono text-xs">
                {selectedNode.inputPayload && (
                  <div>
                    <span className="text-[10px] uppercase text-muted-foreground font-bold block mb-1">
                      Inbound Payload Envelope:
                    </span>
                    <div className="p-2.5 rounded-lg bg-muted/40 border border-border text-[11px] text-foreground/80">
                      {selectedNode.inputPayload}
                    </div>
                  </div>
                )}

                {selectedNode.outputPayload && (
                  <div>
                    <span className="text-[10px] uppercase text-emerald-400 font-bold block mb-1">
                      Outbound Dispatched Contract:
                    </span>
                    <div className="p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-500/30 text-[11px] text-emerald-300">
                      {selectedNode.outputPayload}
                    </div>
                  </div>
                )}
              </div>

              {/* Implementation File & Performance */}
              <div className="pt-3 border-t border-border/50 flex flex-col gap-2 font-mono text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-[10px]">Source Target:</span>
                  <code className="text-cyan-400 bg-cyan-950/30 px-2 py-0.5 rounded border border-cyan-500/30 text-[11px]">
                    {selectedNode.sourceFile}
                  </code>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground text-[10px]">Benchmarked SLA:</span>
                  <span className="font-bold text-emerald-400">{selectedNode.keyMetric}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
