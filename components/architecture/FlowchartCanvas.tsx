"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Radio,
  Orbit,
  Cpu,
  Database,
  Layers,
  Sparkles,
  Play,
  RotateCcw,
  Zap,
  ShieldAlert,
  GitBranch,
  Terminal,
  Activity,
  Boxes,
  FileCode,
  Flame,
  Bomb,
  Compass,
  Check,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Workflow,
  Search,
  Filter,
  ArrowUpRight,
  ChevronRight,
  ShieldCheck,
  Binary,
  Code2,
  Network,
  Share2,
  Lock,
  Eye,
  SlidersHorizontal,
  Info,
  Tag,
  MousePointerClick
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface CanvasNode {
  id: string;
  x: number; // px coordinate in canvas
  y: number;
  width: number;
  height: number;
  stageNumber?: string;
  type: "process" | "decision" | "agent" | "storage" | "terminal" | "math";
  title: string;
  subtitle: string;
  layer: "ingestion" | "astrodynamics" | "agents" | "bus" | "presentation" | "crisis";
  icon: React.ElementType;
  sourceFile: string;
  mathFormula?: string;
  inputContract?: string;
  outputContract?: string;
  description: string;
  keyMetric: string;
  techStack?: string[];
  conditionLabel?: string;
}

export interface CanvasEdge {
  id: string;
  from: string;
  to: string;
  label?: string;
  flowDirection?: "forward" | "feedback" | "conditional_yes" | "conditional_no" | "branch";
  color?: string;
  customRouting?: "horizontal" | "vertical" | "ortho_down" | "ortho_up" | "feedback_bottom" | "feedback_top";
}

export interface FlowchartDiagram {
  id: string;
  name: string;
  badge: string;
  category: string;
  description: string;
  width: number;
  height: number;
  nodes: CanvasNode[];
  edges: CanvasEdge[];
}

