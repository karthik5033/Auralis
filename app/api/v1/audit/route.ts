import type { AgentType } from "@/types/contract";
import { ensureRuntime } from "@/lib/backend/runtime";
import { paginated } from "@/lib/backend/routeUtils";
import { store } from "@/lib/backend/store";

export function GET(request: Request): Response {
  ensureRuntime();
  const url = new URL(request.url);
  const agentType = url.searchParams.get("agentType") as AgentType | null;
  const entries = store.listAuditEntries().filter((entry) => !agentType || entry.agentType === agentType);
  return paginated(request, entries);
}