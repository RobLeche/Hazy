---
name: rate-limiting
description: "Rate-limit Hazy within the Netlify Free plan: the 2 code-based rules (login and agent-chat) plus app-level quotas in Blobs. Use when exposing a new endpoint, tuning limits, or handling 429s."
metadata:
  owner: netlify-engineer
  shared_with: [security-expert, agent-console-engineer]
---
# Rate limiting

Netlify code rule (in the function's `config`; not supported in `netlify.toml` for functions):
```ts
rateLimit: { windowLimit: 5, windowSize: 60, aggregateBy: ["ip", "domain"] }   // windowSize max 180 s
```
**Free plan = 2 rules**, used for:
1. `/api/auth/login`: 5 per 60 s per IP.
2. `/api/agent-chat`: 20 per 60 s per IP.

App-level (Blobs, strong consistency, ETag increments):
- Failed logins: 10 per IP hash per 15 min, then lock.
- Daily Claude token budget (`AGENT_DAILY_TOKEN_BUDGET`).
- Max 3 concurrent agent jobs; max 20 pending proposals.
- Return `429` with `Retry-After` and a human message; the UI shows it in text (WCAG 3.3.1).
