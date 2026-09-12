# Auralis — Interface Contract

> **Purpose:** Three people are building three parts of Auralis in parallel.
> This file is the single source of truth for every data shape, message format,
> API endpoint, and enum that crosses a boundary between those parts.
> If it's not in this file, it's not agreed upon.
>
> **Parts:**
> 1. **Data / Propagation Layer** — TLE ingestion, SGP4, conjunction screening, SIR cascade model
> 2. **Agent Backend** — Tracker, Risk Assessor, Epidemic Forecaster, Maneuver Negotiation, Anomaly, Advisory
> 3. **Frontend** — Next.js dashboard + 3D globe
>
> **Reference:** See [PRD.md](./PRD.md) for product context, demo narrative, and success criteria.

---

## 1. Core Data Shapes

Every interface below is the canonical definition. All three parts must serialize
and deserialize these shapes identically. Field names are camelCase. Timestamps
are ISO 8601 strings (UTC). Distances are in **kilometers**. Velocities are in
**km/s**. Angles are in **degrees**. Delta-v is in **m/s**.

### 1.1 TrackedObject

```typescript
interface TrackedObject {
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
```

### 1.2 ConjunctionEvent

```typescript
interface ConjunctionEvent {
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
  createdAt: string;                   // ISO 8601 UTC
  updatedAt: string;                   // ISO 8601 UTC
}
```

### 1.3 ShellRiskSnapshot

```typescript
interface ShellRiskSnapshot {
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
```

### 1.4 ManeuverProposal

```typescript
interface ManeuverProposal {
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

interface NegotiationLogEntry {
  timestamp: string;                   // ISO 8601 UTC
  agentId: string;                     // which agent said this
  action: string;                      // e.g. "BID", "ACCEPT", "COUNTER", "REJECT"
  message: string;                     // human-readable log line
  deltaVBid: number | null;            // m/s, if this entry includes a bid
}
```

### 1.5 AgentStatus

```typescript
interface AgentStatus {
  agentId: string;                     // e.g. "tracker", "risk-assessor"
  agentName: string;                   // e.g. "Tracker Agent"
  agentType: AgentType;
  state: AgentState;                   // "idle" | "processing" | "alert" | "error"
  lastHeartbeat: string;               // ISO 8601 UTC
  currentTask: string | null;          // human-readable description, null if idle
  processedCount: number;              // total items processed since startup
  errorCount: number;                  // total errors since startup
}
```

### 1.6 Advisory

```typescript
interface Advisory {
  id: string;                          // UUID v4
  timestamp: string;                   // ISO 8601 UTC
  severity: RiskLevel;                 // "nominal" | "elevated" | "critical"
  title: string;                       // short headline
  body: string;                        // plain-language narrative (1–3 paragraphs)
  relatedEventIds: string[];           // ConjunctionEvent.id references
  relatedObjectIds: string[];          // TrackedObject.id references
  agentSource: AgentType;              // which agent authored it (usually "advisory")
}
```

### 1.7 AuditLogEntry

```typescript
interface AuditLogEntry {
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
```

### 1.8 CrisisInjection (request shape)

```typescript
interface CrisisInjectionRequest {
  type: "fragmentation" | "collision" | "asat";
  altitude: number;                    // km — center of the event
  fragmentCount: number;               // how many debris pieces to generate
  sourceObjectId: string | null;       // existing object that breaks up, or null for synthetic
  label: string;                       // e.g. "Simulated ASAT Test — 780 km"
}

interface CrisisInjectionResponse {
  success: boolean;
  injectedObjectCount: number;
  affectedShellIds: string[];
  newConjunctionEventCount: number;
  timestamp: string;
}
```

---

## 2. Agent-to-Agent Message Contract

Agents communicate through an internal message bus. Every message has a standard
envelope, and the `payload` field carries the domain-specific data.

### 2.0 Message Envelope

```typescript
interface AgentMessage<T = unknown> {
  messageId: string;                   // UUID v4
  timestamp: string;                   // ISO 8601 UTC
  source: AgentType;                   // sender
  target: AgentType | "broadcast";     // receiver, or "broadcast" for all
  type: string;                        // message type discriminator (see below)
  correlationId: string | null;        // links related messages (e.g. same conjunction)
  payload: T;                          // strongly-typed per message type
}
```

### 2.1 Tracker → Risk Assessor

