import { POST } from "@/app/api/v1/crisis/inject/route";
import { clearRateLimits } from "./rateLimit";
import { resetRuntime } from "./runtime";
import { store } from "./store";

async function runTest(): Promise<void> {
  clearRateLimits();
  resetRuntime();
  store.clear();
  const response = await POST(new Request("http://localhost/api/v1/crisis/inject", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ type: "fragmentation", altitude: 780, fragmentCount: 8, sourceObjectId: null, label: "Cascade integration test" }),
  }));
  const body = await response.json();
  if (response.status !== 201 || body.injectedObjectCount !== 8) throw new Error("FAIL: crisis request was not accepted");
  if (store.listShells().length === 0) throw new Error("FAIL: crisis did not trigger shell forecasting");
  if (store.listAuditEntries().length < 2) throw new Error("FAIL: crisis cascade was not audited");
  resetRuntime();
  console.log("Crisis cascade verification passed");
}

runTest().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
