# 04 — Agent Console: design, security and long-running jobs

> Part of the Hazy research pack. See [README](README.md) for the index.

## 1. What it is

A page inside the deployed app, `/console`, that:

1. **Lists every agent** defined in `.claude/agents/*.md` with its **name,
   model and personality**.
2. Lets the (single) owner **chat with any agent**. The Claude API is called
   **only from a Netlify Function**, with the key in an environment variable.
3. Lets an agent **propose code changes**. Nothing is committed until the user
   reviews the diff and clicks **Approve**. Approval creates a commit on GitHub,
   and Netlify's continuous deployment then **redeploys** the site.

## 2. Agent definitions (`.claude/agents/*.md`)

Use Claude Code's subagent file format (Markdown with YAML frontmatter), so the
same files work for the team in Claude Code and in the console:

```markdown
---
name: storm-scorer
description: Owns src/lib/scoring.ts and its tests; tunes thunderstorm/flood thresholds.
model: sonnet            # Claude Code aliases: opus | sonnet | haiku | inherit (or a full model ID)
tools: Read, Grep, Glob, Edit
personality: Careful meteorology nerd. Cites sources, explains thresholds in plain words.
---
You are the scoring specialist for Hazy...
(the body is the system prompt)
```

- `name`, `description`, `model`, `tools` are Claude Code subagent fields.
  `personality` is **our own extra field** for the console card. Claude Code
  ignores unknown keys (verify this against the Claude Code subagent docs when
  building). If `personality` is missing, show `description`.
- **Model mapping** (server-side, in one place):
  `opus → claude-opus-5-5`, `sonnet → claude-sonnet-5-5`, `haiku → claude-haiku-5-5`,
  `inherit`/missing → `claude-opus-5-5` (the current default). Full IDs pass
  through only if they are on an allow-list of known IDs.
- Build step `scripts/build-agents.ts` parses the frontmatter and emits
  `agents.json` with `{ id, name, model, modelId, personality, description }`.
  Do **not** ship system-prompt bodies to the browser. Functions read them from
  the bundled `.claude/agents` (`included_files`). If the repo is public the
  prompts are public anyway, but the console should still not be a prompt API.
- The console's own `tools` are **not** Claude Code's tools. In the console every
  agent gets the same safe, server-implemented toolset (§5). The `tools` field
  is shown for information only.

## 3. Threat model (what we defend against)

| Threat | Mitigation |
|---|---|
| Stranger finds `/console` and spends your Claude credits or edits your site | Password gate + signed HttpOnly session; all `/api/agent*`, `/api/proposals*` reject unauthenticated calls; rate limits; daily token budget |
| Password brute force | Netlify `rateLimit` on login (e.g. 5 per 60 s per IP) + app-level lockout counter in Blobs; slow hash (scrypt) |
| API key / GitHub token leak to the browser | Keys exist only in Functions-scoped env vars; never in the bundle, responses, logs or error messages; CSP; secrets scanning |
| Agent writes outside its lane (functions, auth, CI, build config) | **Path allow-list + deny-list** enforced server-side at proposal time **and again** at approval time |
| Token over-privilege | Fine-grained PAT: **only this repository**, **Contents: read/write** only (Metadata read is implied); no Workflows, Actions, Admin or Secrets permissions |
| Prompt injection (repo files, user text or forecast data steer the agent) | Human approval of every diff; tools cannot commit; allow-list; agent output rendered as text, never HTML |
| XSS in the console that would click "Approve" for you | No `innerHTML` of model output; a strict Markdown renderer (or plain text) with sanitising; CSP `script-src 'self'` |
| CSRF on approve | `SameSite=Strict` cookie + `Origin` header check + a custom header (`X-Hazy-CSRF` with a per-session token) |
| Replay / double approve | Proposal state machine `pending → approved/rejected → committed`; conditional Blobs write (`onlyIfMatch` ETag) |
| Stale proposal overwrites newer code | Store `baseSha`; at approval, refuse if any touched file changed since `baseSha` |
| Runaway cost | `max_tokens` caps, a tool-loop iteration cap, a per-day token budget in Blobs, and Anthropic Console spend limits |

