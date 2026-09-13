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
  getObject(id: string): TrackedObject | undefined {
    const direct = this.objectRecords.get(id);
    if (direct) return direct;
    const cleanId = id.startsWith("norad-") ? id.slice(6) : id;
    for (const obj of this.objectRecords.values()) {
      if (String(obj.noradId) === cleanId || obj.id === cleanId || String(obj.noradId) === id) {
        return obj;
      }
    }
    return undefined;
  }
  listObjects(): TrackedObject[] { return [...this.objectRecords.values()]; }
  removeObject(id: string): boolean { const removed = this.objectRecords.delete(id); if (removed) this.schedulePersist(); return removed; }

  setConjunction(conjunction: ConjunctionEvent): void { this.conjunctionRecords.set(conjunction.id, conjunction); this.schedulePersist(); }
  getConjunction(id: string): ConjunctionEvent | undefined { return this.conjunctionRecords.get(id); }
  listConjunctions(): ConjunctionEvent[] { return [...this.conjunctionRecords.values()]; }

  setManeuver(maneuver: ManeuverProposal): void { this.maneuverRecords.set(maneuver.id, maneuver); this.schedulePersist(); }
  getManeuver(id: string): ManeuverProposal | undefined { return this.maneuverRecords.get(id); }
  listManeuvers(): ManeuverProposal[] {
    return [...this.maneuverRecords.values()];
  }

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
    try {
      fs.writeFileSync(this.persistencePath, JSON.stringify(snapshot), "utf8");
    } catch (error) {
      console.warn("[Auralis] Could not write persistence snapshot:", error);
    }
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

    // Independent default seeders if any collection is empty
    if (this.objectRecords.size === 0) {
      try {
        const { mockObjects } = require("@/lib/mockApi");
        mockObjects?.forEach((object: TrackedObject) => this.objectRecords.set(object.id, object));
      } catch (err) {
        console.warn("[Auralis] Could not seed default mock objects:", err);
      }
    }

    if (this.conjunctionRecords.size === 0) {
      try {
        const { mockConjunctions } = require("@/lib/mockApi");
        mockConjunctions?.forEach((conjunction: ConjunctionEvent) => this.conjunctionRecords.set(conjunction.id, conjunction));
      } catch (err) {
        console.warn("[Auralis] Could not seed default mock conjunctions:", err);
      }
    }

    if (this.shellRecords.size === 0) {
      try {
        const { mockShells } = require("@/lib/mockApi");
        mockShells?.forEach((shell: ShellRiskSnapshot) => this.shellRecords.set(shell.shellId, shell));
      } catch (err) {
        console.warn("[Auralis] Could not seed default mock shells:", err);
      }
    }

    this.ensureManeuverProposals();
  }

  private ensureManeuverProposals(): void {
    if (this.maneuverRecords.size === 0) {
      try {
        const { mockManeuvers } = require("@/lib/mockApi");
        if (Array.isArray(mockManeuvers)) {
          mockManeuvers.forEach((m: ManeuverProposal) => this.maneuverRecords.set(m.id, m));
        }
      } catch {
        // Fall through to dynamic physics synthesizer
      }
    }

    // Synthesize astrodynamic maneuver proposals for high-risk conjunctions
    let criticalConjunctions = this.listConjunctions().filter(
      (c) => c.riskLevel === "critical" || c.riskLevel === "elevated" || c.collisionProbability > 1e-4
    );

    if (criticalConjunctions.length === 0) {
      criticalConjunctions = this.listConjunctions().slice(0, 8);
    }

    if (criticalConjunctions.length === 0 && this.maneuverRecords.size === 0) {
      const activeSats = this.listObjects().filter(o => o.type === "satellite").slice(0, 5);
      const otherObjs = this.listObjects().filter(o => o.type !== "satellite" || o.id !== activeSats[0]?.id).slice(0, 5);
      activeSats.forEach((sat, i) => {
        const sec = otherObjs[i] || otherObjs[0];
        if (!sec) return;
        const conjId = `ce-auto-${sat.noradId}-${sec.noradId}`;
        const autoConj: ConjunctionEvent = {
          id: conjId,
          primaryObjectId: sat.id,
          secondaryObjectId: sec.id,
          tca: new Date(Date.now() + (i + 2) * 3600 * 1000).toISOString(),
          missDistance: parseFloat((0.18 + i * 0.09).toFixed(3)),
          collisionProbability: parseFloat((3.4e-4 * Math.pow(0.4, i)).toExponential(2)),
          relativeVelocity: 11.4,
          riskLevel: i === 0 ? "critical" : "elevated",
          status: "active",
          maxCollisionProbability: parseFloat((3.4e-4 * Math.pow(0.4, i)).toExponential(2)),
          screeningWindowStart: new Date(Date.now() - 3600 * 1000).toISOString(),
          screeningWindowEnd: new Date(Date.now() + 72 * 3600 * 1000).toISOString(),
          maneuverProposalId: null,
          createdAt: new Date(Date.now() - 3600 * 1000).toISOString(),
          updatedAt: new Date().toISOString(),
        };
        this.setConjunction(autoConj);
        criticalConjunctions.push(autoConj);
      });
    }

    for (const conj of criticalConjunctions) {
      if ([...this.maneuverRecords.values()].some((m) => m.conjunctionEventId === conj.id)) {
        continue;
      }
      const primary = this.getObject(conj.primaryObjectId);
      const secondary = this.getObject(conj.secondaryObjectId);
      if (!primary && !secondary) continue;

      const primaryIsSat = primary?.type === "satellite" && primary.status === "active";
      const secondaryIsSat = secondary?.type === "satellite" && secondary.status === "active";
      const maneuveringObj = primaryIsSat ? primary! : secondaryIsSat ? secondary! : primary || secondary!;
      const opposingObj = maneuveringObj.id === primary?.id ? secondary : primary;

      const altKm = maneuveringObj.altitude || 550;
      const rOrbital = 6371 + altKm;
      const mu = 398600.4418; // km^3/s^2
      const meanMotion = Math.sqrt(mu / Math.pow(rOrbital, 3)); // rad/s

      // Required clearance outside 3-sigma covariance ellipsoid (typically 15-25 km)
      const targetClearanceKm = Math.max(15.0, 25.0 - (conj.missDistance || 1.0));
      const rawDeltaV = (meanMotion * targetClearanceKm * 1000) / 4.0;
      const deltaVMagnitude = Math.min(0.85, Math.max(0.12, parseFloat((rawDeltaV * 0.001).toFixed(2)) || 0.38));

      // Tsiolkovsky Rocket Equation: deltaM = m0 * (1 - exp(-deltaV / (Isp * g0)))
      const isElectric = maneuveringObj.name.toLowerCase().includes("starlink") || maneuveringObj.name.toLowerCase().includes("oneweb");
      const isp = isElectric ? 1650 : 225; // seconds (Electric Hall effect vs Hydrazine)
      const g0 = 9.80665; // m/s^2
      const wetMassKg = maneuveringObj.name.toLowerCase().includes("station") || maneuveringObj.name.toLowerCase().includes("zarya") ? 420000 : isElectric ? 310 : 850;
      const fuelCostKg = parseFloat((wetMassKg * (1 - Math.exp(-deltaVMagnitude / (isp * g0)))).toFixed(3));

      const primaryOp = primary?.operatorId || "SpaceX Starlink";
      const opposingOp = secondary?.operatorId || (secondary?.type === "debris" ? "Derelict Debris" : "Eutelsat OneWeb");
      const resultingPc = parseFloat((conj.collisionProbability * Math.exp(-Math.pow(targetClearanceKm / 2.5, 2))).toExponential(2)) || 1.2e-8;

      const tcaMs = new Date(conj.tca).getTime();
      const burnTimeMs = tcaMs - 3 * 3600 * 1000;
      const burnTime = new Date(burnTimeMs > Date.now() ? burnTimeMs : Date.now() + 1800 * 1000).toISOString();

      const proposal: ManeuverProposal = {
        id: `prop-${conj.id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8)}-${maneuveringObj.noradId}`,
        conjunctionEventId: conj.id,
        maneuveringObjectId: maneuveringObj.id,
        operatorAgentId: primaryOp,
        opposingOperatorAgentId: opposingOp,
        deltaV: {
          magnitude: deltaVMagnitude,
          direction: { x: 0.85, y: 0.51, z: 0.12 },
        },
        burnTime,
        fuelCost: fuelCostKg,
        rationale: `Autonomous Nash yield: ${maneuveringObj.name} executes ${deltaVMagnitude} m/s in-track impulse (${fuelCostKg} kg ${isElectric ? "Xenon" : "Hydrazine"}) expanding miss distance to ${targetClearanceKm.toFixed(1)} km (Pc ${conj.collisionProbability.toExponential(1)} -> ${resultingPc.toExponential(1)}).`,
        negotiationStatus: "accepted",
        negotiationLog: [
          {
            timestamp: new Date(Date.now() - 3600 * 1000).toISOString(),
            agentId: "maneuver-negotiation",
            action: "INITIATE",
            message: `Identified critical encounter ${conj.id} with Pc ${conj.collisionProbability.toExponential(2)}. Initiating bilateral protocol.`,
            deltaVBid: null,
          },
          {
            timestamp: new Date(Date.now() - 3590 * 1000).toISOString(),
            agentId: primaryOp,
            action: "BID",
            message: `${maneuveringObj.name} proposes ${deltaVMagnitude} m/s in-track burn using ${isElectric ? "Hall effect" : "reaction thrusters"}.`,
            deltaVBid: deltaVMagnitude,
          },
          {
            timestamp: new Date(Date.now() - 3580 * 1000).toISOString(),
            agentId: opposingOp,
            action: "ACCEPT",
            message: `${opposingOp} confirms trajectory clearance and clears orbital corridor.`,
            deltaVBid: null,
          },
        ],
        resultingPc,
        createdAt: new Date(Date.now() - 3600 * 1000).toISOString(),
        resolvedAt: new Date(Date.now() - 3580 * 1000).toISOString(),
      };

      this.maneuverRecords.set(proposal.id, proposal);
    }
  }
}

export const store = new InMemoryStore();