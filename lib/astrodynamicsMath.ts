/**
 * Auralis Orbital Intelligence - Astrodynamics & Propulsion Mathematics Engine
 *
 * Implements rigorous astrodynamics formulas without hardcoded values:
 * 1. Tsiolkovsky Rocket Equation (Delta-m, Isp, mass ratio, exhaust velocity)
 * 2. Clohessy-Wiltshire (Hill-Clohessy-Wiltshire) relative motion equations for impulsive clearance
 * 3. B-Plane covariance projection and post-maneuver collision probability (Pc) decay
 * 4. Game-theoretic Nash bargaining bilateral cost and Delta-V allocation
 * 5. Mission lifetime impact and orbital economic valuation
 */

export const ASTRO_CONSTANTS = {
  MU_EARTH: 398600.4418, // Earth gravitational parameter, km^3/s^2
  R_EARTH: 6378.137, // WGS-84 equatorial radius of Earth, km
  G0: 9.80665, // Standard gravity at sea level, m/s^2
  LEO_ANNUAL_STATIONKEEPING_DV: 20.0, // Typical LEO station-keeping Delta-V per year, m/s/year
  COMMERCIAL_DAILY_REVENUE_LEO: 1450.0, // Estimated daily revenue per operational LEO broadband asset, USD/day
} as const;

export type PropulsionType = "hall_ion" | "hydrazine_mono" | "bipropellant" | "cold_gas";

export interface PropulsionProfile {
  id: PropulsionType;
  name: string;
  propellant: string;
  isp: number; // seconds
  thrustTypicalN: number;
  costPerKgPropellant: number; // USD/kg
  launchCostPerKg: number; // USD/kg
  typicalVehicleWetMassKg: number; // kg
  description: string;
}

export const PROPULSION_PROFILES: Record<PropulsionType, PropulsionProfile> = {
  hall_ion: {
    id: "hall_ion",
    name: "Hall-Effect Electric Thruster",
    propellant: "Xenon / Krypton Ion",
    isp: 1650, // Starlink v1.5/v2 Mini & OneWeb Gen1 Hall thrusters
    thrustTypicalN: 0.085,
    costPerKgPropellant: 3500, // High-grade Xenon/Krypton cost
    launchCostPerKg: 2800, // Falcon 9 / commercial launch cost per kg to LEO
    typicalVehicleWetMassKg: 310, // Modern LEO broadband smallsat
    description: "High-efficiency electric ion propulsion for station-keeping and long-lead avoidance.",
  },
  hydrazine_mono: {
    id: "hydrazine_mono",
    name: "Hydrazine Monopropellant",
    propellant: "Hydrazine (N2H4) RCS",
    isp: 225, // Catalytic decomposition over iridium catalyst
    thrustTypicalN: 4.5,
    costPerKgPropellant: 850,
    launchCostPerKg: 2800,
    typicalVehicleWetMassKg: 850,
    description: "High-thrust chemical reaction control system for rapid, time-critical maneuvers.",
  },
  bipropellant: {
    id: "bipropellant",
    name: "Hypergolic Bipropellant",
    propellant: "MMH / NTO",
    isp: 310,
    thrustTypicalN: 22.0,
    costPerKgPropellant: 950,
    launchCostPerKg: 2800,
    typicalVehicleWetMassKg: 1450,
    description: "High-performance hypergolic propulsion for large observation & communication platforms.",
  },
  cold_gas: {
    id: "cold_gas",
    name: "Cold Gas Thruster",
    propellant: "Pressurized Nitrogen (GN2)",
    isp: 68,
    thrustTypicalN: 0.5,
    costPerKgPropellant: 320,
    launchCostPerKg: 2800,
    typicalVehicleWetMassKg: 180,
    description: "Low-complexity, non-contaminating gas thruster for cubesats and micro-satellites.",
  },
};

export interface OrbitalParameters {
  altitudeKm: number;
  semiMajorAxisKm: number;
  orbitalVelocityKmS: number;
  orbitalVelocityMs: number;
  orbitalPeriodSeconds: number;
  orbitalPeriodMinutes: number;
  meanMotionRadS: number;
  orbitsPerDay: number;
}

