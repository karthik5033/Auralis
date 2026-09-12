import { TrackerAgent } from "./tracker";
import { messageBus } from "@/lib/messageBus";
import { store } from "./store";

async function runTest(): Promise<void> {
  store.clear();
  messageBus.clear();
  const publishedTypes: string[] = [];
  const unsubscribeState = messageBus.subscribe("state_vectors_updated", (message) => {
    publishedTypes.push(message.type);
  });
  const unsubscribeShells = messageBus.subscribe("shell_population_updated", (message) => {
    publishedTypes.push(message.type);
  });

  const trackerAgent = new TrackerAgent(60_000, 5);
  const objects = await trackerAgent.runOnce();
  if (objects.length === 0 || store.listObjects().length !== objects.length) {
    throw new Error("FAIL: tracker did not persist propagated objects");
  }
  if (!publishedTypes.includes("state_vectors_updated") || !publishedTypes.includes("shell_population_updated")) {
    throw new Error("FAIL: tracker did not publish both propagation messages");
  }
  if (store.getAgentStatus("tracker")?.state !== "idle") {
    throw new Error("FAIL: tracker did not return to idle state");
  }
  unsubscribeState();
  unsubscribeShells();
  console.log("Tracker verification passed");
}

runTest().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});