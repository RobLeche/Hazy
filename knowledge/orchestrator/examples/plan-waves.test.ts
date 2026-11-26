import { test } from "node:test";
import assert from "node:assert/strict";
import { planWaves, type Task } from "./plan-waves.ts";

const goal: Task[] = [
  { id: "flows", agent: "ux-designer-apple-hig", dependsOn: [], paths: ["docs/design/ux/**"] },
  { id: "scoring", agent: "meteorology-risk-analyst", dependsOn: [], paths: ["src/lib/scoring.ts", "src/lib/thresholds.ts"] },
  { id: "api", agent: "api-integration-expert", dependsOn: [], paths: ["src/lib/api/**", "tests/fixtures/**"] },
  { id: "alerts-fn", agent: "netlify-engineer", dependsOn: ["api"], paths: ["netlify/functions/alerts.mts"] },
  { id: "tokens", agent: "ui-designer-apple-liquid-glass", dependsOn: ["flows"], paths: ["src/styles/tokens.css"] },
  { id: "screen", agent: "pwa-mobile-expert", dependsOn: ["flows", "tokens", "scoring", "api"], paths: ["src/outlook/**"] },
  { id: "security", agent: "security-expert", dependsOn: ["alerts-fn"], paths: ["docs/threat-model.md"] },
  { id: "qa", agent: "qa-engineer", dependsOn: ["screen", "alerts-fn"], paths: ["tests/**"] },
];

test("independent work runs together; dependants wait", () => {
  const waves = planWaves(goal).map((w) => w.map((t) => t.id));
  assert.deepEqual(waves, [["flows", "scoring", "api"], ["alerts-fn", "tokens"], ["screen", "security"], ["qa"]]);
});

test("two ready tasks touching the same file are split into separate waves", () => {
  const waves = planWaves([
    { id: "a", agent: "x", dependsOn: [], paths: ["src/lib/scoring.ts"] },
    { id: "b", agent: "y", dependsOn: [], paths: ["src/lib/**"] },
  ]).map((w) => w.map((t) => t.id));
  assert.deepEqual(waves, [["a"], ["b"]]);
});

test("cycles and unknown dependencies are rejected", () => {
  assert.throws(() => planWaves([{ id: "a", agent: "x", dependsOn: ["b"], paths: [] }, { id: "b", agent: "y", dependsOn: ["a"], paths: [] }]), /cycle/);
  assert.throws(() => planWaves([{ id: "a", agent: "x", dependsOn: ["zzz"], paths: [] }]), /unknown/);
});
