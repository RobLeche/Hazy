# 03 — Architecture: static Netlify site + Netlify Functions

> Part of the Hazy research pack. See [README](README.md) for the index.

## 1. Overview

```
                    ┌──────────────────────── Netlify ─────────────────────────┐
 Phone (PWA)        │  CDN: static build (HTML/CSS/JS, manifest, sw.js, icons) │
 ─────────────      │                                                          │
 UI + service  ───► │  Functions (TypeScript, /api/*)                          │
 worker cache       │   ├─ forecast      → Open-Meteo forecast + marine + flood│──► open-meteo.com
                    │   ├─ alerts        → api.weather.gov (User-Agent)        │──► api.weather.gov
                    │   ├─ geocode       → Open-Meteo geocoding                │
                    │   ├─ auth/login    → session cookie   ┐                  │
                    │   ├─ agents        → list agents      │ Agent Console    │
                    │   ├─ agent-chat    → Claude (stream)  │ (see doc 04)     │──► api.anthropic.com
                    │   ├─ agent-job-background (≤15 min)   │                  │
                    │   ├─ jobs/:id      → poll job state   │                  │
                    │   └─ proposals/:id/approve → GitHub   ┘                  │──► api.github.com
                    │  Netlify Blobs: jobs, proposals, sessions, quotas, audit │
                    └──────────────────────────────────────────────────────────┘
                            ▲                                     │ push to main
                            └──── continuous deploy from GitHub ◄─┘
```

The weather side is a **static frontend plus thin, cache-friendly functions**.
The Agent Console is a **separate, password-gated area** that shares the same
deploy but has its own functions and secrets.

## 2. Repository layout (proposal)

```
/                       netlify.toml, package.json, tsconfig.json
/src/                   frontend (vanilla TS or a light framework such as Preact/Svelte, built by Vite)
  /src/lib/scoring.ts   pure risk scoring (doc 01 §3), shared by tests
  /src/console/         Agent Console UI (lazy-loaded route /console)
/public/                manifest.webmanifest, icons, _headers, robots.txt
/netlify/functions/     server code (one file per endpoint)
/netlify/lib/           shared server helpers (auth, github, anthropic, blobs, validation)
/.claude/agents/        agent definitions (Markdown + YAML frontmatter)
/scripts/build-agents.ts  build step: .claude/agents/*.md → agents manifest
/tests/                 unit (Vitest), e2e (Playwright)
/docs/                  this research pack
```

## 3. Netlify facts that shape the design (verified)

| Fact | Value | Source |
|---|---|---|
| Synchronous function execution limit | **60 s, not configurable** | Functions configuration |
| Default memory | 1,024 MB (configurable via `config.memory`) | Functions configuration |
| Streaming responses | **60 s execution limit, 20 MB response** | Functions API reference |
| Background functions | **up to 15 min**; client gets **202** immediately; retried after 1 min, then 2 min, on error | Background Functions |
| Background enablement | `config.background` (preferred) or the `-background` filename suffix | Background Functions |
| Handler style | `export default async (req: Request, context: Context) => Response` with `export const config = { path: "/api/..." }` | Functions overview/API |
| Env vars in functions | `process.env.NAME` (or `Netlify.env.get`) | Env vars & functions |
| Env var scopes | Builds, **Functions**, Runtime, Post-processing; per deploy context | Env vars overview |
| Rate limiting in code | `config.rateLimit = { windowLimit, windowSize (s, max 180), aggregateBy: ["ip","domain"], action?: "rate_limit"\|"rewrite" }` | Rate limiting |
| Rate-limit rules per project | **Free/Personal: 2; Pro: 5**; not settable in `netlify.toml` for functions | Rate limiting |
| Blobs | `getStore(name)` site-wide (survives deploys) vs `getDeployStore`; eventual consistency (≤60 s propagation) unless `consistency: "strong"`; key ≤600 B; metadata ≤2 KB; object ≤5 GB; conditional writes `onlyIfMatch`/`onlyIfNew` | Netlify Blobs |
| CDN caching of function responses | `Netlify-CDN-Cache-Control: public, durable, max-age=…, stale-while-revalidate=…` | Caching overview |
| Netlify API rate limit | 500 req/min; deploys via API 3/min, 100/day | Netlify API |
| Build hooks | Unique URLs that trigger builds; deploys from build hooks are "trusted" | Create deploys |

