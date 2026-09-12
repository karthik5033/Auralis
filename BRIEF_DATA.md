# Auralis — Data Brief

> **Owner:** Data person
> **References:** [PRD.md](./PRD.md) §3 (Scope), §4 (Agent Architecture — Epidemic Forecaster) · [INTERFACE_CONTRACT.md](./INTERFACE_CONTRACT.md) §1.1, §1.3, §2.2, §2.6, §4

---

## Your Slice

You own the scientific computation layer: fetching raw TLE data from CelesTrak, parsing it into `TrackedObject` records, running SGP4 orbit propagation to produce state vectors and Keplerian elements, optionally computing collision probability (Pc) utilities for the backend to call, building the epidemiological SIR cascade model over orbital shells, and packaging the output as the Epidemic Forecaster agent. Your code produces the foundational data that the other two people's code consumes — if your output doesn't match the shapes in INTERFACE_CONTRACT.md §1.1 and §1.3 exactly, nothing downstream works. You do **not** build the HTTP API, the dashboard, the maneuver negotiation, or the advisory agent — you hand your outputs to the Backend person via the agreed message contracts, and the Frontend person reads them through the API.

---

## Task List

Each task is one short-lived branch + PR.

### Group A — TLE Ingestion

- [ ] **A1. CelesTrak fetcher**
  Create `data/` directory. Write a module (`data/celestrak.py` or `data/celestrak.ts`) that fetches GP-element data from CelesTrak's public API. Use the bulk CSV or JSON endpoint (e.g., `https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=json`). Fetch both active satellites and debris catalogs.

  PRD §3 note: "Pull the GP-element bulk CSV/JSON. No need for CCSDS OMM or full CDM parsing."

- [ ] **A2. TLE parser → TrackedObject**
  Parse each GP element into a `TrackedObject` (INTERFACE_CONTRACT.md §1.1). Field mapping:

  | CelesTrak field | Contract field | Notes |
  |-----------------|---------------|-------|
  | `NORAD_CAT_ID` | `noradId` | Direct copy |
  | `OBJECT_NAME` | `name` | Direct copy |
  | `OBJECT_TYPE` | `type` | Map to `ObjectType` enum: `"PAYLOAD"` → `"satellite"`, `"DEBRIS"` → `"debris"`, `"ROCKET BODY"` → `"rocket_body"`, anything else → `"unknown"` |
  | (generated) | `id` | UUID v4, generated at parse time |
  | (derived) | `operatorId` | Assign to one of two simulated operators (e.g., `"op-001"`, `"op-002"`) for active satellites only, `null` for debris |
  | (computed by SGP4) | `position`, `velocity` | See task A3 |
  | (derived from state vector) | `orbitalElements` | See task A3 |
  | (computed) | `covarianceUpperTriangle` | See task A4 |
  | (derived from position) | `altitude` | `||position|| - R_earth` (6371 km) |
  | (derived from altitude) | `shellId` | Apply shell convention from §4: `{regime}_{altMin}_{altMax}`, 50 km bands for LEO |
  | TLE epoch | `epoch` | Convert to ISO 8601 UTC |
  | (now) | `lastUpdated` | Current timestamp |
  | (derived) | `status` | `"active"` for satellites, `"unknown"` for debris, use `ObjectStatus` enum |

- [ ] **A3. SGP4 propagation**
  Use an existing library:
  - **Python:** `sgp4` package (`from sgp4.api import Satrec`)
  - **JavaScript:** `satellite.js` (`import { propagate, twoline2satrec } from 'satellite.js'`)

  For each parsed TLE:
  1. Propagate to current time → ECI position `{x, y, z}` (km) and velocity `{vx, vy, vz}` (km/s).
  2. Derive Keplerian elements from the state vector: `semiMajorAxis`, `eccentricity`, `inclination`, `raan`, `argOfPerigee`, `meanAnomaly` — all matching the `orbitalElements` sub-interface in §1.1.
  3. Store the propagation epoch in `epoch`.

  PRD §3 note: "Use an existing library (satellite.js or Python sgp4). Don't hand-roll the propagator."

  PRD assumption: "We limit the screening window to 72 hours forward."

- [ ] **A4. Covariance estimation**
  Not all TLEs include covariance. Implement a fallback:
  - If CelesTrak provides covariance terms, use them.
  - Otherwise, assign default uncertainty: `σ_xx = 1.0 km², σ_yy = 0.25 km², σ_zz = 0.25 km², off-diagonals = 0.0`.
  - Package as `covarianceUpperTriangle: [σ_xx, σ_xy, σ_xz, σ_yy, σ_yz, σ_zz]` per §1.1.

  PRD assumption: "σ = 1 km in-track, 0.5 km cross-track, 0.5 km radial" — use these as the defaults.

- [ ] **A5. Catalog subset selector**
  For demo performance, select a subset of 500–2,000 objects concentrated in 2–3 orbital shells (e.g., LEO 400–500 km and LEO 750–850 km) rather than the full 30,000-object catalog.

  PRD assumption: "We demo with a curated subset (500–2,000 objects in a single orbital shell) that's large enough to look impressive but small enough to screen in real time."

