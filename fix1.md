# Auralis Backend Implementation — Comprehensive Analysis & 15-Phase Plan

> **Date:** 2026-09-13  
> **Status:** Backend implementation required to connect data layer and frontend  
> **Current State:** Frontend ✅ + Data Layer ✅ | Backend ❌ (Missing)

---

## Executive Summary

The Auralis project has completed two major components:
1. **Frontend** — Next.js dashboard with 3D globe, all UI components, WebSocket integration (mock mode)
2. **Data Layer** — TLE ingestion, SGP4 propagation, collision probability calculations, SIR epidemic model

**Critical Gap:** The **backend agent runtime** that bridges these two systems does not exist. Currently, the frontend operates in `mock` mode with static data from `lib/mockApi.ts`.

---

## Current State Analysis

### ✅ What's Working

#### Frontend (100% Complete)
- **Location:** `/app`, `/components`, `/lib`, `/types`
- **Features Implemented:**
  - All 11 pages (Dashboard, Cases, Profiles, Alerts, Analytics, Network, Financial, Data Ingestion, Audit, Chat, Settings)
  - 3D Globe visualization with orbital tracks
  - Real-time UI components (LiveMap, LiveEventFeed, AgentStatusBar)
  - Complete WebSocket provider infrastructure (`WebSocketProvider.tsx`)
  - Print-ready reports with headers/footers
  - Mock API layer with all 11 REST endpoints (`lib/mockApi.ts`)
  - Mock WebSocket emitter (`lib/mockWs.ts`)
  - Full type definitions (`types/contract.ts`)
  - Crisis injection modal UI

#### Data Layer (100% Complete)
- **Location:** `/data`
- **Modules Implemented:**
  - ✅ `celestrak.ts` — TLE fetching from CelesTrak API + local fixtures
  - ✅ `parser.ts` — TLE parsing to `TrackedObject` format
  - ✅ `propagator.ts` — SGP4 propagation using `satellite.js`
  - ✅ `collision.ts` — Conjunction screening, Pc calculation (Foster-1992 & Monte Carlo)
  - ✅ `shells.ts` — Altitude shell discretization (50 km bands)
  - ✅ `cascade.ts` — SIR epidemic model with ODE solver
  - ✅ `epidemic-forecaster.ts` — 50-year cascade projection
  - ✅ `crisis.ts` — Fragment generation for simulated breakups
  - ✅ `types.ts` — Complete type definitions
  - ✅ Test suite (`data/__tests__/data-engine.test.ts`)

### ❌ What's Missing

#### Backend Agent Runtime (0% Complete)
**Location:** `/backend` — **DOES NOT EXIST**

**Missing Components:**
1. **No HTTP Server** — No FastAPI/Express server on port 8000
2. **No Agent Implementation** — Zero agents implemented:
   - ❌ Tracker Agent
   - ❌ Risk Assessor Agent
   - ❌ Maneuver Negotiation Agent
   - ❌ Advisory Agent
   - ❌ Anomaly Agent
   - ❌ Epidemic Forecaster Agent (data layer has utilities, agent wrapper missing)
3. **No Message Bus** — No internal pub-sub system for agent-to-agent communication
4. **No In-Memory Store** — No data persistence layer
5. **No WebSocket Server** — No real-time event broadcasting
6. **No REST Endpoints** — All 11 endpoints missing
7. **No Audit Logger** — No audit trail recording
8. **No Crisis Injection Handler** — No POST handler for crisis simulation

---

## Issues & Broken Code

### Critical Issues

#### 1. Frontend is Hardwired to Mock Mode
**File:** `lib/api.ts` (Line 48)
```typescript
export function getApiMode(): ApiMode {
  return (process.env.NEXT_PUBLIC_API_MODE as ApiMode) === 'live' ? 'live' : 'mock';
}
```
**Problem:** Frontend defaults to `mock` mode. When backend comes online, requires manual env var change.

**Impact:** Cannot test integration without changing environment variables.

**Fix Required:** Backend must implement identical API contract to allow seamless switchover.

---

#### 2. WebSocket Provider Has No Real Backend Target
**File:** `components/providers/WebSocketProvider.tsx`
```typescript
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/ws';
```
**Problem:** WebSocket connection attempts to `ws://localhost:8000/ws` which doesn't exist. Falls back to mock emitter silently.

**Impact:** Real-time updates work in mock mode but will fail when switching to live mode without backend.

---

#### 3. Data Layer Has No Integration Path
**File:** `data/index.ts`
**Problem:** Data layer exports pure functions but has no scheduled ingestion loop, no persistence, no agent wrappers.

**Example:**
```typescript
// This function exists but is never called in a backend context:
export { runEpidemicForecast } from "./epidemic-forecaster";
```

**Impact:** All data layer capabilities are dormant — no continuous propagation, no automated screening.

---

#### 4. Missing Type Definitions for Agent Messages
**File:** `types/contract.ts` (Line 300+)
**Problem:** TypeScript interfaces for agent-to-agent messages are incomplete. Mock API doesn't generate agent messages.

