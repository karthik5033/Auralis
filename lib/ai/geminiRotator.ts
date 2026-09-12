/**
 * Resilient Multi-Key Gemini Load Balancer & Rotator
 * 
 * Features:
 * - Dynamic Key Health Tracking & Permanent 24h Quarantining for 400/403/404 keys (invalid/leaked/restricted)
 * - Cooldown management on 429 (rate limits) and 503 (high demand)
 * - Per-request exclusion to guarantee keys are never repeated in the same failover sequence
 * - Multi-model fallback cascade: gemini-flash-latest -> gemini-3.1-flash-lite -> gemini-2.5-flash
 * - Strictly optimized prompt execution with instant JSON output parsing
 */

export interface GeminiKeyStatus {
  keyIndex: number;
  keyMask: string;
  totalCalls: number;
  failures: number;
  isQuarantined: boolean;
  coolingUntil: number;
}

export interface GenerateOptions {
  systemPrompt?: string;
  temperature?: number;
  maxOutputTokens?: number;
  responseSchema?: Record<string, unknown>;
  jsonMode?: boolean;
}

export class GeminiRotator {
  private readonly keys: string[] = [];
  private currentIndex = 0;
  private readonly cooldowns = new Map<number, number>(); // index -> timestamp ms
  private readonly callCounts = new Map<number, number>();
  private readonly failCounts = new Map<number, number>();
  private readonly quarantined = new Set<number>(); // permanent 24h quarantine for 400/403
  private readonly candidateModels = [
    "gemini-flash-latest",
    "gemini-3.1-flash-lite",
    "gemini-2.5-flash",
  ];

  constructor() {
    this.loadKeys();
  }

  private loadKeys(): void {
    if (!process.env.GOOGLE_API_KEY_1) {
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
        // Ignore file read error
      }
    }

