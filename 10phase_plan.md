# Auralis — Frontend 10-Phase Execution Plan

> **Role:** Frontend & Mission Control Lead  
> **Brief:** [BRIEF_FRONTEND.md](./BRIEF_FRONTEND.md)  
> **Contract:** [INTERFACE_CONTRACT.md](./INTERFACE_CONTRACT.md) §1, §3, §4  
> **Constraint:** The existing layout, routes, theme system, and component structure are FINAL — extend, don't rewrite.

---

## Phase 1 — Contract Types (Foundation)
**Branch:** `feat/contract-types`  
**Duration:** ~1.5 hours  
**Depends on:** Nothing — this is day-one, first-thing work.

### What you're doing
Creating `types/contract.ts` — the TypeScript source of truth that mirrors every shape in [INTERFACE_CONTRACT.md §1](./INTERFACE_CONTRACT.md). This file becomes the single import every page and component uses. The existing `types/index.ts` stays untouched (pages still reference it); `contract.ts` lives alongside it.

### Deliverables
- `types/contract.ts` containing:
  - All 8 data interfaces: `TrackedObject`, `ConjunctionEvent`, `ShellRiskSnapshot`, `ManeuverProposal`, `NegotiationLogEntry`, `AgentStatus`, `Advisory`, `AuditLogEntry`
  - Request/response pairs: `CrisisInjectionRequest`, `CrisisInjectionResponse`, `DashboardSummary`
  - All 9 enums from §4: `ObjectType`, `ObjectStatus`, `RiskLevel`, `ConjunctionStatus`, `NegotiationStatus`, `AgentType`, `AgentState`, `CascadeTrend`, `AuditAction`
  - `WsMessage<T>` generic wrapper from §3.2
  - `PaginatedResponse<T>` helper (used by every list endpoint)
- Copy field names **verbatim** from the contract — zero renames, zero creative additions

### Definition of Done
- `npx tsc --noEmit` passes with the new file  
- Every field name in `contract.ts` matches INTERFACE_CONTRACT.md character-for-character

---

## Phase 2 — Mock API Module (Data Independence)
**Branch:** `feat/mock-api`  
**Duration:** ~2 hours  
**Depends on:** Phase 1 (needs the types)

### What you're doing
Creating `lib/mockApi.ts` — a set of async functions that return realistic hardcoded data conforming to the contract shapes. This is what lets you build every page *right now* without waiting for the backend or data person. Use the example JSON responses from INTERFACE_CONTRACT.md §3.1 as your seed data.

### Deliverables
- `lib/mockApi.ts` exporting 11 functions:
  - `getObjects()`, `getObjectById()` → paginated `TrackedObject[]`
  - `getConjunctions()`, `getConjunctionById()` → paginated `ConjunctionEvent[]` + embedded objects on detail
  - `getShells()` → `ShellRiskSnapshot[]` (at least 2 shells with full SIR projections)
  - `getManeuvers()` → paginated `ManeuverProposal[]` (at least 1 with full `negotiationLog`)
  - `getAgentStatuses()` → 6 agents with mixed states
  - `getAdvisories()` → at least 2 advisories (one `critical`, one `nominal`)
  - `getAuditLog()` → at least 5 audit entries across different `agentType`s
  - `getDashboardSummary()` → all summary counters and agent status chips
  - `injectCrisis()` → returns a `CrisisInjectionResponse`
- Mock data should tell a coherent story: ISS near-miss with COSMOS 2251 debris, maneuver negotiated, advisory generated

### Definition of Done
- Every function returns data that passes a TypeScript type-check against `types/contract.ts`
- Calling any function logs no errors in the console

---

## Phase 3 — API Switcher + Mock WebSocket (Dev Infrastructure)
**Branch:** `feat/api-switcher`  
**Duration:** ~1.5 hours  
**Depends on:** Phase 2 (needs mockApi)

### What you're doing
Building the plumbing that lets you flip between mock and live backends with a single env var. This is the last piece of infrastructure before you start wiring pages.

