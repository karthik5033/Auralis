/**
 * Auralis Data & Astrodynamics Layer
 * Main entry point exporting the complete physics, ingestion, collision, and cascade API.
 * Aligned with BRIEF_DATA.md and INTERFACE_CONTRACT.md
 */

// Types and Enums
export type {
  ObjectType,
  ObjectStatus,
  RiskLevel,
  ConjunctionStatus,
  NegotiationStatus,
  AgentType,
  AgentState,
  CascadeTrend,
  AuditAction,
  TrackedObject,
  ShellRiskSnapshot,
  ShellPopulationUpdatedPayload,
  CascadeForecastCompletePayload,
  CrisisInjectionRequest,
  RawGPElement,
} from "./types";

// CelesTrak Ingestion
export {
  fetchCelesTrakGroup,
  fetchCuratedCatalog,
  loadCuratedCatalog,
  loadLocalFixture,
} from "./celestrak";

// SGP4 Propagation & Astrodynamics
export {
  createSatrecFromGP,
  propagateSatrec,
  deriveKeplerianElements,
  GM_EARTH_KM3_S2,
  RAD2DEG,
  DEG2RAD,
} from "./propagator";
export type { StateVector, KeplerianElements } from "./propagator";

// TLE Parser
export {
  parseGPToTrackedObject,
  classifyObjectType,
  assignOperatorId,
  DEFAULT_COVARIANCE_UPPER_TRIANGLE,
} from "./parser";

// Shell Discretization
export {
  getShellId,
  parseShellBounds,
  computeShellVolume,
  getStandardLEOShells,
  computeShellPopulations,
  EARTH_RADIUS_KM,
  SHELL_BAND_KM,
} from "./shells";
export type { ShellDefinition } from "./shells";

// Collision Probability Math Library
export {
  computePc,
  computePcMonteCarlo,
  computeEncounterGeometry,
  DEFAULT_HBR_SAT_SAT_KM,
  DEFAULT_HBR_SAT_DEB_KM,
} from "./collision";
export type { ConjunctionGeometry } from "./collision";

// SIR Cascade Epidemic Model
export {
  computeAtmosphericDecayRate,
  computeCollisionRateParameter,
  solveSIROde,
  computeShellRiskSnapshot,
  buildAllShellRiskSnapshots,
  PROJECTION_YEARS,
} from "./cascade";

// Epidemic Forecaster Agent Module
export { runEpidemicForecast } from "./epidemic-forecaster";

// Crisis Fragment Generator
export { generateBreakupFragments } from "./crisis";
export type { BreakupOptions } from "./crisis";

// Space-Track Live Ingestion Engine
export { spaceTrackClient } from "./spacetrack";
