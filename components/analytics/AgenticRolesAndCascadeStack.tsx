"use client";

import React, { useState } from "react";
import {
  Cpu,
  Orbit,
  Radio,
  ShieldAlert,
  Zap,
  Activity,
  GitBranch,
  Database,
  Terminal,
  Clock,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Flame,
  ChevronRight,
  Code2,
  FileText,
  Boxes,
  Compass,
  Workflow,
  Sparkles,
  ExternalLink,
  Layers,
  Satellite,
  ShieldCheck,
  Binary,
  Network,
  Share2,
  Lock,
  Eye,
  SlidersHorizontal,
  Bot
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LatexMath } from "@/components/ui/LatexMath";
import Link from "next/link";

interface AgentRoleDefinition {
  id: string;
  name: string;
  tagline: string;
  type: "tracker" | "risk_assessor" | "epidemic_forecaster" | "maneuver_negotiation" | "anomaly" | "advisory";
  badge: string;
  badgeColor: string;
  icon: React.ElementType;
  primaryFormula: string;
  formulaTitle: string;
  inputContract: string;
  outputContract: string;
  executionRate: string;
  responsibility: string;
  coreCapabilities: string[];
  astrodynamicMechanics: string;
  promptPersona: string;
}

const AGENT_ROLES: AgentRoleDefinition[] = [
  {
    id: "tracker",
    name: "Tracker & Astrodynamic Propagator",
    tagline: "High-Frequency SGP4/SDP4 State Vector & Shell Partitioning Engine",
    type: "tracker",
    badge: "EPHEMERIS & SGP4 CORE",
    badgeColor: "text-cyan-400 border-cyan-500/40 bg-cyan-950/40",
    icon: Radio,
    primaryFormula: "\\mathbf{r}(t), \\mathbf{v}(t) = \\text{SGP4}\\left(n_0, e_0, i_0, \\Omega_0, \\omega_0, M_0, B^*, t - t_0\\right)",
    formulaTitle: "SGP4 Osculating State Vector Perturbation Equation",
    inputContract: "TLE 2LE/3LE, Space-Track CSV, CelesTrak GP JSON, CCSDS CDM",
    outputContract: "StateVectorsUpdatedPayload (ECI J2000 x,y,z, vx,vy,vz)",
    executionRate: "Continuous (Every 5s or Batch Ingestion)",
    responsibility: "Maintains real-time ephemeris synchronization for the entire catalog of ~25,000 tracked objects. Converts Kozai mean orbital elements into Cartesian ECI vectors, accounting for Earth oblateness (J2, J3, J4) and atmospheric drag.",
    coreCapabilities: [
      "Real-time parsing of multi-source orbital ephemeris feeds (TLE, 3LE, CSV, JSON)",
      "High-precision SGP4/SDP4 perturbation propagation in ECI J2000 frame",
      "Dynamic 50 km altitude shell population partitioning (LEO 200–2,000 km)",
      "Automated batch validation with checksum & epoch freshness screening"
    ],
    astrodynamicMechanics: "Propagates mean elements over time t by evaluating secular and periodic perturbations caused by Earth's gravitational geopotential harmonics (J2, J3, J4) and BSTAR (B*) ballistic drag term.",
    promptPersona: "Deterministic astrodynamics engineer. Operates strictly in SI units (km, km/s, degrees, UTC), prioritizing state vector precision and sub-millisecond propagation throughput."
  },
  {
    id: "risk_assessor",
    name: "Conjunction Screening & Risk Assessor",
    tagline: "Foster-1992 B-Plane 2D Collision Probability & Covariance Projection",
    type: "risk_assessor",
    badge: "COLLISION SCREENING",
    badgeColor: "text-amber-400 border-amber-500/40 bg-amber-950/40",
    icon: ShieldAlert,
    primaryFormula: "P_c = \\frac{1}{2\\pi \\sigma_x \\sigma_y \\sqrt{1-\\rho_{xy}^2}} \\iint_{\\mathcal{A}_{\\text{hard}}} \\exp\\left(-\\frac{1}{2}\\mathbf{r}^T \\mathbf{C}_{\\text{enc}}^{-1}\\mathbf{r}\\right) dx\\,dy",
    formulaTitle: "Foster-1992 2D Encounter Plane Collision Probability Integral",
    inputContract: "StateVectorsUpdatedPayload + Covariance Matrices",
    outputContract: "HighPcConjunctionPayload (ConjunctionEvent, Pc, Miss Dist, TCA)",
    executionRate: "Continuous Multi-Pair Screening (Every 10s)",
    responsibility: "Executes pair-wise screening across all adjacent objects. Projects 3D position covariance matrices onto the 2D relative encounter B-plane at Time of Closest Approach (TCA) and numerically solves for collision probability Pc.",
    coreCapabilities: [
      "Spatial broad-phase shell filtering followed by narrow-phase TCA pinpointing",
      "Combined encounter covariance synthesis: C_enc = C_primary + C_secondary",
      "Foster-1992 numerical integration over combined hard-body collision sphere (r_A + r_B)",
      "Risk level classification: Critical (Pc ≥ 1e-3), Elevated (1e-4 ≤ Pc < 1e-3), Nominal"
    ],
    astrodynamicMechanics: "At TCA, relative motion is modeled as rectilinear with constant relative velocity vector v_rel. The 3D positional uncertainty ellipsoids collapse onto the B-plane normal to v_rel, creating a 2D Gaussian probability density.",
    promptPersona: "Rigorous statistical astrodynamicist. Never underestimates conjunction uncertainties, actively flags elevated encounter geometries, and ensures all risk levels follow international space safety standards."
  },
  {
    id: "epidemic_forecaster",
    name: "Epidemiological SIR Cascade Forecaster",
    tagline: "Non-Linear Macroscopic Debris Percolation & Critical R₀ Dynamics",
    type: "epidemic_forecaster",
    badge: "EPIDEMIOLOGY & KESSLER CORE",
    badgeColor: "text-rose-400 border-rose-500/40 bg-rose-950/40",
    icon: Flame,
    primaryFormula: "\\frac{dI}{dt} = \\beta S I + \\alpha \\frac{I(I-1)}{2} - \\gamma I, \\quad R_0 = \\frac{\\beta S_0 + \\alpha I_0}{\\gamma}",
    formulaTitle: "Kessler-SIR Coupled Non-Linear Differential Equations",
    inputContract: "ShellPopulationUpdatedPayload (Active S, Fragments I, Sinks R)",
    outputContract: "CascadeForecastCompletePayload (50-Yr Projections, R0, Critical Shells)",
    executionRate: "Hourly & Event-Driven (Post-Fragmentation / ASAT Injection)",
    responsibility: "Models orbital space as a compartmental epidemiological epidemic. Treats active payloads as 'Susceptible' (S), lethal debris fragments as 'Infected' (I), and atmospheric re-entry sinks as 'Removed' (R), forecasting runaway Kessler syndrome inflection points.",
    coreCapabilities: [
      "Computes transmission coefficient β from spatial density ρ(h) and collision velocity",
      "Calculates fragment multiplication yield α (~100–500 fragments per catastrophic breakup)",
      "Derives altitude-dependent atmospheric drag sink rate γ(h) from MSISE-90 atmospheric model",
      "50-year forward Runge-Kutta 4th-order (RK4) trajectory integration per 50 km shell"
    ],
    astrodynamicMechanics: "When R0 ≥ 1.0, secondary fragmentation generates debris faster than natural thermospheric drag clears it. The shell enters a supercritical runaway regime where collisions continue cascade propagation even if all launches cease.",
    promptPersona: "Epidemiological orbital physicist. Combines disease transmission mathematics with orbital debris mechanics to identify systemic tipping points and evaluate the macroscopic effectiveness of active debris removal (ADR)."
  },
  {
    id: "maneuver_negotiation",
    name: "Autonomous Maneuver Negotiation Agent",
    tagline: "Gemini-Powered Bilateral Game-Theoretic Burn Optimization",
    type: "maneuver_negotiation",
    badge: "GAME THEORY & LLM CO-PILOT",
    badgeColor: "text-emerald-400 border-emerald-500/40 bg-emerald-950/40",
    icon: GitBranch,
    primaryFormula: "\\min_{\\Delta\\mathbf{v}} J = w_1 \\|\\Delta\\mathbf{v}\\|_2 + w_2 \\cdot P_c(\\Delta\\mathbf{v}) + w_3 \\cdot \\text{Penalty}_{\\text{fuel}}",
    formulaTitle: "Bilateral Optimal Control Delta-V Cost Function",
    inputContract: "HighPcConjunctionPayload (Primary & Secondary Objects)",
    outputContract: "NegotiationCompletePayload (ManeuverProposal, Delta-V, New Pc)",
    executionRate: "Event-Triggered on High Risk Conjunction (Pc ≥ 1e-4)",
    responsibility: "Conducts automated multi-party negotiation between satellite operators. Evaluates fuel state, propulsion constraints, and delta-V costs to propose optimal burn vectors (along-track/cross-track) that reduce Pc below 1e-6.",
    coreCapabilities: [
      "Bilateral AI-driven negotiation rounds between competing satellite operators",
      "Along-track (tangential) vs cross-track (normal) delta-V burn computation",
      "Propellant ledger tracking & fuel exhaustion penalties per operator",
      "Autonomous proposal resolution (Accepted, Counter-Offered, Mitigated)"
    ],
    astrodynamicMechanics: "Computes impulsive velocity delta-v applied half an orbit before TCA (true anomaly difference Δν = π) to maximize miss distance at encounter while minimizing total delta-V expenditure (typically Δv < 0.5 m/s).",
    promptPersona: "Cooperative game theorist & satellite fleet commander. Negotiates equitable burden-sharing between operators to preserve operational spacecraft lifetimes while eliminating collision risks."
  },
  {
    id: "anomaly",
    name: "Astrodynamic Anomaly Detector",
    tagline: "Unannounced Orbit Deviations & Fragmentation Event Clustering",
    type: "anomaly",
    badge: "ANOMALY DETECTION",
    badgeColor: "text-purple-400 border-purple-500/40 bg-purple-950/40",
    icon: Activity,
    primaryFormula: "\\Delta_{\\text{orbit}} = \\sqrt{w_a (\\Delta a)^2 + w_e (\\Delta e)^2 + w_i (\\Delta i)^2} > \\tau_{\\text{anomaly}}",
    formulaTitle: "Keplerian Element Mahalanobis Deviation Metric",
    inputContract: "StateVectorsUpdatedPayload (Consecutive Epochs)",
    outputContract: "AnomalyDetectedPayload (Breakups, Unexpected Burns, Orbit Changes)",
    executionRate: "Continuous Epoch-over-Epoch Comparison",
    responsibility: "Monitors catalog updates to identify unannounced propulsion firings, sudden altitude shifts, orbital decay anomalies, and hypervelocity breakup events. Clusters new debris fragments back to parent objects.",
    coreCapabilities: [
      "Multi-variate statistical anomaly detection on semi-major axis, eccentricity, and inclination",
      "Unannounced maneuver classification vs natural atmospheric orbital decay",
      "Automated Gabbard diagram cluster synthesis for satellite breakup events",
      "Immediate alert triggering to Risk Assessor for high-density fragment screening"
    ],
    astrodynamicMechanics: "Compares consecutive state vectors against predicted orbital models. When deviations exceed 3-sigma confidence bounds without a corresponding planned maneuver log, an anomaly event is raised.",
    promptPersona: "Vigilant orbital surveillance intelligence analyst. Rapidly distinguishes between benign orbital drift, covert maneuvers, and catastrophic structural breakups."
  },
  {
    id: "advisory",
    name: "Space Governance & Advisory Agent",
    tagline: "Multi-Lingual Synthesis & Immutable Ledger Auditing",
    type: "advisory",
    badge: "GOVERNANCE & BROADCAST",
    badgeColor: "text-blue-400 border-blue-500/40 bg-blue-950/40",
    icon: Bot,
    primaryFormula: "\\text{Advisory} = \\text{Gemini-2.5-Flash}\\left(\\text{Context}(\\text{Events}, \\text{Shells}, \\text{Negotiations})\\right)",
    formulaTitle: "Natural Language Astrodynamic Intelligence Synthesis",
    inputContract: "All Agent Event Streams (AuditLogEntry, Conjunctions, Cascade)",
    outputContract: "Advisory Broadcasts, Immutable Audit Ledger, Multi-Lingual Directives",
    executionRate: "Continuous Real-Time & Scheduled Bulletins",
    responsibility: "Synthesizes multi-agent telemetry into natural-language orbital advisories, publishes compliance audit entries to the immutable ledger, and issues multi-lingual mission directives to satellite operators and international space bodies.",
    coreCapabilities: [
      "Generates clear, natural language operational advisories in English, Japanese, French, etc.",
      "Maintains the cryptographically traceable system-wide audit log for compliance",
      "Delivers contextual recommendations for constellation operators (e.g. Starlink, OneWeb)",
      "Real-time WebSocket broadcasting to Command Center HUD and external endpoints"
    ],
    astrodynamicMechanics: "Aggregates complex mathematical results from SGP4, Foster-1992, and SIR cascade models into plain-language mission intelligence with explicit operational action items.",
    promptPersona: "Authoritative International Space Traffic Coordinator. Communicates with precision, diplomatic clarity, and unwavering focus on space sustainability."
  }
];

