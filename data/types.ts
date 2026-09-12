/**
 * Canonical Data Types for Auralis Data & Astrodynamics Layer
 * Aligned strictly with INTERFACE_CONTRACT.md §1.1, §1.3, §2.2, §2.6, §4
 */

// ==========================================
// Fixed Vocabulary & Enums (§4)
// ==========================================

export type ObjectType = "satellite" | "debris" | "rocket_body" | "unknown";

export type ObjectStatus = "active" | "decayed" | "maneuvering" | "unknown";

export type RiskLevel = "nominal" | "elevated" | "critical";

export type ConjunctionStatus =
  | "active"
  | "mitigated"
  | "monitoring"
  | "expired"
  | "false_alarm";

export type NegotiationStatus =
  | "pending"
  | "negotiating"
  | "accepted"
  | "rejected"
  | "timeout";

export type AgentType =
  | "tracker"
  | "risk_assessor"
  | "epidemic_forecaster"
  | "maneuver_negotiation"
  | "anomaly"
  | "advisory";

export type AgentState = "idle" | "processing" | "alert" | "error";

export type CascadeTrend = "increasing" | "stable" | "decreasing";

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

// ==========================================
// Core Data Shapes (§1)
// ==========================================

/**
 * Canonical TrackedObject matching INTERFACE_CONTRACT.md §1.1
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
 * Shell risk snapshot produced by the SIR epidemic model (§1.3)
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
  projectedS: number[];                // S counts at each year
  projectedI: number[];                // I counts at each year
  projectedR: number[];                // R counts at each year
}

/**
 * Shell population update payload emitted to Epidemic Forecaster (§2.2)
 */
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

/**
 * Epidemic Forecaster output payload (§2.6)
 */
export interface CascadeForecastCompletePayload {
  timestamp: string;
  shellSnapshots: ShellRiskSnapshot[];
  criticalShells: string[];            // shellIds where R₀ > 1.0
  overallTrend: CascadeTrend;
}

/**
 * Crisis injection request payload (§3.1)
 */
export interface CrisisInjectionRequest {
  type: "fragmentation";
  altitude: number;
  fragmentCount: number;
  sourceObjectId?: string;
  label?: string;
}

/**
 * Raw CelesTrak GP Element JSON schema
 */
export interface RawGPElement {
  OBJECT_NAME: string;
  OBJECT_ID: string;
  EPOCH: string;
  MEAN_MOTION: number;                 // revs per day
  ECCENTRICITY: number;
  INCLINATION: number;                 // degrees
  RA_OF_ASC_NODE: number;              // degrees
  ARG_OF_PERICENTER: number;           // degrees
  MEAN_ANOMALY: number;                // degrees
  EPHEMERIS_TYPE?: number;
  CLASSIFICATION_TYPE?: string;
  NORAD_CAT_ID: number;
  ELEMENT_SET_NO?: number;
  REV_AT_EPOCH?: number;
  BSTAR?: number;
  MEAN_MOTION_DOT?: number;
  MEAN_MOTION_DDOT?: number;
  OBJECT_TYPE?: string;
}
