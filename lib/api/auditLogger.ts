export interface AuditEventPayload {
  event_type: string;
  user_id?: string;
  user_role?: string;
  details?: Record<string, any>;
}

export const AuditLogger = {
  logEvent: (event: AuditEventPayload) => {
    if (typeof window !== "undefined") {
      try {
        const key = "crimeintel_audit_logs";
        const stored = JSON.parse(localStorage.getItem(key) || "[]");
        stored.unshift({
          id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          timestamp: new Date().toISOString(),
          ...event,
        });
        localStorage.setItem(key, JSON.stringify(stored.slice(0, 100)));
      } catch {
        // Silently catch storage errors
      }
    }
  },
};
