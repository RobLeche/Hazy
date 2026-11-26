// App-level quotas in Blobs (strong reads, CAS writes): daily Claude token budget and failed-login lockout.
// Sources: docs/04-agent-console-and-security.md (10 failures -> 15 min lock per IP hash; quotas/{date}),
// skills quota-and-cost and rate-limiting. Env vars are read by the caller inside the handler and passed in.
import { openStore, upsertCas, readStrong, type BlobStore } from "./blobs.ts";

export const LOGIN_MAX_FAILURES = 10;
export const LOGIN_WINDOW_MS = 15 * 60 * 1000;
export const DEFAULT_DAILY_TOKEN_BUDGET = 500_000;

export interface TokenUsage {
  input_tokens: number;
  output_tokens: number;
  cache_read_input_tokens?: number | undefined;
}

interface DailyCounter {
  day: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  turns: number;
}

interface LoginCounter {
  count: number;
  windowStart: number;
  lockedUntil: number;
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;
const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

const isDaily = (v: unknown): v is DailyCounter =>
  isRecord(v) &&
  typeof v["day"] === "string" &&
  isNum(v["inputTokens"]) &&
  isNum(v["outputTokens"]) &&
  isNum(v["cacheReadTokens"]) &&
  isNum(v["turns"]);

const isLogin = (v: unknown): v is LoginCounter =>
  isRecord(v) && isNum(v["count"]) && isNum(v["windowStart"]) && isNum(v["lockedUntil"]);

/** UTC day key, yyyy-mm-dd. */
export function dayKey(now: number): string {
  return new Date(now).toISOString().slice(0, 10);
}

/** Parse AGENT_DAILY_TOKEN_BUDGET; missing or invalid falls back to the default. */
export function parseBudget(raw: string | undefined): number {
  if (raw === undefined || raw.trim() === "") return DEFAULT_DAILY_TOKEN_BUDGET;
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : DEFAULT_DAILY_TOKEN_BUDGET;
}

const quotaStore = (store?: BlobStore): BlobStore => store ?? openStore("quotas");

export const totalTokens = (c: Pick<DailyCounter, "inputTokens" | "outputTokens">): number =>
  c.inputTokens + c.outputTokens;

export async function getDailyUsage(now: number, store?: BlobStore): Promise<number> {
  const cur = await readStrong(quotaStore(store), dayKey(now), isDaily);
  return cur ? totalTokens(cur.data) : 0;
}

export interface BudgetStatus {
  allowed: boolean;
  used: number;
  budget: number;
}

/** Call before starting a console turn. Refuse (with a clear message) when allowed is false. */
export async function checkBudget(budget: number, now: number, store?: BlobStore): Promise<BudgetStatus> {
  const used = await getDailyUsage(now, store);
  return { allowed: used < budget, used, budget };
}

/** Add one turn's usage to today's counter with CAS (safe under concurrency). Returns today's running total. */
export async function recordUsage(usage: TokenUsage, now: number, store?: BlobStore): Promise<number> {
  const day = dayKey(now);
  const initial: DailyCounter = { day, inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, turns: 0 };
  const res = await upsertCas(quotaStore(store), day, isDaily, initial, (c) => ({
    day,
    inputTokens: c.inputTokens + usage.input_tokens,
    outputTokens: c.outputTokens + usage.output_tokens,
    cacheReadTokens: c.cacheReadTokens + (usage.cache_read_input_tokens ?? 0),
    turns: c.turns + 1,
  }));
  if (!res.ok) throw new Error(`could not record token usage: ${res.reason}`);
  return totalTokens(res.value);
}

const loginKey = (ipHash: string): string => `login:${ipHash}`;

export interface LockStatus {
  locked: boolean;
  retryAfterSeconds: number;
}

export async function checkLogin(ipHash: string, now: number, store?: BlobStore): Promise<LockStatus> {
  const cur = await readStrong(quotaStore(store), loginKey(ipHash), isLogin);
  if (cur && cur.data.lockedUntil > now) {
    return { locked: true, retryAfterSeconds: Math.ceil((cur.data.lockedUntil - now) / 1000) };
  }
  return { locked: false, retryAfterSeconds: 0 };
}

/** Record a failed login: 10 failures within 15 min lock that IP hash for 15 min. */
export async function recordFailedLogin(ipHash: string, now: number, store?: BlobStore): Promise<LockStatus> {
  const initial: LoginCounter = { count: 0, windowStart: now, lockedUntil: 0 };
  const res = await upsertCas(quotaStore(store), loginKey(ipHash), isLogin, initial, (c) => {
    const expired = now - c.windowStart >= LOGIN_WINDOW_MS && c.lockedUntil <= now;
    const base = expired ? { count: 0, windowStart: now, lockedUntil: 0 } : c;
    const count = base.count + 1;
    const lockedUntil = count >= LOGIN_MAX_FAILURES ? now + LOGIN_WINDOW_MS : base.lockedUntil;
    return { count, windowStart: base.windowStart, lockedUntil };
  });
  if (!res.ok) throw new Error(`could not record failed login: ${res.reason}`);
  const locked = res.value.lockedUntil > now;
  return { locked, retryAfterSeconds: locked ? Math.ceil((res.value.lockedUntil - now) / 1000) : 0 };
}

/** Reset the counter after a successful login. */
export async function clearFailedLogins(ipHash: string, store?: BlobStore): Promise<void> {
  await quotaStore(store).delete(loginKey(ipHash));
}