## 4. Authentication: password gate

- One owner password; store only `CONSOLE_PASSWORD_HASH` (scrypt via
  `node:crypto` `scrypt`, with salt and params in the string).
- `POST /api/auth/login { password }` →
  `crypto.timingSafeEqual` on the derived key → set the cookie
  `hazy_session=<payload>.<HMAC-SHA256(SESSION_SECRET)>`, where the payload is
  `{ sid, exp }` (for example 12 h), with attributes
  `HttpOnly; Secure; SameSite=Strict; Path=/api`.
- Every protected function starts with `requireSession(req)` and returns `401`
  otherwise. Also return a CSRF token in the login response body; the console
  keeps it in memory and sends it as `X-Hazy-CSRF` on mutating requests.
- **Rate limits** (uses both Free-plan rule slots):
  ```ts
  export const config = { path: "/api/auth/login",
    rateLimit: { windowLimit: 5, windowSize: 60, aggregateBy: ["ip", "domain"] } };
  ```
  ```ts
  export const config = { path: "/api/agent-chat",
    rateLimit: { windowLimit: 20, windowSize: 60, aggregateBy: ["ip", "domain"] } };
  ```
  Add an app-level counter for failed logins per IP hash (lock for 15 min after
  10 failures) and a daily token budget (`quotas/{date}`), because Netlify's
  window maxes out at 180 s.
- Alternatives considered: Netlify's site-wide password protection and
  Netlify Identity/OAuth. They are not researched in this pack, and a site-wide
  password would lock out the public weather app, so a console-only gate is needed.

## 5. Chat and tools

### 5.1 Request flow (`POST /api/agent-chat`, streaming)

Client sends `{ agentId, messages: [{role, content}] }`, and only user and
assistant text. The server:

1. Authenticates, then validates `agentId` against `agents.json` (never trusts a
   client-sent system prompt or model).