const ASTRODYNAMICS_PIPELINE_STEPS = [
  {
    step: "01",
    title: "Multi-Format Ephemeris Ingestion",
    icon: Radio,
    description: "Ingests raw space tracking data in standard TLE, 3LE, Space-Track CSV, CelesTrak GP JSON, and CCSDS CDM formats through validated HTTP and file streams.",
    tech: ["satellite.js", "Kozai Elements", "Regex Tokenizer"]
  },
  {
    step: "02",
    title: "SGP4/SDP4 Perturbation Orbit Propagation",
    icon: Orbit,
    description: "Converts mean Keplerian orbital parameters into instantaneous Cartesian ECI J2000 state vectors (x,y,z, vx,vy,vz), evaluating Earth oblateness (J2, J3, J4) and atmospheric drag.",
    tech: ["WGS-84 Geoid", "ECI J2000", "BSTAR Drag"]
  },
  {
    step: "03",
    title: "Foster-1992 B-Plane Collision Probability (Pc)",
    icon: ShieldAlert,
    description: "Projects 3D covariance uncertainty ellipsoids onto the relative encounter B-plane at TCA and numerically integrates the 2D Gaussian probability density over the combined collision sphere.",
    tech: ["Numerical Quadrature", "B-Plane Geometry", "Covariance Synthesis"]
  },
  {
    step: "04",
    title: "Macroscopic Epidemiological SIR Cascade Dynamics",
    icon: Flame,
    description: "Evaluates long-term Kessler syndrome tipping points across 50 km orbital shells, computing debris density ρ(h), transmission coefficient β, and critical reproduction ratio R0.",
    tech: ["RK4 Differential Solver", "MSISE-90 Atmosphere", "Percolation R0"]
  },
  {
    step: "05",
    title: "Autonomous Game-Theoretic Maneuver Negotiation",
    icon: GitBranch,
    description: "Gemini-powered multi-agent bilateral negotiation resolves collision threats by optimizing burn delta-V proposals between satellite operators to achieve Pc < 1e-6.",
    tech: ["Along-Track Burns", "Fuel Penalties", "Bilateral Game Theory"]
  },
  {
    step: "06",
    title: "Active Debris Removal (ADR) & Policy Simulation",
    icon: SlidersHorizontal,
    description: "Simulates 'What-If' space sustainability scenarios including mandatory 5-year Post-Mission Disposal (PMD) and robotic Active Debris Removal (ADR) to suppress R0 below 1.0.",
    tech: ["5-Yr PMD Rule", "Targeted ADR", "Equilibrium Forecasting"]
  },
  {
    step: "07",
    title: "Photorealistic WebGL Globe & 2D Polar Tactical Scope",
    icon: Compass,
    description: "Renders real-time planetary orbital tracks, satellite constellation meshes, debris clouds, and polar astrodynamic scopes for mission controllers.",
    tech: ["Three.js / WebGL", "Canvas 2D Polar Scope", "Sub-Pixel Reticles"]
  }
];

