# Auralis — Product Requirements Document

**Version:** 1.0  
**Date:** 2026-09-12  
**Team size:** 3  
**Timeline:** Hackathon (fixed, short)

---

## 1. Problem & Why It Matters

There are roughly 30,000 tracked objects in Earth orbit and an estimated million-plus fragments too small to catalogue but large enough to destroy a satellite. Every one of those objects is moving at ≈ 7.5 km/s, which means even a paint-fleck collision delivers the energy of a hand grenade. Today, satellite operators receive conjunction warnings from the 18th Space Defense Squadron as flat-file CDMs (Conjunction Data Messages), then manually triage them in spreadsheets and ad-hoc scripts. There is no unified dashboard, no automated collision-probability computation from raw TLEs, and no forward-looking model that answers "if this debris cloud keeps growing, when does Low Earth Orbit become unusable?" Auralis exists to close all three gaps in a single mission-control interface: ingest the tracking data, compute the risk, forecast the cascade, and — when two active satellites are on a collision course — let software agents negotiate who dodges instead of making a human guess under time pressure.

---

## 2. Target User & Demo Narrative

### Who is the user?

A **satellite operator** sitting in a small-constellation operations center — someone responsible for keeping their spacecraft healthy, avoiding collisions, and reporting close approaches to management. They are technically literate but don't write orbital-mechanics code; they want a dashboard that translates TLEs and covariance matrices into plain-language risk decisions.

### Demo narrative, start to finish

| Step | What the audience sees | What's happening under the hood |
|------|------------------------|-------------------------------|
| **1. Ingest** | Operator opens the Command Center. The Data Ingestion page shows a live TLE feed pulling from CelesTrak. Object counts tick up as data loads. | The **Tracker Agent** fetches the latest GP-element sets, parses them, and stores them. SGP4 propagation runs on each object to produce ephemerides for the screening window (default: 72 hours forward). |
| **2. Screen** | The dashboard populates with tracked objects on the Object Graph — satellites and debris nodes connected by proximity edges. Stat cards show total objects, active conjunctions, and a system-wide risk gauge. | The **Risk Assessor Agent** performs all-on-all conjunction screening using a configurable miss-distance threshold (e.g., 5 km pre-filter) and then computes collision probability (Pc) for every pair that passes the filter, using position uncertainty covariance. |
| **3. Alert** | A high-Pc conjunction event surfaces on the Risk Alerts page — two objects flagged red, TCA (Time of Closest Approach) counting down. A notification pops in the top bar. | The Risk Assessor promotes events whose Pc exceeds the alert threshold (e.g., 1 × 10⁻⁴) into the Conjunction Events list and fires a real-time notification. |
| **4. Forecast** | Operator navigates to Analytics & Trends. A debris-growth curve shows "Susceptible → Infected → Removed" populations per orbital shell over a 50-year horizon. One shell is blinking orange — its R₀ has crossed 1.0, indicating runaway cascade risk. | The **Epidemic Forecaster Agent** models each altitude shell as an SIR compartment: collision-generated fragments are "infections," atmospheric drag decay is "recovery," and R₀ per shell tells you whether fragments breed faster than they deorbit. |
| **5. Crisis injection** | The presenter triggers a simulated fragmentation event (e.g., an ASAT test or accidental explosion). Debris count spikes. New conjunction events cascade across multiple operators' satellites. | A burst of synthetic fragments is injected into the tracked-object catalog. The Tracker re-propagates, the Risk Assessor re-screens, the Forecaster re-runs SIR. |
| **6. Negotiate** | Two active satellites from different operators are now on a collision course. The Advisory page narrates in plain English: "Operator A's fuel margin is higher; recommending Operator A maneuvers. Operator B acknowledges." The Fuel Ledger page logs Δv cost. | The **Maneuver Negotiation Agent** runs an auction/bargaining protocol: each simulated operator reports remaining Δv budget, mission priority, and maneuver cost. The agent assigns the burn to the lower-cost mover. Results are logged to the Audit & Governance page. |
| **7. Resolve** | The conjunction event card on the dashboard turns green — "Mitigated." The advisory agent posts a plain-language summary: "Collision probability reduced from 2.3 × 10⁻³ to below threshold after Operator A's prograde burn of 0.4 m/s." | The **Advisory Agent** synthesizes outputs from all other agents into a human-readable narrative. The **Anomaly Agent** (if implemented) cross-checks for unexpected changes in any object's orbit that weren't commanded maneuvers. |

---

## 3. Scope

### In-scope for this hackathon