### Group B — Collision Probability (utility for Backend)

- [ ] **B1. Foster-1992 Pc calculator**
  Implement the Foster-1992 short-encounter 2-D collision probability formula. Inputs:
  - Two `TrackedObject` records (position, velocity, covarianceUpperTriangle from §1.1)
  - Combined hard-body radius (default: 10 m for satellite-satellite, 1 m for satellite-debris)

  Returns: `collisionProbability: number` (dimensionless).

  Export this as a standalone function the Backend person's Risk Assessor can call:
  ```
  function computePc(primary: TrackedObject, secondary: TrackedObject, hardBodyRadius?: number): number
  ```

  PRD §3 note: "Preferred: Foster-1992 short-encounter 2-D Pc from combined position covariance. Acceptable if time is short: Monte Carlo sampling."

- [ ] **B2. Monte Carlo Pc fallback (if time is short)**
  If Foster-1992 proves too complex to implement correctly in time, implement Monte Carlo:
  1. Draw N=10,000 position samples from each object's covariance.
  2. Count overlaps within the hard-body radius.
  3. `Pc ≈ overlaps / N`.

  Same function signature as B1 — the Backend person doesn't care which method runs internally.

### Group C — SIR Cascade Model (Epidemic Forecaster Agent)

- [ ] **C1. Shell population counter**
  Given the catalog of `TrackedObject[]`, count objects per shell and classify into SIR compartments:
  - **S (Susceptible):** Active satellites + intact rocket bodies → `susceptibleCount`
  - **I (Infected):** Debris objects (collision-generated fragment clouds) → `infectedCount`
  - **R (Removed):** Decayed objects → `removedCount`

  Group by `shellId` using the convention from §4: `{regime}_{altMin}_{altMax}`, 50 km bands.

  Output the `ShellPopulationUpdatedPayload` from INTERFACE_CONTRACT.md §2.2:
  ```typescript
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

- [ ] **C2. SIR ODE solver**
  For each orbital shell, solve the compartmental ODE:
  ```
  dS/dt = -β·S·I / N
  dI/dt = +β·S·I / N - γ·I
  dR/dt = +γ·I
  ```
  Where:
  - `β` = collision rate parameter (proportional to debris density and relative velocity in the shell)
  - `γ` = decay rate (atmospheric drag — higher for lower shells, negligible for shells > 800 km)
  - `N` = total objects in the shell
  - `R₀ = β / γ` — if `R₀ > 1.0`, the shell is in runaway cascade (Kessler syndrome)

  Use a simple numerical integrator (Euler or RK4). Project forward over `projectionYears: [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50]`.

  PRD §3 note: "Compartmental ODE per altitude shell. Compute R₀ per shell. Use NASA breakup model fragment counts or a simple power-law approximation."

- [ ] **C3. ShellRiskSnapshot builder**
  Package the SIR results into `ShellRiskSnapshot` (INTERFACE_CONTRACT.md §1.3):

  ```typescript
  interface ShellRiskSnapshot {
    shellId: string;
    altitudeMin: number;
    altitudeMax: number;
    timestamp: string;
    susceptibleCount: number;
    infectedCount: number;
    removedCount: number;
    totalObjectCount: number;
    debrisDensity: number;           // objects per km³
    r0: number;                      // β / γ
    trend: CascadeTrend;             // "increasing" if R₀ > 1.0, "stable" if ≈ 1.0, "decreasing" if < 1.0
    projectionYears: number[];
    projectedS: number[];
    projectedI: number[];
    projectedR: number[];
  }
  ```

  Derive `trend` from R₀:
  - `R₀ > 1.05` → `"increasing"`
  - `0.95 ≤ R₀ ≤ 1.05` → `"stable"`
  - `R₀ < 0.95` → `"decreasing"`

  Derive `debrisDensity`: `infectedCount / shellVolume` where `shellVolume = (4/3)π(R_outer³ - R_inner³)`, `R = R_earth + altitude`.

- [ ] **C4. Epidemic Forecaster Agent**
  Package the SIR pipeline as the Epidemic Forecaster agent. It:
  1. Receives `"shell_population_updated"` from the Tracker (via the Backend's message bus, or as a direct function call — coordinate with Backend person on the integration point).
  2. Runs C1 → C2 → C3.
  3. Publishes `"cascade_forecast_complete"` → Advisory (INTERFACE_CONTRACT.md §2.6):

  ```typescript
  interface CascadeForecastCompletePayload {
    timestamp: string;
    shellSnapshots: ShellRiskSnapshot[];
    criticalShells: string[];          // shellIds where R₀ > 1.0
    overallTrend: CascadeTrend;
  }
  ```

  Also emits a WebSocket-ready `shell:updated` payload for each shell.

### Group D — Crisis Fragment Generation

- [ ] **D1. Breakup fragment generator**
  When a crisis is injected (the Backend will call this), generate synthetic `TrackedObject[]` records for the fragments:
  1. Input: altitude, source object (optional), fragment count.
  2. Scatter fragments in a cloud around the source altitude with random velocity perturbations (±0.1 km/s in each axis).
  3. Assign each fragment `type: "debris"`, `operatorId: null`, a unique `id`, and correct `shellId`.
  4. Output: array of `TrackedObject` records conforming to §1.1.

  After generation, the Tracker re-ingests these objects, which triggers Risk Assessor re-screening and Epidemic Forecaster re-computation.

---

## Contract Shapes You Produce

| Shape | Where you produce it | Consumer |
|-------|---------------------|----------|
| `TrackedObject[]` (§1.1) | TLE ingest + SGP4 propagation (A2–A3) | Backend → Tracker agent |
| `ShellPopulationUpdatedPayload` (§2.2) | Shell population counter (C1) | Backend → Epidemic Forecaster trigger |
| `ShellRiskSnapshot[]` (§1.3) | SIR model output (C3) | Backend → serves via `GET /api/v1/shells` |
| `CascadeForecastCompletePayload` (§2.6) | Epidemic Forecaster agent (C4) | Backend → Advisory agent |
| `computePc()` function | Pc calculator (B1/B2) | Backend → Risk Assessor calls it |
| Synthetic `TrackedObject[]` for crisis | Fragment generator (D1) | Backend → crisis injection handler |

## Contract Shapes You Consume

| Shape | Source |
|-------|--------|
| Raw GP-element JSON | CelesTrak API (external) |
| `CrisisInjectionRequest` fields (altitude, fragmentCount) | Backend passes these to your fragment generator |

---

## What NOT to Touch

| Area | Owner | Your boundary |
|------|-------|---------------|
| `app/`, `components/`, `public/`, `types/` | Frontend person | Do not modify any frontend file. |
| `backend/` (once it exists) | Backend person | Do not modify agent orchestration, API routes, or WebSocket logic. You provide modules that the backend imports/calls. |
| `lib/mockData.ts`, `lib/mockApi.ts` | Frontend person | Do not modify mock data. The frontend mocks are independent of your real data pipeline. |
| `package.json`, `next.config.ts`, `tsconfig.json` | Frontend person | Your dependencies go in `data/requirements.txt` or `data/package.json`. |
| Maneuver Negotiation logic | Backend person | You don't decide who maneuvers — you just provide the Pc and state vectors. |
| Advisory generation | Backend person | You don't write narratives — you provide `ShellRiskSnapshot` data. |
| `PRD.md`, `INTERFACE_CONTRACT.md` | Shared docs | Do not modify without team agreement. |

---

## Integration Points with Backend Person

You and the Backend person need to agree on **one thing**: how your code gets called.

**Option A — Python module imported by Python backend:**
Your code lives in `data/` as a Python package. The Backend person's FastAPI app imports it:
```python
from data.celestrak import fetch_catalog
from data.propagator import propagate_all
from data.pc import compute_pc
from data.sir_model import run_epidemic_forecast
```

**Option B — Node module imported by Node backend:**
Your code lives in `data/` as a TypeScript module. The Backend person's Express app imports it:
```typescript
import { fetchCatalog } from '../data/celestrak';
import { propagateAll } from '../data/propagator';
import { computePc } from '../data/pc';
import { runEpidemicForecast } from '../data/sirModel';
```

**Option C — Subprocess / HTTP microservice:**
Your code runs as a separate process. The Backend calls it via local HTTP or subprocess spawn.

Decide with the Backend person in the first 30 minutes. The interface contract shapes are the same regardless — only the transport changes.

---

## Definition of Done

Checked against PRD.md §5 (Success Criteria):

- [ ] **TLE ingest produces `TrackedObject[]`** with all fields from §1.1 populated — `position`, `velocity`, `orbitalElements`, `covarianceUpperTriangle`, `altitude`, `shellId` — verified by serializing one object and comparing field-by-field against the contract's example JSON in §3.1.
- [ ] **SGP4 propagation runs on ≥ 500 objects** in under 5 seconds — fast enough for live demo. Maps to PRD criterion #1 ("object counts tick up as data loads").
- [ ] **`computePc()` returns a dimensionless probability** (e.g., `2.3e-3`), not a distance or a label. Maps to PRD criterion #3 ("an actual probability number, not just a distance threshold").
- [ ] **SIR model produces `ShellRiskSnapshot`** with all fields — `r0`, `trend`, `projectedS/I/R` arrays — for at least 2 shells. Maps to PRD criterion #4 ("SIR curve shifts visibly upward" after crisis) and nice-to-have #8 ("R₀ per shell displayed").
- [ ] **R₀ > 1.0 for at least one shell** (LEO 750–850 km is the realistic candidate) in the pre-crisis baseline, and R₀ increases measurably after crisis injection.
- [ ] **Fragment generator produces valid `TrackedObject[]`** records (type `"debris"`, correct `shellId`, unique `id`s) that, when re-ingested by the Tracker, produce new conjunction events. Maps to PRD criterion #4.
- [ ] **All output shapes pass a schema validator** against the TypeScript interfaces in INTERFACE_CONTRACT.md §1 — no missing fields, no extra fields, no wrong types.
- [ ] Code runs with a single command (`python -m data.main` or `npm run data`) and can be imported as a library by the Backend person's code.
