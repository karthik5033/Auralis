# Auralis — Frontend Brief

> **Owner:** Frontend person
> **References:** [PRD.md](./PRD.md) §2 (Demo Narrative), §5 (Success Criteria) · [INTERFACE_CONTRACT.md](./INTERFACE_CONTRACT.md) §1, §3, §4

---

## Your Slice

You own the Next.js dashboard and the 3D globe visualization. The dashboard already exists — 11 authenticated routes under `app/(auth)/`, a landing page at `app/page.tsx`, and shared components in `components/`. Your job is to (1) add a 3D globe (using `globe.gl`) to the Command Center or Object Graph page so propagated satellite positions render as moving dots on Earth, (2) wire every existing page to consume data through `lib/mockApi.ts` using the exact shapes from INTERFACE_CONTRACT.md §1, so that when the real backend comes online the only change is swapping the import, (3) connect to the WebSocket for real-time updates, and (4) ensure the demo narrative from PRD.md §2 flows visually from ingest → screening → alert → forecast → crisis → negotiation → resolution. You do **not** build agents, propagate orbits, or compute collision probabilities — you display what the backend sends you.

---

## Task List

Each task is one short-lived branch + PR.

### Group A — Type Definitions & Mock API

- [ ] **A1. Contract types**
  Create `types/contract.ts` with TypeScript definitions for every shape in INTERFACE_CONTRACT.md §1:
  - `TrackedObject` (§1.1)
  - `ConjunctionEvent` (§1.2)
  - `ShellRiskSnapshot` (§1.3)
  - `ManeuverProposal` + `NegotiationLogEntry` (§1.4)
  - `AgentStatus` (§1.5)
  - `Advisory` (§1.6)
  - `AuditLogEntry` (§1.7)
  - `CrisisInjectionRequest` + `CrisisInjectionResponse` (§1.8)
  - All enums from §4: `ObjectType`, `ObjectStatus`, `RiskLevel`, `ConjunctionStatus`, `NegotiationStatus`, `AgentType`, `AgentState`, `CascadeTrend`, `AuditAction`
  - `WsMessage<T>` wrapper (§3.2)

  Copy field names, types, and comments **verbatim** from the contract. Do not rename anything.

- [ ] **A2. Mock API module**
  Create `lib/mockApi.ts` exporting async functions that return hardcoded data matching the exact JSON payloads in §3.1:

  ```typescript
  export async function getObjects(params?): Promise<PaginatedResponse<TrackedObject>>
  export async function getObjectById(id: string): Promise<TrackedObject>
  export async function getConjunctions(params?): Promise<PaginatedResponse<ConjunctionEvent>>
  export async function getConjunctionById(id: string): Promise<ConjunctionDetail>
  export async function getShells(): Promise<{ data: ShellRiskSnapshot[] }>
  export async function getManeuvers(params?): Promise<PaginatedResponse<ManeuverProposal>>
  export async function getAgentStatuses(): Promise<{ agents: AgentStatus[] }>
  export async function getAdvisories(params?): Promise<PaginatedResponse<Advisory>>
  export async function getAuditLog(params?): Promise<PaginatedResponse<AuditLogEntry>>
  export async function getDashboardSummary(): Promise<DashboardSummary>
  export async function injectCrisis(req: CrisisInjectionRequest): Promise<CrisisInjectionResponse>
  ```

  Use the example JSON responses from §3.1 as seed data. Migrate/replace existing `lib/mockData.ts` to conform to these shapes.

- [ ] **A3. Mock WebSocket emitter**
  Create `lib/mockWs.ts` — a local event emitter that simulates the WebSocket events from §3.2. Uses `setInterval` to periodically dispatch `WsMessage<T>` objects (`objects:updated`, `conjunction:created`, `advisory:new`, `agent:status`, etc.) so pages can render real-time updates before the backend exists.

- [ ] **A4. API switcher**
  Create `lib/api.ts` that imports from `lib/mockApi.ts` now but can be pointed to `http://localhost:8000/api/v1` later with a single env-var flip (`NEXT_PUBLIC_API_MODE=mock|live`). Similarly for the WebSocket: connect to the mock emitter or to `ws://localhost:8000/ws` based on the same flag.

### Group B — 3D Globe

- [ ] **B1. Install globe.gl**
  `npm install globe.gl`. Add the globe component to `components/globe/GlobeView.tsx`. Render a dark-themed Earth with atmospheric glow. No data yet — just the bare globe.

- [ ] **B2. Satellite points layer**
  Add a points layer to the globe. Each `TrackedObject` with `type: "satellite"` renders as a colored dot at its lat/lon/altitude (convert ECI → geodetic). Color by `status`:
  - `"active"` → green
  - `"maneuvering"` → amber
  - `"decayed"` → grey

