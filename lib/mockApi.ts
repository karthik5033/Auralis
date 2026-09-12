/**
 * Auralis Mock API Module
 *
 * Provides realistic, strongly-typed mock responses conforming strictly to INTERFACE_CONTRACT.md.
 * Allows full frontend operation and offline testing without live backend dependencies.
 *
 * Seed data reflects the canonical demo narrative:
 * - ISS (ZARYA) near-miss with COSMOS 2251 debris fragment
 * - Autonomous multi-agent negotiation between simulated operators
 * - SIR epidemic cascade dynamics across 50 km LEO altitude shells
 * - Natural language advisory generation and immutable audit ledgering
 *
 * @see INTERFACE_CONTRACT.md §3.1, §5
 */

import type {
  TrackedObject,
  ConjunctionEvent,
  ShellRiskSnapshot,
  ManeuverProposal,
  AgentStatus,
  Advisory,
  AuditLogEntry,
  DashboardSummary,
  ConjunctionDetailResponse,
  AgentsStatusResponse,
  ShellsResponse,
  CrisisInjectionRequest,
  CrisisInjectionResponse,
  PaginatedResponse,
  ObjectsQueryParams,
  ConjunctionsQueryParams,
  ManeuversQueryParams,
  AdvisoriesQueryParams,
  AuditQueryParams,
} from '@/types/contract';

import curatedCatalog from '@/data/fixtures/parsed-tracked-objects.json';

// ============================================================================
// Seed Data: Tracked Objects
// ============================================================================

