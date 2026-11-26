# Expert roster — the Hazy agent team

> Decision in force: Hazy is a **PWA on Netlify**: a static front end, plus
> Netlify Functions for the Claude and GitHub calls, and **no other servers**.
> Each agent below becomes one file, `.claude/agents/<id>.md`. The Agent Console
> lists them by name, model and personality (see [04](04-agent-console-and-security.md)).

## 1. The roster

12 agents: the 11 you require, plus one addition that the app really needs.

| # | Agent id (file name) | Persona | Model | Job (one line) |
|---|---|---|---|---|
| 1 | `orchestrator` | Calm project lead; plans, delegates, never codes alone | opus | Runs the team: turns goals into tasks, routes each one to the right expert, sequences hand-offs, tracks done/blocked, and decides when work is ready to ship. |
| 2 | `agent-architect` (meta agent) | Reflective coach; evidence-driven edits to prompts | opus | Builds and improves the agents themselves: writes and revises `.claude/agents/*.md`, tunes prompts, models and tools, and fixes gaps found in reviews. |
| 3 | `software-architect` | Pragmatic minimalist; writes short ADRs | opus | Owns the overall design (module boundaries, data contracts, repo layout, ADRs) and keeps it static-first and within Netlify's limits. |
| 4 | `api-integration-expert` | Meticulous about schemas, units and nulls | sonnet | Integrates the Open-Meteo forecast, marine, flood and geocoding APIs and the NWS alerts API: requests, parsing, caching, quotas and attribution. |
| 5 | `pwa-mobile-expert` | Phone-in-hand tester; obsessed with offline | sonnet | Builds the installable mobile front end: manifest, icons, service worker, offline and update flow, install prompts on iOS and Android, and performance. |
| 6 | `security-expert` | Skeptical red-teamer; assumes breach | opus | Threat-models and reviews everything: password gate, sessions, CSRF/CSP, secrets, the scoped GitHub token, the path allow-list and prompt-injection defences. |
| 7 | `agent-console-engineer` | Careful builder; "nothing commits without a click" | sonnet | Builds the Agent Console: agent list, streaming chat via the Claude API, tool loop, proposals, diff review, and approval commits to GitHub, all from Netlify Functions. |
| 8 | `ui-designer-apple-liquid-glass` | **Sable**: refined visual designer; translucency, depth, restraint | sonnet | Designs the Apple-style "Liquid Glass" visual language: colour, materials, type, icons, risk badges and motion, in light and dark, with legible contrast. |
| 9 | `ux-designer-apple-hig` | **Wren**: empathetic interaction designer; plain words, clear flows | sonnet | Designs flows and interactions to Apple's Human Interface Guidelines: place search, the daily outlook, alerts, install hints, console review, copy and accessibility. |
| 10 | `qa-engineer` | Relentless edge-case hunter | sonnet | Owns test strategy and gates: unit, contract, function, end-to-end (mobile and offline), security and accessibility tests, and release sign-off. |
| 11 | `netlify-engineer` | Ops-minded; reads the limits page first | sonnet | Owns the platform: `netlify.toml`, build, Functions config (sync, streaming, background), Blobs, environment variables, headers, rate limits, CDN caching, deploys and rollback. |
| 12 | `meteorology-risk-analyst` *(added)* | Florida weather nerd; cites NWS, hedges honestly | sonnet | Defines and calibrates the thunderstorm and flood scores, their wording and the NWS-override rules, so the app's core claim is scientifically defensible. |

**Why the one addition:** the app's whole value is a judgement ("storms
likely", "flood risk high"). None of the required roles owns the meteorology:
the thresholds, the calibration against past events, and wording that never
overstates an unofficial score. Without this role, the score is guesswork.

### Considered and not added

| Role | Why not needed |
|---|---|
| Front-end engineer | The PWA/mobile expert implements the front end; Sable and Wren supply the design |
| Accessibility specialist | Shared: Wren designs for it, Sable checks contrast, QA tests it (automated and screen reader) |
| DevOps / SRE | No servers; the Netlify engineer covers build, deploy, rollback and monitoring |
| Backend / database engineer | No database; Netlify Blobs is owned by the Netlify and console engineers |
| Native iOS/Android (Capacitor) | Out of scope by decision (PWA only); revisit if the app needs store presence |
| Product manager | You lead; the orchestrator handles planning and tracking |
| Technical writer | Docs are shared by the orchestrator, architect and meta agent |

## 2. Skills and who shares them

