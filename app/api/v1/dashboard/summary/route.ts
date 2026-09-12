import { store } from "@/lib/backend/store";
import { ensureRuntime } from "@/lib/backend/runtime";

export function GET(): Response {
  ensureRuntime();
  const objects = store.listObjects();
  const conjunctions = store.listConjunctions();
  const maneuvers = store.listManeuvers();
  const dayAgo = Date.now() - 24 * 60 * 60 * 1000;
  return Response.json({
    totalTrackedObjects: objects.length,
    activeSatellites: objects.filter((object) => object.type === "satellite" && object.status === "active").length,
    debrisObjects: objects.filter((object) => object.type === "debris").length,
    rocketBodies: objects.filter((object) => object.type === "rocket_body").length,
    activeConjunctions: conjunctions.filter((conjunction) => conjunction.status === "active").length,
    criticalConjunctions: conjunctions.filter((conjunction) => conjunction.riskLevel === "critical").length,
    maneuveredLast24h: maneuvers.filter(
      (maneuver) => maneuver.resolvedAt !== null && Date.parse(maneuver.resolvedAt) >= dayAgo,
    ).length,
    shellsAtRisk: store.listShells().filter((shell) => shell.r0 > 1).length,
    agentStatuses: store.listAgentStatuses().map((agent) => ({ agentType: agent.agentType, state: agent.state })),
    lastUpdated: new Date().toISOString(),
  });
}