const baseDemoObjects: TrackedObject[] = [
  {
    id: "a1b2c3d4-5678-9abc-def0-111111111111",
    noradId: 25544,
    name: "ISS (ZARYA)",
    type: "satellite",
    operatorId: "op-001",
    position: { x: -2354.12, y: 4872.33, z: 3941.07 },
    velocity: { vx: -5.732, vy: -3.846, vz: 2.918 },
    orbitalElements: {
      semiMajorAxis: 6793.0,
      eccentricity: 0.0001,
      inclination: 51.6,
      raan: 247.5,
      argOfPerigee: 34.2,
      meanAnomaly: 120.8,
    },
    covarianceUpperTriangle: [1.0, 0.0, 0.0, 0.5, 0.0, 0.5],
    altitude: 415.0,
    shellId: "LEO_400_450",
    epoch: "2026-09-12T12:00:00Z",
    lastUpdated: "2026-09-12T13:00:00Z",
    status: "active",
  },
  {
    id: "b2c3d4e5-6789-abcd-ef01-222222222222",
    noradId: 34454,
    name: "COSMOS 2251 DEB",
    type: "debris",
    operatorId: null,
    position: { x: -2354.38, y: 4872.55, z: 3940.85 },
    velocity: { vx: -7.142, vy: 2.115, vz: -1.042 },
    orbitalElements: {
      semiMajorAxis: 6796.2,
      eccentricity: 0.0024,
      inclination: 74.0,
      raan: 112.4,
      argOfPerigee: 88.7,
      meanAnomaly: 215.3,
    },
    covarianceUpperTriangle: [3.2, 0.1, 0.2, 2.8, 0.3, 3.0],
    altitude: 418.2,
    shellId: "LEO_400_450",
    epoch: "2026-09-12T12:00:00Z",
    lastUpdated: "2026-09-12T13:00:00Z",
    status: "active",
  },
  {
    id: "c3d4e5f6-789a-bcde-f012-333333333333",
    noradId: 53123,
    name: "STARLINK-31042",
    type: "satellite",
    operatorId: "op-002",
    position: { x: 3412.8, y: -4521.1, z: 4102.5 },
    velocity: { vx: 4.125, vy: 5.612, vz: 1.204 },
    orbitalElements: {
      semiMajorAxis: 6918.0,
      eccentricity: 0.0002,
      inclination: 53.2,
      raan: 310.8,
      argOfPerigee: 12.4,
      meanAnomaly: 84.1,
    },
    covarianceUpperTriangle: [0.8, 0.0, 0.0, 0.4, 0.0, 0.4],
    altitude: 540.0,
    shellId: "LEO_500_550",
    epoch: "2026-09-12T12:00:00Z",
    lastUpdated: "2026-09-12T13:00:00Z",
    status: "active",
  },
  {
    id: "d4e5f6a7-89ab-cdef-0123-444444444444",
    noradId: 30421,
    name: "FENGYUN 1C DEB",
    type: "debris",
    operatorId: null,
    position: { x: 1205.4, y: 5940.2, z: -3820.1 },
    velocity: { vx: -6.412, vy: 1.842, vz: 3.512 },
    orbitalElements: {
      semiMajorAxis: 7190.4,
      eccentricity: 0.0152,
      inclination: 98.6,
      raan: 184.2,
      argOfPerigee: 241.0,
      meanAnomaly: 45.6,
    },
    covarianceUpperTriangle: [4.5, 0.5, 0.3, 4.1, 0.2, 4.8],
    altitude: 812.4,
    shellId: "LEO_800_850",
    epoch: "2026-09-12T12:00:00Z",
    lastUpdated: "2026-09-12T13:00:00Z",
    status: "active",
  },
  {
    id: "e5f6a7b8-9abc-def0-1234-555555555555",
    noradId: 33591,
    name: "NOAA 19",
    type: "satellite",
    operatorId: "op-003",
    position: { x: 1206.1, y: 5939.5, z: -3819.4 },
    velocity: { vx: -6.398, vy: 1.865, vz: 3.490 },
    orbitalElements: {
      semiMajorAxis: 7186.0,
      eccentricity: 0.0012,
      inclination: 98.7,
      raan: 184.0,
      argOfPerigee: 239.5,
      meanAnomaly: 46.1,
    },
    covarianceUpperTriangle: [1.2, 0.0, 0.1, 0.8, 0.0, 0.9],
    altitude: 808.0,
    shellId: "LEO_800_850",
    epoch: "2026-09-12T12:00:00Z",
    lastUpdated: "2026-09-12T13:00:00Z",
    status: "active",
  },
  {
    id: "f6a7b8c9-abcd-ef01-2345-666666666666",
    noradId: 25941,
    name: "CZ-4B R/B",
    type: "rocket_body",
    operatorId: null,
    position: { x: 4210.3, y: 3105.8, z: 4910.2 },
    velocity: { vx: -3.812, vy: 6.120, vz: -1.410 },
    orbitalElements: {
      semiMajorAxis: 7153.0,
      eccentricity: 0.0051,
      inclination: 98.2,
      raan: 87.5,
      argOfPerigee: 154.2,
      meanAnomaly: 301.8,
    },
    covarianceUpperTriangle: [2.1, 0.2, 0.1, 1.9, 0.1, 2.0],
    altitude: 775.0,
    shellId: "LEO_750_800",
    epoch: "2026-09-12T12:00:00Z",
    lastUpdated: "2026-09-12T13:00:00Z",
    status: "active",
  },
  {
    id: "a7b8c9d0-bcde-f012-3456-777777777777",
    noradId: 48274,
    name: "TIANGONG (CSS)",
    type: "satellite",
    operatorId: "op-004",
    position: { x: -3120.4, y: -5210.8, z: 2840.1 },
    velocity: { vx: 5.890, vy: -3.120, vz: 3.420 },
    orbitalElements: {
      semiMajorAxis: 6763.0,
      eccentricity: 0.0003,
      inclination: 41.5,
      raan: 142.1,
      argOfPerigee: 68.3,
      meanAnomaly: 198.4,
    },
    covarianceUpperTriangle: [0.9, 0.0, 0.0, 0.5, 0.0, 0.5],
    altitude: 385.0,
    shellId: "LEO_350_400",
    epoch: "2026-09-12T12:00:00Z",
    lastUpdated: "2026-09-12T13:00:00Z",
    status: "active",
  },
  {
    id: "b8c9d0e1-cdef-0123-4567-888888888888",
    noradId: 27386,
    name: "ENVISAT",
    type: "debris",
    operatorId: null,
    position: { x: -5120.5, y: 2410.2, z: 4620.8 },
    velocity: { vx: -2.140, vy: -6.890, vz: 1.950 },
    orbitalElements: {
      semiMajorAxis: 7146.0,
      eccentricity: 0.0001,
      inclination: 98.4,
      raan: 215.6,
      argOfPerigee: 92.1,
      meanAnomaly: 110.5,
    },
    covarianceUpperTriangle: [2.5, 0.3, 0.2, 2.2, 0.1, 2.4],
    altitude: 768.0,
    shellId: "LEO_750_800",
    epoch: "2026-09-12T12:00:00Z",
    lastUpdated: "2026-09-12T13:00:00Z",
    status: "active",
  },
  {
    id: "c9d0e1f2-def0-1234-5678-999999999999",
    noradId: 45142,
    name: "ONEWEB-0142",
    type: "satellite",
    operatorId: "op-005",
    position: { x: 2140.8, y: -6412.5, z: 3812.1 },
    velocity: { vx: 5.412, vy: 2.180, vz: 4.310 },
    orbitalElements: {
      semiMajorAxis: 7573.0,
      eccentricity: 0.0011,
      inclination: 87.9,
      raan: 35.4,
      argOfPerigee: 180.2,
      meanAnomaly: 72.8,
    },
    covarianceUpperTriangle: [1.1, 0.1, 0.0, 0.7, 0.0, 0.8],
    altitude: 1195.0,
    shellId: "LEO_1150_1200",
    epoch: "2026-09-12T12:00:00Z",
    lastUpdated: "2026-09-12T13:00:00Z",
    status: "active",
  },
  {
    id: "d0e1f2a3-ef01-2345-6789-000000000000",
    noradId: 22285,
    name: "SL-16 R/B DEB",
    type: "debris",
    operatorId: null,
    position: { x: -3820.1, y: 5120.4, z: -4120.5 },
    velocity: { vx: 4.810, vy: 4.120, vz: 3.890 },
    orbitalElements: {
      semiMajorAxis: 7208.0,
      eccentricity: 0.0084,
      inclination: 71.0,
      raan: 298.5,
      argOfPerigee: 310.2,
      meanAnomaly: 154.0,
    },
    covarianceUpperTriangle: [3.8, 0.4, 0.3, 3.5, 0.2, 3.6],
    altitude: 830.0,
    shellId: "LEO_800_850",
    epoch: "2026-09-12T12:00:00Z",
    lastUpdated: "2026-09-12T13:00:00Z",
    status: "active",
  },
];

// Combine base demo objects with curated CelesTrak catalog (avoiding duplicate NORAD IDs)
const existingNoradIds = new Set(baseDemoObjects.map((o) => o.noradId));
const filteredCurated = (curatedCatalog as TrackedObject[]).filter(
  (o) => !existingNoradIds.has(o.noradId)
);

export const mockObjects: TrackedObject[] = [...baseDemoObjects, ...filteredCurated];

// ============================================================================
// Seed Data: Conjunction Events
// ============================================================================

