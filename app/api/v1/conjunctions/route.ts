export const dynamic = "force-dynamic";
export const revalidate = 0;

import type { ConjunctionStatus, RiskLevel } from "@/types/contract";
import { ensureRuntime } from "@/lib/backend/runtime";
import { paginated } from "@/lib/backend/routeUtils";
import { store } from "@/lib/backend/store";

export function GET(request: Request): Response {
  ensureRuntime();
  const url = new URL(request.url);
  const status = url.searchParams.get("status") as ConjunctionStatus | null;
  const riskLevel = url.searchParams.get("riskLevel") as RiskLevel | null;
  const conjunctions = store.listConjunctions().filter(
    (conjunction) =>
      (!status || conjunction.status === status) && (!riskLevel || conjunction.riskLevel === riskLevel),
  );
  return paginated(request, conjunctions);
}