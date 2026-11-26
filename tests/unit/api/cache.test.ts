import { describe, expect, it } from "vitest";
import { cacheKey, geocodeCacheKey, MemoryCache, TTL_MS } from "../../../src/lib/api/cache.ts";

describe("cache keys", () => {
  it("rounds to 2 decimals so nearby users share a key", () => {
    expect(cacheKey("forecast", 27.95123, -82.45678, 7)).toBe("forecast:27.95,-82.46:d7");
    expect(cacheKey("forecast", 27.954, -82.4551, 7)).toBe(cacheKey("forecast", 27.95, -82.46, 7));
    expect(cacheKey("marine", 27.6, -82.9, 7)).toBe("marine:27.60,-82.90:d7");
    expect(cacheKey("flood", 27.6, -82.9, 7)).not.toBe(cacheKey("marine", 27.6, -82.9, 7));
  });
  it("geocode key is case/space-insensitive and includes the state", () => {
    expect(geocodeCacheKey("  Tampa  ", "FL")).toBe(geocodeCacheKey("tampa", "FL"));
    expect(geocodeCacheKey("tampa", "FL")).not.toBe(geocodeCacheKey("tampa", "KS"));
  });
});

describe("MemoryCache", () => {
  it("expires, exposes stale entries with age, and bounds size", () => {
    let t = 1000;
    const c = new MemoryCache<number>(2, () => t);
    c.set("a", 1, 100);
    expect(c.get("a")).toBe(1);
    t += 150;
    expect(c.get("a")).toBeUndefined();
    expect(c.peek("a")).toMatchObject({ value: 1, ageMs: 150, stale: true });
    c.set("b", 2, 100); c.set("c", 3, 100); c.set("d", 4, 100);
    expect(c.size).toBe(2);
    expect(c.peek("b")).toBeUndefined();
  });
  it("getOrFetch shares one in-flight call and does not cache failures", async () => {
    const c = new MemoryCache<number>();
    let calls = 0;
    const load = async () => { calls++; await Promise.resolve(); return 7; };
    expect(await Promise.all([c.getOrFetch("k", TTL_MS.forecast, load), c.getOrFetch("k", TTL_MS.forecast, load)])).toEqual([7, 7]);
    expect(calls).toBe(1);
    expect(await c.getOrFetch("k", TTL_MS.forecast, load)).toBe(7);
    expect(calls).toBe(1);
    await expect(c.getOrFetch("bad", 1, async () => { throw new Error("x"); })).rejects.toThrow("x");
    expect(c.peek("bad")).toBeUndefined();
    expect(await c.getOrFetch("bad", 1, async () => 9)).toBe(9);
  });
});
