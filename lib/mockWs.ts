/**
 * Auralis Mock WebSocket Service
 *
 * Simulates the real-time push events defined in INTERFACE_CONTRACT.md §3.2:
 * - `objects:updated` (every 3s): orbital propagation position increments
 * - `conjunction:updated` (every 7s): collision probability updates
 * - `agent:status` (every 10s): agent state machine transitions
 * - `advisory:new` (every 30s): fresh mission advisory releases
 *
 * Provides both an EventEmitter pub/sub API and a standard Web API `MockWebSocket`
 * drop-in for frontend hooks and components.
 *
 * @see INTERFACE_CONTRACT.md §3.2
 */

import type {
  WsMessage,
  WsEventName,
  WsEventPayloadMap,
  TrackedObject,
  ConjunctionEvent,
  AgentStatus,
  Advisory,
} from '@/types/contract';

import {
  mockObjects,
  mockConjunctions,
  mockAgents,
} from './mockApi';
import { deriveKeplerianElements, GM_EARTH_KM3_S2 } from '@/data/propagator';

type EventListener<T = unknown> = (payload: T, message: WsMessage<T>) => void;
type RawMessageListener = (message: WsMessage) => void;

class MockWebSocketService {
  private listeners: Map<string, Set<EventListener<any>>> = new Map();
  private rawListeners: Set<RawMessageListener> = new Set();
  private intervalIds: NodeJS.Timeout[] = [];
  private active = false;

  // Mutable working state for simulation
  private objectsState: TrackedObject[] = JSON.parse(JSON.stringify(mockObjects));
  private conjunctionsState: ConjunctionEvent[] = JSON.parse(JSON.stringify(mockConjunctions));
  private agentsState: AgentStatus[] = JSON.parse(JSON.stringify(mockAgents));

  /**
   * Subscribe to a typed WebSocket event.
   * Returns an unsubscribe callback function.
   */
  public on<K extends WsEventName>(
    event: K,
    callback: (payload: WsEventPayloadMap[K], message: WsMessage<WsEventPayloadMap[K]>) => void
  ): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback as EventListener<any>);

    // Auto-start timers on first subscription
    if (!this.active) {
      this.start();
    }

    return () => {
      this.listeners.get(event)?.delete(callback as EventListener<any>);
    };
  }

  /**
   * Subscribe to all incoming WebSocket messages uniformly.
   */
  public onMessage(callback: RawMessageListener): () => void {
    this.rawListeners.add(callback);
    if (!this.active) {
      this.start();
    }
    return () => {
      this.rawListeners.delete(callback);
    };
  }

  /**
   * Dispatches a WsMessage to all registered listeners.
   */
  public emit<K extends WsEventName>(event: K, payload: WsEventPayloadMap[K]): void {
    const msg: WsMessage<WsEventPayloadMap[K]> = {
      event,
      timestamp: new Date().toISOString(),
      payload,
    };

    const handlers = this.listeners.get(event);
    if (handlers) {
      for (const handler of handlers) {
        try {
          handler(payload, msg);
        } catch (err) {
          console.error(`[MockWS] Error in listener for event "${event}":`, err);
        }
      }
    }

    for (const rawHandler of this.rawListeners) {
      try {
        rawHandler(msg);
      } catch (err) {
        console.error('[MockWS] Error in raw message listener:', err);
      }
    }
  }

  /**
   * Starts the mock emission timers.
   */
  public start(): void {
    if (this.active) return;
    this.active = true;

    // Timer 1: objects:updated (Every 3 seconds — physical orbital propagation with Velocity Verlet)
    const objectsTimer = setInterval(() => {
      const dt = 3; // 3 seconds real time advance
      const mu = GM_EARTH_KM3_S2;

      this.objectsState = this.objectsState.map((obj) => {
        // Physical gravitational acceleration: a = -mu / r^3 * r
        const rSq = obj.position.x * obj.position.x + obj.position.y * obj.position.y + obj.position.z * obj.position.z;
        const r = Math.sqrt(rSq) || 6771;
        const aFactor = -mu / (r * rSq);
        const ax = aFactor * obj.position.x;
        const ay = aFactor * obj.position.y;
        const az = aFactor * obj.position.z;

        // Velocity Verlet position update: r(t+dt) = r(t) + v(t)*dt + 0.5*a*dt^2
        const newX = obj.position.x + obj.velocity.vx * dt + 0.5 * ax * dt * dt;
        const newY = obj.position.y + obj.velocity.vy * dt + 0.5 * ay * dt * dt;
        const newZ = obj.position.z + obj.velocity.vz * dt + 0.5 * az * dt * dt;

        // Acceleration at new position
        const newRSq = newX * newX + newY * newY + newZ * newZ;
        const newR = Math.sqrt(newRSq) || 6771;
        const newAFactor = -mu / (newR * newRSq);
        const newAx = newAFactor * newX;
        const newAy = newAFactor * newY;
        const newAz = newAFactor * newZ;

        // Velocity Verlet velocity update: v(t+dt) = v(t) + 0.5*(a + a_new)*dt
        const newVx = obj.velocity.vx + 0.5 * (ax + newAx) * dt;
        const newVy = obj.velocity.vy + 0.5 * (ay + newAy) * dt;
        const newVz = obj.velocity.vz + 0.5 * (az + newAz) * dt;

        const newPos = {
          x: Number(newX.toFixed(3)),
          y: Number(newY.toFixed(3)),
          z: Number(newZ.toFixed(3)),
        };
        const newVel = {
          vx: Number(newVx.toFixed(4)),
          vy: Number(newVy.toFixed(4)),
          vz: Number(newVz.toFixed(4)),
        };
        const newAlt = Number((newR - 6371.0).toFixed(2));

        return {
          ...obj,
          position: newPos,
          velocity: newVel,
          altitude: newAlt,
          orbitalElements: deriveKeplerianElements(newPos, newVel),
          lastUpdated: new Date().toISOString(),
        };
      });

      this.emit('objects:updated', { objects: this.objectsState });
    }, 3000);

    // Timer 2: conjunction:updated (Every 7 seconds — simulate recalculation)
    const conjunctionTimer = setInterval(() => {
      if (this.conjunctionsState.length === 0) return;
      const target = this.conjunctionsState[0]; // primary ISS vs COSMOS event
      // Perturb collision probability slightly (+- 3%)
      const jitter = (Math.random() - 0.5) * 0.06;
      const newPc = Math.max(1e-6, target.collisionProbability * (1 + jitter));
      
      const updatedEvent: ConjunctionEvent = {
        ...target,
        collisionProbability: Number(newPc.toExponential(2)),
        updatedAt: new Date().toISOString(),
      };
      this.conjunctionsState[0] = updatedEvent;

      this.emit('conjunction:updated', updatedEvent);
    }, 7000);

    // Timer 3: agent:status (Every 10 seconds — simulate agent activity transitions)
    const agentTimer = setInterval(() => {
      const agentIndex = Math.floor(Math.random() * this.agentsState.length);
      const agent = this.agentsState[agentIndex];
      const nextState = agent.state === 'idle' ? 'processing' : agent.state === 'processing' ? 'idle' : 'processing';
      const updatedAgent: AgentStatus = {
        ...agent,
        state: nextState,
        lastHeartbeat: new Date().toISOString(),
        currentTask: nextState === 'processing' ? `Screening epoch ${new Date().toISOString().slice(11, 19)}` : null,
        processedCount: agent.processedCount + (nextState === 'idle' ? 1 : 0),
      };
      this.agentsState[agentIndex] = updatedAgent;

      this.emit('agent:status', updatedAgent);
    }, 10000);

    this.intervalIds = [objectsTimer, conjunctionTimer, agentTimer];
  }

  /**
   * Stops all mock emission timers and cleans up.
   */
  public stop(): void {
    this.intervalIds.forEach((id) => clearInterval(id));
    this.intervalIds = [];
    this.active = false;
  }

  public isRunning(): boolean {
    return this.active;
  }

  public resetState(): void {
    this.objectsState = JSON.parse(JSON.stringify(mockObjects));
    this.conjunctionsState = JSON.parse(JSON.stringify(mockConjunctions));
    this.agentsState = JSON.parse(JSON.stringify(mockAgents));
  }
}

