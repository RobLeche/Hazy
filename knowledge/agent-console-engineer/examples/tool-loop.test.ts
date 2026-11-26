import { test } from "node:test";
import assert from "node:assert/strict";
import { runLoop, type ModelTurn } from "./tool-loop.ts";

const script = (turns: ModelTurn[]) => { let i = 0; return async () => turns[i++]!; };

test("parallel tool calls → one user message with all results; failures marked is_error", async () => {
  const create = script([
    { stop_reason: "tool_use", content: [
      { type: "text", text: "Reading files." },
      { type: "tool_use", id: "t1", name: "read_file", input: { path: "src/lib/scoring.ts" } },
      { type: "tool_use", id: "t2", name: "read_file", input: { path: "netlify.toml" } },
    ] },
    { stop_reason: "end_turn", content: [{ type: "text", text: "Done." }] },
  ]);
  const read = async (input: unknown) => {
    const { path } = input as { path: string };
    if (path === "netlify.toml") throw new Error("path not allowed: netlify.toml");
    return "export const T = {}";
  };
  const r = await runLoop(create, { read_file: read }, "Tune thresholds");
  assert.equal(r.status, "end_turn");
  const toolMsg = r.messages[2] as { role: string; content: any[] };
  assert.equal(toolMsg.role, "user");
  assert.deepEqual(toolMsg.content.map((c) => [c.type, c.tool_use_id, !!c.is_error]), [["tool_result", "t1", false], ["tool_result", "t2", true]]);
});

test("stops at the deadline with status paused", async () => {
  let t = 0;
  const create = async (): Promise<ModelTurn> => { t += 30_000; return { stop_reason: "tool_use", content: [{ type: "tool_use", id: "x", name: "noop", input: {} }] }; };
  const r = await runLoop(create, { noop: async () => "ok" }, "go", { maxIterations: 8, deadlineMs: 45_000, now: () => t });
  assert.equal(r.status, "paused");
});

test("iteration cap prevents runaway loops", async () => {
  const create = async (): Promise<ModelTurn> => ({ stop_reason: "tool_use", content: [{ type: "tool_use", id: "x", name: "noop", input: {} }] });
  const r = await runLoop(create, { noop: async () => "ok" }, "go", { maxIterations: 3, deadlineMs: 1e9, now: () => 0 });
  assert.equal(r.status, "iteration_cap");
});
