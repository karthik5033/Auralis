import type { RiskLevel } from "@/types/contract";

export function classifyRisk(collisionProbability: number): RiskLevel {
  if (!Number.isFinite(collisionProbability) || collisionProbability < 0) {
    throw new RangeError("Collision probability must be a finite non-negative number");
  }
  if (collisionProbability >= 1e-3) return "critical";
  if (collisionProbability >= 1e-4) return "elevated";
  return "nominal";
}