**Type:** `"state_vectors_updated"`

Sent after every propagation cycle. Contains the updated catalog (or delta).

```typescript
// AgentMessage<StateVectorsUpdatedPayload>
interface StateVectorsUpdatedPayload {
  epoch: string;                       // propagation epoch
  objects: TrackedObject[];            // full catalog or only changed objects
  isDelta: boolean;                    // true = only changed objects; false = full catalog
}
```

### 2.2 Tracker → Epidemic Forecaster

**Type:** `"shell_population_updated"`

Sent after ingest/propagation so the forecaster can recompute SIR.

```typescript
// AgentMessage<ShellPopulationUpdatedPayload>
interface ShellPopulationUpdatedPayload {
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
```

### 2.3 Risk Assessor → Maneuver Negotiation

**Type:** `"high_pc_conjunction"`

Sent when a conjunction's Pc exceeds the alert threshold (1 × 10⁻⁴).

```typescript
// AgentMessage<HighPcConjunctionPayload>
interface HighPcConjunctionPayload {
  conjunction: ConjunctionEvent;
  primaryObject: TrackedObject;
  secondaryObject: TrackedObject;
  recommendedAction: "maneuver_primary" | "maneuver_secondary" | "monitor";
}
```

### 2.4 Maneuver Negotiation → Risk Assessor

**Type:** `"maneuver_resolved"`

Sent after negotiation concludes so Risk Assessor can recompute post-maneuver Pc.

```typescript
// AgentMessage<ManeuverResolvedPayload>
interface ManeuverResolvedPayload {
  proposal: ManeuverProposal;
  updatedObject: TrackedObject;        // post-maneuver state vector
  conjunctionEventId: string;
}
```

### 2.5 Risk Assessor → Advisory

**Type:** `"risk_assessment_complete"`

Sent after each screening pass with a summary of findings.

```typescript
// AgentMessage<RiskAssessmentCompletePayload>
interface RiskAssessmentCompletePayload {
  screeningEpoch: string;
  totalPairsScreened: number;
  conjunctionsFound: number;
  criticalEvents: ConjunctionEvent[];  // Pc > 1e-3
  elevatedEvents: ConjunctionEvent[];  // 1e-4 < Pc <= 1e-3
}
```

### 2.6 Epidemic Forecaster → Advisory

**Type:** `"cascade_forecast_complete"`

Sent after SIR recomputation.

```typescript
// AgentMessage<CascadeForecastCompletePayload>
interface CascadeForecastCompletePayload {
  timestamp: string;
  shellSnapshots: ShellRiskSnapshot[];
  criticalShells: string[];            // shellIds where R₀ > 1.0
  overallTrend: CascadeTrend;
}
```

### 2.7 Maneuver Negotiation → Advisory

**Type:** `"negotiation_complete"`

Sent after a maneuver negotiation resolves.

```typescript
// AgentMessage<NegotiationCompletePayload>
interface NegotiationCompletePayload {
  proposal: ManeuverProposal;
  conjunction: ConjunctionEvent;
  primaryObjectName: string;
  secondaryObjectName: string;
  outcome: NegotiationStatus;          // "accepted" | "rejected" | "timeout"
}
```

### 2.8 Anomaly → Risk Assessor

**Type:** `"anomaly_detected"`

Sent when an object's orbit changes unexpectedly between TLE epochs.

```typescript
// AgentMessage<AnomalyDetectedPayload>
interface AnomalyDetectedPayload {
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
```

### 2.9 Anomaly → Advisory

**Type:** `"anomaly_report"`

Sent so Advisory can narrate the anomaly to the user.

```typescript
// AgentMessage<AnomalyReportPayload>
interface AnomalyReportPayload {
  objectId: string;
  objectName: string;
  anomalyType: "unexpected_maneuver" | "possible_breakup" | "orbit_change";
  summary: string;                     // one-line human-readable summary
  detectedAt: string;
}
```

### Agent Message Flow Diagram

```
Tracker ──state_vectors_updated──────────► Risk Assessor
  │                                           │  ▲
  │                                           │  │
  │  shell_population_updated                 │  │ maneuver_resolved
  ▼                                           │  │
Epidemic Forecaster                           │  │
  │                                           ▼  │
  │  cascade_forecast_complete    high_pc_conjunction
  │                                           │
  │                                           ▼
  │                                   Maneuver Negotiation
  │                                           │
  │       negotiation_complete                │
  │              ┌────────────────────────────┘
  │              │
  ▼              ▼
      Advisory  ◄───── anomaly_report ───── Anomaly
                                              ▲
Risk Assessor ◄── anomaly_detected ───────────┘
```

