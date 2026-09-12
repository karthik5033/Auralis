/**
 * Auralis Interface Contract Types
 * 
 * Canonical TypeScript definitions mirroring INTERFACE_CONTRACT.md verbatim.
 * This file is the single source of truth across Data, Backend, and Frontend.
 *
 * @see INTERFACE_CONTRACT.md §1, §2, §3, §4
 */

// ============================================================================
// §4. Enums & Fixed Vocabulary
// ============================================================================

/** §4.1 Object classification type */
export type ObjectType = "satellite" | "debris" | "rocket_body" | "unknown";

/** §4.2 Operational / orbital status of a tracked object */
export type ObjectStatus = "active" | "decayed" | "maneuvering" | "unknown";

/**
 * §4.3 Conjunction risk level derived from collision probability (Pc):
 * - nominal:  Pc < 1e-4
 * - elevated: 1e-4 <= Pc < 1e-3
 * - critical: Pc >= 1e-3
 */
export type RiskLevel = "nominal" | "elevated" | "critical";

/** §4.4 Lifecycle status of a conjunction event */
export type ConjunctionStatus =
  | "active"          // TCA is in the future, no mitigation yet
  | "mitigated"       // maneuver executed, Pc reduced below threshold
  | "monitoring"      // below action threshold but being watched
  | "expired"         // TCA has passed with no action needed
  | "false_alarm";    // re-screening showed Pc was overestimated

/** §4.5 State of bilateral maneuver negotiation between operators */
export type NegotiationStatus =
  | "pending"         // negotiation not yet started
  | "negotiating"     // bids are being exchanged
  | "accepted"        // both parties agreed
  | "rejected"        // no agreement reached
  | "timeout";        // negotiation window expired

/** §4.6 The 6 autonomous agents in the Auralis architecture */
export type AgentType =
  | "tracker"
  | "risk_assessor"
  | "epidemic_forecaster"
  | "maneuver_negotiation"
  | "anomaly"
  | "advisory";

/** §4.7 Health / activity state of an agent */
export type AgentState = "idle" | "processing" | "alert" | "error";

/** §4.8 SIR cascade epidemic trend for an orbital shell */
export type CascadeTrend = "increasing" | "stable" | "decreasing";

/** §4.9 Event types recorded in the immutable audit log */
export type AuditAction =
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
  | "crisis_injected";

// ============================================================================
// §1. Core Data Shapes
// ============================================================================

/**
 * §1.1 TrackedObject
 * Physical and orbital definition of any cataloged entity in orbit.
 * Distances in km, velocities in km/s, angles in degrees, epoch in ISO 8601 UTC.
 */
export interface TrackedObject {
  id: string;                          // UUID v4, assigned at ingest
  noradId: number;                     // NORAD catalog number from TLE (e.g. 25544)
  name: string;                        // Human-readable name (e.g. "ISS (ZARYA)")
  type: ObjectType;                    // "satellite" | "debris" | "rocket_body" | "unknown"
  operatorId: string | null;           // UUID of the simulated operator, null for debris

  // --- state vector (ECI J2000, km & km/s) at `epoch` ---
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

  // --- Keplerian elements (derived, for display) ---
  orbitalElements: {
    semiMajorAxis: number;             // km
    eccentricity: number;              // dimensionless
    inclination: number;               // degrees
    raan: number;                      // Right Ascension of Ascending Node, degrees
    argOfPerigee: number;              // degrees
    meanAnomaly: number;               // degrees
  };

  // --- covariance (position-only, 3x3 symmetric, km²) ---
  // Row-major upper triangle: [σ_xx, σ_xy, σ_xz, σ_yy, σ_yz, σ_zz]
  covarianceUpperTriangle: [number, number, number, number, number, number];

  altitude: number;                    // Current altitude above WGS-84 ellipsoid, km
  shellId: string;                     // Which altitude shell this object belongs to (e.g. "LEO_400_450")
  epoch: string;                       // ISO 8601 UTC — when the state vector was valid
  lastUpdated: string;                 // ISO 8601 UTC — when we last refreshed this record
  status: ObjectStatus;                // "active" | "decayed" | "maneuvering" | "unknown"
}

/**
 * §1.2 ConjunctionEvent
 * Close-approach screening result between two orbiting objects.
 */
