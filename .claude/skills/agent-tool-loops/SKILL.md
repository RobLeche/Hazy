---
name: agent-tool-loops
description: "Run Hazy's agent tool loop inside Netlify limits: iteration caps, a 45 s deadline in streaming functions, pause and continue, and background jobs with idempotent retries and polling. Use when building agent-chat, agent jobs or anything that loops on Claude tool calls."
metadata:
  owner: agent-console-engineer
  shared_with: [software-architect, netlify-engineer]
---
# Agent tool loops within time limits

## Streaming turn (`/api/agent-chat`, 60 s hard limit)
- Loop: call Claude → if `stop_reason === "tool_use"`, run each tool (validated) → append ONE user
  message containing all `tool_result` blocks → repeat.
- Stop at 8 iterations or a **45 s deadline**; emit `{"type":"paused"}`; the UI offers Continue or
  "Run as background job".
- Tool errors return `tool_result` with `is_error: true`; never throw away the turn.
- Server-side transcript in Blobs (`transcripts/{conversationId}`); the client sends only new user
  text plus the conversation ID, so it cannot forge tool results.

## Background job (`agent-job`, `config.background = true`, 15 min)
1. `POST /api/agent-jobs` creates `jobs/{id}` (`onlyIfNew`) with `status: queued`, then invokes the background
   function with an internal HMAC header.
2. The handler exits unless status is `queued` or `retrying` (**Netlify retries after 1 and 2 min**),
   then CAS-sets `running`.
3. Same loop with a ~13 min deadline; append compact events every few seconds.
4. On deadline: save the transcript, set `paused`. On finish: `done` plus the result. On error: `failed` plus the message.
5. The UI polls `GET /api/agent-jobs/:id` every 2–3 s with strong consistency.
6. Jobs only ever create **proposals**; they never commit.
