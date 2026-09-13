import type {
  AgentStatus,
  HighPcConjunctionPayload,
  ManeuverProposal,
  ManeuverResolvedPayload,
  NegotiationCompletePayload,
  NegotiationLogEntry,
  TrackedObject,
} from "@/types/contract";
import { messageBus } from "@/lib/messageBus";
import { geminiRotator } from "@/lib/ai/geminiRotator";
import { recordAuditEntry } from "./audit";
import { store } from "./store";
import { evaluateNegotiationStrategy, NegotiationStrategyType } from "./negotiationStrategies";

interface AINegotiationResult {
  winnerOperator: string;
  opposingOperator: string;
  maneuveringObjectId: string;
  deltaVMagnitude: number;
  direction: { x: number; y: number; z: number };
  fuelCostKg: number;
  rationale: string;
  negotiationLog: Array<{
    action: "INITIATE" | "BID" | "ACCEPT";
    agentId: string;
    message: string;
    deltaVBid: number | null;
  }>;
}

export class ManeuverNegotiationAgent {
  private readonly unsubscribe: () => void;
  private status: AgentStatus = {
    agentId: "maneuver-negotiation",
    agentName: "Maneuver Negotiation Agent",
    agentType: "maneuver_negotiation",
    state: "idle",
    lastHeartbeat: new Date(0).toISOString(),
    currentTask: null,
    processedCount: 0,
    errorCount: 0,
  };

  constructor() {
    this.unsubscribe = messageBus.subscribe<HighPcConjunctionPayload>(
      "high_pc_conjunction",
      async (message) => { await this.negotiate(message.payload); },
      { source: "risk_assessor", target: "maneuver_negotiation" },
    );
    this.publishStatus();
  }

