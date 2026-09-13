"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useTheme } from "@/lib/ThemeContext";
import { AuralisLogo } from "@/components/ui/AuralisLogo";
import {
  ArrowLeft,
  BookOpen,
  FileCode,
  Database,
  CheckCircle2,
  Copy,
  Check,
  Sun,
  Moon,
  Satellite,
  AlertTriangle,
  Activity,
  Shield,
  MessageSquare,
  Zap
} from "lucide-react";

export default function DataContractsPage() {
  const { theme, toggleTheme } = useTheme();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<"typescript" | "python">("typescript");

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const dataSchemas = {
    TrackedObject: {
      description: "Physical and orbital definition of any cataloged entity in orbit. Distances in km, velocities in km/s, angles in degrees.",
      category: "Core Entities",
      icon: Satellite,
      color: "cyan",
      typescript: `interface TrackedObject {
  id: string;                          // UUID v4
  noradId: number;                     // NORAD catalog number (e.g. 25544)
  name: string;                        // Human-readable name
  type: ObjectType;                    // "satellite" | "debris" | "rocket_body" | "unknown"
  operatorId: string | null;           // UUID of operator, null for debris

  // State vector (ECI J2000, km & km/s) at epoch
  position: {
    x: number;                         // km
    y: number;                         // km
    z: number;                         // km
  };
  velocity: {
    vx: number;                        // km/s
    vy: number;                        // km/s
    vz: number;                        // km/s
  };

  // Keplerian elements (derived, for display)
  orbitalElements: {
    semiMajorAxis: number;             // km
    eccentricity: number;              // dimensionless
    inclination: number;               // degrees
    raan: number;                      // Right Ascension Ascending Node, degrees
    argOfPerigee: number;              // degrees
    meanAnomaly: number;               // degrees
  };

  // Covariance (position-only, 3x3 symmetric, km²)
  // Row-major upper triangle: [σ_xx, σ_xy, σ_xz, σ_yy, σ_yz, σ_zz]
  covarianceUpperTriangle: [number, number, number, number, number, number];

  altitude: number;                    // Current altitude above WGS-84 ellipsoid, km
  shellId: string;                     // Altitude shell (e.g. "LEO_400_450")
  epoch: string;                       // ISO 8601 UTC
  lastUpdated: string;                 // ISO 8601 UTC
  status: ObjectStatus;                // "active" | "decayed" | "maneuvering" | "unknown"
}`,
      python: `from typing import Optional, Literal
from pydantic import BaseModel

class Position(BaseModel):
    x: float  # km
    y: float  # km
    z: float  # km

class Velocity(BaseModel):
    vx: float  # km/s
    vy: float  # km/s
    vz: float  # km/s

class OrbitalElements(BaseModel):
    semiMajorAxis: float      # km
    eccentricity: float       # dimensionless
    inclination: float        # degrees
    raan: float               # degrees
    argOfPerigee: float       # degrees
    meanAnomaly: float        # degrees

class TrackedObject(BaseModel):
    id: str
    noradId: int
    name: str
    type: Literal["satellite", "debris", "rocket_body", "unknown"]
    operatorId: Optional[str]
    position: Position
    velocity: Velocity
    orbitalElements: OrbitalElements
    covarianceUpperTriangle: tuple[float, float, float, float, float, float]
    altitude: float
    shellId: str
    epoch: str              # ISO 8601
    lastUpdated: str        # ISO 8601
    status: Literal["active", "decayed", "maneuvering", "unknown"]`
    },
    ConjunctionEvent: {
      description: "Close-approach screening result between two orbiting objects with collision probability assessment.",
      category: "Core Entities",
      icon: AlertTriangle,
      color: "amber",
      typescript: `interface ConjunctionEvent {
  id: string;                          // UUID v4
  primaryObjectId: string;             // TrackedObject.id — object at risk
  secondaryObjectId: string;           // TrackedObject.id — other object
  tca: string;                         // Time of Closest Approach, ISO 8601 UTC
  missDistance: number;                // km at TCA
  relativeVelocity: number;            // km/s at TCA
  collisionProbability: number;        // dimensionless, e.g. 2.3e-3
  maxCollisionProbability: number;     // highest Pc seen across screening updates
  riskLevel: RiskLevel;                // "nominal" | "elevated" | "critical"
  status: ConjunctionStatus;          // "active" | "mitigated" | "monitoring" | "expired"
  screeningWindowStart: string;        // ISO 8601 UTC
  screeningWindowEnd: string;          // ISO 8601 UTC
  maneuverProposalId: string | null;   // linked ManeuverProposal.id
  createdAt: string;                   // ISO 8601 UTC
  updatedAt: string;                   // ISO 8601 UTC
}

type RiskLevel = "nominal" | "elevated" | "critical";
// nominal:  Pc < 1e-4
// elevated: 1e-4 <= Pc < 1e-3
// critical: Pc >= 1e-3

type ConjunctionStatus =
  | "active"          // TCA in future, no mitigation yet
  | "mitigated"       // maneuver executed, Pc reduced
  | "monitoring"      // below action threshold
  | "expired"         // TCA has passed
  | "false_alarm";    // re-screening showed lower Pc`,
      python: `from typing import Optional, Literal
from pydantic import BaseModel

RiskLevel = Literal["nominal", "elevated", "critical"]
ConjunctionStatus = Literal["active", "mitigated", "monitoring", "expired", "false_alarm"]

class ConjunctionEvent(BaseModel):
    id: str
    primaryObjectId: str
    secondaryObjectId: str
    tca: str                          # ISO 8601
    missDistance: float               # km
    relativeVelocity: float           # km/s
    collisionProbability: float       # dimensionless
    maxCollisionProbability: float
    riskLevel: RiskLevel
    status: ConjunctionStatus
    screeningWindowStart: str         # ISO 8601
    screeningWindowEnd: str           # ISO 8601
    maneuverProposalId: Optional[str]
    createdAt: str                    # ISO 8601
    updatedAt: str                    # ISO 8601`
    },
    ManeuverProposal: {
      description: "Autonomous collision-avoidance maneuver negotiated between operator agents with full decision audit trail.",
      category: "Core Entities",
      icon: Activity,
      color: "purple",
      typescript: `interface ManeuverProposal {
  id: string;                          // UUID v4
  conjunctionEventId: string;          // ConjunctionEvent this resolves
  maneuveringObjectId: string;         // TrackedObject.id — who moves
  operatorAgentId: string;             // which operator agent proposed it
  opposingOperatorAgentId: string;     // other operator in negotiation

  deltaV: {
    magnitude: number;                 // m/s
    direction: {                       // unit vector in ECI frame
      x: number;
      y: number;
      z: number;
    };
  };

  burnTime: string;                    // ISO 8601 UTC — when burn executes
  fuelCost: number;                    // kg of propellant (estimated)
  rationale: string;                   // plain-text reason

  negotiationStatus: NegotiationStatus;
  negotiationLog: NegotiationLogEntry[];
  resultingPc: number | null;          // Pc after maneuver
  createdAt: string;                   // ISO 8601 UTC
  resolvedAt: string | null;           // ISO 8601 UTC or null
}

interface NegotiationLogEntry {
  timestamp: string;                   // ISO 8601 UTC
  agentId: string;                     // which agent said this
  action: string;                      // "BID", "ACCEPT", "COUNTER", "REJECT"
  message: string;                     // human-readable log line
  deltaVBid: number | null;            // m/s, if this entry includes a bid
}

type NegotiationStatus =
  | "pending"         // not yet started
  | "negotiating"     // bids being exchanged
  | "accepted"        // both parties agreed
  | "rejected"        // no agreement
  | "timeout";        // window expired`,
      python: `from typing import Optional, Literal, List
from pydantic import BaseModel

NegotiationStatus = Literal["pending", "negotiating", "accepted", "rejected", "timeout"]

class DeltaVDirection(BaseModel):
    x: float
    y: float
    z: float

class DeltaV(BaseModel):
    magnitude: float      # m/s
    direction: DeltaVDirection

class NegotiationLogEntry(BaseModel):
    timestamp: str
    agentId: str
    action: str
    message: str
    deltaVBid: Optional[float]

class ManeuverProposal(BaseModel):
    id: str
    conjunctionEventId: str
    maneuveringObjectId: str
    operatorAgentId: str
    opposingOperatorAgentId: str
    deltaV: DeltaV
    burnTime: str
    fuelCost: float
    rationale: str
    negotiationStatus: NegotiationStatus
    negotiationLog: List[NegotiationLogEntry]
    resultingPc: Optional[float]
    createdAt: str
    resolvedAt: Optional[str]`
    },
    ShellRiskSnapshot: {
      description: "SIR epidemic model state and 50-year projection for a 50km orbital altitude band.",
      category: "Analytics",
      icon: Zap,
      color: "emerald",
      typescript: `interface ShellRiskSnapshot {
  shellId: string;                     // e.g. "LEO_400_450"
  altitudeMin: number;                 // km (lower bound)
  altitudeMax: number;                 // km (upper bound)
  timestamp: string;                   // ISO 8601 UTC

  // SIR model state
  susceptibleCount: number;            // S — intact objects that could be hit
  infectedCount: number;               // I — collision-generated fragments
  removedCount: number;                // R — decayed / deorbited
  totalObjectCount: number;            // S + I + R

  debrisDensity: number;               // objects per km³
  r0: number;                          // reproduction number (>1.0 = runaway cascade)
  trend: CascadeTrend;                 // "increasing" | "stable" | "decreasing"

  // Time-series projection (for charting)
  projectionYears: number[];           // e.g. [0, 5, 10, 15, ..., 50]
  projectedS: number[];               // S counts at each year
  projectedI: number[];               // I counts at each year
  projectedR: number[];               // R counts at each year
}

type CascadeTrend = "increasing" | "stable" | "decreasing";`,
      python: `from typing import Literal, List
from pydantic import BaseModel

CascadeTrend = Literal["increasing", "stable", "decreasing"]

class ShellRiskSnapshot(BaseModel):
    shellId: str
    altitudeMin: float
    altitudeMax: float
    timestamp: str
    susceptibleCount: int
    infectedCount: int
    removedCount: int
    totalObjectCount: int
    debrisDensity: float
    r0: float
    trend: CascadeTrend
    projectionYears: List[float]
    projectedS: List[int]
    projectedI: List[int]
    projectedR: List[int]`
    },
    AgentMessage: {
      description: "Standard internal message envelope for agent-to-agent communication via message bus.",
      category: "Agent Protocol",
      icon: MessageSquare,
      color: "indigo",
      typescript: `interface AgentMessage<T = unknown> {
  messageId: string;                   // UUID v4
  timestamp: string;                   // ISO 8601 UTC
  source: AgentType;                   // sender
  target: AgentType | "broadcast";     // receiver
  type: string;                        // message type discriminator
  correlationId: string | null;        // links related messages
  payload: T;                          // strongly-typed per message type
}

type AgentType =
  | "tracker"
  | "risk_assessor"
  | "epidemic_forecaster"
  | "maneuver_negotiation"
  | "anomaly"
  | "advisory";

// Example message types:
// "state_vectors_updated"    → Risk Assessor
// "high_pc_conjunction"      → Maneuver Negotiation
// "maneuver_resolved"        → Risk Assessor
// "cascade_forecast_complete" → Advisory
// "anomaly_detected"         → Risk Assessor`,
      python: `from typing import Optional, Union, Literal, Generic, TypeVar
from pydantic import BaseModel

AgentType = Literal[
    "tracker",
    "risk_assessor", 
    "epidemic_forecaster",
    "maneuver_negotiation",
    "anomaly",
    "advisory"
]

T = TypeVar('T')

class AgentMessage(BaseModel, Generic[T]):
    messageId: str
    timestamp: str
    source: AgentType
    target: Union[AgentType, Literal["broadcast"]]
    type: str
    correlationId: Optional[str]
    payload: T`
    },
    AuditLogEntry: {
      description: "Immutable record of every critical system decision and transition for regulatory compliance.",
      category: "Governance",
      icon: Shield,
      color: "rose",
      typescript: `interface AuditLogEntry {
  id: string;                          // UUID v4
  timestamp: string;                   // ISO 8601 UTC
  agentId: string;
  agentType: AgentType;
  action: AuditAction;                 // see enum below
  description: string;                 // human-readable summary
  relatedEntityId: string | null;      // ID of object/event/proposal
  relatedEntityType: "conjunction" | "object" | "maneuver" | "shell" | null;
  metadata: Record<string, unknown>;   // free-form additional data
}

type AuditAction =
  | "tle_ingested"
  | "propagation_complete"
  | "conjunction_detected"
  | "conjunction_updated"
  | "conjunction_expired"
  | "maneuver_proposed"
  | "maneuver_accepted"
  | "maneuver_rejected"
  | "maneuver_executed"
  | "cascade_forecast_updated"
  | "anomaly_detected"
  | "advisory_generated"
  | "crisis_injected";`,
      python: `from typing import Optional, Literal, Dict, Any
from pydantic import BaseModel

AuditAction = Literal[
    "tle_ingested",
    "propagation_complete",
    "conjunction_detected",
    "conjunction_updated",
    "conjunction_expired",
    "maneuver_proposed",
    "maneuver_accepted",
    "maneuver_rejected",
    "maneuver_executed",
    "cascade_forecast_updated",
    "anomaly_detected",
    "advisory_generated",
    "crisis_injected"
]

EntityType = Literal["conjunction", "object", "maneuver", "shell"]

class AuditLogEntry(BaseModel):
    id: str
    timestamp: str
    agentId: str
    agentType: str
    action: AuditAction
    description: str
    relatedEntityId: Optional[str]
    relatedEntityType: Optional[EntityType]
    metadata: Dict[str, Any]`
    }
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
            <FileCode className="w-3.5 h-3.5" />
            DATA CONTRACTS & SCHEMAS
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 p-1 rounded-xl bg-muted border border-border">
            {(["typescript", "python"] as const).map((lang) => (
              <button
                key={lang}
                onClick={() => setSelectedLanguage(lang)}
                className={`px-3 py-1 rounded-lg text-xs font-mono uppercase transition-all ${
                  selectedLanguage === lang
                    ? "bg-background text-cyan-400 font-semibold shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {lang}
              </button>
            ))}
          </div>

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
            INTERFACE CONTRACT SPECIFICATION
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold">
            Data Contracts & Type Schemas
          </h1>
          <p className="text-lg text-muted-foreground leading-relaxed max-w-3xl">
            Canonical data shape definitions across frontend, backend, and data layers. 
            All fields use camelCase. Timestamps are ISO 8601 UTC. Distances in kilometers. 
            Velocities in km/s. Angles in degrees.
          </p>
        </section>

        {/* Contract Principles */}
        <section className="p-6 rounded-2xl bg-card border border-border space-y-4">
          <h2 className="text-sm font-mono text-cyan-400 uppercase">Contract Principles</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-semibold">Immutable Shapes</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Field names and types never change without version increment
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-semibold">Strict Validation</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Runtime validation via Zod (TS) or Pydantic (Python)
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-semibold">Backward Compatible</div>
                <p className="text-xs text-muted-foreground mt-1">
                  New fields added as optional, deprecated fields kept for 2 versions
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Schema Definitions */}
        <section className="space-y-8">
          {Object.entries(dataSchemas).map(([schemaName, schema]) => {
            const Icon = schema.icon;
            const code = selectedLanguage === "typescript" ? schema.typescript : schema.python;
            return (
              <div key={schemaName} className="p-6 rounded-2xl bg-card border-2 border-border space-y-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className={`p-2 rounded-lg bg-${schema.color}-500/10 border border-${schema.color}-500/30`}>
                        <Icon className={`w-5 h-5 text-${schema.color}-400`} />
                      </div>
                      <div>
                        <div className="text-xs font-mono text-muted-foreground uppercase">{schema.category}</div>
                        <h3 className="text-xl font-bold">{schemaName}</h3>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">{schema.description}</p>
                  </div>

                  <button
                    onClick={() => copyToClipboard(code, schemaName)}
                    className="p-2 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 hover:bg-muted rounded-lg transition-colors"
                  >
                    {copiedId === schemaName ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="p-4 rounded-xl bg-zinc-950 border border-border overflow-x-auto">
                  <pre className="text-xs font-mono text-zinc-300 leading-relaxed">
                    {code}
                  </pre>
                </div>
              </div>
            );
          })}
        </section>

        {/* Field Naming Conventions */}
        <section className="space-y-6 pt-4 border-t border-border">
          <div>
            <div className="text-xs font-mono text-cyan-400 uppercase">CONVENTIONS</div>
            <h2 className="text-2xl font-bold mt-1">Field Naming & Unit Standards</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-xl bg-card border border-border space-y-3">
              <div className="text-sm font-semibold text-cyan-400">Naming Conventions</div>
              <ul className="space-y-2 text-xs">
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400 shrink-0">•</span>
                  <div>
                    <code className="font-mono text-emerald-400">camelCase</code> for all field names
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400 shrink-0">•</span>
                  <div>
                    <code className="font-mono text-emerald-400">Id</code> suffix for UUID references
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400 shrink-0">•</span>
                  <div>
                    <code className="font-mono text-emerald-400">At</code> suffix for timestamps (e.g., <code className="text-amber-400">createdAt</code>)
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400 shrink-0">•</span>
                  <div>
                    <code className="font-mono text-emerald-400">Count</code> suffix for integers
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400 shrink-0">•</span>
                  <div>
                    Boolean fields start with <code className="font-mono text-emerald-400">is</code> or <code className="font-mono text-emerald-400">has</code>
                  </div>
                </li>
              </ul>
            </div>

            <div className="p-5 rounded-xl bg-card border border-border space-y-3">
              <div className="text-sm font-semibold text-purple-400">Unit Standards</div>
              <ul className="space-y-2 text-xs">
                <li className="flex items-start gap-2">
                  <span className="text-purple-400 shrink-0">•</span>
                  <div>
                    <strong>Distance:</strong> kilometers (km)
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-400 shrink-0">•</span>
                  <div>
                    <strong>Velocity:</strong> kilometers per second (km/s)
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-400 shrink-0">•</span>
                  <div>
                    <strong>Delta-v:</strong> meters per second (m/s)
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-400 shrink-0">•</span>
                  <div>
                    <strong>Angles:</strong> degrees (not radians)
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-400 shrink-0">•</span>
                  <div>
                    <strong>Timestamps:</strong> ISO 8601 UTC strings
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-400 shrink-0">•</span>
                  <div>
                    <strong>Probabilities:</strong> dimensionless float (0.0–1.0)
                  </div>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Enum Definitions */}
        <section className="space-y-6 pt-4 border-t border-border mb-16">
          <div>
            <div className="text-xs font-mono text-cyan-400 uppercase">ENUMS & VOCABULARIES</div>
            <h2 className="text-2xl font-bold mt-1">Fixed String Enumerations</h2>
            <p className="text-muted-foreground text-sm mt-2">
              These strings must be used exactly as written. No synonyms, no different casing.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-card border border-border space-y-6">
            {[
              {
                name: "ObjectType",
                values: ["satellite", "debris", "rocket_body", "unknown"],
                description: "Classification of tracked orbital objects"
              },
              {
                name: "ObjectStatus",
                values: ["active", "decayed", "maneuvering", "unknown"],
                description: "Operational status of a tracked object"
              },
              {
                name: "RiskLevel",
                values: ["nominal", "elevated", "critical"],
                description: "Conjunction risk level (nominal: Pc < 1e-4, elevated: 1e-4 ≤ Pc < 1e-3, critical: Pc ≥ 1e-3)"
              },
              {
                name: "ConjunctionStatus",
                values: ["active", "mitigated", "monitoring", "expired", "false_alarm"],
                description: "Lifecycle state of a conjunction event"
              },
              {
                name: "NegotiationStatus",
                values: ["pending", "negotiating", "accepted", "rejected", "timeout"],
                description: "State of bilateral maneuver negotiation"
              },
              {
                name: "AgentType",
                values: ["tracker", "risk_assessor", "epidemic_forecaster", "maneuver_negotiation", "anomaly", "advisory"],
                description: "The 6 autonomous agents in Auralis"
              },
              {
                name: "AgentState",
                values: ["idle", "processing", "alert", "error"],
                description: "Health/activity state of an agent"
              },
              {
                name: "CascadeTrend",
                values: ["increasing", "stable", "decreasing"],
                description: "SIR cascade epidemic trend for orbital shell"
              }
            ].map((enumDef, idx) => (
              <div key={idx} className="pb-4 border-b border-border last:border-0 last:pb-0">
                <div className="flex items-center justify-between mb-2">
                  <div className="text-sm font-mono font-semibold text-cyan-400">{enumDef.name}</div>
                  <button
                    onClick={() => copyToClipboard(
                      selectedLanguage === "typescript"
                        ? `type ${enumDef.name} = ${enumDef.values.map(v => `"${v}"`).join(" | ")};`
                        : `${enumDef.name} = Literal[${enumDef.values.map(v => `"${v}"`).join(", ")}]`,
                      `enum-${idx}`
                    )}
                    className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                  >
                    {copiedId === `enum-${idx}` ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mb-3">{enumDef.description}</p>
                <div className="flex flex-wrap gap-2">
                  {enumDef.values.map((value, vidx) => (
                    <code key={vidx} className="px-2 py-1 rounded bg-muted text-xs font-mono text-emerald-400 border border-border">
                      "{value}"
                    </code>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-border bg-muted/10">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AuralisLogo size="sm" />
            <span className="text-xs text-muted-foreground">
              Auralis Data Contracts & Interface Specification
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <Link href="/docs" className="text-muted-foreground hover:text-foreground transition-colors">
              API Documentation
            </Link>
            <span className="text-muted-foreground">•</span>
            <Link href="/docs/system-design" className="text-muted-foreground hover:text-foreground transition-colors">
              System Design
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