export interface ConjunctionEvent {
  id: string;                          // UUID v4
  primaryObjectId: string;             // TrackedObject.id — the object "at risk"
  secondaryObjectId: string;           // TrackedObject.id — the other object
  tca: string;                         // Time of Closest Approach, ISO 8601 UTC
  missDistance: number;                 // km at TCA
  relativeVelocity: number;            // km/s at TCA
  collisionProbability: number;        // dimensionless, e.g. 2.3e-3
  maxCollisionProbability: number;     // highest Pc seen across screening updates
  riskLevel: RiskLevel;                // derived from Pc thresholds (see §4)
  status: ConjunctionStatus;          // lifecycle state (see §4)
  screeningWindowStart: string;        // ISO 8601 UTC
  screeningWindowEnd: string;          // ISO 8601 UTC
  maneuverProposalId: string | null;   // linked ManeuverProposal.id, if one exists
  confidenceScore?: number;            // 0-100% autonomous decision confidence (Phase 2.9)
  createdAt: string;                   // ISO 8601 UTC
  updatedAt: string;                   // ISO 8601 UTC
}

/**
 * §1.3 ShellRiskSnapshot
 * SIR epidemic model state and 50-year projection for a 50 km orbital altitude band.
 */
export interface ShellRiskSnapshot {
  shellId: string;                     // e.g. "LEO_400_450"
  altitudeMin: number;                 // km (lower bound of shell)
  altitudeMax: number;                 // km (upper bound of shell)
  timestamp: string;                   // ISO 8601 UTC — when this snapshot was computed

  // --- SIR model state ---
  susceptibleCount: number;            // S — intact objects that could be hit
  infectedCount: number;               // I — collision-generated fragment clouds
  removedCount: number;                // R — objects that have decayed / deorbited
  totalObjectCount: number;            // S + I + R

  debrisDensity: number;               // objects per km³ in this shell
  r0: number;                          // reproduction number — >1.0 means runaway cascade
  trend: CascadeTrend;                 // "increasing" | "stable" | "decreasing"

  // --- time-series projection (for charting) ---
  projectionYears: number[];           // e.g. [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50]
  projectedS: number[];               // S counts at each year
  projectedI: number[];               // I counts at each year
  projectedR: number[];               // R counts at each year
}

/**
 * §1.4 ManeuverProposal
 * Autonomous collision-avoidance maneuver negotiated between operator agents.
 */
export interface ManeuverProposal {
  id: string;                          // UUID v4
  conjunctionEventId: string;          // the ConjunctionEvent this maneuver resolves
  maneuveringObjectId: string;         // TrackedObject.id — who moves
  operatorAgentId: string;             // which operator agent proposed it
  opposingOperatorAgentId: string;     // the other operator in the negotiation

  deltaV: {
    magnitude: number;                 // m/s
    direction: {                       // unit vector in ECI frame
      x: number;
      y: number;
      z: number;
    };
  };

  burnTime: string;                    // ISO 8601 UTC — when the burn executes
  fuelCost: number;                    // kg of propellant (estimated)
  rationale: string;                   // plain-text reason, e.g. "Lower fuel cost; higher remaining Δv budget"

  negotiationStatus: NegotiationStatus;
  negotiationLog: NegotiationLogEntry[];
  resultingPc: number | null;          // Pc after maneuver, null if not yet computed
  createdAt: string;
  resolvedAt: string | null;           // null if still negotiating
}

/** §1.4 Individual entry in a maneuver negotiation transcript */
export interface NegotiationLogEntry {
  timestamp: string;                   // ISO 8601 UTC
  agentId: string;                     // which agent said this
  action: string;                      // e.g. "BID", "ACCEPT", "COUNTER", "REJECT"
  message: string;                     // human-readable log line
  deltaVBid: number | null;            // m/s, if this entry includes a bid
}

/**
 * §1.5 AgentStatus
 * Real-time operational telemetry for each autonomous agent.
 */
export interface AgentStatus {
  agentId: string;                     // e.g. "tracker", "risk-assessor"
  agentName: string;                   // e.g. "Tracker Agent"
  agentType: AgentType;
  state: AgentState;                   // "idle" | "processing" | "alert" | "error"
  lastHeartbeat: string;               // ISO 8601 UTC
  currentTask: string | null;          // human-readable description, null if idle
  processedCount: number;              // total items processed since startup
  errorCount: number;                  // total errors since startup
}

/**
 * §1.6 Advisory
 * Natural-language synthesis produced by the Advisory Agent for mission controllers.
 */