**Missing Payloads:**
- `StateVectorsUpdatedPayload` (§2.1)
- `ShellPopulationUpdatedPayload` (§2.2)
- `HighPcConjunctionPayload` (§2.3)
- `ManeuverResolvedPayload` (§2.4)
- `RiskAssessmentCompletePayload` (§2.5)
- `CascadeForecastCompletePayload` (§2.6)
- `NegotiationCompletePayload` (§2.7)
- `AnomalyDetectedPayload` (§2.8)
- `AnomalyReportPayload` (§2.9)

---

#### 5. No Operator Agent Simulation Logic
**File:** None exists
**Problem:** Maneuver Negotiation requires simulated operator sub-agents with Δv budgets. No implementation.

**Required:** Bidding logic, auction resolution, negotiation log generation.

---

#### 6. No Advisory Generation Logic
**File:** None exists
**Problem:** Advisory agent must generate natural-language narratives. No template system, no LLM integration stub.

**Required:** Template-based advisory generation (minimum viable) or LLM integration (production).

---

#### 7. No Audit Trail Implementation
**File:** None exists
**Problem:** Every agent action must write `AuditLogEntry` records. No logger exists.

**Required:** Central audit logger that all agents call.

---

#### 8. No Crisis Injection Backend Handler
**File:** None exists
**Problem:** Frontend has crisis injection UI (`CrisisInjectionModal.tsx`) that calls `POST /api/v1/crisis/inject`, but endpoint doesn't exist.

**Data Layer Support:** `crisis.ts` has `generateBreakupFragments()` utility.

**Gap:** No backend handler that:
1. Accepts `CrisisInjectionRequest`
2. Calls `generateBreakupFragments()`
3. Inserts fragments into object store
4. Triggers re-propagation → screening → advisory cascade
5. Returns `CrisisInjectionResponse`

---

#### 9. No Collision Probability Threshold Logic
**File:** Data layer has `computePc()` but no threshold enforcement
**Problem:** Risk Assessor must classify conjunctions by Pc:
- `nominal`: Pc < 1e-4
- `elevated`: 1e-4 ≤ Pc < 1e-3
- `critical`: Pc ≥ 1e-3

**Required:** Utility function + agent logic to assign `riskLevel`.

---

#### 10. No Post-Maneuver Recomputation Logic
**File:** None exists
**Problem:** After maneuver execution, Risk Assessor must recompute Pc with updated state vector.

**Data Layer Support:** `computePc()` exists, but no agent workflow to:
1. Receive `maneuver_resolved` message
2. Extract post-maneuver state vector
3. Re-screen conjunction
4. Update `ConjunctionEvent.status` to `"mitigated"` if Pc drops

---

#### 11. No Anomaly Detection Implementation
**File:** None exists
**Problem:** Anomaly agent must monitor orbit element changes between TLE epochs.

**Detection Criteria:**
- `|Δa| > 10 km` (semi-major axis change)
- `|Δi| > 0.5°` (inclination change)
- Object not in `status: "maneuvering"`

**Required:** Periodic scan of object store, publish `anomaly_detected` message.

---

#### 12. No Continuous Propagation Loop
**File:** Data layer has one-shot functions, no scheduler
**Problem:** Tracker agent must continuously:
1. Fetch TLEs from CelesTrak
2. Propagate to current epoch
3. Update object store
4. Publish `state_vectors_updated` message

**Current State:** Data layer functions are never called in production context.

---

#### 13. No WebSocket Event Mapping
**File:** None exists
**Problem:** Backend must emit 11 WebSocket events (INTERFACE_CONTRACT.md §3.2). No event emitter infrastructure.

**Required Events:**
- `objects:updated`
- `conjunction:created`
- `conjunction:updated`
- `conjunction:mitigated`
- `shell:updated`
- `maneuver:proposed`
- `maneuver:resolved`
- `advisory:new`
- `anomaly:detected`
- `crisis:injected`
- `agent:status`

---

#### 14. No Agent Health Monitoring
**File:** None exists
**Problem:** Each agent must maintain `AgentStatus` record with:
- `state`: idle | processing | alert | error
- `lastHeartbeat`: ISO 8601 timestamp
- `currentTask`: human-readable string
- `processedCount`: cumulative counter
- `errorCount`: cumulative counter

**Frontend Dependency:** `AgentStatusBar` component expects real-time `agent:status` events.

---

#### 15. Missing Conjunction Status Lifecycle
**File:** None exists
**Problem:** Conjunctions have 5 states (INTERFACE_CONTRACT.md §4):
- `active` → `mitigated` (after maneuver)
- `active` → `monitoring` (Pc below threshold)
- `active` → `expired` (TCA passed)
- `active` → `false_alarm` (re-screen shows lower Pc)

**Required:** State machine in Risk Assessor agent.

---

### Non-Critical Issues (Can Be Addressed Later)

1. **No Database Persistence** — In-memory store is fine for demo, but no restart resilience
2. **No Authentication** — API endpoints are open (acceptable for demo)
3. **No Rate Limiting** — No DDoS protection (acceptable for demo)
4. **No Logging Infrastructure** — No structured logging (console.log acceptable for demo)
5. **No CI/CD** — No automated testing for backend (acceptable for demo)
6. **No Docker Compose** — Manual startup required (acceptable for demo)
7. **Hardcoded Operator Agents** — Only 2 simulated operators with fixed Δv budgets
8. **No LLM Advisory Generation** — Template-based advisories acceptable for demo
9. **No Shell Decay Model Tuning** — Uses simplified atmospheric decay rates
10. **No Real CelesTrak API Integration Test** — Mock fixtures used in tests