export const mockConjunctions: ConjunctionEvent[] = [
  {
    id: "ce-9f8e7d6c-5b4a-3210-fedc-ba9876543210",
    primaryObjectId: "a1b2c3d4-5678-9abc-def0-111111111111", // ISS (ZARYA)
    secondaryObjectId: "b2c3d4e5-6789-abcd-ef01-222222222222", // COSMOS 2251 DEB
    tca: "2026-09-13T08:42:17Z",
    missDistance: 0.347,
    relativeVelocity: 14.2,
    collisionProbability: 2.3e-3,
    maxCollisionProbability: 2.3e-3,
    riskLevel: "critical",
    status: "active",
    screeningWindowStart: "2026-09-12T12:00:00Z",
    screeningWindowEnd: "2026-09-15T12:00:00Z",
    maneuverProposalId: "mp-11223344-5566-7788-99aa-bbccddeeff00",
    createdAt: "2026-09-12T12:15:00Z",
    updatedAt: "2026-09-12T13:05:02Z",
  },
  {
    id: "ce-8e7d6c5b-4a32-10fe-dcba-987654321098",
    primaryObjectId: "e5f6a7b8-9abc-def0-1234-555555555555", // NOAA 19
    secondaryObjectId: "d4e5f6a7-89ab-cdef-0123-444444444444", // FENGYUN 1C DEB
    tca: "2026-09-13T14:18:42Z",
    missDistance: 1.12,
    relativeVelocity: 12.8,
    collisionProbability: 4.8e-4,
    maxCollisionProbability: 5.1e-4,
    riskLevel: "elevated",
    status: "monitoring",
    screeningWindowStart: "2026-09-12T12:00:00Z",
    screeningWindowEnd: "2026-09-15T12:00:00Z",
    maneuverProposalId: null,
    createdAt: "2026-09-12T12:30:00Z",
    updatedAt: "2026-09-12T13:00:00Z",
  },
  {
    id: "ce-7d6c5b4a-3210-fedc-ba98-765432109876",
    primaryObjectId: "c3d4e5f6-789a-bcde-f012-333333333333", // STARLINK-31042
    secondaryObjectId: "f6a7b8c9-abcd-ef01-2345-666666666666", // CZ-4B R/B
    tca: "2026-09-14T02:11:05Z",
    missDistance: 8.4,
    relativeVelocity: 10.5,
    collisionProbability: 1.2e-6,
    maxCollisionProbability: 1.5e-6,
    riskLevel: "nominal",
    status: "active",
    screeningWindowStart: "2026-09-12T12:00:00Z",
    screeningWindowEnd: "2026-09-15T12:00:00Z",
    maneuverProposalId: null,
    createdAt: "2026-09-12T12:45:00Z",
    updatedAt: "2026-09-12T13:00:00Z",
  },
  {
    id: "ce-6c5b4a32-10fe-dcba-9876-543210987654",
    primaryObjectId: "a7b8c9d0-bcde-f012-3456-777777777777", // TIANGONG (CSS)
    secondaryObjectId: "d0e1f2a3-ef01-2345-6789-000000000000", // SL-16 R/B DEB
    tca: "2026-09-12T18:00:00Z",
    missDistance: 0.28,
    relativeVelocity: 13.9,
    collisionProbability: 3.4e-3,
    maxCollisionProbability: 3.4e-3,
    riskLevel: "critical",
    status: "mitigated",
    screeningWindowStart: "2026-09-11T12:00:00Z",
    screeningWindowEnd: "2026-09-14T12:00:00Z",
    maneuverProposalId: "mp-22334455-6677-8899-aabb-ccddeeff0011",
    createdAt: "2026-09-11T16:00:00Z",
    updatedAt: "2026-09-12T11:00:00Z",
  },
  {
    id: "ce-5b4a3210-fedc-ba98-7654-321098765432",
    primaryObjectId: "b8c9d0e1-cdef-0123-4567-888888888888", // ENVISAT
    secondaryObjectId: "b2c3d4e5-6789-abcd-ef01-222222222222", // COSMOS 2251 DEB
    tca: "2026-09-14T19:25:30Z",
    missDistance: 0.89,
    relativeVelocity: 15.1,
    collisionProbability: 8.5e-4,
    maxCollisionProbability: 9.1e-4,
    riskLevel: "elevated",
    status: "active",
    screeningWindowStart: "2026-09-12T12:00:00Z",
    screeningWindowEnd: "2026-09-15T12:00:00Z",
    maneuverProposalId: null,
    createdAt: "2026-09-12T12:50:00Z",
    updatedAt: "2026-09-12T13:00:00Z",
  },
];

// ============================================================================
// Seed Data: Shell Risk Snapshots (SIR Model)
// ============================================================================

