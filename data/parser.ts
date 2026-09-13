/**
 * TLE Parser: Converts RawGPElement records into TrackedObject
 * Aligned strictly with INTERFACE_CONTRACT.md §1.1 and BRIEF_DATA.md A2, A4
 */

import { randomUUID } from "crypto";
import type { RawGPElement, TrackedObject, ObjectType, ObjectStatus } from "./types";
import { createSatrecFromGP, propagateSatrec, deriveKeplerianElements } from "./propagator";
import { getShellId } from "./shells";

// Default position uncertainty covariance upper triangle (km²):
// σ_xx = 1.0 km² (in-track), σ_yy = 0.25 km² (cross-track), σ_zz = 0.25 km² (radial), off-diagonals = 0.0
// Row-major upper triangle: [σ_xx, σ_xy, σ_xz, σ_yy, σ_yz, σ_zz]
export const DEFAULT_COVARIANCE_UPPER_TRIANGLE: [number, number, number, number, number, number] = [
  1.0, 0.0, 0.0, 0.25, 0.0, 0.25,
];

/**
 * Classify object type based on CelesTrak fields and name heuristics
 */
export function classifyObjectType(gp: RawGPElement): ObjectType {
  const typeStr = (gp.OBJECT_TYPE || "").toUpperCase();
  const name = (gp.OBJECT_NAME || "").toUpperCase();

  if (typeStr.includes("DEBRIS") || name.includes(" DEB") || name.includes("DEBRIS") || name.includes("FRAGMENT")) {
    return "debris";
  }
  if (typeStr.includes("ROCKET") || name.includes(" R/B") || name.includes("ROCKET")) {
    return "rocket_body";
  }
  if (typeStr.includes("PAYLOAD") || (!typeStr && !name.includes("DEB") && !name.includes("R/B"))) {
    return "satellite";
  }
  return "unknown";
}

/**
 * Assign simulated operator ID.
 * Active satellites belong to one of two simulated commercial constellation operators ("op-001" or "op-002").
 * Debris and rocket bodies have no active operator (null).
 */
export function assignOperatorId(noradId: number, type: ObjectType): string | null {
  if (type !== "satellite") {
    return null;
  }
  return noradId % 2 === 0 ? "op-001" : "op-002";
}

/**
 * Parses a single RawGPElement into a full TrackedObject.
 * Runs SGP4 propagation at the requested date (default: now).
 */
export function parseGPToTrackedObject(
  gp: RawGPElement,
  propagationDate: Date = new Date(),
  cachedSatrec?: any
): TrackedObject | null {
  const satrec = cachedSatrec || createSatrecFromGP(gp);
  if (!satrec) return null;

  const state = propagateSatrec(satrec, propagationDate);
  if (!state) return null;

  const type = classifyObjectType(gp);
  const operatorId = assignOperatorId(gp.NORAD_CAT_ID, type);
  const orbitalElements = deriveKeplerianElements(state.position, state.velocity);
  const shellId = getShellId(state.altitude);

  const status: ObjectStatus =
    state.altitude < 120 ? "decayed" : type === "satellite" ? "active" : "unknown";

  const isoTimestamp = propagationDate.toISOString();

  return {
    id: randomUUID(),
    noradId: gp.NORAD_CAT_ID,
    name: gp.OBJECT_NAME || `OBJ-${gp.NORAD_CAT_ID}`,
    type,
    operatorId,
    position: {
      x: Math.round(state.position.x * 1000) / 1000,
      y: Math.round(state.position.y * 1000) / 1000,
      z: Math.round(state.position.z * 1000) / 1000,
    },
    velocity: {
      vx: Math.round(state.velocity.vx * 10000) / 10000,
      vy: Math.round(state.velocity.vy * 10000) / 10000,
      vz: Math.round(state.velocity.vz * 10000) / 10000,
    },
    orbitalElements,
    covarianceUpperTriangle: [...DEFAULT_COVARIANCE_UPPER_TRIANGLE],
    altitude: state.altitude,
    shellId,
    epoch: gp.EPOCH ? new Date(gp.EPOCH).toISOString() : isoTimestamp,
    lastUpdated: isoTimestamp,
    status,
  };
}

/**
 * Parses raw TLE line 1 and line 2 strings into a RawGPElement structure.
 */
export function parseTleLinesToGP(line1: string, line2: string, name: string = ""): RawGPElement {
  const noradId = parseInt(line1.substring(2, 7).trim(), 10) || 99999;
  const inc = parseFloat(line2.substring(8, 16).trim()) || 0;
  const raan = parseFloat(line2.substring(17, 25).trim()) || 0;
  const eccStr = "0." + line2.substring(26, 33).trim();
  const ecc = parseFloat(eccStr) || 0.001;
  const argp = parseFloat(line2.substring(34, 42).trim()) || 0;
  const ma = parseFloat(line2.substring(43, 51).trim()) || 0;
  const mm = parseFloat(line2.substring(52, 63).trim()) || 15.0;

  return {
    OBJECT_NAME: name || `OBJ-${noradId}`,
    OBJECT_ID: line1.substring(9, 17).trim() || `${noradId}`,
    EPOCH: new Date().toISOString(),
    MEAN_MOTION: mm,
    ECCENTRICITY: ecc,
    INCLINATION: inc,
    RA_OF_ASC_NODE: raan,
    ARG_OF_PERICENTER: argp,
    MEAN_ANOMALY: ma,
    EPHEMERIS_TYPE: 0,
    CLASSIFICATION_TYPE: line1.charAt(7) || "U",
    NORAD_CAT_ID: noradId,
    ELEMENT_SET_NO: 999,
    REV_AT_EPOCH: parseInt(line2.substring(63, 68).trim(), 10) || 0,
    BSTAR: 0.0001,
    MEAN_MOTION_DOT: 0,
    MEAN_MOTION_DDOT: 0,
    OBJECT_TYPE: name.toUpperCase().includes("DEB") ? "DEBRIS" : name.toUpperCase().includes("R/B") ? "ROCKET BODY" : "PAYLOAD",
  };
}
