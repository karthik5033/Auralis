import { computeEncounterGeometry, computePc } from "@/data";
import type {
  AgentStatus,
  ConjunctionEvent,
  ConjunctionStatus,
  HighPcConjunctionPayload,
  ManeuverResolvedPayload,
  RiskAssessmentCompletePayload,
  StateVectorsUpdatedPayload,
  TrackedObject,
} from "@/types/contract";
import { messageBus } from "@/lib/messageBus";
import { recordAuditEntry } from "./audit";
import { classifyRisk } from "./risk";
import { store } from "./store";

const SCREENING_DISTANCE_KM = 5;
const ACTION_THRESHOLD = 1e-4;

export class RiskAssessorAgent {
  private readonly unsubscribeState: () => void;
  private readonly unsubscribeManeuver: () => void;
  private status: AgentStatus = {
    agentId: "risk-assessor",
    agentName: "Risk Assessor Agent",
    agentType: "risk_assessor",
    state: "idle",
    lastHeartbeat: new Date(0).toISOString(),
    currentTask: null,
    processedCount: 0,
    errorCount: 0,
  };

  constructor() {
    this.unsubscribeState = messageBus.subscribe<StateVectorsUpdatedPayload>(
      "state_vectors_updated",
      async (message) => { await this.processStateUpdate(message.payload); },
      { source: "tracker", target: "risk_assessor" },
    );
    this.unsubscribeManeuver = messageBus.subscribe<ManeuverResolvedPayload>(
      "maneuver_resolved",
      async (message) => { await this.processManeuver(message.payload); },
      { source: "maneuver_negotiation", target: "risk_assessor" },
    );
    this.publishStatus();
  }

  private determineConjunctionStatus(
    previous: ConjunctionEvent | undefined,
    collisionProbability: number,
    tca: string,
  ): ConjunctionStatus {
    const isPastTca = new Date(tca).getTime() <= Date.now();
    if (isPastTca) {
      return "expired";
    }

    if (previous) {
      if (previous.status === "mitigated" && collisionProbability < ACTION_THRESHOLD) {
        return "mitigated";
      }
      if (
        (previous.status === "active" || previous.riskLevel !== "nominal") &&
        (collisionProbability <= previous.collisionProbability * 0.1 || collisionProbability < 1e-5) &&
        collisionProbability < ACTION_THRESHOLD
      ) {
        return "false_alarm";
      }
    }

    return collisionProbability < ACTION_THRESHOLD ? "monitoring" : "active";
  }