export const mockShells: ShellRiskSnapshot[] = [
  {
    shellId: "LEO_400_450",
    altitudeMin: 400,
    altitudeMax: 450,
    timestamp: "2026-09-12T13:00:00Z",
    susceptibleCount: 312,
    infectedCount: 47,
    removedCount: 89,
    totalObjectCount: 448,
    debrisDensity: 3.7e-9,
    r0: 0.83,
    trend: "stable",
    projectionYears: [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50],
    projectedS: [312, 298, 280, 261, 245, 232, 221, 213, 207, 203, 200],
    projectedI: [47, 52, 55, 53, 48, 42, 36, 31, 27, 24, 22],
    projectedR: [89, 98, 113, 134, 155, 174, 191, 204, 214, 221, 226],
  },
  {
    shellId: "LEO_750_800",
    altitudeMin: 750,
    altitudeMax: 800,
    timestamp: "2026-09-12T13:00:00Z",
    susceptibleCount: 587,
    infectedCount: 213,
    removedCount: 41,
    totalObjectCount: 841,
    debrisDensity: 8.1e-9,
    r0: 1.24,
    trend: "increasing",
    projectionYears: [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50],
    projectedS: [587, 540, 471, 388, 302, 230, 178, 142, 117, 101, 91],
    projectedI: [213, 267, 338, 410, 461, 478, 462, 421, 370, 319, 273],
    projectedR: [41, 34, 32, 43, 78, 133, 201, 278, 354, 421, 477],
  },
  {
    shellId: "LEO_500_550",
    altitudeMin: 500,
    altitudeMax: 550,
    timestamp: "2026-09-12T13:00:00Z",
    susceptibleCount: 1240,
    infectedCount: 112,
    removedCount: 65,
    totalObjectCount: 1417,
    debrisDensity: 5.2e-9,
    r0: 0.95,
    trend: "stable",
    projectionYears: [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50],
    projectedS: [1240, 1205, 1160, 1110, 1065, 1025, 990, 960, 935, 915, 900],
    projectedI: [112, 125, 134, 132, 124, 115, 105, 95, 85, 76, 68],
    projectedR: [65, 87, 123, 175, 228, 277, 322, 362, 397, 426, 449],
  },
  {
    shellId: "LEO_800_850",
    altitudeMin: 800,
    altitudeMax: 850,
    timestamp: "2026-09-12T13:00:00Z",
    susceptibleCount: 420,
    infectedCount: 310,
    removedCount: 52,
    totalObjectCount: 782,
    debrisDensity: 9.4e-9,
    r0: 1.42,
    trend: "increasing",
    projectionYears: [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50],
    projectedS: [420, 375, 310, 240, 175, 125, 90, 68, 52, 42, 35],
    projectedI: [310, 380, 450, 510, 545, 540, 505, 450, 390, 335, 285],
    projectedR: [52, 27, 22, 32, 62, 117, 187, 264, 340, 405, 462],
  },
];

// ============================================================================
// Seed Data: Maneuver Proposals & Negotiation Transcripts
// ============================================================================

export const mockManeuvers: ManeuverProposal[] = [
  {
    id: "mp-11223344-5566-7788-99aa-bbccddeeff00",
    conjunctionEventId: "ce-9f8e7d6c-5b4a-3210-fedc-ba9876543210",
    maneuveringObjectId: "a1b2c3d4-5678-9abc-def0-111111111111", // ISS (ZARYA)
    operatorAgentId: "op-001",
    opposingOperatorAgentId: "op-002",
    deltaV: {
      magnitude: 0.4,
      direction: { x: 0.98, y: 0.17, z: 0.05 },
    },
    burnTime: "2026-09-13T06:00:00Z",
    fuelCost: 1.2,
    rationale:
      "Operator A has 340 m/s remaining Δv vs Operator B's 112 m/s. Maneuver cost is 0.4 m/s — lower relative impact on Operator A's mission lifetime.",
    negotiationStatus: "accepted",
    negotiationLog: [
      {
        timestamp: "2026-09-12T13:05:00Z",
        agentId: "negotiation",
        action: "INITIATE",
        message: "Conjunction ce-9f8e... requires maneuver. Soliciting bids.",
        deltaVBid: null,
      },
      {
        timestamp: "2026-09-12T13:05:01Z",
        agentId: "op-001",
        action: "BID",
        message: "Operator A bids 0.4 m/s prograde burn at T-2h40m.",
        deltaVBid: 0.4,
      },
      {
        timestamp: "2026-09-12T13:05:01Z",
        agentId: "op-002",
        action: "BID",
        message: "Operator B bids 0.6 m/s retrograde burn at T-3h.",
        deltaVBid: 0.6,
      },
      {
        timestamp: "2026-09-12T13:05:02Z",
        agentId: "negotiation",
        action: "ACCEPT",
        message: "Operator A's bid selected — lower Δv cost and higher remaining budget.",
        deltaVBid: 0.4,
      },
    ],
    resultingPc: 4.1e-7,
    createdAt: "2026-09-12T13:05:00Z",
    resolvedAt: "2026-09-12T13:05:02Z",
  },
  {
    id: "mp-22334455-6677-8899-aabb-ccddeeff0011",
    conjunctionEventId: "ce-6c5b4a32-10fe-dcba-9876-543210987654",
    maneuveringObjectId: "a7b8c9d0-bcde-f012-3456-777777777777", // TIANGONG
    operatorAgentId: "op-004",
    opposingOperatorAgentId: "op-untracked",
    deltaV: {
      magnitude: 0.35,
      direction: { x: -0.92, y: 0.38, z: -0.09 },
    },
    burnTime: "2026-09-12T14:30:00Z",
    fuelCost: 0.85,
    rationale:
      "Uncooperative debris object in intersecting trajectory. Station executed autonomous 0.35 m/s orbital phase adjustment.",
    negotiationStatus: "accepted",
    negotiationLog: [
      {
        timestamp: "2026-09-12T10:15:00Z",
        agentId: "negotiation",
        action: "INITIATE",
        message: "Critical conjunction with uncooperative SL-16 debris piece. Generating unilateral avoidance trajectory.",
        deltaVBid: null,
      },
      {
        timestamp: "2026-09-12T10:15:02Z",
        agentId: "op-004",
        action: "BID",
        message: "Tiangong Flight Director accepts autonomous 0.35 m/s phase burn.",
        deltaVBid: 0.35,
      },
      {
        timestamp: "2026-09-12T10:15:04Z",
        agentId: "negotiation",
        action: "ACCEPT",
        message: "Unilateral avoidance trajectory validated and committed to flight plan.",
        deltaVBid: 0.35,
      },
    ],
    resultingPc: 1.8e-8,
    createdAt: "2026-09-12T10:15:00Z",
    resolvedAt: "2026-09-12T10:15:04Z",
  },
  {
    id: "mp-33445566-7788-99aa-bbcc-ddeeff001122",
    conjunctionEventId: "ce-7d6c5b4a-3210-fedc-ba98-765432109876",
    maneuveringObjectId: "c3d4e5f6-789a-bcde-f012-333333333333", // STARLINK-31042
    operatorAgentId: "op-002",
    opposingOperatorAgentId: "op-debris",
    deltaV: {
      magnitude: 0.15,
      direction: { x: 0.1, y: 0.99, z: 0.08 },
    },
    burnTime: "2026-09-13T22:00:00Z",
    fuelCost: 0.22,
    rationale: "Electric propulsion station-keeping adjustment to maximize radial clearance.",
    negotiationStatus: "pending",
    negotiationLog: [
      {
        timestamp: "2026-09-12T12:55:00Z",
        agentId: "negotiation",
        action: "INITIATE",
        message: "Evaluating low-thrust autonomous ion maneuver proposal.",
        deltaVBid: null,
      },
    ],
    resultingPc: null,
    createdAt: "2026-09-12T12:55:00Z",
    resolvedAt: null,
  },
];

