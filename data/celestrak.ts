/**
 * CelesTrak Ingestion Engine
 * Fetches real-time GP-element JSON from CelesTrak with automatic offline cache fallback.
 * Aligned with BRIEF_DATA.md Task A1 and A5
 */

import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import type { RawGPElement } from "./types";

const CELESTRAK_BASE_URL = "https://celestrak.org/NORAD/elements/gp.php";
const DEFAULT_TIMEOUT_MS = 5000;

// Resolve fixture directory relative to this file
function getFixturesDir(): string {
  try {
    const currentDir = path.dirname(fileURLToPath(import.meta.url));
    return path.join(currentDir, "fixtures");
  } catch {
    return path.join(process.cwd(), "data", "fixtures");
  }
}

/**
 * Load local bundled fixture as an offline fallback
 */
export function loadLocalFixture(filename: string): RawGPElement[] {
  try {
    const filePath = path.join(getFixturesDir(), filename);
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, "utf-8");
      return JSON.parse(raw);
    }
  } catch (err) {
    console.warn(`[CelesTrak] Warning: Could not load local fixture ${filename}:`, err);
  }
  return [];
}

/**
 * Load the bundled curated demo catalog (631 objects: stations, LEO satellites, and debris)
 */
export function loadCuratedCatalog(): RawGPElement[] {
  const curated = loadLocalFixture("celestrak-curated.json");
  if (curated.length > 0) {
    return curated;
  }
  // Fallback to stations + debris if curated missing
  const stations = loadLocalFixture("celestrak-stations.json");
  const debris = loadLocalFixture("celestrak-debris.json");
  return [...stations, ...debris];
}

/**
 * Fetch GP elements for a specific CelesTrak group with fallback
 * Example groups: "stations", "active", "starlink", "iridium-33-debris"
 */
export async function fetchCelesTrakGroup(
  group: string = "stations",
  timeoutMs: number = DEFAULT_TIMEOUT_MS
): Promise<RawGPElement[]> {
  const url = `${CELESTRAK_BASE_URL}?GROUP=${encodeURIComponent(group)}&FORMAT=json`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": "Auralis-Space-Intel/1.0",
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} from CelesTrak`);
    }

    const data = (await response.json()) as RawGPElement[];
    if (Array.isArray(data) && data.length > 0) {
      return data;
    }
    throw new Error("Empty response from CelesTrak");
  } catch (err: any) {
    console.warn(`[CelesTrak] Live fetch for group '${group}' failed (${err?.message || err}). Falling back to local fixtures.`);

    if (group === "stations") {
      return loadLocalFixture("celestrak-stations.json");
    }
    if (group.includes("debris") || group === "1982-092A") {
      return loadLocalFixture("celestrak-debris.json");
    }
    return loadCuratedCatalog();
  }
}

/**
 * Fetch a curated subset (500–1,500 objects) spanning active satellites and debris in key LEO shells.
 * Satisfies BRIEF_DATA.md A5 & PRD §Assumptions #4.
 */
export async function fetchCuratedCatalog(limit: number = 800): Promise<RawGPElement[]> {
  // Always load curated catalog or fetch live if needed
  const localCurated = loadCuratedCatalog();
  if (localCurated.length >= 200) {
    return localCurated.slice(0, limit);
  }

  // If local fixture is somehow small, try fetching live stations + debris
  try {
    const [stations, debris] = await Promise.all([
      fetchCelesTrakGroup("stations", 3000),
      fetchCelesTrakGroup("iridium-33-debris", 3000),
    ]);

    const combined = [...stations, ...debris];
    return combined.slice(0, limit);
  } catch {
    return localCurated;
  }
}
