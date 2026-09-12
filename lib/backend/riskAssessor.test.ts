import { RiskAssessorAgent } from "./riskAssessor";
import { messageBus } from "@/lib/messageBus";
import { store } from "./store";
import type { TrackedObject } from "@/types/contract";

const object = (id: string, x: number, relativeVx = 0): TrackedObject => ({
  id, noradId: Number(id.slice(-1)), name: id, type: "satellite", operatorId: null,
  position: { x, y: 0, z: 0 }, velocity: { vx: relativeVx, vy: 7.5, vz: 0 },
  orbitalElements: { semiMajorAxis: 6771, eccentricity: 0, inclination: 0, raan: 0, argOfPerigee: 0, meanAnomaly: 0 },
  covarianceUpperTriangle: [1, 0, 0, 1, 0, 1], altitude: 400, shellId: "LEO_400_450",
  epoch: new Date().toISOString(), lastUpdated: new Date().toISOString(), status: "active",
});

async function runTest(): Promise<void> {
  store.clear();
  messageBus.clear();
  const agent = new RiskAssessorAgent();
  const events = await agent.processStateUpdate({
    epoch: new Date().toISOString(), objects: [object("object-1", 6771), object("object-2", 6771, 0.01)], isDelta: false,
  });
  if (events.length !== 1 || store.listConjunctions()[0]?.collisionProbability <= 0) {
    throw new Error("FAIL: risk assessor did not create a Pc event");
  }
  agent.dispose();
  console.log("Risk assessor verification passed");
}

runTest().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});