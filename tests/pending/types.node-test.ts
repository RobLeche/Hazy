import { test } from "node:test";
import assert from "node:assert/strict";
import {
  isDayRisk, isProposal, isPlace, isHourPoint, isNwsAlert, isAlertsResponse, isFileChange, isJob, isAgentCard,
  isOutlook, isApiError, resolveModelId, MODEL_ALIAS_MAP, MODEL_IDS, isThunderLevel, isFloodLevel,
  type DayRisk, type Proposal, type FileChange, type Job, type AgentCard, type Place, type HourPoint, type NwsAlert, type Outlook,
} from "../../src/lib/types.ts";

const sha = "a".repeat(40);
const day: DayRisk = {
  date: "2026-11-25",
  thunder: { score: 23, level: "low", hail: false, reasons: [] },
  flood: { score: 0, level: "non_threatening", reasons: [] },
  rain: { totalMm: 3.2, maxRateMmH: 1.1, probMax: 40 },
  uvMax: 6.5, gustMaxKmh: 31,
};

test("DayRisk (ported example): valid passes; bad score, level, date fail", () => {
  assert.equal(isDayRisk(day), true);
  assert.equal(isDayRisk({ ...day, thunder: { ...day.thunder, score: 101 } }), false);
  assert.equal(isDayRisk({ ...day, thunder: { ...day.thunder, score: 22.5 } }), false);
  assert.equal(isDayRisk({ ...day, flood: { ...day.flood, level: "severe" } }), false);
  assert.equal(isDayRisk({ ...day, date: "Nov 25" }), false);
});
test("DayRisk: nulls allowed for informational values; marine needs one value; peakBlock and nwsOverride checked", () => {
  assert.equal(isDayRisk({ ...day, uvMax: null, gustMaxKmh: null, rain: { totalMm: null, maxRateMmH: null, probMax: null } }), true);
  assert.equal(isDayRisk({ ...day, uvMax: Number.NaN }), false);
  assert.equal(isDayRisk({ ...day, rain: { ...day.rain, probMax: 120 } }), false);
  assert.equal(isDayRisk({ ...day, rain: { ...day.rain, totalMm: -1 } }), false);
  assert.equal(isDayRisk({ ...day, marine: { waveMaxM: 1.2, sstC: null } }), true);
  assert.equal(isDayRisk({ ...day, marine: { waveMaxM: null, sstC: null } }), false);
  assert.equal(isDayRisk({ ...day, thunder: { ...day.thunder, peakBlock: "afternoon" } }), true);
  assert.equal(isDayRisk({ ...day, thunder: { ...day.thunder, peakBlock: "noon" } }), false);
  assert.equal(isDayRisk({ ...day, flood: { ...day.flood, nwsOverride: "Flood Watch" } }), true);
  assert.equal(isDayRisk({ ...day, flood: { ...day.flood, nwsOverride: 1 } }), false);
  assert.equal(isDayRisk({ date: "2026-11-25", thunder: day.thunder, flood: day.flood }), false, "doc-01 fields required");
});
test("Proposal (ported example): delete has no content; base sha is 40 hex", () => {
  const p: Proposal = { id: "p1", agentId: "pwa-mobile-expert", baseSha: sha, summary: "s", status: "pending", files: [{ path: "src/a.ts", action: "delete" }], createdAt: "2026-11-26T10:00:00Z" };
  assert.equal(isProposal(p), true);
  assert.equal(isProposal({ ...p, files: [{ path: "src/a.ts", action: "delete", content: "x" }] }), false);
  assert.equal(isProposal({ ...p, baseSha: "main" }), false);
  assert.equal(isProposal({ ...p, files: [] }), false);
  assert.equal(isProposal({ ...p, status: "approved" }), false);
  assert.equal(isProposal({ ...p, status: "committed" }), false, "committed needs commitSha");
  assert.equal(isProposal({ ...p, status: "committed", commitSha: "b".repeat(40), decidedAt: "2026-11-26T10:01:00Z" }), true);
  assert.equal(isProposal({ ...p, createdAt: "yesterday" }), false);
});
test("FileChange", () => {
  assert.equal(isFileChange({ path: "src/a.ts", action: "create", content: "" }), true);
  assert.equal(isFileChange({ path: "src/a.ts", action: "update" }), false);
  assert.equal(isFileChange({ path: "", action: "delete" }), false);
  assert.equal(isFileChange({ path: "src/a.ts", action: "rename", content: "x" }), false);
});
test("Place", () => {
  const pl: Place = { name: "Tampa", admin1: "Florida", country_code: "US", lat: 27.95, lon: -82.46, timezone: "America/New_York", coastal: true };
  assert.equal(isPlace(pl), true);
  const { admin1: _a, coastal: _c, ...bare } = pl;
  assert.equal(isPlace(bare), true);
  assert.equal(isPlace({ ...pl, country_code: "us" }), false);
  assert.equal(isPlace({ ...pl, lat: 91 }), false);
  assert.equal(isPlace({ ...pl, lon: "x" }), false);
  assert.equal(isPlace({ ...pl, timezone: "" }), false);
});
test("HourPoint", () => {
  const h: HourPoint = { localTime: "2026-11-25T15:00", utcMs: Date.parse("2026-11-25T20:00Z"), date: "2026-11-25", hour: 15,
    precipitationMm: 12, precipProbability: 70, weatherCode: 95, cape: 2800, liftedIndex: -5, convectiveInhibition: null,
    windGustsKmh: 40, uvIndex: null, soilMoisture0to1cm: 0.31 };
  assert.equal(isHourPoint(h), true);
  assert.equal(isHourPoint({ ...h, hour: 24 }), false);
  assert.equal(isHourPoint({ ...h, localTime: "2026-11-25T15:00Z" }), false);
  assert.equal(isHourPoint({ ...h, cape: undefined }), false);
  assert.equal(isHourPoint({ ...h, precipProbability: 101 }), false);
});
test("NwsAlert and AlertsResponse", () => {
  const a: NwsAlert = { id: "urn:oid:2.49.0.1.840.0.x", event: "Flood Watch", severity: "Severe", urgency: "Expected", headline: null, onset: "2026-11-26T12:00:00-05:00", ends: null, areaDesc: "Hillsborough" };
  assert.equal(isNwsAlert(a), true);
  assert.equal(isAlertsResponse([a, a]), true);
  assert.equal(isAlertsResponse([]), true);
  assert.equal(isAlertsResponse({ features: [] }), false);
  assert.equal(isNwsAlert({ ...a, onset: "soon" }), false);
  assert.equal(isNwsAlert({ ...a, event: "" }), false);
  assert.equal(isNwsAlert({ ...a, ends: undefined }), false);
});
test("Outlook", () => {
  const o: Outlook = { place: { name: "Tampa", country_code: "US", lat: 27.95, lon: -82.46, timezone: "America/New_York" }, days: [day], alerts: [], alertsStatus: "unavailable", updatedAt: "2026-11-26T10:00:00Z" };
  assert.equal(isOutlook(o), true);
  assert.equal(isOutlook({ ...o, alertsStatus: "error" }), false);
});
test("Job: statuses, events, done needs result", () => {
  const j: Job = { id: "j1", agentId: "qa-engineer", task: "t", status: "queued", attempt: 0, events: [], createdAt: "2026-11-26T10:00:00Z", updatedAt: "2026-11-26T10:00:00Z" };
  assert.equal(isJob(j), true);
  for (const s of ["running", "paused", "failed", "retrying"]) assert.equal(isJob({ ...j, status: s }), true, s);
  assert.equal(isJob({ ...j, status: "cancelled" }), false);
  assert.equal(isJob({ ...j, status: "done" }), false);
  assert.equal(isJob({ ...j, status: "done", result: { summary: "ok", proposalIds: ["p1"] } }), true);
  assert.equal(isJob({ ...j, events: [{ t: 1, kind: "proposal", text: "x", proposalId: "p1" }] }), true);
  assert.equal(isJob({ ...j, events: [{ t: "1", kind: "text", text: "x" }] }), false);
  assert.equal(isJob({ ...j, attempt: -1 }), false);
});
test("AgentCard and model map", () => {
  const c: AgentCard = { id: "software-architect", firstName: "Vera", model: "opus", modelId: "claude-opus-5-5", personality: "p", description: "d" };
  assert.equal(isAgentCard(c), true);
  assert.equal(isAgentCard({ ...c, modelId: "gpt-4" }), false);
  assert.equal(isAgentCard({ ...c, id: "../x" }), false);
  assert.equal(resolveModelId(undefined), "claude-opus-5-5");
  assert.equal(resolveModelId("sonnet"), "claude-sonnet-5-5");
  assert.equal(resolveModelId("fable"), "claude-fable-5-2");
  assert.equal(resolveModelId("claude-haiku-5-5"), "claude-haiku-5-5");
  assert.equal(resolveModelId("claude-unknown-1"), null);
  for (const id of Object.values(MODEL_ALIAS_MAP)) assert.ok((MODEL_IDS as readonly string[]).includes(id));
});
test("levels and ApiError", () => {
  assert.equal(isThunderLevel("very_likely"), true);
  assert.equal(isFloodLevel("moderate"), true);
  assert.equal(isFloodLevel("possible"), false);
  assert.equal(isApiError({ error: "x", code: "BAD" }), true);
  assert.equal(isApiError({ error: "x" }), false);
});

// Type-level compatibility with the experts' tested examples (compile-time only).
interface ConsoleFileChange { path: string; action: "create" | "update" | "delete"; content?: string }
const _compat: ConsoleFileChange[] = [] as FileChange[];
void _compat;