Consequences:

- **Any single request must finish in 60 s** (streamed or not). Claude calls in
  `agent-chat` must use streaming and a bounded `max_tokens`, and stop the tool
  loop early when time runs short (see doc 04 §6).
- **Long agent work goes to a background function** that writes progress to
  Blobs; the UI polls.
- **Only 2 code-based rate-limit rules on the Free plan.** Spend them on
  `auth/login` and `agent-chat`. Enforce other quotas in application code with
  Blobs counters.

## 4. Weather data path

### Option A (recommended): browser → Open-Meteo directly, NWS via a function

- Open-Meteo needs no key and the free limits are counted per client, so calling
  from the browser spreads the 10,000/day limit across users' own IPs instead of
  concentrating everyone on Netlify's egress IPs.
- The service worker caches responses (network-first, see doc 02).
- **NWS alerts must go through a function** (`/api/alerts?lat=&lon=`) because the
  NWS requires a `User-Agent` and browsers do not let JS set it. The function
  rounds coordinates to 2 decimals, sets `User-Agent: Hazy (https://<site>, <contact>)`,
  and returns a trimmed list with
  `Netlify-CDN-Cache-Control: public, durable, max-age=120, stale-while-revalidate=60`.

### Option B: everything through `/api/forecast`

Use this if you want one merged, pre-scored payload, or need to hide upstream
details. Round lat/lon to 2 decimals (~1 km) and cache at the CDN
(`max-age=900`), so 1,000 users in Tampa cost one upstream call per 15 minutes.
Watch the shared 600/min and 10,000/day quota, and fall back to Option A on 429.

Either way, **scoring runs in shared TypeScript** (`src/lib/scoring.ts`), usable
in the browser or a function, and covered by unit tests.

## 5. Agent Console path (summary; details in doc 04)

| Endpoint | Type | Purpose |
|---|---|---|
| `POST /api/auth/login` | sync, rate-limited | password → signed session cookie |
| `POST /api/auth/logout` | sync | clear cookie |
| `GET /api/agents` | sync, auth | name, model, personality of each agent |
| `POST /api/agent-chat` | **streaming**, auth, rate-limited | chat turn with one agent (≤60 s) |
| `POST /api/agent-jobs` | sync, auth | create a long job → enqueue the background fn |
| `agent-job` (`config.background: true`) | **background**, ≤15 min | runs the multi-step agent loop, writes to Blobs |
| `GET /api/agent-jobs/:id` | sync, auth | poll status and events |
| `GET /api/proposals/:id` | sync, auth | proposal + diff |
| `POST /api/proposals/:id/approve` | sync, auth, CSRF-checked | commit to GitHub → Netlify redeploys |
| `POST /api/proposals/:id/reject` | sync, auth | mark rejected |

Blobs stores (site-wide `getStore`, so data survives deploys, which matters
because an approval *causes* a deploy):

| Store | Key | Value |
|---|---|---|
| `sessions` | `sid` | `{ createdAt, expiresAt, ipHash }` (optional; stateless signed cookies also work) |
| `jobs` | `jobId` | `{ status, agentId, events[], result, startedAt, attempt }` |
| `proposals` | `proposalId` | `{ agentId, baseSha, files[], summary, status, createdAt, decidedAt, commitSha }` |
| `quotas` | `yyyy-mm-dd` / `login:{ipHash}` | counters (use `onlyIfMatch` ETags for safe increments) |
| `audit` | `{ts}-{id}` | append-only log of logins, approvals, commits |