---

## 3. Backend-to-Frontend API

The backend exposes a **REST API** for data fetching and a **WebSocket** connection
for real-time push. The frontend never polls — all live updates come through the
WebSocket.

Base URL: `http://localhost:8000/api/v1`  
WebSocket: `ws://localhost:8000/ws`

### 3.1 REST Endpoints

---

#### `GET /api/v1/objects`

List all tracked objects, with optional filters.

**Query params:** `?type=satellite&shellId=LEO_400_450&limit=100&offset=0`

**Response `200`:**
```json
{
  "data": [
    {
      "id": "a1b2c3d4-5678-9abc-def0-111111111111",
      "noradId": 25544,
      "name": "ISS (ZARYA)",
      "type": "satellite",
      "operatorId": "op-001",
      "position": { "x": -2354.12, "y": 4872.33, "z": 3941.07 },
      "velocity": { "vx": -5.732, "vy": -3.846, "vz": 2.918 },
      "orbitalElements": {
        "semiMajorAxis": 6793.0,
        "eccentricity": 0.0001,
        "inclination": 51.6,
        "raan": 247.5,
        "argOfPerigee": 34.2,
        "meanAnomaly": 120.8
      },
      "covarianceUpperTriangle": [1.0, 0.0, 0.0, 0.5, 0.0, 0.5],
      "altitude": 415.0,
      "shellId": "LEO_400_450",
      "epoch": "2026-09-12T12:00:00Z",
      "lastUpdated": "2026-09-12T13:00:00Z",
      "status": "active"
    }
  ],
  "total": 1847,
  "limit": 100,
  "offset": 0
}
```

---

#### `GET /api/v1/objects/:id`

Get a single tracked object by ID.

**Response `200`:** A single `TrackedObject` (same shape as array element above).

**Response `404`:**
```json
{ "error": "Object not found", "objectId": "nonexistent-id" }
```

---

#### `GET /api/v1/conjunctions`

List conjunction events, with optional filters.

**Query params:** `?status=active&riskLevel=critical&limit=50&offset=0`

**Response `200`:**
```json
{
  "data": [
    {
      "id": "ce-9f8e7d6c-5b4a-3210-fedc-ba9876543210",
      "primaryObjectId": "a1b2c3d4-5678-9abc-def0-111111111111",
      "secondaryObjectId": "b2c3d4e5-6789-abcd-ef01-222222222222",
      "tca": "2026-09-13T08:42:17Z",
      "missDistance": 0.347,
      "relativeVelocity": 14.2,
      "collisionProbability": 2.3e-3,
      "maxCollisionProbability": 2.3e-3,
      "riskLevel": "critical",
      "status": "active",
      "screeningWindowStart": "2026-09-12T12:00:00Z",
      "screeningWindowEnd": "2026-09-15T12:00:00Z",
      "maneuverProposalId": null,
      "createdAt": "2026-09-12T12:15:00Z",
      "updatedAt": "2026-09-12T13:00:00Z"
    }
  ],
  "total": 23,
  "limit": 50,
  "offset": 0
}
```

---

#### `GET /api/v1/conjunctions/:id`

Get a single conjunction event with full detail.

**Response `200`:** A single `ConjunctionEvent` plus embedded primary/secondary objects.

```json
{
  "conjunction": { "...ConjunctionEvent fields..." },
  "primaryObject": { "...TrackedObject fields..." },
  "secondaryObject": { "...TrackedObject fields..." }
}
```

---

#### `GET /api/v1/shells`

Get SIR cascade risk snapshots for all orbital shells.