- [ ] **B3. Debris points layer**
  Add a second points layer for `type: "debris"` and `"rocket_body"`. Use smaller dots, grey/red tint. On crisis injection, new debris dots should appear visibly.

- [ ] **B4. Conjunction arcs**
  For each `ConjunctionEvent` with `status: "active"`, draw an arc between the two objects' positions. Color by `riskLevel`:
  - `"nominal"` → green
  - `"elevated"` → amber
  - `"critical"` → red, pulsing

- [ ] **B5. Globe integration into page**
  Mount `GlobeView` on the Command Center (`/dashboard`) or Object Graph (`/network`) page. Add a toggle to switch between the existing list/card view and the globe view. The globe should auto-rotate and respond to WebSocket `objects:updated` events.

### Group C — Page Wiring

Wire each existing route to fetch data from `lib/api.ts` (which reads from mock for now). Replace any hardcoded data in the page components with API calls.

- [ ] **C1. Command Center (`/dashboard`)**
  Fetch `getDashboardSummary()`. Wire stat cards to: `totalTrackedObjects`, `activeSatellites`, `debrisObjects`, `activeConjunctions`, `criticalConjunctions`, `shellsAtRisk`. Show agent status chips from `agentStatuses[]` array — each chip shows `agentType` and `state` with color coding (`idle` = grey, `processing` = blue, `alert` = red, `error` = red).

- [ ] **C2. Data Ingestion (`/data-ingestion`)**
  Fetch `getObjects()` and display the total count, latest `lastUpdated` timestamp, and a feed of recently ingested objects. Subscribe to `objects:updated` WebSocket for live count updates.

- [ ] **C3. Advisory / Chat (`/chat`)**
  Fetch `getAdvisories()`. Render each `Advisory` as a chat bubble — `title` as the header, `body` as the message, `severity` as the color accent. Subscribe to `advisory:new` WebSocket for real-time new messages.

- [ ] **C4. Object Graph (`/network`)**
  Fetch `getObjects()` and `getConjunctions()`. Render objects as nodes, conjunctions as edges. Color edges by `riskLevel`. This is the 2D graph view — the 3D globe (Group B) is a parallel visualization.

- [ ] **C5. Analytics & Trends (`/analytics`)**
  Fetch `getShells()`. For each `ShellRiskSnapshot`, render:
  - SIR curve chart using `projectionYears`, `projectedS`, `projectedI`, `projectedR`.
  - R₀ gauge — highlight shells where `r0 > 1.0` in red.
  - `trend` indicator (`"increasing"` ↑ red, `"stable"` → grey, `"decreasing"` ↓ green).
  Subscribe to `shell:updated` WebSocket to refresh charts live after crisis injection.

- [ ] **C6. Conjunction Events (`/cases`)**
  Fetch `getConjunctions()`. Render as a table/card list: `primaryObjectId`, `secondaryObjectId` (resolve to names via `getObjectById`), `tca` (countdown timer), `missDistance`, `collisionProbability` (display as scientific notation, e.g., `2.3 × 10⁻³`), `riskLevel` badge, `status` badge. Subscribe to `conjunction:created` and `conjunction:updated`.

- [ ] **C7. Tracked Objects (`/profiles`)**
  Fetch `getObjects()` with pagination. Render table with: `noradId`, `name`, `type`, `altitude`, `shellId`, `status`, `lastUpdated`. Click-through to detail view showing full `orbitalElements` and `covarianceUpperTriangle`.

- [ ] **C8. Risk Alerts (`/alerts`)**
  Fetch `getConjunctions({ riskLevel: "critical" })` and `getConjunctions({ riskLevel: "elevated" })`. Render as an alert feed sorted by `tca` (soonest first). Subscribe to `conjunction:created` for real-time new alerts.

- [ ] **C9. Fuel Ledger (`/financial`)**
  Fetch `getManeuvers({ negotiationStatus: "accepted" })`. Render a table of executed maneuvers: `maneuveringObjectId` (resolve name), `deltaV.magnitude` (m/s), `fuelCost` (kg), `burnTime`, `rationale`. Show running total Δv spent per operator.

- [ ] **C10. Audit & Governance (`/audit`)**
  Fetch `getAuditLog()`. Render as a timeline: `timestamp`, `agentType` badge, `action`, `description`. Filterable by `agentType`.

- [ ] **C11. Settings (`/settings`)**
  No API wiring needed. Keep the existing theme toggle and role selector as-is.

### Group D — Crisis Injection UI

- [ ] **D1. Crisis injection button**
  Add a prominent "Inject Crisis" button to the Command Center (`/dashboard`). On click, show a modal with fields matching `CrisisInjectionRequest` (§1.8): crisis type dropdown (`"fragmentation"`, `"collision"`, `"asat"`), altitude slider, fragment count input, optional source object selector, label text field. On submit, call `injectCrisis()` from `lib/api.ts`. Display the `CrisisInjectionResponse` as a toast notification.