## 6. Configuration

`netlify.toml` (sketch):

```toml
[build]
  command = "npm run build"          # vite build + scripts/build-agents.ts
  publish = "dist"

[functions]
  directory = "netlify/functions"
  node_bundler = "esbuild"
  included_files = [".claude/agents/**"]   # so functions can read agent prompts

[[headers]]
  for = "/sw.js"
  [headers.values]
    Cache-Control = "no-cache"

[[headers]]
  for = "/*"
  [headers.values]
    Content-Security-Policy = "default-src 'self'; connect-src 'self' https://api.open-meteo.com https://marine-api.open-meteo.com https://flood-api.open-meteo.com https://geocoding-api.open-meteo.com; img-src 'self' data:; script-src 'self'; style-src 'self'; frame-ancestors 'none'; base-uri 'self'"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Permissions-Policy = "geolocation=(self), camera=(), microphone=()"
```

Environment variables (Netlify UI, **scope: Functions only**, marked secret;
never prefix with `VITE_`, `PUBLIC_` or similar, which build tools inline into
the browser bundle):

| Name | Purpose |
|---|---|
| `ANTHROPIC_API_KEY` | Claude API |
| `GITHUB_TOKEN` | fine-grained PAT, this repo only, Contents read/write |
| `GITHUB_REPO` | `RobLeche/Hazy` |
| `GITHUB_BRANCH` | `main` |
| `CONSOLE_PASSWORD_HASH` | scrypt/argon2 hash of the console password |
| `SESSION_SECRET` | 32+ random bytes for HMAC-signing cookies |
| `NWS_USER_AGENT` | `Hazy (https://<site>.netlify.app, <contact>)` |
| `AGENT_DAILY_TOKEN_BUDGET` | e.g. `2000000` |

## 7. Deploy flow

1. Netlify site linked to the GitHub repo, production branch `main`
   (continuous deployment: each push to `main` builds and publishes).
2. Approving a proposal creates one commit on `main` through the GitHub API, and
   Netlify builds it automatically. **No Netlify token is needed in the app.**
3. Optional safety net: approve into a branch `agent/<proposalId>` and let a
   **branch deploy / Deploy Preview** build it first, then merge. This trades
   a second click for a chance to look before production.
4. Rollback: Netlify's "Publish deploy" on a previous deploy (instant), or a revert commit.

## 8. Build vs no-build

A tiny Vite build (TypeScript, hashing, SW precache list) is recommended. It is
also where `scripts/build-agents.ts` turns `.claude/agents/*.md` into
`dist/agents.json` (public metadata only), while functions read the full
prompts via `included_files`.

## Sources

- Functions overview: https://docs.netlify.com/build/functions/overview/
- Functions API reference (streaming limits, `rateLimit`): https://docs.netlify.com/build/functions/api/
- Functions configuration (60 s, memory): https://docs.netlify.com/build/functions/configuration/
- Background Functions: https://docs.netlify.com/build/functions/background-functions/
- Env vars and functions: https://docs.netlify.com/build/functions/environment-variables/
- Env vars overview (scopes, contexts): https://docs.netlify.com/build/environment-variables/overview/
- Netlify Blobs: https://docs.netlify.com/build/data-and-storage/netlify-blobs/
- Rate limiting: https://docs.netlify.com/manage/security/secure-access-to-sites/rate-limiting/
- Caching overview: https://docs.netlify.com/build/caching/caching-overview/
- Create deploys / build hooks: https://docs.netlify.com/deploy/create-deploys/
- Netlify API rate limits: https://docs.netlify.com/api-and-cli-guides/api-guides/get-started-with-api/
- Open-Meteo terms (rate limits): https://open-meteo.com/en/terms
- NWS API (User-Agent): https://www.weather.gov/documentation/services-web-api
