/**
 * SGP4 Orbit Propagation and Keplerian Element Derivation
 * Aligned with INTERFACE_CONTRACT.md §1.1 and BRIEF_DATA.md task A3
 */

// @ts-ignore - satellite.js type definition interoperability
import * as satellite from "satellite.js";
import type { RawGPElement } from "./types";

export const GM_EARTH_KM3_S2 = 398600.4418; // Earth's gravitational parameter (km³/s²)
export const RAD2DEG = 180.0 / Math.PI;
export const DEG2RAD = Math.PI / 180.0;

export interface StateVector {
  position: { x: number; y: number; z: number };
  velocity: { vx: number; vy: number; vz: number };
  altitude: number; // km above WGS-84 ellipsoid
  latitudeDeg?: number;
  longitudeDeg?: number;
}

export interface KeplerianElements {
  semiMajorAxis: number; // km
  eccentricity: number; // dimensionless
  inclination: number; // degrees
  raan: number; // Right Ascension of Ascending Node, degrees
  argOfPerigee: number; // degrees
  meanAnomaly: number; // degrees
}

/**
 * Initialize a satellite.js SatRec from a CelesTrak RawGPElement JSON
 */
export function createSatrecFromGP(gp: RawGPElement): any {
  try {
    // satellite.js json2satrec supports OMM / GP JSON from CelesTrak
    return (satellite as any).json2satrec(gp);
  } catch (err) {
    // If json2satrec fails on subtle field variations, construct minimal satrec
    return null;
  }
}

/**
 * Derives osculating Keplerian orbital elements from an ECI J2000 state vector.
 */
export function deriveKeplerianElements(
  r: { x: number; y: number; z: number },
  v: { vx: number; vy: number; vz: number }
): KeplerianElements {
  const rMag = Math.sqrt(r.x * r.x + r.y * r.y + r.z * r.z);
  const vMag = Math.sqrt(v.vx * v.vx + v.vy * v.vy + v.vz * v.vz);

  // Specific angular momentum h = r x v
  const hx = r.y * v.vz - r.z * v.vy;
  const hy = r.z * v.vx - r.x * v.vz;
  const hz = r.x * v.vy - r.y * v.vx;
  const hMag = Math.sqrt(hx * hx + hy * hy + hz * hz);

  // Specific mechanical energy eps = v^2/2 - mu/r
  const energy = (vMag * vMag) / 2.0 - GM_EARTH_KM3_S2 / rMag;

  // Semi-major axis a = -mu / (2 * eps)
  let a = -GM_EARTH_KM3_S2 / (2.0 * energy);
  if (!isFinite(a) || a < 0) {
    a = rMag; // Fallback for near-parabolic or numeric anomalies
  }

  // Eccentricity vector e = ((v^2 - mu/r)*r - (r.v)*v) / mu
  const rDotV = r.x * v.vx + r.y * v.vy + r.z * v.vz;
  const c1 = vMag * vMag - GM_EARTH_KM3_S2 / rMag;
  const ex = (c1 * r.x - rDotV * v.vx) / GM_EARTH_KM3_S2;
  const ey = (c1 * r.y - rDotV * v.vy) / GM_EARTH_KM3_S2;
  const ez = (c1 * r.z - rDotV * v.vz) / GM_EARTH_KM3_S2;
  let e = Math.sqrt(ex * ex + ey * ey + ez * ez);
  if (!isFinite(e) || e < 0) e = 0.0001;

  // Inclination i = acos(hz / h)
  const incDeg = Math.acos(Math.max(-1.0, Math.min(1.0, hz / (hMag || 1)))) * RAD2DEG;

  // Node vector n = k x h = (-hy, hx, 0)
  const nx = -hy;
  const ny = hx;
  const nMag = Math.sqrt(nx * nx + ny * ny);

  // RAAN (Right Ascension of Ascending Node)
  let raanDeg = 0;
  if (nMag > 1e-7) {
    raanDeg = Math.acos(Math.max(-1.0, Math.min(1.0, nx / nMag))) * RAD2DEG;
    if (ny < 0) {
      raanDeg = 360.0 - raanDeg;
    }
  }

  // Argument of Perigee
  let argpDeg = 0;
  if (nMag > 1e-7 && e > 1e-5) {
    const nDotE = nx * ex + ny * ey;
    argpDeg = Math.acos(Math.max(-1.0, Math.min(1.0, nDotE / (nMag * e)))) * RAD2DEG;
    if (ez < 0) {
      argpDeg = 360.0 - argpDeg;
    }
  }

  // True Anomaly nu
  let nuDeg = 0;
  if (e > 1e-5) {
    const eDotR = ex * r.x + ey * r.y + ez * r.z;
    nuDeg = Math.acos(Math.max(-1.0, Math.min(1.0, eDotR / (e * rMag)))) * RAD2DEG;
    if (rDotV < 0) {
      nuDeg = 360.0 - nuDeg;
    }
  }

  // Mean Anomaly via Eccentric Anomaly
  let meanAnomalyDeg = nuDeg;
  if (e < 1.0) {
    const nuRad = nuDeg * DEG2RAD;
    const eccAnomalyRad =
      2.0 * Math.atan2(Math.sqrt(1.0 - e) * Math.sin(nuRad / 2.0), Math.sqrt(1.0 + e) * Math.cos(nuRad / 2.0));
    const meanAnomalyRad = eccAnomalyRad - e * Math.sin(eccAnomalyRad);
    meanAnomalyDeg = ((meanAnomalyRad * RAD2DEG) % 360 + 360) % 360;
  }

  return {
    semiMajorAxis: Math.round(a * 100) / 100,
    eccentricity: Math.round(e * 1000000) / 1000000,
    inclination: Math.round(incDeg * 1000) / 1000,
    raan: Math.round(raanDeg * 1000) / 1000,
    argOfPerigee: Math.round(argpDeg * 1000) / 1000,
    meanAnomaly: Math.round(meanAnomalyDeg * 1000) / 1000,
  };
}

/**
 * Propagate a SatRec object to an arbitrary JavaScript Date timestamp.
 * Returns ECI position, velocity, and WGS-84 altitude.
 */
export function propagateSatrec(satrec: any, date: Date = new Date()): StateVector | null {
  if (!satrec) return null;

  try {
    const posVel = (satellite as any).propagate(satrec, date);
    if (!posVel || !posVel.position || !posVel.velocity) {
      return null;
    }

    const { x, y, z } = posVel.position;
    const { x: vx, y: vy, z: vz } = posVel.velocity;

    if (isNaN(x) || isNaN(y) || isNaN(z) || isNaN(vx) || isNaN(vy) || isNaN(vz)) {
      return null;
    }

    // Convert ECI to geodetic using GMST to get exact WGS-84 altitude
    const gmst = (satellite as any).gstime(date);
    const geodetic = (satellite as any).eciToGeodetic({ x, y, z }, gmst);

    const latDeg = (satellite as any).degreesLat(geodetic.latitude);
    const lonDeg = (satellite as any).degreesLong(geodetic.longitude);
    const altitude = geodetic.height;

    return {
      position: { x, y, z },
      velocity: { vx, vy, vz },
      altitude: Math.round(altitude * 100) / 100,
      latitudeDeg: Math.round(latDeg * 1000) / 1000,
      longitudeDeg: Math.round(lonDeg * 1000) / 1000,
    };
  } catch (e) {
    return null;
  }
}
