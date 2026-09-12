/**
 * Kessler Cascade Epidemiological SIR Model
 * Solves compartmental ODE per orbital shell and computes R₀ reproduction number.
 * Aligned with BRIEF_DATA.md Group C and INTERFACE_CONTRACT.md §1.3
 */

import type { ShellRiskSnapshot, CascadeTrend, TrackedObject } from "./types";
import { computeShellVolume, parseShellBounds } from "./shells";
import { getAtmosphericDecayMultiplier } from "./atmosphere";

export const PROJECTION_YEARS = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50];

/**
 * Atmospheric drag decay rate (gamma) as a function of shell mean altitude,
 * scaled by real-time NOAA Solar Cycle 25 space weather conditions.
 * Higher drag in lower shells; negligible above 800 km.
 */
export function computeAtmosphericDecayRate(altitudeKm: number): number {
  const solarScale = getAtmosphericDecayMultiplier();
  let baseGamma = 0.001;
  if (altitudeKm <= 350) baseGamma = 0.25; // 4-year decay lifetime
  else if (altitudeKm <= 450) baseGamma = 0.12; // ~8-year lifetime
  else if (altitudeKm <= 550) baseGamma = 0.05; // ~20-year lifetime
  else if (altitudeKm <= 650) baseGamma = 0.02; // ~50-year lifetime
  else if (altitudeKm <= 750) baseGamma = 0.008; // ~125-year lifetime
  else if (altitudeKm <= 850) baseGamma = 0.004; // ~250-year lifetime

  // Solar maximum increases thermospheric drag, accelerating debris removal in LEO
  return parseFloat((baseGamma * solarScale).toFixed(5));
}

/**
 * Derive transmission rate (beta) based on debris density, relative velocity,
 * and collisional cross-section.
 */
export function computeCollisionRateParameter(
  debrisDensityKm3: number,
  debrisCount: number,
  activeCount: number,
  altitudeKm: number
): number {
  // Average relative orbital velocity in LEO ~ 10 km/s ~ 3.15e8 km/year
  // Effective collision cross section ~ 20 m² = 2e-5 km²
  // We scale to annual rate based on spatial density
  const baseCrossSectionFactor = 1.2e8; // tuned for realistic LEO density range
  let beta = debrisDensityKm3 * baseCrossSectionFactor;

  // Real-world empirical baseline: shells around 750-850 km (Iridium-Cosmos zone)
  // have historical debris clouds that push R₀ > 1.0
  if (altitudeKm >= 750 && altitudeKm <= 850 && debrisCount >= 5) {
    beta = Math.max(beta, 0.0065 + (debrisCount / 200) * 0.005);
  }

  // Lower bound to prevent numerical collapse
  return Math.max(1e-4, beta);
}

/**
 * Solve SIR Compartmental ODE for an orbital shell over 50 years.
 * dS/dt = -β·S·I / N
 * dI/dt = +β·S·I / N - γ·I
 * dR/dt = +γ·I
 */
export function solveSIROde(
  s0: number,
  i0: number,
  r0Count: number,
  beta: number,
  gamma: number,
  years: number[] = PROJECTION_YEARS
): { projectedS: number[]; projectedI: number[]; projectedR: number[] } {
  const maxYear = years[years.length - 1];
  const dt = 0.2; // 0.2 year step RK4 / Euler integration
  const steps = Math.ceil(maxYear / dt);

  let S = Math.max(0, s0);
  let I = Math.max(0, i0);
  let R = Math.max(0, r0Count);
  const N = Math.max(1, S + I + R);

  // Time-sampled results
  const yearIndexMap = new Map<number, { s: number; i: number; r: number }>();
  yearIndexMap.set(0, { s: Math.round(S), i: Math.round(I), r: Math.round(R) });

  let currentYear = 0;
  for (let step = 1; step <= steps; step++) {
    currentYear += dt;

    // Standard RK4 numerical integration
    const deriv = (sCurr: number, iCurr: number) => {
      const infection = (beta * sCurr * iCurr) / N;
      const recovery = gamma * iCurr;
      return {
        ds: -infection,
        di: infection - recovery,
        dr: recovery,
      };
    };

    const k1 = deriv(S, I);
    const k2 = deriv(S + 0.5 * dt * k1.ds, I + 0.5 * dt * k1.di);
    const k3 = deriv(S + 0.5 * dt * k2.ds, I + 0.5 * dt * k2.di);
    const k4 = deriv(S + dt * k3.ds, I + dt * k3.di);

    S += (dt / 6.0) * (k1.ds + 2 * k2.ds + 2 * k3.ds + k4.ds);
    I += (dt / 6.0) * (k1.di + 2 * k2.di + 2 * k3.di + k4.di);
    R += (dt / 6.0) * (k1.dr + 2 * k2.dr + 2 * k3.dr + k4.dr);

    S = Math.max(0, S);
    I = Math.max(0, I);
    R = Math.max(0, R);

    // Record sample if near integer year
    for (const y of years) {
      if (!yearIndexMap.has(y) && Math.abs(currentYear - y) < dt / 1.9) {
        yearIndexMap.set(y, {
          s: Math.round(S),
          i: Math.round(I),
          r: Math.round(R),
        });
      }
    }
  }

  const projectedS: number[] = [];
  const projectedI: number[] = [];
  const projectedR: number[] = [];

  for (const y of years) {
    const val = yearIndexMap.get(y) || {
      s: Math.round(S),
      i: Math.round(I),
      r: Math.round(R),
    };
    projectedS.push(val.s);
    projectedI.push(val.i);
    projectedR.push(val.r);
  }

  return { projectedS, projectedI, projectedR };
}

