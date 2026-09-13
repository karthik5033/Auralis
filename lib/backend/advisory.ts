import type {
  Advisory,
  AgentStatus,
  AnomalyReportPayload,
  CascadeForecastCompletePayload,
  NegotiationCompletePayload,
  RiskAssessmentCompletePayload,
} from "@/types/contract";
import { messageBus } from "@/lib/messageBus";
import { geminiRotator } from "@/lib/ai/geminiRotator";
import { recordAuditEntry } from "./audit";
import { store } from "./store";

export class AdvisoryAgent {
  private readonly unsubscribers: Array<() => void> = [];
  private readonly advisoryCache = new Map<string, { title: string; body: string; timestamp: number }>();
  private status: AgentStatus = {
    agentId: "advisory",
    agentName: "Advisory Agent",
    agentType: "advisory",
    state: "idle",
    lastHeartbeat: new Date(0).toISOString(),
    currentTask: null,
    processedCount: 0,
    errorCount: 0,
  };

  constructor() {
    this.subscribe<RiskAssessmentCompletePayload>("risk_assessment_complete", (payload) => this.fromRisk(payload));
    this.subscribe<CascadeForecastCompletePayload>("cascade_forecast_complete", (payload) => this.fromForecast(payload));
    this.subscribe<NegotiationCompletePayload>("negotiation_complete", (payload) => this.fromNegotiation(payload));
    this.subscribe<AnomalyReportPayload>("anomaly_report", (payload) => this.fromAnomaly(payload));
    this.publishStatus();
  }

  getStatus(): AgentStatus { return { ...this.status }; }
  dispose(): void { this.unsubscribers.forEach((unsubscribe) => unsubscribe()); }

  private subscribe<T>(type: string, handler: (payload: T) => Promise<void>): void {
    this.unsubscribers.push(messageBus.subscribe<T>(type, async (message) => { await handler(message.payload); }, { target: "advisory" }));
  }

  private async fromRisk(payload: RiskAssessmentCompletePayload): Promise<void> {
    const event = payload.criticalEvents[0] ?? payload.elevatedEvents[0];
    if (!event) return;

    let title = `Collision risk detected for ${event.primaryObjectId}`;
    let body = `The screening cycle examined ${payload.totalPairsScreened} close pairs and found a ${event.riskLevel} conjunction with Pc=${event.collisionProbability.toExponential(2)}.`;

    const cacheKey = `risk:${event.id}:${event.riskLevel}`;
    const cached = this.advisoryCache.get(cacheKey);
    const now = Date.now();
    if (cached && now - cached.timestamp < 10 * 60 * 1000) {
      title = cached.title;
      body = cached.body;
    } else {
      try {
        const prompt = `Write a Space Traffic Control operational advisory:
Event: ${event.riskLevel.toUpperCase()} conjunction
Objects: Primary ${event.primaryObjectId} vs Secondary ${event.secondaryObjectId}
Pc: ${event.collisionProbability.toExponential(2)}, Miss Distance: ${event.missDistance.toFixed(2)}km, TCA: ${event.tca}.
Return strict JSON with "title" (short flight directive title) and "body" (2 concise sentences of operational guidance for ground controllers).`;

        const ai = await geminiRotator.generateJSON<{ title: string; body: string }>(prompt, {
          systemPrompt: "You are an orbital flight director at Space Traffic Control. Output concise JSON.",
          temperature: 0.2,
          maxOutputTokens: 256,
        });
        if (ai.title && ai.body) {
          title = ai.title;
          body = ai.body;
          this.advisoryCache.set(cacheKey, { title, body, timestamp: now });
        }
      } catch {
        // Fallback to deterministic message
      }
    }

    await this.create("critical" === event.riskLevel ? "critical" : "elevated", title, body, [event.id], [event.primaryObjectId, event.secondaryObjectId]);
  }