**Response `200`:**
```json
{
  "data": [
    {
      "shellId": "LEO_400_450",
      "altitudeMin": 400,
      "altitudeMax": 450,
      "timestamp": "2026-09-12T13:00:00Z",
      "susceptibleCount": 312,
      "infectedCount": 47,
      "removedCount": 89,
      "totalObjectCount": 448,
      "debrisDensity": 3.7e-9,
      "r0": 0.83,
      "trend": "stable",
      "projectionYears": [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50],
      "projectedS": [312, 298, 280, 261, 245, 232, 221, 213, 207, 203, 200],
      "projectedI": [47, 52, 55, 53, 48, 42, 36, 31, 27, 24, 22],
      "projectedR": [89, 98, 113, 134, 155, 174, 191, 204, 214, 221, 226]
    },
    {
      "shellId": "LEO_750_800",
      "altitudeMin": 750,
      "altitudeMax": 800,
      "timestamp": "2026-09-12T13:00:00Z",
      "susceptibleCount": 587,
      "infectedCount": 213,
      "removedCount": 41,
      "totalObjectCount": 841,
      "debrisDensity": 8.1e-9,
      "r0": 1.24,
      "trend": "increasing",
      "projectionYears": [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50],
      "projectedS": [587, 540, 471, 388, 302, 230, 178, 142, 117, 101, 91],
      "projectedI": [213, 267, 338, 410, 461, 478, 462, 421, 370, 319, 273],
      "projectedR": [41, 34, 32, 43, 78, 133, 201, 278, 354, 421, 477]
    }
  ]
}
```

---

#### `GET /api/v1/maneuvers`

List maneuver proposals.

**Query params:** `?negotiationStatus=accepted&limit=20&offset=0`

**Response `200`:**
```json
{
  "data": [
    {
      "id": "mp-11223344-5566-7788-99aa-bbccddeeff00",
      "conjunctionEventId": "ce-9f8e7d6c-5b4a-3210-fedc-ba9876543210",
      "maneuveringObjectId": "a1b2c3d4-5678-9abc-def0-111111111111",
      "operatorAgentId": "op-001",
      "opposingOperatorAgentId": "op-002",
      "deltaV": {
        "magnitude": 0.4,
        "direction": { "x": 0.98, "y": 0.17, "z": 0.05 }
      },
      "burnTime": "2026-09-13T06:00:00Z",
      "fuelCost": 1.2,
      "rationale": "Operator A has 340 m/s remaining Δv vs Operator B's 112 m/s. Maneuver cost is 0.4 m/s — lower relative impact on Operator A's mission lifetime.",
      "negotiationStatus": "accepted",
      "negotiationLog": [
        {
          "timestamp": "2026-09-12T13:05:00Z",
          "agentId": "negotiation",
          "action": "INITIATE",
          "message": "Conjunction ce-9f8e... requires maneuver. Soliciting bids.",
          "deltaVBid": null
        },
        {
          "timestamp": "2026-09-12T13:05:01Z",
          "agentId": "op-001",
          "action": "BID",
          "message": "Operator A bids 0.4 m/s prograde burn at T-2h40m.",
          "deltaVBid": 0.4
        },
        {
          "timestamp": "2026-09-12T13:05:01Z",
          "agentId": "op-002",
          "action": "BID",
          "message": "Operator B bids 0.6 m/s retrograde burn at T-3h.",
          "deltaVBid": 0.6
        },
        {
          "timestamp": "2026-09-12T13:05:02Z",
          "agentId": "negotiation",
          "action": "ACCEPT",
          "message": "Operator A's bid selected — lower Δv cost and higher remaining budget.",
          "deltaVBid": 0.4
        }
      ],
      "resultingPc": 4.1e-7,
      "createdAt": "2026-09-12T13:05:00Z",
      "resolvedAt": "2026-09-12T13:05:02Z"
    }
  ],
  "total": 3,
  "limit": 20,
  "offset": 0
}
```

---

#### `GET /api/v1/agents/status`

Get the current state of all agents.

**Response `200`:**
```json
{
  "agents": [
    {
      "agentId": "tracker",
      "agentName": "Tracker Agent",
      "agentType": "tracker",
      "state": "idle",
      "lastHeartbeat": "2026-09-12T13:00:00Z",
      "currentTask": null,
      "processedCount": 1847,
      "errorCount": 0
    },
    {
      "agentId": "risk-assessor",
      "agentName": "Risk Assessor Agent",
      "agentType": "risk_assessor",
      "state": "processing",
      "lastHeartbeat": "2026-09-12T13:00:01Z",
      "currentTask": "Screening 1847 objects for conjunctions",
      "processedCount": 342,
      "errorCount": 1
    }
  ]
}
```

---

#### `GET /api/v1/advisories`

List advisory narratives.

**Query params:** `?severity=critical&limit=20&offset=0`