---

## Technology Stack Decision

### Recommended: **Python (FastAPI)**

**Rationale:**
1. **Data Layer Compatibility** — Data layer uses TypeScript, but all logic is pure functions. Easy to port or call via subprocess if needed.
2. **Agent Ecosystem** — Python has rich agent/async libraries (`asyncio`, `aiohttp`)
3. **Scientific Computing** — NumPy/SciPy for Pc calculations (though data layer already has this)
4. **WebSocket Support** — FastAPI has excellent WebSocket support
5. **Speed** — Faster to implement agents in Python than Express/Node
6. **Team Skill Alignment** — Backend person likely familiar with Python

**Alternative: Node.js (Express + TypeScript)**
- Pros: Same language as frontend/data layer, easier imports
- Cons: Less agent ecosystem, more boilerplate for message bus

**Decision:** Proceed with **FastAPI** unless team strongly prefers Node.

---

## 15-Phase Implementation Plan

### Phase Structure
- Each phase = 1 short-lived branch + PR
- **Total Estimated Time:** 15-20 hours (1-1.5 hours per phase)
- **Dependencies:** Phases must be completed sequentially within groups
- **Groups:** A → B → C → D → E (groups can partially overlap)

---

## 🏗️ GROUP A — Foundation (4 phases)

### Phase 1: Project Scaffolding & Message Bus
**Branch:** `backend/A1-project-init`  
**Time Estimate:** 1.5 hours  
**Goal:** Create backend directory structure, install dependencies, implement message bus.

**Tasks:**
1. Create `/backend` directory
2. Initialize Python project:
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # or venv\Scripts\activate on Windows
   pip install fastapi uvicorn websockets pydantic python-dotenv
   ```
3. Create `backend/requirements.txt`
4. Implement message bus:
   - `backend/core/message_bus.py` — In-memory pub-sub
   - `AgentMessage<T>` envelope from INTERFACE_CONTRACT.md §2.0
   - Subscribe/publish methods
   - Topic-based routing
5. Create `backend/main.py` — FastAPI app entry point (empty for now)
6. Add `.env` file with `PORT=8000`
7. Test: `uvicorn main:app --reload` starts server on port 8000

**Deliverables:**
- `/backend` directory exists
- `message_bus.py` with pub-sub working
- FastAPI app runs (returns 404 on all routes)

**Acceptance Criteria:**
- `POST` to `http://localhost:8000` returns 404 (server is up)
- Message bus can publish/subscribe to test topic

---

### Phase 2: Type Definitions & Shared Models
**Branch:** `backend/A2-types`  
**Time Estimate:** 1 hour  
**Goal:** Port all TypeScript types from `types/contract.ts` to Python Pydantic models.

**Tasks:**
1. Create `backend/models/` directory
2. Create `backend/models/types.py`:
   - Port all enums (ObjectType, ObjectStatus, RiskLevel, etc.)
   - Port all interfaces as Pydantic `BaseModel` classes:
     - `TrackedObject`
     - `ConjunctionEvent`
     - `ShellRiskSnapshot`
     - `ManeuverProposal`
     - `AgentStatus`
     - `Advisory`
     - `AuditLogEntry`
     - `CrisisInjectionRequest`
     - `CrisisInjectionResponse`
     - `AgentMessage[T]`
     - All 9 message payloads (§2.1–2.9)
3. Create `backend/models/api.py`:
   - `PaginatedResponse[T]`
   - `DashboardSummary`
   - `ConjunctionDetailResponse`
   - `AgentsStatusResponse`
   - `ShellsResponse`

**Deliverables:**
- All INTERFACE_CONTRACT.md types exist as Pydantic models
- Field names match exactly (camelCase preserved via `alias` if needed)

**Acceptance Criteria:**
- Import `from backend.models.types import TrackedObject` works
- Pydantic validation enforces required fields

---

### Phase 3: In-Memory Data Store
**Branch:** `backend/A3-store`  
**Time Estimate:** 1 hour  
**Goal:** Create thread-safe in-memory store for all entity types.

**Tasks:**
1. Create `backend/core/store.py`
2. Implement `DataStore` class with:
   - `objects: Dict[str, TrackedObject]`
   - `conjunctions: Dict[str, ConjunctionEvent]`
   - `maneuvers: Dict[str, ManeuverProposal]`
   - `advisories: List[Advisory]`
   - `audit_log: List[AuditLogEntry]`
   - `agent_statuses: Dict[AgentType, AgentStatus]`
   - `shells: Dict[str, ShellRiskSnapshot]`
3. Thread-safe methods:
   - `add_object(obj: TrackedObject)`
   - `get_object(id: str) -> TrackedObject | None`
   - `get_objects(filters: dict) -> List[TrackedObject]`
   - Same for all other entity types
4. Singleton pattern (global `store` instance)

**Deliverables:**
- `store.py` with complete CRUD operations
- Exported global `store` instance

