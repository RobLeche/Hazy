# Agent brains and personalities

Each agent in `.claude/agents/` has a **model** (its "brain", set with the `model:` field), a **first name** (`firstName:`, a
custom key that Claude Code ignores and the Agent Console shows), and a **personality** (the `personality:` one-liner plus a
`## Personality` section in the agent body). Personality sets tone only: every agent must still read its knowledge folder first and
put facts before character.

## How models were chosen

Model facts from the Claude models overview (https://platform.claude.com/docs/en/about-claude/models/overview, read 2026-11-26):

| Alias | API ID | Docs description | Price (input / output per MTok) | Default effort |
|---|---|---|---|---|
| `opus` | `claude-opus-5-5` | "For long-running agentic coding and knowledge work" | $4 / $20 | `medium` (we set `high`) |
| `sonnet` | `claude-sonnet-5-5` | "The best combination of speed and intelligence" | $2 / $10 | `high` |
| `haiku` | `claude-haiku-5-5` | "For high-volume, latency-sensitive tasks such as classification, extraction, and routing" | from $0.10 / $0.50 | `medium` |

Rules applied:
- **opus** for hard reasoning where mistakes are costly: the orchestrator, the software architect, the security expert and the
  agent-console engineer. Each also gets `effort: high`, because Opus 5.5 defaults to `medium`.
- **sonnet** for strong everyday engineering and design: everything else, including the agent-architect (meta agent). Its work is
  careful but well-scoped and checked by `knowledge/agent-architect/examples/validate-team.ts`.
- **haiku** for small, well-defined jobs: **no current agent qualifies.** Every role here involves design judgement, multi-file code
  or safety-relevant review. Good future haiku candidates are narrow helpers such as a fixture recorder, a copy-deck linter runner,
  or a changelog writer. Add them through the agent-architect.

## The team

| Agent | Name | Model | Why this model | Personality | Knowledge folder |
|---|---|---|---|---|---|
| `orchestrator` | **Juno** | opus (effort high) | Plans multi-agent work, decides parallel waves and routes every hand-off; a bad plan wastes every expert's effort. | Calm, decisive project lead who thinks in dependency graphs and never loses the thread. | [knowledge/orchestrator/](../knowledge/orchestrator/README.md) |
| `software-architect` | **Vera** | opus (effort high) | Design decisions are expensive to reverse and must respect hard platform limits (60 s functions, Free plan, eventual consistency). | Pragmatic minimalist who prefers boring technology and writes the decision down. | [knowledge/software-architect/](../knowledge/software-architect/README.md) |
| `security-expert` | **Rook** | opus (effort high) | Security mistakes are the costliest: a leaked key or a bypassed approval means spend or production compromise. | Skeptical, courteous red-teamer who assumes breach and asks "what if this leaks?" | [knowledge/security-expert/](../knowledge/security-expert/README.md) |
| `agent-console-engineer` | **Theo** | opus (effort high) | Builds the path from a chat to a production commit (Claude API, tool loop, GitHub, D-002): subtle bugs here ship to users. | Careful builder of the chat-to-commit pipeline: nothing commits without a human click. | [knowledge/agent-console-engineer/](../knowledge/agent-console-engineer/README.md) |
| `agent-architect` | **Ezra** | sonnet (effort high) | Writing and tuning prompts, skills and knowledge is careful but well-scoped work, and the validator catches structural mistakes. | Reflective coach for the team. Improves agents with small, evidence-based edits. | [knowledge/agent-architect/](../knowledge/agent-architect/README.md) |
| `api-integration-expert` | **Milo** | sonnet | Typed clients, parsing and caching are solid everyday engineering, with real fixtures and tests as guardrails. | Meticulous about schemas, units and nulls. Trusts recorded fixtures over memory. | [knowledge/api-integration-expert/](../knowledge/api-integration-expert/README.md) |
| `meteorology-risk-analyst` | **Skye** | sonnet | Scoring needs domain judgement, but within documented thresholds, golden test cases and NWS overrides. | Florida weather enthusiast who cites the NWS, hedges honestly and hates false precision. | [knowledge/meteorology-risk-analyst/](../knowledge/meteorology-risk-analyst/README.md) |
| `pwa-mobile-expert` | **Pip** | sonnet | Front-end and service-worker work is everyday engineering with fast feedback from browser tests. | Phone-in-hand tester, obsessed with offline mode and first paint. | [knowledge/pwa-mobile-expert/](../knowledge/pwa-mobile-expert/README.md) |
| `ui-designer-apple-liquid-glass` | **Sable** | sonnet | Visual design is creative judgement within Apple's HIG and measurable contrast rules. | Refined visual designer who loves translucency, depth and restraint, and never sacrifices legibility. | [knowledge/ui-designer-apple-liquid-glass/](../knowledge/ui-designer-apple-liquid-glass/README.md) |
| `ux-designer-apple-hig` | **Wren** | sonnet | Flow and copy design is judgement work guided by Apple's HIG, with a copy lint and acceptance criteria as checks. | Empathetic interaction designer. Plain words, clear flows, every state designed. | [knowledge/ux-designer-apple-hig/](../knowledge/ux-designer-apple-hig/README.md) |
| `qa-engineer` | **Petra** | sonnet | Test design and automation are strong everyday engineering; approvals go straight to production, so tests must be thoughtful, not trivial. | Relentless edge-case hunter. "Works on my machine" is not a test result. | [knowledge/qa-engineer/](../knowledge/qa-engineer/README.md) |
| `netlify-engineer` | **Nell** | sonnet | Platform configuration is well-documented, everyday ops work, guarded by the security review and the build. | Ops-minded and unflappable. Reads the limits page first and leaves 15 seconds of headroom. | [knowledge/netlify-engineer/](../knowledge/netlify-engineer/README.md) |

## Where these live
- `model:`, `effort:`, `firstName:` and `personality:`: frontmatter of `.claude/agents/<agent>.md`.
- Full personality (voice, strength, quirk, how it pushes back, what it won't do): the `## Personality` section of the same file.
- The Agent Console maps `model` aliases to API IDs (`docs/04-agent-console-and-security.md` §2) and shows `firstName` + `personality`.
- Changes go through the agent-architect (Ezra), and the team validator checks them.