const FLOWCHARTS: FlowchartDiagram[] = [
  {
    id: "e2e_system",
    name: "End-to-End Astrodynamic Mission Pipeline",
    badge: "COMPLETE MISSION ARCHITECTURE",
    category: "Full Architecture",
    description: "Multi-stage pipeline spanning real-time space telemetry ingestion, SGP4 perturbation propagation, Foster-1992 B-plane collision screening, autonomous Gemini multi-agent negotiation, and 3D WebGL tactical visualization.",
    width: 1480,
    height: 720,
    nodes: [
      // STAGE 1: INGESTION (Col 1, X = 40)
      {
        id: "e2e_spacetrack",
        x: 40,
        y: 60,
        width: 270,
        height: 130,
        stageNumber: "01",
        type: "terminal",
        title: "Space-Track Ingestion",
        subtitle: "External Ephemeris Feeds",
        layer: "ingestion",
        icon: Radio,
        sourceFile: "data/spacetrack.ts",
        mathFormula: "Rate Limit: 20-30 req/min · 10m TTL Cache · Auth Session (/ajaxauth/login)",
        inputContract: "US Space Force 18th SDS CDMs & NORAD GP TLE feeds",
        outputContract: "Raw Ephemeris String Payloads & JSON Orbit Sets",
        description: "Maintains authenticated TLS sessions with Space-Track API and falls back to CelesTrak active GP sets to ingest orbit elements for 11,000+ cataloged space objects.",
        keyMetric: "11,200+ Ephemerides Ingested",
        techStack: ["HTTPS / TLS", "Space-Track API", "CelesTrak GP", "In-Memory TTL"]
      },
      {
        id: "e2e_parser",
        x: 40,
        y: 280,
        width: 270,
        height: 130,
        stageNumber: "02",
        type: "process",
        title: "Parser & Normalizer",
        subtitle: "TEME → ECI J2000 / ECEF",
        layer: "ingestion",
        icon: GitBranch,
        sourceFile: "data/parser.ts",
        mathFormula: "r_ECI = R_z(-θ_GMST) · r_TEME;  r_ECEF = R_z(θ_GAST) · r_ECI",
        inputContract: "Raw Two-Line Element (TLE) Strings + Kozai Mean Elements",
        outputContract: "TrackedObject { id, position: [3], velocity: [3], cov: [6] }",
        description: "Validates epoch timestamps, parses inclination, eccentricity, mean motion, and transforms TEME frames into standardized inertial ECI J2000 and WGS84 ECEF coordinates.",
        keyMetric: "< 1.2ms / 500 objects",
        techStack: ["TEME", "ECI J2000", "WGS84", "Matrix Rotation"]
      },
      {
        id: "e2e_presentation",
        x: 40,
        y: 500,
        width: 270,
        height: 130,
        stageNumber: "11",
        type: "terminal",
        title: "Mission Control UI",
        subtitle: "3D WebGL Globe & Advisory Copilot",
        layer: "presentation",
        icon: Layers,
        sourceFile: "components/globe/GlobeView.tsx",
        mathFormula: "Three.js 60 FPS Hardware-Accelerated WebGL Tactical View",
        inputContract: "SSE Telemetry Streams + REST API endpoints (/api/v1/*)",
        outputContract: "Interactive 3D Orbit Tracks, Conjunction Dossiers, Copilot Chat",
        description: "Hardware-accelerated mission control interface displaying real-time 3D orbit tracks, miss distance envelopes, and natural language flight director copilot.",
        keyMetric: "60 FPS 3D Tactical Rendering",
        techStack: ["Three.js / WebGL", "React 19", "Tailwind CSS", "SSE Client"]
      },

      // STAGE 2: PROPAGATION & CULLING (Col 2, X = 400)
      {
        id: "e2e_sgp4",
        x: 400,
        y: 60,
        width: 270,
        height: 130,
        stageNumber: "03",
        type: "process",
        title: "SGP4 Propagator",
        subtitle: "Geopotential & Drag Engine",
        layer: "astrodynamics",
        icon: Orbit,
        sourceFile: "data/propagator.ts",
        mathFormula: "r(t), v(t) = SGP4(Elements, t - t₀) + J₂, J₃, J₄ Geopotential + B* Drag",
        inputContract: "TrackedObject[] catalog + Target Epoch Timestamp (dt = 10s)",
        outputContract: "StateVectorsUpdatedPayload { epoch, objects, isDelta }",
        description: "Propagates thousands of space objects concurrently in sub-30ms cycles incorporating Earth zonal harmonics and atmospheric drag density models.",
        keyMetric: "24.7ms Batch Cycle",
        techStack: ["SGP4 v2.4", "Kozai-Brouwer", "J2-J4 Harmonics", "Web Workers"]
      },
      {
        id: "e2e_culling",
        x: 400,
        y: 280,
        width: 270,
        height: 130,
        stageNumber: "04",
        type: "process",
        title: "Spatial Proximity Culler",
        subtitle: "Octree Bounding-Sphere Filter",
        layer: "astrodynamics",
        icon: Boxes,
        sourceFile: "data/collision.ts",
        mathFormula: "||r₁ - r₂|| ≤ (R_cull = 50.0 km);  Filtered Candidates: N_pairs ≪ N²",
        inputContract: "Active State Vectors from SGP4 Propagator",
        outputContract: "CandidateConjunctionPair[] (Miss Distance < 50 km)",
        description: "Hierarchical bounding-sphere proximity culling that prunes millions of non-interacting pairs down to active close-encounter candidates within 50 km envelopes.",
        keyMetric: "O(N log N) Spatial Filter",
        techStack: ["Spatial Octree", "Bounding Sphere", "Fast Culling"]
      },
      {
        id: "e2e_ledger",
        x: 400,
        y: 500,
        width: 270,
        height: 130,
        stageNumber: "10",
        type: "storage",
        title: "Message Bus & Ledger",
        subtitle: "Cryptographic SHA-256 State Store",
        layer: "bus",
        icon: Database,
        sourceFile: "lib/backend/store.ts",
        mathFormula: "H_n = SHA-256(H_{n-1} || Action || Timestamp || Δv)",
        inputContract: "ManeuverProposals, Audit Entries, Shell Status Updates",
        outputContract: "Thread-Safe State Snapshot & SSE Real-Time Stream (/api/v1/events)",
        description: "In-memory event bus and tamper-proof cryptographic hash chain ledger preserving an immutable compliance record of every autonomous burn decision.",
        keyMetric: "Sub-millisecond State Sync",
        techStack: ["SHA-256 Hash Chain", "Pub/Sub Bus", "SSE Streams", "In-Memory Store"]
      },

      // STAGE 3: B-PLANE SCREENING & KESSLER (Col 3, X = 760)
      {
        id: "e2e_foster",
        x: 760,
        y: 60,
        width: 270,
        height: 130,
        stageNumber: "05",
        type: "process",
        title: "Foster-1992 Screener",
        subtitle: "2D Covariance Gaussian Integral",
        layer: "astrodynamics",
        icon: ShieldAlert,
        sourceFile: "data/collision.ts",
        mathFormula: "P_c = (1 / 2π√|C_B|) ∬ exp(-0.5 rᵀ C_B⁻¹ r) dx dy across hard-body radius",
        inputContract: "Primary & Secondary 3D Covariance Matrices C₁, C₂ + Relative Velocity",
        outputContract: "ConjunctionEvent { id, missDistance, relativeVelocity, Pc, riskLevel }",
        description: "Projects 3D combined error ellipsoids onto the 2D encounter B-plane perpendicular to relative velocity and evaluates Gaussian probability over hard-body radii.",
        keyMetric: "2D B-Plane Precision",
        techStack: ["Foster-1992", "Covariance Projection", "Gaussian Integration"]
      },
      {
        id: "e2e_triage",
        x: 760,
        y: 280,
        width: 270,
        height: 130,
        stageNumber: "06",
        type: "decision",
        title: "Risk Action Triage",
        subtitle: "NASA / ESA Action Criteria",
        layer: "astrodynamics",
        icon: Activity,
        sourceFile: "lib/backend/riskAssessor.ts",
        mathFormula: "Risk = CRITICAL (P_c ≥ 10⁻⁴) | ELEVATED (P_c ≥ 10⁻⁵) | NOMINAL (P_c < 10⁻⁵)",
        inputContract: "Evaluated ConjunctionEvent records with calculated Pc",
        outputContract: "HighPcConjunctionAlert (Pc ≥ 1.0e-4) | Nominal Monitoring",
        description: "Classifies close approaches into operational risk tiers following NASA Goddard and ESA Space Debris Office action limits, triaging mandatory avoidance burns.",
        keyMetric: "Red Action Limit: Pc ≥ 10⁻⁴",
        techStack: ["NASA Action Criteria", "ESA SDO Tiers", "Automated Triage"],
        conditionLabel: "P_c ≥ 10⁻⁴ (Action Req.)?"
      },
      {
        id: "e2e_kessler",
        x: 760,
        y: 500,
        width: 270,
        height: 130,
        stageNumber: "09",
        type: "process",
        title: "Kessler SIR Forecaster",
        subtitle: "51 Orbital Shell Density Equations",
        layer: "astrodynamics",
        icon: Flame,
        sourceFile: "data/cascade.ts",
        mathFormula: "dS/dt = -β·S·I + α,  dI/dt = β·S·I - γ·I,  R₀ = (β·S₀) / γ",
        inputContract: "Shell population counts across 50 km altitude bands (200km - 2000km)",
        outputContract: "ShellRiskSnapshot[] with Supercritical R₀ Tipping Point Alerts",
        description: "Models orbital debris collisions as an epidemiological SIR process, identifying runaway cascade conditions when the basic reproduction ratio R₀ exceeds 1.0.",
        keyMetric: "51 Altitude Regimes",
        techStack: ["Epidemic SIR", "Runge-Kutta", "Kessler Threshold", "50-Year Simulation"]
      },

      // STAGE 4: AI SWARM & VALIDATION (Col 4, X = 1120)
      {
        id: "e2e_agents",
        x: 1120,
        y: 60,
        width: 300,
        height: 130,
        stageNumber: "07",
        type: "agent",
        title: "Gemini 2.5 Multi-Agent Swarm",
        subtitle: "Bilateral Game-Theoretic Solver",
        layer: "agents",
        icon: Cpu,
        sourceFile: "lib/backend/maneuverNegotiation.ts",
        mathFormula: "max (U_A - d_A)^α (U_B - d_B)^(1-α),  Δm = m₀(1 - exp(-Δv / (I_sp · g₀)))",
        inputContract: "Critical Conjunction Event + Operator Propellant Reserves",
        outputContract: "ManeuverProposal { burnVector, assignedOperator, deltaV, rationale }",
        description: "Autonomous LLM bargaining engine using a 12-key Gemini 2.5 Flash load-balancing rotator to compute Pareto-optimal maneuver burns between commercial operators.",
        keyMetric: "12-Key Failover Pool",
        techStack: ["Gemini 2.5 Flash", "Nash Bargaining", "Tsiolkovsky Math", "Zero-Thinking Optimization"]
      },
      {
        id: "e2e_rescreen",
        x: 1120,
        y: 280,
        width: 300,
        height: 130,
        stageNumber: "08",
        type: "process",
        title: "Post-Burn Trajectory Re-Screen",
        subtitle: "Zero Secondary Risk Verification",
        layer: "astrodynamics",
        icon: Zap,
        sourceFile: "data/propagator.ts",
        mathFormula: "d²x/dt² - 2n(dy/dt) - 3n²x = f_x,  y_{n+1} = y_n + (h/6)(k₁ + 2k₂ + 2k₃ + k₄)",
        inputContract: "Proposed Maneuver Burn Vector (Δv_radial, Δv_intrack, Δv_crosstrack)",
        outputContract: "Post-Maneuver Clearance Dossier (P_c(t_post) < 10⁻⁷)",
        description: "Simulates impulsive maneuver with Runge-Kutta 4th order propagation to verify that the planned avoidance trajectory does not create secondary collision risks.",
        keyMetric: "Clearance: P_c < 10⁻⁷",
        techStack: ["Clohessy-Wiltshire", "Runge-Kutta 4th", "Secondary Screening"]
      }
    ],
    edges: [
      // Stage 1 Ingestion flow
      { id: "e1", from: "e2e_spacetrack", to: "e2e_parser", label: "Raw TLE & CDM Strings", flowDirection: "forward", color: "#06b6d4", customRouting: "vertical" },
      { id: "e2", from: "e2e_parser", to: "e2e_sgp4", label: "TrackedObject[]", flowDirection: "forward", color: "#6366f1", customRouting: "ortho_up" },
      
      // Stage 2 Propagation flow
      { id: "e3", from: "e2e_sgp4", to: "e2e_culling", label: "High-Freq State Vectors", flowDirection: "forward", color: "#6366f1", customRouting: "vertical" },
      { id: "e4", from: "e2e_culling", to: "e2e_foster", label: "Encounter Pairs (d < 50km)", flowDirection: "forward", color: "#6366f1", customRouting: "ortho_up" },
      
      // Stage 3 Screening & Triage flow
      { id: "e5", from: "e2e_foster", to: "e2e_triage", label: "Computed Collision Prob Pc", flowDirection: "forward", color: "#f43f5e", customRouting: "vertical" },
      { id: "e6", from: "e2e_triage", to: "e2e_agents", label: "P_c ≥ 10⁻⁴ Critical Alert", flowDirection: "conditional_yes", color: "#ef4444", customRouting: "ortho_up" },
      { id: "e7", from: "e2e_triage", to: "e2e_kessler", label: "Conjunction Density", flowDirection: "forward", color: "#f59e0b", customRouting: "ortho_down" },
      
      // Stage 4 Swarm & Re-Screening
      { id: "e8", from: "e2e_agents", to: "e2e_rescreen", label: "Proposed Avoidance Burn Δv", flowDirection: "forward", color: "#38bdf8", customRouting: "vertical" },
      { id: "e9", from: "e2e_rescreen", to: "e2e_agents", label: "Secondary Hazard (Re-bargain)", flowDirection: "feedback", color: "#f59e0b", customRouting: "feedback_top" },
      { id: "e10", from: "e2e_rescreen", to: "e2e_ledger", label: "Validated Burn Agreement", flowDirection: "forward", color: "#10b981", customRouting: "ortho_down" },
      
      // Stage 5 Ledger & Presentation
      { id: "e11", from: "e2e_kessler", to: "e2e_ledger", label: "Supercritical R₀ Snapshots", flowDirection: "forward", color: "#f59e0b", customRouting: "horizontal" },
      { id: "e12", from: "e2e_ledger", to: "e2e_presentation", label: "SSE Push Broadcast (/events)", flowDirection: "forward", color: "#10b981", customRouting: "horizontal" },
      { id: "e13", from: "e2e_rescreen", to: "e2e_sgp4", label: "Apply Trajectory Δv to State Vector", flowDirection: "feedback", color: "#a855f7", customRouting: "feedback_top" }
    ]
  },
  {
    id: "agent_arbitration",
    name: "Autonomous Multi-Agent Negotiation Swarm",
    badge: "BILATERAL GAME THEORY & LLM SWARM",
    category: "AI Negotiation",
    description: "Multi-agent negotiation protocol resolving high-risk close approaches between competing commercial operators using bilateral game theory and fuel optimization.",
    width: 1400,
    height: 640,
    nodes: [
      {
        id: "ag_tracker",
        x: 40,
        y: 80,
        width: 270,
        height: 130,
        stageNumber: "01",
        type: "agent",
        title: "Tracker Agent",
        subtitle: "Catalog Ingestion & State Delta",
        layer: "agents",
        icon: Radio,
        sourceFile: "lib/backend/tracker.ts",
        mathFormula: "SGP4 Propagation: r(t), v(t) state vector delta updates",
        inputContract: "Space-Track CDM & CelesTrak TLE streams",
        outputContract: "state_vectors_updated & shell_population_updated",
        description: "Monitors active catalog and publishes delta state vectors on high-frequency intervals.",
        keyMetric: "Continuous Telemetry",
        techStack: ["SGP4 v2.4", "State Vector Sync", "Delta Detection"]
      },
      {
        id: "ag_risk",
        x: 370,
        y: 80,
        width: 270,
        height: 130,
        stageNumber: "02",
        type: "decision",
        title: "Risk Assessor Agent",
        subtitle: "B-Plane Encounter Screener",
        layer: "agents",
        icon: ShieldAlert,
        sourceFile: "lib/backend/riskAssessor.ts",
        mathFormula: "Foster-1992 Pc integral over combined hard-body cross section",
        inputContract: "state_vectors_updated event",
        outputContract: "high_pc_conjunction (Pc ≥ 1.0e-4)",
        description: "Screens close approaches and computes collision probability against 3D covariance error ellipsoids.",
        keyMetric: "Event: high_pc_conjunction",
        techStack: ["Foster-1992", "Covariance Matrix", "Risk Tiers"],
        conditionLabel: "Pc ≥ 1.0e-4 ?"
      },
      {
        id: "ag_op_a",
        x: 700,
        y: 50,
        width: 280,
        height: 120,
        stageNumber: "03A",
        type: "agent",
        title: "Operator Proxy A (Starlink)",
        subtitle: "Autonomous Space Dynamics Agent",
        layer: "agents",
        icon: Cpu,
        sourceFile: "lib/backend/maneuverNegotiation.ts",
        mathFormula: "U_A = -w_A · Δv_A - λ_A · RiskPenalty",
        inputContract: "Conjunction dossier + Fuel: 84% + Krypton Thruster specs",
        outputContract: "Bargaining Proposal A: Burns +0.4 m/s (In-Track)",
        description: "Defends SpaceX Starlink asset interests, computing fuel expenditure trade-offs and proposing avoidance burns.",
        keyMetric: "Starlink Fleet Proxy",
        techStack: ["Gemini 2.5 Flash", "Utility Function", "Propellant Ledger"]
      },
      {
        id: "ag_op_b",
        x: 700,
        y: 200,
        width: 280,
        height: 120,
        stageNumber: "03B",
        type: "agent",
        title: "Operator Proxy B (OneWeb)",
        subtitle: "Autonomous Space Dynamics Agent",
        layer: "agents",
        icon: Cpu,
        sourceFile: "lib/backend/maneuverNegotiation.ts",
        mathFormula: "U_B = -w_B · Δv_B - λ_B · RiskPenalty",
        inputContract: "Conjunction dossier + Fuel: 19% + Xenon Thruster specs",
        outputContract: "Bargaining Proposal B: Coasts (0.0 m/s)",
        description: "Defends Eutelsat OneWeb asset interests, seeking to avoid unnecessary fuel depletion given low propellant reserves.",
        keyMetric: "OneWeb Fleet Proxy",
        techStack: ["Gemini 2.5 Flash", "Utility Function", "Fuel Conservation"]
      },
      {
        id: "ag_nash",
        x: 1040,
        y: 80,
        width: 300,
        height: 130,
        stageNumber: "04",
        type: "agent",
        title: "Bilateral Nash Bargaining",
        subtitle: "Pareto-Optimal Consensus Arbiter",
        layer: "agents",
        icon: Sparkles,
        sourceFile: "lib/ai/geminiRotator.ts",
        mathFormula: "max (U_A - d_A)^α (U_B - d_B)^(1-α)  s.t.  d_post ≥ 25 km",
        inputContract: "Operator A & Operator B competing utility envelopes",
        outputContract: "ManeuverProposal { operatorAssigned, burnVector, deltaV }",
        description: "Solves the cooperative game-theoretic bargaining problem to find the unique Pareto-optimal consensus burn agreement.",
        keyMetric: "Solved in 320ms",
        techStack: ["Nash Equilibrium", "Pareto Optimal", "12-Key Rotator"]
      },
      {
        id: "ag_rescreen",
        x: 1040,
        y: 360,
        width: 300,
        height: 130,
        stageNumber: "05",
        type: "process",
        title: "Post-Burn SGP4 Re-Screen",
        subtitle: "Trajectory Safety Validation",
        layer: "astrodynamics",
        icon: Orbit,
        sourceFile: "data/propagator.ts",
        mathFormula: "v_new = v_initial + ΔV_burn,  Pc_post < 10⁻⁷ ?",
        inputContract: "ManeuverProposal burn vector",
        outputContract: "Secondary Conjunction Screening Clearance",
        description: "Validates that the proposed avoidance burn does not induce secondary conjunctions with other orbital objects.",
        keyMetric: "Target: Pc < 1.0e-7",
        techStack: ["SGP4 Verification", "Secondary Hazard Filter"],
        conditionLabel: "Secondary Conjunction?"
      },
      {
        id: "ag_advisory",
        x: 700,
        y: 360,
        width: 280,
        height: 130,
        stageNumber: "06",
        type: "agent",
        title: "STC Advisory Agent",
        subtitle: "Automated Flight Director",
        layer: "agents",
        icon: Terminal,
        sourceFile: "lib/backend/advisory.ts",
        mathFormula: "Grounded Telemetry Briefing + Executive Bulletins",
        inputContract: "Negotiation outcome & clearance status",
        outputContract: "AdvisoryMessage Bulletin + /api/v1/chat answers",
        description: "Synthesizes multi-agent negotiation decisions into executive bulletins and advises human flight directors.",
        keyMetric: "Sub-second briefing",
        techStack: ["Gemini 2.5 Flash", "Executive Briefings", "Action Bulletins"]
      },
      {
        id: "ag_audit",
        x: 370,
        y: 360,
        width: 270,
        height: 130,
        stageNumber: "07",
        type: "storage",
        title: "Cryptographic Audit Ledger",
        subtitle: "Immutable Compliance Record",
        layer: "bus",
        icon: Database,
        sourceFile: "lib/backend/audit.ts",
        mathFormula: "H_n = SHA-256(H_{n-1} || Decision || Payload)",
        inputContract: "Executed burns, agent rationale, timestamps",
        outputContract: "AuditEntry[] records queried via GET /api/v1/audit",
        description: "Immutable ledger logging every autonomous decision, fuel penalty, and human director approval.",
        keyMetric: "Zero Tampering",
        techStack: ["SHA-256 Chain", "Compliance Audit", "Tamper Evident"]
      },
      {
        id: "ag_copilot",
        x: 40,
        y: 360,
        width: 270,
        height: 130,
        stageNumber: "08",
        type: "terminal",
        title: "Mission Operator Copilot",
        subtitle: "Natural Language Chat & Override",
        layer: "presentation",
        icon: Terminal,
        sourceFile: "app/(auth)/chat/page.tsx",
        mathFormula: "2-Way Grounded Telemetry Copilot & Approval",
        inputContract: "Flight Director prompt / manual burn approval",
        outputContract: "Instant AI Astrodynamic analysis & Command Actions",
        description: "Interactive operator console providing real-time AI situational awareness and manual flight clearance overrides.",
        keyMetric: "Manual Flight Clearance",
        techStack: ["Chat Console", "Human-in-the-loop", "Override Protocol"]
      }
    ],
    edges: [
      { id: "ea1", from: "ag_tracker", to: "ag_risk", label: "State Delta", flowDirection: "forward", color: "#06b6d4", customRouting: "horizontal" },
      { id: "ea2", from: "ag_risk", to: "ag_op_a", label: "Pc > 1e-4 Alert", flowDirection: "conditional_yes", color: "#ef4444", customRouting: "ortho_up" },
      { id: "ea3", from: "ag_risk", to: "ag_op_b", label: "Pc > 1e-4 Alert", flowDirection: "conditional_yes", color: "#ef4444", customRouting: "ortho_down" },
      { id: "ea4", from: "ag_op_a", to: "ag_nash", label: "Utility Envelope A", flowDirection: "forward", color: "#38bdf8", customRouting: "horizontal" },
      { id: "ea5", from: "ag_op_b", to: "ag_nash", label: "Utility Envelope B", flowDirection: "forward", color: "#a855f7", customRouting: "horizontal" },
      { id: "ea6", from: "ag_nash", to: "ag_rescreen", label: "Agreed Burn Vector", flowDirection: "forward", color: "#10b981", customRouting: "vertical" },
      { id: "ea7", from: "ag_rescreen", to: "ag_nash", label: "Secondary Hazard (Re-bargain)", flowDirection: "feedback", color: "#f59e0b", customRouting: "feedback_top" },
      { id: "ea8", from: "ag_rescreen", to: "ag_advisory", label: "Clearance Granted", flowDirection: "forward", color: "#10b981", customRouting: "horizontal" },
      { id: "ea9", from: "ag_advisory", to: "ag_audit", label: "Log Advisory Bulletin", flowDirection: "forward", color: "#38bdf8", customRouting: "horizontal" },
      { id: "ea10", from: "ag_advisory", to: "ag_copilot", label: "Push Real-Time Alert", flowDirection: "forward", color: "#10b981", customRouting: "horizontal" },
      { id: "ea11", from: "ag_copilot", to: "ag_audit", label: "Operator Approval / Override", flowDirection: "forward", color: "#a855f7", customRouting: "horizontal" }
    ]
  },
  {
    id: "crisis_cascade",
    name: "Crisis Kinetic Breakup & Kessler Cascade Forecaster",
    badge: "CHAOS INJECTION & DEBRIS DYNAMICS",
    category: "Crisis & Epidemiology",
    description: "Hypervelocity fragmentation modeling, Gabbard isotropic velocity dispersion, spatial density surges, and multi-shell Kessler runaway cascade forecasting.",
    width: 1400,
    height: 640,
    nodes: [
      {
        id: "ck_trigger",
        x: 40,
        y: 80,
        width: 270,
        height: 130,
        stageNumber: "01",
        type: "terminal",
        title: "Breakup Event Trigger",
        subtitle: "ASAT / Hypervelocity Collision",
        layer: "crisis",
        icon: Bomb,
        sourceFile: "app/api/v1/crisis/inject/route.ts",
        mathFormula: "POST /api/v1/crisis/inject { type, altitude, fragmentCount }",
        inputContract: "Chaos Injection parameters from Command Center",
        outputContract: "Validated Crisis Request Payload",
        description: "Simulates catastrophic fragmentation of satellite or debris body at designated altitude band.",
        keyMetric: "Up to 1,000 Debris Fragments",
        techStack: ["Crisis API", "Breakup Epicenter", "Chaos Injector"]
      },
      {
        id: "ck_gabbard",
        x: 370,
        y: 80,
        width: 270,
        height: 130,
        stageNumber: "02",
        type: "process",
        title: "Gabbard Velocity Kick",
        subtitle: "Isotropic Box-Muller Model",
        layer: "crisis",
        icon: Flame,
        sourceFile: "data/crisis.ts",
        mathFormula: "Δv ~ N(0, σ² = 0.08 km/s),  r = R_E + h,  v_circ = √(μ / r)",
        inputContract: "Epicenter, Altitude, Target Satellite State",
        outputContract: "TrackedObject[] synthetic debris cloud",
        description: "Generates NASA standard breakup debris cloud with realistic isotropic velocity kicks and orbital element dispersion.",
        keyMetric: "NASA Standard Breakup Model",
        techStack: ["Box-Muller", "Gabbard Diagram", "Isotropic Velocity"]
      },
      {
        id: "ck_screening",
        x: 700,
        y: 80,
        width: 280,
        height: 130,
        stageNumber: "03",
        type: "process",
        title: "Hypervelocity Screening",
        subtitle: "Multi-Pair Conjunction Screener",
        layer: "astrodynamics",
        icon: ShieldAlert,
        sourceFile: "lib/backend/riskAssessor.ts",
        mathFormula: "Foster-1992 screening across all active constellations",
        inputContract: "Debris fragment state vectors",
        outputContract: "ConjunctionEvent[] surge (High Pc)",
        description: "Instantly screens the expanding debris fragment cloud against operational commercial constellations.",
        keyMetric: "Instantaneous Pair Screening",
        techStack: ["Foster-1992", "Encounter Screening", "Constellation Exposure"]
      },
      {
        id: "ck_sir",
        x: 1040,
        y: 80,
        width: 300,
        height: 130,
        stageNumber: "04",
        type: "decision",
        title: "Kessler Epidemic SIR",
        subtitle: "Orbital Shell Density Spike",
        layer: "astrodynamics",
        icon: Activity,
        sourceFile: "data/cascade.ts",
        mathFormula: "R₀ = (β · S_shell) / γ ≫ 1.0  (Supercritical Runaway Cascade)",
        inputContract: "Debris counts in 50 km shell bins",
        outputContract: "ShellRiskSnapshot with Supercritical Status",
        description: "Recomputes spatial density and Kessler reproduction ratio R0 across 51 monitored orbital shells.",
        keyMetric: "R₀ Shift: e.g. 14.1 → 95.4",
        techStack: ["SIR Model", "R0 Threshold", "Runge-Kutta"],
        conditionLabel: "R₀ ≥ 1.0 (Supercritical)?"
      },
      {
        id: "ck_advisory",
        x: 1040,
        y: 360,
        width: 300,
        height: 130,
        stageNumber: "05",
        type: "agent",
        title: "Emergency STC Advisory",
        subtitle: "Shell Evacuation Directives",
        layer: "agents",
        icon: Sparkles,
        sourceFile: "lib/backend/advisory.ts",
        mathFormula: "FLASH Priority Conjunction Warning Bulletin",
        inputContract: "Supercritical R0 + Active Conjunctions",
        outputContract: "Emergency Evacuation Flight Directives",
        description: "Synthesizes urgent orbital altitude avoidance plans and issues emergency avoidance burn recommendations.",
        keyMetric: "FLASH Priority Bulletin",
        techStack: ["Gemini 2.5 Flash", "Emergency Advisory", "Evacuation Plans"]
      },
      {
        id: "ck_broadcast",
        x: 700,
        y: 360,
        width: 280,
        height: 130,
        stageNumber: "06",
        type: "storage",
        title: "Live Event Bus & SSE",
        subtitle: "Real-Time Emergency Broadcast",
        layer: "bus",
        icon: Database,
        sourceFile: "lib/backend/store.ts",
        mathFormula: "Event: crisis:injected & advisory:new over SSE",
        inputContract: "Crisis telemetry payload",
        outputContract: "Instant client stream push to all operators",
        description: "Dispatches crisis alerts across all connected consoles and persists immutable audit snapshots.",
        keyMetric: "Zero-Latency Push",
        techStack: ["SSE Push", "Pub/Sub Bus", "Audit Ledger"]
      },
      {
        id: "ck_tactical",
        x: 370,
        y: 360,
        width: 270,
        height: 130,
        stageNumber: "07",
        type: "terminal",
        title: "Tactical 3D Debris Cloud",
        subtitle: "Mission Control Visualization",
        layer: "presentation",
        icon: Layers,
        sourceFile: "components/globe/GlobeView.tsx",
        mathFormula: "Interactive 3D fragment particles & collision orbits",
        inputContract: "SSE stream with fragment orbits",
        outputContract: "Real-time tactical situational map",
        description: "Renders expanding debris cloud in 3D WebGL with collision vectors, altitude density heatmaps, and flight director dossiers.",
        keyMetric: "Live Debris Cloud Visualization",
        techStack: ["Three.js / WebGL", "Particle Shaders", "Density Heatmap"]
      }
    ],
    edges: [
      { id: "ec1", from: "ck_trigger", to: "ck_gabbard", label: "Breakup Parameters", flowDirection: "forward", color: "#ef4444", customRouting: "horizontal" },
      { id: "ec2", from: "ck_gabbard", to: "ck_screening", label: "Synthetic Fragment Cloud", flowDirection: "forward", color: "#f59e0b", customRouting: "horizontal" },
      { id: "ec3", from: "ck_screening", to: "ck_sir", label: "Conjunction Spike", flowDirection: "forward", color: "#ef4444", customRouting: "horizontal" },
      { id: "ec4", from: "ck_sir", to: "ck_advisory", label: "R₀ > 1.0 Supercritical Warning", flowDirection: "conditional_yes", color: "#ef4444", customRouting: "vertical" },
      { id: "ec5", from: "ck_advisory", to: "ck_broadcast", label: "Emergency Bulletin", flowDirection: "forward", color: "#38bdf8", customRouting: "horizontal" },
      { id: "ec6", from: "ck_broadcast", to: "ck_tactical", label: "SSE Push: Debris Cloud & Alerts", flowDirection: "forward", color: "#10b981", customRouting: "horizontal" }
    ]
  },
  {
    id: "math_physics",
    name: "Astrodynamic Mathematical Foundations & Physics",
    badge: "ASTRODYNAMICS & COVARIANCE DERIVATION",
    category: "Mathematical Physics",
    description: "Step-by-step physics equations from Kozai mean Keplerian elements to 3D covariance error ellipsoids, Foster Pc integrals, Clohessy-Wiltshire relative motion, and SIR cascade equations.",
    width: 1400,
    height: 640,
    nodes: [
      {
        id: "m_tle",
        x: 40,
        y: 80,
        width: 270,
        height: 130,
        stageNumber: "01",
        type: "math",
        title: "Two-Line Element (TLE)",
        subtitle: "Kozai Mean Keplerian Elements",
        layer: "astrodynamics",
        icon: FileCode,
        sourceFile: "data/parser.ts",
        mathFormula: "Elements: { t₀, i, Ω, e, ω, M₀, n₀, B* }",
        inputContract: "NORAD / US Space Force 69-character TLE format",
        outputContract: "Standard Mean Orbital Element Set",
        description: "Contains epoch time, inclination, RAAN, eccentricity, argument of perigee, mean anomaly, and mean motion.",
        keyMetric: "Raw Input Format",
        techStack: ["Kozai Elements", "B* Drag", "Mean Motion"]
      },
      {
        id: "m_sgp4",
        x: 370,
        y: 80,
        width: 270,
        height: 130,
        stageNumber: "02",
        type: "math",
        title: "SGP4 Propagator",
        subtitle: "Gravitational & Drag Perturbations",
        layer: "astrodynamics",
        icon: Orbit,
        sourceFile: "data/propagator.ts",
        mathFormula: "dM/dt = n₀[1 + 1.5·J₂·(R_E²/p²)·√(1-e²)·(1 - 1.5·sin²i)]",
        inputContract: "Mean elements + propagation delta dt",
        outputContract: "TEME Frame Osculating Position r & Velocity v",
        description: "Integrates Earth oblateness zonal harmonics and atmospheric drag density models to derive high-precision orbital state vectors.",
        keyMetric: "24.7ms Propagation",
        techStack: ["J2 Harmonics", "Osculating State", "TEME Frame"]
      },
      {
        id: "m_frame",
        x: 700,
        y: 80,
        width: 280,
        height: 130,
        stageNumber: "03",
        type: "math",
        title: "Frame Transformations",
        subtitle: "TEME → ECI J2000 & WGS84 ECEF",
        layer: "astrodynamics",
        icon: GitBranch,
        sourceFile: "data/parser.ts",
        mathFormula: "r_RIC = [r_hat; i_hat; c_hat] · r_ECI,  σ_pos = √(σ_R² + σ_I² + σ_C²)",
        inputContract: "TEME Cartesian State Vector",
        outputContract: "Standardized ECI J2000 & ECEF Coordinates",
        description: "Converts true equator mean equinox state vectors into inertial J2000 coordinates and Earth-Centered Earth-Fixed frames.",
        keyMetric: "Sub-microsecond transform",
        techStack: ["RIC Matrix", "ECI J2000", "WGS84 ECEF"]
      },
      {
        id: "m_covariance",
        x: 1040,
        y: 80,
        width: 300,
        height: 130,
        stageNumber: "04",
        type: "math",
        title: "Covariance B-Plane Projection",
        subtitle: "3D Encounter Error Ellipsoid",
        layer: "astrodynamics",
        icon: ShieldAlert,
        sourceFile: "data/collision.ts",
        mathFormula: "C_B = P (C₁ + C₂) Pᵀ,  P = [e_x, e_y]ᵀ (Encounter Projection)",
        inputContract: "Primary & Secondary 3x3 Covariance Matrices",
        outputContract: "2D Encounter Covariance Matrix in B-Plane",
        description: "Combines positional error covariances and projects them onto the relative velocity perpendicular encounter plane.",
        keyMetric: "3D Error Ellipsoids",
        techStack: ["Encounter B-Plane", "Combined Covariance", "Projection Matrix"]
      },
      {
        id: "m_foster",
        x: 1040,
        y: 360,
        width: 300,
        height: 130,
        stageNumber: "05",
        type: "math",
        title: "Foster-1992 Pc Integral",
        subtitle: "Collision Probability Calculation",
        layer: "astrodynamics",
        icon: Activity,
        sourceFile: "data/collision.ts",
        mathFormula: "Pc = (1 / 2π√|C_B|) ∬ exp(-0.5 rᵀ C_B⁻¹ r) dx dy across R = R₁ + R₂",
        inputContract: "2D B-Plane Covariance + Combined Hard Body Radius R = R₁ + R₂",
        outputContract: "Collision Probability Pc ∈ [0, 1]",
        description: "Evaluates the 2D Gaussian integral over the hard-body circle to compute precise physical encounter collision risk.",
        keyMetric: "Action Threshold: Pc > 10⁻⁴",
        techStack: ["Foster-1992", "2D Gaussian Integral", "B-Plane Area"]
      },
      {
        id: "m_burn",
        x: 700,
        y: 360,
        width: 280,
        height: 130,
        stageNumber: "06",
        type: "math",
        title: "Clohessy-Wiltshire Dynamics",
        subtitle: "Impulsive Avoidance Burn & RK4",
        layer: "agents",
        icon: Zap,
        sourceFile: "lib/backend/maneuverNegotiation.ts",
        mathFormula: "d²x/dt² - 2n(dy/dt) - 3n²x = f_x,  d²y/dt² + 2n(dx/dt) = f_y",
        inputContract: "Relative position & velocity at TCA",
        outputContract: "Fuel-Optimal In-Track / Cross-Track Burn Vector",
        description: "Computes the minimal delta-V impulse required at TCA-18h to displace the encounter distance safely outside the 3-sigma error bounds.",
        keyMetric: "ΔV Fuel Minimization",
        techStack: ["Clohessy-Wiltshire", "Runge-Kutta 4th", "Impulse Burn"]
      },
      {
        id: "m_kessler",
        x: 370,
        y: 360,
        width: 270,
        height: 130,
        stageNumber: "07",
        type: "math",
        title: "Orbital Shell SIR Epidemiology",
        subtitle: "Kessler Cascade Differential Equations",
        layer: "astrodynamics",
        icon: Flame,
        sourceFile: "data/cascade.ts",
        mathFormula: "dS/dt = -β·S·I + α,  dI/dt = β·S·I - γ·I,  R₀ = (β·S₀) / γ",
        inputContract: "Shell active satellites S, debris fragments I, atmospheric decay γ",
        outputContract: "Reproduction Number R₀ & 50-Year Cascade Equilibrium",
        description: "Applies epidemic disease modeling to orbital mechanics, identifying supercritical shells prone to exponential fragment cascades.",
        keyMetric: "R₀ Cascade Reproduction Ratio",
        techStack: ["Kessler SIR", "Reproduction Ratio", "Differential Equations"]
      }
    ],
    edges: [
      { id: "em1", from: "m_tle", to: "m_sgp4", label: "Parse Elements", flowDirection: "forward", color: "#06b6d4", customRouting: "horizontal" },
      { id: "em2", from: "m_sgp4", to: "m_frame", label: "Osculating r, v", flowDirection: "forward", color: "#6366f1", customRouting: "horizontal" },
      { id: "em3", from: "m_frame", to: "m_covariance", label: "ECI State Vectors", flowDirection: "forward", color: "#6366f1", customRouting: "horizontal" },
      { id: "em4", from: "m_covariance", to: "m_foster", label: "2D B-Plane Covariance", flowDirection: "forward", color: "#ef4444", customRouting: "vertical" },
      { id: "em5", from: "m_foster", to: "m_burn", label: "High Pc Mitigation", flowDirection: "forward", color: "#38bdf8", customRouting: "horizontal" },
      { id: "em6", from: "m_burn", to: "m_sgp4", label: "Post-Burn State", flowDirection: "feedback", color: "#a855f7", customRouting: "feedback_top" },
      { id: "em7", from: "m_foster", to: "m_kessler", label: "Collision Cross Section", flowDirection: "forward", color: "#f59e0b", customRouting: "horizontal" }
    ]
  }
];