**Acceptance Criteria:**
- Can add/retrieve objects from store
- Filters work (e.g., `get_objects({"type": "satellite"})`)

---

### Phase 4: Audit Logger
**Branch:** `backend/A4-audit-logger`  
**Time Estimate:** 45 minutes  
**Goal:** Central audit logging utility that all agents will call.

**Tasks:**
1. Create `backend/core/audit.py`
2. Implement `AuditLogger` class:
   ```python
   def log(
       agent_id: str,
       agent_type: AgentType,
       action: AuditAction,
       description: str,
       related_entity_id: str | None = None,
       related_entity_type: str | None = None,
       metadata: dict = {}
   ) -> AuditLogEntry
   ```
3. Auto-generates UUID, timestamp
4. Writes to `store.audit_log`
5. Publishes `audit:logged` event to message bus

**Deliverables:**
- `audit.py` with logging function
- Integrated with store

**Acceptance Criteria:**
- Calling `audit.log(...)` creates entry in store
- Entry has correct timestamp, UUID

---

## 🤖 GROUP B — Core Agents (5 phases)

### Phase 5: Tracker Agent
**Branch:** `backend/B1-tracker-agent`  
**Time Estimate:** 2 hours  
**Goal:** Implement agent that ingests TLEs, propagates orbits, updates store.

**Tasks:**
1. Create `backend/agents/tracker.py`
2. Implement `TrackerAgent` class:
   - **Startup:** Load TLEs from data layer fixtures or fetch from CelesTrak
   - **Propagation Loop:**
     - Every 60 seconds (configurable)
     - Call data layer propagation functions
     - Convert to `TrackedObject` format
     - Update `store.objects`
   - **Message Publishing:**
     - Publish `state_vectors_updated` → Risk Assessor
     - Publish `shell_population_updated` → Epidemic Forecaster
   - **Audit:** Log `tle_ingested`, `propagation_complete`
3. Integration with data layer:
   - Import TypeScript data functions OR
   - Port minimal propagation logic to Python OR
   - Call Node.js subprocess (last resort)
4. Agent status updates:
   - Set `state = "processing"` during propagation
   - Set `state = "idle"` when complete
   - Update `processedCount`

**Deliverables:**
- `tracker.py` with working agent
- Periodic propagation loop
- Store populated with `TrackedObject[]`

**Acceptance Criteria:**
- Agent starts and runs propagation cycle
- `store.objects` contains ≥100 objects after first cycle
- `state_vectors_updated` message published to bus

---

### Phase 6: Risk Assessor Agent
**Branch:** `backend/B2-risk-assessor`  
**Time Estimate:** 2.5 hours  
**Goal:** Conjunction screening, Pc calculation, conjunction event creation.

**Tasks:**
1. Create `backend/agents/risk_assessor.py`
2. Subscribe to `state_vectors_updated` from Tracker
3. **Screening Logic:**
   - All-on-all pairs with 5 km distance pre-filter
   - For passing pairs, compute Pc:
     - Port `computePc()` from data layer OR
     - Use simplified Foster-1992 formula
   - Create `ConjunctionEvent` for Pc > 1e-5
4. **Risk Classification:**
   ```python
   def classify_risk(pc: float) -> RiskLevel:
       if pc >= 1e-3: return "critical"
       elif pc >= 1e-4: return "elevated"
       else: return "nominal"
   ```
5. **Message Publishing:**
   - For `elevated`/`critical` events: publish `high_pc_conjunction` → Maneuver Negotiation
   - Publish `risk_assessment_complete` → Advisory
6. **WebSocket Events:**
   - Emit `conjunction:created` for new events
   - Emit `conjunction:updated` for Pc changes
7. **Recomputation:**
   - Subscribe to `maneuver_resolved`
   - Recompute Pc with post-maneuver state
   - Update `status = "mitigated"` if Pc < 1e-4
8. **Anomaly Handling:**
   - Subscribe to `anomaly_detected`
   - Re-screen anomalous object against all others
9. **Audit:** Log `conjunction_detected`, `conjunction_updated`

**Deliverables:**
- `risk_assessor.py` with screening logic
- Conjunctions created in store
- High-Pc events trigger maneuver negotiation

**Acceptance Criteria:**
- ≥5 conjunction events created after first screening
- Events have valid Pc values (e.g., `2.3e-3`)
- `riskLevel` correctly classified
- `high_pc_conjunction` message published for critical events

---

### Phase 7: Maneuver Negotiation Agent
**Branch:** `backend/B3-maneuver-negotiation`  
**Time Estimate:** 2 hours  
**Goal:** Auction-based maneuver negotiation between simulated operators.

**Tasks:**
1. Create `backend/agents/maneuver_negotiation.py`
2. Subscribe to `high_pc_conjunction` from Risk Assessor
3. **Operator Sub-Agents:**
   - Hardcode 2 operators:
     - Operator A: `operatorId = "op-001"`, `deltav_budget = 340 m/s`, `remaining = 340 m/s`
     - Operator B: `operatorId = "op-002"`, `deltav_budget = 112 m/s`, `remaining = 112 m/s`
   - Each operator bids a `deltaV` magnitude (random between 0.3–0.8 m/s)