**Lead** = owns the skill and has final say. **Shared with** = also needs it to do
their job (to build, review or test it).

### 2.1 Leadership and agent management

| Skill | What it covers | Lead | Shared with |
|---|---|---|---|
| Planning and task routing | Break goals into tasks, assign experts, sequence hand-offs, track status | orchestrator | agent-architect, software-architect |
| Agent authoring | `.claude/agents` frontmatter (name, description, model, tools, personality), system prompts, model and effort choice | agent-architect | orchestrator, agent-console-engineer |
| Agent evaluation | Review agent outputs, spot failure patterns, revise prompts, regression-check agents | agent-architect | orchestrator, qa-engineer |
| Architecture decisions (ADRs) | Boundaries, contracts, trade-offs, written decisions | software-architect | netlify-engineer, security-expert, orchestrator |
| Technical writing | Clear docs, READMEs, change notes, user-facing help text | orchestrator | software-architect, agent-architect, ux-designer-apple-hig |

### 2.2 Weather data and scoring

| Skill | What it covers | Lead | Shared with |
|---|---|---|---|
| Open-Meteo APIs | Forecast, marine, flood and geocoding parameters; units; multi-location; nulls; terms (non-commercial, CC BY 4.0) | api-integration-expert | meteorology-risk-analyst, qa-engineer |
| NWS alerts API | `alerts/active?point=`, the required User-Agent, alert types and severity | api-integration-expert | meteorology-risk-analyst, netlify-engineer |
| Meteorology and risk scoring | CAPE, lifted index, CIN, WMO codes, rain rates, antecedent wetness, NWS/WPC/SPC scales, calibration | meteorology-risk-analyst | api-integration-expert, qa-engineer |
| Risk communication | Plain, non-alarmist wording; "not an official warning"; uncertainty | meteorology-risk-analyst | ux-designer-apple-hig, ui-designer-apple-liquid-glass |
| API quota and cost management | Open-Meteo limits, rounding coordinates for caching, Claude spend caps | netlify-engineer | api-integration-expert, agent-console-engineer |

### 2.3 Front end, PWA and design

| Skill | What it covers | Lead | Shared with |
|---|---|---|---|
| TypeScript (strict) | Shared types, pure functions, no `any` | software-architect | api-integration-expert, pwa-mobile-expert, agent-console-engineer, netlify-engineer, qa-engineer, meteorology-risk-analyst |
| Responsive mobile front end | Semantic HTML, modern CSS, Vite build, safe-area insets, small bundles | pwa-mobile-expert | ui-designer-apple-liquid-glass, ux-designer-apple-hig |
| PWA installability | Manifest, icons (192/512/maskable/apple-touch), `beforeinstallprompt`, the iOS Add to Home Screen hint | pwa-mobile-expert | ux-designer-apple-hig, qa-engineer |
| Service worker and offline | Precache, network-first forecast, never-stale alerts, versioned caches, update toast | pwa-mobile-expert | netlify-engineer, api-integration-expert, qa-engineer |
| Web performance | Core Web Vitals, lazy-loaded console route, image and font budgets | pwa-mobile-expert | netlify-engineer, qa-engineer |
| Apple Liquid Glass visual design | Translucent materials, depth, SF-style type scale, colour tokens, motion, dark mode | ui-designer-apple-liquid-glass | ux-designer-apple-hig, pwa-mobile-expert |
| Apple HIG interaction design | Navigation, tab bars and sheets, gestures, empty, loading and error states, flows | ux-designer-apple-hig | ui-designer-apple-liquid-glass, pwa-mobile-expert |
| Design tokens and components | One source of colour, spacing and type tokens; a reusable badge, card and sheet | ui-designer-apple-liquid-glass | pwa-mobile-expert, ux-designer-apple-hig |
| Accessibility (WCAG 2.2 AA) | Contrast over glass, colour-not-alone, focus, 24px+ targets, live regions, reflow at 320px, reduced motion | ux-designer-apple-hig | ui-designer-apple-liquid-glass, pwa-mobile-expert, qa-engineer, agent-console-engineer |

### 2.4 Netlify platform

