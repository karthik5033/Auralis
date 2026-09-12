import { GET as getManeuvers } from "@/app/api/v1/maneuvers/route";
import { GET as getManeuver } from "@/app/api/v1/maneuvers/[id]/route";
import { GET as getObject } from "@/app/api/v1/objects/[id]/route";
import { GET as getAdvisories } from "@/app/api/v1/advisories/route";
import { store } from "./store";
import { resetRuntime } from "./runtime";

async function runTest(): Promise<void> {
  store.clear();
  const maneuvers = await getManeuvers(new Request("http://localhost/api/v1/maneuvers?status=accepted"));
  const advisories = await getAdvisories(new Request("http://localhost/api/v1/advisories?severity=critical"));
  const missing = await getManeuver(new Request("http://localhost/api/v1/maneuvers/missing"), { params: Promise.resolve({ id: "missing" }) });
  const missingObject = await getObject(new Request("http://localhost/api/v1/objects/missing"), { params: Promise.resolve({ id: "missing" }) });
  const maneuverBody = await maneuvers.json();
  const advisoryBody = await advisories.json();
  if (maneuvers.status !== 200 || maneuverBody.total !== 0) throw new Error("FAIL: maneuver list route filtering failed");
  if (advisories.status !== 200 || advisoryBody.total !== 0) throw new Error("FAIL: advisory list route filtering failed");
  if (missing.status !== 404) throw new Error("FAIL: missing maneuver did not return 404");
  if (missingObject.status !== 404) throw new Error("FAIL: missing object did not return 404");

  store.setObject({
    id: "obj-test-1",
    noradId: 99999,
    name: "TEST_SAT",
    type: "satellite",
    status: "active",
    operatorId: "op-test-org",
    position: { x: 0, y: 0, z: 550 },
    velocity: { vx: 7.5, vy: 0, vz: 0 },
    orbitalElements: { semiMajorAxis: 6928, eccentricity: 0.001, inclination: 53, raan: 0, argOfPerigee: 0, meanAnomaly: 0 },
    covarianceUpperTriangle: [1, 0, 0, 1, 0, 1],
    altitude: 550,
    shellId: "LEO_550_600",
    epoch: new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
  });

  const foundObject = await getObject(new Request("http://localhost/api/v1/objects/obj-test-1"), { params: Promise.resolve({ id: "obj-test-1" }) });
  if (foundObject.status !== 200) throw new Error("FAIL: existing object did not return 200");
  const foundObjectBody = await foundObject.json();
  if (foundObjectBody.id !== "obj-test-1") throw new Error("FAIL: returned wrong object id");

  console.log("Read route verification passed (including /api/v1/objects/:id)");
  resetRuntime();
  process.exit(0);
}

runTest().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});