4. **Auction Logic:**
   - Winner = lowest `bid / remaining_budget` ratio
   - Generate `rationale` string
5. **Maneuver Proposal Creation:**
   - Generate `ManeuverProposal` with:
     - Random unit vector for `deltaV.direction`
     - `burnTime` = TCA - 2 hours
     - `fuelCost` = `magnitude * 3` kg (simplified)
     - `negotiationLog` with 4 entries:
       1. INITIATE
       2. BID (Operator A)
       3. BID (Operator B)
       4. ACCEPT (winner)
6. **Message Publishing:**
   - Publish `maneuver_resolved` → Risk Assessor
   - Publish `negotiation_complete` → Advisory
7. **WebSocket Events:**
   - Emit `maneuver:proposed`
   - Emit `maneuver:resolved`
8. **Audit:** Log `maneuver_proposed`, `maneuver_accepted`

**Deliverables:**
- `maneuver_negotiation.py` with bidding logic
- `ManeuverProposal` records with negotiation logs
- Integration with Risk Assessor

**Acceptance Criteria:**
- High-Pc conjunction triggers negotiation
- Proposal has complete `negotiationLog` with 4 entries
- `rationale` field is human-readable
- Winner selected based on Δv budget ratio

---

### Phase 8: Advisory Agent
**Branch:** `backend/B4-advisory-agent`  
**Time Estimate:** 1.5 hours  
**Goal:** Generate natural-language advisories from agent events.

**Tasks:**
1. Create `backend/agents/advisory.py`
2. Subscribe to 4 message types:
   - `risk_assessment_complete` (§2.5)
   - `cascade_forecast_complete` (§2.6)
   - `negotiation_complete` (§2.7)
   - `anomaly_report` (§2.9)
3. **Advisory Generation (Template-Based):**
   - For `negotiation_complete`:
     ```
     Title: "Collision risk mitigated — {object_name} avoidance maneuver executed"
     Body: "A close approach between {primary} and {secondary} was detected at 
           {tca} with a collision probability of {pc}. After negotiation between 
           {op_a} and {op_b}, {winner} will execute a {deltaV} m/s {direction} 
           burn at {burn_time}, reducing collision probability to {resulting_pc} 
           — well below the action threshold."
     ```
   - Similar templates for other event types
4. **Storage:**
   - Create `Advisory` record
   - Add to `store.advisories`
5. **WebSocket:** Emit `advisory:new`
6. **Audit:** Log `advisory_generated`

**Deliverables:**
- `advisory.py` with template engine
- Advisories created for all subscribed events

**Acceptance Criteria:**
- Maneuver negotiation completion triggers advisory
- Advisory `body` is grammatically correct English
- Advisory references correct conjunction/object IDs

---

### Phase 9: Epidemic Forecaster Agent
**Branch:** `backend/B5-epidemic-forecaster`  
**Time Estimate:** 1.5 hours  
**Goal:** Wrap data layer SIR model in agent, publish cascade forecasts.

**Tasks:**
1. Create `backend/agents/epidemic_forecaster.py`
2. Subscribe to `shell_population_updated` from Tracker
3. **Forecast Computation:**
   - For each shell, call data layer `runEpidemicForecast()`
   - Create `ShellRiskSnapshot` records
   - Store in `store.shells`
4. **Message Publishing:**
   - Publish `cascade_forecast_complete` → Advisory
5. **WebSocket:** Emit `shell:updated` for each shell
6. **Audit:** Log `cascade_forecast_updated`

**Deliverables:**
- `epidemic_forecaster.py` with SIR integration
- `ShellRiskSnapshot` records in store

**Acceptance Criteria:**
- Shell population update triggers forecast
- All LEO shells (200–1000 km) have snapshots
- `r0` values realistic (0.5–1.5 range)
- `projectionYears` and `projectedS/I/R` arrays populated

---

## 🌐 GROUP C — API Layer (3 phases)

### Phase 10: REST Endpoints (Part 1 — Read Operations)
**Branch:** `backend/D1-rest-endpoints-reads`  
**Time Estimate:** 2 hours  
**Goal:** Implement 8 GET endpoints that read from store.

**Tasks:**
1. Create `backend/api/routes.py`
2. Implement endpoints:
   - `GET /api/v1/objects` — with pagination & filters
   - `GET /api/v1/objects/:id`
   - `GET /api/v1/conjunctions` — with pagination & filters
   - `GET /api/v1/conjunctions/:id` — with embedded objects
   - `GET /api/v1/shells`
   - `GET /api/v1/maneuvers` — with pagination & filters
   - `GET /api/v1/agents/status`
   - `GET /api/v1/advisories` — with pagination & filters
3. **Pagination Logic:**
   ```python
   def paginate(items, limit=50, offset=0):
       return {
           "data": items[offset:offset+limit],
           "total": len(items),
           "limit": limit,
           "offset": offset
       }
   ```
4. **Filters:**
   - `objects`: by `type`, `shellId`
   - `conjunctions`: by `status`, `riskLevel`
   - `maneuvers`: by `negotiationStatus`
   - `advisories`: by `severity`
5. Wire routes into `main.py`

