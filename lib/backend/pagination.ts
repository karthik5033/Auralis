import type { PaginatedResponse } from "@/types/contract";

export function paginate<T>(items: readonly T[], limit = 50, offset = 0): PaginatedResponse<T> {
  const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.floor(limit)) : 50;
  const safeOffset = Number.isFinite(offset) ? Math.max(0, Math.floor(offset)) : 0;
  return {
    data: items.slice(safeOffset, safeOffset + safeLimit),
    total: items.length,
    limit: safeLimit,
    offset: safeOffset,
  };
}