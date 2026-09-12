/**
 * Orbital Shell Discretization and Population Counting
 * Aligned with INTERFACE_CONTRACT.md §2.2 and §4
 */

import type { TrackedObject, ShellPopulationUpdatedPayload } from "./types";

export const EARTH_RADIUS_KM = 6371.0;
export const SHELL_BAND_KM = 50.0;
export const LEO_MIN_ALT_KM = 200.0;
export const LEO_MAX_ALT_KM = 1200.0;

export interface ShellDefinition {
  shellId: string;
  altitudeMin: number;
  altitudeMax: number;
  volumeKm3: number;
}

/**
 * Determine shellId for a given altitude.
 * Convention: {regime}_{altMin}_{altMax} in 50 km bands for LEO.
 * e.g., 415 km -> "LEO_400_450"
 */
export function getShellId(altitude: number): string {
  if (altitude < 200) {
    return "VLEO_0_200";
  }
  if (altitude < 1200) {
    const minAlt = Math.floor(altitude / SHELL_BAND_KM) * SHELL_BAND_KM;
    const maxAlt = minAlt + SHELL_BAND_KM;
    return `LEO_${minAlt}_${maxAlt}`;
  }
  if (altitude < 2000) {
    const minAlt = Math.floor(altitude / 100) * 100;
    const maxAlt = minAlt + 100;
    return `LEO_HIGH_${minAlt}_${maxAlt}`;
  }
  if (altitude < 35786) {
    const minAlt = Math.floor(altitude / 1000) * 1000;
    const maxAlt = minAlt + 1000;
    return `MEO_${minAlt}_${maxAlt}`;
  }
  return "GEO_35700_35800";
}

/**
 * Parse shell ID string into altitude min and max boundaries.
 * e.g., "LEO_400_450" -> { min: 400, max: 450 }
 */
export function parseShellBounds(shellId: string): { min: number; max: number } {
  const parts = shellId.split("_");
  if (parts.length >= 3) {
    const min = parseFloat(parts[parts.length - 2]);
    const max = parseFloat(parts[parts.length - 1]);
    if (!isNaN(min) && !isNaN(max)) {
      return { min, max };
    }
  }
  return { min: 400, max: 450 }; // safe fallback
}

/**
 * Calculate the spherical shell volume in km³.
 * V = 4/3 * pi * (R_outer³ - R_inner³)
 */
export function computeShellVolume(altitudeMin: number, altitudeMax: number): number {
  const rInner = EARTH_RADIUS_KM + altitudeMin;
  const rOuter = EARTH_RADIUS_KM + altitudeMax;
  return (4 / 3) * Math.PI * (Math.pow(rOuter, 3) - Math.pow(rInner, 3));
}

/**
 * Generates the standard discrete LEO shell definitions (e.g., 200 km to 1000 km in 50 km bands)
 */
export function getStandardLEOShells(): ShellDefinition[] {
  const shells: ShellDefinition[] = [];
  for (let alt = LEO_MIN_ALT_KM; alt < LEO_MAX_ALT_KM; alt += SHELL_BAND_KM) {
    const altitudeMin = alt;
    const altitudeMax = alt + SHELL_BAND_KM;
    const shellId = `LEO_${altitudeMin}_${altitudeMax}`;
    shells.push({
      shellId,
      altitudeMin,
      altitudeMax,
      volumeKm3: computeShellVolume(altitudeMin, altitudeMax),
    });
  }
  return shells;
}

/**
 * Bins tracked objects into orbital shells and classifies populations:
 * - Susceptible (S): active satellites + intact rocket bodies
 * - Infected (I): debris fragments
 * - Removed (R): decayed / deorbited objects
 *
 * Returns ShellPopulationUpdatedPayload matching INTERFACE_CONTRACT.md §2.2
 */
export function computeShellPopulations(
  objects: TrackedObject[],
  timestamp: string = new Date().toISOString()
): ShellPopulationUpdatedPayload {
  const standardShells = getStandardLEOShells();
  const map = new Map<
    string,
    {
      altitudeMin: number;
      altitudeMax: number;
      objectCount: number;
      debrisCount: number;
      activeCount: number;
    }
  >();

  // Initialize standard shells so even empty shells are represented
  for (const s of standardShells) {
    map.set(s.shellId, {
      altitudeMin: s.altitudeMin,
      altitudeMax: s.altitudeMax,
      objectCount: 0,
      debrisCount: 0,
      activeCount: 0,
    });
  }

  for (const obj of objects) {
    const shellId = obj.shellId || getShellId(obj.altitude);
    let entry = map.get(shellId);
    if (!entry) {
      const bounds = parseShellBounds(shellId);
      entry = {
        altitudeMin: bounds.min,
        altitudeMax: bounds.max,
        objectCount: 0,
        debrisCount: 0,
        activeCount: 0,
      };
      map.set(shellId, entry);
    }

    entry.objectCount += 1;
    if (obj.type === "debris") {
      entry.debrisCount += 1;
    } else if (obj.type === "satellite" || obj.type === "rocket_body") {
      entry.activeCount += 1;
    }
  }

  const shells = Array.from(map.entries())
    .map(([shellId, data]) => ({
      shellId,
      ...data,
    }))
    .sort((a, b) => a.altitudeMin - b.altitudeMin);

  return {
    timestamp,
    shells,
  };
}