**Deliverables:**
- 8 GET endpoints functional
- JSON responses match INTERFACE_CONTRACT.md §3.1 exactly

**Acceptance Criteria:**
- `GET http://localhost:8000/api/v1/objects` returns paginated objects
- `GET http://localhost:8000/api/v1/conjunctions?riskLevel=critical` filters correctly
- `GET http://localhost:8000/api/v1/agents/status` returns all 6 agents

---

### Phase 11: REST Endpoints (Part 2 — Dashboard & Audit)
**Branch:** `backend/D1-rest-endpoints-dashboard`  
**Time Estimate:** 1 hour  
**Goal:** Implement remaining GET endpoints and aggregation logic.

**Tasks:**
1. Implement endpoints:
   - `GET /api/v1/audit` — with `agentType` filter
   - `GET /api/v1/dashboard/summary` — aggregated stats
2. **Dashboard Summary Logic:**
   ```python
   def compute_dashboard_summary():
       return {
           "totalTrackedObjects": len(store.objects),
           "activeSatellites": count_by_type("satellite"),
           "debrisObjects": count_by_type("debris"),
           "rocketBodies": count_by_type("rocket_body"),
           "activeConjunctions": count_conjunctions("active"),
           "criticalConjunctions": count_conjunctions("critical"),
           "maneuveredLast24h": count_recent_maneuvers(24),
           "shellsAtRisk": count_shells_with_r0_gt_1(),
           "agentStatuses": [summarize_agent(a) for a in agents],
           "lastUpdated": now_iso()
       }
   ```

**Deliverables:**
- 2 additional endpoints
- Dashboard summary endpoint returns real-time aggregates

**Acceptance Criteria:**
- `GET /api/v1/dashboard/summary` returns valid `DashboardSummary`
- Counts match store contents

---

### Phase 12: WebSocket Server
**Branch:** `backend/D2-websocket-server`  
**Time Estimate:** 1.5 hours  
**Goal:** Implement WebSocket endpoint, wire to message bus.

**Tasks:**
1. Create `backend/api/websocket.py`
2. Implement WebSocket endpoint at `/ws`
3. **Connection Handling:**
   - Accept connection
   - Send initial snapshot:
     - Current objects
     - Active conjunctions
     - Agent statuses
   - Subscribe to all message bus topics
4. **Event Broadcasting:**
   - Map message bus events to WebSocket `WsMessage<T>` format
   - Broadcast to all connected clients
5. **Event Types (11 total):**
   - `objects:updated`
   - `conjunction:created`
   - `conjunction:updated`
   - `conjunction:mitigated`
   - `shell:updated`
   - `maneuver:proposed`
   - `maneuver:resolved`
   - `advisory:new`
   - `anomaly:detected`
   - `crisis:injected`
   - `agent:status`
6. Wire into `main.py`

**Deliverables:**
- WebSocket server at `ws://localhost:8000/ws`
- Real-time event broadcasting

**Acceptance Criteria:**
- WebSocket client can connect
- Receives initial snapshot on connection
- Receives `conjunction:created` when Risk Assessor creates conjunction
- Frontend `WebSocketProvider` can switch to live mode and receive events

---

## 🚨 GROUP D — Crisis & Anomaly (2 phases)

### Phase 13: Crisis Injection Handler
**Branch:** `backend/E1-crisis-injection`  
**Time Estimate:** 1.5 hours  
**Goal:** Implement POST endpoint for crisis simulation.

**Tasks:**
1. Implement `POST /api/v1/crisis/inject`
2. **Handler Logic:**
   - Validate `CrisisInjectionRequest`
   - Call data layer `generateBreakupFragments()`
   - Insert fragments into `store.objects`
   - Trigger Tracker agent to re-propagate (or propagate fragments directly)
   - Wait for cascade:
     - Risk Assessor screens fragments
     - Creates new conjunctions
     - Triggers maneuver negotiations
     - Advisory generates alerts
   - Collect metrics:
     - `injectedObjectCount`
     - `affectedShellIds`
     - `newConjunctionEventCount`
   - Return `CrisisInjectionResponse`
3. **WebSocket:** Emit `crisis:injected` event
4. **Audit:** Log `crisis_injected`

**Deliverables:**
- Crisis injection endpoint functional
- Frontend crisis modal triggers real backend cascade

**Acceptance Criteria:**
- POST with 250 fragments creates 250 new objects
- New conjunctions detected within 5 seconds
- Response includes correct `newConjunctionEventCount`
- Frontend sees real-time updates (new conjunctions, advisories)

---

### Phase 14: Anomaly Agent
**Branch:** `backend/C1-anomaly-agent`  
**Time Estimate:** 1.5 hours  
**Goal:** Detect unexpected orbit changes.

**Tasks:**
1. Create `backend/agents/anomaly.py`
2. **Detection Loop:**
   - Every 60 seconds (or on `state_vectors_updated`)
   - Compare current `orbitalElements` with previous epoch
   - Flag anomaly if:
     - `|Δa| > 10 km` OR
     - `|Δi| > 0.5°`
     - AND `status != "maneuvering"`
3. **Message Publishing:**
   - Publish `anomaly_detected` → Risk Assessor
   - Publish `anomaly_report` → Advisory
