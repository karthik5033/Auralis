// Auralis Core Orbital Mechanics & Flight Dynamics Data Models

export type Role = 'OPERATOR' | 'FLIGHT_DYNAMICS_LEAD' | 'MISSION_DIRECTOR' | 'ADMIN';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  stationId?: string;
  callsign?: string;
  agency?: string;
}

export type ObjectType = 
  | 'Active Satellite' 
  | 'Rocket Body' 
  | 'Debris Fragment' 
  | 'Space Station' 
  | 'Constellation Node' 
  | 'Defunct Payload';

export type ConjunctionStatus = 
  | 'Under Assessment' 
  | 'Negotiation In Progress' 
  | 'Burn Scheduled' 
  | 'Resolved' 
  | 'Cleared';

export type RadarCrossSection = 'Small (<0.1m²)' | 'Medium (0.1-1.0m²)' | 'Large (>1.0m²)';

export interface TrackedObject {
  id: string;
  name: string;
  noradId: number;
  cosparId: string;
  objectType: ObjectType;
  operator: string;
  apogee: number; // km
  perigee: number; // km
  inclination: number; // deg
  rcs: RadarCrossSection;
  maneuverable: boolean;
  threatScore: number; // 0-100 (Kessler contribution index)
  status: 'Operational' | 'Decaying' | 'Tumbling' | 'Decommissioned';
  orbitalShell: string; // e.g. "LEO-550", "LEO-750"
  lastObserved: string;
  periodMinutes: number;
  velocityKmS: number;
}

export interface ConjunctionEvent {
  id: string;
  primaryObjectId: string;
  primaryObjectName: string;
  primaryOperator: string;
  secondaryObjectId: string;
  secondaryObjectName: string;
  secondaryOperator: string;
  tca: string; // Time to Closest Approach ISO
  missDistanceMeters: number;
  radialDistanceMeters: number;
  crossTrackDistanceMeters: number;
  collisionProbability: number; // e.g. 0.00034
  relativeVelocityKmS: number;
  status: ConjunctionStatus;
  orbitalShell: string;
  negotiatedYieldOperator?: string;
  plannedDeltaVMs?: number; // m/s
  summary: string;
}

export interface CascadeRiskAlert {
  id: string;
  orbitalShell: string;
  title: string;
  alertType: 'Collision Warning' | 'Critical Density Threshold' | 'Uncoordinated Burn' | 'Cascade Dispersion';
  severity: 'Nominal' | 'Elevated' | 'Critical';
  collisionProbability: number;
  timestamp: string;
  involvedObjects: string[];
  recommendedAction: string;
  resolved: boolean;
}

export interface AgentNegotiationLog {
  id: string;
  conjunctionId: string;
  timestamp: string;
  agentA: string;
  agentB: string;
  action: 'PROPOSE_BURN' | 'ACCEPT_MANEUVER' | 'COUNTER_PROPOSAL' | 'RESOLVED_ORBITAL_YIELD';
  details: string;
  agreedDeltaVMs: number;
  cryptographicProof: string;
  verified: boolean;
}

export interface FuelLedgerEntry {
  id: string;
  operator: string;
  satelliteId: string;
  satelliteName: string;
  deltaVMs: number;
  propellantKg: number;
  reason: string;
  conjunctionId: string;
  timestamp: string;
  remainingFuelPercentage: number;
}

export interface OrbitalShellStat {
  shellId: string;
  altitudeKm: number;
  activeSatellites: number;
  trackedDebris: number;
  criticalDensityThreshold: number; // objects / 1000 km³
  currentDensity: number;
  cascadeRiskIndex: number; // 0-100 (SIR contagion rate)
  trend: 'stable' | 'elevating' | 'critical';
}

export interface EntityRelationship {
  id: string;
  sourceEntityType: string;
  sourceEntityId: string;
  targetEntityType: string;
  targetEntityId: string;
  relationshipType: 'conjunction_pairing' | 'same_constellation' | 'breakup_parent' | 'operator_peer' | 'coplanar_shell';
  weight: number;
  evidenceRef?: string;
  createdAt: string;
}

export interface ReasoningOutput {
  id: string;
  claim: string;
  mechanism: string; // e.g., "SGP4 Ephemeris Propagation + Bivariate Normal Covariance"
  mechanismDetails: string[];
  evidenceRefs: string[];
  alternatives: { hypothesis: string; status: string; evidence: string }[];
  confidence: 'Low' | 'Moderate' | 'High';
  confidenceScore: number;
}