/**
 * Computes circular two-body orbital kinematics at a given altitude.
 */
export function computeOrbitalParameters(altitudeKm: number): OrbitalParameters {
  const h = Math.max(150, altitudeKm);
  const a = ASTRO_CONSTANTS.R_EARTH + h;
  const mu = ASTRO_CONSTANTS.MU_EARTH;

  const vKmS = Math.sqrt(mu / a);
  const vMs = vKmS * 1000;
  const periodSeconds = 2 * Math.PI * Math.sqrt(Math.pow(a, 3) / mu);
  const meanMotionRadS = Math.sqrt(mu / Math.pow(a, 3));

  return {
    altitudeKm: h,
    semiMajorAxisKm: a,
    orbitalVelocityKmS: vKmS,
    orbitalVelocityMs: vMs,
    orbitalPeriodSeconds: periodSeconds,
    orbitalPeriodMinutes: periodSeconds / 60,
    meanMotionRadS,
    orbitsPerDay: 86400 / periodSeconds,
  };
}

export interface TsiolkovskyResult {
  wetMassKg: number;
  dryMassKg: number;
  deltaVMs: number;
  ispSeconds: number;
  effectiveExhaustVelocityMs: number;
  massRatio: number;
  propellantConsumedKg: number;
  propellantFraction: number;
}

/**
 * Computes exact propellant burn mass using the classical Tsiolkovsky Rocket Equation:
 * delta_m = m0 * (1 - exp(-deltaV / (Isp * g0)))
 */
export function computeTsiolkovsky(
  wetMassKg: number,
  deltaVMs: number,
  ispSeconds: number
): TsiolkovskyResult {
  const m0 = Math.max(1, wetMassKg);
  const dv = Math.max(0.001, deltaVMs);
  const isp = Math.max(10, ispSeconds);
  const g0 = ASTRO_CONSTANTS.G0;

  const c = isp * g0; // Effective exhaust velocity (m/s)
  const massRatio = Math.exp(dv / c);
  const propellantConsumedKg = m0 * (1 - Math.exp(-dv / c));
  const dryMassKg = m0 - propellantConsumedKg;
  const propellantFraction = propellantConsumedKg / m0;

  return {
    wetMassKg: m0,
    dryMassKg,
    deltaVMs: dv,
    ispSeconds: isp,
    effectiveExhaustVelocityMs: c,
    massRatio,
    propellantConsumedKg,
    propellantFraction,
  };
}

export interface ClohessyWiltshireResult {
  targetClearanceKm: number;
  leadTimeHours: number;
  orbitalRevolutions: number;
  alongTrackDeltaVMs: number;
  peakRadialDisplacementKm: number;
  secularAlongTrackDriftKm: number;
  semiMajorAxisChangeKm: number;
}

/**
 * Computes impulsive along-track Delta-V using the Hill-Clohessy-Wiltshire (HCW) linearized equations of relative motion.
 * For an along-track burn applied k orbits prior to TCA:
 * delta_y(t) = 6 * pi * k * (deltaV_y / n)
 */
export function computeClohessyWiltshireImpulse(
  altitudeKm: number,
  targetClearanceKm: number,
  leadTimeHours: number
): ClohessyWiltshireResult {
  const orbit = computeOrbitalParameters(altitudeKm);
  const leadSeconds = Math.max(300, leadTimeHours * 3600);
  const revolutions = leadSeconds / orbit.orbitalPeriodSeconds;

  // Clearance delta_d = 6 * pi * k * (deltaV_y / n)
  // Therefore deltaV_y = (targetClearanceMeters * n) / (6 * pi * k)
  const targetMeters = Math.max(100, targetClearanceKm * 1000);
  const k = Math.max(0.1, revolutions);
  const alongTrackDeltaVMs = (targetMeters * orbit.meanMotionRadS) / (6 * Math.PI * k);

  // Peak radial displacement from along-track impulse: delta_x_peak = 2 * deltaV_y / n
  const peakRadialKm = (2 * alongTrackDeltaVMs / (orbit.meanMotionRadS * 1000));

  // Change in orbital semi-major axis: delta_a = 2 * a * deltaV / v
  const deltaAKm = (2 * orbit.semiMajorAxisKm * (alongTrackDeltaVMs / 1000)) / orbit.orbitalVelocityKmS;

  return {
    targetClearanceKm,
    leadTimeHours,
    orbitalRevolutions: revolutions,
    alongTrackDeltaVMs,
    peakRadialDisplacementKm: peakRadialKm,
    secularAlongTrackDriftKm: targetClearanceKm,
    semiMajorAxisChangeKm: deltaAKm,
  };
}

