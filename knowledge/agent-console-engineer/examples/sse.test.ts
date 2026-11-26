import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseSse, foldMessageStream } from "./sse.ts";

const raw = readFileSync(new URL("./fixtures/basic-stream.sse", import.meta.url), "utf8");

test("official docs transcript folds to 'Hello!' with end_turn and 15 output tokens", () => {
  const events = parseSse(raw);
  assert.deepEqual(events.map((e) => e.event), ["message_start", "content_block_start", "ping", "content_block_delta", "content_block_delta", "content_block_stop", "message_delta", "message_stop"]);
  assert.deepEqual(foldMessageStream(events), { text: "Hello!", stopReason: "end_turn", outputTokens: 15 });
});

test("mid-stream overloaded_error surfaces as an error", () => {
  const ev = parseSse('event: error\ndata: {"type": "error", "error": {"type": "overloaded_error", "message": "Overloaded"}}\n\n');
  assert.throws(() => foldMessageStream(ev), /overloaded_error/);
});

test("unknown future event types are ignored", () => {
  assert.equal(foldMessageStream(parseSse('event: shiny_new\ndata: {"type":"shiny_new"}\n\n')).text, "");
});