// ============================================================================
// Seed Data: Agent Statuses
// ============================================================================

export const mockAgents: AgentStatus[] = [
  {
    agentId: "tracker",
    agentName: "Tracker Agent",
    agentType: "tracker",
    state: "idle",
    lastHeartbeat: "2026-09-12T13:00:00Z",
    currentTask: null,
    processedCount: 1847,
    errorCount: 0,
  },
  {
    agentId: "risk_assessor",
    agentName: "Risk Assessor Agent",
    agentType: "risk_assessor",
    state: "processing",
    lastHeartbeat: "2026-09-12T13:00:01Z",
    currentTask: "Screening 1847 objects for conjunctions",
    processedCount: 342,
    errorCount: 1,
  },
  {
    agentId: "epidemic_forecaster",
    agentName: "Epidemic Forecaster Agent",
    agentType: "epidemic_forecaster",
    state: "idle",
    lastHeartbeat: "2026-09-12T13:00:00Z",
    currentTask: null,
    processedCount: 96,
    errorCount: 0,
  },
  {
    agentId: "maneuver_negotiation",
    agentName: "Maneuver Negotiation Agent",
    agentType: "maneuver_negotiation",
    state: "alert",
    lastHeartbeat: "2026-09-12T13:00:02Z",
    currentTask: "Evaluating burn geometry for ce-9f8e7d6c",
    processedCount: 28,
    errorCount: 0,
  },
  {
    agentId: "anomaly",
    agentName: "Anomaly Detection Agent",
    agentType: "anomaly",
    state: "idle",
    lastHeartbeat: "2026-09-12T13:00:00Z",
    currentTask: "Monitoring orbital element drift across LEO",
    processedCount: 1847,
    errorCount: 0,
  },
  {
    agentId: "advisory",
    agentName: "Advisory Agent",
    agentType: "advisory",
    state: "idle",
    lastHeartbeat: "2026-09-12T13:00:00Z",
    currentTask: null,
    processedCount: 41,
    errorCount: 0,
  },
];

// ============================================================================
// Seed Data: Advisories
// ============================================================================

export const mockAdvisories: Advisory[] = [
  {
    id: "adv-aabbccdd-1122-3344-5566-778899001122",
    timestamp: "2026-09-12T13:06:00Z",
    severity: "critical",
    title: "Collision risk mitigated — ISS avoidance maneuver executed",
    body:
      "A close approach between ISS (ZARYA) and COSMOS 2251 DEB was detected at 08:42:17 UTC tomorrow with a collision probability of 2.3 × 10⁻³. After negotiation between Operator A and Operator B, Operator A will execute a 0.4 m/s prograde burn at 06:00 UTC, reducing collision probability to 4.1 × 10⁻⁷ — well below the action threshold.",
    relatedEventIds: ["ce-9f8e7d6c-5b4a-3210-fedc-ba9876543210"],
    relatedObjectIds: [
      "a1b2c3d4-5678-9abc-def0-111111111111",
      "b2c3d4e5-6789-abcd-ef01-222222222222",
    ],
    agentSource: "advisory",
  },
  {
    id: "adv-bbccddee-2233-4455-6677-889900112233",
    timestamp: "2026-09-12T12:45:00Z",
    severity: "elevated",
    title: "LEO 750–800 km shell R₀ exceeds critical cascade threshold (1.24)",
    body:
      "Epidemic cascade modeling indicates the 750–800 km altitude band has crossed R₀ = 1.24, signaling super-critical debris propagation potential under stochastic collision conditions. Coordinated de-orbit pacing and active conjunction screening recommended for all assets in this shell.",
    relatedEventIds: ["ce-8e7d6c5b-4a32-10fe-dcba-987654321098"],
    relatedObjectIds: [
      "f6a7b8c9-abcd-ef01-2345-666666666666",
      "b8c9d0e1-cdef-0123-4567-888888888888",
    ],
    agentSource: "advisory",
  },
  {
    id: "adv-ccddeeaa-3344-5566-7788-990011223344",
    timestamp: "2026-09-12T12:00:00Z",
    severity: "nominal",
    title: "Nominal orbital screening cycle completed",
    body:
      "All 1,847 cataloged orbital assets were successfully propagated through SGP4 across a 72-hour lookahead window. 23 conjunction geometries were evaluated; all active payloads maintain safe separation margins outside emergency protocols.",
    relatedEventIds: [],
    relatedObjectIds: [],
    agentSource: "advisory",
  },
];

// ============================================================================
// Seed Data: Audit Log
// ============================================================================

