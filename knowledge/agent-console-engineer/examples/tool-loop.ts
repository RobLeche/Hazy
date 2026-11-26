// Example 2 — The agent tool loop with Hazy's limits: iteration cap, deadline, results-first, is_error.
// Sources: handle-tool-calls ("tool_result blocks must come FIRST", "is_error", "limit how many retries"),
// messages stop_reason values; Netlify 60 s streaming limit (we stop at 45 s).
type Block = { type: "text"; text: string } | { type: "tool_use"; id: string; name: string; input: unknown };
export interface ModelTurn { stop_reason: string; content: Block[] }
export type CreateMessage = (messages: unknown[]) => Promise<ModelTurn>;
export type ToolFn = (input: unknown) => Promise<string>;

export async function runLoop(create: CreateMessage, tools: Record<string, ToolFn>, userText: string, opts = { maxIterations: 8, deadlineMs: 45_000, now: () => Date.now() }) {
  const start = opts.now();
  const messages: unknown[] = [{ role: "user", content: userText }];
  for (let i = 0; i < opts.maxIterations; i++) {
    if (opts.now() - start > opts.deadlineMs) return { status: "paused" as const, messages };
    const turn = await create(messages);
    messages.push({ role: "assistant", content: turn.content }); // append the WHOLE content unchanged
    if (turn.stop_reason !== "tool_use") return { status: turn.stop_reason as string, messages };
    const results = [];
    for (const b of turn.content) {
      if (b.type !== "tool_use") continue;
      const fn = tools[b.name];
      try {
        if (!fn) throw new Error(`unknown tool ${b.name}`);
        results.push({ type: "tool_result", tool_use_id: b.id, content: await fn(b.input) });
      } catch (e) {
        results.push({ type: "tool_result", tool_use_id: b.id, content: e instanceof Error ? e.message : "error", is_error: true });
      }
    }
    messages.push({ role: "user", content: results }); // ONE user message, tool_results only, right after the tool_use
  }
  return { status: "iteration_cap" as const, messages };
}
