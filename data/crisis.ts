/**
 * Crisis Breakup Fragment Generator
 * Synthesizes orbital debris clouds following a simulated collision or ASAT test.
 * Aligned with BRIEF_DATA.md Task D1 and INTERFACE_CONTRACT.md §1.1, §3.1
 */

import { randomUUID } from "crypto";
import type { TrackedObject } from "./types";
import { deriveKeplerianElements, GM_EARTH_KM3_S2 } from "./propagator";
import { getShellId, EARTH_RADIUS_KM } from "./shells";
import { DEFAULT_COVARIANCE_UPPER_TRIANGLE } from "./parser";

export interface BreakupOptions {
  altitudeKm: number;
  fragmentCount: number;
  sourceObject?: TrackedObject;
  label?: string;
  maxVelocityKickKmS?: number; // default ±0.08 km/s
}

/**
 * Generates synthetic TrackedObject records representing breakup debris fragments.
 */
export function generateBreakupFragments(options: BreakupOptions): TrackedObject[] {
  const {
    altitudeKm,
    fragmentCount,
    sourceObject,
    maxVelocityKickKmS = 0.12,
  } = options;

  const fragments: TrackedObject[] = [];
  const now = new Date().toISOString();

  // Base orbital radius
  const rBase = EARTH_RADIUS_KM + altitudeKm;
  // Circular orbital speed at altitude: v = sqrt(mu / r)
  const vCirc = Math.sqrt(GM_EARTH_KM3_S2 / rBase);

  // Default inclined orbit (e.g. 51.6° LEO or polar 98°) if no source object
  const defaultIncRad = (51.6 * Math.PI) / 180;
  const defaultRaanRad = (45.0 * Math.PI) / 180;

  const basePos = sourceObject
    ? { ...sourceObject.position }
    : {
        x: rBase * Math.cos(defaultRaanRad) * Math.cos(Math.PI / 4),
        y: rBase * Math.sin(defaultRaanRad) * Math.cos(Math.PI / 4),
        z: rBase * Math.sin(defaultIncRad) * Math.sin(Math.PI / 4),
      };

  const baseVel = sourceObject
    ? { ...sourceObject.velocity }
    : {
        vx: -vCirc * Math.sin(defaultRaanRad),
        vy: vCirc * Math.cos(defaultRaanRad) * Math.cos(defaultIncRad),
        vz: vCirc * Math.sin(defaultIncRad) * 0.7,
      };

  const baseNoradId = 90000 + Math.floor(Math.random() * 5000);

  for (let i = 0; i < fragmentCount; i++) {
    // Generate isotropic velocity perturbation (Gabbard dispersion kick)
    // Box-Muller normal distribution
    const randNorm = () => {
      let u = 0, v = 0;
      while (u === 0) u = Math.random();
      while (v === 0) v = Math.random();
      return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    };

    const dvx = randNorm() * (maxVelocityKickKmS / 2.0);
    const dvy = randNorm() * (maxVelocityKickKmS / 2.0);
    const dvz = randNorm() * (maxVelocityKickKmS / 2.0);

    // Minor spatial dispersion around the breakup epicenter (±0.8 km)
    const dpx = (Math.random() - 0.5) * 1.6;
    const dpy = (Math.random() - 0.5) * 1.6;
    const dpz = (Math.random() - 0.5) * 1.6;

    const pos = {
      x: Math.round((basePos.x + dpx) * 1000) / 1000,
      y: Math.round((basePos.y + dpy) * 1000) / 1000,
      z: Math.round((basePos.z + dpz) * 1000) / 1000,
    };

    const vel = {
      vx: Math.round((baseVel.vx + dvx) * 10000) / 10000,
      vy: Math.round((baseVel.vy + dvy) * 10000) / 10000,
      vz: Math.round((baseVel.vz + dvz) * 10000) / 10000,
    };

    const rMag = Math.sqrt(pos.x * pos.x + pos.y * pos.y + pos.z * pos.z);
    const alt = Math.round((rMag - EARTH_RADIUS_KM) * 100) / 100;
    const shellId = getShellId(alt);
    const orbitalElements = deriveKeplerianElements(pos, vel);

    // For newly generated breakup fragments, assign tight localized covariance (0.02 - 0.08 km)
    // reflecting high-density sensor tracking immediately after breakup
    const fragCovariance: [number, number, number, number, number, number] = [
      0.04 + (Math.random() * 0.02),
      0.001,
      0.001,
      0.04 + (Math.random() * 0.02),
      0.001,
      0.04 + (Math.random() * 0.02),
    ];

    fragments.push({
      id: randomUUID(),
      noradId: baseNoradId + i,
      name: `DEB-${baseNoradId + i} [FRAG #${i + 1}]`,
      type: "debris",
      operatorId: null,
      position: pos,
      velocity: vel,
      orbitalElements,
      covarianceUpperTriangle: fragCovariance,
      altitude: alt,
      shellId,
      epoch: now,
      lastUpdated: now,
      status: "active",
    });
  }

  return fragments;
}