2. Caps the input: max ~30 messages, ~8,000 characters per message (trim older turns).
3. Loads the system prompt from `.claude/agents/<id>.md`, prepends a fixed
   **console preamble** ("You are working on the Hazy repo. You cannot commit;
   use `propose_change`. Allowed paths: …"), then calls Claude with streaming.
4. Re-emits text deltas to the browser as SSE (`text/event-stream`).
5. Runs **client tools** server-side (below) inside the same request, looping
   until `stop_reason !== "tool_use"`, the iteration cap (e.g. 8) is hit, or the
   **time budget** (e.g. 45 s of the 60 s limit) runs out. In that case it emits
   `{"type":"paused"}` and the UI offers "Continue" (a new request) or "Run as
   background job" (§6).

### 5.2 Tools exposed to every agent

| Tool | Does | Safety |
|---|---|---|
| `list_files { dir }` | Lists repo paths via the GitHub API (`GET /repos/{o}/{r}/git/trees/{sha}?recursive=1`, cached per request) | Read-only; hides deny-listed paths |
| `read_file { path }` | `GET /repos/{o}/{r}/contents/{path}?ref={sha}` (≤1 MB; larger files need the raw media type) | Read-only; deny-listed paths and secrets refused |
| `propose_change { summary, files: [{ path, action: "create"\|"update"\|"delete", content? }] }` | **Stores** a proposal in Blobs; returns `{ proposalId, status: "pending_approval" }` | Never commits; validates paths, size and count |

Define the tools with `strict: true` (schema-exact inputs, `additionalProperties: false`).
Because the tool loop streams, set `eager_input_streaming: true` on these tools
and **validate every parsed input yourself** before running it, since streamed
input may be truncated at `max_tokens`. Return failures as a `tool_result` with
`is_error: true` instead of throwing.

### 5.3 Claude API notes (from the official docs and current model guidance)

- Use the official SDK `@anthropic-ai/sdk` (TypeScript) in functions.
  `client.messages.stream({...})`; iterate events, or `await stream.finalMessage()`.
- SSE event types to handle: `message_start`, `content_block_start`,
  `content_block_delta` (`text_delta`, `input_json_delta`, `thinking_delta`),
  `content_block_stop`, `message_delta`, `message_stop`, `ping`, `error`
  (for example `overloaded_error` mid-stream: show "Claude is busy, retry").
- Default model `claude-opus-5-5`. On this model thinking cannot be disabled and
  `effort` defaults to `medium`, so set `output_config: { effort }` per agent
  (`low` for chatty helpers, `high` for code changes). **Forced `tool_choice`
  (`any`/`tool`) returns 400 on Opus 5.5 and Sonnet 5.5**, so use `auto` and
  steer with the prompt. No assistant prefill.
- Always check `stop_reason` before reading content (`refusal`, `max_tokens`,
  `tool_use`, `pause_turn`). For Opus 5.5 and Sonnet 5.5, consider the
  server-side `fallbacks` option (beta) so a safety-classifier refusal
  retries on another model.
- Cache the stable prefix (tools + system prompt) with `cache_control` to cut
  cost on multi-turn chats.
- Pass the full `response.content` (including any thinking blocks) back
  unchanged when continuing a tool loop.

Sketch (illustrative; validate against the SDK version you install):

```ts
// netlify/functions/agent-chat.mts
import Anthropic from "@anthropic-ai/sdk";
import type { Config, Context } from "@netlify/functions";
import { requireSession, loadAgent, TOOLS, runTool, sse } from "../lib/console";

const client = new Anthropic(); // reads ANTHROPIC_API_KEY from env

export default async (req: Request, _ctx: Context) => {
  await requireSession(req);                        // throws 401
  const { agentId, messages } = await parseAndCap(req);
  const agent = await loadAgent(agentId);           // allow-listed; server-side prompt + model
  const deadline = Date.now() + 45_000;

  const body = new ReadableStream({
    async start(ctrl) {
      const history = [...messages];
      for (let i = 0; i < 8 && Date.now() < deadline; i++) {
        const stream = client.messages.stream({
          model: agent.modelId,
          max_tokens: 8000,
          system: [{ type: "text", text: agent.systemPrompt, cache_control: { type: "ephemeral" } }],
          output_config: { effort: agent.effort },
          tools: TOOLS,
          messages: history,
        });
        stream.on("text", (t) => ctrl.enqueue(sse({ type: "text", t })));
        const msg = await stream.finalMessage();
        history.push({ role: "assistant", content: msg.content });
        if (msg.stop_reason !== "tool_use") break;
        const results = [];
        for (const b of msg.content) if (b.type === "tool_use")
          results.push(await runTool(b, agentId));     // validated; propose_change → Blobs
        history.push({ role: "user", content: results });
        ctrl.enqueue(sse({ type: "tools", results: summarize(results) }));
      }
      ctrl.enqueue(sse({ type: Date.now() >= deadline ? "paused" : "done" }));
      ctrl.close();
    },
  });
  return new Response(body, { headers: { "content-type": "text/event-stream" } });
};

export const config: Config = {
  path: "/api/agent-chat",
  rateLimit: { windowLimit: 20, windowSize: 60, aggregateBy: ["ip", "domain"] },
};
```

The server keeps no conversation state between requests. The browser holds the
transcript, and the server re-validates it. If you want tool calls in history,
store the server-side transcript in Blobs under a conversation ID instead of
trusting client-supplied `tool_result` blocks. **Recommended: server-side
transcripts in Blobs, so the client cannot forge tool results.**

## 6. Long agent jobs vs Netlify time limits

| Job size | Mechanism |
|---|---|
| Short chat turn (≤45 s) | Streaming function (§5) |
| Multi-step change (read several files, draft a large diff) | **Background function** (≤15 min) + Blobs job record + client polling |
| Longer than 15 min | Chain: the background job checkpoints its transcript to Blobs and enqueues a continuation; or move the loop to Anthropic **Managed Agents** (hosted agent loop and sandbox, beta), with the function only creating sessions and relaying events |

Background job design:

1. `POST /api/agent-jobs { agentId, task }` (auth) → creates `jobs/{jobId}`
   `{status:"queued"}` with `onlyIfNew`, then `fetch`es the background function
   URL with `{ jobId }` and an internal HMAC header. The background function
   rejects calls without it. Returns `{ jobId }`.
2. The background function (`config.background = true`) gets a 202 immediately.
   It loads the job and **exits if the status is not `queued`/`retrying`**
   (Netlify retries failed invocations after 1 and 2 minutes, so the handler must
   be idempotent). It sets `running`, then runs the same tool loop as §5 with a
   deadline of ~13 min, appending compact events (`{t, kind, text}`) to the job
   record every few seconds.
3. The UI polls `GET /api/agent-jobs/:id` every 2–3 s and reads with
   `consistency: "strong"` (Blobs is otherwise eventually consistent, with up
   to 60 s propagation). The UI renders events and links any `proposalId`.
4. On timeout: save the transcript, set `status: "paused"`, and offer "Continue".
5. **Never commit from a background job.** Jobs only create proposals.

## 7. Proposals, approval and commit

### 7.1 Path policy (enforced in `validateProposal`, at propose time and at approve time)

```ts
const ALLOW = ["src/**", "public/**", "tests/**", "docs/**", "index.html"];
const DENY  = [
  "netlify/**", "netlify.toml", "public/_headers", "public/_redirects",   // server + security headers
  ".claude/**", ".github/**",                                            // agent prompts, CI
  "package.json", "package-lock.json", "pnpm-lock.yaml", "yarn.lock",     // supply chain
  "scripts/**", "vite.config.*", "tsconfig*.json",                        // build pipeline
  "**/.env*", "**/*.pem", "**/*.key",
];
```

- Normalise first: reject absolute paths, `..`, backslashes, NUL bytes,
  `//`, a leading `.` segment other than an allow-listed one, and non-UTF-8 text.
  Compare against the **normalised** path. DENY wins over ALLOW.
- Limits: at most 20 files and 200 KB of content per proposal; text files only.
- Scan new content for secrets (`sk-ant-`, `github_pat_`, `ghp_`,
  `-----BEGIN`) and refuse a proposal that contains any.
- Changing the allow-list itself is a **human-only** change (it lives in
  `netlify/lib`, which is deny-listed).

### 7.2 Review UI

A side-by-side or unified diff per file (computed server-side against `baseSha`),
the agent's summary, the agent name, model, and the time. Buttons: **Approve &
deploy**, **Reject**, **Ask agent to revise** (sends a feedback message back to
the chat). Show which deploy it will trigger (production `main`, or a preview branch).

### 7.3 Commit (`POST /api/proposals/:id/approve`)

1. `requireSession` + CSRF + `Origin` check.
2. Load the proposal with its ETag. Require `status === "pending"`, then
   conditionally set `status: "approving"` (`onlyIfMatch`) so a double click
   cannot commit twice.
3. Re-run `validateProposal`.
4. Get the head: `GET /repos/{o}/{r}/git/ref/heads/main`. If the head differs from
   `baseSha`, call `GET /repos/{o}/{r}/compare/{baseSha}...{head}` and **refuse
   with 409** if any proposed path changed (the user can ask the agent to rebase).
5. Make **one atomic commit** with the Git Data API (all files at once; the
   Contents API is one file per commit and must be called serially, because
   parallel create/update and delete calls conflict):
   - `GET /git/commits/{head}` → `tree.sha`
   - `POST /git/trees { base_tree, tree: [{ path, mode: "100644", type: "blob", content } | { path, mode: "100644", type: "blob", sha: null } /* delete */] }`
   - `POST /git/commits { message: "agent(<agentId>): <summary>\n\nProposal: <id>\nApproved-by: console", tree, parents: [head] }`
   - `PATCH /git/refs/heads/main { sha: newCommit, force: false }` (a
     fast-forward only; on 422, re-check and retry once)
6. Save `status: "committed", commitSha`, and append to `audit`.
7. Netlify builds automatically. The UI links the commit and, optionally, polls
   the deploy state (that needs a Netlify API token, so it is optional; the
   simpler choice is to show "Deploy started, check Netlify").

Headers on every GitHub call: `Authorization: Bearer ${GITHUB_TOKEN}`,
`Accept: application/vnd.github+json`, `X-GitHub-Api-Version: <current>`,
and a `User-Agent`.

### 7.4 The GitHub token

Create a **fine-grained personal access token**:

- Resource owner: the account that owns the repo. Repository access:
  **Only select repositories → RobLeche/Hazy**.
- Repository permissions: **Contents: Read and write** (Metadata: read-only is
  included automatically). **Do not grant Workflows**: GitHub requires the
  Workflows permission to change `.github/workflows/*`, so without it the token
  cannot alter CI even if the allow-list were bypassed.
- Expiration: a finite period, for example 90 days (fine-grained tokens allow
  1–366 days or none; the default is 30). Put a rotation reminder in the
  calendar and record the expiry in `docs/`.
- If the repo is owned by an organisation that requires approval, the token
  stays `pending` (read-only on public resources) until an admin approves it.
- Store it only in Netlify env vars (Functions scope, secret). Never in the repo.
- If you later want more isolation, a GitHub App with Contents permission on
  one repo gives short-lived installation tokens. That is the upgrade path; it is
  not researched in detail here.

## 8. Rate limits and quotas summary

| Layer | Limit |
|---|---|
| Netlify `rateLimit` (code) | login 5/60 s per IP; agent-chat 20/60 s per IP (the Free plan allows only 2 rules) |
| App: login lockout | 10 failures → 15-minute lock per IP hash |
| App: daily token budget | sum `usage.input_tokens + output_tokens` per day in `quotas/{date}`; refuse new turns when over |
| App: proposals | ≤20 pending proposals at once; ≤20 files each |
| Anthropic Console | workspace spend limit as a final cap |
| GitHub | the authenticated REST limit is generous; we make few calls |

## 9. Logging and privacy

Log event types and IDs, never prompts with secrets, tokens or full file
contents. Keep audit records (login success and failure, approvals, commit SHAs).
Agent transcripts go to Blobs with a retention rule (for example, delete after
30 days via a scheduled function).

## Sources

- Claude API, Tool use overview: https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview
- Claude API, Streaming: https://platform.claude.com/docs/en/build-with-claude/streaming
- Claude API, Messages (create): https://platform.claude.com/docs/en/api/messages/create
- Claude API, Models overview: https://platform.claude.com/docs/en/about-claude/models/overview
- GitHub REST, Repository contents: https://docs.github.com/en/rest/repos/contents
- GitHub REST, Git trees: https://docs.github.com/en/rest/git/trees
- GitHub REST, Git commits and refs: https://docs.github.com/en/rest/git/commits and https://docs.github.com/en/rest/git/refs
- GitHub, Managing personal access tokens: https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens
- Netlify Background Functions: https://docs.netlify.com/build/functions/background-functions/
- Netlify Functions API (streaming limits, rateLimit): https://docs.netlify.com/build/functions/api/
- Netlify Blobs: https://docs.netlify.com/build/data-and-storage/netlify-blobs/
- Netlify Rate limiting: https://docs.netlify.com/manage/security/secure-access-to-sites/rate-limiting/
- Netlify env vars: https://docs.netlify.com/build/environment-variables/overview/
