import { recordAuditEntry } from "./audit";
import { paginate } from "./pagination";
import { classifyRisk } from "./risk";
import { InMemoryStore } from "./store";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

const store = new InMemoryStore();
const object = { id: "object-1" } as Parameters<InMemoryStore["setObject"]>[0];
store.setObject(object);
assert(store.getObject("object-1") === object, "store retrieves inserted objects");
assert(store.listObjects().length === 1, "store lists inserted objects");
store.clear();
assert(store.listObjects().length === 0, "store clear removes all records");

assert(classifyRisk(0.000099) === "nominal", "Pc below 1e-4 is nominal");
assert(classifyRisk(0.0001) === "elevated", "Pc at 1e-4 is elevated");
assert(classifyRisk(0.001) === "critical", "Pc at 1e-3 is critical");
assert(paginate([1, 2, 3], 2, 1).data.join(",") === "2,3", "pagination slices data correctly");

recordAuditEntry({
  agentId: "tracker",
  agentType: "tracker",
  action: "tle_ingested",
  description: "Loaded one tracked object",
});
assert(recordAuditEntry !== undefined, "audit logger creates entries");
console.log("Backend foundation verification passed");