    for (let i = 1; i <= 20; i++) {
      const key = process.env[`GOOGLE_API_KEY_${i}`];
      if (key && key.trim()) {
        this.keys.push(key.trim());
      }
    }
    if (this.keys.length === 0) {
      const fallback = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
      if (fallback && fallback.trim()) {
        this.keys.push(fallback.trim());
      }
    }
  }

  public getKeyCount(): number {
    return this.keys.length;
  }

  public getPoolStatus(): GeminiKeyStatus[] {
    const now = Date.now();
    return this.keys.map((key, idx) => ({
      keyIndex: idx + 1,
      keyMask: key.substring(0, 8) + "..." + key.substring(key.length - 4),
      totalCalls: this.callCounts.get(idx) ?? 0,
      failures: this.failCounts.get(idx) ?? 0,
      isQuarantined: this.quarantined.has(idx),
      coolingUntil: Math.max(0, (this.cooldowns.get(idx) ?? 0) - now),
    }));
  }

  /**
   * Acquire the next healthy key using round-robin with exclusion and cooldown filtering
   */
  private acquireNextKey(excludedIndices: Set<number>): { key: string; index: number } | null {
    if (this.keys.length === 0) {
      throw new Error("GeminiRotator: No Google API keys found in environment variables");
    }

    const now = Date.now();
    const total = this.keys.length;

    // 1. Primary pass: find an unquarantined, non-excluded key whose cooldown has elapsed
    for (let attempt = 0; attempt < total; attempt++) {
      const idx = (this.currentIndex + attempt) % total;
      if (excludedIndices.has(idx) || this.quarantined.has(idx)) continue;

      const coolingUntil = this.cooldowns.get(idx) ?? 0;
      if (now >= coolingUntil) {
        this.currentIndex = (idx + 1) % total;
        return { key: this.keys[idx], index: idx };
      }
    }

    // 2. Secondary pass: if all non-excluded keys are in cooldown, pick the one that cools earliest
    let earliestIdx = -1;
    let earliestTime = Infinity;
    for (let idx = 0; idx < total; idx++) {
      if (excludedIndices.has(idx) || this.quarantined.has(idx)) continue;

      const time = this.cooldowns.get(idx) ?? 0;
      if (time < earliestTime) {
        earliestTime = time;
        earliestIdx = idx;
      }
    }

    if (earliestIdx !== -1) {
      this.currentIndex = (earliestIdx + 1) % total;
      return { key: this.keys[earliestIdx], index: earliestIdx };
    }

    return null;
  }

  private markCooldown(index: number, durationMs = 30_000): void {
    this.cooldowns.set(index, Date.now() + durationMs);
    this.failCounts.set(index, (this.failCounts.get(index) ?? 0) + 1);
  }

  private markQuarantined(index: number, reason: string): void {
    this.quarantined.add(index);
    this.cooldowns.set(index, Date.now() + 24 * 60 * 60 * 1000);
    this.failCounts.set(index, (this.failCounts.get(index) ?? 0) + 1);
    console.warn(`[GeminiRotator] Key #${index + 1} permanently quarantined (reason: ${reason}). Key will not be retried.`);
  }

  /**
   * Generate content with automated multi-key failover and multi-model fallback cascade
   */
  public async generateText(prompt: string, options: GenerateOptions = {}): Promise<string> {
    let lastError: Error | null = null;

    // Try candidate models in order: gemini-flash-latest -> gemini-3.1-flash-lite -> gemini-2.5-flash
    for (const model of this.candidateModels) {
      const excludedIndices = new Set<number>();
      const maxKeyAttempts = Math.max(1, this.keys.length - this.quarantined.size);

      for (let attempt = 0; attempt < maxKeyAttempts; attempt++) {
        const keyItem = this.acquireNextKey(excludedIndices);
        if (!keyItem) break; // All available keys tried for this model

        const { key, index } = keyItem;
        excludedIndices.add(index);
        this.callCounts.set(index, (this.callCounts.get(index) ?? 0) + 1);

        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

          const payload: Record<string, unknown> = {
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: options.temperature ?? 0.2,
              maxOutputTokens: options.maxOutputTokens ?? 2048,
              ...(options.jsonMode ? { responseMimeType: "application/json" } : {}),
              ...(options.responseSchema ? { responseSchema: options.responseSchema } : {}),
            },
          };

          if (options.systemPrompt) {
            payload.systemInstruction = {
              parts: [{ text: options.systemPrompt }],
            };
          }

          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 10_000);

          const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
            signal: controller.signal,
          });

          clearTimeout(timeout);

          // 1. Quota Exhaustion / Rate Limit
          if (response.status === 429) {
            console.warn(`[GeminiRotator] Key #${index + 1} hit 429 (Rate Limit) on ${model}. Cooling for 30s...`);
            this.markCooldown(index, 30_000);
            continue;
          }

          // 2. High Demand / Temporary Unavailable
          if (response.status === 503) {
            console.warn(`[GeminiRotator] Key #${index + 1} hit 503 on ${model}. Rotating...`);
            this.markCooldown(index, 15_000);
            continue;
          }

          // 3. Permission Denied / Leaked Key / Forbidden
          if (response.status === 403) {
            this.markQuarantined(index, "403 Forbidden / Leaked / Access Denied");
            continue;
          }

          // 4. Invalid API Key
          if (response.status === 400) {
            this.markQuarantined(index, "400 Invalid API Key");
            continue;
          }

          // 5. Model Not Available for this Key/Project
          if (response.status === 404) {
            this.markCooldown(index, 60_000);
            continue;
          }

          if (!response.ok) {
            const errBody = await response.text().catch(() => "");
            if (errBody.includes("RESOURCE_EXHAUSTED") || errBody.includes("quota")) {
              console.warn(`[GeminiRotator] Key #${index + 1} quota exhausted on ${model}. Rotating...`);
              this.markCooldown(index, 60_000);
              continue;
            }
            throw new Error(`Gemini API error ${response.status}: ${errBody}`);
          }

          const data = await response.json();
          const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (!text) {
            throw new Error("Gemini returned empty response content");
          }

          return text.trim();
        } catch (err: unknown) {
          lastError = err instanceof Error ? err : new Error(String(err));
          const isAbort = lastError.name === "AbortError";
          if (isAbort) {
            console.warn(`[GeminiRotator] Key #${index + 1} timed out on ${model}. Rotating key...`);
            this.markCooldown(index, 30_000);
            continue;
          }
        }
      }
    }

    throw lastError ?? new Error("GeminiRotator: Failed to generate response across key pool");
  }

  /**
   * Helper to generate and parse structured JSON responses
   */
  public async generateJSON<T>(prompt: string, options: GenerateOptions = {}): Promise<T> {
    const raw = await this.generateText(prompt, {
      ...options,
      maxOutputTokens: options.maxOutputTokens ?? 1024,
      jsonMode: true,
    });

    try {
      const match = raw.match(/\{[\s\S]*\}/);
      const jsonStr = match ? match[0] : raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
      return JSON.parse(jsonStr) as T;
    } catch {
      throw new Error(`Failed to parse Gemini JSON output: ${raw.slice(0, 100)}...`);
    }
  }
}

// Global singleton instance
export const geminiRotator = new GeminiRotator();
