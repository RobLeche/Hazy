# Hazy — research pack

**Hazy** is a mobile-first, installable web app (PWA) on Netlify. You pick an
area in Florida (or any US state) and it shows whether **thunderstorms** or
**flooding** are likely today and over the next few days. It uses the free
Open-Meteo APIs (forecast, marine, flood, geocoding; no API key), with official
NWS alerts layered on top. It also contains a password-gated **Agent Console**:
you chat with the project's Claude agents, and they can propose code changes
that are committed to GitHub, and so redeployed, only after you approve them.

This folder is background reading for the team of expert agents that will build
the app. Each file covers one topic and ends with its sources.

| # | File | Topic |
|---|---|---|
| 1 | [01-use-case-and-risk-scoring.md](01-use-case-and-risk-scoring.md) | Use case, Open-Meteo/NWS API fields, thunderstorm and flood scoring with sources |
| 2 | [02-pwa-installability.md](02-pwa-installability.md) | Install on iPhone and Android, manifest, service worker, when to use Capacitor |
| 3 | [03-architecture-netlify.md](03-architecture-netlify.md) | Static site + Netlify Functions, limits, Blobs, caching, env vars, deploy flow |
| 4 | [04-agent-console-and-security.md](04-agent-console-and-security.md) | Agent Console design, password gate, scoped GitHub token, path allow-list, approval → commit → redeploy, long jobs |
| 5 | [05-testing-and-accessibility.md](05-testing-and-accessibility.md) | Unit, contract, function, e2e and security tests; WCAG 2.2 AA checklist |
| — | [decisions.md](decisions.md) | Decision log: static+Functions only, approve → `main`, Netlify Free plan, fine-grained PAT, team structure |
| — | [expert-roster.md](expert-roster.md) | The 12-agent team, each role's job, and which agents share each skill (built in `.claude/agents` and `.claude/skills`; see `/CLAUDE.md`) |

## Key decisions at a glance

- **Data**: Open-Meteo Forecast (`weather_code` 95/96/99, `cape`,
  `lifted_index`, `precipitation`, `precipitation_probability`, `soil_moisture_*`,
  `uv_index`, `wind_gusts_10m`), Marine (waves, sea temperature; coastal only),
  Flood (GloFAS river discharge; a secondary signal), Geocoding. The NWS
  `alerts/active?point=` feed overrides the app's own score.
- **Scoring**: a pure TypeScript function, explainable, scored per day and per
  time block. Labels reuse NWS vocabulary but are clearly heuristic. Thresholds
  live in one config file and are to be calibrated.
- **Free-tier rules**: Open-Meteo is free for **non-commercial use only**
  (10,000 calls/day, 600/min) and needs **CC BY 4.0 attribution**. Call it from
  the browser, or cache at the CDN by rounded coordinates.
- **Platform**: PWA first. Use Capacitor only for store presence, background
  location, widgets, or iOS push without Add to Home Screen.
- **Netlify limits**: sync and streaming functions get **60 s**; background
  functions get **15 min** (with automatic retries, so make them idempotent).
  Blobs is eventually consistent unless read with `consistency: "strong"`. The
  Free plan allows only **2** code-based rate-limit rules.
- **Agent Console security**: secrets only in Functions-scoped env vars; a
  signed HttpOnly session behind a password; a fine-grained PAT limited to
  **this repository** with **Contents: read/write** only (no Workflows); a path
  allow-list and deny-list checked at both proposal and approval; one atomic
  commit via the Git Data API, fast-forward only; rate limits plus a daily token
  budget; never commit without a human click.

## Resolved

- Approve target, Netlify plan and token type: see [decisions.md](decisions.md).
- The custom `personality` key in `.claude/agents/*.md` is safe: Claude Code ignores unrecognised frontmatter fields.

## Things not verified (to check while building)

- The Open-Meteo Marine `forecast_days` default (the docs say both 5 and 7), so
  always pass it explicitly.
- Rainfall-rate and daily-total flood thresholds are heuristics; calibrate them
  against NOAA Atlas 14 and past NWS warnings (doc 01 §3.4).
- That Open-Meteo sends CORS headers, so the browser can call it directly (widely used this way, but not re-read here; doc 03 §4).
- Netlify secret-value handling details and the env var size limit were not on
  the pages read.
- WebKit storage-eviction rules for Home Screen apps, and Lighthouse's removal
  of the PWA audit category, were recalled rather than re-read.

## Method

Researched on 2026-11-26 from the official documentation: Open-Meteo (forecast,
marine, flood, geocoding, terms), MDN (installable PWAs, offline, service workers),
Netlify (functions, streaming, background functions, Blobs, env vars, rate
limiting, caching, deploys), the Claude API (tool use, streaming, models), the
GitHub REST API (contents, git trees, fine-grained PATs), NWS/WPC/SPC
references, WebKit, Capacitor and W3C WCAG 2.2. The site where the API was first
found (https://mcp-api.netlify.app/) is a general directory of free APIs and MCP
servers; it does not document Open-Meteo itself.