export const mockAuditLog: AuditLogEntry[] = [
  {
    id: "aud-001",
    timestamp: "2026-09-12T13:05:02Z",
    agentId: "negotiation",
    agentType: "maneuver_negotiation",
    action: "maneuver_accepted",
    description:
      "Maneuver negotiation resolved: Operator A will execute 0.4 m/s prograde burn for conjunction ce-9f8e...",
    relatedEntityId: "mp-11223344-5566-7788-99aa-bbccddeeff00",
    relatedEntityType: "maneuver",
    metadata: {
      conjunctionId: "ce-9f8e7d6c-5b4a-3210-fedc-ba9876543210",
      pcBefore: 2.3e-3,
      pcAfter: 4.1e-7,
    },
  },
  {
    id: "aud-002",
    timestamp: "2026-09-12T13:05:00Z",
    agentId: "negotiation",
    agentType: "maneuver_negotiation",
    action: "maneuver_proposed",
    description: "Autonomous negotiation opened between Operator A and Operator B for ce-9f8e7d6c.",
    relatedEntityId: "mp-11223344-5566-7788-99aa-bbccddeeff00",
    relatedEntityType: "maneuver",
    metadata: { threshold: 1e-4 },
  },
  {
    id: "aud-003",
    timestamp: "2026-09-12T13:00:01Z",
    agentId: "epidemic_forecaster",
    agentType: "epidemic_forecaster",
    action: "cascade_forecast_updated",
    description: "SIR model evaluated across 14 orbital shells. LEO_750_800 and LEO_800_850 flagged R₀ > 1.0.",
    relatedEntityId: "LEO_750_800",
    relatedEntityType: "shell",
    metadata: { r0_750: 1.24, r0_800: 1.42 },
  },
  {
    id: "aud-004",
    timestamp: "2026-09-12T12:30:00Z",
    agentId: "risk_assessor",
    agentType: "risk_assessor",
    action: "conjunction_detected",
    description: "Close approach detected between NOAA 19 and FENGYUN 1C DEB with miss distance 1.12 km.",
    relatedEntityId: "ce-8e7d6c5b-4a32-10fe-dcba-987654321098",
    relatedEntityType: "conjunction",
    metadata: { missDistanceKm: 1.12, pc: 4.8e-4 },
  },
  {
    id: "aud-005",
    timestamp: "2026-09-12T12:15:00Z",
    agentId: "risk_assessor",
    agentType: "risk_assessor",
    action: "conjunction_detected",
    description: "Critical conjunction detected: ISS (ZARYA) vs COSMOS 2251 DEB. Pc: 2.3e-3 exceeds threshold.",
    relatedEntityId: "ce-9f8e7d6c-5b4a-3210-fedc-ba9876543210",
    relatedEntityType: "conjunction",
    metadata: { missDistanceKm: 0.347, pc: 2.3e-3 },
  },
  {
    id: "aud-006",
    timestamp: "2026-09-12T12:00:00Z",
    agentId: "tracker",
    agentType: "tracker",
    action: "propagation_complete",
    description: "SGP4 propagation complete for 1,847 orbital assets across 72h screening window.",
    relatedEntityId: null,
    relatedEntityType: null,
    metadata: { objectCount: 1847, epoch: "2026-09-12T12:00:00Z" },
  },
  {
    id: "aud-007",
    timestamp: "2026-09-12T11:45:00Z",
    agentId: "tracker",
    agentType: "tracker",
    action: "tle_ingested",
    description: "CelesTrak active & debris ephemerides successfully refreshed. 1,847 TLE records synchronized.",
    relatedEntityId: null,
    relatedEntityType: null,
    metadata: { source: "CelesTrak", records: 1847 },
  },
];

// ============================================================================
// Seed Data: Dashboard Summary
// ============================================================================

export const mockDashboardSummary: DashboardSummary = {
  totalTrackedObjects: 1847,
  activeSatellites: 623,
  debrisObjects: 1189,
  rocketBodies: 35,
  activeConjunctions: 23,
  criticalConjunctions: 2,
  maneuveredLast24h: 1,
  shellsAtRisk: 1,
  agentStatuses: [
    { agentType: "tracker", state: "idle" },
    { agentType: "risk_assessor", state: "processing" },
    { agentType: "epidemic_forecaster", state: "idle" },
    { agentType: "maneuver_negotiation", state: "alert" },
    { agentType: "anomaly", state: "idle" },
    { agentType: "advisory", state: "idle" },
  ],
  lastUpdated: "2026-09-12T13:00:00Z",
};

// ============================================================================
// Helper: Pagination Slicer
// ============================================================================

function paginate<T>(items: T[], limit = 50, offset = 0): PaginatedResponse<T> {
  const safeLimit = Math.max(1, limit);
  const safeOffset = Math.max(0, offset);
  const paginatedData = items.slice(safeOffset, safeOffset + safeLimit);
  return {
    data: paginatedData,
    total: items.length,
    limit: safeLimit,
    offset: safeOffset,
  };
}

// Simulated network latency (10-30ms) for realistic async feeling
const delay = (ms = 15) => new Promise((resolve) => setTimeout(resolve, ms));

// ============================================================================
// Exported Mock API Functions (Interface Contract §3.1)
// ============================================================================

/**
 * GET /api/v1/objects
 * List all tracked objects with optional type, shellId, and pagination filters.
 */
export async function getObjects(
  params?: ObjectsQueryParams
): Promise<PaginatedResponse<TrackedObject>> {
  await delay();
  let filtered = [...mockObjects];

  if (params?.type) {
    filtered = filtered.filter((obj) => obj.type === params.type);
  }
  if (params?.shellId) {
    filtered = filtered.filter((obj) => obj.shellId === params.shellId);
  }

  return paginate(filtered, params?.limit ?? 100, params?.offset ?? 0);
}