  async negotiate(payload: HighPcConjunctionPayload): Promise<ManeuverProposal> {
    this.updateStatus({ state: "processing", currentTask: `Bilateral AI negotiation for ${payload.conjunction.id}` });
    try {
      const primary = payload.primaryObject;
      const secondary = payload.secondaryObject;
      const conj = payload.conjunction;
      const now = new Date().toISOString();

      if (conj.maneuverProposalId) {
        const existing = store.getManeuver(conj.maneuverProposalId);
        if (existing) {
          this.updateStatus({ state: "idle", currentTask: null });
          return existing;
        }
      }

      const primaryManeuverable = primary.type === "satellite" && primary.status === "active";
      const secondaryManeuverable = secondary.type === "satellite" && secondary.status === "active";
      const primaryOp = primary.operatorId ?? "Operator-Primary";
      const secondaryOp = secondary.operatorId ?? "Operator-Secondary";

      let aiResult: AINegotiationResult | null = null;

      // Attempt autonomous bilateral LLM negotiation via Gemini Rotator
      try {
        const prompt = `Spacecraft close conjunction encounter:
Primary: "${primary.name}" (ID: ${primary.id}, Operator: ${primaryOp}, Maneuverable: ${primaryManeuverable})
Secondary: "${secondary.name}" (ID: ${secondary.id}, Operator: ${secondaryOp}, Maneuverable: ${secondaryManeuverable})
Miss Distance: ${conj.missDistance.toFixed(2)} km, Collision Probability (Pc): ${conj.collisionProbability.toExponential(2)}, TCA: ${conj.tca}.

Task: Act as autonomous bilateral space traffic arbitration. Choose which operator should execute the collision avoidance burn based on maneuver capability, geometry, and mission safety.
Return strict JSON:
{
  "winnerOperator": "operator name who will maneuver",
  "opposingOperator": "operator name who yields/monitors",
  "maneuveringObjectId": "${primaryManeuverable ? primary.id : secondary.id}",
  "deltaVMagnitude": 0.35,
  "direction": { "x": 0.6, "y": 0.3, "z": 0.74 },
  "fuelCostKg": 1.2,
  "rationale": "one concise sentence explaining why this vehicle was assigned the burn",
  "negotiationLog": [
    { "action": "INITIATE", "agentId": "${primaryOp}", "message": "Propose conjunction assessment protocol", "deltaVBid": null },
    { "action": "BID", "agentId": "${secondaryOp}", "message": "Counter-proposal based on orbital geometry", "deltaVBid": 0.45 },
    { "action": "ACCEPT", "agentId": "${primaryOp}", "message": "Agreed on optimal burn plan", "deltaVBid": 0.35 }
  ]
}`;

        aiResult = await geminiRotator.generateJSON<AINegotiationResult>(prompt, {
          systemPrompt: "You are an autonomous satellite constellation flight dynamics negotiator. Output compact JSON.",
          temperature: 0.1,
          maxOutputTokens: 1024,
        });
      } catch (llmErr) {
        console.warn("[ManeuverNegotiation] AI negotiation fell back to deterministic solver:", llmErr instanceof Error ? llmErr.message : llmErr);
      }

      // Fallback to advanced game-theoretic negotiation strategy (Phase 2.7)
      const strategyResult = evaluateNegotiationStrategy("cooperative", conj, primary, secondary, 0.42);

      const winnerOp = aiResult?.winnerOperator || strategyResult.winnerOperator;
      const opposingOp = aiResult?.opposingOperator || strategyResult.opposingOperator;
      const maneuveringObjId = aiResult?.maneuveringObjectId || strategyResult.maneuveringObjectId;
      const deltaVMagnitude = aiResult?.deltaVMagnitude || strategyResult.deltaVMagnitude;
      const direction = aiResult?.direction || strategyResult.direction;
      const fuelCost = aiResult?.fuelCostKg || strategyResult.fuelCostKg;
      const rationale = aiResult?.rationale || strategyResult.rationale;

      const negotiationLog: NegotiationLogEntry[] = aiResult?.negotiationLog?.map((entry) => ({
        timestamp: now,
        agentId: entry.agentId || winnerOp,
        action: entry.action,
        message: entry.message,
        deltaVBid: entry.deltaVBid,
      })) || strategyResult.protocolTranscript.map((t) => ({
        timestamp: now,
        agentId: t.agentId,
        action: t.action,
        message: t.message,
        deltaVBid: t.deltaVBid,
      }));

      // Compute resulting collision probability after clearance burn (B-plane exponential decay)
      const targetClearanceKm = 15.0;
      const combinedSigmaKm = 2.5;
      const resultingPc = parseFloat(
        (conj.collisionProbability * Math.exp(-Math.pow(targetClearanceKm / combinedSigmaKm, 2))).toExponential(2)
      ) || 1.8e-8;

      const proposal: ManeuverProposal = {
        id: crypto.randomUUID(),
        conjunctionEventId: conj.id,
        maneuveringObjectId: maneuveringObjId,
        operatorAgentId: winnerOp,
        opposingOperatorAgentId: opposingOp,
        deltaV: { magnitude: deltaVMagnitude, direction },
        burnTime: new Date(Date.parse(conj.tca) - 2 * 60 * 60 * 1000).toISOString(),
        fuelCost,
        rationale,
        negotiationStatus: "accepted",
        negotiationLog,
        resultingPc,
        createdAt: now,
        resolvedAt: now,
      };
      store.setManeuver(proposal);
      store.setConjunction({
        ...conj,
        maneuverProposalId: proposal.id,
        status: "mitigated",
        updatedAt: now,
      });
      await messageBus.publish(messageBus.createMessage({
        source: "maneuver_negotiation",
        target: "broadcast",
        type: "maneuver:proposed",
        correlationId: proposal.id,
        payload: proposal,
      }));
      const maneuveringTarget = maneuveringObjId === secondary.id ? secondary : primary;
      const updatedObject = this.applyManeuver(maneuveringTarget, proposal);
      store.setObject(updatedObject);
      const resolved: ManeuverResolvedPayload = {
        proposal,
        updatedObject,
        conjunctionEventId: conj.id,
      };
      await messageBus.publish(messageBus.createMessage({
        source: "maneuver_negotiation",
        target: "risk_assessor",
        type: "maneuver_resolved",
        correlationId: proposal.id,
        payload: resolved,
      }));
      const completePayload: NegotiationCompletePayload = {
        proposal,
        conjunction: conj,
        primaryObjectName: primary.name,
        secondaryObjectName: secondary.name,
        outcome: "accepted",
      };
      await messageBus.publish(messageBus.createMessage({
        source: "maneuver_negotiation",
        target: "advisory",
        type: "negotiation_complete",
        correlationId: proposal.id,
        payload: completePayload,
      }));
      recordAuditEntry({
        agentId: this.status.agentId,
        agentType: this.status.agentType,
        action: "maneuver_accepted",
        description: `Autonomous negotiation completed for ${conj.id}: ${winnerOp} executes ${deltaVMagnitude.toFixed(2)} m/s burn`,
        relatedEntityId: proposal.id,
        relatedEntityType: "maneuver",
        metadata: { winner: winnerOp, deltaV: deltaVMagnitude, fuelCostKg: fuelCost },
      });
      this.updateStatus({ state: "idle", currentTask: null, processedCount: this.status.processedCount + 1 });
      return proposal;
    } catch (error) {
      this.updateStatus({
        state: "error",
        currentTask: error instanceof Error ? error.message : "Negotiation failed",
        errorCount: this.status.errorCount + 1,
      });
      throw error;
    }
  }

  getStatus(): AgentStatus { return { ...this.status }; }
  dispose(): void { this.unsubscribe(); }

  private applyManeuver(object: TrackedObject, proposal: ManeuverProposal): TrackedObject {
    const deltaV = proposal.deltaV.magnitude / 1000;
    return {
      ...object,
      velocity: {
        vx: object.velocity.vx + proposal.deltaV.direction.x * deltaV,
        vy: object.velocity.vy + proposal.deltaV.direction.y * deltaV,
        vz: object.velocity.vz + proposal.deltaV.direction.z * deltaV,
      },
      status: "active",
      lastUpdated: new Date().toISOString(),
    };
  }

  private updateStatus(update: Partial<AgentStatus>): void {
    this.status = { ...this.status, ...update, lastHeartbeat: new Date().toISOString() };
    this.publishStatus();
  }

  private publishStatus(): void {
    store.setAgentStatus(this.status);
    void messageBus.publish(messageBus.createMessage({ source: "maneuver_negotiation", target: "broadcast", type: "agent:status", correlationId: null, payload: this.status }));
  }
}