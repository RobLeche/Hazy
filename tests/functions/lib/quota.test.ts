import { describe, expect, it } from "vitest";
import { memoryStore } from "../../../netlify/lib/blobs.ts";
import {
  LOGIN_MAX_FAILURES,
  LOGIN_WINDOW_MS,
  checkBudget,
  checkLogin,
  clearFailedLogins,
  dayKey,
  parseBudget,
  recordFailedLogin,
  recordUsage,
} from "../../../netlify/lib/quota.ts";

const T0 = Date.parse("2026-11-26T12:00:00Z");

describe("daily token budget", () => {
  it("parseBudget falls back on missing or invalid values", () => {
    expect(parseBudget("1000")).toBe(1000);
    expect(parseBudget(undefined)).toBe(500_000);
    expect(parseBudget("abc")).toBe(500_000);
    expect(parseBudget("-5")).toBe(500_000);
  });

  it("accumulates usage and refuses once the budget is reached", async () => {
    const s = memoryStore();
    expect((await checkBudget(100, T0, s)).allowed).toBe(true);
    await recordUsage({ input_tokens: 60, output_tokens: 10, cache_read_input_tokens: 5 }, T0, s);
    expect(await checkBudget(100, T0, s)).toEqual({ allowed: true, used: 70, budget: 100 });
    await recordUsage({ input_tokens: 20, output_tokens: 10 }, T0, s);
    expect((await checkBudget(100, T0, s)).allowed).toBe(false);
  });

  it("is per UTC day", async () => {
    const s = memoryStore();
    await recordUsage({ input_tokens: 100, output_tokens: 0 }, T0, s);
    const tomorrow = T0 + 24 * 3600 * 1000;
    expect(dayKey(tomorrow)).toBe("2026-11-27");
    expect((await checkBudget(100, tomorrow, s)).allowed).toBe(true);
  });

  it("concurrent turns do not lose usage", async () => {
    const s = memoryStore();
    await Promise.all(Array.from({ length: 6 }, () => recordUsage({ input_tokens: 10, output_tokens: 5 }, T0, s)));
    expect((await checkBudget(1000, T0, s)).used).toBe(90);
  });
});

describe("failed-login lockout", () => {
  it("locks after 10 failures for 15 minutes, then unlocks", async () => {
    const s = memoryStore();
    for (let i = 1; i < LOGIN_MAX_FAILURES; i++) {
      expect((await recordFailedLogin("ip1", T0 + i, s)).locked).toBe(false);
    }
    const last = await recordFailedLogin("ip1", T0 + 20, s);
    expect(last.locked).toBe(true);
    expect(last.retryAfterSeconds).toBe(900);
    expect((await checkLogin("ip1", T0 + 60_000, s)).locked).toBe(true);
    expect((await checkLogin("ip1", T0 + 20 + LOGIN_WINDOW_MS, s)).locked).toBe(false);
  });

  it("is per IP hash and the window resets", async () => {
    const s = memoryStore();
    for (let i = 0; i < 9; i++) await recordFailedLogin("a", T0, s);
    expect((await checkLogin("b", T0, s)).locked).toBe(false);
    // 15 min later the old failures no longer count
    expect((await recordFailedLogin("a", T0 + LOGIN_WINDOW_MS, s)).locked).toBe(false);
  });

  it("a successful login clears the counter", async () => {
    const s = memoryStore();
    for (let i = 0; i < 9; i++) await recordFailedLogin("a", T0, s);
    await clearFailedLogins("a", s);
    expect((await recordFailedLogin("a", T0, s)).locked).toBe(false);
  });
});