/**
 * GET /api/v1/objects/:id
 * Get a single tracked object by UUID.
 */
export async function getObjectById(id: string): Promise<TrackedObject | null> {
  await delay();
  return mockObjects.find((obj) => obj.id === id) ?? null;
}

/**
 * GET /api/v1/conjunctions
 * List conjunction events with optional status, riskLevel, and pagination filters.
 */
export async function getConjunctions(
  params?: ConjunctionsQueryParams
): Promise<PaginatedResponse<ConjunctionEvent>> {
  await delay();
  let filtered = [...mockConjunctions];

  if (params?.status) {
    filtered = filtered.filter((event) => event.status === params.status);
  }
  if (params?.riskLevel) {
    filtered = filtered.filter((event) => event.riskLevel === params.riskLevel);
  }

  return paginate(filtered, params?.limit ?? 50, params?.offset ?? 0);
}

/**
 * GET /api/v1/conjunctions/:id
 * Get a single conjunction event with embedded primary & secondary object states.
 */
export async function getConjunctionById(
  id: string
): Promise<ConjunctionDetailResponse | null> {
  await delay();
  const conjunction = mockConjunctions.find((c) => c.id === id);
  if (!conjunction) return null;

  const primaryObject = mockObjects.find(
    (o) => o.id === conjunction.primaryObjectId
  );
  const secondaryObject = mockObjects.find(
    (o) => o.id === conjunction.secondaryObjectId
  );

  if (!primaryObject || !secondaryObject) return null;

  return {
    conjunction,
    primaryObject,
    secondaryObject,
  };
}

/**
 * GET /api/v1/shells
 * Get SIR cascade risk snapshots for all orbital shells.
 */
export async function getShells(): Promise<ShellsResponse> {
  await delay();
  return {
    data: [...mockShells],
  };
}

/**
 * GET /api/v1/maneuvers
 * List maneuver proposals with optional status and pagination filters.
 */
export async function getManeuvers(
  params?: ManeuversQueryParams
): Promise<PaginatedResponse<ManeuverProposal>> {
  await delay();
  let filtered = [...mockManeuvers];

  if (params?.status) {
    filtered = filtered.filter(
      (m) => m.negotiationStatus === params.status
    );
  }

  return paginate(filtered, params?.limit ?? 20, params?.offset ?? 0);
}

/**
 * GET /api/v1/maneuvers/:id
 * Get a single maneuver proposal and its negotiation transcript by ID.
 */
export async function getManeuverById(
  id: string
): Promise<ManeuverProposal | null> {
  await delay();
  return mockManeuvers.find((m) => m.id === id) ?? null;
}

/**
 * GET /api/v1/agents/status
 * Get the current real-time telemetry state of all 6 autonomous agents.
 */
export async function getAgentStatuses(): Promise<AgentsStatusResponse> {
  await delay();
  return {
    agents: [...mockAgents],
  };
}

/**
 * GET /api/v1/advisories
 * List plain-language advisory narratives with optional severity filter.
 */
export async function getAdvisories(
  params?: AdvisoriesQueryParams
): Promise<PaginatedResponse<Advisory>> {
  await delay();
  let filtered = [...mockAdvisories];

  if (params?.severity) {
    filtered = filtered.filter((a) => a.severity === params.severity);
  }

  return paginate(filtered, params?.limit ?? 20, params?.offset ?? 0);
}

/**
 * GET /api/v1/audit
 * Get the audit log with optional agentType filter.
 */
export async function getAuditLog(
  params?: AuditQueryParams
): Promise<PaginatedResponse<AuditLogEntry>> {
  await delay();
  let filtered = [...mockAuditLog];

  if (params?.agentType) {
    filtered = filtered.filter((entry) => entry.agentType === params.agentType);
  }

  return paginate(filtered, params?.limit ?? 50, params?.offset ?? 0);
}

/**
 * GET /api/v1/dashboard/summary
 * Aggregated counters and agent states for the Command Center.
 */
export async function getDashboardSummary(): Promise<DashboardSummary> {
  await delay();
  return { ...mockDashboardSummary };
}

/**
 * POST /api/v1/crisis/inject
 * Inject simulated collision/breakup debris into an orbital altitude band.
 */
