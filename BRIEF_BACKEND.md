# Auralis — Backend Brief

> **Owner:** Backend person
> **References:** [PRD.md](./PRD.md) §4 (Agent Architecture) · [INTERFACE_CONTRACT.md](./INTERFACE_CONTRACT.md) §1–4

---

## Your Slice

You own the agent runtime: five agents (Tracker, Risk Assessor, Maneuver Negotiation, Anomaly, Advisory) that consume propagated state vectors from the Data person, run collision screening, negotiate maneuvers, detect anomalies, and generate plain-language advisories. You also own the HTTP server that exposes the REST + WebSocket API defined in INTERFACE_CONTRACT.md §3 so the frontend can fetch and subscribe to live data. You do **not** own TLE parsing, SGP4 propagation, or the SIR cascade model — the Data person produces those outputs and hands them to your Tracker agent and Epidemic Forecaster agent via the agreed message contracts. Your job is to wire those inputs through your agent pipeline, produce the downstream outputs, persist them in-memory, and serve them over the API.

---

## Task List

Each task is one short-lived branch + PR. Merge order matters only within a group — groups are independent of each other.

### Group A — Scaffolding

- [ ] **A1. Project init + message bus**
  Create `backend/` directory. Set up a Python (FastAPI) or Node (Express) project. Implement the internal `AgentMessage<T>` envelope from INTERFACE_CONTRACT.md §2.0 as the message bus (in-memory pub-sub — no Kafka/RabbitMQ needed). Every agent registers as a subscriber by `AgentType`.

- [ ] **A2. Shared types module**
  Create `backend/types/` with TypeScript (or Python dataclass/Pydantic) definitions for every shape in INTERFACE_CONTRACT.md §1: `TrackedObject`, `ConjunctionEvent`, `ShellRiskSnapshot`, `ManeuverProposal`, `AgentStatus`, `Advisory`, `AuditLogEntry`, `CrisisInjectionRequest`, `CrisisInjectionResponse`. Also include all enums from §4 (`ObjectType`, `ObjectStatus`, `RiskLevel`, `ConjunctionStatus`, `NegotiationStatus`, `AgentType`, `AgentState`, `CascadeTrend`, `AuditAction`). These are copied verbatim from the contract — do not rename fields.

- [ ] **A3. In-memory data store**
  Create `backend/store.ts` (or equivalent) — a simple in-memory store with typed collections: `objects: Map<string, TrackedObject>`, `conjunctions: Map<string, ConjunctionEvent>`, `maneuvers: Map<string, ManeuverProposal>`, `advisories: Advisory[]`, `auditLog: AuditLogEntry[]`, `agentStatuses: Map<AgentType, AgentStatus>`. No database. All state is lost on restart.

### Group B — Agents (must-have)

- [ ] **B1. Tracker Agent**
  Subscribes to data from the Data person's ingestion output. On receiving raw `TrackedObject[]` from the data layer, stores them in the in-memory store, then publishes:
  - `"state_vectors_updated"` → Risk Assessor (INTERFACE_CONTRACT.md §2.1: `StateVectorsUpdatedPayload`)
  - `"shell_population_updated"` → Epidemic Forecaster (INTERFACE_CONTRACT.md §2.2: `ShellPopulationUpdatedPayload`)

  Writes `AuditLogEntry` with action `"tle_ingested"` and `"propagation_complete"`.

- [ ] **B2. Risk Assessor Agent**
  Subscribes to `"state_vectors_updated"`. Performs conjunction screening:
  1. All-on-all with 5 km distance pre-filter.
  2. For pairs passing the filter, compute Pc (Foster-1992 2-D or Monte Carlo — the Data person may supply a utility, otherwise implement a simplified version).
  3. Create `ConjunctionEvent` records in the store.
  4. Derive `riskLevel` from Pc thresholds (INTERFACE_CONTRACT.md §4 — `RiskLevel`):
     - `Pc < 1e-4` → `"nominal"`
     - `1e-4 ≤ Pc < 1e-3` → `"elevated"`
     - `Pc ≥ 1e-3` → `"critical"`
  5. For events at `"elevated"` or `"critical"`, publish `"high_pc_conjunction"` → Maneuver Negotiation (§2.3: `HighPcConjunctionPayload`).
  6. Publish `"risk_assessment_complete"` → Advisory (§2.5: `RiskAssessmentCompletePayload`).
  7. Push WebSocket events: `conjunction:created`, `conjunction:updated`.

  Also subscribes to `"maneuver_resolved"` (§2.4) — recomputes Pc with the post-maneuver state vector and updates the conjunction status to `"mitigated"` if Pc drops below threshold.

  Also subscribes to `"anomaly_detected"` (§2.8) — triggers a re-screen of the anomalous object against all others.

