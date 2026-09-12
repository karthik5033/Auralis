/**
 * Epidemic Forecaster Agent Module
 * Generates cascade risk assessments and R₀ projections across orbital shells.
 * Aligned with BRIEF_DATA.md Task C4 and INTERFACE_CONTRACT.md §2.6
 */

import type {
  TrackedObject,
  CascadeForecastCompletePayload,
  CascadeTrend,
} from "./types";
import { buildAllShellRiskSnapshots } from "./cascade";

/**
 * Executes the Epidemic Forecaster pipeline on a current tracked catalog.
 * Produces CascadeForecastCompletePayload ready to be consumed by the Advisory Agent
 * or served via GET /api/v1/shells.
 */
export function runEpidemicForecast(
  objects: TrackedObject[],
  timestamp: string = new Date().toISOString()
): CascadeForecastCompletePayload {
  const shellSnapshots = buildAllShellRiskSnapshots(objects, timestamp);

  // Identify shells where R₀ > 1.0 (runaway cascade risk)
  const criticalShells = shellSnapshots
    .filter((s) => s.r0 > 1.0)
    .map((s) => s.shellId);

  let overallTrend: CascadeTrend = "stable";
  if (criticalShells.length > 0) {
    overallTrend = "increasing";
  } else {
    const decreasingCount = shellSnapshots.filter((s) => s.trend === "decreasing").length;
    if (decreasingCount > shellSnapshots.length / 2) {
      overallTrend = "decreasing";
    }
  }

  return {
    timestamp,
    shellSnapshots,
    criticalShells,
    overallTrend,
  };
}
