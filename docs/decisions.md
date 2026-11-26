# Decision log

Decisions made by the project lead. Each one closes an open question from the
research pack. Agents treat these as constraints; change them only with a new
entry here.

| ID | Date | Decision |
|---|---|---|
| D-001 | 2026-11-26 | Hazy is a **PWA on Netlify**: static front end plus Netlify Functions for the Claude and GitHub calls. **No other servers.** |
| D-002 | 2026-11-26 | **Approve commits straight to `main`.** No intermediate branch or PR; Netlify's continuous deployment publishes each approved commit to production. |
| D-003 | 2026-11-26 | **Stay on the Netlify Free plan** for now. |
| D-004 | 2026-11-26 | GitHub access from Functions uses a **fine-grained personal access token** (not a GitHub App). |
| D-005 | 2026-11-26 | The team is the 12 agents in [expert-roster.md](expert-roster.md), built as project subagents in `.claude/agents/` with project skills in `.claude/skills/`. The orchestrator runs experts in parallel, and **all hand-offs go through the orchestrator**. |

## D-001: Static PWA + Netlify Functions only

- No databases or VMs, and no third-party backends beyond the public APIs
  (Open-Meteo, NWS, Claude API, GitHub API).
- State lives in Netlify Blobs; secrets live in Functions-scoped env vars.
- See [03-architecture-netlify.md](03-architecture-netlify.md).

## D-002: Approve → commit to `main`

**Consequences**
- An approved proposal goes live in one Netlify build. So the server-side
  checks before the commit carry all the weight: re-validating the path
  allow-list, the stale-base check (`baseSha` vs head), the secret scan, and the
  single atomic commit with fast-forward-only ref update
  ([04](04-agent-console-and-security.md) §7).
- **Rollback path:** Netlify "Publish deploy" on the previous deploy (instant),
  then a revert commit. The console should show the previous production deploy
  link next to each commit.
- QA runs before proposals reach the Approve button (tests in the build; the
  build fails, and the deploy does not publish, if tests fail). Make
  `npm test` part of the Netlify build command.
- Rejected: an approve-to-branch flow with a Deploy Preview, then merge.

## D-003: Netlify Free plan

**Consequences**
- Only **2 code-based rate-limit rules** per project: one on
  `/api/auth/login`, one on `/api/agent-chat`. Every other quota (failed-login
  lockout, daily Claude token budget, pending-proposal cap) is enforced in
  application code with Netlify Blobs counters.
- Functions limits: 60 s sync and streaming; background functions up to 15 min
  (available on Free). Long agent work uses background jobs plus polling.
- Watch the Free plan's monthly usage allowances (function invocations, build
  minutes, bandwidth); the Netlify engineer reviews usage each month. Each
  approved commit uses build minutes, so batch small changes into one proposal.
- Netlify site-wide password protection is not assumed; the console uses its
  own password gate.

## D-004: Fine-grained personal access token

**Settings:** resource owner = repo owner; **Only select repositories → RobLeche/Hazy**;
repository permissions **Contents: Read and write** (Metadata read-only is
automatic); **no Workflows**, Actions, Administration, Secrets or Pull requests
permissions; finite expiry (90 days recommended).

**Consequences**
- Stored only as the `GITHUB_TOKEN` env var (Functions scope, secret). Never in
  the repo, the bundle or logs.
- Rotation runbook: create the new token → update the env var → redeploy →
  revoke the old token. Record the expiry date in this file when you create it.
  - Current token expiry: _not yet created_
- Commits are attributed to the token owner. The commit message records the
  agent and proposal ID (`agent(<id>): … / Proposal: <id>`).
- Rejected for now: a GitHub App (short-lived installation tokens). Revisit if
  more people use the console.

## D-005: The agent team

- Agent files: `.claude/agents/<id>.md`. Skill files:
  `.claude/skills/<skill>/SKILL.md`. Each agent preloads its skills through the
  `skills:` frontmatter field.
- The orchestrator is the only agent with the `Agent` tool. It runs independent
  expert tasks **in parallel**, and experts return a `Handoff` block instead of
  calling each other.
- `.claude/**` changes are human-only commits; they are on the Agent Console's
  deny-list.
- See [../CLAUDE.md](../CLAUDE.md).
