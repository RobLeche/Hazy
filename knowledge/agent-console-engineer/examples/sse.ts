// Example 1a — Dependency-free SSE parser (used by the console UI to read our relay, and to inspect raw API streams).
// Source: https://platform.claude.com/docs/en/build-with-claude/streaming ("Event types", "unknown event types gracefully")
export interface SseEvent { event: string; data: unknown }

export function parseSse(text: string): SseEvent[] {
  return text.split(/\r?\n\r?\n/).flatMap((chunk) => {
    let event = "message"; const data: string[] = [];
    for (const line of chunk.split(/\r?\n/)) {
      if (line.startsWith("event:")) event = line.slice(6).trim();
      else if (line.startsWith("data:")) data.push(line.slice(5).trimStart());
    }
    if (!data.length) return [];
    return [{ event, data: JSON.parse(data.join("\n")) }];
  });
}

/** Fold raw Messages API stream events into final text + stop_reason (ignores ping and unknown events). */
export function foldMessageStream(events: SseEvent[]) {
  let text = ""; let stopReason: string | null = null; let outputTokens = 0;
  for (const { data } of events) {
    const d = data as { type: string; delta?: { type?: string; text?: string; stop_reason?: string }; usage?: { output_tokens?: number }; error?: { type: string } };
    if (d.type === "content_block_delta" && d.delta?.type === "text_delta") text += d.delta.text ?? "";
    else if (d.type === "message_delta") { stopReason = d.delta?.stop_reason ?? stopReason; outputTokens = d.usage?.output_tokens ?? outputTokens; } // cumulative
    else if (d.type === "error") throw new Error(d.error?.type ?? "stream error");
  }
  return { text, stopReason, outputTokens };
}