**Response `200`:**
```json
{
  "data": [
    {
      "id": "adv-aabbccdd-1122-3344-5566-778899001122",
      "timestamp": "2026-09-12T13:06:00Z",
      "severity": "critical",
      "title": "Collision risk mitigated — ISS avoidance maneuver executed",
      "body": "A close approach between ISS (ZARYA) and COSMOS 2251 DEB was detected at 08:42:17 UTC tomorrow with a collision probability of 2.3 × 10⁻³. After negotiation between Operator A and Operator B, Operator A will execute a 0.4 m/s prograde burn at 06:00 UTC, reducing collision probability to 4.1 × 10⁻⁷ — well below the action threshold.",
      "relatedEventIds": ["ce-9f8e7d6c-5b4a-3210-fedc-ba9876543210"],
      "relatedObjectIds": [
        "a1b2c3d4-5678-9abc-def0-111111111111",
        "b2c3d4e5-6789-abcd-ef01-222222222222"
      ],
      "agentSource": "advisory"
    }
  ],
  "total": 7,
  "limit": 20,
  "offset": 0
}
```

---

#### `GET /api/v1/audit`

Get the audit log.

**Query params:** `?agentType=maneuver_negotiation&limit=50&offset=0`

**Response `200`:**
```json
{
  "data": [
    {
      "id": "aud-001",
      "timestamp": "2026-09-12T13:05:02Z",
      "agentId": "negotiation",
      "agentType": "maneuver_negotiation",
      "action": "maneuver_accepted",
      "description": "Maneuver negotiation resolved: Operator A will execute 0.4 m/s prograde burn for conjunction ce-9f8e...",
      "relatedEntityId": "mp-11223344-5566-7788-99aa-bbccddeeff00",
      "relatedEntityType": "maneuver",
      "metadata": {
        "conjunctionId": "ce-9f8e7d6c-5b4a-3210-fedc-ba9876543210",
        "pcBefore": 2.3e-3,
        "pcAfter": 4.1e-7
      }
    }
  ],
  "total": 142,
  "limit": 50,
  "offset": 0
}
```

---

#### `POST /api/v1/crisis/inject`

Inject a simulated crisis event.

**Request:**
```json
{
  "type": "fragmentation",
  "altitude": 780,
  "fragmentCount": 250,
  "sourceObjectId": "b2c3d4e5-6789-abcd-ef01-222222222222",
  "label": "Simulated ASAT Test — 780 km"
}
```

**Response `201`:**
```json
{
  "success": true,
  "injectedObjectCount": 250,
  "affectedShellIds": ["LEO_750_800", "LEO_800_850"],
  "newConjunctionEventCount": 14,
  "timestamp": "2026-09-12T13:10:00Z"
}
```

---

#### `GET /api/v1/dashboard/summary`

Aggregated stats for the Command Center.

**Response `200`:**
```json
{
  "totalTrackedObjects": 1847,
  "activeSatellites": 623,
  "debrisObjects": 1189,
  "rocketBodies": 35,
  "activeConjunctions": 23,
  "criticalConjunctions": 2,
  "maneuveredLast24h": 1,
  "shellsAtRisk": 1,
  "agentStatuses": [
    { "agentType": "tracker", "state": "idle" },
    { "agentType": "risk_assessor", "state": "processing" },
    { "agentType": "epidemic_forecaster", "state": "idle" },
    { "agentType": "maneuver_negotiation", "state": "idle" },
    { "agentType": "anomaly", "state": "idle" },
    { "agentType": "advisory", "state": "idle" }
  ],
  "lastUpdated": "2026-09-12T13:00:00Z"
}
```

---

### 3.2 WebSocket Events

Connection: `ws://localhost:8000/ws`

After connecting, the client receives JSON messages with a standard wrapper:

```typescript
interface WsMessage<T = unknown> {
  event: string;                       // discriminator
  timestamp: string;                   // ISO 8601 UTC
  payload: T;
}
```

