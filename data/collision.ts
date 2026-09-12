/**
 * Collision Probability (Pc) Math Library
 * Implements Foster-1992 2-D Short-Encounter Collision Probability & Monte Carlo Fallback
 * Aligned with BRIEF_DATA.md Tasks B1 & B2 and INTERFACE_CONTRACT.md §1.2
 */

import type { TrackedObject } from "./types";

export const DEFAULT_HBR_SAT_SAT_KM = 0.01; // 10 meters combined hard-body radius for satellite-satellite
export const DEFAULT_HBR_SAT_DEB_KM = 0.002; // 2 meters for satellite-debris

export interface ConjunctionGeometry {
  missDistanceKm: number;
  relativeVelocityKmS: number;
  bPlaneXKm: number;
  bPlaneYKm: number;
  combinedCovarianceDet: number;
}

/**
 * Reconstruct a 3x3 symmetric covariance matrix from upper triangle:
 * [σ_xx, σ_xy, σ_xz, σ_yy, σ_yz, σ_zz]
 */
export function unpackUpperTriangle(
  upper: [number, number, number, number, number, number]
): number[][] {
  return [
    [upper[0], upper[1], upper[2]],
    [upper[1], upper[3], upper[4]],
    [upper[2], upper[4], upper[5]],
  ];
}

/**
 * Compute the encounter geometry and B-plane relative state vector
 */
export function computeEncounterGeometry(
  primary: TrackedObject,
  secondary: TrackedObject
): {
  missDistanceKm: number;
  relativeSpeedKmS: number;
  vRel: { x: number; y: number; z: number };
  deltaR: { x: number; y: number; z: number };
  iHat: { x: number; y: number; z: number };
  jHat: { x: number; y: number; z: number };
  kHat: { x: number; y: number; z: number };
  xe: number;
  ye: number;
} {
  // Relative position vector: Δr = r1 - r2
  const deltaR = {
    x: primary.position.x - secondary.position.x,
    y: primary.position.y - secondary.position.y,
    z: primary.position.z - secondary.position.z,
  };
  const missDistanceKm = Math.sqrt(
    deltaR.x * deltaR.x + deltaR.y * deltaR.y + deltaR.z * deltaR.z
  );

  // Relative velocity vector: v_rel = v1 - v2
  const vRel = {
    x: primary.velocity.vx - secondary.velocity.vx,
    y: primary.velocity.vy - secondary.velocity.vy,
    z: primary.velocity.vz - secondary.velocity.vz,
  };
  const relativeSpeedKmS = Math.sqrt(
    vRel.x * vRel.x + vRel.y * vRel.y + vRel.z * vRel.z
  );

  // Unit vector along relative velocity: kHat = vRel / ||vRel||
  const vNorm = relativeSpeedKmS > 1e-6 ? relativeSpeedKmS : 1.0;
  const kHat = { x: vRel.x / vNorm, y: vRel.y / vNorm, z: vRel.z / vNorm };

  // Primary orbit normal: h = r1 x v1
  const hx = primary.position.y * primary.velocity.vz - primary.position.z * primary.velocity.vy;
  const hy = primary.position.z * primary.velocity.vx - primary.position.x * primary.velocity.vz;
  const hz = primary.position.x * primary.velocity.vy - primary.position.y * primary.velocity.vx;
  const hMag = Math.sqrt(hx * hx + hy * hy + hz * hz) || 1.0;
  const hHat = { x: hx / hMag, y: hy / hMag, z: hz / hMag };

  // Encounter plane axes:
  // iHat = (kHat x hHat) / ||kHat x hHat||
  let ix = kHat.y * hHat.z - kHat.z * hHat.y;
  let iy = kHat.z * hHat.x - kHat.x * hHat.z;
  let iz = kHat.x * hHat.y - kHat.y * hHat.x;
  let iMag = Math.sqrt(ix * ix + iy * iy + iz * iz);

  if (iMag < 1e-6) {
    // If kHat and hHat are parallel, pick an arbitrary orthogonal vector
    ix = -kHat.y;
    iy = kHat.x;
    iz = 0;
    iMag = Math.sqrt(ix * ix + iy * iy) || 1.0;
  }
  const iHat = { x: ix / iMag, y: iy / iMag, z: iz / iMag };

  // jHat = kHat x iHat
  const jHat = {
    x: kHat.y * iHat.z - kHat.z * iHat.y,
    y: kHat.z * iHat.x - kHat.x * iHat.z,
    z: kHat.x * iHat.y - kHat.y * iHat.x,
  };

  // Projection of deltaR onto the encounter plane (xe, ye)
  const xe = deltaR.x * iHat.x + deltaR.y * iHat.y + deltaR.z * iHat.z;
  const ye = deltaR.x * jHat.x + deltaR.y * jHat.y + deltaR.z * jHat.z;

  return {
    missDistanceKm,
    relativeSpeedKmS,
    vRel,
    deltaR,
    iHat,
    jHat,
    kHat,
    xe,
    ye,
  };
}

/**
 * Foster-1992 Short-Encounter 2-D Collision Probability (Pc)
 *
 * @param primary Primary tracked object
 * @param secondary Secondary tracked object
 * @param hardBodyRadius Combined hard-body radius in km (default: 0.010 km for sat-sat, 0.002 km for sat-debris)
 * @returns Dimensionless collision probability Pc (0.0 to 1.0)
 */