// Singleton service instance
export const mockWs = new MockWebSocketService();

// ============================================================================
// Web-Standard MockWebSocket Class (Drop-in for native WebSocket)
// ============================================================================

export class MockWebSocket {
  public static readonly CONNECTING = 0;
  public static readonly OPEN = 1;
  public static readonly CLOSING = 2;
  public static readonly CLOSED = 3;

  public readyState: number = MockWebSocket.CONNECTING;
  public url: string;

  public onopen: ((event: Event) => void) | null = null;
  public onmessage: ((event: MessageEvent) => void) | null = null;
  public onclose: ((event: CloseEvent) => void) | null = null;
  public onerror: ((event: Event) => void) | null = null;

  private cleanupSubscription: (() => void) | null = null;

  constructor(url: string) {
    this.url = url;

    // Simulate connection delay (50ms)
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      if (this.onopen) {
        this.onopen(new Event('open'));
      }

      // Attach to mockWs dispatcher
      this.cleanupSubscription = mockWs.onMessage((msg) => {
        if (this.readyState === MockWebSocket.OPEN && this.onmessage) {
          const messageEvent = new MessageEvent('message', {
            data: JSON.stringify(msg),
          });
          this.onmessage(messageEvent);
        }
      });
    }, 50);
  }

  public send(data: string | ArrayBufferLike | Blob | ArrayBufferView): void {
    // In mock mode, client-sent messages can trigger mock actions if desired
    try {
      const parsed = typeof data === 'string' ? JSON.parse(data) : null;
      if (parsed?.action === 'ping') {
        setTimeout(() => {
          if (this.readyState === MockWebSocket.OPEN && this.onmessage) {
            this.onmessage(
              new MessageEvent('message', {
                data: JSON.stringify({ event: 'pong', timestamp: new Date().toISOString(), payload: {} }),
              })
            );
          }
        }, 10);
      }
    } catch {
      // ignore non-json messages
    }
  }

  public close(): void {
    this.readyState = MockWebSocket.CLOSED;
    if (this.cleanupSubscription) {
      this.cleanupSubscription();
      this.cleanupSubscription = null;
    }
    if (this.onclose) {
      this.onclose(new CloseEvent('close', { wasClean: true, code: 1000 }));
    }
  }
}
