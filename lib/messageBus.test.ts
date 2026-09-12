import { messageBus } from "./messageBus";
import type { StateVectorsUpdatedPayload } from "@/types/contract";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

async function runTests(): Promise<void> {
  messageBus.clear();
  const received: string[] = [];
  const unsubscribe = messageBus.subscribe<StateVectorsUpdatedPayload>(
    "state_vectors_updated",
    (message) => {
      received.push(message.payload.epoch);
    },
    { source: "tracker", target: "risk_assessor" },
  );

  const message = messageBus.createMessage<StateVectorsUpdatedPayload>({
    source: "tracker",
    target: "risk_assessor",
    type: "state_vectors_updated",
    correlationId: null,
    payload: { epoch: "2026-09-13T00:00:00.000Z", objects: [], isDelta: false },
  });

  assert(message.messageId.length > 0, "messages receive an id");
  await messageBus.publish(message);
  assert(received.length === 1, "matching subscribers receive messages");

  unsubscribe();
  await messageBus.publish(message);
  assert(received.length === 1, "unsubscribed handlers stop receiving messages");

  messageBus.clear();
  console.log("Message bus verification passed");
}

runTests().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});