| Event name | Payload type | When it fires |
|------------|-------------|---------------|
| `objects:updated` | `{ objects: TrackedObject[] }` | After each propagation cycle |
| `conjunction:created` | `ConjunctionEvent` | New conjunction detected |
| `conjunction:updated` | `ConjunctionEvent` | Pc recomputed or status changed |
| `conjunction:mitigated` | `{ conjunctionId: string, maneuverProposalId: string, resultingPc: number }` | Maneuver resolves a conjunction |
| `shell:updated` | `ShellRiskSnapshot` | SIR model recomputed for a shell |
| `maneuver:proposed` | `ManeuverProposal` | Negotiation starts |
| `maneuver:resolved` | `ManeuverProposal` | Negotiation concludes |
| `advisory:new` | `Advisory` | New plain-language advisory |
| `anomaly:detected` | `AnomalyDetectedPayload` | Anomaly agent flags an object |
| `crisis:injected` | `CrisisInjectionResponse` | Crisis injection completes |
| `agent:status` | `AgentStatus` | Any agent changes state |

---

## 4. Enums & Fixed Vocabulary

These strings must be used **exactly as written** across all three parts. No synonyms, no different casing, no extra values without updating this file.

### ObjectType

```typescript
type ObjectType = "satellite" | "debris" | "rocket_body" | "unknown";
```

### ObjectStatus

```typescript
type ObjectStatus = "active" | "decayed" | "maneuvering" | "unknown";
```

### RiskLevel

Derived from collision probability thresholds:

```typescript
type RiskLevel = "nominal" | "elevated" | "critical";
```

| Level | Pc range | Color hint |
|-------|----------|------------|
| `nominal` | Pc < 1 × 10⁻⁴ | Green |
| `elevated` | 1 × 10⁻⁴ ≤ Pc < 1 × 10⁻³ | Amber/Yellow |
| `critical` | Pc ≥ 1 × 10⁻³ | Red |

### ConjunctionStatus

```typescript
type ConjunctionStatus =
  | "active"          // TCA is in the future, no mitigation yet
  | "mitigated"       // maneuver executed, Pc reduced below threshold
  | "monitoring"      // below action threshold but being watched
  | "expired"         // TCA has passed with no action needed
  | "false_alarm";    // re-screening showed Pc was overestimated
```

### NegotiationStatus

```typescript
type NegotiationStatus =
  | "pending"         // negotiation not yet started
  | "negotiating"     // bids are being exchanged
  | "accepted"        // both parties agreed
  | "rejected"        // no agreement reached
  | "timeout";        // negotiation window expired
```

### AgentType

```typescript
type AgentType =
  | "tracker"
  | "risk_assessor"
  | "epidemic_forecaster"
  | "maneuver_negotiation"
  | "anomaly"
  | "advisory";
```

### AgentState

```typescript
type AgentState = "idle" | "processing" | "alert" | "error";
```

### CascadeTrend

```typescript
type CascadeTrend = "increasing" | "stable" | "decreasing";
```

### AuditAction

```typescript
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
  | "crisis_injected";
```

### Shell ID Convention

Shell IDs follow the pattern `{regime}_{altMin}_{altMax}` with 50 km bands:

```
LEO_200_250, LEO_250_300, LEO_300_350, ..., LEO_950_1000
MEO_1000_1500, MEO_1500_2000, ..., MEO_19500_20000
GEO_35000_36000
```

The full shell list is derived from these rules — no hardcoded master list is needed.

---

## 5. Mock Data Note

> **Until the real backend exists, the frontend must use static mock data that
> conforms exactly to the shapes defined in sections 1–4 of this document.**
>
> The mock data layer should be a single module (e.g., `lib/mockApi.ts`) that
> exports functions with the same signatures as the real API calls:
>
> ```typescript
> // Example mock API module
> export async function getObjects(params?: ObjectsQueryParams): Promise<PaginatedResponse<TrackedObject>> { ... }
> export async function getConjunctions(params?: ConjunctionsQueryParams): Promise<PaginatedResponse<ConjunctionEvent>> { ... }
> export async function getShells(): Promise<{ data: ShellRiskSnapshot[] }> { ... }
> export async function injectCrisis(req: CrisisInjectionRequest): Promise<CrisisInjectionResponse> { ... }
> // ... etc
> ```
>
> **When the real backend comes online, the only change required in the frontend
> is swapping the import from `lib/mockApi` to `lib/api` — the response shapes,
> field names, and enum values remain identical.** No component code should change.
>
> Mock WebSocket events can be simulated with `setInterval` dispatching the same
> `WsMessage<T>` shapes to a local event emitter.
>
> The existing `lib/mockData.ts` in the repo should be migrated to conform to
> these shapes. Any field names that differ from this contract are bugs in the
> mock data, not in this contract.
