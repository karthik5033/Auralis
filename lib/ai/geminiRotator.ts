/**
 * Resilient 12-Key Gemini Load Balancer & Rotator
 * 
 * Manages pool of Google API keys with:
 * - Round-robin dispatch
 * - Dynamic cooldown on 429/quota exhaustion
 * - Automatic seamless retry failover to next key
 * - Strictly targets gemini-2.5-flash
 * - Concise, token-efficient prompt execution
 */

export interface GeminiKeyStatus {
  keyIndex: number;
  keyMask: string;
  totalCalls: number;
  failures: number;
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
  private readonly cooldowns = new Map<number, number>(); // index -> timestamp
  private readonly callCounts = new Map<number, number>();
  private readonly failCounts = new Map<number, number>();
  private readonly model = "gemini-2.5-flash";

  constructor() {
    this.loadKeys();
  }

  private loadKeys(): void {
    // If not loaded by Next.js yet (e.g. in test scripts), parse .env.local directly
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

    // Scan GOOGLE_API_KEY_1 through GOOGLE_API_KEY_20, plus standard fallbacks
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
      coolingUntil: Math.max(0, (this.cooldowns.get(idx) ?? 0) - now),
    }));
  }

  /**
   * Acquire the next healthy key using round-robin with cooldown filtering
   */
  private acquireNextKey(): { key: string; index: number } {
    if (this.keys.length === 0) {
      throw new Error("GeminiRotator: No Google API keys found in environment variables");
    }

    const now = Date.now();
    const total = this.keys.length;

    // First try: find a key not in cooldown
    for (let attempt = 0; attempt < total; attempt++) {
      const idx = (this.currentIndex + attempt) % total;
      const coolingUntil = this.cooldowns.get(idx) ?? 0;
      if (now >= coolingUntil) {
        this.currentIndex = (idx + 1) % total;
        return { key: this.keys[idx], index: idx };
      }
    }

    // All keys cooling down: pick the one that cools earliest
    let earliestIdx = 0;
    let earliestTime = Infinity;
    for (let idx = 0; idx < total; idx++) {
      const time = this.cooldowns.get(idx) ?? 0;
      if (time < earliestTime) {
        earliestTime = time;
        earliestIdx = idx;
      }
    }

    this.currentIndex = (earliestIdx + 1) % total;
    return { key: this.keys[earliestIdx], index: earliestIdx };
  }

  private markCooldown(index: number, durationMs = 60_000): void {
    this.cooldowns.set(index, Date.now() + durationMs);
    this.failCounts.set(index, (this.failCounts.get(index) ?? 0) + 1);
  }

  /**
   * Generate content using strict gemini-2.5-flash with automated multi-key failover
   */
  public async generateText(prompt: string, options: GenerateOptions = {}): Promise<string> {
    const maxAttempts = Math.min(this.keys.length, 5);
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const { key, index } = this.acquireNextKey();
      this.callCounts.set(index, (this.callCounts.get(index) ?? 0) + 1);

      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${key}`;

        const payload: Record<string, unknown> = {
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: options.temperature ?? 0.2,
            maxOutputTokens: options.maxOutputTokens ?? 2048,
            thinkingConfig: { thinkingBudget: 0 },
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
        const timeout = setTimeout(() => controller.abort(), 12_000);

        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (response.status === 429 || response.status === 403) {
          // Rate limit or quota hit -> cool down this key for 90s and retry with next key
          console.warn(`[GeminiRotator] Key #${index + 1} hit status ${response.status}. Rotating key...`);
          this.markCooldown(index, 90_000);
          continue;
        }

        if (!response.ok) {
          const errBody = await response.text().catch(() => "");
          if (errBody.includes("RESOURCE_EXHAUSTED") || errBody.includes("quota")) {
            console.warn(`[GeminiRotator] Key #${index + 1} quota exhausted. Rotating key...`);
            this.markCooldown(index, 120_000);
            continue;
          }
          if (errBody.includes("API_KEY_INVALID") || response.status === 400) {
            console.warn(`[GeminiRotator] Key #${index + 1} is invalid. Disabling key for 24 hours and rotating...`);
            this.markCooldown(index, 24 * 60 * 60 * 1000);
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
          console.warn(`[GeminiRotator] Key #${index + 1} timed out. Rotating key...`);
          this.markCooldown(index, 30_000);
          continue;
        }
        // Non-quota error on last attempt will throw
        if (attempt === maxAttempts - 1) {
          break;
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
