// Example 2 — Shared contracts (src/lib/types.ts) with runtime guards at the trust boundary.
// typescript-strict skill: validate external data at the edge, pass typed data inward.
export type ThunderLevel = "none" | "low" | "possible" | "likely" | "very_likely";
export type FloodLevel = "non_threatening" | "very_low" | "low" | "moderate" | "high" | "extreme";
export interface DayRisk {
  date: string;
  thunder: { score: number; level: ThunderLevel; hail: boolean; reasons: string[] };
  flood: { score: number; level: FloodLevel; reasons: string[]; nwsOverride?: string };
}
export interface Proposal { id: string; agentId: string; baseSha: string; summary: string; status: "pending" | "approving" | "committed" | "rejected"; files: { path: string; action: "create" | "update" | "delete"; content?: string }[] }

const THUNDER = new Set<ThunderLevel>(["none", "low", "possible", "likely", "very_likely"]);
const FLOOD = new Set<FloodLevel>(["non_threatening", "very_low", "low", "moderate", "high", "extreme"]);
const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const isScore = (v: unknown) => typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= 100;
const isStrArr = (v: unknown) => Array.isArray(v) && v.every((x) => typeof x === "string");

export function isDayRisk(v: unknown): v is DayRisk {
  if (!isObj(v) || typeof v.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v.date)) return false;
  const t = v.thunder, f = v.flood;
  return isObj(t) && isScore(t.score) && THUNDER.has(t.level as ThunderLevel) && typeof t.hail === "boolean" && isStrArr(t.reasons)
    && isObj(f) && isScore(f.score) && FLOOD.has(f.level as FloodLevel) && isStrArr(f.reasons)
    && (f.nwsOverride === undefined || typeof f.nwsOverride === "string");
}

/** Proposals come from Blobs (written by the server) but are re-checked before Approve: never trust stored shape blindly. */
export function isProposal(v: unknown): v is Proposal {
  return isObj(v) && typeof v.id === "string" && typeof v.agentId === "string" && /^[0-9a-f]{40}$/.test(String(v.baseSha))
    && typeof v.summary === "string" && ["pending", "approving", "committed", "rejected"].includes(String(v.status))
    && Array.isArray(v.files) && v.files.every((f) => isObj(f) && typeof f.path === "string" && ["create", "update", "delete"].includes(String(f.action))
      && (f.action === "delete" ? f.content === undefined : typeof f.content === "string"));
}
