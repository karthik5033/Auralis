import { computeShellPopulations, fetchCuratedCatalog, parseGPToTrackedObject, spaceTrackClient } from "@/data";
import type {
  AgentMessage,
  AgentStatus,
  ShellPopulationUpdatedPayload,
  StateVectorsUpdatedPayload,
  TrackedObject,
} from "@/types/contract";
import { recordAuditEntry } from "./audit";
import { messageBus } from "@/lib/messageBus";
import { store } from "./store";

const TRACKER_STATUS: AgentStatus = {
  agentId: "tracker",
  agentName: "Tracker Agent",
  agentType: "tracker",
  state: "idle",
  lastHeartbeat: new Date(0).toISOString(),
  currentTask: null,
  processedCount: 0,
  errorCount: 0,
};

export class TrackerAgent {
  private intervalHandle: ReturnType<typeof setInterval> | undefined;
  private status: AgentStatus = { ...TRACKER_STATUS };

  constructor(private readonly intervalMs = 60_000, private readonly catalogLimit = 800) {
    this.publishStatus();
  }

  async runOnce(): Promise<TrackedObject[]> {
    this.updateStatus({ state: "processing", currentTask: "Ingesting and propagating live catalog" });
    try {
      // 1. Fetch live official CDMs from Space-Track.org if credentials available
      try {
        const liveCdms = await spaceTrackClient.fetchConjunctions(30);
        if (liveCdms.length > 0) {
          for (const cdm of liveCdms) {
            const existing = store.getConjunction(cdm.id);
            store.setConjunction(cdm);
            if (!existing) {
              await this.publish("conjunction:created", "broadcast", cdm);
              recordAuditEntry({
                agentId: this.status.agentId,
                agentType: this.status.agentType,
                action: "conjunction_detected",
                description: `Live Space-Track CDM ingested: ${cdm.id} (Pc=${cdm.collisionProbability.toExponential(2)})`,
                relatedEntityId: cdm.id,
                relatedEntityType: "conjunction",
              });
            }
          }
        }
      } catch (cdmErr) {
        console.warn("[Tracker] Live Space-Track CDM fetch fallback:", cdmErr);
      }

      // 2. Fetch live GP elements from Space-Track or curated CelesTrak
      let objects: TrackedObject[] = [];
      try {
        const liveGps = await spaceTrackClient.fetchGPObjects(this.catalogLimit);
        if (liveGps.length > 0) {
          objects = liveGps;
        }
      } catch {
        // Fall back to curated catalog
      }

      if (objects.length === 0) {
        const rawCatalog = await fetchCuratedCatalog(this.catalogLimit);
        objects = rawCatalog
          .map((record) => parseGPToTrackedObject(record))
          .filter((object): object is TrackedObject => object !== null);
      }

      // Preserve identity across refreshes. Profile URLs use object.id, while
      // upstream TLE/CDM records are refreshed and may receive new UUIDs.
      const previousIdsByNorad = new Map(
        store.listObjects().map((object) => [object.noradId, object.id]),
      );
      objects.forEach((object) => {
        const previousId = previousIdsByNorad.get(object.noradId);
        if (previousId) object.id = previousId;
        store.setObject(object);
      });

      // Space-Track CDMs identify participants as `norad-<catalog id>` while
      // the API contract exposes tracked-object UUIDs. Resolve that boundary
      // after GP ingestion so CDM detail routes can hydrate both participants.
      const objectIdByNorad = new Map(
        objects.map((object) => [String(object.noradId), object.id]),
      );
      store.listConjunctions().forEach((conjunction) => {
        const primaryNorad = conjunction.primaryObjectId.startsWith("norad-")
          ? conjunction.primaryObjectId.slice(6)
          : null;
        const secondaryNorad = conjunction.secondaryObjectId.startsWith("norad-")
          ? conjunction.secondaryObjectId.slice(6)
          : null;
        const primaryObjectId = primaryNorad ? objectIdByNorad.get(primaryNorad) : conjunction.primaryObjectId;
        const secondaryObjectId = secondaryNorad ? objectIdByNorad.get(secondaryNorad) : conjunction.secondaryObjectId;
        if (primaryObjectId && secondaryObjectId) {
          store.setConjunction({ ...conjunction, primaryObjectId, secondaryObjectId, updatedAt: new Date().toISOString() });
        }
      });
      const timestamp = new Date().toISOString();
      const allObjects = store.listObjects();
      const statePayload: StateVectorsUpdatedPayload = {
        epoch: timestamp,
        objects,
        isDelta: true,
      };
      const shellPayload: ShellPopulationUpdatedPayload = computeShellPopulations(allObjects, timestamp);

      await this.publish("state_vectors_updated", "risk_assessor", statePayload);
      await this.publish("shell_population_updated", "epidemic_forecaster", shellPayload);
      recordAuditEntry({
        agentId: this.status.agentId,
        agentType: this.status.agentType,
        action: "tle_ingested",
        description: `Ingested ${objects.length} tracked objects from live telemetry stream`,
        metadata: { objectCount: objects.length },
      });
      recordAuditEntry({
        agentId: this.status.agentId,
        agentType: this.status.agentType,
        action: "propagation_complete",
        description: `Propagated ${objects.length} tracked objects at ${timestamp}`,
        metadata: { objectCount: objects.length, shellCount: shellPayload.shells.length },
      });
      this.updateStatus({
        state: "idle",
        currentTask: null,
        processedCount: this.status.processedCount + objects.length,
      });
      return objects;
    } catch (error) {
      this.updateStatus({
        state: "error",
        currentTask: error instanceof Error ? error.message : "Tracker cycle failed",
        errorCount: this.status.errorCount + 1,
      });
      throw error;
    }
  }

  start(): void {
    if (this.intervalHandle) return;
    void this.runOnce().catch(() => undefined);
    this.intervalHandle = setInterval(() => {
      void this.runOnce().catch(() => undefined);
    }, this.intervalMs);
  }

  stop(): void {
    if (!this.intervalHandle) return;
    clearInterval(this.intervalHandle);
    this.intervalHandle = undefined;
  }

  restart(): void {
    this.stop();
    this.updateStatus({ state: "idle", currentTask: null });
    this.start();
  }

  getStatus(): AgentStatus { return { ...this.status }; }

  private updateStatus(update: Partial<AgentStatus>): void {
    this.status = { ...this.status, ...update, lastHeartbeat: new Date().toISOString() };
    store.setAgentStatus(this.status);
    this.publishStatus();
  }

  private publishStatus(): void {
    store.setAgentStatus(this.status);
    void messageBus.publish(
      messageBus.createMessage<AgentStatus>({
        source: "tracker",
        target: "broadcast",
        type: "agent:status",
        correlationId: null,
        payload: this.status,
      }),
    );
  }

  private publish<T>(type: string, target: AgentMessage<T>["target"], payload: T): Promise<void> {
    return messageBus.publish(
      messageBus.createMessage({
        source: "tracker",
        target,
        type,
        correlationId: null,
        payload,
      }),
    );
  }
}

export const trackerAgent = new TrackerAgent();