  private async fromForecast(payload: CascadeForecastCompletePayload): Promise<void> {
    if (payload.criticalShells.length === 0) return;
    let title = "Orbital cascade risk elevated";
    let body = `${payload.criticalShells.length} shell(s) have crossed the cascade threshold: ${payload.criticalShells.join(", ")}. Overall trend is ${payload.overallTrend}.`;

    const cacheKey = `forecast:${payload.criticalShells.sort().join(",")}:${payload.overallTrend}`;
    const cached = this.advisoryCache.get(cacheKey);
    const now = Date.now();
    if (cached && now - cached.timestamp < 10 * 60 * 1000) {
      title = cached.title;
      body = cached.body;
    } else {
      try {
        const prompt = `Orbital debris cascade risk alert:
Critical shells: ${payload.criticalShells.join(", ")}
Trend: ${payload.overallTrend}.
Return strict JSON with "title" (urgent shell warning title) and "body" (2 concise sentences on debris mitigation and shell avoidance).`;

        const ai = await geminiRotator.generateJSON<{ title: string; body: string }>(prompt, {
          systemPrompt: "You are an orbital debris and Kessler syndrome specialist. Output concise JSON.",
          temperature: 0.2,
          maxOutputTokens: 256,
        });
        if (ai.title && ai.body) {
          title = ai.title;
          body = ai.body;
          this.advisoryCache.set(cacheKey, { title, body, timestamp: now });
        }
      } catch {
        // Fallback
      }
    }

    await this.create("critical", title, body, [], payload.criticalShells);
  }

  private async fromNegotiation(payload: NegotiationCompletePayload): Promise<void> {
    let title = `Collision risk mitigated — ${payload.primaryObjectName} avoidance maneuver executed`;
    let body = `A close approach between ${payload.primaryObjectName} and ${payload.secondaryObjectName} was detected at ${payload.conjunction.tca} with a collision probability of ${payload.conjunction.collisionProbability.toExponential(2)}. ${payload.proposal.operatorAgentId} accepted a ${payload.proposal.deltaV.magnitude.toFixed(2)} m/s burn at ${payload.proposal.burnTime}.`;

    const cacheKey = `negotiation:${payload.conjunction.id}:${payload.proposal.id}`;
    const cached = this.advisoryCache.get(cacheKey);
    const now = Date.now();
    if (cached && now - cached.timestamp < 15 * 60 * 1000) {
      title = cached.title;
      body = cached.body;
    } else {
      try {
        const prompt = `Conjunction resolution notice:
Primary: ${payload.primaryObjectName}, Secondary: ${payload.secondaryObjectName}
Burn planned: ${payload.proposal.deltaV.magnitude.toFixed(2)} m/s by ${payload.proposal.operatorAgentId} at ${payload.proposal.burnTime}
Rationale: ${payload.proposal.rationale}
Return strict JSON with "title" (maneuver confirmation title) and "body" (2 sentences confirming clearance and post-maneuver trajectory monitoring).`;

        const ai = await geminiRotator.generateJSON<{ title: string; body: string }>(prompt, {
          systemPrompt: "You are an orbital flight director at Space Traffic Control. Output concise JSON.",
          temperature: 0.2,
          maxOutputTokens: 256,
        });
        if (ai.title && ai.body) {
          title = ai.title;
          body = ai.body;
          this.advisoryCache.set(cacheKey, { title, body, timestamp: now });
        }
      } catch {
        // Fallback
      }
    }

    await this.create(payload.conjunction.riskLevel, title, body, [payload.conjunction.id], [payload.conjunction.primaryObjectId, payload.conjunction.secondaryObjectId]);
  }

  private async fromAnomaly(payload: AnomalyReportPayload): Promise<void> {
    await this.create("elevated", `Orbital anomaly detected — ${payload.objectName}`, payload.summary, [], [payload.objectId]);
  }

  private async create(severity: Advisory["severity"], title: string, body: string, relatedEventIds: string[], relatedObjectIds: string[]): Promise<void> {
    const advisory: Advisory = { id: crypto.randomUUID(), timestamp: new Date().toISOString(), severity, title, body, relatedEventIds, relatedObjectIds, agentSource: "advisory" };
    store.addAdvisory(advisory);
    await messageBus.publish(messageBus.createMessage({ source: "advisory", target: "broadcast", type: "advisory:new", correlationId: relatedEventIds[0] ?? null, payload: advisory }));
    recordAuditEntry({ agentId: this.status.agentId, agentType: this.status.agentType, action: "advisory_generated", description: title, relatedEntityId: relatedEventIds[0] ?? relatedObjectIds[0] ?? null, relatedEntityType: relatedEventIds.length > 0 ? "conjunction" : "object" });
    this.status = { ...this.status, state: "idle", currentTask: null, processedCount: this.status.processedCount + 1, lastHeartbeat: new Date().toISOString() };
    this.publishStatus();
  }

  private publishStatus(): void {
    store.setAgentStatus(this.status);
    void messageBus.publish(messageBus.createMessage({ source: "advisory", target: "broadcast", type: "agent:status", correlationId: null, payload: this.status }));
  }
}