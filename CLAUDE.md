# Hazy — Claude Code project guide

Hazy is a mobile-first **PWA on Netlify**. You pick an area in Florida (or any US
state) and it shows whether **thunderstorms** or **flooding** are likely today
and over the next few days, using the free Open-Meteo APIs and official NWS
alerts. It includes a password-gated **Agent Console** where the project lead
chats with this team's agents and approves their code changes.

## Decisions in force (see `docs/decisions.md`)
- **D-001** Static front end + Netlify Functions only (Claude and GitHub calls live in Functions). No other servers.
- **D-002** Agent Console **Approve commits straight to `main`**, so it deploys to production.
- **D-003** **Netlify Free plan** (2 code-based rate-limit rules; 60 s sync and streaming functions; 15 min background).
- **D-004** GitHub access via a **fine-grained PAT** (this repo only, Contents read/write only).

## The team

Twelve project subagents live in `.claude/agents/`. Their skills live in
`.claude/skills/<skill>/SKILL.md` and are preloaded into each agent through
its `skills:` field. The full roster and skill matrix are in `docs/expert-roster.md`.

| Agent | Role |
|---|---|
| `orchestrator` | Runs the team: plans, delegates, routes hand-offs, reports |
| `agent-architect` | Meta agent: builds and improves the agents and skills |
| `software-architect` | Design, boundaries, contracts, ADRs |
| `api-integration-expert` | Open-Meteo (forecast, marine, flood, geocoding) and NWS alerts |
| `meteorology-risk-analyst` | Thunderstorm and flood scoring, calibration, risk wording |
| `pwa-mobile-expert` | Front end, manifest, service worker, offline, install, performance |
| `ui-designer-apple-liquid-glass` (**Sable**) | Liquid Glass visual design, tokens, icons |
| `ux-designer-apple-hig` (**Wren**) | HIG flows, interactions, copy, accessibility design |
| `agent-console-engineer` | Agent Console: Claude API chat, proposals, approve-to-main commits |
| `netlify-engineer` | `netlify.toml`, Functions config, Blobs, env vars, headers, rate limits, deploys |
| `security-expert` | Threat model, security reviews, PAT, path policy |
| `qa-engineer` | Tests and release sign-off |

## How the team works

1. **Start with the orchestrator** for any multi-step goal: run
   `claude --agent orchestrator`, or ask the main session to "use the orchestrator".
   Use an expert directly only for a single, clearly scoped task.
2. **The orchestrator runs experts in parallel.** It builds a dependency graph and
   launches every task whose inputs are ready **at the same time** (several
   subagent calls in one message). Parallel tasks get disjoint file paths, using
   the ownership table in `docs/expert-roster.md` §4, so edits never collide.
3. **Agents hand work to each other through the orchestrator.** Experts do not
   have the `Agent` tool and never call one another. Each expert ends its work
   with a `## Handoff` block (to, why, inputs, done when). The orchestrator reads
   it and dispatches the next expert, in parallel with other ready work where possible.
4. **Every change ends with `qa-engineer`.** Anything touching auth, secrets,
   `netlify/**`, `netlify/lib/policy.ts`, GitHub or Claude calls also gets a
   `security-expert` review.
5. **The agent-architect maintains the team.** It changes agents and skills only
   after updating `docs/expert-roster.md`, and keeps the two in sync.

## Project rules
- Read `docs/README.md` (the research pack) before designing or building.
  External facts must cite official docs.
- Strict TypeScript; scoring stays a pure function in `src/lib/scoring.ts`.
- Secrets only in Netlify env vars (Functions scope). Never in code, logs or the browser bundle.
- Show "Weather data by Open-Meteo.com" (CC BY 4.0) and "Hazy is not a warning service".
  Open-Meteo's free tier is for non-commercial use only.
- `.claude/**`, `netlify/**`, `netlify.toml`, `public/_headers`, `package.json`/lockfiles and
  `.github/**` are **human-only commits**: the Agent Console's path policy refuses them.
- `npm test` runs in the Netlify build, so a failing commit never publishes (important because of D-002).
- When the user asks for git pushes to `main`, commit with a clear imperative message.

## Knowledge folders
Every agent has `knowledge/<agent>/` with `docs/` (notes from official documentation, each with its source link) and
`examples/` (small, tested worked examples). Each agent's **Before you answer** section requires reading all of it first and
preferring it over memory. Run every example with `./knowledge/run-examples.sh` (Node ≥ 22.18). The agent-architect maintains
`knowledge/**`; other agents propose additions via a Handoff.

## Map
- `docs/`: research pack, decisions, roster
- `knowledge/`: per-agent reference notes and tested examples
- `.claude/agents/`: the 12 subagents
- `.claude/skills/`: the 40 project skills
