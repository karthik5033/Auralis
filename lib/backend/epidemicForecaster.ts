import { runEpidemicForecast } from "@/data";
import type { AgentStatus, ShellPopulationUpdatedPayload } from "@/types/contract";
import { messageBus } from "@/lib/messageBus";
import { recordAuditEntry } from "./audit";
import { store } from "./store";

export class EpidemicForecasterAgent {
  private readonly unsubscribe: () => void;
  private status: AgentStatus = { agentId: "epidemic-forecaster", agentName: "Epidemic Forecaster Agent", agentType: "epidemic_forecaster", state: "idle", lastHeartbeat: new Date(0).toISOString(), currentTask: null, processedCount: 0, errorCount: 0 };

  constructor() {
    this.unsubscribe = messageBus.subscribe<ShellPopulationUpdatedPayload>("shell_population_updated", async (message) => { await this.forecast(message.payload); }, { source: "tracker", target: "*" });
    this.publishStatus();
  }

  async forecast(payload: ShellPopulationUpdatedPayload): Promise<void> {
    this.status = { ...this.status, state: "processing", currentTask: "Computing shell cascade forecast", lastHeartbeat: new Date().toISOString() };
    this.publishStatus();
    const forecast = runEpidemicForecast(store.listObjects(), payload.timestamp);
    forecast.shellSnapshots.forEach((snapshot) => store.setShell(snapshot));
    await messageBus.publish(messageBus.createMessage({ source: "epidemic_forecaster", target: "advisory", type: "cascade_forecast_complete", correlationId: null, payload: forecast }));
    recordAuditEntry({ agentId: this.status.agentId, agentType: this.status.agentType, action: "cascade_forecast_updated", description: `Updated ${forecast.shellSnapshots.length} shell forecasts`, metadata: { criticalShells: forecast.criticalShells } });
    this.status = { ...this.status, state: "idle", currentTask: null, processedCount: this.status.processedCount + forecast.shellSnapshots.length, lastHeartbeat: new Date().toISOString() };
    this.publishStatus();
  }

  getStatus(): AgentStatus { return { ...this.status }; }
  dispose(): void { this.unsubscribe(); }
  private publishStatus(): void { store.setAgentStatus(this.status); void messageBus.publish(messageBus.createMessage({ source: "epidemic_forecaster", target: "broadcast", type: "agent:status", correlationId: null, payload: this.status })); }
}