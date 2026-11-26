# Claude Messages API and models

Sources (read 2026-11-26):
- Create a Message: https://platform.claude.com/docs/en/api/messages/create
- Models overview: https://platform.claude.com/docs/en/about-claude/models/overview
- Errors: https://platform.claude.com/docs/en/api/errors

## Endpoint and headers
`POST https://api.anthropic.com/v1/messages` with `anthropic-version` and `content-type: application/json`, authenticated by
`x-api-key` in raw HTTP examples. **Observed 2026-11-26:** `@anthropic-ai/sdk` 1.14.0 sends the key as
`authorization: Bearer <key>` and `anthropic-version: 2026-10-21`. Let the SDK handle auth; never hand-roll headers.
In Hazy, always call it through `@anthropic-ai/sdk` (`new Anthropic()` reads `ANTHROPIC_API_KEY`), **server-side only**.

## Current models (models overview table)
| | Claude Fable 5.2 | Claude Opus 5.5 | Claude Sonnet 5.5 | Claude Haiku 5.5 |
|---|---|---|---|---|
| API ID | `claude-fable-5-2` | `claude-opus-5-5` | `claude-sonnet-5-5` | `claude-haiku-5-5` |
| Pricing (in / out per MTok) | $8 / $40 | $4 / $20 | $2 / $10 | from $0.10 / $0.50 |
| Thinking | Adaptive (always on) | Adaptive (always on) | Adaptive | Adaptive |
| Default effort | `high` | `medium` | `high` | `medium` |
| Context / max output | 1M / 128K | 1M / 128K | 1M / 128K | 1M / 128K |
Hazy alias map: `opus→claude-opus-5-5`, `sonnet→claude-sonnet-5-5`, `haiku→claude-haiku-5-5`, `fable→claude-fable-5-2`.

## stop_reason values (quoted from the response schema)
- `"end_turn"`: the model reached a natural stopping point
- `"max_tokens"`: exceeded the requested `max_tokens` or the model's maximum
- `"stop_sequence"`: a custom stop sequence was generated
- `"tool_use"`: the model invoked one or more tools
- `"pause_turn"`: "we paused a long-running turn. You may provide the response back as-is in a subsequent request
  to let the model continue."
- `"refusal"`: "when streaming classifiers intervene to handle potential policy violations" (`stop_details` carries
  `category` and `explanation`)
- `"model_context_window_exceeded"`

## Errors (quoted from the errors page)
400 `invalid_request_error`, 401 `authentication_error`, 402 `billing_error`, 403 `permission_error`, 404 `not_found_error`,
409 `conflict_error`, 413 `request_too_large`, **429 `rate_limit_error`**, 500 `api_error` ("Retry only if the response's
`x-should-retry` header isn't `false`"), 504 `timeout_error`, **529 `overloaded_error`**.
Retry 429, 5xx and 529 with backoff; never retry 4xx validation errors. On a streaming call, errors after the stream started
arrive as an `error` event (the status is already 200).

## Thinking and tool choice constraints for the current models
- Opus 5.5: thinking cannot be disabled; control depth with `output_config: { effort }` (default `medium`).
- `tool_choice` `any`/`tool` returns 400 on Fable 5.2, Opus 5.5 and Sonnet 5.5 (tool-use implementation doc table);
  use `auto` and steer with the prompt.