export function AgenticRolesAndCascadeStack() {
  const [selectedAgentId, setSelectedAgentId] = useState<string>("epidemic_forecaster");

  const selectedAgent = AGENT_ROLES.find((a) => a.id === selectedAgentId) || AGENT_ROLES[0];

  return (
    <div className="space-y-6 pt-4">
      {/* Section Header */}
      <div className="border-b border-border/80 pb-4">
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="outline" className="text-[10px] font-mono text-cyan-400 border-cyan-500/30 bg-cyan-950/30">
            AURALIS MULTI-AGENT SWARM ARCHITECTURE
          </Badge>
          <span className="text-xs font-mono text-muted-foreground">
            6 AUTONOMOUS AGENTS • CONTRACT SPEC §4.6
          </span>
        </div>
        <h2 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2.5">
          <Bot className="w-6 h-6 text-primary" />
          Autonomous Multi-Agent Roles & Astrodynamic Stack
        </h2>
        <p className="text-xs sm:text-sm text-muted-foreground mt-1">
          Explore how Auralis fuses orbital astrodynamics, statistical physics, epidemiological cascade mathematics, and Gemini multi-agent autonomous negotiation into an end-to-end space traffic management platform.
        </p>
      </div>

      {/* 6 Agent Role Switcher Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {AGENT_ROLES.map((agent) => {
          const isSelected = agent.id === selectedAgentId;
          const Icon = agent.icon;

          return (
            <button
              key={agent.id}
              type="button"
              onClick={() => setSelectedAgentId(agent.id)}
              className={`p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between group ${
                isSelected
                  ? "border-primary bg-primary/10 shadow-lg ring-1 ring-primary/40"
                  : "border-border/80 bg-card/60 hover:border-primary/40 hover:bg-card/90"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className={`p-2 rounded-lg ${isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  {isSelected && (
                    <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  )}
                </div>
                <h3 className="font-bold text-xs text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                  {agent.name.split(" ")[0]}
                </h3>
                <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">
                  {agent.tagline}
                </p>
              </div>

              <div className="mt-3">
                <Badge variant="outline" className={`text-[8px] font-mono px-1.5 py-0 ${agent.badgeColor}`}>
                  {agent.type.toUpperCase()}
                </Badge>
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Agent In-Depth Inspector Card */}
      <Card className="border-primary/40 bg-zinc-950/90 shadow-2xl relative overflow-hidden">
        {/* Background accent glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

        <CardHeader className="pb-4 border-b border-border/60">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-primary/15 text-primary border border-primary/30">
                {React.createElement(selectedAgent.icon, { className: "w-6 h-6" })}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-lg font-bold text-foreground">
                    {selectedAgent.name}
                  </CardTitle>
                  <Badge variant="outline" className={`text-[10px] font-mono ${selectedAgent.badgeColor}`}>
                    {selectedAgent.badge}
                  </Badge>
                </div>
                <CardDescription className="text-xs text-muted-foreground mt-0.5">
                  {selectedAgent.tagline}
                </CardDescription>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link href="/architecture">
                <Button variant="outline" size="sm" className="text-xs font-mono gap-1.5 border-border">
                  <Workflow className="w-3.5 h-3.5 text-primary" />
                  Flowchart Canvas <ExternalLink className="w-3 h-3 ml-0.5" />
                </Button>
              </Link>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-5 space-y-5 text-xs">
          {/* Responsibility Paragraph */}
          <p className="text-sm text-zinc-300 leading-relaxed font-sans">
            {selectedAgent.responsibility}
          </p>

          {/* Mathematical Formulation Card with KaTeX */}
          <div className="p-4 rounded-xl border border-cyan-500/30 bg-zinc-900/90 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-cyan-400 font-bold uppercase flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5" /> {selectedAgent.formulaTitle}
              </span>
              <span className="text-[10px] text-zinc-500 font-mono">Mathematical Rigor</span>
            </div>

            <LatexMath math={selectedAgent.primaryFormula} displayMode={true} />

            <p className="text-[11px] text-zinc-400 leading-relaxed font-sans mt-2">
              <span className="font-semibold text-zinc-200">Astrodynamic Physics:</span> {selectedAgent.astrodynamicMechanics}
            </p>
          </div>

          {/* Core Capabilities Grid & IO Contracts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Core Capabilities */}
            <div className="p-4 rounded-xl border border-border/80 bg-muted/20 space-y-3">
              <span className="text-xs font-mono font-bold text-foreground uppercase flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-primary" /> Core Operational Capabilities
              </span>
              <ul className="space-y-2 font-sans text-[11px] text-zinc-300">
                {selectedAgent.coreCapabilities.map((cap, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                    <span>{cap}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Input / Output Contracts & Persona */}
            <div className="p-4 rounded-xl border border-border/80 bg-muted/20 space-y-3 font-mono text-[11px]">
              <span className="text-xs font-mono font-bold text-foreground uppercase flex items-center gap-1.5">
                <Binary className="w-4 h-4 text-cyan-400" /> Interface Contracts & Execution Rate
              </span>
              <div className="space-y-2 text-zinc-300">
                <div>
                  <span className="text-muted-foreground block text-[10px]">INPUT CONTRACT:</span>
                  <span className="font-bold text-cyan-300">{selectedAgent.inputContract}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">OUTPUT EMISSION:</span>
                  <span className="font-bold text-emerald-300">{selectedAgent.outputContract}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[10px]">EXECUTION CADENCE:</span>
                  <span className="text-amber-300 font-bold">{selectedAgent.executionRate}</span>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 text-[10px] text-zinc-400 font-sans mt-2">
                <span className="text-primary font-bold font-mono uppercase block text-[9px] mb-0.5">Agent LLM Persona:</span>
                "{selectedAgent.promptPersona}"
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* "What We Do" Complete Astrodynamics & Space Safety Stack Pipeline */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-black tracking-tight text-foreground flex items-center gap-2">
              <Layers className="w-5 h-5 text-primary" />
              What We Do: The End-to-End Space Traffic Safety Stack
            </h3>
            <p className="text-xs text-muted-foreground">
              From raw telemetry ingestion to photorealistic 3D tactical visualization and autonomous burn negotiation.
            </p>
          </div>
          <Badge variant="outline" className="text-[10px] font-mono text-emerald-400 border-emerald-500/30">
            7 INTEGRATED PHASES
          </Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {ASTRODYNAMICS_PIPELINE_STEPS.map((step) => {
            const Icon = step.icon;

            return (
              <Card key={step.step} className="border-border/80 bg-card/80 hover:border-primary/50 transition-all shadow-xs flex flex-col justify-between">
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/30">
                      PHASE {step.step}
                    </span>
                    <Icon className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <CardTitle className="text-xs font-bold text-foreground">
                    {step.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0 space-y-3">
                  <p className="text-[11px] text-muted-foreground leading-relaxed font-sans">
                    {step.description}
                  </p>
                  <div className="flex flex-wrap gap-1 pt-1">
                    {step.tech.map((t) => (
                      <span key={t} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-muted text-zinc-300 border border-border/60">
                        {t}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
