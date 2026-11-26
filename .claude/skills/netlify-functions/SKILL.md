---
name: netlify-functions
description: "Write and configure Hazy's Netlify Functions: modern handler, routing via config.path, 60 s sync and streaming limits, and 15-minute background functions with retries. Use when creating or changing anything in netlify/functions/."
metadata:
  owner: netlify-engineer
  shared_with: [agent-console-engineer, api-integration-expert, software-architect]
---
# Netlify Functions

```ts
// netlify/functions/example.mts
import type { Config, Context } from "@netlify/functions";
export default async (req: Request, context: Context) => Response.json({ ok: true });
export const config: Config = { path: "/api/example", method: ["GET"] };
```

| Kind | Limit | Use |
|---|---|---|
| Sync | **60 s**, not configurable; memory 1,024 MB by default (`config.memory`) | alerts, geocode, auth, proposals |
| Streaming (return a `ReadableStream`) | **60 s**, 20 MB response | agent-chat (SSE) |
| Background (`config.background = true`, or a `-background` filename) | **15 min**; caller gets 202; **retried after 1 min, then 2 min** on error | agent jobs |

## Rules
- Shared helpers live in `netlify/lib/` (auth, blobs, github, anthropic, validation, sse).
- Read secrets with `process.env.NAME` inside the handler; never log them.
- Validate the method, content type and body size first; return JSON errors `{error, code}`
  with the correct status.
- Leave headroom under 60 s: work to a 45 s deadline and then return or pause.
- Background handlers must be **idempotent** (check job status first; retries happen).
- `included_files = [".claude/agents/**"]` in `netlify.toml` so functions can read agent prompts.
- Test handlers by calling the export with `new Request(...)` (function-testing-mocks skill).