export function computePc(
  primary: TrackedObject,
  secondary: TrackedObject,
  hardBodyRadius?: number
): number {
  // If objects are identical, Pc = 0
  if (primary.id === secondary.id || primary.noradId === secondary.noradId) {
    return 0.0;
  }

  // Determine appropriate combined hard-body radius
  const hbr =
    hardBodyRadius ??
    (primary.type === "satellite" && secondary.type === "satellite"
      ? DEFAULT_HBR_SAT_SAT_KM
      : DEFAULT_HBR_SAT_DEB_KM);

  const geom = computeEncounterGeometry(primary, secondary);

  // Pre-filter: If miss distance is far greater than 10 sigma (e.g. > 20 km), Pc is effectively 0
  if (geom.missDistanceKm > 25.0) {
    return 0.0;
  }

  // Combine 3x3 covariances: C_comb = C1 + C2
  const c1 = unpackUpperTriangle(primary.covarianceUpperTriangle);
  const c2 = unpackUpperTriangle(secondary.covarianceUpperTriangle);
  const cComb: number[][] = [
    [c1[0][0] + c2[0][0], c1[0][1] + c2[0][1], c1[0][2] + c2[0][2]],
    [c1[1][0] + c2[1][0], c1[1][1] + c2[1][1], c1[1][2] + c2[1][2]],
    [c1[2][0] + c2[2][0], c1[2][1] + c2[2][1], c1[2][2] + c2[2][2]],
  ];

  // Project combined covariance onto 2D encounter plane:
  // C_2D = [iHat, jHat]^T * C_comb * [iHat, jHat]
  const project = (u: { x: number; y: number; z: number }, v: { x: number; y: number; z: number }): number => {
    return (
      u.x * (cComb[0][0] * v.x + cComb[0][1] * v.y + cComb[0][2] * v.z) +
      u.y * (cComb[1][0] * v.x + cComb[1][1] * v.y + cComb[1][2] * v.z) +
      u.z * (cComb[2][0] * v.x + cComb[2][1] * v.y + cComb[2][2] * v.z)
    );
  };

  const c11 = project(geom.iHat, geom.iHat);
  const c12 = project(geom.iHat, geom.jHat);
  const c22 = project(geom.jHat, geom.jHat);

  // Determinant of 2D encounter covariance
  const det = c11 * c22 - c12 * c12;
  if (det <= 1e-12) {
    return 0.0;
  }

  const sqrtDet = Math.sqrt(det);

  // Mahalanobis distance squared in the encounter plane:
  // d_m² = [xe, ye] * C_2D⁻¹ * [xe, ye]^T
  // C_2D⁻¹ = (1/det) * [[c22, -c12], [-c12, c11]]
  const mahalanobisSq = (c22 * geom.xe * geom.xe - 2.0 * c12 * geom.xe * geom.ye + c11 * geom.ye * geom.ye) / det;

  // If Mahalanobis distance is huge, Pc underflows
  if (mahalanobisSq > 50.0) {
    return 0.0;
  }

  // Foster-1992 integration over small circular cross-section:
  // Since HBR is orders of magnitude smaller than σ (e.g. 10m vs 1km),
  // Gaussian probability density is virtually uniform over the collision disk:
  // Pc = Area_disk * Density_center = (π * HBR²) * [1 / (2π * sqrt(det))] * exp(-0.5 * d_m²)
  //    = (HBR² / (2 * sqrt(det))) * exp(-0.5 * mahalanobisSq)
  const pc = (Math.pow(hbr, 2) / (2.0 * sqrtDet)) * Math.exp(-0.5 * mahalanobisSq);

  // Clamp probability to valid physical range [0, 1]
  return Math.min(1.0, Math.max(0.0, pc));
}

/**
 * Monte Carlo Collision Probability verification fallback (Task B2)
 * Draws N position samples from each object's covariance and counts overlaps within HBR.
 */
export function computePcMonteCarlo(
  primary: TrackedObject,
  secondary: TrackedObject,
  samples: number = 10000,
  hardBodyRadius?: number
): number {
  const hbr =
    hardBodyRadius ??
    (primary.type === "satellite" && secondary.type === "satellite"
      ? DEFAULT_HBR_SAT_SAT_KM
      : DEFAULT_HBR_SAT_DEB_KM);

  const geom = computeEncounterGeometry(primary, secondary);
  if (geom.missDistanceKm > 20.0) return 0.0;

  // Gaussian random sample generator (Box-Muller)
  function randomGaussian(): number {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  }

  const c1 = unpackUpperTriangle(primary.covarianceUpperTriangle);
  const c2 = unpackUpperTriangle(secondary.covarianceUpperTriangle);

  // Combined standard deviations
  const sigmaX = Math.sqrt(c1[0][0] + c2[0][0]);
  const sigmaY = Math.sqrt(c1[1][1] + c2[1][1]);

  let hits = 0;
  const hbrSq = hbr * hbr;

  for (let i = 0; i < samples; i++) {
    const dx = geom.xe + sigmaX * randomGaussian();
    const dy = geom.ye + sigmaY * randomGaussian();
    if (dx * dx + dy * dy <= hbrSq) {
      hits++;
    }
  }

  return hits / samples;
}