| Skill | What it covers | Lead | Shared with |
|---|---|---|---|
| Netlify Functions | Modern handler, `config.path`, 60 s sync and streaming limits, 15-minute background functions with retries | netlify-engineer | agent-console-engineer, api-integration-expert, software-architect |
| Netlify config and deploys | `netlify.toml`, build, continuous deploy from `main`, Deploy Previews, rollback | netlify-engineer | orchestrator, qa-engineer |
| Environment variables and secrets | Functions-only scope, secret values, no public prefixes, rotation | netlify-engineer | security-expert, agent-console-engineer |
| Netlify Blobs | Stores, strong vs eventual consistency, conditional writes (`onlyIfMatch`/`onlyIfNew`) | agent-console-engineer | netlify-engineer, software-architect |
| Headers, CSP and CDN caching | `_headers`/`netlify.toml` headers, `Netlify-CDN-Cache-Control`, `sw.js` no-cache | netlify-engineer | security-expert, pwa-mobile-expert |
| Rate limiting | `config.rateLimit` (2 rules on Free), app-level quotas in Blobs | netlify-engineer | security-expert, agent-console-engineer |

### 2.5 Agent Console (Claude + GitHub)

| Skill | What it covers | Lead | Shared with |
|---|---|---|---|
| Claude Messages API | `@anthropic-ai/sdk`, streaming SSE, tool use (`strict`, `auto` choice), models and effort, stop reasons and refusals, prompt caching | agent-console-engineer | agent-architect, security-expert |
| Agentic tool loops within time limits | Iteration caps, 45 s deadline, pause and continue, background jobs with idempotent retries | agent-console-engineer | netlify-engineer, software-architect |
| GitHub REST and Git Data API | Contents read, trees, commits, fast-forward ref update, compare for stale-base checks | agent-console-engineer | security-expert, netlify-engineer |
| Fine-grained PAT management | One repo, Contents read/write only, no Workflows, expiry and rotation | security-expert | agent-console-engineer, netlify-engineer |
| Diff review UX | Readable per-file diffs, Approve, Reject and Revise, deploy target shown | ux-designer-apple-hig | agent-console-engineer, ui-designer-apple-liquid-glass |

### 2.6 Security

| Skill | What it covers | Lead | Shared with |
|---|---|---|---|
| Threat modelling | Assets, attackers, abuse cases, mitigations table | security-expert | software-architect, agent-console-engineer |
| Web app security | Password hashing (scrypt), signed HttpOnly cookies, CSRF, CSP, XSS-safe rendering, no secrets in the bundle | security-expert | agent-console-engineer, netlify-engineer, qa-engineer |
| Agent safety and prompt injection | Path allow-list and deny-list, human approval, server-side transcripts, tool results treated as data | security-expert | agent-console-engineer, agent-architect |
| Supply-chain hygiene | Lockfiles, minimal dependencies, deny-listing `package.json` changes by agents | security-expert | netlify-engineer, software-architect |

### 2.7 Quality

| Skill | What it covers | Lead | Shared with |
|---|---|---|---|
| Unit and contract testing | Vitest, recorded API fixtures, property tests for scoring | qa-engineer | meteorology-risk-analyst, api-integration-expert, agent-console-engineer |
| Function testing with mocks | Call handlers with `Request`, MSW mocks for Claude and GitHub | qa-engineer | agent-console-engineer, netlify-engineer |
| End-to-end on mobile | Playwright phone emulation, offline mode, geolocation, SW update | qa-engineer | pwa-mobile-expert |
| Accessibility testing | axe-core, VoiceOver and TalkBack passes, 200% text | qa-engineer | ux-designer-apple-hig, ui-designer-apple-liquid-glass |
| Security testing | Auth bypass, CSRF, path-traversal table, double-approve, bundle secret scan | qa-engineer | security-expert |
| Release sign-off | Gates passing, Deploy Preview checked on real devices | qa-engineer | orchestrator, netlify-engineer |

## 3. Skill matrix

● = lead, ○ = shared.

Columns: **Orc** orchestrator · **Meta** agent-architect · **Arch** software-architect ·
**API** api-integration-expert · **PWA** pwa-mobile-expert · **Sec** security-expert ·
**Con** agent-console-engineer · **Sable** ui-designer-apple-liquid-glass ·
**Wren** ux-designer-apple-hig · **QA** qa-engineer · **Net** netlify-engineer ·
**Met** meteorology-risk-analyst

