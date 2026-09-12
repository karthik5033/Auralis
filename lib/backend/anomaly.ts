import type {
  AgentStatus,
  AnomalyDetectedPayload,
  AnomalyReportPayload,
  StateVectorsUpdatedPayload,
  TrackedObject,
} from "@/types/contract";
import { messageBus } from "@/lib/messageBus";
import { geminiRotator } from "@/lib/ai/geminiRotator";
import { recordAuditEntry } from "./audit";
import { store } from "./store";

const SEMI_MAJOR_AXIS_THRESHOLD_KM = 10;
const INCLINATION_THRESHOLD_DEG = 0.5;

export class AnomalyAgent {
  private readonly previousElements = new Map<string, TrackedObject["orbitalElements"]>();
  private readonly unsubscribe: () => void;
  private status: AgentStatus = {
    agentId: "anomaly",
    agentName: "Anomaly Agent",
    agentType: "anomaly",
    state: "idle",
    lastHeartbeat: new Date(0).toISOString(),
    currentTask: null,
    processedCount: 0,
    errorCount: 0,
  };

  constructor() {
    this.unsubscribe = messageBus.subscribe<StateVectorsUpdatedPayload>(
      "state_vectors_updated",
      async (message) => { await this.processStateUpdate(message.payload); },
      { source: "tracker", target: "*" },
    );
    this.publishStatus();
  }

  async processStateUpdate(payload: StateVectorsUpdatedPayload): Promise<AnomalyDetectedPayload[]> {
    this.updateStatus({ state: "processing", currentTask: "Comparing orbital elements" });
    try {
      const detected: AnomalyDetectedPayload[] = [];
      for (const object of payload.objects) {
        const current = object.orbitalElements;
        const previous = this.previousElements.get(object.id);
        this.previousElements.set(object.id, current);
        store.setObject(object);
        if (!previous || object.status === "maneuvering") continue;

        const delta = {
          semiMajorAxis: current.semiMajorAxis - previous.semiMajorAxis,
          eccentricity: Math.abs(current.eccentricity - previous.eccentricity),
          inclination: current.inclination - previous.inclination,
        };
        const absoluteSemiMajorAxisDelta = Math.abs(delta.semiMajorAxis);
        const absoluteInclinationDelta = Math.abs(delta.inclination);
        if (absoluteSemiMajorAxisDelta <= SEMI_MAJOR_AXIS_THRESHOLD_KM && absoluteInclinationDelta <= INCLINATION_THRESHOLD_DEG) continue;

        let anomalyType: AnomalyDetectedPayload["anomalyType"] = absoluteSemiMajorAxisDelta > 25 ? "possible_breakup" : "orbit_change";
        let summary = `${object.name} changed by ${absoluteSemiMajorAxisDelta.toFixed(2)} km in semi-major axis and ${absoluteInclinationDelta.toFixed(2)}° in inclination`;

        try {
          const prompt = `Forensic Astrodynamic Anomaly Analysis:
Object: "${object.name}" (Type: ${object.type}, Operator: ${object.operatorId ?? "Unknown"}, Shell: ${object.shellId})
Delta Semi-Major Axis: ${delta.semiMajorAxis.toFixed(2)} km
Delta Inclination: ${delta.inclination.toFixed(3)} deg
Delta Eccentricity: ${delta.eccentricity.toFixed(5)}.

Return strict JSON:
{
  "anomalyType": "possible_breakup" or "orbit_change",
  "summary": "one concise sentence giving technical assessment of what physically occurred (e.g. thruster burn, collision, breakup, or station-keeping anomaly)"
}`;

          const ai = await geminiRotator.generateJSON<{ anomalyType: "possible_breakup" | "orbit_change"; summary: string }>(prompt, {
            systemPrompt: "You are an orbital intelligence astrodynamics forensic specialist. Output concise JSON.",
            temperature: 0.1,
            maxOutputTokens: 256,
          });
          if (ai.anomalyType) anomalyType = ai.anomalyType;
          if (ai.summary) summary = ai.summary;
        } catch {
          // Fallback to deterministic message
        }

        const detectedAt = new Date().toISOString();
        const anomaly: AnomalyDetectedPayload = {
          objectId: object.id,
          objectName: object.name,
          anomalyType,
          previousElements: previous,
          currentElements: current,
          delta,
          confidence: Math.min(1, Math.max(absoluteSemiMajorAxisDelta / 50, absoluteInclinationDelta / 2)),
          detectedAt,
        };
        detected.push(anomaly);
        await messageBus.publish(messageBus.createMessage({
          source: "anomaly",
          target: "risk_assessor",
          type: "anomaly_detected",
          correlationId: object.id,
          payload: anomaly,
        }));
        const report: AnomalyReportPayload = {
          objectId: object.id,
          objectName: object.name,
          anomalyType,
          summary,
          detectedAt,
        };
        await messageBus.publish(messageBus.createMessage({
          source: "anomaly",
          target: "advisory",
          type: "anomaly_report",
          correlationId: object.id,
          payload: report,
        }));
        recordAuditEntry({
          agentId: this.status.agentId,
          agentType: this.status.agentType,
          action: "anomaly_detected",
          description: report.summary,
          relatedEntityId: object.id,
          relatedEntityType: "object",
          metadata: { anomalyType, confidence: anomaly.confidence },
        });
      }
      this.updateStatus({ state: detected.length > 0 ? "alert" : "idle", currentTask: null, processedCount: this.status.processedCount + payload.objects.length });
      return detected;
    } catch (error) {
      this.updateStatus({ state: "error", currentTask: error instanceof Error ? error.message : "Anomaly scan failed", errorCount: this.status.errorCount + 1 });
      throw error;
    }
  }

  getStatus(): AgentStatus { return { ...this.status }; }
  dispose(): void { this.unsubscribe(); }

  private updateStatus(update: Partial<AgentStatus>): void {
    this.status = { ...this.status, ...update, lastHeartbeat: new Date().toISOString() };
    this.publishStatus();
  }

  private publishStatus(): void {
    store.setAgentStatus(this.status);
    void messageBus.publish(messageBus.createMessage({
      source: "anomaly",
      target: "broadcast",
      type: "agent:status",
      correlationId: null,
      payload: this.status,
    }));
  }
}