import type { WsMessage } from "@/types/contract";
import { messageBus } from "@/lib/messageBus";
import { ensureRuntime } from "@/lib/backend/runtime";
import { store } from "@/lib/backend/store";

const eventTypes = [
  "state_vectors_updated", "conjunction:created", "conjunction:updated", "cascade_forecast_complete", "maneuver:proposed", "maneuver:resolved",
  "advisory:new", "anomaly_detected", "conjunction:mitigated", "crisis:injected", "agent:status",
] as const;

function mapEvent(type: string, payload: unknown): WsMessage | null {
  if (type === "state_vectors_updated") return { event: "objects:updated", timestamp: new Date().toISOString(), payload: { objects: (payload as { objects: unknown[] }).objects } };
  if (type === "conjunction:created") return { event: "conjunction:created", timestamp: new Date().toISOString(), payload };
  if (type === "conjunction:updated") return { event: "conjunction:updated", timestamp: new Date().toISOString(), payload };
  if (type === "cascade_forecast_complete") return null;
  if (type === "maneuver:proposed" || type === "maneuver:resolved") return { event: type, timestamp: new Date().toISOString(), payload };
  if (type === "maneuver_resolved") return { event: "maneuver:resolved", timestamp: new Date().toISOString(), payload: (payload as { proposal: unknown }).proposal };
  if (type === "negotiation_complete") return null;
  if (type === "advisory:new") return { event: "advisory:new", timestamp: new Date().toISOString(), payload };
  if (type === "anomaly_detected") return { event: "anomaly:detected", timestamp: new Date().toISOString(), payload };
  if (type === "conjunction:mitigated") return { event: "conjunction:mitigated", timestamp: new Date().toISOString(), payload };
  if (type === "crisis:injected") return { event: "crisis:injected", timestamp: new Date().toISOString(), payload };
  if (type === "agent:status") return { event: "agent:status", timestamp: new Date().toISOString(), payload };
  return null;
}

export function GET(): Response {
  ensureRuntime();
  const encoder = new TextEncoder();
  let heartbeat: ReturnType<typeof setInterval> | undefined;
  const unsubscribers: Array<() => void> = [];
  let closed = false;

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (message: WsMessage) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(message)}\n\n`));
        } catch {
          closed = true;
        }
      };
      send({ event: "objects:updated", timestamp: new Date().toISOString(), payload: { objects: store.listObjects() } });
      store.listConjunctions().filter((conjunction) => conjunction.status === "active").forEach((conjunction) => send({ event: "conjunction:created", timestamp: new Date().toISOString(), payload: conjunction }));
      store.listShells().forEach((shell) => send({ event: "shell:updated", timestamp: new Date().toISOString(), payload: shell }));
      store.listAgentStatuses().forEach((status) => send({ event: "agent:status", timestamp: new Date().toISOString(), payload: status }));
      for (const type of eventTypes) {
        unsubscribers.push(messageBus.subscribe(type, (message) => {
          if (type === "cascade_forecast_complete") {
            const snapshots = (message.payload as { shellSnapshots: unknown[] }).shellSnapshots;
            snapshots.forEach((snapshot) => send({ event: "shell:updated", timestamp: new Date().toISOString(), payload: snapshot }));
            return;
          }
          const mapped = mapEvent(type, message.payload);
          if (mapped) send(mapped);
        }));
      }
      heartbeat = setInterval(() => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(": keepalive\n\n"));
        } catch {
          closed = true;
        }
      }, 15_000);
    },
    cancel() {
      closed = true;
      unsubscribers.forEach((unsubscribe) => unsubscribe());
      if (heartbeat) clearInterval(heartbeat);
    },
  });

  return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive" } });
}