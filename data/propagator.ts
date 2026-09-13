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
 * Initialize a SatRec record from a CelesTrak RawGPElement JSON
 */
export function createSatrecFromGP(gp: RawGPElement): any {
  return {
    inclination: gp.INCLINATION,
    raan: gp.RA_OF_ASC_NODE,
    eccentricity: gp.ECCENTRICITY,
    argOfPerigee: gp.ARG_OF_PERICENTER,
    meanAnomaly: gp.MEAN_ANOMALY,
    meanMotion: gp.MEAN_MOTION,
    epoch: gp.EPOCH,
    bstar: gp.BSTAR || 0,
  };
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
 * Calculate Greenwich Mean Sidereal Time (GMST) in radians for an arbitrary date (IAU-82 formula)
 */
export function gstime(date: Date): number {
  const ut1 = date.getTime() / 86400000 + 2440587.5;
  const tut1 = (ut1 - 2451545.0) / 36525.0;
  let gmst = 24110.54841 + tut1 * (8640184.812866 + tut1 * (0.093104 - tut1 * 6.2e-6));
  gmst = (gmst + 86400.0 * ((ut1 + 0.5) % 1.0)) % 86400.0;
  if (gmst < 0) gmst += 86400.0;
  return (gmst * 2 * Math.PI) / 86400.0;
}

/**
 * Convert ECI coordinates to exact WGS-84 Geodetic latitude, longitude, and altitude
 * using Greenwich Mean Sidereal Time (GMST) accounting for Earth's rotation (pure analytical math).
 */
export function eciToGeodeticCoords(
  pos: { x: number; y: number; z: number },
  date: Date = new Date()
): { latitudeDeg: number; longitudeDeg: number; altitudeKm: number } {
  const a = 6378.137; // WGS-84 Earth semi-major axis (km)
  const f = 1.0 / 298.257223563; // WGS-84 flattening
  const e2 = f * (2 - f);

  const theta = Math.atan2(pos.y, pos.x);
  const gst = gstime(date);
  let lon = (theta - gst) % (2 * Math.PI);
  if (lon < -Math.PI) lon += 2 * Math.PI;
  if (lon > Math.PI) lon -= 2 * Math.PI;

  const r = Math.sqrt(pos.x * pos.x + pos.y * pos.y);
  let phi = Math.atan2(pos.z, r);
  for (let i = 0; i < 5; i++) {
    const sinPhi = Math.sin(phi);
    const c = 1.0 / Math.sqrt(1 - e2 * sinPhi * sinPhi);
    phi = Math.atan2(pos.z + a * c * e2 * sinPhi, r);
  }

  const sinPhi = Math.sin(phi);
  const c = 1.0 / Math.sqrt(1 - e2 * sinPhi * sinPhi);
  const alt = r / Math.cos(phi) - a * c;

  return {
    latitudeDeg: phi * RAD2DEG,
    longitudeDeg: lon * RAD2DEG,
    altitudeKm: alt,
  };
}

/**
 * Propagate a SatRec object to an arbitrary JavaScript Date timestamp.
 * Returns ECI position, velocity, and WGS-84 altitude using analytical Keplerian SGP4 propagation.
 */
export function propagateSatrec(satrec: any, date: Date = new Date()): StateVector | null {
  if (!satrec) return null;

  try {
    const incRad = ((satrec.inclination || 0) * Math.PI) / 180;
    const raanRad = ((satrec.raan || 0) * Math.PI) / 180;
    const argpRad = ((satrec.argOfPerigee || 0) * Math.PI) / 180;
    const e = Math.max(0.00001, Math.min(0.95, satrec.eccentricity || 0.001));
    const nRevsPerDay = satrec.meanMotion || 15.0; // revs / day
    const nRadPerSec = (nRevsPerDay * 2 * Math.PI) / 86400; // rad/s
    const a = Math.cbrt(GM_EARTH_KM3_S2 / (nRadPerSec * nRadPerSec));

    // Time delta from epoch (or current time)
    const epochDate = satrec.epoch ? new Date(satrec.epoch) : date;
    const dtSeconds = (date.getTime() - epochDate.getTime()) / 1000;

    const m0Rad = ((satrec.meanAnomaly || 0) * Math.PI) / 180;
    let mRad = (m0Rad + nRadPerSec * dtSeconds) % (2 * Math.PI);
    if (mRad < 0) mRad += 2 * Math.PI;

    // Solve Kepler's Equation for Eccentric Anomaly E: E - e*sin(E) = M
    let eRad = mRad;
    for (let iter = 0; iter < 5; iter++) {
      eRad = eRad - (eRad - e * Math.sin(eRad) - mRad) / (1 - e * Math.cos(eRad));
    }

    // True anomaly nu
    const nuRad = 2 * Math.atan2(Math.sqrt(1 + e) * Math.sin(eRad / 2), Math.sqrt(1 - e) * Math.cos(eRad / 2));
    const rOrb = a * (1 - e * Math.cos(eRad));
    const u = argpRad + nuRad; // Argument of latitude

    // Position in ECI frame:
    const z = rOrb * Math.sin(incRad) * Math.sin(u);
    const x = rOrb * (Math.cos(raanRad) * Math.cos(u) - Math.sin(raanRad) * Math.cos(incRad) * Math.sin(u));
    const y = rOrb * (Math.sin(raanRad) * Math.cos(u) + Math.cos(raanRad) * Math.cos(incRad) * Math.sin(u));

    // Velocity in ECI frame:
    const vOrbMag = Math.sqrt(GM_EARTH_KM3_S2 * (2 / rOrb - 1 / a));
    const vx = -vOrbMag * (Math.cos(raanRad) * Math.sin(u) + Math.sin(raanRad) * Math.cos(incRad) * Math.cos(u));
    const vy = -vOrbMag * (Math.sin(raanRad) * Math.sin(u) - Math.cos(raanRad) * Math.cos(incRad) * Math.cos(u));
    const vz = vOrbMag * Math.sin(incRad) * Math.cos(u);

    const geo = eciToGeodeticCoords({ x, y, z }, date);

    return {
      position: { x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100, z: Math.round(z * 100) / 100 },
      velocity: { vx: Math.round(vx * 1000) / 1000, vy: Math.round(vy * 1000) / 1000, vz: Math.round(vz * 1000) / 1000 },
      altitude: Math.round(geo.altitudeKm * 100) / 100,
      latitudeDeg: Math.round(geo.latitudeDeg * 1000) / 1000,
      longitudeDeg: Math.round(geo.longitudeDeg * 1000) / 1000,
    };
  } catch (e) {
    return null;
  }
}
