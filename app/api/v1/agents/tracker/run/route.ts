import { ensureRuntime } from "@/lib/backend/runtime";
import { authorizeApiRequest } from "@/lib/backend/auth";

export async function POST(request: Request): Promise<Response> {
  const authorizationError = authorizeApiRequest(request);
  if (authorizationError) return authorizationError;
  const runtime = ensureRuntime();
  const objects = await runtime.tracker.runOnce();
  return Response.json({
    success: true,
    objectCount: objects.length,
    status: runtime.tracker.getStatus(),
    timestamp: new Date().toISOString(),
  });
}