- [ ] **B3. Maneuver Negotiation Agent**
  Subscribes to `"high_pc_conjunction"`. For each event where both objects are `type: "satellite"` with non-null `operatorId`:
  1. Create two simulated operator sub-agents with hardcoded Δv budgets (e.g., Operator A: 340 m/s remaining, Operator B: 112 m/s remaining).
  2. Each operator bids a `deltaV` (magnitude + direction) to resolve the conjunction.
  3. Auction rule: lowest Δv-cost-to-mission bidder wins (lowest `bid / remainingBudget` ratio).
  4. Produce a `ManeuverProposal` (INTERFACE_CONTRACT.md §1.4) with full `negotiationLog` entries.
  5. Publish `"maneuver_resolved"` → Risk Assessor (§2.4: `ManeuverResolvedPayload`).
  6. Publish `"negotiation_complete"` → Advisory (§2.7: `NegotiationCompletePayload`).
  7. Push WebSocket events: `maneuver:proposed`, `maneuver:resolved`.
  8. Write `AuditLogEntry` with actions `"maneuver_proposed"` and `"maneuver_accepted"` (or `"maneuver_rejected"`).

- [ ] **B4. Advisory Agent**
  Subscribes to `"risk_assessment_complete"` (§2.5), `"cascade_forecast_complete"` (§2.6), `"negotiation_complete"` (§2.7), and `"anomaly_report"` (§2.9). For each incoming message:
  1. Generate a plain-language `Advisory` (INTERFACE_CONTRACT.md §1.6) — can be template-based or LLM-generated.
  2. Store it and push WebSocket event `advisory:new`.
  3. Write `AuditLogEntry` with action `"advisory_generated"`.

### Group C — Agents (nice-to-have)

- [ ] **C1. Anomaly Agent**
  Monitors the object store for orbit-element deltas between successive TLE epochs. If `|Δa| > 10 km` or `|Δi| > 0.5°` and the object isn't `status: "maneuvering"`:
  1. Publish `"anomaly_detected"` → Risk Assessor (§2.8: `AnomalyDetectedPayload`).
  2. Publish `"anomaly_report"` → Advisory (§2.9: `AnomalyReportPayload`).
  3. Push WebSocket event `anomaly:detected`.
  4. Write `AuditLogEntry` with action `"anomaly_detected"`.

### Group D — API Layer

- [ ] **D1. REST endpoints**
  Implement every endpoint from INTERFACE_CONTRACT.md §3.1, reading from the in-memory store:

  | Method | Path | Contract section |
  |--------|------|-----------------|
  | `GET` | `/api/v1/objects` | §3.1 — paginated, filterable by `type`, `shellId` |
  | `GET` | `/api/v1/objects/:id` | §3.1 — single object, 404 if missing |
  | `GET` | `/api/v1/conjunctions` | §3.1 — filterable by `status`, `riskLevel` |
  | `GET` | `/api/v1/conjunctions/:id` | §3.1 — includes embedded primary/secondary objects |
  | `GET` | `/api/v1/shells` | §3.1 — returns `ShellRiskSnapshot[]` |
  | `GET` | `/api/v1/maneuvers` | §3.1 — filterable by `negotiationStatus` |
  | `GET` | `/api/v1/agents/status` | §3.1 — returns `AgentStatus[]` |
  | `GET` | `/api/v1/advisories` | §3.1 — filterable by `severity` |
  | `GET` | `/api/v1/audit` | §3.1 — filterable by `agentType` |
  | `GET` | `/api/v1/dashboard/summary` | §3.1 — aggregated dashboard stats |
  | `POST` | `/api/v1/crisis/inject` | §3.1 — accepts `CrisisInjectionRequest`, returns `CrisisInjectionResponse` |

  All responses must match the exact JSON shapes and field names in §3.1 — the frontend will deserialize against those shapes with zero transformation.

- [ ] **D2. WebSocket server**
  Implement the WebSocket endpoint at `ws://localhost:8000/ws` using the `WsMessage<T>` wrapper from §3.2. Emit every event listed in the §3.2 table when the corresponding agent action fires. The frontend subscribes once on page load and never polls.

