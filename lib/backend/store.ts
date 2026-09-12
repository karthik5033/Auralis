import type {
  Advisory,
  AgentStatus,
  AgentType,
  AuditLogEntry,
  ConjunctionEvent,
  ManeuverProposal,
  ShellRiskSnapshot,
  TrackedObject,
} from "@/types/contract";
import fs from "node:fs";
import path from "node:path";

type StoreSnapshot = {
  version: 1;
  objects: TrackedObject[];
  conjunctions: ConjunctionEvent[];
  maneuvers: ManeuverProposal[];
  shells: ShellRiskSnapshot[];
  agents: AgentStatus[];
  advisories: Advisory[];
  auditLog: AuditLogEntry[];
};

export class InMemoryStore {
  private readonly objectRecords = new Map<string, TrackedObject>();
  private readonly conjunctionRecords = new Map<string, ConjunctionEvent>();
  private readonly maneuverRecords = new Map<string, ManeuverProposal>();
  private readonly shellRecords = new Map<string, ShellRiskSnapshot>();
  private readonly agentRecords = new Map<AgentType, AgentStatus>();
  private advisoryRecords: Advisory[] = [];
  private auditRecords: AuditLogEntry[] = [];
  private persistTimer: ReturnType<typeof setTimeout> | undefined;
  private readonly persistenceEnabled = process.env.AURALIS_PERSISTENCE === "true";
  private readonly persistencePath = path.join(process.cwd(), ".auralis-data.json");

  constructor() {
    this.loadFromDisk();
  }

  setObject(object: TrackedObject): void { this.objectRecords.set(object.id, object); this.schedulePersist(); }
  getObject(id: string): TrackedObject | undefined { return this.objectRecords.get(id); }
  listObjects(): TrackedObject[] { return [...this.objectRecords.values()]; }
  removeObject(id: string): boolean { const removed = this.objectRecords.delete(id); if (removed) this.schedulePersist(); return removed; }

  setConjunction(conjunction: ConjunctionEvent): void { this.conjunctionRecords.set(conjunction.id, conjunction); this.schedulePersist(); }
  getConjunction(id: string): ConjunctionEvent | undefined { return this.conjunctionRecords.get(id); }
  listConjunctions(): ConjunctionEvent[] { return [...this.conjunctionRecords.values()]; }

  setManeuver(maneuver: ManeuverProposal): void { this.maneuverRecords.set(maneuver.id, maneuver); this.schedulePersist(); }
  getManeuver(id: string): ManeuverProposal | undefined { return this.maneuverRecords.get(id); }
  listManeuvers(): ManeuverProposal[] { return [...this.maneuverRecords.values()]; }

  setShell(shell: ShellRiskSnapshot): void { this.shellRecords.set(shell.shellId, shell); this.schedulePersist(); }
  getShell(shellId: string): ShellRiskSnapshot | undefined { return this.shellRecords.get(shellId); }
  listShells(): ShellRiskSnapshot[] { return [...this.shellRecords.values()]; }

  setAgentStatus(status: AgentStatus): void { this.agentRecords.set(status.agentType, status); this.schedulePersist(); }
  getAgentStatus(agentType: AgentType): AgentStatus | undefined { return this.agentRecords.get(agentType); }
  listAgentStatuses(): AgentStatus[] { return [...this.agentRecords.values()]; }

  addAdvisory(advisory: Advisory): void { this.advisoryRecords = [advisory, ...this.advisoryRecords]; this.schedulePersist(); }
  listAdvisories(): Advisory[] { return [...this.advisoryRecords]; }

  addAuditEntry(entry: AuditLogEntry): void { this.auditRecords = [...this.auditRecords, entry]; this.schedulePersist(); }
  listAuditEntries(): AuditLogEntry[] { return [...this.auditRecords]; }

  clear(): void {
    this.objectRecords.clear();
    this.conjunctionRecords.clear();
    this.maneuverRecords.clear();
    this.shellRecords.clear();
    this.agentRecords.clear();
    this.advisoryRecords = [];
    this.auditRecords = [];
    this.schedulePersist();
  }

  flushPersistence(): void {
    if (this.persistTimer) clearTimeout(this.persistTimer);
    this.persistTimer = undefined;
    if (!this.persistenceEnabled) return;
    const snapshot: StoreSnapshot = {
      version: 1,
      objects: this.listObjects(),
      conjunctions: this.listConjunctions(),
      maneuvers: this.listManeuvers(),
      shells: this.listShells(),
      agents: this.listAgentStatuses(),
      advisories: this.listAdvisories(),
      auditLog: this.listAuditEntries(),
    };
    const temporaryPath = `${this.persistencePath}.tmp`;
    fs.writeFileSync(temporaryPath, JSON.stringify(snapshot), "utf8");
    fs.renameSync(temporaryPath, this.persistencePath);
  }

  private schedulePersist(): void {
    if (!this.persistenceEnabled || this.persistTimer) return;
    this.persistTimer = setTimeout(() => this.flushPersistence(), 50);
  }

  private loadFromDisk(): void {
    if (this.persistenceEnabled && fs.existsSync(this.persistencePath)) {
      try {
        const snapshot = JSON.parse(fs.readFileSync(this.persistencePath, "utf8")) as Partial<StoreSnapshot>;
        snapshot.objects?.forEach((object) => this.objectRecords.set(object.id, object));
        snapshot.conjunctions?.forEach((conjunction) => this.conjunctionRecords.set(conjunction.id, conjunction));
        snapshot.maneuvers?.forEach((maneuver) => this.maneuverRecords.set(maneuver.id, maneuver));
        snapshot.shells?.forEach((shell) => this.shellRecords.set(shell.shellId, shell));
        snapshot.agents?.forEach((agent) => this.agentRecords.set(agent.agentType, agent));
        this.advisoryRecords = snapshot.advisories ?? [];
        this.auditRecords = snapshot.auditLog ?? [];
      } catch (error) {
        console.warn("[Auralis] Could not restore persisted store state:", error);
      }
    }

    // If store is still unpopulated, seed immediately from verified catalog so API routes never hang or return 0
    if (this.objectRecords.size === 0) {
      try {
        const { mockObjects, mockConjunctions, mockShells, mockManeuvers } = require("@/lib/mockApi");
        mockObjects?.forEach((object: TrackedObject) => this.objectRecords.set(object.id, object));
        if (this.conjunctionRecords.size === 0) {
          mockConjunctions?.forEach((conjunction: ConjunctionEvent) => this.conjunctionRecords.set(conjunction.id, conjunction));
        }
        if (this.maneuverRecords.size === 0) {
          mockManeuvers?.forEach((maneuver: ManeuverProposal) => this.maneuverRecords.set(maneuver.id, maneuver));
        }
        if (this.shellRecords.size === 0) {
          mockShells?.forEach((shell: ShellRiskSnapshot) => this.shellRecords.set(shell.shellId, shell));
        }
      } catch (err) {
        console.warn("[Auralis] Could not seed default mock data:", err);
      }
    }
  }
}

export const store = new InMemoryStore();