export interface Advisory {
  id: string;                          // UUID v4
  timestamp: string;                   // ISO 8601 UTC
  severity: RiskLevel;                 // "nominal" | "elevated" | "critical"
  title: string;                       // short headline
  body: string;                        // plain-language narrative (1–3 paragraphs)
  relatedEventIds: string[];           // ConjunctionEvent.id references
  relatedObjectIds: string[];          // TrackedObject.id references
  agentSource: AgentType;              // which agent authored it (usually "advisory")
}

/**
 * §1.7 AuditLogEntry
 * Immutable record of every critical system decision and transition.
 */
export interface AuditLogEntry {
  id: string;                          // UUID v4
  timestamp: string;                   // ISO 8601 UTC
  agentId: string;
  agentType: AgentType;
  action: AuditAction;                 // see §4
  description: string;                 // human-readable summary
  relatedEntityId: string | null;      // ID of the object/event/proposal involved
  relatedEntityType: "conjunction" | "object" | "maneuver" | "shell" | null;
  metadata: Record<string, unknown>;   // free-form additional data
}

/**
 * §1.8 CrisisInjectionRequest
 * Payload for injecting simulated orbital catastrophes into the environment.
 */
export interface CrisisInjectionRequest {
  type: "fragmentation" | "collision" | "asat";
  altitude: number;                    // km — center of the event
  fragmentCount: number;               // how many debris pieces to generate
  sourceObjectId: string | null;       // existing object that breaks up, or null for synthetic
  label: string;                       // e.g. "Simulated ASAT Test — 780 km"
}

/**
 * §1.8 CrisisInjectionResponse
 * Immediate acknowledgment and cascade forecast after crisis injection.
 */
export interface CrisisInjectionResponse {
  success: boolean;
  injectedObjectCount: number;
  affectedShellIds: string[];
  newConjunctionEventCount: number;
  timestamp: string;
}

// ============================================================================
// §2. Agent-to-Agent Message Contract
// ============================================================================

/** §2.0 Standard internal message envelope */
export interface AgentMessage<T = unknown> {
  messageId: string;                   // UUID v4
  timestamp: string;                   // ISO 8601 UTC
  source: AgentType;                   // sender
  target: AgentType | "broadcast";     // receiver, or "broadcast" for all
  type: string;                        // message type discriminator
  correlationId: string | null;        // links related messages
  payload: T;                          // strongly-typed per message type
}

/** §2.1 Tracker -> Risk Assessor */
export interface StateVectorsUpdatedPayload {
  epoch: string;                       // propagation epoch
  objects: TrackedObject[];            // full catalog or only changed objects
  isDelta: boolean;                    // true = only changed objects; false = full catalog
}

/** §2.2 Tracker -> Epidemic Forecaster */
export interface ShellPopulationUpdatedPayload {
  timestamp: string;
  shells: Array<{
    shellId: string;
    altitudeMin: number;
    altitudeMax: number;
    objectCount: number;
    debrisCount: number;
    activeCount: number;
  }>;
}

/** §2.3 Risk Assessor -> Maneuver Negotiation */
export interface HighPcConjunctionPayload {
  conjunction: ConjunctionEvent;
  primaryObject: TrackedObject;
  secondaryObject: TrackedObject;
  recommendedAction: "maneuver_primary" | "maneuver_secondary" | "monitor";
}

/** §2.4 Maneuver Negotiation -> Risk Assessor */
export interface ManeuverResolvedPayload {
  proposal: ManeuverProposal;
  updatedObject: TrackedObject;        // post-maneuver state vector
  conjunctionEventId: string;
}

/** §2.5 Risk Assessor -> Advisory */
export interface RiskAssessmentCompletePayload {
  screeningEpoch: string;
  totalPairsScreened: number;
  conjunctionsFound: number;
  criticalEvents: ConjunctionEvent[];  // Pc > 1e-3
  elevatedEvents: ConjunctionEvent[];  // 1e-4 < Pc <= 1e-3
}

/** §2.6 Epidemic Forecaster -> Advisory */
export interface CascadeForecastCompletePayload {
  timestamp: string;
  shellSnapshots: ShellRiskSnapshot[];
  criticalShells: string[];            // shellIds where R0 > 1.0
  overallTrend: CascadeTrend;
}