- [ ] **D3. CORS + dev config**
  Enable CORS for `http://localhost:3000` (the Next.js frontend). Serve on port `8000`. Add a `README` to `backend/` with setup instructions (`pip install` / `npm install` + `npm run dev`).

### Group E — Crisis Injection

- [ ] **E1. Crisis injection handler**
  When `POST /api/v1/crisis/inject` is called with a `CrisisInjectionRequest` (§1.8):
  1. Generate `fragmentCount` synthetic `TrackedObject` records (type `"debris"`) in the specified altitude shell.
  2. Insert them into the store.
  3. Trigger the Tracker agent to re-propagate, which cascades into Risk Assessor → Maneuver Negotiation → Advisory.
  4. Return `CrisisInjectionResponse` and push WebSocket `crisis:injected`.
  5. Write `AuditLogEntry` with action `"crisis_injected"`.

---

## Contract Shapes You Produce

These are the shapes your code must **serialize and serve** — copied from INTERFACE_CONTRACT.md:

| Shape | Where you produce it |
|-------|---------------------|
| `TrackedObject` (§1.1) | Stored by Tracker agent, served via `GET /api/v1/objects` |
| `ConjunctionEvent` (§1.2) | Created by Risk Assessor, served via `GET /api/v1/conjunctions` |
| `ManeuverProposal` (§1.4) | Created by Maneuver Negotiation, served via `GET /api/v1/maneuvers` |
| `AgentStatus` (§1.5) | Maintained by each agent, served via `GET /api/v1/agents/status` |
| `Advisory` (§1.6) | Created by Advisory agent, served via `GET /api/v1/advisories` |
| `AuditLogEntry` (§1.7) | Written by every agent, served via `GET /api/v1/audit` |
| `CrisisInjectionResponse` (§1.8) | Returned by `POST /api/v1/crisis/inject` |
| All WebSocket `WsMessage<T>` events (§3.2) | Pushed by agents on state changes |

## Contract Shapes You Consume

| Shape | Source | Message type |
|-------|--------|--------------|
| `TrackedObject[]` | Data person (TLE ingestion + SGP4) | Raw input to Tracker agent |
| `ShellRiskSnapshot` (§1.3) | Data person (Epidemic Forecaster) | Via `"cascade_forecast_complete"` (§2.6) |
| `ShellPopulationUpdatedPayload` | Data person | Passed through from Tracker (§2.2) |

---

## What NOT to Touch

| Area | Owner | Your boundary |
|------|-------|---------------|
| `app/`, `components/`, `lib/`, `public/`, `types/` | Frontend person | Do not modify any file in these directories. |
| TLE fetching from CelesTrak, SGP4 propagation, SIR ODE solver | Data person | Do not implement these. Consume their output via the message bus. |
| `package.json`, `next.config.ts`, `tsconfig.json` in the repo root | Frontend person | Do not modify. Your `package.json` lives inside `backend/`. |
| `PRD.md`, `INTERFACE_CONTRACT.md` | Shared docs | Do not modify without team agreement. |

---

## Definition of Done

Checked against PRD.md §5 (Success Criteria):

- [ ] **All 11 REST endpoints return valid JSON** matching the exact shapes in INTERFACE_CONTRACT.md §3.1 (verified with a test script or Postman collection).
- [ ] **WebSocket pushes all 11 event types** listed in §3.2 when the corresponding agent action fires (verified by connecting a WebSocket client and triggering each flow).
- [ ] **Risk Assessor produces a real Pc number** (e.g., `2.3e-3`), not just a string label — maps to PRD success criterion #3.
- [ ] **Maneuver Negotiation produces a logged decision** with `negotiationLog` entries showing BID/ACCEPT actions and a `rationale` — maps to PRD criterion #5.
- [ ] **Advisory agent produces a plain-language narrative** in the `Advisory.body` field that a non-specialist can follow — maps to PRD criterion #6.
- [ ] **Crisis injection via `POST /api/v1/crisis/inject`** creates synthetic debris, triggers re-screening, produces new conjunction events, and the whole cascade is visible via WebSocket — maps to PRD criterion #4.
- [ ] **Agent status chips** update via `agent:status` WebSocket events when agents transition between `idle` / `processing` / `alert` — maps to PRD nice-to-have #10.
- [ ] **Audit log captures every agent decision** with correct `AuditAction` values from §4.
- [ ] Backend runs with `npm run dev` (or `python -m uvicorn`) on port 8000, CORS enabled for `localhost:3000`.
