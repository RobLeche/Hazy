---
name: function-testing-mocks
description: "Test Hazy's Netlify Functions by calling handlers with Request objects and mocking Claude, GitHub, NWS and Blobs (MSW or fetch stubs). Use when adding or changing a function or its auth, streaming or commit logic."
metadata:
  owner: qa-engineer
  shared_with: [agent-console-engineer, netlify-engineer]
---
# Function testing with mocks

```ts
import handler from "../../netlify/functions/agent-chat.mts";
const res = await handler(new Request("https://x/api/agent-chat", { method: "POST", headers, body }), ctx);
expect(res.status).toBe(401);
```
- Mock external HTTP with MSW (`api.anthropic.com`, `api.github.com`, `api.weather.gov`); replay
  canned SSE streams for Claude (text, tool_use, `max_tokens`, `refusal`, mid-stream `overloaded_error`).
- Mock Blobs with an in-memory store that implements `onlyIfNew` and `onlyIfMatch`.
- Assert: status codes; `Cache-Control: no-store` on authenticated routes; SSE framing; no secrets in bodies.
- Approve flow: assert the exact GitHub call sequence (ref → compare? → commit → tree → commit → PATCH ref with
  `force:false`) and that the ref PATCH happens exactly once under two concurrent approvals.
- Background job: a second invocation of the same job ID is a no-op (idempotent).
