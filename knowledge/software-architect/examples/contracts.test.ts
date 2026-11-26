import { test } from "node:test";
import assert from "node:assert/strict";
import { isDayRisk, isProposal } from "./contracts.ts";

const day = { date: "2026-11-25", thunder: { score: 23, level: "low", hail: false, reasons: [] }, flood: { score: 0, level: "non_threatening", reasons: [] } };

test("valid DayRisk passes; out-of-range score, unknown level or bad date fail", () => {
  assert.equal(isDayRisk(day), true);
  assert.equal(isDayRisk({ ...day, thunder: { ...day.thunder, score: 101 } }), false);
  assert.equal(isDayRisk({ ...day, flood: { ...day.flood, level: "severe" } }), false);
  assert.equal(isDayRisk({ ...day, date: "Nov 25" }), false);
});

test("Proposal guard: delete has no content, base sha is 40 hex", () => {
  const p = { id: "p1", agentId: "storm-scorer", baseSha: "a".repeat(40), summary: "s", status: "pending", files: [{ path: "src/a.ts", action: "delete" }] };
  assert.equal(isProposal(p), true);
  assert.equal(isProposal({ ...p, files: [{ path: "src/a.ts", action: "delete", content: "x" }] }), false);
  assert.equal(isProposal({ ...p, baseSha: "main" }), false);
});
