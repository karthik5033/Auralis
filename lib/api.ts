/**
 * Auralis API Gateway & Client
 *
 * Provides a unified API interface that seamlessly flips between:
 * - Mock API (`lib/mockApi.ts`): Offline, realistic seed data conforming to INTERFACE_CONTRACT.md
 * Live Backend API: Real HTTP requests against the configured API base URL
 *
 * Governed by `NEXT_PUBLIC_API_MODE`:
 * - `mock` (default): zero backend dependency
 * - `live`: real agent backend endpoints
 *
 * @see INTERFACE_CONTRACT.md §3.1, §5
 */

import type {
  TrackedObject,
  ConjunctionEvent,
  ShellRiskSnapshot,
  ManeuverProposal,
  AgentStatus,
  Advisory,
  AuditLogEntry,
  DashboardSummary,
  ConjunctionDetailResponse,
  AgentsStatusResponse,
  ShellsResponse,
  CrisisInjectionRequest,
  CrisisInjectionResponse,
  PaginatedResponse,
  ObjectsQueryParams,
  ConjunctionsQueryParams,
  ManeuversQueryParams,
  AdvisoriesQueryParams,
  AuditQueryParams,
} from '@/types/contract';

import * as mockApi from './mockApi';
import { mockWs } from './mockWs';

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || '/api/v1';

export const WS_URL =
  process.env.NEXT_PUBLIC_WS_URL || '';

export const EVENTS_URL = `${API_BASE_URL}/events`;

export type ApiMode = 'mock' | 'live';

export function getApiMode(): ApiMode {
  return (process.env.NEXT_PUBLIC_API_MODE as ApiMode) === 'live' ? 'live' : 'mock';
}

export function isMockMode(): boolean {
  return getApiMode() === 'mock';
}

// ============================================================================
// Internal HTTP Request Helper (for Live Mode) with In-Memory Cache & Dedup
// ============================================================================

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const apiGetCache = new Map<string, CacheEntry<unknown>>();
const inFlightRequests = new Map<string, Promise<unknown>>();
const GET_CACHE_TTL_MS = 8_000; // 8-second client memory cache for snappy route switching

export function clearApiCache() {
  apiGetCache.clear();
}

async function fetchJson<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const isGet = !options?.method || options.method.toUpperCase() === 'GET';

  // Any mutation busts the read cache
  if (!isGet) {
    clearApiCache();
  }

  // Check read cache for instantaneous responses
  if (isGet) {
    const cached = apiGetCache.get(url);
    if (cached && Date.now() - cached.timestamp < GET_CACHE_TTL_MS) {
      return cached.data as T;
    }

    // Reuse in-flight request if another component requested the same URL simultaneously
    if (inFlightRequests.has(url)) {
      return inFlightRequests.get(url)! as Promise<T>;
    }
  }

  const fetchPromise = (async () => {
    const headers = new Headers(options?.headers);
    if (!headers.has('Content-Type') && options?.body) {
      headers.set('Content-Type', 'application/json');
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let errorDetail = '';
      try {
        const errJson = await response.json();
        errorDetail = errJson.error || errJson.message || JSON.stringify(errJson);
      } catch {
        errorDetail = await response.text();
      }
      throw new Error(
        `API error [${response.status} ${response.statusText}] at ${endpoint}: ${errorDetail}`
      );
    }

    const data = (await response.json()) as T;
    if (isGet) {
      apiGetCache.set(url, { data, timestamp: Date.now() });
    }
    return data;
  })();

  if (isGet) {
    inFlightRequests.set(url, fetchPromise);
    fetchPromise.finally(() => {
      inFlightRequests.delete(url);
    });
  }

  return fetchPromise;
}

function buildQueryString(params?: Record<string, string | number | undefined | null>): string {
  if (!params) return '';
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.set(key, String(value));
    }
  }
  const query = searchParams.toString();
  return query ? `?${query}` : '';
}

// ============================================================================
// Core API Methods (Contract §3.1)
// ============================================================================

/**
 * GET /api/v1/objects
 * List all tracked objects with optional type, shellId, and pagination filters.
 */
export async function getObjects(
  params?: ObjectsQueryParams
): Promise<PaginatedResponse<TrackedObject>> {
  if (isMockMode()) {
    return mockApi.getObjects(params);
  }
  const qs = buildQueryString(params as Record<string, string | number | undefined>);
  return fetchJson<PaginatedResponse<TrackedObject>>(`/objects${qs}`);
}

/**
 * GET /api/v1/objects/:id
 * Get a single tracked object by UUID.
 */
export async function getObjectById(id: string): Promise<TrackedObject | null> {
  if (isMockMode()) {
    return mockApi.getObjectById(id);
  }
  try {
    return await fetchJson<TrackedObject>(`/objects/${id}`);
  } catch (err) {
    if (err instanceof Error && err.message.includes('404')) {
      return null;
    }
    throw err;
  }
}

/**
 * GET /api/v1/conjunctions
 * List conjunction events with optional riskLevel, status, and pagination filters.
 */
export async function getConjunctions(
  params?: ConjunctionsQueryParams
): Promise<PaginatedResponse<ConjunctionEvent>> {
  if (isMockMode()) {
    return mockApi.getConjunctions(params);
  }
  const qs = buildQueryString(params as Record<string, string | number | undefined>);
  return fetchJson<PaginatedResponse<ConjunctionEvent>>(`/conjunctions${qs}`);
}

