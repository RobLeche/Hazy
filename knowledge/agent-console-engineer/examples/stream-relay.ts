// Example 1b — Netlify streaming function body: call Claude with the SDK, relay text deltas as our own SSE.
// Sources: streaming docs; SDK 1.14 types (client.messages.stream, .on("text"), .finalMessage()); Netlify streaming 60 s limit.
import type Anthropic from "@anthropic-ai/sdk";

export function relay(client: Anthropic, params: { model: string; system: string; messages: Anthropic.MessageParam[] }): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  const send = (ctrl: ReadableStreamDefaultController<Uint8Array>, obj: unknown) => ctrl.enqueue(enc.encode(`data: ${JSON.stringify(obj)}\n\n`));
  return new ReadableStream({
    async start(ctrl) {
      try {
        const stream = client.messages.stream({ model: params.model, max_tokens: 8000, system: params.system, messages: params.messages });
        stream.on("text", (delta: string) => send(ctrl, { type: "text", t: delta }));
        const msg = await stream.finalMessage();
        send(ctrl, { type: "done", stop_reason: msg.stop_reason, usage: msg.usage });
      } catch (e) {
        send(ctrl, { type: "error", message: e instanceof Error ? e.message : "unknown" }); // never leak keys/headers
      } finally {
        ctrl.close();
      }
    },
  });
}
