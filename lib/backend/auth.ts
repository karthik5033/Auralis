import crypto from "node:crypto";

export function authorizeApiRequest(request: Request): Response | null {
  const expectedKey = process.env.AURALIS_API_KEY?.trim();
  if (!expectedKey) return null;

  const authorization = request.headers.get("authorization");
  const bearerKey = authorization?.startsWith("Bearer ") ? authorization.slice(7).trim() : null;
  const suppliedKey = request.headers.get("x-api-key") ?? bearerKey;
  if (suppliedKey && suppliedKey.length === expectedKey.length && crypto.timingSafeEqual(Buffer.from(suppliedKey), Buffer.from(expectedKey))) return null;

  return Response.json({ error: "Unauthorized" }, { status: 401 });
}