### Deliverables
- `lib/api.ts` — re-exports all functions from `lib/mockApi.ts` when `NEXT_PUBLIC_API_MODE=mock`, switches to real `fetch()` calls against `http://localhost:8000/api/v1` when `NEXT_PUBLIC_API_MODE=live`
- `lib/mockWs.ts` — a local event emitter that uses `setInterval` to dispatch fake `WsMessage<T>` events every few seconds:
  - `objects:updated` — shifts satellite positions slightly
  - `conjunction:updated` — ticks the Pc value
  - `agent:status` — cycles one agent between `idle` → `processing` → `idle`
  - `advisory:new` — emits a new advisory every ~30 seconds
- `.env.local` template with `NEXT_PUBLIC_API_MODE=mock` as default

### Definition of Done
- `npm run dev` starts with no errors in mock mode
- Setting `NEXT_PUBLIC_API_MODE=live` makes `lib/api.ts` target `localhost:8000` (will 404, but the fetch calls are correct)
- Mock WS events fire on a timer and are console-loggable

---

## Phase 4 — 3D Globe (Hero Visual)
**Branch:** `feat/globe`  
**Duration:** ~3 hours  
**Depends on:** Phase 2 (needs mock data for satellite positions)

### What you're doing
Adding the centrepiece demo visual: an interactive 3D WebGL globe showing orbiting satellites and debris. This is the first thing the audience sees.

### Deliverables
- `npm install globe.gl` (add dependency)
- `components/globe/GlobeView.tsx` — client-side rendered globe component:
  - Dark-themed Earth with atmospheric glow and city lights texture
  - Auto-rotation (slow, ~0.1°/s)
  - Mouse drag to rotate, scroll to zoom
- **Satellite points layer**: Each `TrackedObject` with `type: "satellite"` renders as a colored dot:
  - `"active"` → green
  - `"maneuvering"` → amber/pulsing
  - `"decayed"` → grey
- **Debris points layer**: `type: "debris"` and `"rocket_body"` as smaller grey/red dots
- **Conjunction arcs**: For each active `ConjunctionEvent`, draw an arc between primary and secondary objects:
  - `"nominal"` → green arc
  - `"elevated"` → amber arc
  - `"critical"` → red pulsing arc
- Position conversion: ECI (x, y, z) → geodetic (lat, lon, alt) for globe plotting

### Definition of Done
- Globe renders with mock satellite dots at plausible orbital positions
- Conjunction arcs visually connect the correct object pairs
- Responsive to resize, no WebGL crashes on mount/unmount

---

## Phase 5 — Command Center & Dashboard Wiring (Home Base)
**Branch:** `feat/wire-dashboard`  
**Duration:** ~2 hours  
**Depends on:** Phase 3 (needs api switcher) + Phase 4 (needs globe)

### What you're doing
Wiring the main dashboard — the page people land on after login. This is the mission-control overview showing live stats, the globe, agent heartbeats, and the alert ticker.

### Deliverables
- `/dashboard` page wired to:
  - `getDashboardSummary()` → populates all stat cards (tracked objects, active satellites, debris count, active/critical conjunctions, shells at risk)
  - Agent status chips → each of the 6 agents shows `agentType` + `state` with color coding (`idle` grey, `processing` blue, `alert` red, `error` red)
  - Mount `GlobeView` with a toggle to switch between globe and the existing card/list view
- LiveEventFeed wired to mock WebSocket events
- EarlyWarningSection wired to `getConjunctions({ riskLevel: "critical" })`

### Definition of Done
- Dashboard loads in < 2 seconds with mock data
- All 6 stat cards show real numbers from mock
- Globe and card view toggle works
- Agent chips reflect mock agent states

---

## Phase 6 — Core Route Wiring: Conjunctions, Objects, Alerts (Critical Path Pages)
**Branch:** `feat/wire-core-pages`  
**Duration:** ~3 hours  
**Depends on:** Phase 3

### What you're doing
Wiring the three pages that carry the demo narrative: conjunction events, tracked objects, and risk alerts. These pages must show real Pc values, TCA countdowns, and scientific notation.

### Deliverables
- **`/cases` (Conjunction Events)**:
  - Table listing: primary & secondary objects (resolve names via `getObjectById`), TCA as live countdown timer, miss distance (km), collision probability in scientific notation (e.g., `2.3 × 10⁻³`), `riskLevel` badge, `status` badge
  - Subscribe to `conjunction:created` and `conjunction:updated` WS events
