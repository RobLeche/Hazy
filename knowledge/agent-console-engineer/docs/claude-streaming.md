# Streaming (SSE)

Source: https://platform.claude.com/docs/en/build-with-claude/streaming (read 2026-11-26)

## Event flow (quoted)
1. `message_start`: "contains a `Message` object with empty `content`."
2. "A series of content blocks, each of which has a `content_block_start`, any number of `content_block_delta` events,
   and a `content_block_stop` event. Each content block has an `index` that corresponds to its index in the final
   Message `content` array."
3. "One or more `message_delta` events, indicating top-level changes to the final `Message` object."
4. "A final `message_stop` event."

- **Warning (quoted):** "The token counts shown in the `usage` field of the `message_delta` event are *cumulative*."
- `ping` events may appear any number of times.
- Error events, e.g. `event: error` / `{"type": "error", "error": {"type": "overloaded_error", "message": "Overloaded"}}`.
  "If you use the SDK, your code doesn't receive this event. The SDK ends the stream, and the code that reads the
  stream gets an error instead."
- "new event types may be added, and your code should handle unknown event types gracefully."

## Delta types
- `text_delta`: `{"type": "content_block_delta","index": 0,"delta": {"type": "text_delta", "text": "ello frien"}}`
- `input_json_delta`: tool input arrives as "*partial JSON strings*, whereas the final `tool_use.input` is always an
  *object*". Accumulate and parse at `content_block_stop`. "By default, the API buffers each key and value in `input` until
  it is complete."
- `thinking_delta` (when thinking is displayed).

## Verbatim transcript (basic request), saved as ../examples/fixtures/basic-stream.sse
```
event: message_start
data: {"type": "message_start", "message": {"id": "msg_1nZd…", "type": "message", "role": "assistant", "content": [], "model": "claude-opus-5-5", "stop_reason": null, "stop_sequence": null, "usage": {"input_tokens": 25, "output_tokens": 1}}}
event: content_block_start / ping / content_block_delta "Hello" / content_block_delta "!" / content_block_stop
event: message_delta
data: {"type": "message_delta", "delta": {"stop_reason": "end_turn", "stop_sequence":null}, "usage": {"output_tokens": 15}}
event: message_stop
```

## Hazy usage
Netlify streaming functions allow 60 s. Use `client.messages.stream(...)`, forward `text` events to the browser as our own
SSE, and use `await stream.finalMessage()` to get the assembled message for the tool loop.
