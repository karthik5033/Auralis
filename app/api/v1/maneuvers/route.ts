export const dynamic = "force-dynamic";
export const revalidate = 0;

import type { NegotiationStatus } from "@/types/contract";
import { ensureRuntime } from "@/lib/backend/runtime";
import { paginated } from "@/lib/backend/routeUtils";
import { store } from "@/lib/backend/store";

export function GET(request: Request): Response {
  ensureRuntime();
  const url = new URL(request.url);
  const status = url.searchParams.get("status") as NegotiationStatus | null;
  const negotiationStatus = url.searchParams.get("negotiationStatus") as NegotiationStatus | null;
  const requestedStatus = status ?? negotiationStatus;
  const maneuvers = store.listManeuvers().filter(
    (maneuver) => !requestedStatus || maneuver.negotiationStatus === requestedStatus,
  );
  return paginated(request, maneuvers);
}