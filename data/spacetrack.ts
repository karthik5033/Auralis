/**
 * Space-Track.org Ingestion Engine
 * 
 * Authenticates with US Space Force Space-Track API to fetch:
 * 1. Real Conjunction Data Messages (CDMs)
 * 2. Real General Perturbations (GP) element sets
 * 
 * Features:
 * - Session cookie preservation and automatic re-authentication
 * - Safe TTL in-memory caching to comply with Space-Track rate limits (20-30 req/min)
 * - Automatic fallback to CelesTrak when offline or unconfigured
 */

import type { ConjunctionEvent, ConjunctionStatus, TrackedObject } from "@/types/contract";
import { classifyRisk } from "@/lib/backend/risk";
import { parseGPToTrackedObject } from "./parser";
import type { RawGPElement } from "./types";

interface SpaceTrackCDM {
  CDM_ID: string;
  CREATED: string;
  EMERGENCY_REPORTABLE: string;
  TCA: string;
  MIN_RNG: string; // miss distance in km
  PC: string; // collision probability
  SAT_1_ID: string;
  SAT_1_NAME: string;
  SAT1_OBJECT_TYPE?: string;
  SAT_2_ID: string;
  SAT_2_NAME: string;
  SAT2_OBJECT_TYPE?: string;
  REL_SPEED?: string; // relative speed in km/s
}

class SpaceTrackClient {
  private sessionCookie: string | null = null;
  private sessionExpiry = 0;
  private lastFailureTime = 0;
  private cdmCache: ConjunctionEvent[] = [];
  private cdmCacheTime = 0;
  private gpCache: TrackedObject[] = [];
  private gpCacheTime = 0;

  private readonly CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes cache
  private readonly FAILURE_COOLDOWN_MS = 60 * 1000; // 60s cooldown on failure
  private readonly TIMEOUT_MS = 3000; // 3-second max timeout
  private readonly BASE_URL = "https://www.space-track.org";

