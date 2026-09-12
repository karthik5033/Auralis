import type { AgentType, AuditAction, AuditLogEntry } from "@/types/contract";
import { messageBus } from "@/lib/messageBus";
import { store } from "./store";

export type AuditEntityType = "conjunction" | "object" | "maneuver" | "shell";

export function recordAuditEntry(input: {
  agentId: string;
  agentType: AgentType;
  action: AuditAction;
  description: string;
  relatedEntityId?: string | null;
  relatedEntityType?: AuditEntityType | null;
  metadata?: Record<string, unknown>;
}): AuditLogEntry {
  const entry: AuditLogEntry = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    agentId: input.agentId,
    agentType: input.agentType,
    action: input.action,
    description: input.description,
    relatedEntityId: input.relatedEntityId ?? null,
    relatedEntityType: input.relatedEntityType ?? null,
    metadata: input.metadata ?? {},
  };

  store.addAuditEntry(entry);
  void messageBus.publish(
    messageBus.createMessage({
      source: input.agentType,
      target: "broadcast",
      type: "audit:logged",
      correlationId: entry.relatedEntityId,
      payload: entry,
    }),
  );
  return entry;
}