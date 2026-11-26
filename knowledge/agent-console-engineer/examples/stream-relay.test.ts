// Uses the REAL @anthropic-ai/sdk with a fake fetch that replays the official SSE transcript.
// Needs the SDK resolvable (NODE_PATH or node_modules). Skips otherwise.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { relay } from "./stream-relay.ts";
import { parseSse } from "./sse.ts";

let Anthropic: any = null;
try { Anthropic = createRequire(import.meta.url)("@anthropic-ai/sdk").default; } catch { /* skipped below */ }
const raw = readFileSync(new URL("./fixtures/basic-stream.sse", import.meta.url), "utf8");

test("relay forwards text deltas and the final stop_reason (real SDK)", { skip: !Anthropic && "install @anthropic-ai/sdk to run" }, async () => {
  let seen: { url: string; body: any; key: string | null; version: string | null } | null = null;
  const fakeFetch = async (url: string, init: RequestInit) => {
    seen = { url: String(url), body: JSON.parse(String(init.body)), key: new Headers(init.headers).get("authorization"), version: new Headers(init.headers).get("anthropic-version") };
    return new Response(raw, { status: 200, headers: { "content-type": "text/event-stream" } });
  };
  const client = new Anthropic({ apiKey: "test-key", fetch: fakeFetch, maxRetries: 0 });
  const out = await new Response(relay(client, { model: "claude-opus-5-5", system: "You are the storm-scorer.", messages: [{ role: "user", content: "Hi" }] })).text();
  const events = parseSse(out).map((e) => e.data as any);
  assert.deepEqual(events.filter((e) => e.type === "text").map((e) => e.t), ["Hello", "!"]);
  assert.equal(events.at(-1).type, "done");
  assert.equal(events.at(-1).stop_reason, "end_turn");
  assert.match(seen!.url, /\/v1\/messages$/);
  assert.equal(seen!.body.stream, true);
  assert.equal(seen!.key, "Bearer test-key");          // SDK 1.14 sends the key as a Bearer token
  assert.ok(seen!.version, "SDK sets anthropic-version");
  assert.ok(!out.includes("test-key"), "API key must never reach the browser stream");
});
