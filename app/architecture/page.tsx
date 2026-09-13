"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useTheme } from "@/lib/ThemeContext";
import { AuralisLogo } from "@/components/ui/AuralisLogo";
import { FlowchartCanvas } from "@/components/architecture/FlowchartCanvas";
import {
  Layers,
  BookOpen,
  Cpu,
  Orbit,
  ShieldAlert,
  Zap,
  Activity,
  Radio,
  Satellite,
  GitBranch,
  Database,
  Terminal,
  Clock,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Flame,
  ChevronRight,
  Copy,
  Check,
  Code2,
  FileText,
  Boxes,
  Compass,
  Workflow,
  Sparkles,
  Sun,
  Moon,
  ExternalLink
} from "lucide-react";

export default function ArchitecturePage() {
  const { theme, toggleTheme } = useTheme();
  const [activeLayer, setActiveLayer] = useState<number>(1);
  const [activeAgentTab, setActiveAgentTab] = useState<string>("negotiation");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const layers = [
    {
      id: 1,
      name: "Space Surveillance & Ingestion",
      tag: "LAYER 01",
      icon: Radio,
      accent: "from-cyan-500/20 to-blue-500/10 border-cyan-500/40 text-cyan-400",
      description: "Direct real-time ingestion from US Space Force Space-Track API (CDMs) and CelesTrak active ephemeris feeds.",
      components: [
        { name: "Space-Track Engine", file: "data/spacetrack.ts", details: "Secure session auth (/ajaxauth/login), public CDM ingestion, 10-minute rate-limited cache complying with 20-30 req/min limits." },
        { name: "CelesTrak GP Feed", file: "data/celestrak.ts", details: "Fallback active satellite stream (gp.php?GROUP=active) parsing NORAD two-line element sets." },
        { name: "Parser & Validation", file: "data/parser.ts", details: "Transforms raw GP/TLE records into canonical TrackedObject records with state vectors and covariance matrices." }
      ]
    },
    {
      id: 2,
      name: "Astrodynamic Propagation & Screening",
      tag: "LAYER 02",
      icon: Orbit,
      accent: "from-indigo-500/20 to-purple-500/10 border-indigo-500/40 text-indigo-400",
      description: "SGP4 perturbation propagator, coordinate transforms, and B-plane covariance collision screening.",
      components: [
        { name: "SGP4 Propagator", file: "data/propagator.ts", details: "Propagates 630+ orbital bodies in 24.7ms using Kozai-Brouwer mean motion and atmospheric drag coefficients." },
        { name: "Collision Screening", file: "data/collision.ts", details: "Hierarchical bounding-sphere culling followed by 3D covariance ellipsoid intersection for close approaches (miss < 50 km)." },
        { name: "Epidemic Cascade Math", file: "data/cascade.ts", details: "Kessler Syndrome SIR differential equation system across 50 km orbital shells with live R0 calculation." }
      ]
    },
    {
      id: 3,
      name: "Autonomous Gemini Multi-Agent Swarm",
      tag: "LAYER 03",
      icon: Cpu,
      accent: "from-sky-500/20 to-teal-500/10 border-sky-500/40 text-sky-400",
      description: "6 specialized autonomous agents powered by a 12-key Gemini 2.5 Flash load-balancing rotator.",
      components: [
        { name: "Maneuver Negotiation", file: "lib/backend/maneuverNegotiation.ts", details: "Autonomous bilateral LLM bargaining between competing commercial operators with delta-V fuel optimization." },
        { name: "STC Advisory Agent", file: "lib/backend/advisory.ts", details: "Generates real-time AI flight director advisories and executive conjunction bulletins." },
        { name: "Anomaly Forensics", file: "lib/backend/anomaly.ts", details: "Detects unplanned thruster firings, tumbling, station-keeping drift, and orbital element deltas." },
        { name: "12-Key Gemini Rotator", file: "lib/ai/geminiRotator.ts", details: "Dynamic key rotation, 45s rate-limit quarantine, 0-thinking token optimization, structured JSON output." }
      ]
    },
    {
      id: 4,
      name: "Message Bus & In-Memory Store",
      tag: "LAYER 04",
      icon: Database,
      accent: "from-amber-500/20 to-orange-500/10 border-amber-500/40 text-amber-400",
      description: "Pub/Sub message bus dispatching strongly-typed envelopes with an in-memory telemetry state store.",
      components: [
        { name: "Telemetry Store", file: "lib/backend/store.ts", details: "Thread-safe state store managing catalog objects, conjunctions, shells, maneuver proposals, and advisories." },
        { name: "Audit Trail", file: "lib/backend/audit.ts", details: "Cryptographically verifiable timestamped audit log of all maneuver approvals and autonomous negotiations." },
        { name: "REST & WS Layer", file: "lib/backend/runtime.ts", details: "Exposes 10+ REST endpoints and high-frequency WebSocket streams for real-time client push updates." }
      ]
    },
    {
      id: 5,
      name: "Mission Control Presentation Layer",
      tag: "LAYER 05",
      icon: Layers,
      accent: "from-emerald-500/20 to-cyan-500/10 border-emerald-500/40 text-emerald-400",
      description: "Hardware-accelerated 3D WebGL tactical globe, real-time SGP4 orbit tracks, and collision dossiers.",
      components: [
        { name: "3D Globe Engine", file: "components/dashboard/GlobeView.tsx", details: "Three.js / Globe.gl tactical visualization using local 4K Earth night textures and pre-seeded telemetry." },
        { name: "Collision Dossier", file: "app/(auth)/cases/[id]/page.tsx", details: "Deep-dive encounter analysis with B-plane geometry, miss vector, and agent negotiation transcript." },
        { name: "Command Palette", file: "components/layout/CommandPalette.tsx", details: "Global ⌘K search across satellites, debris fragments, critical conjunctions, and orbital routes." }
      ]
    }
  ];

  const agentDetails: Record<string, {
    name: string;
    role: string;
    trigger: string;
    math: string;
    payloadSample: string;
    modelConfig: string;
  }> = {
    negotiation: {
      name: "Maneuver Negotiation Agent",
      role: "Acts as autonomous flight dynamics negotiators representing primary and secondary satellite operators (e.g. SpaceX Starlink vs. Eutelsat OneWeb) during critical close approaches (Pc > 10^-4).",
      trigger: "Conjunction identified with miss distance < 5 km or collision probability Pc > 1e-4.",
      math: "Minimizes joint fuel penalty J = w1*ΔV_p + w2*ΔV_s subject to miss distance d_post > 25 km and operator maneuverability constraints.",
      modelConfig: "Strictly gemini-2.5-flash · Temperature 0.2 · thinkingBudget 0 · Structured JSON Schema",
      payloadSample: `{
  "action": "negotiate_maneuver",
  "conjunctionId": "cdm-1693988026",
  "primary": { "id": "starlink-1007", "operator": "SpaceX Starlink", "fuelRemainingKg": 14.2, "maneuverable": true },
  "secondary": { "id": "cosmos-2251-deb", "operator": "Debris", "fuelRemainingKg": 0, "maneuverable": false },
  "tca": "2026-09-15T05:40:19.506Z",
  "missDistanceKm": 0.19,
  "result": {
    "operatorAssigned": "SpaceX Starlink",
    "burnVector": { "radial": 0.12, "inTrack": 0.32, "crossTrack": -0.05 },
    "deltaVMagnitude": 0.35,
    "confidence": 0.94,
    "rationale": "STARLINK-1007 executes a prograde in-track burn of +0.32 m/s at TCA-18h to raise perigee by 4.2 km, reducing Pc from 2.51e-4 to 1.8e-8 with minimal fuel penalty."
  }
}`
    },
    risk: {
      name: "Risk Assessor Agent",
      role: "Computes conjunction probability matrices using 3D covariance ellipsoids on the B-plane encounter coordinate frame.",
      trigger: "Continuous SGP4 state vector updates across 630+ active bodies.",
      math: "Pc = (1 / (2π * sqrt(det(C)))) * ∫∫ exp(-0.5 * r^T * C^-1 * r) dx dy across combined hard-body collision radius R = R1 + R2.",
      modelConfig: "High-speed analytical numerical pipeline coupled with Gemini advisory classification.",
      payloadSample: `{
  "agent": "RiskAssessor",
  "conjunctionId": "cdm-1693988026",
  "tca": "2026-09-15T05:40:19.506Z",
  "missDistanceKm": 0.19,
  "relativeVelocityKmS": 14.82,
  "combinedRadiusMeters": 4.5,
  "pc": 0.00025102,
  "riskLevel": "CRITICAL",
  "state": "ACTION_REQUIRED",
  "recommendedAction": "EXECUTE_COORDINATED_AVOIDANCE"
}`
    },
    advisory: {
      name: "STC Advisory Agent",
      role: "Serves as automated orbital flight director, synthesizing multi-agent alerts into executive flight bulletins and clearances.",
      trigger: "New conjunction creation, risk level escalation, or maneuver proposal completion.",
      math: "Evaluates airspace sector saturation, conjunction clustering, and ground station visibility windows.",
      modelConfig: "gemini-2.5-flash · Markdown formatted executive briefs with action matrices.",
      payloadSample: `{
  "bulletinId": "ADV-2026-0915-01",
  "priority": "FLASH",
  "headline": "CRITICAL CONJUNCTION: STARLINK-1007 vs COSMOS 2251 DEBRIS",
  "tcaCountdownHours": 18.4,
  "flightDirectorAdvisory": "Clearance issued for autonomous burn 42-A. Ground radar tracking station Svalbard assigned for post-burn ephemeris verification."
}`
    },
    forensic: {
      name: "Forensic Anomaly Detection Agent",
      role: "Monitors unexpected orbital element perturbations (semi-major axis Δa, inclination Δi, eccentricity Δe) to uncover unannounced maneuvers, tumbling, or fragmentation.",
      trigger: "Ephemeris residuals exceeding 3-sigma standard deviation between SGP4 propagations.",
      math: "Δa = a_obs - a_pred; Δe = e_obs - e_pred; energy delta ΔE = -μ / (2a).",
      modelConfig: "gemini-2.5-flash with astrodynamics physics reasoning.",
      payloadSample: `{
  "agent": "ForensicAnomaly",
  "targetId": "unknown-debris-412",
  "deltaSemiMajorAxisKm": -1.42,
  "deltaInclinationDeg": 0.04,
  "classification": "UNCONTROLLED_ORBITAL_DECAY",
  "confidence": 0.88,
  "fragmentationRisk": "LOW"
}`
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-200 selection:bg-cyan-500/30">
      {/* Top Header */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center gap-6">
          <Link href="/" className="hover:opacity-90 transition-opacity">
            <AuralisLogo size="sm" />
          </Link>
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-xs font-mono text-cyan-400">
            <Workflow className="w-3.5 h-3.5" />
            SYSTEM ARCHITECTURE SPEC v2.4
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/docs"
            className="px-3 py-1.5 text-sm font-medium border border-border rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-all flex items-center gap-1.5"
          >
            <BookOpen className="w-4 h-4 text-cyan-400" />
            <span>Docs</span>
          </Link>

          <Link
            href="/dashboard"
            className="px-3.5 py-1.5 text-sm font-semibold text-background bg-foreground rounded-lg hover:opacity-90 transition-all flex items-center gap-1.5 shadow-sm"
          >
            <Compass className="w-4 h-4" />
            <span>Command Center</span>
          </Link>

          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="p-2 border border-border rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            {theme === "dark" ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-zinc-700" />}
          </button>
        </div>
      </header>

      {/* Hero Banner */}
      <section className="relative px-6 pt-16 pb-12 border-b border-border/60 overflow-hidden bg-gradient-to-b from-cyan-950/20 via-background to-background">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(6,182,212,0.15),rgba(255,255,255,0))] pointer-events-none" />

        <div className="max-w-6xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 text-xs font-mono tracking-wider mb-6">
            <Sparkles className="w-3.5 h-3.5" />
            OFFICIAL ASTRODYNAMICS & AGENTIC TOPOLOGY
          </div>

          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-4">
            Auralis System Architecture
          </h1>

          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed mb-8">
            An end-to-end, high-frequency orbital intelligence platform combining live US Space Force Space-Track ephemerides, SGP4 perturbation physics, and an autonomous 6-agent Gemini 2.5 Flash swarm.
          </p>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-4xl mx-auto pt-4 border-t border-border/40">
            <div className="p-4 rounded-xl bg-card border border-border/60 text-left">
              <div className="text-xs font-mono text-muted-foreground">SGP4 PROPAGATION</div>
              <div className="text-2xl font-bold text-cyan-400 mt-1">24.7 ms</div>
              <div className="text-xs text-muted-foreground mt-0.5">631 objects real-time</div>
            </div>
            <div className="p-4 rounded-xl bg-card border border-border/60 text-left">
              <div className="text-xs font-mono text-muted-foreground">SPACE-TRACK INGEST</div>
              <div className="text-2xl font-bold text-emerald-400 mt-1">10 min Cache</div>
              <div className="text-xs text-muted-foreground mt-0.5">US Space Force CDMs</div>
            </div>
            <div className="p-4 rounded-xl bg-card border border-border/60 text-left">
              <div className="text-xs font-mono text-muted-foreground">GEMINI ROTATOR</div>
              <div className="text-2xl font-bold text-sky-400 mt-1">12 Keys</div>
              <div className="text-xs text-muted-foreground mt-0.5">Auto 45s failover pool</div>
            </div>
            <div className="p-4 rounded-xl bg-card border border-border/60 text-left">
              <div className="text-xs font-mono text-muted-foreground">THINKING OVERHEAD</div>
              <div className="text-2xl font-bold text-purple-400 mt-1">0 Tokens</div>
              <div className="text-xs text-muted-foreground mt-0.5">Sub-second inference</div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive NotebookLM-Style Architecture Flowchart & Protocol Graph Canvas */}
      <section className="py-12 px-6 max-w-6xl mx-auto">
        <FlowchartCanvas />
      </section>

      {/* Architecture Interactive Layer Explorer */}
      <section className="py-16 px-6 max-w-6xl mx-auto border-t border-border/60">
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between mb-10 gap-4">
          <div>
            <div className="text-xs font-mono text-cyan-400 tracking-wider">MODULAR ARCHITECTURE</div>
            <h2 className="text-2xl md:text-3xl font-bold mt-1">The 5-Layer Orbital Intelligence Stack</h2>
          </div>
          <div className="text-sm text-muted-foreground">
            Select a layer below to inspect modules, contracts, and internal file paths.
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Layer Selector Column */}
          <div className="lg:col-span-5 space-y-3">
            {layers.map((layer) => {
              const Icon = layer.icon;
              const isSelected = activeLayer === layer.id;
              return (
                <button
                  key={layer.id}
                  onClick={() => setActiveLayer(layer.id)}
                  className={`w-full text-left p-4 rounded-xl border transition-all flex items-start gap-4 ${
                    isSelected
                      ? `bg-gradient-to-r ${layer.accent} border-current shadow-lg`
                      : "bg-card border-border/60 hover:border-border hover:bg-muted/40"
                  }`}
                >
                  <div className={`p-2.5 rounded-lg border ${isSelected ? "bg-background border-current" : "bg-muted border-border"}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-muted-foreground">{layer.tag}</span>
                      {isSelected && <ChevronRight className="w-4 h-4 text-cyan-400" />}
                    </div>
                    <h3 className="font-semibold text-base mt-0.5">{layer.name}</h3>
                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{layer.description}</p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Layer Inspector Detail Column */}
          <div className="lg:col-span-7">
            {(() => {
              const current = layers.find((l) => l.id === activeLayer)!;
              const Icon = current.icon;
              return (
                <div className="p-6 md:p-8 rounded-2xl bg-card border border-border/80 shadow-sm relative overflow-hidden">
                  <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border/60">
                    <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                      <Icon className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="text-xs font-mono text-cyan-400">{current.tag} INSPECTION</div>
                      <h3 className="text-xl font-bold">{current.name}</h3>
                    </div>
                  </div>

                  <p className="text-muted-foreground text-sm mb-6 leading-relaxed">
                    {current.description}
                  </p>

                  <div className="space-y-4">
                    <div className="text-xs font-mono text-muted-foreground tracking-wider uppercase">Active Subsystems & File Targets:</div>
                    {current.components.map((comp, idx) => (
                      <div key={idx} className="p-4 rounded-xl bg-muted/40 border border-border/60 hover:border-cyan-500/30 transition-colors">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-sm text-foreground">{comp.name}</span>
                          <span className="text-xs font-mono px-2 py-0.5 rounded bg-background border border-border text-cyan-400">
                            {comp.file}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed mt-1.5">{comp.details}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      </section>

      {/* Autonomous Multi-Agent Swarm Section */}
      <section className="py-16 px-6 bg-muted/20 border-y border-border/60">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-sky-500/30 bg-sky-500/10 text-sky-400 text-xs font-mono mb-3">
              <Cpu className="w-3.5 h-3.5" />
              SWARM INTELLIGENCE
            </div>
            <h2 className="text-3xl font-bold">Autonomous Multi-Agent Brains</h2>
            <p className="text-muted-foreground mt-2 text-sm md:text-base">
              Each autonomous agent specializes in a distinct astrodynamics and decision-making domain, communicating asynchronously via typed message envelopes.
            </p>
          </div>

          {/* Agent Tabs */}
          <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
            {Object.entries(agentDetails).map(([key, agent]) => (
              <button
                key={key}
                onClick={() => setActiveAgentTab(key)}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                  activeAgentTab === key
                    ? "bg-cyan-500 text-black font-semibold shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                    : "bg-card border border-border hover:bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {agent.name}
              </button>
            ))}
          </div>

          {/* Selected Agent Deep Dive Card */}
          {(() => {
            const agent = agentDetails[activeAgentTab];
            return (
              <div className="p-6 md:p-8 rounded-2xl bg-card border border-border shadow-md">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  <div className="lg:col-span-5 space-y-5">
                    <div>
                      <div className="text-xs font-mono text-cyan-400 uppercase">AGENT SPECIFICATION</div>
                      <h3 className="text-2xl font-bold mt-0.5">{agent.name}</h3>
                    </div>

                    <div>
                      <div className="text-xs font-mono text-muted-foreground uppercase">Operational Role:</div>
                      <p className="text-sm text-foreground/90 mt-1 leading-relaxed">{agent.role}</p>
                    </div>

                    <div>
                      <div className="text-xs font-mono text-muted-foreground uppercase">Trigger Condition:</div>
                      <p className="text-xs font-mono text-amber-400 mt-1 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                        {agent.trigger}
                      </p>
                    </div>

                    <div>
                      <div className="text-xs font-mono text-muted-foreground uppercase">Governing Mathematical Formulation:</div>
                      <p className="text-xs font-mono text-cyan-300 mt-1 p-2.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                        {agent.math}
                      </p>
                    </div>

                    <div>
                      <div className="text-xs font-mono text-muted-foreground uppercase">LLM Engine & Constraint:</div>
                      <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>{agent.modelConfig}</span>
                      </div>
                    </div>
                  </div>

                  <div className="lg:col-span-7 flex flex-col">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-mono text-muted-foreground">SAMPLE AGENT MESSAGE ENVELOPE (JSON)</span>
                      <button
                        onClick={() => copyToClipboard(agent.payloadSample, activeAgentTab)}
                        className="p-1.5 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 hover:bg-muted rounded transition-colors"
                      >
                        {copiedCode === activeAgentTab ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div className="p-4 rounded-xl bg-zinc-950 border border-border text-xs font-mono text-zinc-300 overflow-x-auto flex-1 leading-relaxed">
                      <pre>{agent.payloadSample}</pre>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      </section>

      {/* Astrodynamic Physics & Mathematical Foundations */}
      <section className="py-16 px-6 max-w-6xl mx-auto">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 text-xs font-mono mb-3">
            <Orbit className="w-3.5 h-3.5" />
            PHYSICAL FORMULATIONS
          </div>
          <h2 className="text-3xl font-bold">Astrodynamic Foundations</h2>
          <p className="text-muted-foreground mt-2 text-sm md:text-base">
            Every AI negotiation and collision alert is grounded in classical orbital mechanics and statistical space surveillance mathematics.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-6 rounded-xl bg-card border border-border">
            <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs mb-2">
              <Orbit className="w-4 h-4" />
              <span>SGP4 ORBITAL PROPAGATION</span>
            </div>
            <h3 className="font-bold text-lg mb-2">Simplified General Perturbations (SGP4)</h3>
            <p className="text-xs text-muted-foreground leading-relaxed mb-4">
              Integrates third-body gravitational perturbations (Moon, Sun), Earth geopotential zonal harmonics (J2, J3, J4), and atmospheric drag ballistic coefficients (B*) across low-Earth and geostationary regimes.
            </p>
            <div className="p-3 rounded-lg bg-muted/60 font-mono text-xs text-foreground border border-border/60">
              r(t), v(t) = SGP4(TLE_epoch, t - t0, B*, i, Ω, e, ω, M0, n0)
            </div>
          </div>

          <div className="p-6 rounded-xl bg-card border border-border">
            <div className="flex items-center gap-2 text-purple-400 font-mono text-xs mb-2">
              <Activity className="w-4 h-4" />
              <span>B-PLANE COVARIANCE PROJECTION</span>
            </div>
            <h3 className="font-bold text-lg mb-2">Encounter Plane Collision Probability (Pc)</h3>
            <p className="text-xs text-muted-foreground leading-relaxed mb-4">
              Projects 3D Cartesian position covariances (C1, C2) into the relative velocity encounter B-plane, performing 2D Gaussian integration over the combined hard-body collision cross-section.
            </p>
            <div className="p-3 rounded-lg bg-muted/60 font-mono text-xs text-foreground border border-border/60">
              Pc = (1 / 2π σx σy) ∬ exp[-0.5 (x²/σx² + y²/σy²)] dx dy
            </div>
          </div>

          <div className="p-6 rounded-xl bg-card border border-border">
            <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs mb-2">
              <Flame className="w-4 h-4" />
              <span>KESSLER SYNDROME EPIDEMIOLOGY</span>
            </div>
            <h3 className="font-bold text-lg mb-2">Orbital Shell SIR Cascade Model</h3>
            <p className="text-xs text-muted-foreground leading-relaxed mb-4">
              Treats satellites as Susceptible (S), active debris fragments as Infectious (I), and atmospheric burnup removals as Recovered (R), forecasting cascade tipping points (R0 &gt; 1.0).
            </p>
            <div className="p-3 rounded-lg bg-muted/60 font-mono text-xs text-foreground border border-border/60">
              dS/dt = -β·S·I,  dI/dt = β·S·I - γ·I,  R0 = β·S0 / γ
            </div>
          </div>

          <div className="p-6 rounded-xl bg-card border border-border">
            <div className="flex items-center gap-2 text-amber-400 font-mono text-xs mb-2">
              <Zap className="w-4 h-4" />
              <span>MANEUVER OPTIMIZATION</span>
            </div>
            <h3 className="font-bold text-lg mb-2">Clohessy-Wiltshire Impulsive Burn Vectors</h3>
            <p className="text-xs text-muted-foreground leading-relaxed mb-4">
              Calculates in-track and cross-track delta-V burns required to displace miss distance outside the 3-sigma error ellipsoid while conserving satellite station-keeping fuel.
            </p>
            <div className="p-3 rounded-lg bg-muted/60 font-mono text-xs text-foreground border border-border/60">
              ΔV = sqrt(ΔVx² + ΔVy² + ΔVz²);  Δx(tca) ≥ 25.0 km
            </div>
          </div>
        </div>
      </section>

      {/* CTA Footer */}
      <footer className="py-12 px-6 border-t border-border bg-muted/10">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <AuralisLogo size="sm" />
            <span className="text-xs text-muted-foreground">
              Autonomous Orbital Intelligence & Collision Avoidance
            </span>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/docs"
              className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
              API & Developer Docs
            </Link>
            <span className="text-border">|</span>
            <Link
              href="/dashboard"
              className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1"
            >
              Open Command Center <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