| Feature | Notes / acceptable simplification |
|---------|-----------------------------------|
| **TLE ingestion from CelesTrak** | Pull the GP-element bulk CSV/JSON. No need for CCSDS OMM or full CDM parsing. |
| **SGP4 orbit propagation** | Use an existing library (`satellite.js` or Python `sgp4`). Don't hand-roll the propagator. |
| **Conjunction screening** | Brute-force all-on-all with a distance pre-filter is fine for demo-scale catalogs (< 5,000 objects). No need for a spatial index or Hernando-Ayuso smart-sieve. |
| **Collision probability (Pc)** | **Preferred:** Foster-1992 short-encounter 2-D Pc from combined position covariance. **Acceptable if time is short:** Monte Carlo sampling — draw N position samples from each object's covariance, count overlaps, Pc ≈ overlaps / N. Either way, the demo must show an actual probability number, not just a distance threshold. |
| **SIR Kessler cascade model** | Compartmental ODE per altitude shell. "Susceptible" = intact objects, "Infected" = fragment-generating collisions, "Removed" = decayed objects. Compute R₀ per shell. Use NASA breakup model fragment counts or a simple power-law approximation. |
| **Maneuver negotiation** | Two simulated operators. Auction rule: lowest Δv-cost-to-mission bidder maneuvers. Log the decision and fuel expenditure. No need for full game-theoretic equilibrium. |
| **Advisory agent** | Takes structured output from other agents, renders a plain-language paragraph. Can be prompt-engineered LLM or template-based string construction. |
| **Live crisis injection** | A button or API call that spawns a synthetic fragmentation event mid-demo and lets the audience watch the system react. |
| **Frontend dashboard** | Already built — Command Center, Data Ingestion, Advisory (chat), Object Graph, Analytics, Conjunction Events, Tracked Objects, Risk Alerts, Fuel Ledger, Audit & Governance, Settings. Dark/light theme supported. |

### Explicitly out-of-scope

| Item | Why |
|------|-----|
| Real-time tracking from radar/telescope feeds | We use pre-computed TLEs, not sensor data. |
| Full Mahalanobis-distance Pc with 3-D encounter geometry | Foster-1992 2-D or Monte Carlo is sufficient for demo fidelity. |
| Multi-impulse trajectory optimization | A single impulsive Δv maneuver is enough to show the negotiation concept. |
| Ground-station pass scheduling | Interesting but orthogonal to the collision-risk story. |
| User authentication against a real identity provider | The existing mock auth with role selection (Operator, Flight Dynamics Lead, Mission Director, Admin) is sufficient. |
| Mobile / responsive layout polish | Desktop-first demo. |
| Persistent database | In-memory or file-based mock data is fine. No need for Postgres/Mongo. |
| Internationalization | English only. |
| Production deployment / CI-CD | Local `next dev` or a single static deploy is sufficient. |

---

## 4. Agent Architecture

Six agents, each with a single well-defined job. The first four are **must-have** for the demo to tell a coherent story. The last two are **nice-to-have** that elevate the demo if time allows.