4. **WebSocket:** Emit `anomaly:detected`
5. **Audit:** Log `anomaly_detected`
6. Store previous state in `anomaly_history` dict

**Deliverables:**
- Anomaly agent running
- Detects orbit changes

**Acceptance Criteria:**
- Crisis injection triggers anomaly detection for fragments
- `anomaly:detected` event emitted
- Risk Assessor re-screens anomalous object

---

## ✅ GROUP E — Integration & Polish (1 phase)

### Phase 15: End-to-End Integration & Testing
**Branch:** `backend/E2-integration`  
**Time Estimate:** 2 hours  
**Goal:** Wire all components, test full system, create startup docs.

**Tasks:**
1. **Agent Orchestration:**
   - Create `backend/core/agent_manager.py`
   - Start all 6 agents on server startup
   - Health check loop (every 10s)
   - Update agent statuses in store
2. **Startup Script:**
   - Create `backend/start.sh`:
     ```bash
     #!/bin/bash
     source venv/bin/activate
     uvicorn main:app --host 0.0.0.0 --port 8000 --reload
     ```
3. **CORS Configuration:**
   - Enable CORS for `http://localhost:3000`
   - Allow credentials, all methods
4. **README:**
   - Create `backend/README.md`:
     - Installation instructions
     - Environment variables
     - How to run
     - API documentation link
5. **End-to-End Test:**
   - Start backend
   - Switch frontend to `NEXT_PUBLIC_API_MODE=live`
   - Test all 11 pages
   - Test crisis injection
   - Verify WebSocket events
6. **Bug Fixes:**
   - Fix any integration issues discovered
   - Ensure all 15 PRD success criteria pass

**Deliverables:**
- Complete working system
- Documentation
- Frontend switched to live mode

**Acceptance Criteria:**
- Backend starts with `./start.sh`
- Frontend loads dashboard in live mode
- All 11 REST endpoints return valid data
- WebSocket events update UI in real-time
- Crisis injection creates visible cascade
- No console errors

---

## Success Criteria Mapping (PRD §5)

| PRD Criterion | Implementation Phase | Verification Method |
|---------------|----------------------|---------------------|
| 1. All 11 REST endpoints return valid JSON | Phase 10–11 | Postman collection / curl tests |
| 2. WebSocket pushes all 11 event types | Phase 12 | WebSocket client test script |
| 3. Risk Assessor produces real Pc numbers | Phase 6 | Check conjunction records have Pc ≥ 1e-5 |
| 4. Crisis injection triggers full cascade | Phase 13 | POST request → verify new conjunctions |
| 5. Maneuver negotiation produces logged decisions | Phase 7 | Check `negotiationLog` has 4+ entries |
| 6. Advisory agent produces plain-language narratives | Phase 8 | Read advisory body, verify grammar |
| 7. Agent status chips update in real-time | Phase 12, 15 | Frontend sees `agent:status` events |
| 8. Audit log captures all agent decisions | Phase 4 (all) | Check audit log has ≥50 entries after 5 min |
| 9. Backend runs on port 8000 with CORS enabled | Phase 15 | Frontend loads without CORS error |

---

## Dependency Graph

```
A1 (Project Init)
  ├─ A2 (Types)
  │   ├─ A3 (Store)
  │   │   ├─ A4 (Audit Logger)
  │   │   │   ├─ B1 (Tracker)
  │   │   │   │   ├─ B2 (Risk Assessor)
  │   │   │   │   │   ├─ B3 (Maneuver Negotiation)
  │   │   │   │   │   │   └─ B4 (Advisory)
  │   │   │   │   │   └─ C1 (Anomaly)
  │   │   │   │   └─ B5 (Epidemic Forecaster)
  │   │   │   │       └─ B4 (Advisory)
  │   │   │   └─ D1 (REST Reads)
  │   │   │       └─ D1.5 (Dashboard)
  │   │   │           └─ D2 (WebSocket)
  │   │   │               ├─ E1 (Crisis Injection)
  │   │   │               └─ E2 (Integration)
```

**Critical Path:** A1 → A2 → A3 → A4 → B1 → B2 → B3 → B4 → D1 → D2 → E2

---

## Environment Variable Configuration

**Frontend (`.env.local`):**
```bash
# After backend is ready:
NEXT_PUBLIC_API_MODE=live
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_WS_URL=ws://localhost:8000/ws
```

**Backend (`.env`):**
```bash
PORT=8000
CORS_ORIGINS=http://localhost:3000
PROPAGATION_INTERVAL_SECONDS=60
SCREENING_INTERVAL_SECONDS=60
LOG_LEVEL=INFO
```

---

## Startup Order

1. **Start Backend:**
   ```bash
   cd backend
   source venv/bin/activate
   uvicorn main:app --host 0.0.0.0 --port 8000 --reload
   ```
2. **Start Frontend:**
   ```bash
   npm run dev
   ```
3. **Open Browser:** `http://localhost:3000`

---

## Testing Strategy

### Per-Phase Testing
- **Unit Tests:** Each agent has 2-3 unit tests for core logic
- **Integration Tests:** Message bus integration tested in isolation
- **Manual Testing:** Postman collection for REST endpoints

