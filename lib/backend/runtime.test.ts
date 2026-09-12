import { ensureRuntime, resetRuntime } from "./runtime";
import { store } from "./store";

async function runTest(): Promise<void> {
  resetRuntime();
  store.clear();
  const first = ensureRuntime();
  const second = ensureRuntime();
  if (first !== second) throw new Error("FAIL: ensureRuntime created duplicate runtimes");
  first.start();
  first.stop();
  resetRuntime();
  const restarted = ensureRuntime();
  if (restarted === first) throw new Error("FAIL: runtime could not be recreated after reset");
  resetRuntime();
  console.log("Runtime verification passed");
}

runTest().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});