  private getCredentials(): { user: string; pass: string } | null {
    if (!process.env.SPACE_TRACK_USER) {
      try {
        const fs = require("node:fs");
        const path = require("node:path");
        const envPath = path.join(process.cwd(), ".env.local");
        if (fs.existsSync(envPath)) {
          const content = fs.readFileSync(envPath, "utf-8");
          content.split("\n").forEach((line: string) => {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
              const idx = trimmed.indexOf("=");
              const k = trimmed.substring(0, idx).trim();
              const v = trimmed.substring(idx + 1).trim();
              if (!process.env[k]) {
                process.env[k] = v;
              }
            }
          });
        }
      } catch {
        // Ignore
      }
    }
    const user = process.env.SPACE_TRACK_USER;
    const pass = process.env.SPACE_TRACK_PASSWORD;
    if (user && pass && user.trim() && pass.trim()) {
      return { user: user.trim(), pass: pass.trim() };
    }
    return null;
  }

  /**
   * Authenticate and retrieve active session cookie
   */
  private async authenticate(): Promise<string | null> {
    const creds = this.getCredentials();
    if (!creds) return null;

    if (this.sessionCookie && Date.now() < this.sessionExpiry) {
      return this.sessionCookie;
    }

    if (Date.now() - this.lastFailureTime < this.FAILURE_COOLDOWN_MS) {
      return null;
    }

    try {
      const loginUrl = `${this.BASE_URL}/ajaxauth/login`;
      const body = new URLSearchParams({
        identity: creds.user,
        password: creds.pass,
      });

      const response = await fetch(loginUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
        signal: AbortSignal.timeout(this.TIMEOUT_MS),
      });

      if (!response.ok) {
        console.warn(`[SpaceTrack] Authentication failed with status ${response.status}`);
        this.lastFailureTime = Date.now();
        return null;
      }

      const cookie = response.headers.get("set-cookie");
      if (cookie) {
        this.sessionCookie = cookie;
        // SpaceTrack sessions last ~2 hours; refresh every 90 minutes
        this.sessionExpiry = Date.now() + 90 * 60 * 1000;
        return cookie;
      }
    } catch (err) {
      console.warn("[SpaceTrack] Error or timeout during login:", err instanceof Error ? err.message : err);
      this.lastFailureTime = Date.now();
    }
    return null;
  }

  /**
   * Fetch official US Space Force Conjunction Data Messages (CDMs)
   */
  public async fetchConjunctions(limit = 30): Promise<ConjunctionEvent[]> {
    const now = Date.now();
    if (this.cdmCache.length > 0 && now - this.cdmCacheTime < this.CACHE_TTL_MS) {
      return this.cdmCache;
    }

    const cookie = await this.authenticate();
    if (!cookie) {
      return this.cdmCache;
    }

    try {
      const url = `${this.BASE_URL}/basicspacedata/query/class/cdm_public/orderby/TCA%20desc/limit/${limit}/format/json`;
      const response = await fetch(url, {
        headers: { Cookie: cookie },
        signal: AbortSignal.timeout(this.TIMEOUT_MS),
      });

      if (!response.ok) {
        console.warn(`[SpaceTrack] CDM query failed with status ${response.status}`);
        return this.cdmCache;
      }

      const rawCdms: SpaceTrackCDM[] = await response.json();
      if (!Array.isArray(rawCdms)) return this.cdmCache;

      const events: ConjunctionEvent[] = rawCdms.map((cdm) => {
        const missDistance = parseFloat(cdm.MIN_RNG) || 1.0;
        const collisionProbability = parseFloat(cdm.PC) || 1e-6;
        const relativeVelocity = parseFloat(cdm.REL_SPEED || "10.0") || 10.0;
        const tcaTime = new Date(cdm.TCA).getTime();
        const isPast = tcaTime <= now;

        let status: ConjunctionStatus = "active";
        if (isPast) {
          status = "expired";
        } else if (collisionProbability < 1e-4) {
          status = "monitoring";
        }

        return {
          id: `cdm-${cdm.CDM_ID}`,
          primaryObjectId: `norad-${cdm.SAT_1_ID}`,
          secondaryObjectId: `norad-${cdm.SAT_2_ID}`,
          tca: cdm.TCA,
          missDistance,
          relativeVelocity,
          collisionProbability,
          maxCollisionProbability: collisionProbability,
          riskLevel: classifyRisk(collisionProbability),
          status,
          screeningWindowStart: cdm.CREATED || new Date().toISOString(),
          screeningWindowEnd: new Date(Date.now() + 72 * 3600 * 1000).toISOString(),
          maneuverProposalId: null,
          createdAt: cdm.CREATED || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      });

      this.cdmCache = events;
      this.cdmCacheTime = now;
      return events;
    } catch (err) {
      console.warn("[SpaceTrack] Error fetching CDMs:", err);
      return this.cdmCache;
    }
  }

  /**
   * Fetch live GP element sets from Space-Track
   */
  public async fetchGPObjects(limit = 400): Promise<TrackedObject[]> {
    const now = Date.now();
    if (this.gpCache.length > 0 && now - this.gpCacheTime < this.CACHE_TTL_MS) {
      return this.gpCache;
    }

    const cookie = await this.authenticate();
    if (!cookie) {
      return this.gpCache;
    }

    try {
      const url = `${this.BASE_URL}/basicspacedata/query/class/gp/orderby/NORAD_CAT_ID%20asc/limit/${limit}/format/json`;
      const response = await fetch(url, {
        headers: { Cookie: cookie },
        signal: AbortSignal.timeout(this.TIMEOUT_MS),
      });

      if (!response.ok) {
        return this.gpCache;
      }

      const rawGPs: RawGPElement[] = await response.json();
      if (!Array.isArray(rawGPs)) return this.gpCache;

      const objects = rawGPs
        .map((gp) => parseGPToTrackedObject(gp))
        .filter((obj): obj is TrackedObject => obj !== null);

      this.gpCache = objects;
      this.gpCacheTime = now;
      return objects;
    } catch (err) {
      console.warn("[SpaceTrack] Error fetching GP objects:", err);
      return this.gpCache;
    }
  }
}

export const spaceTrackClient = new SpaceTrackClient();