export async function injectCrisis(
  req: CrisisInjectionRequest
): Promise<CrisisInjectionResponse> {
  await delay(150);

  // Derive affected shells based on injection altitude
  const altMin = Math.floor(req.altitude / 50) * 50;
  const primaryShell = `LEO_${altMin}_${altMin + 50}`;
  const secondaryShell = `LEO_${altMin + 50}_${altMin + 100}`;

  // 1. Generate synthetic debris fragments centered at altitude
  const newDebrisObjects: TrackedObject[] = [];
  const baseRadius = 6371 + req.altitude;
  const createdNoradBase = 90000 + Math.floor(Math.random() * 9000);

  for (let i = 0; i < Math.min(req.fragmentCount, 200); i++) {
    const theta = Math.random() * 2 * Math.PI;
    const phi = (Math.random() - 0.5) * Math.PI * 0.8;
    const r = baseRadius + (Math.random() - 0.5) * 35;
    const x = r * Math.cos(phi) * Math.cos(theta);
    const y = r * Math.cos(phi) * Math.sin(theta);
    const z = r * Math.sin(phi);

    const speed = Math.sqrt(398600.4418 / r);
    const vx = -speed * Math.sin(theta) + (Math.random() - 0.5) * 0.4;
    const vy = speed * Math.cos(theta) + (Math.random() - 0.5) * 0.4;
    const vz = (Math.random() - 0.5) * 0.6;

    const fragObj: TrackedObject = {
      id: `frag-${Date.now()}-${i}`,
      noradId: createdNoradBase + i,
      name: `${req.label || "CRISIS"} DEB #${i + 1}`,
      type: "debris",
      altitude: Number((r - 6371).toFixed(2)),
      shellId: primaryShell,
      position: { x: Number(x.toFixed(2)), y: Number(y.toFixed(2)), z: Number(z.toFixed(2)) },
      velocity: { vx: Number(vx.toFixed(4)), vy: Number(vy.toFixed(4)), vz: Number(vz.toFixed(4)) },
      covarianceUpperTriangle: [1.2e-4, 4.5e-5, -2.1e-5, 8.8e-5, 1.4e-5, 2.3e-4],
      orbitalElements: {
        semiMajorAxis: Number(r.toFixed(2)),
        eccentricity: Number((0.001 + Math.random() * 0.015).toFixed(6)),
        inclination: Number((51.6 + (Math.random() - 0.5) * 15).toFixed(4)),
        raan: Number((Math.random() * 360).toFixed(4)),
        argOfPerigee: Number((Math.random() * 360).toFixed(4)),
        meanAnomaly: Number((Math.random() * 360).toFixed(4)),
      },
      status: "active",
      operatorId: null,
      epoch: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
    };
    newDebrisObjects.push(fragObj);
  }

  // Prepend new debris to mockObjects
  mockObjects.unshift(...newDebrisObjects);

  // 2. Update dashboard summary counters
  mockDashboardSummary.totalTrackedObjects += req.fragmentCount;
  mockDashboardSummary.debrisObjects += req.fragmentCount;
  mockDashboardSummary.activeConjunctions += Math.round(req.fragmentCount * 0.12);
  mockDashboardSummary.criticalConjunctions += Math.max(2, Math.round(req.fragmentCount * 0.056));
  mockDashboardSummary.shellsAtRisk = Math.max(mockDashboardSummary.shellsAtRisk, 2);
  mockDashboardSummary.lastUpdated = new Date().toISOString();

  // 3. Update or insert critical shell dynamics (R0 spike!)
  let shell = mockShells.find((s) => s.shellId === primaryShell);
  if (!shell) {
    shell = {
      shellId: primaryShell,
      altitudeMin: altMin,
      altitudeMax: altMin + 50,
      timestamp: new Date().toISOString(),
      susceptibleCount: 450,
      infectedCount: 120,
      removedCount: 40,
      totalObjectCount: 610,
      debrisDensity: 6.4e-9,
      r0: 0.92,
      trend: "stable",
      projectionYears: [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50],
      projectedS: [450, 410, 360, 300, 240, 180, 130, 95, 70, 50, 40],
      projectedI: [120, 180, 270, 380, 490, 560, 590, 580, 540, 490, 430],
      projectedR: [40, 50, 70, 110, 170, 250, 340, 430, 510, 580, 640],
    };
    mockShells.unshift(shell);
  }

  // Elevate shell to supercritical cascade state
  shell.r0 = Math.max(shell.r0, 2.48);
  shell.trend = "increasing";
  shell.infectedCount += req.fragmentCount;
  shell.totalObjectCount += req.fragmentCount;
  shell.debrisDensity = shell.debrisDensity * 4.2;
  shell.projectedI = shell.projectedI.map((val, idx) =>
    Math.round(val + req.fragmentCount * (1.2 + idx * 0.35))
  );

  // 4. Inject a new critical close approach with the ISS or active satellite
  const primaryVictim = mockObjects.find((o) => o.type === "satellite") || mockObjects[0];
  const attackerDebris = newDebrisObjects[0];

  const newConj: ConjunctionEvent = {
    id: `ce-crisis-${Date.now().toString(36)}`,
    primaryObjectId: primaryVictim.id,
    secondaryObjectId: attackerDebris ? attackerDebris.id : "b2c3d4e5-6789-abcd-ef01-222222222222",
    tca: new Date(Date.now() + 24 * 60 * 1000).toISOString(), // T-24m
    missDistance: 0.038, // 38m
    relativeVelocity: 14.85,
    collisionProbability: 5.2e-3,
    maxCollisionProbability: 5.9e-3,
    riskLevel: "critical",
    status: "active",
    screeningWindowStart: new Date().toISOString(),
    screeningWindowEnd: new Date(Date.now() + 72 * 3600 * 1000).toISOString(),
    maneuverProposalId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  mockConjunctions.unshift(newConj);

  // 5. Inject a synthesized mission advisory
  const newAdv: Advisory = {
    id: `adv-crisis-${Date.now().toString(36)}`,
    timestamp: new Date().toISOString(),
    severity: "critical",
    title: `EMERGENCY CASCADE ALERT: ${req.label}`,
    body: `Simulated ${req.type.toUpperCase()} injection generated ${req.fragmentCount} high-velocity debris bodies at ${req.altitude} km. Shell ${primaryShell} has crossed critical percolation threshold (R₀ = ${shell.r0.toFixed(2)}). Immediate autonomous evasion trajectory initiated for ${primaryVictim.name}.`,
    relatedEventIds: [newConj.id],
    relatedObjectIds: [primaryVictim.id, attackerDebris ? attackerDebris.id : ""].filter(Boolean),
    agentSource: "advisory",
  };
  mockAdvisories.unshift(newAdv);

  return {
    success: true,
    injectedObjectCount: req.fragmentCount,
    affectedShellIds: [primaryShell, secondaryShell],
    newConjunctionEventCount: Math.round(req.fragmentCount * 0.056),
    timestamp: new Date().toISOString(),
  };
}
