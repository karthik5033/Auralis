import { POST } from "./route";
import { store } from "@/lib/backend/store";
import { clearRateLimits } from "@/lib/backend/rateLimit";
import { ensureRuntime } from "@/lib/backend/runtime";

async function runTest(): Promise<void> {
  clearRateLimits();
  const runtime = ensureRuntime();
  await runtime.tracker.runOnce();
  const initialCount = store.listObjects().length;
  const initialAuditCount = store.listAuditEntries().length;
  const response = await POST(
    new Request("http://localhost/api/v1/crisis/inject", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        type: "asat",
        altitude: 780,
        fragmentCount: 3,
        sourceObjectId: null,
        label: "Test ASAT event",
      }),
    }),
  );
  const body = await response.json();
  const addedObjects = store.listObjects().length - initialCount;
  const addedAudit = store.listAuditEntries().length - initialAuditCount;
  if (response.status !== 201 || body.injectedObjectCount !== 3 || addedObjects !== 3) {
    throw new Error(`FAIL: crisis injection did not persist the requested fragments: status=${response.status}, addedObjects=${addedObjects}, body=${JSON.stringify(body)}`);
  }
  if (addedAudit < 1) {
    throw new Error("FAIL: crisis injection did not create an audit entry");
  }
  console.log("Crisis injection verification passed");
}

runTest().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});