- [ ] **D2. Crisis cascade animation**
  After `crisis:injected` WebSocket fires, visually animate the debris spike: globe dots appear, stat cards update, new conjunction events stream into the alerts feed, SIR curves shift on the analytics page. The audience should see the system *react* — this is PRD success criterion #4.

### Group E — Real-time Integration

- [ ] **E1. WebSocket provider**
  Create `components/providers/WebSocketProvider.tsx` — a React context that connects to the WebSocket (mock or live) on mount and dispatches events to subscribed components. Pages use `useWebSocket("conjunction:created", callback)` hook pattern.

- [ ] **E2. Notification integration**
  Wire the existing `NotificationCenter.tsx` in the navbar to show toast notifications for: `conjunction:created` (critical only), `maneuver:resolved`, `advisory:new`, `crisis:injected`.

---

## Contract Shapes You Consume

Every shape below is fetched from REST or received via WebSocket. Quoted directly from INTERFACE_CONTRACT.md:

| Shape | How you get it |
|-------|---------------|
| `TrackedObject` (§1.1) | `GET /api/v1/objects`, `objects:updated` WS |
| `ConjunctionEvent` (§1.2) | `GET /api/v1/conjunctions`, `conjunction:created` / `conjunction:updated` / `conjunction:mitigated` WS |
| `ShellRiskSnapshot` (§1.3) | `GET /api/v1/shells`, `shell:updated` WS |
| `ManeuverProposal` (§1.4) | `GET /api/v1/maneuvers`, `maneuver:proposed` / `maneuver:resolved` WS |
| `AgentStatus` (§1.5) | `GET /api/v1/agents/status`, `agent:status` WS |
| `Advisory` (§1.6) | `GET /api/v1/advisories`, `advisory:new` WS |
| `AuditLogEntry` (§1.7) | `GET /api/v1/audit` |
| `CrisisInjectionResponse` (§1.8) | Response from `POST /api/v1/crisis/inject`, `crisis:injected` WS |
| Dashboard summary | `GET /api/v1/dashboard/summary` |

## Contract Shapes You Produce

| Shape | Where |
|-------|-------|
| `CrisisInjectionRequest` (§1.8) | Sent as POST body to `/api/v1/crisis/inject` |

That's it. You only **send** one shape; everything else you **receive**.

---

## What NOT to Touch

| Area | Owner | Your boundary |
|------|-------|---------------|
| `backend/` (once it exists) | Backend person | Do not create or modify any backend code. |
| TLE parsing, SGP4, SIR model code | Data person | Do not implement orbital mechanics or epidemic modeling. |
| `PRD.md`, `INTERFACE_CONTRACT.md` | Shared docs | Do not modify without team agreement. |
| Agent logic, Pc computation, maneuver negotiation | Backend person | You display the results; you don't compute them. |

### Within your own area, preserve:
- The existing route structure under `app/(auth)/` — do not rename, delete, or reorganize routes.
- The existing theme system (`lib/ThemeContext.tsx`) — dark/light toggle must keep working.
- The existing auth context (`lib/AuthContext.tsx`) — role-based access must keep working.
- The existing component structure under `components/` — extend, don't rewrite.

---

## Definition of Done

Checked against PRD.md §5 (Success Criteria):

- [ ] **3D globe renders tracked objects** as colored dots at correct lat/lon/altitude positions — maps to PRD criterion #2 ("objects are not just static dots, they move or have projected paths").
- [ ] **Conjunction events show a real Pc value** in scientific notation (e.g., `2.3 × 10⁻³`) — not just "HIGH / MEDIUM / LOW" — maps to PRD criterion #3.
- [ ] **Crisis injection button exists on the dashboard**, modal collects `CrisisInjectionRequest` fields, and clicking it triggers a visible cascade: debris count spikes, new conjunction events appear, SIR curves shift — maps to PRD criterion #4.
- [ ] **Maneuver negotiation log is visible** — the `/financial` (Fuel Ledger) page shows the negotiation outcome, Δv debit, and rationale — maps to PRD criterion #5.
- [ ] **Advisory chat shows plain-language narrative** — each `Advisory` renders as a readable message in the `/chat` page — maps to PRD criterion #6.
- [ ] **Agent status chips on the dashboard** show each agent's `state` with color coding — maps to PRD nice-to-have #10.
- [ ] **All pages fetch from `lib/api.ts`** (mock mode), and switching `NEXT_PUBLIC_API_MODE=live` makes them hit `http://localhost:8000/api/v1` with **zero component-level code changes**.
- [ ] **WebSocket provider is connected** and at least 3 pages react to real-time events (dashboard, alerts, advisory).
- [ ] **Dark and light themes** both render correctly across all pages including the globe.
- [ ] `npm run dev` starts the frontend on port 3000 with no errors.