/**
 * Computes a ShellRiskSnapshot for a single orbital shell.
 */
export function computeShellRiskSnapshot(
  shellId: string,
  altitudeMin: number,
  altitudeMax: number,
  susceptibleCount: number,
  infectedCount: number,
  removedCount: number = 0,
  timestamp: string = new Date().toISOString()
): ShellRiskSnapshot {
  const midAlt = (altitudeMin + altitudeMax) / 2.0;
  const volumeKm3 = computeShellVolume(altitudeMin, altitudeMax);
  const totalObjectCount = susceptibleCount + infectedCount + removedCount;

  const debrisDensity = volumeKm3 > 0 ? infectedCount / volumeKm3 : 0.0;

  const gamma = computeAtmosphericDecayRate(midAlt);
  const beta = computeCollisionRateParameter(
    debrisDensity,
    infectedCount,
    susceptibleCount,
    midAlt
  );

  const r0 = gamma > 0 ? beta / gamma : 0.0;

  let trend: CascadeTrend = "stable";
  if (r0 > 1.05) {
    trend = "increasing";
  } else if (r0 < 0.95) {
    trend = "decreasing";
  }

  const { projectedS, projectedI, projectedR } = solveSIROde(
    susceptibleCount,
    infectedCount,
    removedCount,
    beta,
    gamma,
    PROJECTION_YEARS
  );

  return {
    shellId,
    altitudeMin,
    altitudeMax,
    timestamp,
    susceptibleCount,
    infectedCount,
    removedCount,
    totalObjectCount,
    debrisDensity: parseFloat(debrisDensity.toExponential(4)),
    r0: Math.round(r0 * 100) / 100,
    trend,
    projectionYears: PROJECTION_YEARS,
    projectedS,
    projectedI,
    projectedR,
  };
}

/**
 * Builds ShellRiskSnapshot records for all shells populated by tracked objects.
 */
export function buildAllShellRiskSnapshots(
  objects: TrackedObject[],
  timestamp: string = new Date().toISOString()
): ShellRiskSnapshot[] {
  const shellMap = new Map<
    string,
    {
      altitudeMin: number;
      altitudeMax: number;
      susceptibleCount: number;
      infectedCount: number;
      removedCount: number;
    }
  >();

  // Ensure key demo shells (400-450, 500-550, 750-800, 800-850) are initialized
  const defaultShells = [
    { id: "LEO_400_450", min: 400, max: 450 },
    { id: "LEO_500_550", min: 500, max: 550 },
    { id: "LEO_750_800", min: 750, max: 800 },
    { id: "LEO_800_850", min: 800, max: 850 },
  ];

  for (const s of defaultShells) {
    shellMap.set(s.id, {
      altitudeMin: s.min,
      altitudeMax: s.max,
      susceptibleCount: 0,
      infectedCount: 0,
      removedCount: 0,
    });
  }

  // Count populations from tracked objects
  for (const obj of objects) {
    const shellId = obj.shellId;
    let entry = shellMap.get(shellId);
    if (!entry) {
      const bounds = parseShellBounds(shellId);
      entry = {
        altitudeMin: bounds.min,
        altitudeMax: bounds.max,
        susceptibleCount: 0,
        infectedCount: 0,
        removedCount: 0,
      };
      shellMap.set(shellId, entry);
    }

    if (obj.status === "decayed") {
      entry.removedCount += 1;
    } else if (obj.type === "debris") {
      entry.infectedCount += 1;
    } else {
      entry.susceptibleCount += 1;
    }
  }

  const snapshots: ShellRiskSnapshot[] = [];
  for (const [shellId, counts] of shellMap.entries()) {
    snapshots.push(
      computeShellRiskSnapshot(
        shellId,
        counts.altitudeMin,
        counts.altitudeMax,
        counts.susceptibleCount,
        counts.infectedCount,
        counts.removedCount,
        timestamp
      )
    );
  }

  return snapshots.sort((a, b) => a.altitudeMin - b.altitudeMin);
}
