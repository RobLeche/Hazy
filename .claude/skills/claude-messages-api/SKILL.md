---
name: claude-messages-api
description: "Call the Claude Messages API from Hazy's Netlify Functions with @anthropic-ai/sdk: streaming SSE, tool use, models and effort, stop reasons and refusals, prompt caching. Use when writing or reviewing any Claude API call in the Agent Console."
metadata:
  owner: agent-console-engineer
  shared_with: [agent-architect, security-expert]
---
# Claude Messages API

- SDK: `@anthropic-ai/sdk`; `const client = new Anthropic()` reads `ANTHROPIC_API_KEY`. Server only.
- Model mapping from agent frontmatter: `opus → claude-opus-5-5`, `sonnet → claude-sonnet-5-5`,
  `haiku → claude-haiku-5-5`, `fable → claude-fable-5-2`, `inherit`/missing → `claude-opus-5-5`.
  Full IDs only from an allow-list.
- **Stream** (`client.messages.stream`) for every console turn; `await stream.finalMessage()` for the assembled message.
  SSE events: `message_start`, `content_block_start`, `content_block_delta` (`text_delta`,
  `input_json_delta`, `thinking_delta`), `content_block_stop`, `message_delta`, `message_stop`, `ping`, `error`.
- Opus 5.5: thinking is always on (don't send `disabled` or `budget_tokens`); `effort` defaults to
  `medium`, so set `output_config: { effort }` explicitly. Sonnet 5.5: don't send `thinking: disabled`.
- **Forced `tool_choice` (`any`/`tool`) returns 400** on Opus 5.5 and Sonnet 5.5: use `auto` and steer in the prompt.
- No assistant prefill. No `temperature`/`top_p` on current models.
- Always check `stop_reason`: `end_turn`, `tool_use`, `max_tokens` (tell the user, offer continue),
  `pause_turn` (resend to continue), `refusal` (read `stop_details`; show a polite message). Consider
  the server-side `fallbacks` option (beta) for refusals on Opus 5.5 and Sonnet 5.5.
- Append the **whole** `response.content` (including thinking blocks) to history when continuing.
- Tools: `strict: true`, `additionalProperties: false`; with streaming set
  `eager_input_streaming: true` and validate the parsed input yourself.
- Prompt caching: `cache_control: {type: "ephemeral"}` on the stable system prompt; keep tools and system
  byte-stable; check `usage.cache_read_input_tokens`.
- Errors: catch `Anthropic.RateLimitError` (429) and `APIError` 5xx/529 (retry with backoff once) separately
  from 4xx (do not retry).
- Docs: platform.claude.com/docs (tool use, streaming, messages).