| Skill | Orc | Meta | Arch | API | PWA | Sec | Con | Sable | Wren | QA | Net | Met |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Planning and routing | ● | ○ | ○ | | | | | | | | | |
| Agent authoring | ○ | ● | | | | | ○ | | | | | |
| Agent evaluation | ○ | ● | | | | | | | | ○ | | |
| Architecture / ADRs | ○ | | ● | | | ○ | | | | | ○ | |
| Technical writing | ● | ○ | ○ | | | | | | ○ | | | |
| Open-Meteo APIs | | | | ● | | | | | | ○ | | ○ |
| NWS alerts | | | | ● | | | | | | | ○ | ○ |
| Risk scoring | | | | ○ | | | | | | ○ | | ● |
| Risk communication | | | | | | | | ○ | ○ | | | ● |
| Quota and cost | | | | ○ | | | ○ | | | | ● | |
| TypeScript | | | ● | ○ | ○ | | ○ | | | ○ | ○ | ○ |
| Mobile front end | | | | | ● | | | ○ | ○ | | | |
| PWA installability | | | | | ● | | | | ○ | ○ | | |
| Service worker / offline | | | | ○ | ● | | | | | ○ | ○ | |
| Web performance | | | | | ● | | | | | ○ | ○ | |
| Liquid Glass visual design | | | | | ○ | | | ● | ○ | | | |
| HIG interaction design | | | | | ○ | | | ○ | ● | | | |
| Design tokens / components | | | | | ○ | | | ● | ○ | | | |
| Accessibility | | | | | ○ | | ○ | ○ | ● | ○ | | |
| Netlify Functions | | | ○ | ○ | | | ○ | | | | ● | |
| Netlify config / deploys | ○ | | | | | | | | | ○ | ● | |
| Env vars / secrets | | | | | | ○ | ○ | | | | ● | |
| Netlify Blobs | | | ○ | | | | ● | | | | ○ | |
| Headers / CSP / CDN | | | | | ○ | ○ | | | | | ● | |
| Rate limiting | | | | | | ○ | ○ | | | | ● | |
| Claude Messages API | | ○ | | | | ○ | ● | | | | | |
| Tool loops / time limits | | | ○ | | | | ● | | | | ○ | |
| GitHub Git Data API | | | | | | ○ | ● | | | | ○ | |
| Fine-grained PAT | | | | | | ● | ○ | | | | ○ | |
| Diff review UX | | | | | | | ○ | ○ | ● | | | |
| Threat modelling | | | ○ | | | ● | ○ | | | | | |
| Web app security | | | | | | ● | ○ | | | ○ | ○ | |
| Agent safety / injection | | ○ | | | | ● | ○ | | | | | |
| Supply chain | | | ○ | | | ● | | | | | ○ | |
| Unit / contract tests | | | | ○ | | | ○ | | | ● | | ○ |
| Function tests / mocks | | | | | | | ○ | | | ● | ○ | |
| Mobile e2e | | | | | ○ | | | | | ● | | |
| Accessibility testing | | | | | | | | ○ | ○ | ● | | |
| Security testing | | | | | | ○ | | | | ● | | |
| Release sign-off | ○ | | | | | | | | | ● | ○ | |

## 4. How the team works together

1. **Orchestrator** receives a goal and asks the **software-architect** for the
   design impact, then splits the work into tasks.
2. **Wren** (flows, copy) → **Sable** (visuals, tokens) → **pwa-mobile-expert**
   (build) for anything users see. The **meteorology-risk-analyst** signs off on
   any wording about risk.
3. **api-integration-expert** and **meteorology-risk-analyst** pair on data and
   scoring; the **netlify-engineer** places any server-side piece in a Function.
4. **agent-console-engineer** builds console features; the **security-expert**
   reviews every change that touches auth, secrets, the allow-list or GitHub.
5. **qa-engineer** gates every change (tests and a Deploy Preview check).
   Agent-proposed changes still need the human **Approve** click.
6. **agent-architect** reviews how the agents performed after each milestone and
   updates their `.claude/agents/*.md` files. Those edits are human-only commits,
   because `.claude/**` is on the console's deny-list.

