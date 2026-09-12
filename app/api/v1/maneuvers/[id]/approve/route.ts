import { ensureRuntime } from "@/lib/backend/runtime";
import { store } from "@/lib/backend/store";
import { messageBus } from "@/lib/messageBus";
import { recordAuditEntry } from "@/lib/backend/audit";
import { authorizeApiRequest } from "@/lib/backend/auth";
import type { TrackedObject, ConjunctionEvent } from "@/types/contract";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const authorizationError = authorizeApiRequest(request);
  if (authorizationError) return authorizationError;

  ensureRuntime();
  const { id } = await params;
  const maneuver = store.getManeuver(id);
  if (!maneuver) {
    return Response.json({ error: "Maneuver not found", maneuverId: id }, { status: 404 });
  }

  const now = new Date().toISOString();
  const updatedManeuver = {
    ...maneuver,
    negotiationStatus: "accepted" as const,
    resolvedAt: maneuver.resolvedAt || now,
  };
  store.setManeuver(updatedManeuver);

  // Apply burn delta-V to target object
  const targetObj = store.getObject(maneuver.maneuveringObjectId);
  let updatedObject: TrackedObject | undefined;
  if (targetObj) {
    const deltaVKmS = maneuver.deltaV.magnitude / 1000;
    updatedObject = {
      ...targetObj,
      velocity: {
        vx: targetObj.velocity.vx + maneuver.deltaV.direction.x * deltaVKmS,
        vy: targetObj.velocity.vy + maneuver.deltaV.direction.y * deltaVKmS,
        vz: targetObj.velocity.vz + maneuver.deltaV.direction.z * deltaVKmS,
      },
      status: "active",
      lastUpdated: now,
    };
    store.setObject(updatedObject);
  }

  // Mitigate the associated conjunction
  const conj = store.getConjunction(maneuver.conjunctionEventId);
  if (conj) {
    const mitigatedConj: ConjunctionEvent = {
      ...conj,
      status: "mitigated",
      collisionProbability: maneuver.resultingPc ?? 1e-8,
      maneuverProposalId: maneuver.id,
      updatedAt: now,
    };
    store.setConjunction(mitigatedConj);
    await messageBus.publish(messageBus.createMessage({
      source: "maneuver_negotiation",
      target: "broadcast",
      type: "conjunction:mitigated",
      correlationId: maneuver.id,
      payload: mitigatedConj,
    }));
  }

  recordAuditEntry({
    agentId: "flight-director",
    agentType: "maneuver_negotiation",
    action: "maneuver_executed",
    description: `Manual approval & execution of collision avoidance burn for ${maneuver.maneuveringObjectId} (ΔV: ${maneuver.deltaV.magnitude.toFixed(2)} m/s)`,
    relatedEntityId: maneuver.id,
    relatedEntityType: "maneuver",
    metadata: {
      maneuverId: maneuver.id,
      conjunctionId: maneuver.conjunctionEventId,
      deltaVMagnitude: maneuver.deltaV.magnitude,
      resultingPc: maneuver.resultingPc,
    },
  });

  await messageBus.publish(messageBus.createMessage({
    source: "maneuver_negotiation",
    target: "broadcast",
    type: "maneuver:resolved",
    correlationId: maneuver.id,
    payload: updatedManeuver,
  }));

  return Response.json({
    success: true,
    maneuver: updatedManeuver,
    updatedObject,
  });
}
