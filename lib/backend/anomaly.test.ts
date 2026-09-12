import { AnomalyAgent } from "./anomaly";
import { messageBus } from "@/lib/messageBus";
import { store } from "./store";
import type { TrackedObject } from "@/types/contract";

const object = (axis: number): TrackedObject => ({
  id: "object-1", noradId: 1, name: "Test Object", type: "satellite", operatorId: null,
  position: { x: 6771, y: 0, z: 0 }, velocity: { vx: 0, vy: 7.5, vz: 0 },
  orbitalElements: { semiMajorAxis: axis, eccentricity: 0, inclination: 51, raan: 0, argOfPerigee: 0, meanAnomaly: 0 },
  covarianceUpperTriangle: [1, 0, 0, 1, 0, 1], altitude: 400, shellId: "LEO_400_450",
  epoch: new Date().toISOString(), lastUpdated: new Date().toISOString(), status: "active",
});

async function runTest(): Promise<void> {
  store.clear();
  messageBus.clear();
  const agent = new AnomalyAgent();
  await agent.processStateUpdate({ epoch: new Date().toISOString(), objects: [object(6771)], isDelta: false });
  const detected = await agent.processStateUpdate({ epoch: new Date().toISOString(), objects: [object(6790)], isDelta: true });
  if (detected.length !== 1 || detected[0].anomalyType !== "orbit_change") {
    throw new Error("FAIL: anomaly agent did not detect the orbit change");
  }
  if (store.listAuditEntries().length !== 1) throw new Error("FAIL: anomaly was not audited");
  agent.dispose();
  console.log("Anomaly verification passed");
}

runTest().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});