/**
 * GET /api/v1/conjunctions/:id
 * Get a single conjunction event with embedded primary & secondary object telemetry.
 */
export async function getConjunctionById(
  id: string
): Promise<ConjunctionDetailResponse | null> {
  if (isMockMode()) {
    return mockApi.getConjunctionById(id);
  }
  try {
    return await fetchJson<ConjunctionDetailResponse>(`/conjunctions/${id}`);
  } catch (err) {
    if (err instanceof Error && err.message.includes('404')) {
      return null;
    }
    throw err;
  }
}

/**
 * GET /api/v1/shells
 * Get SIR cascade risk snapshots for all orbital shells.
 */
export async function getShells(): Promise<ShellsResponse> {
  if (isMockMode()) {
    return mockApi.getShells();
  }
  return fetchJson<ShellsResponse>('/shells');
}

/**
 * GET /api/v1/maneuvers
 * List maneuver proposals with optional status and pagination filters.
 */
export async function getManeuvers(
  params?: ManeuversQueryParams
): Promise<PaginatedResponse<ManeuverProposal>> {
  if (isMockMode()) {
    return mockApi.getManeuvers(params);
  }
  const qs = buildQueryString(params as Record<string, string | number | undefined>);
  return fetchJson<PaginatedResponse<ManeuverProposal>>(`/maneuvers${qs}`);
}

/**
 * GET /api/v1/maneuvers/:id
 * Get a single maneuver proposal with complete negotiation transcript.
 */
export async function getManeuverById(
  id: string
): Promise<ManeuverProposal | null> {
  if (isMockMode()) {
    return mockApi.getManeuverById(id);
  }
  try {
    return await fetchJson<ManeuverProposal>(`/maneuvers/${id}`);
  } catch (err) {
    if (err instanceof Error && err.message.includes('404')) {
      return null;
    }
    throw err;
  }
}

/**
 * GET /api/v1/agents/status
 * Get the current telemetry state of all 6 autonomous agents.
 */
export async function getAgentStatuses(): Promise<AgentsStatusResponse> {
  if (isMockMode()) {
    return mockApi.getAgentStatuses();
  }
  return fetchJson<AgentsStatusResponse>('/agents/status');
}

/**
 * GET /api/v1/advisories
 * List plain-language advisory narratives.
 */
export async function getAdvisories(
  params?: AdvisoriesQueryParams
): Promise<PaginatedResponse<Advisory>> {
  if (isMockMode()) {
    return mockApi.getAdvisories(params);
  }
  const qs = buildQueryString(params as Record<string, string | number | undefined>);
  return fetchJson<PaginatedResponse<Advisory>>(`/advisories${qs}`);
}

/**
 * GET /api/v1/audit
 * Get the immutable audit trail with optional agentType filter.
 */
export async function getAuditLog(
  params?: AuditQueryParams
): Promise<PaginatedResponse<AuditLogEntry>> {
  if (isMockMode()) {
    return mockApi.getAuditLog(params);
  }
  const qs = buildQueryString(params as Record<string, string | number | undefined>);
  return fetchJson<PaginatedResponse<AuditLogEntry>>(`/audit${qs}`);
}

/**
 * GET /api/v1/dashboard/summary
 * Aggregated statistics and active status chips for the Command Center.
 */
export async function getDashboardSummary(): Promise<DashboardSummary> {
  if (isMockMode()) {
    return mockApi.getDashboardSummary();
  }
  return fetchJson<DashboardSummary>('/dashboard/summary');
}

/**
 * POST /api/v1/crisis/inject
 * Inject simulated collision/fragmentation crisis into an orbital shell.
 */
export async function injectCrisis(
  req: CrisisInjectionRequest
): Promise<CrisisInjectionResponse> {
  if (isMockMode()) {
    const res = await mockApi.injectCrisis(req);
    // Broadcast real-time cascade across the entire nervous system
    mockWs.emit('crisis:injected', res);
    const newConj = mockApi.mockConjunctions[0];
    if (newConj) {
      mockWs.emit('conjunction:created', newConj);
    }
    const newAdv = mockApi.mockAdvisories[0];
    if (newAdv) {
      mockWs.emit('advisory:new', newAdv);
    }
    mockWs.emit('objects:updated', { objects: mockApi.mockObjects });
    return res;
  }
  return fetchJson<CrisisInjectionResponse>('/crisis/inject', {
    method: 'POST',
    body: JSON.stringify(req),
  });
}

export interface ChatResponse {
  response: string;
  sources?: Array<{
    type: "conjunction" | "object" | "shell" | "advisory";
    id: string;
    name: string;
    url: string;
  }>;
  timestamp: string;
}

/**
 * POST /api/v1/chat
 * Query the Advisory Agent Natural Language Copilot
 */
export async function sendChatMessage(
  message: string,
  history?: Array<{ role: "user" | "assistant"; content: string }>
): Promise<ChatResponse> {
  return fetchJson<ChatResponse>('/chat', {
    method: 'POST',
    body: JSON.stringify({ message, history }),
  });
}