- **`/cases/[id]` (Conjunction Detail)**:
  - Full detail view: both objects' orbital elements, maneuver proposal card (if linked), negotiation log timeline
  - "Approve Burn" button → calls maneuver approval endpoint
- **`/profiles` (Tracked Objects)**:
  - Paginated table: `noradId`, `name`, `type`, `altitude`, `shellId`, `status`, `lastUpdated`
  - Click-through to `/profiles/[id]` showing full `orbitalElements` and `covarianceUpperTriangle`
- **`/alerts` (Risk Alerts)**:
  - Filtered feed: `critical` and `elevated` conjunctions sorted by TCA (soonest first)
  - Subscribe to `conjunction:created` for real-time new alerts

### Definition of Done
- Conjunction Pc displays as `2.3 × 10⁻³`, not `0.0023`
- TCA shows as a live countdown ("T-14h 23m")
- Object detail pages render all Keplerian elements
- Risk alerts update in real-time from mock WS

---

## Phase 7 — Analytics, Advisory, Audit, Fuel Ledger (Supporting Pages)
**Branch:** `feat/wire-secondary-pages`  
**Duration:** ~2.5 hours  
**Depends on:** Phase 3

### What you're doing
Wiring the four supporting pages that complete the dashboard experience. These pages are important for the demo narrative but aren't on the critical path.

### Deliverables
- **`/analytics` (SIR Cascade Curves)**:
  - Fetch `getShells()`, for each shell render:
    - Recharts line chart using `projectionYears` (x-axis) vs `projectedS`, `projectedI`, `projectedR` (three lines)
    - R₀ display — highlight shells where `r0 > 1.0` in red with warning
    - `trend` indicator with directional arrow
  - Subscribe to `shell:updated` for live refresh after crisis injection
- **`/chat` (Advisory Feed)**:
  - Fetch `getAdvisories()`, render each as a chat-style bubble: `title` header, `body` text, `severity` color accent, `timestamp`
  - Subscribe to `advisory:new` for real-time new messages
- **`/audit` (Governance Log)**:
  - Fetch `getAuditLog()`, render as a vertical timeline
  - `agentType` badge on each entry, `action` label, `description` text
  - Filter dropdown by `agentType`
- **`/financial` (Fuel Ledger)**:
  - Fetch `getManeuvers({ negotiationStatus: "accepted" })`
  - Table: maneuvering object name, `deltaV.magnitude` (m/s), `fuelCost` (kg), `burnTime`, `rationale`
  - Running total Δv spent per operator

### Definition of Done
- SIR chart renders 3 colored lines (S=blue, I=red, R=green) with years on x-axis
- Advisory chat updates live from mock WS
- Audit log is filterable by agent type
- Fuel ledger shows aggregate Δv per operator

---

## Phase 8 — Crisis Injection UI (Demo Showstopper)
**Branch:** `feat/crisis-injection`  
**Duration:** ~2 hours  
**Depends on:** Phase 5 + Phase 7 (dashboard and analytics must be wired first)

### What you're doing
Building the button that makes the demo unforgettable: a "blow something up" button that injects a simulated catastrophic event and lets the audience watch the system react in real-time across every page.

### Deliverables
- Prominent "Inject Crisis" button on `/dashboard` (red, warning-styled)
- Modal on click with fields:
  - Crisis type dropdown: `"fragmentation"`, `"collision"`, `"asat"`
  - Altitude slider (200–2000 km, default 780 km)
  - Fragment count input (default 250)
  - Optional source object selector (from tracked objects list)
  - Label text field (e.g., "Simulated ASAT Test — 780 km")
- On submit → `injectCrisis()` from `lib/api.ts`
- Display `CrisisInjectionResponse` as a toast:
  - "Injected {count} fragments into {shellIds}. {conjunctionCount} new conjunctions detected."
- **Cascade animation on `crisis:injected` WS event:**
  - Globe: new debris dots appear as a burst
  - Dashboard stat cards: numbers spike
  - Alerts feed: new conjunction events stream in
  - Analytics: SIR curves shift (R₀ jumps above 1.0 for affected shell)

### Definition of Done
- Button → Modal → Submit → Toast → Visual cascade across at least 3 pages
- The audience can see the before/after difference within seconds

---

