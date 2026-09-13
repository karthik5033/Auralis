"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useTheme } from "@/lib/ThemeContext";
import { AuralisLogo } from "@/components/ui/AuralisLogo";
import {
  ArrowLeft,
  BookOpen,
  Network,
  Database,
  Cpu,
  Radio,
  Zap,
  Shield,
  Cloud,
  GitBranch,
  Server,
  Activity,
  Lock,
  CheckCircle2,
  AlertTriangle,
  Sun,
  Moon,
  Copy,
  Check
} from "lucide-react";

export default function SystemDesignPage() {
  const { theme, toggleTheme } = useTheme();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="flex items-center gap-6">
          <Link href="/docs" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
            <ArrowLeft className="w-4 h-4" />
            <AuralisLogo size="sm" />
          </Link>
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-xs font-mono text-cyan-400">
            <Network className="w-3.5 h-3.5" />
            SYSTEM DESIGN & ARCHITECTURE
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/docs"
            className="px-3 py-1.5 text-sm font-medium border border-border rounded-lg hover:bg-muted transition-all"
          >
            <BookOpen className="w-4 h-4 inline mr-1.5 text-cyan-400" />
            API Docs
          </Link>

          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 border border-border rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            {theme === "dark" ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-12 space-y-16">
        {/* Hero Section */}
        <section className="space-y-4">
          <div className="inline-block px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-xs font-mono text-cyan-400">
            TECHNICAL SPECIFICATION v2.4
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold">
            System Design & Architecture
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-3xl">
            Comprehensive technical documentation of Auralis's distributed agentic architecture, 
            data flow patterns, and orbital intelligence infrastructure.
          </p>
        </section>

        {/* Table of Contents */}
        <section className="p-6 rounded-2xl bg-card border border-border">
          <h2 className="text-sm font-mono text-cyan-400 uppercase mb-4">Quick Navigation</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {[
              { id: "overview", label: "Architecture Overview", icon: Network },
              { id: "data-flow", label: "Data Flow Patterns", icon: GitBranch },
              { id: "agents", label: "Multi-Agent System", icon: Cpu },
              { id: "persistence", label: "Data Persistence", icon: Database },
              { id: "security", label: "Security Model", icon: Shield },
              { id: "scalability", label: "Scalability Strategy", icon: Cloud }
            ].map((item) => {
              const Icon = item.icon;
              return (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className="flex items-center gap-2 p-3 rounded-lg border border-border hover:bg-muted transition-colors text-sm"
                >
                  <Icon className="w-4 h-4 text-cyan-400" />
                  <span>{item.label}</span>
                </a>
              );
            })}
          </div>
        </section>

        {/* Architecture Overview */}
        <section id="overview" className="space-y-6 pt-4 border-t border-border">
          <div>
            <div className="text-xs font-mono text-cyan-400 uppercase">SECTION 1</div>
            <h2 className="text-3xl font-bold mt-1">Architecture Overview</h2>
            <p className="text-muted-foreground mt-2">
              Auralis implements a modern microservices-inspired architecture within a Next.js monorepo, 
              featuring autonomous agents, real-time streaming, and pluggable data sources.
            </p>
          </div>

          {/* High-Level Architecture Diagram */}
          <div className="p-6 rounded-2xl bg-card border border-border space-y-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Network className="w-4 h-4 text-cyan-400" />
              System Component Topology
            </h3>
            
            <div className="p-8 rounded-xl bg-muted/30 border-2 border-dashed border-border">
              <pre className="text-xs font-mono text-muted-foreground whitespace-pre leading-relaxed">
{`┌─────────────────────────────────────────────────────────────────┐
│                        EXTERNAL SERVICES                         │
├─────────────────────────────────────────────────────────────────┤
│  CelesTrak API  │  Space-Track.org  │  Gemini 2.5 Flash API   │
│   (TLE Data)    │    (CDM Data)     │  (Advisory Generation)  │
└────────┬────────┴──────────┬────────┴──────────┬───────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                    DATA INGESTION LAYER                         │
├─────────────────────────────────────────────────────────────────┤
│  • TLE Parser & Validator                                       │
│  • CDM Parser (CCSDS Format)                                    │
│  • Rate Limiting & Caching (10-min TTL)                         │
│  • Error Handling & Fallback to Local Fixtures                  │
└────────┬────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    ASTRODYNAMICS ENGINE                         │
├─────────────────────────────────────────────────────────────────┤
│  • SGP4 Orbit Propagator (satellite.js)                         │
│  • Coordinate Frame Transformations (TEME → ECEF → Geodetic)    │
│  • Keplerian Element Derivation                                 │
│  • Covariance Matrix Computation                                │
└────────┬────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    AGENT ORCHESTRATION LAYER                    │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │   Tracker    │  │ Risk Assessor│  │   Epidemic   │        │
│  │    Agent     │  │    Agent     │  │  Forecaster  │        │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘        │
│         │                  │                  │                 │
│         └──────────────────┴──────────────────┘                 │
│                           │                                     │
│  ┌────────────────────────▼────────────────────────┐          │
│  │            Message Bus (Event Stream)            │          │
│  └────────────────────┬─────────────────────────────┘          │
│                       │                                         │
│         ┌─────────────┴─────────────┐                          │
│         ▼                           ▼                           │
│  ┌──────────────┐           ┌──────────────┐                  │
│  │   Maneuver   │           │   Advisory   │                  │
│  │ Negotiation  │           │    Agent     │                  │
│  └──────────────┘           └──────────────┘                  │
└────────┬────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    DATA PERSISTENCE LAYER                       │
├─────────────────────────────────────────────────────────────────┤
│  • In-Memory Store (Map-based collections)                      │
│  • Optional File-System Persistence                             │
│  • Redis Cache (Phase 2)                                        │
│  • PostgreSQL Database (Phase 2)                                │
└────────┬────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    API & STREAMING LAYER                        │
├─────────────────────────────────────────────────────────────────┤
│  • REST API (11 endpoints)                                      │
│  • Server-Sent Events (SSE) Real-Time Stream                    │
│  • WebSocket Support (Phase 2)                                  │
│  • Rate Limiting & Authentication                               │
└────────┬────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND APPLICATION                         │
├─────────────────────────────────────────────────────────────────┤
│  • Next.js 16 App Router                                        │
│  • React 19 with Suspense                                       │
│  • Globe.gl 3D Visualization                                    │
│  • Recharts Analytics Dashboards                                │
│  • Dark/Light Theme Support                                     │
└─────────────────────────────────────────────────────────────────┘`}
              </pre>
            </div>
          </div>

          {/* Key Design Principles */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-xl bg-card border border-border space-y-2">
              <div className="flex items-center gap-2 text-cyan-400 font-semibold text-sm">
                <CheckCircle2 className="w-4 h-4" />
                Event-Driven Architecture
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Agents communicate via message bus, enabling loose coupling, independent scaling, 
                and easy addition of new agents without modifying existing ones.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-card border border-border space-y-2">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
                <CheckCircle2 className="w-4 h-4" />
                Graceful Degradation
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                External API failures automatically fallback to cached data or local fixtures, 
                ensuring uninterrupted operation even with network issues.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-card border border-border space-y-2">
              <div className="flex items-center gap-2 text-purple-400 font-semibold text-sm">
                <CheckCircle2 className="w-4 h-4" />
                Zero-Downtime Updates
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Hot-reloadable agent configurations, versioned API contracts, and backward-compatible 
                data schemas enable continuous deployment without service interruption.
              </p>
            </div>

            <div className="p-5 rounded-xl bg-card border border-border space-y-2">
              <div className="flex items-center gap-2 text-amber-400 font-semibold text-sm">
                <CheckCircle2 className="w-4 h-4" />
                Audit-First Design
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Every state change, decision, and external API call is logged with timestamps, 
                correlation IDs, and full context for regulatory compliance and debugging.
              </p>
            </div>
          </div>
        </section>

        {/* Data Flow Patterns */}
        <section id="data-flow" className="space-y-6 pt-4 border-t border-border">
          <div>
            <div className="text-xs font-mono text-cyan-400 uppercase">SECTION 2</div>
            <h2 className="text-3xl font-bold mt-1">Data Flow Patterns</h2>
            <p className="text-muted-foreground mt-2">
              Understanding how data moves through Auralis from ingestion to visualization.
            </p>
          </div>

          {/* Conjunction Detection Flow */}
          <div className="p-6 rounded-2xl bg-card border border-border space-y-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-cyan-400" />
              Conjunction Detection & Resolution Flow
            </h3>

            <div className="space-y-3">
              {[
                { step: "1", agent: "Tracker Agent", action: "Ingests TLEs from CelesTrak/Space-Track", time: "Every 5 minutes" },
                { step: "2", agent: "Tracker Agent", action: "Propagates orbits using SGP4 for 72-hour window", time: "< 2 seconds" },
                { step: "3", agent: "Tracker Agent", action: "Publishes state_vectors_updated message to bus", time: "Instant" },
                { step: "4", agent: "Risk Assessor Agent", action: "Performs all-on-all screening with 5km pre-filter", time: "< 5 seconds" },
                { step: "5", agent: "Risk Assessor Agent", action: "Computes Pc using Foster-1992 or Monte Carlo", time: "< 1 second" },
                { step: "6", agent: "Risk Assessor Agent", action: "Creates ConjunctionEvent records for Pc > 1e-5", time: "Instant" },
                { step: "7", agent: "Risk Assessor Agent", action: "Publishes high_pc_conjunction for Pc > 1e-4", time: "Instant" },
                { step: "8", agent: "Maneuver Negotiation", action: "Runs bilateral auction between operators", time: "< 500ms" },
                { step: "9", agent: "Maneuver Negotiation", action: "Creates ManeuverProposal with negotiation log", time: "Instant" },
                { step: "10", agent: "Advisory Agent", action: "Generates plain-language summary (LLM or template)", time: "< 3 seconds" },
                { step: "11", agent: "API Layer", action: "Pushes SSE events to connected clients", time: "< 100ms" },
                { step: "12", agent: "Frontend", action: "Updates UI with new conjunction and advisory", time: "Instant" }
              ].map((item) => (
                <div key={item.step} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border/50">
                  <div className="shrink-0 w-8 h-8 rounded-full bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-xs font-bold text-cyan-400">
                    {item.step}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold">{item.agent}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{item.action}</div>
                  </div>
                  <div className="shrink-0 text-xs font-mono text-muted-foreground">
                    {item.time}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Message Bus Specification */}
          <div className="p-6 rounded-2xl bg-card border border-border space-y-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Radio className="w-4 h-4 text-purple-400" />
              Message Bus Event Types
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-3 font-mono text-cyan-400">Event Type</th>
                    <th className="text-left p-3 font-mono text-cyan-400">Publisher</th>
                    <th className="text-left p-3 font-mono text-cyan-400">Subscribers</th>
                    <th className="text-left p-3 font-mono text-cyan-400">Payload</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <tr>
                    <td className="p-3 font-mono text-emerald-400">state_vectors_updated</td>
                    <td className="p-3">Tracker</td>
                    <td className="p-3">Risk Assessor, Epidemic Forecaster</td>
                    <td className="p-3 text-muted-foreground">TrackedObject[]</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono text-amber-400">high_pc_conjunction</td>
                    <td className="p-3">Risk Assessor</td>
                    <td className="p-3">Maneuver Negotiation</td>
                    <td className="p-3 text-muted-foreground">ConjunctionEvent</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono text-purple-400">maneuver_resolved</td>
                    <td className="p-3">Maneuver Negotiation</td>
                    <td className="p-3">Risk Assessor, Advisory</td>
                    <td className="p-3 text-muted-foreground">ManeuverProposal</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono text-cyan-400">cascade_forecast_complete</td>
                    <td className="p-3">Epidemic Forecaster</td>
                    <td className="p-3">Advisory</td>
                    <td className="p-3 text-muted-foreground">ShellRiskSnapshot[]</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono text-rose-400">anomaly_detected</td>
                    <td className="p-3">Anomaly Agent</td>
                    <td className="p-3">Risk Assessor, Advisory</td>
                    <td className="p-3 text-muted-foreground">AnomalyReport</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* Multi-Agent System */}
        <section id="agents" className="space-y-6 pt-4 border-t border-border">
          <div>
            <div className="text-xs font-mono text-cyan-400 uppercase">SECTION 3</div>
            <h2 className="text-3xl font-bold mt-1">Multi-Agent System Design</h2>
            <p className="text-muted-foreground mt-2">
              Six specialized autonomous agents coordinate via message passing to detect, assess, 
              and resolve orbital collision risks.
            </p>
          </div>

          {/* Agent Specifications */}
          <div className="space-y-4">
            {[
              {
                name: "Tracker Agent",
                color: "emerald",
                responsibility: "TLE ingestion, SGP4 propagation, state vector management",
                inputs: ["CelesTrak API", "Space-Track API", "Local TLE fixtures"],
                outputs: ["state_vectors_updated", "shell_population_updated"],
                frequency: "Every 5 minutes (configurable)",
                performance: "Propagates 631 objects in <2 seconds"
              },
              {
                name: "Risk Assessor Agent",
                color: "amber",
                responsibility: "Conjunction screening, collision probability computation",
                inputs: ["state_vectors_updated", "maneuver_resolved", "anomaly_detected"],
                outputs: ["high_pc_conjunction", "risk_assessment_complete", "conjunction:created (SSE)"],
                frequency: "On state vector update",
                performance: "Screens 631 objects (199K pairs) in <5 seconds"
              },
              {
                name: "Maneuver Negotiation Agent",
                color: "cyan",
                responsibility: "Bilateral negotiation, Δv budget optimization",
                inputs: ["high_pc_conjunction"],
                outputs: ["maneuver_resolved", "negotiation_complete", "maneuver:proposed (SSE)"],
                frequency: "On critical conjunction (Pc > 1e-4)",
                performance: "Resolves negotiation in <500ms"
              },
              {
                name: "Epidemic Forecaster Agent",
                color: "purple",
                responsibility: "SIR cascade modeling, R₀ computation, 50-year projection",
                inputs: ["shell_population_updated"],
                outputs: ["cascade_forecast_complete", "shell:updated (SSE)"],
                frequency: "On population update",
                performance: "Computes 16 shells in <1 second"
              },
              {
                name: "Anomaly Agent",
                color: "rose",
                responsibility: "Orbit element change detection, breakup identification",
                inputs: ["state_vectors_updated"],
                outputs: ["anomaly_detected", "anomaly_report", "anomaly:detected (SSE)"],
                frequency: "Every 60 seconds",
                performance: "Scans 631 objects in <500ms"
              },
              {
                name: "Advisory Agent",
                color: "indigo",
                responsibility: "Natural language synthesis, LLM-powered narrative generation",
                inputs: ["risk_assessment_complete", "cascade_forecast_complete", "negotiation_complete", "anomaly_report"],
                outputs: ["advisory:new (SSE)"],
                frequency: "On upstream agent completion",
                performance: "Generates advisory in <3 seconds (LLM) or <50ms (template)"
              }
            ].map((agent, idx) => (
              <div key={idx} className="p-6 rounded-2xl bg-card border-2 border-border space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className={`inline-block px-2.5 py-1 rounded-lg bg-${agent.color}-500/10 border border-${agent.color}-500/30 text-${agent.color}-400 text-xs font-mono font-bold uppercase mb-2`}>
                      Agent {idx + 1}
                    </div>
                    <h3 className="text-lg font-bold">{agent.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{agent.responsibility}</p>
                  </div>
                  <Cpu className={`w-8 h-8 text-${agent.color}-400`} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                  <div className="space-y-2">
                    <div className="font-semibold text-muted-foreground">Inputs</div>
                    <ul className="space-y-1">
                      {agent.inputs.map((input, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                          <span className="font-mono">{input}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="space-y-2">
                    <div className="font-semibold text-muted-foreground">Outputs</div>
                    <ul className="space-y-1">
                      {agent.outputs.map((output, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                          <span className="font-mono">{output}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="pt-3 border-t border-border flex items-center justify-between text-xs">
                  <div>
                    <span className="text-muted-foreground">Frequency:</span>
                    <span className="ml-2 font-mono">{agent.frequency}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Performance:</span>
                    <span className="ml-2 font-mono text-emerald-400">{agent.performance}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Data Persistence */}
        <section id="persistence" className="space-y-6 pt-4 border-t border-border">
          <div>
            <div className="text-xs font-mono text-cyan-400 uppercase">SECTION 4</div>
            <h2 className="text-3xl font-bold mt-1">Data Persistence Strategy</h2>
            <p className="text-muted-foreground mt-2">
              Hybrid persistence model balancing performance and reliability.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-6 rounded-xl bg-card border border-border space-y-3">
              <div className="flex items-center gap-2 text-cyan-400 font-semibold">
                <Database className="w-5 h-5" />
                Phase 1: In-Memory Store
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Current implementation uses TypeScript Map-based collections for maximum performance. 
                Optional file-system persistence available via <code className="font-mono text-cyan-400">AURALIS_PERSISTENCE=true</code>.
              </p>
              <div className="pt-2 space-y-1 text-xs font-mono">
                <div className="text-muted-foreground">Collections:</div>
                <div className="pl-3 space-y-0.5">
                  <div>• objects: Map&lt;string, TrackedObject&gt;</div>
                  <div>• conjunctions: Map&lt;string, ConjunctionEvent&gt;</div>
                  <div>• maneuvers: Map&lt;string, ManeuverProposal&gt;</div>
                  <div>• advisories: Advisory[]</div>
                  <div>• auditLog: AuditLogEntry[]</div>
                </div>
              </div>
            </div>

            <div className="p-6 rounded-xl bg-card border border-border space-y-3">
              <div className="flex items-center gap-2 text-purple-400 font-semibold">
                <Server className="w-5 h-5" />
                Phase 2: PostgreSQL + Redis
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Production deployment uses PostgreSQL for durable storage and Redis for hot-data caching. 
                Write-through cache pattern ensures consistency.
              </p>
              <div className="pt-2 space-y-1 text-xs font-mono">
                <div className="text-muted-foreground">Cache Strategy:</div>
                <div className="pl-3 space-y-0.5">
                  <div>• Dashboard summary: 5 min TTL</div>
                  <div>• Object lists: 2 min TTL</div>
                  <div>• Shell snapshots: 10 min TTL</div>
                  <div>• Conjunction events: No cache (real-time)</div>
                  <div>• Cache hit target: &gt;70%</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Security Model */}
        <section id="security" className="space-y-6 pt-4 border-t border-border">
          <div>
            <div className="text-xs font-mono text-cyan-400 uppercase">SECTION 5</div>
            <h2 className="text-3xl font-bold mt-1">Security Model</h2>
            <p className="text-muted-foreground mt-2">
              Multi-layered security approach for mission-critical orbital operations.
            </p>
          </div>

          <div className="space-y-4">
            <div className="p-5 rounded-xl bg-card border border-border space-y-3">
              <div className="flex items-center gap-2 text-amber-400 font-semibold">
                <Shield className="w-4 h-4" />
                Authentication & Authorization
              </div>
              <div className="text-xs text-muted-foreground space-y-2">
                <p>
                  <strong className="text-foreground">Phase 1:</strong> Mock role-based authentication (operator, flight_dynamics, mission_director, admin)
                </p>
                <p>
                  <strong className="text-foreground">Phase 2:</strong> OAuth 2.0 via next-auth with Google/GitHub providers, JWT-based sessions, 
                  backend RBAC enforcement on all API endpoints
                </p>
              </div>
            </div>

            <div className="p-5 rounded-xl bg-card border border-border space-y-3">
              <div className="flex items-center gap-2 text-cyan-400 font-semibold">
                <Lock className="w-4 h-4" />
                Secrets Management
              </div>
              <div className="text-xs text-muted-foreground space-y-2">
                <p>
                  <strong className="text-foreground">Phase 1:</strong> Environment variables in .env.local (not committed to Git)
                </p>
                <p>
                  <strong className="text-foreground">Phase 2:</strong> HashiCorp Vault integration with automatic secret rotation, 
                  per-environment isolation, audit logging of secret access
                </p>
              </div>
            </div>

            <div className="p-5 rounded-xl bg-card border border-border space-y-3">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                <Activity className="w-4 h-4" />
                Audit Trail
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Every agent decision, API request, and state transition is logged with:
              </p>
              <ul className="text-xs space-y-1 pl-4">
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400">•</span>
                  <span className="text-muted-foreground">ISO 8601 UTC timestamp</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400">•</span>
                  <span className="text-muted-foreground">Agent type and ID</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400">•</span>
                  <span className="text-muted-foreground">Action type (tle_ingested, conjunction_detected, maneuver_approved, etc.)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400">•</span>
                  <span className="text-muted-foreground">Related entity IDs and metadata</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400">•</span>
                  <span className="text-muted-foreground">User identity (when applicable)</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Scalability Strategy */}
        <section id="scalability" className="space-y-6 pt-4 border-t border-border mb-16">
          <div>
            <div className="text-xs font-mono text-cyan-400 uppercase">SECTION 6</div>
            <h2 className="text-3xl font-bold mt-1">Scalability Strategy</h2>
            <p className="text-muted-foreground mt-2">
              Horizontal and vertical scaling approaches for production workloads.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-card border border-border space-y-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Cloud className="w-4 h-4 text-cyan-400" />
              Scaling Targets & Benchmarks
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-3 font-mono text-cyan-400">Metric</th>
                    <th className="text-left p-3 font-mono text-cyan-400">Current (631 objects)</th>
                    <th className="text-left p-3 font-mono text-cyan-400">Target (10K objects)</th>
                    <th className="text-left p-3 font-mono text-cyan-400">Strategy</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <tr>
                    <td className="p-3 font-mono">Propagation Time</td>
                    <td className="p-3 text-emerald-400">&lt; 2 seconds</td>
                    <td className="p-3">&lt; 10 seconds</td>
                    <td className="p-3 text-muted-foreground">Parallel SGP4, Worker threads</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono">Screening Time</td>
                    <td className="p-3 text-emerald-400">&lt; 5 seconds</td>
                    <td className="p-3">&lt; 30 seconds</td>
                    <td className="p-3 text-muted-foreground">Spatial index (R-tree), GPU acceleration</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono">API Latency (P95)</td>
                    <td className="p-3 text-emerald-400">&lt; 100ms</td>
                    <td className="p-3">&lt; 200ms</td>
                    <td className="p-3 text-muted-foreground">Redis caching, CDN</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono">Concurrent Users</td>
                    <td className="p-3 text-emerald-400">50</td>
                    <td className="p-3">500</td>
                    <td className="p-3 text-muted-foreground">Kubernetes auto-scaling, load balancer</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-mono">Database Size</td>
                    <td className="p-3 text-emerald-400">~50 MB</td>
                    <td className="p-3">~5 GB</td>
                    <td className="p-3 text-muted-foreground">PostgreSQL partitioning, archival</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-card border border-border space-y-2">
              <div className="text-xs font-mono text-cyan-400 uppercase">Horizontal Scaling</div>
              <div className="text-sm font-semibold">Kubernetes Deployment</div>
              <p className="text-xs text-muted-foreground">
                Deploy to K8s with 3+ replicas, HPA based on CPU/memory, shared Redis/PostgreSQL
              </p>
            </div>

            <div className="p-4 rounded-xl bg-card border border-border space-y-2">
              <div className="text-xs font-mono text-purple-400 uppercase">Vertical Scaling</div>
              <div className="text-sm font-semibold">Resource Optimization</div>
              <p className="text-xs text-muted-foreground">
                Worker threads for CPU-bound tasks, streaming responses, lazy loading, pagination
              </p>
            </div>

            <div className="p-4 rounded-xl bg-card border border-border space-y-2">
              <div className="text-xs font-mono text-emerald-400 uppercase">Edge Computing</div>
              <div className="text-sm font-semibold">CDN Distribution</div>
              <p className="text-xs text-muted-foreground">
                Static assets via CDN, edge caching for GET endpoints, regional deployments
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-border bg-muted/10">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AuralisLogo size="sm" />
            <span className="text-xs text-muted-foreground">
              Auralis System Design & Architecture Specification
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <Link href="/docs" className="text-muted-foreground hover:text-foreground transition-colors">
              API Documentation
            </Link>
            <span className="text-muted-foreground">•</span>
            <Link href="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
              Command Center
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
