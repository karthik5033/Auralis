import { AdvisoryAgent } from "./advisory";
import { EpidemicForecasterAgent } from "./epidemicForecaster";
import { ManeuverNegotiationAgent } from "./maneuverNegotiation";
import { messageBus } from "@/lib/messageBus";
import { store } from "./store";
import type { HighPcConjunctionPayload, TrackedObject } from "@/types/contract";

const object = (id: string): TrackedObject => ({
  id, noradId: Number(id.slice(-1)), name: id, type: "satellite", operatorId: null, position: { x: 6771, y: 0, z: 0 }, velocity: { vx: 0, vy: 7.5, vz: 0 }, orbitalElements: { semiMajorAxis: 6771, eccentricity: 0, inclination: 51, raan: 0, argOfPerigee: 0, meanAnomaly: 0 }, covarianceUpperTriangle: [1, 0, 0, 1, 0, 1], altitude: 400, shellId: "LEO_400_450", epoch: new Date().toISOString(), lastUpdated: new Date().toISOString(), status: "active",
});

async function runTest(): Promise<void> {
  store.clear(); messageBus.clear();
  const advisory = new AdvisoryAgent(); const negotiation = new ManeuverNegotiationAgent(); const forecaster = new EpidemicForecasterAgent();
  const primary = object("object-1"); const secondary = object("object-2"); store.setObject(primary); store.setObject(secondary);
  const conjunction = { id: "conjunction-1", primaryObjectId: primary.id, secondaryObjectId: secondary.id, tca: new Date(Date.now() + 3600000).toISOString(), missDistance: 0.1, relativeVelocity: 10, collisionProbability: 0.002, maxCollisionProbability: 0.002, riskLevel: "critical" as const, status: "active" as const, screeningWindowStart: new Date().toISOString(), screeningWindowEnd: new Date(Date.now() + 3600000).toISOString(), maneuverProposalId: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  store.setConjunction(conjunction);
  const payload: HighPcConjunctionPayload = { conjunction, primaryObject: primary, secondaryObject: secondary, recommendedAction: "maneuver_primary" };
  const proposal = await negotiation.negotiate(payload);
  if (proposal.negotiationLog.length < 3 || store.listManeuvers().length !== 1) throw new Error("FAIL: maneuver negotiation did not persist a complete proposal");
  if (store.listAdvisories().length === 0) throw new Error("FAIL: advisory agent did not create a narrative");
  await forecaster.forecast({ timestamp: new Date().toISOString(), shells: [] });
  if (store.listShells().length === 0) throw new Error("FAIL: forecaster did not persist shell snapshots");
  advisory.dispose(); negotiation.dispose(); forecaster.dispose();
  console.log("Agent chain verification passed");
}

runTest().catch((error: unknown) => { console.error(error); process.exitCode = 1; });