| # | Agent | Job (one line) | Priority |
|---|-------|----------------|----------|
| 1 | **Tracker** | Ingests TLEs from CelesTrak, parses them, runs SGP4 propagation, and maintains the current state vector + covariance for every tracked object. | **Must-have** |
| 2 | **Risk Assessor** | Screens object pairs for close approach, computes collision probability (Pc) for each conjunction, and promotes high-Pc events to the alert queue. | **Must-have** |
| 3 | **Epidemic Forecaster** | Models each orbital shell as an SIR compartment, computes R₀ for cascade risk, and projects debris population growth over a configurable time horizon. | **Must-have** |
| 4 | **Maneuver Negotiation** | When two active satellites are on a collision course, runs an auction/bargaining protocol between their simulated operators to decide who maneuvers, then logs the decision and Δv cost. | **Must-have** |
| 5 | **Anomaly** | Monitors the object catalog for unexpected orbit changes (Δa, Δe, Δi exceeding a threshold between successive TLE epochs) that weren't tagged as commanded maneuvers. Flags potential breakups or unannounced station-keeping. | Nice-to-have |
| 6 | **Advisory** | Consumes structured outputs from all other agents and produces a plain-language narrative summary suitable for a non-technical stakeholder or the chat/advisory UI. | Nice-to-have (but strongly recommended — it's the "wow" moment for judges) |

> **Assumption:** Agents communicate through an internal event bus or shared state, not a public API. The orchestration model (sequential pipeline vs. pub-sub) is an implementation decision left to the team. The PRD does not prescribe it.

### Agent data flow

```
CelesTrak TLEs
      │
      ▼
  ┌──────────┐
  │ Tracker   │──state vectors + covariance──┐
  └──────────┘                               │
      │                                      ▼
      │                              ┌───────────────┐
      │                              │ Risk Assessor  │
      │                              └───────┬───────┘
      │                                      │
      │                          high-Pc events│
      │                                      ▼
      │                              ┌───────────────────┐
      │                              │ Maneuver Negotiation│
      │                              └───────┬───────────┘
      │                                      │
      ▼                                      ▼
┌───────────────────┐              ┌──────────────┐
│ Epidemic Forecaster│              │   Anomaly     │
└───────┬───────────┘              └──────┬───────┘
        │                                 │
        └──────────┬──────────────────────┘
                   ▼
            ┌────────────┐
            │  Advisory   │──plain-language summary──▶ UI
            └────────────┘
```

---

## 5. Success Criteria

These are the specific, observable things that must work during the live demo for it to land with judges.

### Must-demonstrate (all of these)

| # | Criterion | How the judge knows it works |
|---|-----------|------------------------------|
| 1 | **Live TLE ingest** | The Data Ingestion page shows real CelesTrak data loading, with object count updating in real time. |
| 2 | **Orbit propagation produces visible trajectories** | The Object Graph or Command Center shows propagated positions — objects are not just static dots, they move or have projected paths. |
| 3 | **Collision probability is a real number, not a flag** | At least one Conjunction Event card shows a Pc value (e.g., "2.3 × 10⁻³"), not just "HIGH / MEDIUM / LOW." |
| 4 | **Crisis injection triggers a visible cascade** | The presenter clicks a button. Debris count spikes. New conjunction events appear. The Analytics & Trends SIR curve shifts visibly upward. The audience can see the system reacting, not just a pre-canned animation. |
| 5 | **Two agents negotiate a maneuver** | The Maneuver Negotiation produces a logged decision: "Operator A maneuvers because [reason]." The Fuel Ledger shows the Δv debit. The conjunction event card transitions to "Mitigated." |
| 6 | **Plain-language summary** | The Advisory page (or a chat bubble) narrates the crisis → assessment → negotiation → resolution arc in English a non-specialist can follow. |

### Nice-to-have (differentiators if time allows)

| # | Criterion | Impact |
|---|-----------|--------|
| 7 | **Anomaly detection flags an unannounced orbit change** | Shows the system can distinguish a commanded maneuver from a breakup — adds realism. |
| 8 | **R₀ per shell displayed on the Analytics page** | Judges see the epidemiological metaphor visualized — a unique angle most competitors won't have. |
| 9 | **Role-based views** | Switching between Operator, Flight Dynamics Lead, and Mission Director roles changes which data/actions are visible — shows access-control thinking. |
| 10 | **Real-time agent status indicators** | Small status chips on the dashboard showing each agent's state (idle / processing / alert) — makes the multi-agent architecture tangible. |

---

## Assumptions & Open Questions

> These are noted here rather than resolved in code, per the product-manager-only constraint.

1. **Covariance data availability.** CelesTrak GP elements include some covariance terms, but not all objects have them. *Assumption:* We'll use real covariance where available and fall back to a configurable default uncertainty (e.g., σ = 1 km in-track, 0.5 km cross-track, 0.5 km radial) for objects without covariance.

2. **SGP4 vs. high-fidelity propagation.** SGP4 is the only feasible option for a hackathon, but its accuracy degrades beyond ~72 hours. *Assumption:* We limit the screening window to 72 hours forward and note this limitation in the UI.

3. **Fuel Ledger page scope.** The existing frontend has a "Fuel Ledger" page (mapped from "Financial Links"). *Assumption:* This page tracks simulated Δv expenditure per operator — it does not model real fuel costs or currency. If the team judges this as scope creep, the page can ship with mock data and a "coming soon" note.

4. **Number of objects in demo.** Running all-on-all screening on the full 30,000-object catalog is computationally expensive in-browser. *Assumption:* We demo with a curated subset (500–2,000 objects in a single orbital shell) that's large enough to look impressive but small enough to screen in real time.

5. **Advisory agent implementation.** "LLM-powered" vs. "template string" is a team decision. *Assumption:* If an LLM API is available and latency is acceptable (< 3 seconds), use it. Otherwise, template-based construction with Mustache-style slots is a perfectly acceptable fallback — the demo value is in the *content* of the summary, not in proving it's AI-generated.

---

## Appendix: Frontend → Agent Mapping

How each existing frontend route connects to backend agents.

| Route | Page Name | Primary Agent(s) |
|-------|-----------|-------------------|
| `/dashboard` | Command Center | All (aggregated summary) |
| `/data-ingestion` | Data Ingestion | Tracker |
| `/chat` | Advisory | Advisory |
| `/network` | Object Graph | Tracker + Risk Assessor |
| `/analytics` | Analytics & Trends | Epidemic Forecaster |
| `/cases` | Conjunction Events | Risk Assessor |
| `/profiles` | Tracked Objects | Tracker |
| `/alerts` | Risk Alerts | Risk Assessor + Anomaly |
| `/financial` | Fuel Ledger | Maneuver Negotiation |
| `/audit` | Audit & Governance | All (decision log) |
| `/settings` | Settings | — (config only) |
