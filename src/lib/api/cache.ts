// Cache keys, TTLs and a small in-memory cache. HTTP caching is the service worker's job (docs/02); this is for the app's
// own de-duplication (in-flight sharing, stale fallback with age). No IndexedDB, no I/O.
// Ported from knowledge/api-integration-expert/examples/cache-and-coastal.ts (cacheKey), extended.
//
// Quota math (quota-and-cost): key = kind + coords rounded to 2 decimals + forecast_days, TTL 15 min, so one place costs
// at most 4 forecast calls/hour per browser tab (plus 1 retry only after a 5xx/429).

import { round2 } from "./openMeteo.ts";

export type CacheKind = "forecast" | "marine" | "flood";

export const TTL_MS = {
  forecast: 15 * 60_000, // models update hourly at best (knowledge/.../units-timezones-errors-caching.md)
  marine: 15 * 60_000,
  flood: 60 * 60_000, // our choice: river discharge is a slow daily signal (not from the docs)
  geocode: 24 * 60 * 60_000,
} as const;

export function cacheKey(kind: CacheKind, lat: number, lon: number, days: number): string {
  return `${kind}:${round2(lat).toFixed(2)},${round2(lon).toFixed(2)}:d${days}`;
}

export function geocodeCacheKey(query: string, state: string | undefined): string {
  return `geocode:${(state ?? "").trim().toLowerCase()}:${query.replace(/\s+/g, " ").trim().toLowerCase()}`;
}

export interface CacheHit<T> {
  value: T;
  /** Epoch ms when stored. */
  storedAt: number;
  ageMs: number;
  stale: boolean;
}

interface Entry<T> {
  value: T;
  storedAt: number;
  ttlMs: number;
}

export class MemoryCache<T> {
  private readonly map = new Map<string, Entry<T>>();
  private readonly inflight = new Map<string, Promise<T>>();

  constructor(private readonly maxEntries = 50, private readonly now: () => number = Date.now) {}

  set(key: string, value: T, ttlMs: number): void {
    this.map.delete(key); // re-insert so Map order = recency
    this.map.set(key, { value, storedAt: this.now(), ttlMs });
    while (this.map.size > this.maxEntries) {
      const oldest = this.map.keys().next();
      if (oldest.done) break;
      this.map.delete(oldest.value);
    }
  }

  /** Entry even when expired (stale=true) so callers can fall back with "Updated N min ago" on a failed refresh. */
  peek(key: string): CacheHit<T> | undefined {
    const e = this.map.get(key);
    if (!e) return undefined;
    const ageMs = this.now() - e.storedAt;
    return { value: e.value, storedAt: e.storedAt, ageMs, stale: ageMs >= e.ttlMs };
  }

  /** Fresh entries only. */
  get(key: string): T | undefined {
    const hit = this.peek(key);
    return hit && !hit.stale ? hit.value : undefined;
  }

  delete(key: string): void {
    this.map.delete(key);
  }

  clear(): void {
    this.map.clear();
  }

  get size(): number {
    return this.map.size;
  }

  /** Fresh hit, else one shared fetch per key (concurrent callers share the promise). Failures are not cached. */
  async getOrFetch(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
    const fresh = this.get(key);
    if (fresh !== undefined) return fresh;
    const pending = this.inflight.get(key);
    if (pending) return pending;
    const p = load().then((v) => { this.set(key, v, ttlMs); return v; }).finally(() => { this.inflight.delete(key); });
    this.inflight.set(key, p);
    return p;
  }
}
