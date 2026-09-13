export const dynamic = "force-dynamic";
export const revalidate = 0;

import { generateBreakupFragments } from "@/data/crisis";
import type { CrisisInjectionRequest, CrisisInjectionResponse, TrackedObject } from "@/types/contract";
import { recordAuditEntry } from "@/lib/backend/audit";
import { store } from "@/lib/backend/store";
import { ensureRuntime } from "@/lib/backend/runtime";
import { messageBus } from "@/lib/messageBus";
import { checkRateLimit } from "@/lib/backend/rateLimit";
import { authorizeApiRequest } from "@/lib/backend/auth";
import { computeShellPopulations } from "@/data";

const crisisTypes = new Set<CrisisInjectionRequest["type"]>(["fragmentation", "collision", "asat"]);

function isCrisisRequest(value: unknown): value is CrisisInjectionRequest {
  if (!value || typeof value !== "object") return false;
  const request = value as Partial<CrisisInjectionRequest>;
  return (
    typeof request.type === "string" && crisisTypes.has(request.type as CrisisInjectionRequest["type"]) &&
    typeof request.altitude === "number" && Number.isFinite(request.altitude) && request.altitude >= 150 && request.altitude <= 2000 &&
    typeof request.fragmentCount === "number" && Number.isInteger(request.fragmentCount) && request.fragmentCount >= 1 && request.fragmentCount <= 1000 &&
    (request.sourceObjectId === undefined || request.sourceObjectId === null || typeof request.sourceObjectId === "string") &&
    typeof request.label === "string" && request.label.trim().length > 0 && request.label.length <= 160
  );
}

export async function POST(request: Request): Promise<Response> {
  const authorizationError = authorizeApiRequest(request);
  if (authorizationError) return authorizationError;
  const clientKey = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local-client";
  const rateLimit = checkRateLimit(`crisis:${clientKey}`, 3, 60_000);
  if (!rateLimit.allowed) {
    return Response.json(
      { error: "Crisis injection rate limit exceeded", retryAfterSeconds: rateLimit.retryAfterSeconds },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
    );
  }
  ensureRuntime();
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Request body must be valid JSON" }, { status: 400 });
  }

  if (!isCrisisRequest(body)) {
    return Response.json({ error: "Invalid crisis injection request" }, { status: 400 });
  }

  const sourceObject = body.sourceObjectId ? store.getObject(body.sourceObjectId) : undefined;
  if (body.sourceObjectId && !sourceObject) {
    return Response.json({ error: "Source object not found", objectId: body.sourceObjectId }, { status: 404 });
  }

  const fragments = generateBreakupFragments({
    altitudeKm: body.altitude,
    fragmentCount: body.fragmentCount,
    sourceObject: sourceObject as TrackedObject | undefined,
    label: body.label,
  });
  fragments.forEach((fragment) => store.setObject(fragment));

  const affectedShellIds = [...new Set(fragments.map((fragment) => fragment.shellId))];
  const now = new Date().toISOString();
  let newConjunctionEventCount = 0;

  const runtime = ensureRuntime();
  const conjunctionIdsBeforeScreening = new Set(store.listConjunctions().map((conjunction) => conjunction.id));
  await runtime.riskAssessor.processStateUpdate({
    epoch: now,
    objects: fragments,
    isDelta: true,
  });
  const shellPopulation = computeShellPopulations(store.listObjects(), now);
  await messageBus.publish(messageBus.createMessage({
    source: "tracker",
    target: "epidemic_forecaster",
    type: "shell_population_updated",
    correlationId: null,
    payload: shellPopulation,
  }));
  newConjunctionEventCount = store.listConjunctions().filter(
    (conjunction) => !conjunctionIdsBeforeScreening.has(conjunction.id),
  ).length;

  recordAuditEntry({
    agentId: "crisis-controller",
    agentType: "tracker",
    action: "crisis_injected",
    description: `Injected ${fragments.length} ${body.type} fragments at ${body.altitude} km`,
    relatedEntityType: "object",
    metadata: {
      label: body.label,
      altitude: body.altitude,
      fragmentCount: fragments.length,
      sourceObjectId: body.sourceObjectId,
      affectedShellIds,
    },
  });

  const response: CrisisInjectionResponse = {
    success: true,
    injectedObjectCount: fragments.length,
    affectedShellIds,
    newConjunctionEventCount,
    timestamp: now,
  };
  await messageBus.publish(messageBus.createMessage({
    source: "tracker",
    target: "broadcast",
    type: "crisis:injected",
    correlationId: null,
    payload: response,
  }));
  return Response.json(response, { status: 201 });
}