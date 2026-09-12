import type { RiskLevel } from "@/types/contract";
import { ensureRuntime } from "@/lib/backend/runtime";
import { paginated } from "@/lib/backend/routeUtils";
import { store } from "@/lib/backend/store";

export function GET(request: Request): Response {
  ensureRuntime();
  const url = new URL(request.url);
  const severity = url.searchParams.get("severity") as RiskLevel | null;
  const advisories = store.listAdvisories().filter(
    (advisory) => !severity || advisory.severity === severity,
  );
  return paginated(request, advisories);
}