  async processStateUpdate(payload: StateVectorsUpdatedPayload): Promise<ConjunctionEvent[]> {
    this.updateStatus({ state: "processing", currentTask: "Screening close approaches" });
    try {
      payload.objects.forEach((object) => store.setObject(object));
      const objects = store.listObjects();
      const found: ConjunctionEvent[] = [];
      let totalPairsScreened = 0;

      for (let firstIndex = 0; firstIndex < objects.length; firstIndex += 1) {
        for (let secondIndex = firstIndex + 1; secondIndex < objects.length; secondIndex += 1) {
          const primary = objects[firstIndex];
          const secondary = objects[secondIndex];
          const geometry = computeEncounterGeometry(primary, secondary);
          if (geometry.missDistanceKm > SCREENING_DISTANCE_KM) continue;
          totalPairsScreened += 1;
          const collisionProbability = computePc(primary, secondary);
          if (collisionProbability <= 1e-5) continue;

          const riskLevel = classifyRisk(collisionProbability);
          const previous = store.listConjunctions().find(
            (conjunction) =>
              (conjunction.primaryObjectId === primary.id && conjunction.secondaryObjectId === secondary.id) ||
              (conjunction.primaryObjectId === secondary.id && conjunction.secondaryObjectId === primary.id),
          );
          const now = new Date().toISOString();
          const tca = previous?.tca ?? new Date(Date.now() + 60 * 60 * 1000).toISOString();
          const status = this.determineConjunctionStatus(previous, collisionProbability, tca);
          const conjunction: ConjunctionEvent = {
            id: previous?.id ?? crypto.randomUUID(),
            primaryObjectId: previous?.primaryObjectId ?? primary.id,
            secondaryObjectId: previous?.secondaryObjectId ?? secondary.id,
            tca,
            missDistance: geometry.missDistanceKm,
            relativeVelocity: geometry.relativeSpeedKmS,
            collisionProbability,
            maxCollisionProbability: Math.max(previous?.maxCollisionProbability ?? 0, collisionProbability),
            riskLevel,
            status,
            screeningWindowStart: previous?.screeningWindowStart ?? now,
            screeningWindowEnd: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
            maneuverProposalId: previous?.maneuverProposalId ?? null,
            createdAt: previous?.createdAt ?? now,
            updatedAt: now,
          };
          store.setConjunction(conjunction);
          found.push(conjunction);
          await this.publish(previous ? "conjunction:updated" : "conjunction:created", "broadcast", conjunction);
          recordAuditEntry({
            agentId: this.status.agentId,
            agentType: this.status.agentType,
            action: previous ? "conjunction_updated" : "conjunction_detected",
            description: `${previous ? "Updated" : "Detected"} ${riskLevel} conjunction at Pc=${collisionProbability.toExponential(2)} (status: ${status})`,
            relatedEntityId: conjunction.id,
            relatedEntityType: "conjunction",
            metadata: { missDistanceKm: geometry.missDistanceKm, relativeVelocityKmS: geometry.relativeSpeedKmS },
          });
          if (riskLevel === "elevated" || riskLevel === "critical") {
            await this.publish("high_pc_conjunction", "maneuver_negotiation", {
              conjunction,
              primaryObject: primary,
              secondaryObject: secondary,
              recommendedAction: "maneuver_primary",
            } satisfies HighPcConjunctionPayload);
          }
        }
      }

      // Process lifecycle transitions for existing conjunctions not in the active close-approach set or expired
      const screenedIds = new Set(found.map((c) => c.id));
      const existingConjunctions = store.listConjunctions();
      const currentTime = Date.now();

      for (const existing of existingConjunctions) {
        const isPastTca = new Date(existing.tca).getTime() <= currentTime;

        if (isPastTca && existing.status !== "expired") {
          const updated: ConjunctionEvent = {
            ...existing,
            status: "expired",
            updatedAt: new Date().toISOString(),
          };
          store.setConjunction(updated);
          await this.publish("conjunction:updated", "broadcast", updated);
          recordAuditEntry({
            agentId: this.status.agentId,
            agentType: this.status.agentType,
            action: "conjunction_updated",
            description: `Conjunction ${existing.id} expired: TCA has passed with no incident`,
            relatedEntityId: existing.id,
            relatedEntityType: "conjunction",
          });
        } else if (!screenedIds.has(existing.id) && (existing.status === "active" || existing.status === "monitoring")) {
          const newStatus: ConjunctionStatus = existing.status === "active" ? "false_alarm" : "monitoring";
          if (newStatus !== existing.status) {
            const updated: ConjunctionEvent = {
              ...existing,
              status: newStatus,
              updatedAt: new Date().toISOString(),
            };
            store.setConjunction(updated);
            await this.publish("conjunction:updated", "broadcast", updated);
            recordAuditEntry({
              agentId: this.status.agentId,
              agentType: this.status.agentType,
              action: "conjunction_updated",
              description: `Conjunction ${existing.id} transitioned to ${newStatus}: cleared screening distance`,
              relatedEntityId: existing.id,
              relatedEntityType: "conjunction",
            });
          }
        }
      }

      const criticalEvents = found.filter((event) => event.riskLevel === "critical");
      const elevatedEvents = found.filter((event) => event.riskLevel === "elevated");
      await this.publish("risk_assessment_complete", "advisory", {
        screeningEpoch: payload.epoch,
        totalPairsScreened,
        conjunctionsFound: found.length,
        criticalEvents,
        elevatedEvents,
      } satisfies RiskAssessmentCompletePayload);
      this.updateStatus({
        state: found.some((event) => event.riskLevel === "critical") ? "alert" : "idle",
        currentTask: null,
        processedCount: this.status.processedCount + totalPairsScreened,
      });
      return found;
    } catch (error) {
      this.updateStatus({ state: "error", currentTask: error instanceof Error ? error.message : "Screening failed", errorCount: this.status.errorCount + 1 });
      throw error;
    }
  }

  async processManeuver(payload: ManeuverResolvedPayload): Promise<ConjunctionEvent | undefined> {
    const conjunction = store.getConjunction(payload.conjunctionEventId);
    if (!conjunction) return undefined;
    store.setObject(payload.updatedObject);
    const otherObjectId = conjunction.primaryObjectId === payload.updatedObject.id
      ? conjunction.secondaryObjectId
      : conjunction.primaryObjectId;
    const otherObject = store.getObject(otherObjectId);
    if (!otherObject) return undefined;

    const geometry = computeEncounterGeometry(payload.updatedObject, otherObject);
    const collisionProbability = computePc(payload.updatedObject, otherObject);
    const updated: ConjunctionEvent = {
      ...conjunction,
      missDistance: geometry.missDistanceKm,
      relativeVelocity: geometry.relativeSpeedKmS,
      collisionProbability,
      maxCollisionProbability: Math.max(conjunction.maxCollisionProbability, collisionProbability),
      riskLevel: classifyRisk(collisionProbability),
      status: collisionProbability < ACTION_THRESHOLD ? "mitigated" : "active",
      maneuverProposalId: payload.proposal.id,
      updatedAt: new Date().toISOString(),
    };
    store.setConjunction(updated);
    await this.publish("conjunction:mitigated", "broadcast", {
      conjunctionId: updated.id,
      maneuverProposalId: payload.proposal.id,
      resultingPc: collisionProbability,
    });
    return updated;
  }

  dispose(): void { this.unsubscribeState(); this.unsubscribeManeuver(); }
  getStatus(): AgentStatus { return { ...this.status }; }

  private updateStatus(update: Partial<AgentStatus>): void {
    this.status = { ...this.status, ...update, lastHeartbeat: new Date().toISOString() };
    store.setAgentStatus(this.status);
    this.publishStatus();
  }

  private publishStatus(): void {
    store.setAgentStatus(this.status);
    void this.publish("agent:status", "broadcast", this.status);
  }

  private publish<T>(type: string, target: "risk_assessor" | "maneuver_negotiation" | "advisory" | "broadcast", payload: T): Promise<void> {
    return messageBus.publish(messageBus.createMessage({
      source: "risk_assessor",
      target,
      type,
      correlationId: null,
      payload,
    }));
  }
}