### Final Integration Testing (Phase 15)
1. **Full System Test:**
   - Load dashboard → verify all cards populate
   - Check conjunction table → verify Pc values
   - Inject crisis → verify cascade (new conjunctions, advisories)
   - Monitor WebSocket events in browser DevTools
2. **Performance Test:**
   - 500 objects → screening completes in <5 seconds
   - WebSocket handles 10 concurrent clients
3. **Edge Case Testing:**
   - No conjunctions found → dashboard shows 0
   - All agents in error state → dashboard shows red chips

---

## Known Limitations & Future Work

### Current Scope Limitations (Acceptable for Demo)
1. **In-Memory Store** — No persistence, data lost on restart
2. **Simplified Pc Calculation** — Foster-1992 only, no full covariance
3. **Hardcoded Operators** — Only 2 simulated operators
4. **Template-Based Advisories** — No LLM integration
5. **No Authentication** — Open API
6. **No Rate Limiting** — Vulnerable to abuse
7. **Manual Data Refresh** — No CelesTrak auto-fetch

### Future Enhancements (Post-Demo)
1. **PostgreSQL Persistence** — Replace in-memory store
2. **Full Monte Carlo Pc** — Implement from data layer
3. **Dynamic Operator Pool** — Load from config file
4. **LLM Advisory Generation** — OpenAI integration
5. **OAuth2 Authentication** — Protect API endpoints
6. **Docker Compose** — Single-command deployment
7. **Automated TLE Refresh** — CelesTrak cron job
8. **Agent Failure Recovery** — Restart dead agents
9. **Distributed Message Bus** — Redis pub-sub for multi-instance
10. **Grafana Dashboards** — Backend metrics visualization

---

## File Structure (After Completion)

```
auralis/
├── app/                     # Next.js frontend (existing) ✅
├── components/              # UI components (existing) ✅
├── lib/                     # Frontend API client (existing) ✅
├── types/                   # Shared types (existing) ✅
├── data/                    # Data layer (existing) ✅
├── backend/                 # New backend directory ❌
│   ├── agents/              # Agent implementations
│   │   ├── tracker.py
│   │   ├── risk_assessor.py
│   │   ├── maneuver_negotiation.py
│   │   ├── advisory.py
│   │   ├── anomaly.py
│   │   └── epidemic_forecaster.py
│   ├── api/                 # REST & WebSocket routes
│   │   ├── routes.py
│   │   └── websocket.py
│   ├── core/                # Infrastructure
│   │   ├── message_bus.py
│   │   ├── store.py
│   │   ├── audit.py
│   │   └── agent_manager.py
│   ├── models/              # Pydantic models
│   │   ├── types.py
│   │   └── api.py
│   ├── tests/               # Unit tests
│   ├── main.py              # FastAPI app entry point
│   ├── requirements.txt
│   ├── .env.example
│   ├── README.md
│   └── start.sh
├── INTERFACE_CONTRACT.md    # Shared spec (existing) ✅
└── BRIEF_BACKEND.md         # This document (existing) ✅
```

---

## Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Data layer integration complexity | High | Medium | Port minimal logic to Python, avoid subprocess calls |
| Pc calculation performance | Medium | Low | Use pre-filtering (5 km), limit catalog size to 500 |
| WebSocket connection stability | Medium | Low | Implement reconnection logic in frontend |
| Message bus memory leaks | Low | Medium | Use weak references, periodic cleanup |
| Agent deadlock | High | Low | Timeout on message subscriptions, health checks |
| Type mismatch frontend/backend | High | Medium | **Strict adherence to INTERFACE_CONTRACT.md** |

---

## Communication Plan

### Before Starting
- [ ] Review INTERFACE_CONTRACT.md with team
- [ ] Confirm FastAPI vs Express decision
- [ ] Assign backend owner

### During Development
- [ ] Daily standup — report phase completion
- [ ] Update this document if scope changes
- [ ] Tag frontend/data owners on PRs that affect contracts

### Phase Milestones (Report to Team)
- [ ] Phase 5 Complete: "Tracker agent running, store populated"
- [ ] Phase 10 Complete: "All REST endpoints live"
- [ ] Phase 12 Complete: "WebSocket broadcasting events"
- [ ] Phase 15 Complete: "Full system integration tested, ready for demo"

---

## Conclusion

The Auralis project is **75% complete** by component count, but **0% functional** as a system without the backend agent runtime. This 15-phase plan provides a **sequential, testable path** from zero to a fully integrated orbital intelligence platform.

**Key Success Factors:**
1. **Strict Contract Adherence** — Every field name, enum value, and timestamp format must match INTERFACE_CONTRACT.md
2. **Incremental Testing** — Test each phase before moving to next
3. **Agent Isolation** — Each agent is independent, communicates only via message bus
4. **Real-Time First** — WebSocket events are primary, REST is secondary
5. **Audit Everything** — Every state change writes an audit log entry

**Estimated Total Time:** 15-20 hours (serial execution) or 10-12 hours (with parallelization where possible)

**Next Step:** Start Phase 1 — Project Scaffolding & Message Bus

---

**Document Version:** 1.0  
**Last Updated:** 2026-09-13  
**Owner:** Backend Engineering Team
