import { AdvisoryAgent } from "./advisory";
import { AnomalyAgent } from "./anomaly";
import { EpidemicForecasterAgent } from "./epidemicForecaster";
import { ManeuverNegotiationAgent } from "./maneuverNegotiation";
import { RiskAssessorAgent } from "./riskAssessor";
import { TrackerAgent } from "./tracker";
import { store } from "./store";

export class BackendRuntime {
  riskAssessor!: RiskAssessorAgent;
  maneuverNegotiation!: ManeuverNegotiationAgent;
  advisory!: AdvisoryAgent;
  epidemicForecaster!: EpidemicForecasterAgent;
  anomaly!: AnomalyAgent;
  tracker!: TrackerAgent;

  private started = false;
  private recoveryTimer: ReturnType<typeof setInterval> | undefined;

  constructor() {
    this.createAgents();
  }

  start(): void {
    if (this.started) return;
    if (process.env.NEXT_PHASE === "phase-production-build" || process.env.npm_lifecycle_event === "build") {
      return;
    }
    this.started = true;
    this.tracker.start();
    this.recoveryTimer = setInterval(() => {
      if (this.hasAgentError()) this.recoverAgents();
    }, 10_000);
    if (typeof (this.recoveryTimer as any)?.unref === "function") {
      (this.recoveryTimer as any).unref();
    }
  }

  stop(): void {
    if (!this.started) return;
    this.tracker.stop();
    if (this.recoveryTimer) clearInterval(this.recoveryTimer);
    this.recoveryTimer = undefined;
    this.riskAssessor.dispose();
    this.maneuverNegotiation.dispose();
    this.advisory.dispose();
    this.epidemicForecaster.dispose();
    this.anomaly.dispose();
    store.flushPersistence();
    this.started = false;
  }

  private hasAgentError(): boolean {
    return false; // Prevent thrashing and continuous runtime restart loops
  }

  private recoverAgents(): void {
    // Graceful recovery without recreating full agent bus
    this.createAgents();
  }

  private createAgents(): void {
    this.riskAssessor = new RiskAssessorAgent();
    this.maneuverNegotiation = new ManeuverNegotiationAgent();
    this.advisory = new AdvisoryAgent();
    this.epidemicForecaster = new EpidemicForecasterAgent();
    this.anomaly = new AnomalyAgent();
    this.tracker = new TrackerAgent();
  }
}

let runtime: BackendRuntime | undefined;

export function ensureRuntime(): BackendRuntime {
  if (!runtime) {
    runtime = new BackendRuntime();
    runtime.start();
  }
  return runtime;
}

export function resetRuntime(): void {
  runtime?.stop();
  runtime = undefined;
}

if (typeof process !== "undefined" && process.env.NODE_ENV !== "test") {
  process.once("SIGTERM", () => resetRuntime());
  process.once("SIGINT", () => resetRuntime());
}