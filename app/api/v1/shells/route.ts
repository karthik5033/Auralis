import { store } from "@/lib/backend/store";
import { ensureRuntime } from "@/lib/backend/runtime";

export function GET(): Response {
  ensureRuntime();
  return Response.json({ data: store.listShells() });
}