## Phase 9 — WebSocket Provider & Real-Time Notifications (System Nervous System)
**Branch:** `feat/realtime-provider`  
**Duration:** ~2 hours  
**Depends on:** Phase 3 (needs mockWs) + at least Phase 5 and Phase 6 done

### What you're doing
Creating the unified WebSocket provider that all pages subscribe to. Until now, each page may have had ad-hoc WS subscriptions — this phase consolidates them into a React context with a clean hook API.

### Deliverables
- `components/providers/WebSocketProvider.tsx`:
  - React context wrapping the app
  - Connects to mock emitter or `ws://localhost:8000/ws` based on `NEXT_PUBLIC_API_MODE`
  - Provides `useWebSocket(eventName, callback)` hook
  - Auto-reconnect with exponential backoff (for live mode)
- Wire into root `app/layout.tsx` (wraps all pages)
- Wire existing `NotificationCenter.tsx` to show toast alerts for:
  - `conjunction:created` (critical only) → red toast
  - `maneuver:resolved` → green toast
  - `advisory:new` → blue toast
  - `crisis:injected` → amber/warning toast

### Definition of Done
- At least 3 pages visually react to WebSocket events without page refresh
- Notification toasts appear in the navbar notification center
- Mock WS events fire on timer and all subscribed components update

---

## Phase 10 — Polish, Demo Flow Verification & Theme Audit (Ship It)
**Branch:** `feat/polish-demo`  
**Duration:** ~2 hours  
**Depends on:** All previous phases

### What you're doing
Final pass. Walk through the PRD §2 demo narrative end-to-end. Fix visual glitches, tighten animations, verify both dark and light themes, and confirm mock↔live switching works.

### Verification Checklist
- [ ] **Demo narrative flow**: Navigate from data ingestion → dashboard → globe → conjunction alert → negotiation detail → crisis inject → cascade → analytics → advisory → resolution
- [ ] **Scientific notation**: Pc values display as `2.3 × 10⁻³` everywhere, never as raw floats
- [ ] **TCA countdown**: Live countdown timers on conjunction cards tick in real-time
- [ ] **Globe**: Satellites move (or appear to move), conjunction arcs pulse for critical events
- [ ] **Crisis cascade**: Inject → visible spike across dashboard, alerts, analytics, globe
- [ ] **Dark theme**: All pages, including globe, render correctly in dark mode
- [ ] **Light theme**: All pages render correctly in light mode
- [ ] **Agent chips**: All 6 agents show on dashboard with correct state coloring
- [ ] **Mock→Live switch**: Changing `NEXT_PUBLIC_API_MODE` from `mock` to `live` changes fetch targets without any component code change
- [ ] **No console errors**: `npm run dev` + full page navigation produces zero errors
- [ ] **Build passes**: `npm run build` succeeds with no type errors

### Final Deliverables
- Any spacing/alignment/animation polish
- Remove any leftover `console.log` debug statements
- Update `types/index.ts` imports in pages that have been migrated to `types/contract.ts`
- Verify CONTRIBUTING.md AI guardrails are respected — no accidental layout changes

---

## Summary Timeline

| Phase | Task | Est. Hours | Dependencies |
|:---:|:---|:---:|:---|
| 1 | Contract Types | 1.5h | — |
| 2 | Mock API Module | 2h | Phase 1 |
| 3 | API Switcher + Mock WS | 1.5h | Phase 2 |
| 4 | 3D Globe | 3h | Phase 2 |
| 5 | Dashboard Wiring | 2h | Phase 3, 4 |
| 6 | Core Pages (Conjunctions, Objects, Alerts) | 3h | Phase 3 |
| 7 | Secondary Pages (Analytics, Chat, Audit, Fuel) | 2.5h | Phase 3 |
| 8 | Crisis Injection UI | 2h | Phase 5, 7 |
| 9 | WebSocket Provider & Notifications | 2h | Phase 3, 5, 6 |
| 10 | Polish & Demo Verification | 2h | All |
| | **Total** | **~21.5h** | |

> **Note:** Phases 4, 6, and 7 can run in parallel after Phase 3 is done.  
> Critical path: **1 → 2 → 3 → 5 → 8 → 10** (~13h)  
> Parallel track: **3 → 4** (globe) and **3 → 6 → 7** (page wiring) can overlap.