/** §2.7 Maneuver Negotiation -> Advisory */
export interface NegotiationCompletePayload {
  proposal: ManeuverProposal;
  conjunction: ConjunctionEvent;
  primaryObjectName: string;
  secondaryObjectName: string;
  outcome: NegotiationStatus;          // "accepted" | "rejected" | "timeout"
}

/** §2.8 Anomaly -> Risk Assessor */
export interface AnomalyDetectedPayload {
  objectId: string;
  objectName: string;
  anomalyType: "unexpected_maneuver" | "possible_breakup" | "orbit_change";
  previousElements: TrackedObject["orbitalElements"];
  currentElements: TrackedObject["orbitalElements"];
  delta: {
    semiMajorAxis: number;             // km change
    eccentricity: number;              // absolute change
    inclination: number;               // degrees change
  };
  confidence: number;                  // 0.0–1.0
  detectedAt: string;
}

/** §2.9 Anomaly -> Advisory */
export interface AnomalyReportPayload {
  objectId: string;
  objectName: string;
  anomalyType: "unexpected_maneuver" | "possible_breakup" | "orbit_change";
  summary: string;                     // one-line human-readable summary
  detectedAt: string;
}

// ============================================================================
// §3. Backend-to-Frontend API Shapes
// ============================================================================

/** Generic paginated collection response wrapper used by all list endpoints */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}

/** §3.1 GET /api/v1/conjunctions/:id response */
export interface ConjunctionDetailResponse {
  conjunction: ConjunctionEvent;
  primaryObject: TrackedObject;
  secondaryObject: TrackedObject;
}

/** §3.1 GET /api/v1/shells response */
export interface ShellsResponse {
  data: ShellRiskSnapshot[];
}

/** §3.1 GET /api/v1/agents/status response */
export interface AgentsStatusResponse {
  agents: AgentStatus[];
}

/** §3.1 GET /api/v1/dashboard/summary aggregated Command Center stats */
export interface DashboardSummary {
  totalTrackedObjects: number;
  activeSatellites: number;
  debrisObjects: number;
  rocketBodies: number;
  activeConjunctions: number;
  criticalConjunctions: number;
  maneuveredLast24h: number;
  shellsAtRisk: number;
  agentStatuses: Array<{
    agentType: AgentType;
    state: AgentState;
  }>;
  lastUpdated: string;
}

// --- Query Parameters for REST Endpoints ---

export interface ObjectsQueryParams {
  type?: ObjectType;
  shellId?: string;
  limit?: number;
  offset?: number;
}

export interface ConjunctionsQueryParams {
  riskLevel?: RiskLevel;
  status?: ConjunctionStatus;
  limit?: number;
  offset?: number;
}

export interface ManeuversQueryParams {
  status?: NegotiationStatus;
  limit?: number;
  offset?: number;
}

export interface AdvisoriesQueryParams {
  severity?: RiskLevel;
  limit?: number;
  offset?: number;
}

export interface AuditQueryParams {
  agentType?: AgentType;
  limit?: number;
  offset?: number;
}

// ============================================================================
// §3.2 WebSocket Events
// ============================================================================

/** §3.2 Standard WebSocket JSON frame wrapper */
export interface WsMessage<T = unknown> {
  event: string;                       // discriminator
  timestamp: string;                   // ISO 8601 UTC
  payload: T;
}

/** Payload for WsMessage when event is "objects:updated" */
export interface WsObjectsUpdatedPayload {
  objects: TrackedObject[];
}

/** Payload for WsMessage when event is "conjunction:mitigated" */
export interface WsConjunctionMitigatedPayload {
  conjunctionId: string;
  maneuverProposalId: string;
  resultingPc: number;
}

/** Map of all known WebSocket event names to their strongly typed payloads */
export interface WsEventPayloadMap {
  "objects:updated": WsObjectsUpdatedPayload;
  "conjunction:created": ConjunctionEvent;
  "conjunction:updated": ConjunctionEvent;
  "conjunction:mitigated": WsConjunctionMitigatedPayload;
  "shell:updated": ShellRiskSnapshot;
  "maneuver:proposed": ManeuverProposal;
  "maneuver:resolved": ManeuverProposal;
  "advisory:new": Advisory;
  "anomaly:detected": AnomalyDetectedPayload;
  "crisis:injected": CrisisInjectionResponse;
  "agent:status": AgentStatus;
}

export type WsEventName = keyof WsEventPayloadMap;
