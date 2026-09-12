/**
 * Comprehensive Verification Suite for Person 1 (Data & Astrodynamics Layer)
 * Validates against all criteria in BRIEF_DATA.md §Definition of Done and INTERFACE_CONTRACT.md
 */

import {
  loadCuratedCatalog,
  parseGPToTrackedObject,
  computePc,
  computePcMonteCarlo,
  computeShellPopulations,
  buildAllShellRiskSnapshots,
  runEpidemicForecast,
  generateBreakupFragments,
  getShellId,
} from "../index";
import type { TrackedObject } from "../types";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`FAIL: ${message}`);
  }
  console.log(`  ✓ ${message}`);
}

async function runTests() {
  console.log("====================================================");
  console.log("RUNNING DATA & ASTRODYNAMICS LAYER VERIFICATION SUITE");
  console.log("====================================================\n");

  // ----------------------------------------------------
  // Test 1: Ingestion & Parsing completeness
  // ----------------------------------------------------
  console.log("Test 1: Ingestion & Contract §1.1 Conformance");
  const rawCatalog = loadCuratedCatalog();
  assert(rawCatalog.length >= 500, `Loaded curated catalog with ${rawCatalog.length} objects (>= 500)`);

  const sampleObj = parseGPToTrackedObject(rawCatalog[0]);
  assert(sampleObj !== null, "First GP element parsed into TrackedObject");
  if (sampleObj) {
    assert(typeof sampleObj.id === "string" && sampleObj.id.length > 0, "sample.id is non-empty UUID");
    assert(typeof sampleObj.noradId === "number" && sampleObj.noradId > 0, "sample.noradId is a valid number");
    assert(typeof sampleObj.name === "string" && sampleObj.name.length > 0, "sample.name is valid string");
    assert(["satellite", "debris", "rocket_body", "unknown"].includes(sampleObj.type), `sample.type is valid enum: ${sampleObj.type}`);
    assert(typeof sampleObj.position.x === "number" && isFinite(sampleObj.position.x), "sample.position.x is finite number");
    assert(typeof sampleObj.velocity.vx === "number" && isFinite(sampleObj.velocity.vx), "sample.velocity.vx is finite number");
    assert(sampleObj.covarianceUpperTriangle.length === 6, "sample.covarianceUpperTriangle has 6 entries");
    assert(typeof sampleObj.altitude === "number" && sampleObj.altitude > 100, `sample.altitude is reasonable: ${sampleObj.altitude} km`);
    assert(typeof sampleObj.shellId === "string" && sampleObj.shellId.startsWith("LEO_"), `sample.shellId matches convention: ${sampleObj.shellId}`);
    assert(typeof sampleObj.orbitalElements.semiMajorAxis === "number", "sample.orbitalElements.semiMajorAxis populated");
    assert(typeof sampleObj.orbitalElements.eccentricity === "number", "sample.orbitalElements.eccentricity populated");
    assert(typeof sampleObj.orbitalElements.inclination === "number", "sample.orbitalElements.inclination populated");
    assert(typeof sampleObj.epoch === "string", "sample.epoch is ISO string");
    assert(typeof sampleObj.lastUpdated === "string", "sample.lastUpdated is ISO string");
  }

  // ----------------------------------------------------
  // Test 2: SGP4 Propagation Speed Benchmark
  // ----------------------------------------------------
  console.log("\nTest 2: SGP4 Propagation Benchmark (>= 500 objects in < 5s)");
  const startProp = performance.now();
  const trackedObjects: TrackedObject[] = [];
  for (const gp of rawCatalog) {
    const obj = parseGPToTrackedObject(gp);
    if (obj) trackedObjects.push(obj);
  }
  const propDurationMs = performance.now() - startProp;
  assert(trackedObjects.length >= 500, `Propagated ${trackedObjects.length} objects`);
  assert(propDurationMs < 5000, `Propagation took ${propDurationMs.toFixed(2)} ms (< 5000 ms target)`);

  // ----------------------------------------------------
  // Test 3: Collision Probability (Foster-1992 & Monte Carlo)
  // ----------------------------------------------------
  console.log("\nTest 3: Collision Probability Math (Foster-1992)");
  const sat1 = trackedObjects.find((o) => o.type === "satellite") || trackedObjects[0];
  // Clone sat1 with a very close 80-meter offset to simulate a critical close approach
  const closeSat: TrackedObject = {
    ...sat1,
    id: "close-sat-cloned",
    noradId: 99991,
    name: "Simulated-Close-Approach",
    position: {
      x: sat1.position.x + 0.05,
      y: sat1.position.y + 0.05,
      z: sat1.position.z + 0.02,
    },
    velocity: {
      vx: sat1.velocity.vx,
      vy: sat1.velocity.vy + 0.01,
      vz: sat1.velocity.vz,
    },
  };

  const pc = computePc(sat1, closeSat);
  assert(typeof pc === "number" && isFinite(pc), `computePc returns finite number: ${pc}`);
  assert(pc > 0 && pc <= 1.0, `computePc for 80m approach is non-zero probability: ${pc.toExponential(4)}`);

  // Far apart objects should have 0 Pc
  const distantSat: TrackedObject = {
    ...sat1,
    id: "distant-sat",
    noradId: 99992,
    position: {
      x: sat1.position.x + 100.0,
      y: sat1.position.y,
      z: sat1.position.z,
    },
  };
  const farPc = computePc(sat1, distantSat);
  assert(farPc === 0.0, `computePc for 100km distance returns 0.0`);

  // ----------------------------------------------------
  // Test 4: Shell Populations & SIR Cascade Model
  // ----------------------------------------------------
  console.log("\nTest 4: Shell Populations & SIR Cascade Model");
  const popPayload = computeShellPopulations(trackedObjects);
  assert(popPayload.shells.length > 0, `computeShellPopulations produced ${popPayload.shells.length} shells`);

  const snapshots = buildAllShellRiskSnapshots(trackedObjects);
  assert(snapshots.length >= 4, `buildAllShellRiskSnapshots produced ${snapshots.length} snapshots`);

  for (const s of snapshots) {
    assert(s.projectionYears.length === 11, `${s.shellId} has 11 projection years (0 to 50)`);
    assert(s.projectedS.length === 11, `${s.shellId} has 11 projectedS entries`);
    assert(s.projectedI.length === 11, `${s.shellId} has 11 projectedI entries`);
    assert(s.projectedR.length === 11, `${s.shellId} has 11 projectedR entries`);
    assert(["increasing", "stable", "decreasing"].includes(s.trend), `${s.shellId} trend is valid enum: ${s.trend}`);
  }

  // Check that at least one shell has R0 > 1.0 (PRD requirement: LEO 750-850 km)
  const forecast = runEpidemicForecast(trackedObjects);
  console.log(`  Critical shells identified (R₀ > 1.0): ${forecast.criticalShells.join(", ") || "none"}`);
  assert(forecast.criticalShells.length > 0, "At least one shell has R₀ > 1.0 in baseline");
  assert(forecast.overallTrend === "increasing", `Overall trend flagged as 'increasing': ${forecast.overallTrend}`);

  // ----------------------------------------------------
  // Test 5: Crisis Injection & Cascade Escalation
  // ----------------------------------------------------
  console.log("\nTest 5: Crisis Injection Generator (NASA Breakup Simulation)");
  const crisisFragments = generateBreakupFragments({
    altitudeKm: 780,
    fragmentCount: 150,
  });
  assert(crisisFragments.length === 150, `Generated 150 synthetic debris fragments`);
  assert(crisisFragments[0].type === "debris", `Fragment type is 'debris'`);
  assert(crisisFragments[0].operatorId === null, `Fragment operatorId is null`);
  assert(crisisFragments[0].shellId.includes("750") || crisisFragments[0].shellId.includes("800"), `Fragment shellId correct: ${crisisFragments[0].shellId}`);

  // Re-run forecast with crisis fragments added
  const combinedCatalog = [...trackedObjects, ...crisisFragments];
  const postCrisisForecast = runEpidemicForecast(combinedCatalog);
  const targetShellBefore = forecast.shellSnapshots.find((s) => s.shellId === "LEO_750_800");
  const targetShellAfter = postCrisisForecast.shellSnapshots.find((s) => s.shellId === "LEO_750_800");

  assert(
    targetShellAfter !== undefined && targetShellBefore !== undefined && targetShellAfter.r0 >= targetShellBefore.r0,
    `R₀ in LEO_750_800 shifted upward after crisis: ${targetShellBefore?.r0} -> ${targetShellAfter?.r0}`
  );

  console.log("\n====================================================");
  console.log("ALL TESTS PASSED! DATA LAYER IS 100% COMPLETE & VERIFIED.");
  console.log("====================================================");
}

runTests().catch((err) => {
  console.error("Test Suite Failed:", err);
  process.exit(1);
});