export function FlowchartCanvas() {
  const [activeDiagramId, setActiveDiagramId] = useState<string>("e2e_system");
  const [selectedNodeId, setSelectedNodeId] = useState<string>("e2e_spacetrack");
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);
  const [showAllLabels, setShowAllLabels] = useState<boolean>(false);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [activeSimulationIndex, setActiveSimulationIndex] = useState<number>(-1);
  const [zoomLevel, setZoomLevel] = useState<number>(0.85);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedLayerFilter, setSelectedLayerFilter] = useState<string>("all");
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);

  const currentDiagram = FLOWCHARTS.find((d) => d.id === activeDiagramId) || FLOWCHARTS[0];

  // Set default selected node on tab switch
  useEffect(() => {
    setSelectedNodeId(currentDiagram.nodes[0].id);
    setIsSimulating(false);
    setActiveSimulationIndex(-1);
  }, [activeDiagramId, currentDiagram.nodes]);

  const selectedNode = currentDiagram.nodes.find((n) => n.id === selectedNodeId) || currentDiagram.nodes[0];

  // Simulation runner that walks nodes step-by-step
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isSimulating) {
      if (activeSimulationIndex < currentDiagram.nodes.length - 1) {
        timer = setTimeout(() => {
          const nextIndex = activeSimulationIndex + 1;
          setActiveSimulationIndex(nextIndex);
          setSelectedNodeId(currentDiagram.nodes[nextIndex].id);
        }, 1400);
      } else {
        timer = setTimeout(() => {
          setIsSimulating(false);
          setActiveSimulationIndex(-1);
        }, 1800);
      }
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isSimulating, activeSimulationIndex, currentDiagram.nodes]);

  const handleStartSimulation = () => {
    setIsSimulating(true);
    setActiveSimulationIndex(0);
    setSelectedNodeId(currentDiagram.nodes[0].id);
  };

  const handleResetSimulation = () => {
    setIsSimulating(false);
    setActiveSimulationIndex(-1);
    setSelectedNodeId(currentDiagram.nodes[0].id);
  };

  // Helper to generate clean, collision-free SVG path between node ports
  const generateCleanPath = (source: CanvasNode, target: CanvasNode, routing?: string, flowDir?: string) => {
    const sw = source.width;
    const sh = source.height;
    const tw = target.width;
    const th = target.height;

    // Feedback loop running across top
    if (routing === "feedback_top") {
      const sx = source.x + sw / 2;
      const sy = source.y;
      const tx = target.x + tw / 2;
      const ty = target.y;
      const arcHeight = Math.min(sy, ty) - 45;
      return {
        d: `M ${sx} ${sy} C ${sx} ${arcHeight}, ${tx} ${arcHeight}, ${tx} ${ty}`,
        labelX: (sx + tx) / 2,
        labelY: arcHeight - 10
      };
    }

    // Feedback loop running across bottom
    if (routing === "feedback_bottom") {
      const sx = source.x + sw / 2;
      const sy = source.y + sh;
      const tx = target.x + tw / 2;
      const ty = target.y + th;
      const arcBottom = Math.max(sy, ty) + 50;
      return {
        d: `M ${sx} ${sy} C ${sx} ${arcBottom}, ${tx} ${arcBottom}, ${tx} ${ty}`,
        labelX: (sx + tx) / 2,
        labelY: arcBottom + 10
      };
    }

    // Direct Vertical Flow (downwards)
    if (routing === "vertical") {
      const sx = source.x + sw / 2;
      const sy = source.y + sh;
      const tx = target.x + tw / 2;
      const ty = target.y;
      const midY = (sy + ty) / 2;
      return {
        d: `M ${sx} ${sy} C ${sx} ${midY}, ${tx} ${midY}, ${tx} ${ty}`,
        labelX: sx + 14,
        labelY: midY
      };
    }

    // Orthogonal Upwards Flow (from row 2 to row 1 next col)
    if (routing === "ortho_up") {
      const sx = source.x + sw;
      const sy = source.y + sh / 2;
      const tx = target.x;
      const ty = target.y + th / 2;
      const midX = (sx + tx) / 2;
      return {
        d: `M ${sx} ${sy} C ${midX} ${sy}, ${midX} ${ty}, ${tx} ${ty}`,
        labelX: midX,
        labelY: (sy + ty) / 2
      };
    }

    // Orthogonal Downwards Flow
    if (routing === "ortho_down") {
      const sx = source.x + sw;
      const sy = source.y + sh / 2;
      const tx = target.x;
      const ty = target.y + th / 2;
      const midX = (sx + tx) / 2;
      return {
        d: `M ${sx} ${sy} C ${midX} ${sy}, ${midX} ${ty}, ${tx} ${ty}`,
        labelX: midX,
        labelY: (sy + ty) / 2
      };
    }

    // Standard Horizontal Flow
    if (target.x >= source.x) {
      const sx = source.x + sw;
      const sy = source.y + sh / 2;
      const tx = target.x;
      const ty = target.y + th / 2;
      const midX = (sx + tx) / 2;
      return {
        d: `M ${sx} ${sy} C ${midX} ${sy}, ${midX} ${ty}, ${tx} ${ty}`,
        labelX: midX,
        labelY: (sy + ty) / 2 - 10
      };
    } else {
      // Flowing leftwards
      const sx = source.x;
      const sy = source.y + sh / 2;
      const tx = target.x + tw;
      const ty = target.y + th / 2;
      const midX = (sx + tx) / 2;
      return {
        d: `M ${sx} ${sy} C ${midX} ${sy}, ${midX} ${ty}, ${tx} ${ty}`,
        labelX: midX,
        labelY: (sy + ty) / 2 - 10
      };
    }
  };

  const getLayerColor = (layer: CanvasNode["layer"]) => {
    switch (layer) {
      case "ingestion":
        return {
          border: "border-cyan-500/30 hover:border-cyan-400",
          selectedRing: "ring-2 ring-cyan-400 border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.3)]",
          bg: "bg-cyan-950/30",
          text: "text-cyan-400",
          badge: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
          portColor: "bg-cyan-400"
        };
      case "astrodynamics":
        return {
          border: "border-indigo-500/30 hover:border-indigo-400",
          selectedRing: "ring-2 ring-indigo-400 border-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.3)]",
          bg: "bg-indigo-950/30",
          text: "text-indigo-400",
          badge: "bg-indigo-500/10 text-indigo-400 border-indigo-500/30",
          portColor: "bg-indigo-400"
        };
      case "agents":
        return {
          border: "border-sky-500/30 hover:border-sky-400",
          selectedRing: "ring-2 ring-sky-400 border-sky-400 shadow-[0_0_20px_rgba(56,189,248,0.3)]",
          bg: "bg-sky-950/30",
          text: "text-sky-400",
          badge: "bg-sky-500/10 text-sky-400 border-sky-500/30",
          portColor: "bg-sky-400"
        };
      case "bus":
        return {
          border: "border-amber-500/30 hover:border-amber-400",
          selectedRing: "ring-2 ring-amber-400 border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.3)]",
          bg: "bg-amber-950/30",
          text: "text-amber-400",
          badge: "bg-amber-500/10 text-amber-400 border-amber-500/30",
          portColor: "bg-amber-400"
        };
      case "presentation":
        return {
          border: "border-emerald-500/30 hover:border-emerald-400",
          selectedRing: "ring-2 ring-emerald-400 border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)]",
          bg: "bg-emerald-950/30",
          text: "text-emerald-400",
          badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
          portColor: "bg-emerald-400"
        };
      case "crisis":
        return {
          border: "border-rose-500/30 hover:border-rose-400",
          selectedRing: "ring-2 ring-rose-400 border-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.3)]",
          bg: "bg-rose-950/30",
          text: "text-rose-400",
          badge: "bg-rose-500/10 text-rose-400 border-rose-500/30",
          portColor: "bg-rose-400"
        };
    }
  };

  const filteredNodes = useMemo(() => {
    return currentDiagram.nodes.filter((node) => {
      const matchesSearch =
        searchQuery.trim() === "" ||
        node.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        node.subtitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        node.sourceFile.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesLayer = selectedLayerFilter === "all" || node.layer === selectedLayerFilter;
      return matchesSearch && matchesLayer;
    });
  }, [currentDiagram.nodes, searchQuery, selectedLayerFilter]);

  // Find edges connected to currently selected / hovered node for focus highlighting
  const activeFocusNodeId = hoveredNodeId || selectedNodeId;
  const connectedEdgeIds = useMemo(() => {
    if (!activeFocusNodeId) return new Set<string>();
    return new Set(
      currentDiagram.edges
        .filter((e) => e.from === activeFocusNodeId || e.to === activeFocusNodeId)
        .map((e) => e.id)
    );
  }, [activeFocusNodeId, currentDiagram.edges]);

  return (
    <div className={`w-full space-y-6 ${isFullscreen ? "fixed inset-0 z-50 bg-black p-6 overflow-auto" : ""}`} ref={containerRef}>
      {/* Top Architecture Mode Selector Bar */}
      <div className="p-6 rounded-2xl bg-zinc-950 border border-zinc-800 shadow-2xl flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <div className="space-y-1.5 max-w-2xl">
          <div className="flex items-center gap-2.5 flex-wrap">
            <Badge className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 font-mono text-[11px] gap-1.5 uppercase tracking-wider px-2.5 py-1">
              <Sparkles className="w-3.5 h-3.5" /> AURALIS ORBITAL ARCHITECTURE
            </Badge>
            <span className="text-xs font-mono text-zinc-400">
              {currentDiagram.nodes.length} PROTOCOL NODES • {currentDiagram.edges.length} DIRECTED CONNECTORS
            </span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Workflow className="w-6 h-6 text-cyan-400" />
            {currentDiagram.name}
          </h2>
          <p className="text-xs text-zinc-400 font-mono leading-relaxed">
            {currentDiagram.description}
          </p>
        </div>

        {/* 4 Dedicated Diagram Switchers & Simulation Runner */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="grid grid-cols-2 sm:flex sm:items-center bg-zinc-900/90 p-1.5 rounded-xl border border-zinc-800 font-mono text-xs gap-1">
            {FLOWCHARTS.map((chart) => (
              <button
                key={chart.id}
                type="button"
                onClick={() => {
                  setActiveDiagramId(chart.id);
                  setSearchQuery("");
                  setSelectedLayerFilter("all");
                }}
                className={`px-3 py-2 rounded-lg transition-all text-left sm:text-center whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                  activeDiagramId === chart.id
                    ? "bg-zinc-800 text-white font-bold shadow-md border border-cyan-500/40 text-cyan-300"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40"
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${activeDiagramId === chart.id ? "bg-cyan-400 animate-pulse" : "bg-zinc-600"}`} />
                <span>{chart.category}</span>
              </button>
            ))}
          </div>

          <Button
            size="sm"
            onClick={isSimulating ? handleResetSimulation : handleStartSimulation}
            className={`gap-2 font-mono text-xs font-bold px-4 py-5 rounded-xl transition-all cursor-pointer ${
              isSimulating
                ? "bg-amber-500 hover:bg-amber-600 text-black shadow-[0_0_15px_rgba(245,158,11,0.4)] animate-pulse"
                : "bg-cyan-500 hover:bg-cyan-400 text-black shadow-[0_0_15px_rgba(6,182,212,0.3)]"
            }`}
          >
            {isSimulating ? (
              <>
                <RotateCcw className="w-4 h-4" /> Stop Telemetry Pulse ({activeSimulationIndex + 1}/{currentDiagram.nodes.length})
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" /> Run Simulated Telemetry Pulse
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Filter & Canvas Controls Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-zinc-950/80 p-3.5 rounded-xl border border-zinc-800/80 text-xs font-mono">
        {/* Layer Filter Buttons */}
        <div className="flex items-center gap-1.5 flex-wrap w-full md:w-auto">
          <span className="text-zinc-400 text-[11px] flex items-center gap-1 mr-1">
            <Filter className="w-3.5 h-3.5 text-cyan-400" /> Filter:
          </span>
          {[
            { id: "all", label: "All Layers" },
            { id: "ingestion", label: "Ingestion" },
            { id: "astrodynamics", label: "Astrodynamics" },
            { id: "agents", label: "AI Swarm" },
            { id: "bus", label: "Ledger & Bus" },
            { id: "presentation", label: "Mission UI" },
            { id: "crisis", label: "Crisis" }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedLayerFilter(tab.id)}
              className={`px-2.5 py-1 rounded-lg text-[11px] transition-all cursor-pointer border ${
                selectedLayerFilter === tab.id
                  ? "bg-zinc-800 text-white font-bold border-cyan-500/50 shadow-sm"
                  : "bg-zinc-900/60 text-zinc-400 border-zinc-800 hover:text-zinc-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Node Search, Labels Toggle, & Viewport Zoom Controls */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          {/* Edge Label Visibility Toggle */}
          <button
            onClick={() => setShowAllLabels(!showAllLabels)}
            className={`px-2.5 py-1 rounded-lg border text-[11px] font-mono flex items-center gap-1.5 transition-all cursor-pointer ${
              showAllLabels
                ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/50"
                : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200"
            }`}
          >
            <Tag className="w-3 h-3" />
            <span>{showAllLabels ? "Labels: ON" : "Labels: Hover Only"}</span>
          </button>

          <div className="relative w-full sm:w-48">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search components..."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg pl-8 pr-3 py-1 text-xs text-zinc-200 placeholder:text-zinc-500 outline-none focus:border-cyan-500/50"
            />
          </div>

          <div className="flex items-center gap-1 bg-zinc-900 px-2 py-1 rounded-lg border border-zinc-800 shrink-0">
            <button
              onClick={() => setZoomLevel((z) => Math.max(0.5, Number((z - 0.1).toFixed(2))))}
              className="p-1 hover:text-white cursor-pointer text-zinc-400"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-1 text-[11px] font-bold text-zinc-300">{Math.round(zoomLevel * 100)}%</span>
            <button
              onClick={() => setZoomLevel((z) => Math.min(1.4, Number((z + 0.1).toFixed(2))))}
              className="p-1 hover:text-white cursor-pointer text-zinc-400"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoomLevel(0.85)}
              className="p-1 hover:text-white cursor-pointer text-zinc-400"
              title="Reset Zoom"
            >
              <Maximize2 className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Flowchart Canvas & Node Inspector Layout */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Visual Flowchart SVG Interactive Canvas */}
        <div className="xl:col-span-8 space-y-3">
          <div className="rounded-2xl bg-zinc-950 border border-zinc-800 shadow-2xl relative overflow-hidden flex flex-col">
            {/* Canvas Header Bar */}
            <div className="px-5 py-3 border-b border-zinc-800 bg-zinc-900/60 flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-2.5 text-zinc-400">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#10b981]" />
                <span className="font-bold text-zinc-200">INTERACTIVE FLOW CANVAS</span>
                <span className="text-zinc-600">|</span>
                <span className="text-cyan-400">{filteredNodes.length} Visible Nodes</span>
                <span className="text-zinc-600">•</span>
                <span className="text-indigo-400">{currentDiagram.edges.length} Directed Connectors</span>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-zinc-400">
                <MousePointerClick className="w-3.5 h-3.5 text-cyan-400" />
                <span>Click node to inspect & trace flow</span>
              </div>
            </div>

            {/* SVG Interactive Drawing Area */}
            <div
              className="relative w-full max-w-full overflow-auto p-6 min-h-[600px] flex items-start justify-start bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] bg-black/40"
              onWheel={(event) => {
                if (!event.ctrlKey && Math.abs(event.deltaY) < Math.abs(event.deltaX)) return;
                event.preventDefault();
                setZoomLevel((current) => {
                  const next = current + (event.deltaY < 0 ? 0.05 : -0.05);
                  return Math.min(1.4, Math.max(0.5, Number(next.toFixed(2))));
                });
              }}
            >
              <div
                style={{
                  transform: `scale(${zoomLevel})`,
                  transformOrigin: "top left",
                  transition: "transform 0.15s ease-out",
                  width: `${currentDiagram.width}px`,
                  height: `${currentDiagram.height}px`
                }}
                className="relative shrink-0"
              >
                {/* SVG Edge Connectors Layer */}
                <svg
                  className="absolute inset-0 w-full h-full pointer-events-none z-10"
                  viewBox={`0 0 ${currentDiagram.width} ${currentDiagram.height}`}
                >
                  <defs>
                    {[
                      { id: "arrow-cyan", color: "#06b6d4" },
                      { id: "arrow-indigo", color: "#6366f1" },
                      { id: "arrow-red", color: "#ef4444" },
                      { id: "arrow-emerald", color: "#10b981" },
                      { id: "arrow-amber", color: "#f59e0b" },
                      { id: "arrow-purple", color: "#a855f7" },
                      { id: "arrow-sky", color: "#38bdf8" }
                    ].map((m) => (
                      <marker
                        key={m.id}
                        id={m.id}
                        viewBox="0 0 10 10"
                        refX="9"
                        refY="5"
                        markerWidth="6"
                        markerHeight="6"
                        orient="auto-start-reverse"
                      >
                        <path d="M 0 2 L 8 5 L 0 8 z" fill={m.color} />
                      </marker>
                    ))}

                    <filter id="edge-glow" x="-20%" y="-20%" width="140%" height="140%">
                      <feGaussianBlur stdDeviation="3" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>

                  {/* Render Directed Edges with Focus Highlighting */}
                  {currentDiagram.edges.map((edge) => {
                    const sourceNode = currentDiagram.nodes.find((n) => n.id === edge.from);
                    const targetNode = currentDiagram.nodes.find((n) => n.id === edge.to);
                    if (!sourceNode || !targetNode) return null;

                    const { d, labelX, labelY } = generateCleanPath(sourceNode, targetNode, edge.customRouting, edge.flowDirection);
                    const isHovered = hoveredEdgeId === edge.id;
                    const isConnectedToFocus = connectedEdgeIds.has(edge.id);
                    const isDimmed = connectedEdgeIds.size > 0 && !isConnectedToFocus && !isHovered;

                    const strokeColor = edge.color || "#06b6d4";

                    let markerId = "arrow-cyan";
                    if (strokeColor === "#6366f1") markerId = "arrow-indigo";
                    if (strokeColor === "#ef4444" || strokeColor === "#f43f5e") markerId = "arrow-red";
                    if (strokeColor === "#10b981") markerId = "arrow-emerald";
                    if (strokeColor === "#f59e0b") markerId = "arrow-amber";
                    if (strokeColor === "#a855f7") markerId = "arrow-purple";
                    if (strokeColor === "#38bdf8") markerId = "arrow-sky";

                    const isFeedback = edge.flowDirection === "feedback";
                    const showLabel = showAllLabels || isHovered;

                    return (
                      <g key={edge.id} className="pointer-events-auto cursor-pointer">
                        {/* Invisible thick hover hit-box */}
                        <path
                          d={d}
                          fill="none"
                          stroke="transparent"
                          strokeWidth={22}
                          onMouseEnter={() => setHoveredEdgeId(edge.id)}
                          onMouseLeave={() => setHoveredEdgeId(null)}
                        />

                        {/* Glow halo background on focus / hover */}
                        {(isHovered || isConnectedToFocus) && (
                          <path
                            d={d}
                            fill="none"
                            stroke={strokeColor}
                            strokeWidth={6}
                            strokeOpacity={0.4}
                            filter="url(#edge-glow)"
                          />
                        )}

                        {/* Solid / Dashed Animated Path */}
                        <path
                          d={d}
                          fill="none"
                          stroke={strokeColor}
                          strokeWidth={isHovered || isConnectedToFocus ? 2.5 : 1.6}
                          strokeOpacity={isDimmed ? 0.18 : 1}
                          strokeDasharray={isFeedback ? "6,4" : isSimulating || isConnectedToFocus ? "8,5" : "none"}
                          className={isSimulating || isConnectedToFocus ? "animate-[dash_1.5s_linear_infinite]" : ""}
                          markerEnd={`url(#${markerId})`}
                          onMouseEnter={() => setHoveredEdgeId(edge.id)}
                          onMouseLeave={() => setHoveredEdgeId(null)}
                        />

                        {/* Flowing Animated Particle Token when simulating or focused */}
                        {(isSimulating || (isConnectedToFocus && !isDimmed)) && (
                          <circle r="4" fill={strokeColor} filter="url(#edge-glow)">
                            <animateMotion path={d} dur="2.4s" repeatCount="indefinite" />
                          </circle>
                        )}

                        {/* Decluttered Edge Label Badge (Only on hover / toggle / focus) */}
                        {edge.label && showLabel && (
                          <g
                            transform={`translate(${labelX}, ${labelY})`}
                            onMouseEnter={() => setHoveredEdgeId(edge.id)}
                            onMouseLeave={() => setHoveredEdgeId(null)}
                          >
                            <rect
                              x={-edge.label.length * 3.4}
                              y="-9"
                              width={edge.label.length * 6.8}
                              height="18"
                              rx="5"
                              fill="#09090b"
                              stroke={isHovered || isConnectedToFocus ? strokeColor : "#3f3f46"}
                              strokeWidth={1}
                              className="shadow-xl"
                            />
                            <text
                              x="0"
                              y="3.5"
                              textAnchor="middle"
                              fill={isHovered || isConnectedToFocus ? strokeColor : "#d4d4d8"}
                              fontSize="9"
                              fontFamily="monospace"
                              fontWeight="bold"
                            >
                              {edge.label}
                            </text>
                          </g>
                        )}
                      </g>
                    );
                  })}
                </svg>

                {/* HTML Interactive Node Cards Layer */}
                {currentDiagram.nodes.map((node, idx) => {
                  const Icon = node.icon;
                  const isSelected = selectedNodeId === node.id;
                  const isSimulatingActive = activeSimulationIndex === idx;
                  const colorScheme = getLayerColor(node.layer);

                  const isDimmed =
                    (searchQuery.trim() !== "" || selectedLayerFilter !== "all") &&
                    !filteredNodes.some((fn) => fn.id === node.id);

                  return (
                    <div
                      key={node.id}
                      onClick={() => {
                        setSelectedNodeId(node.id);
                        if (!isSimulating) setActiveSimulationIndex(idx);
                      }}
                      onMouseEnter={() => setHoveredNodeId(node.id)}
                      onMouseLeave={() => setHoveredNodeId(null)}
                      style={{
                        position: "absolute",
                        left: `${node.x}px`,
                        top: `${node.y}px`,
                        width: `${node.width}px`,
                        height: `${node.height}px`
                      }}
                      className={`group p-3 rounded-xl border transition-all duration-200 cursor-pointer z-20 flex flex-col justify-between select-none ${
                        isDimmed ? "opacity-20 grayscale scale-95 pointer-events-none" : "opacity-100"
                      } ${
                        isSelected
                          ? `${colorScheme.selectedRing} ${colorScheme.bg} scale-[1.02] z-30`
                          : "bg-zinc-950/90 border-zinc-800 hover:border-zinc-600 hover:bg-zinc-900/90 shadow-md"
                      } ${
                        isSimulatingActive
                          ? "ring-4 ring-cyan-400 bg-cyan-950/80 shadow-[0_0_30px_rgba(6,182,212,0.5)] scale-[1.03] z-40"
                          : ""
                      }`}
                    >
                      {/* Left & Right Port Dots */}
                      <div className={`absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full ${colorScheme.portColor} border-2 border-black`} />
                      <div className={`absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-emerald-400 border-2 border-black`} />

                      {/* Header Badge & Stage Number */}
                      <div className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1.5 overflow-hidden">
                          <div className={`p-1 rounded-md border shrink-0 ${
                            isSelected ? "bg-black text-cyan-400 border-cyan-500/50" : "bg-zinc-900 text-zinc-400 border-zinc-800"
                          }`}>
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <span className={`text-[9px] font-mono uppercase font-bold tracking-wider truncate ${colorScheme.text}`}>
                            {node.layer}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          {node.type === "decision" && (
                            <span className="text-[8px] font-mono px-1 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-bold">
                              DECISION
                            </span>
                          )}
                          <span className="text-[9px] font-mono font-bold text-zinc-500 px-1 py-0.5 rounded bg-zinc-900 border border-zinc-800">
                            #{node.stageNumber || String(idx + 1).padStart(2, "0")}
                          </span>
                        </div>
                      </div>

                      {/* Title & Subtitle */}
                      <div>
                        <h4 className="font-bold text-xs text-white group-hover:text-cyan-300 transition-colors truncate">
                          {node.title}
                        </h4>
                        <p className="text-[10px] font-mono text-zinc-400 truncate mt-0.5">
                          {node.subtitle}
                        </p>
                      </div>

                      {/* Bottom Key Metric Indicator */}
                      <div className="flex items-center justify-between text-[9px] font-mono text-zinc-400 border-t border-zinc-800/80 pt-1">
                        <span className="truncate max-w-[100px] text-zinc-500 flex items-center gap-0.5">
                          <Code2 className="w-2.5 h-2.5 text-zinc-600" />
                          {node.sourceFile.split("/").pop()}
                        </span>
                        <span className={`font-bold ${colorScheme.text} truncate`}>
                          {node.keyMetric}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Selected Node Deep-Dive Contract Inspector */}
        <div className="xl:col-span-4 space-y-4">
          {selectedNode && (
            <div className="p-6 rounded-2xl bg-zinc-950 border border-zinc-800 shadow-2xl space-y-5 sticky top-20">
              {/* Inspector Header */}
              <div className="pb-4 border-b border-zinc-800">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-mono text-cyan-400 font-bold flex items-center gap-1.5">
                    <Boxes className="w-4 h-4" />
                    FLOW NODE CONTRACT INSPECTOR
                  </span>
                  <Badge className="font-mono text-[10px] uppercase font-bold bg-cyan-500/10 text-cyan-300 border-cyan-500/30">
                    STAGE #{selectedNode.stageNumber || "01"} • {selectedNode.layer}
                  </Badge>
                </div>
                <h3 className="text-xl font-bold text-white mt-2 flex items-center gap-2">
                  {selectedNode.title}
                </h3>
                <p className="text-xs font-mono text-zinc-400 mt-0.5">
                  {selectedNode.subtitle}
                </p>
              </div>

              {/* Operational Purpose */}
              <div>
                <span className="text-[11px] font-mono uppercase text-zinc-400 font-bold block mb-1.5 flex items-center gap-1">
                  <Info className="w-3.5 h-3.5 text-cyan-400" /> Operational Architecture Role:
                </span>
                <p className="text-xs text-zinc-300 leading-relaxed font-sans bg-zinc-900/60 p-3 rounded-xl border border-zinc-800/80">
                  {selectedNode.description}
                </p>
              </div>

              {/* Governing Physics & Astrodynamics Math */}
              {selectedNode.mathFormula && (
                <div>
                  <span className="text-[11px] font-mono uppercase text-amber-400 font-bold block mb-1.5 flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5" /> Governing Math & Physical Formulations:
                  </span>
                  <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/30 font-mono text-xs text-amber-300 leading-relaxed overflow-x-auto">
                    {selectedNode.mathFormula}
                  </div>
                </div>
              )}

              {/* Inbound & Outbound Data Contracts */}
              <div className="space-y-3 font-mono text-xs">
                {selectedNode.inputContract && (
                  <div>
                    <span className="text-[10px] uppercase text-zinc-400 font-bold block mb-1 flex items-center gap-1">
                      <ChevronRight className="w-3 h-3 text-cyan-400" /> Inbound Ingest / Upstream Contract:
                    </span>
                    <div className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-300 leading-relaxed">
                      {selectedNode.inputContract}
                    </div>
                  </div>
                )}

                {selectedNode.outputContract && (
                  <div>
                    <span className="text-[10px] uppercase text-emerald-400 font-bold block mb-1 flex items-center gap-1">
                      <ChevronRight className="w-3 h-3 text-emerald-400" /> Outbound Dispatched Payload:
                    </span>
                    <div className="p-2.5 rounded-lg bg-emerald-950/20 border border-emerald-500/30 text-[11px] text-emerald-300 leading-relaxed">
                      {selectedNode.outputContract}
                    </div>
                  </div>
                )}
              </div>

              {/* Technology Stack Tags */}
              {selectedNode.techStack && (
                <div>
                  <span className="text-[10px] font-mono uppercase text-zinc-400 font-bold block mb-1.5">
                    Engaged Technologies:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedNode.techStack.map((tech) => (
                      <span
                        key={tech}
                        className="px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-[10px] font-mono text-zinc-300"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Implementation File & Performance Metrics */}
              <div className="pt-4 border-t border-zinc-800 flex flex-col gap-2.5 font-mono text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500 text-[11px]">Source Implementation:</span>
                  <code className="text-cyan-400 bg-cyan-950/30 px-2 py-0.5 rounded border border-cyan-500/30 text-[11px] flex items-center gap-1">
                    <FileCode className="w-3 h-3" /> {selectedNode.sourceFile}
                  </code>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500 text-[11px]">Benchmarked Performance:</span>
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
