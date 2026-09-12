import { paginate } from "./pagination";
import { ensureRuntime } from "./runtime";

export function queryNumber(value: string | null, fallback: number): number {
  if (value === null || value.trim() === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function paginated<T>(request: Request, items: readonly T[]): Response {
  ensureRuntime();
  const url = new URL(request.url);
  return Response.json(
    paginate(items, queryNumber(url.searchParams.get("limit"), 50), queryNumber(url.searchParams.get("offset"), 0)),
  );
}