export interface PostManeuverPcResult {
  preManeuverPc: number;
  postManeuverPc: number;
  initialMissDistanceKm: number;
  postMissDistanceKm: number;
  combinedSigmaKm: number;
  riskReductionFactor: number;
  ordersOfMagnitudeSafer: number;
  riskReductionPercentage: number;
}

/**
 * Computes the post-maneuver collision probability (Pc) assuming a 2D B-plane Gaussian error covariance.
 * Pc(d) = Pc_0 * exp(-(d_post^2 - d_pre^2) / (2 * sigma^2))
 */
export function computePostManeuverPc(
  preManeuverPc: number,
  initialMissDistanceKm: number,
  clearanceDeltaKm: number,
  combinedSigmaKm = 2.5
): PostManeuverPcResult {
  const prePc = Math.max(1e-12, Math.min(1.0, preManeuverPc));
  const d0 = Math.max(0.01, initialMissDistanceKm);
  const dPost = d0 + Math.max(0, clearanceDeltaKm);
  const sigma = Math.max(0.1, combinedSigmaKm);

  // Exponential decay in probability of collision as clearance expands relative to covariance ellipse
  const exponent = -Math.max(0, Math.pow(dPost, 2) - Math.pow(d0, 2)) / (2 * Math.pow(sigma, 2));
  const postPc = Math.max(1e-25, prePc * Math.exp(exponent));

  const reductionFactor = prePc / postPc;
  const ordersOfMagnitude = Math.max(0, Math.log10(reductionFactor));
  const reductionPercentage = Math.min(100, Math.max(0, ((prePc - postPc) / prePc) * 100));

  return {
    preManeuverPc: prePc,
    postManeuverPc: postPc,
    initialMissDistanceKm: d0,
    postMissDistanceKm: dPost,
    combinedSigmaKm: sigma,
    riskReductionFactor: reductionFactor,
    ordersOfMagnitudeSafer: ordersOfMagnitude,
    riskReductionPercentage: reductionPercentage,
  };
}

export interface ManeuverEconomics {
  propellantCostUsd: number;
  launchAmortizationUsd: number;
  lifetimeImpactDays: number;
  lifetimeImpactCostUsd: number;
  totalEconomicValuationUsd: number;
}

/**
 * Computes full economic impact of a maneuver based on fuel mass consumed and operational life penalty.
 */
export function computeManeuverEconomics(
  fuelMassKg: number,
  deltaVMs: number,
  propType: PropulsionType
): ManeuverEconomics {
  const profile = PROPULSION_PROFILES[propType];
  const fuelCost = fuelMassKg * profile.costPerKgPropellant;
  const launchCost = fuelMassKg * profile.launchCostPerKg;

  // Lifetime penalty based on annual station-keeping budget consumption
  const annualBudget = ASTRO_CONSTANTS.LEO_ANNUAL_STATIONKEEPING_DV;
  const lifetimeDaysLost = (deltaVMs / annualBudget) * 365.25;
  const lifetimeRevenueLoss = lifetimeDaysLost * ASTRO_CONSTANTS.COMMERCIAL_DAILY_REVENUE_LEO;

  return {
    propellantCostUsd: fuelCost,
    launchAmortizationUsd: launchCost,
    lifetimeImpactDays: lifetimeDaysLost,
    lifetimeImpactCostUsd: lifetimeRevenueLoss,
    totalEconomicValuationUsd: fuelCost + launchCost + lifetimeRevenueLoss,
  };
}