**Path ownership** (feeds the console's allow-list policy):

| Paths | Owner |
|---|---|
| `src/lib/scoring.ts`, `src/lib/thresholds.ts` | meteorology-risk-analyst |
| `src/lib/api/**` | api-integration-expert |
| `src/**` (UI), `public/manifest.webmanifest`, `src/sw.ts` | pwa-mobile-expert |
| `src/styles/tokens.css`, `public/icons/**` | Sable |
| `src/console/**` | agent-console-engineer |
| `tests/**` | qa-engineer |
| `docs/**` | orchestrator, software-architect |
| `netlify/**`, `netlify.toml`, `public/_headers` | netlify-engineer and agent-console-engineer; security-expert review required; **human commits only** |
| `.claude/agents/**` | agent-architect; **human commits only** |

## 5. Implementation in this repo

Each agent is built as `.claude/agents/<agent-id>.md` (a Claude Code project subagent), and each skill as `.claude/skills/<skill-id>/SKILL.md`. Every agent preloads its skills through the `skills:` frontmatter field, exactly as in the matrix above. Only `orchestrator` has the `Agent` tool; experts return a `Handoff` block. See [../CLAUDE.md](../CLAUDE.md).

| Skill id | Lead | Shared with |
|---|---|---|
| `accessibility-testing` | qa-engineer | ux-designer-apple-hig, ui-designer-apple-liquid-glass |
| `accessibility-wcag` | ux-designer-apple-hig | ui-designer-apple-liquid-glass, pwa-mobile-expert, qa-engineer, agent-console-engineer |
| `agent-authoring` | agent-architect | orchestrator, agent-console-engineer |
| `agent-evaluation` | agent-architect | orchestrator, qa-engineer |
| `agent-safety-prompt-injection` | security-expert | agent-console-engineer, agent-architect |
| `agent-tool-loops` | agent-console-engineer | software-architect, netlify-engineer |
| `architecture-decisions` | software-architect | orchestrator, security-expert, netlify-engineer |
| `claude-messages-api` | agent-console-engineer | agent-architect, security-expert |
| `design-tokens-components` | ui-designer-apple-liquid-glass | pwa-mobile-expert, ux-designer-apple-hig |
| `diff-review-ux` | ux-designer-apple-hig | agent-console-engineer, ui-designer-apple-liquid-glass |
| `fine-grained-pat` | security-expert | agent-console-engineer, netlify-engineer |
| `function-testing-mocks` | qa-engineer | agent-console-engineer, netlify-engineer |
| `github-git-data-api` | agent-console-engineer | security-expert, netlify-engineer |
| `headers-csp-cdn` | netlify-engineer | security-expert, pwa-mobile-expert |
| `hig-interaction-design` | ux-designer-apple-hig | ui-designer-apple-liquid-glass, pwa-mobile-expert |
| `liquid-glass-visual-design` | ui-designer-apple-liquid-glass | ux-designer-apple-hig, pwa-mobile-expert |
| `mobile-e2e-testing` | qa-engineer | pwa-mobile-expert |
| `mobile-front-end` | pwa-mobile-expert | ui-designer-apple-liquid-glass, ux-designer-apple-hig |
| `netlify-blobs` | agent-console-engineer | netlify-engineer, software-architect |
| `netlify-config-deploys` | netlify-engineer | orchestrator, qa-engineer |
| `netlify-env-secrets` | netlify-engineer | security-expert, agent-console-engineer |
| `netlify-functions` | netlify-engineer | agent-console-engineer, api-integration-expert, software-architect |
| `nws-alerts` | api-integration-expert | meteorology-risk-analyst, netlify-engineer |
| `open-meteo-apis` | api-integration-expert | meteorology-risk-analyst, qa-engineer |
| `planning-and-routing` | orchestrator | agent-architect, software-architect |
| `pwa-installability` | pwa-mobile-expert | ux-designer-apple-hig, qa-engineer |
| `quota-and-cost` | netlify-engineer | api-integration-expert, agent-console-engineer |
| `rate-limiting` | netlify-engineer | security-expert, agent-console-engineer |
| `release-signoff` | qa-engineer | orchestrator, netlify-engineer |
| `risk-communication` | meteorology-risk-analyst | ux-designer-apple-hig, ui-designer-apple-liquid-glass |
| `security-testing` | qa-engineer | security-expert |
| `service-worker-offline` | pwa-mobile-expert | api-integration-expert, netlify-engineer, qa-engineer |
| `supply-chain-hygiene` | security-expert | netlify-engineer, software-architect |
| `technical-writing` | orchestrator | agent-architect, software-architect, ux-designer-apple-hig |
| `threat-modeling` | security-expert | software-architect, agent-console-engineer |
| `typescript-strict` | software-architect | api-integration-expert, pwa-mobile-expert, agent-console-engineer, netlify-engineer, qa-engineer, meteorology-risk-analyst |
| `unit-contract-testing` | qa-engineer | meteorology-risk-analyst, api-integration-expert, agent-console-engineer |
| `weather-risk-scoring` | meteorology-risk-analyst | api-integration-expert, qa-engineer |
| `web-app-security` | security-expert | agent-console-engineer, netlify-engineer, qa-engineer |
| `web-performance` | pwa-mobile-expert | netlify-engineer, qa-engineer |
