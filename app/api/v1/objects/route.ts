export const dynamic = "force-dynamic";
export const revalidate = 0;

import type { ObjectType } from "@/types/contract";
import { ensureRuntime } from "@/lib/backend/runtime";
import { paginated } from "@/lib/backend/routeUtils";
import { store } from "@/lib/backend/store";

export function GET(request: Request): Response {
  ensureRuntime();
  const url = new URL(request.url);
  const type = url.searchParams.get("type") as ObjectType | null;
  const shellId = url.searchParams.get("shellId");
  const objects = store.listObjects().filter(
    (object) => (!type || object.type === type) && (!shellId || object.shellId === shellId),
  );
  return paginated(request, objects);
}