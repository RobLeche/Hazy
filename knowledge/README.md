# Agent knowledge

One folder per agent in `.claude/agents/`. Each agent's **Before you answer** section requires it to read its whole folder
first and prefer it over memory.

```
knowledge/<agent>/
  README.md     index of what's here + verification result
  docs/         reference notes taken from the official documentation; every note links its source
  examples/     2–3 small, correct worked examples; code examples have *.test.ts proving they work
```

| Agent | Main sources | Runnable examples |
|---|---|---|
| [orchestrator](orchestrator/README.md) | Claude Code subagents docs, Anthropic "Building effective agents", Claude prompting guide | wave planner |
| [agent-architect](agent-architect/README.md) | Claude Code subagents + skills docs, Claude prompting guide | validator for the real `.claude/` team |
| [software-architect](software-architect/README.md) | MADR template, Netlify/Open-Meteo/NWS/Claude/GitHub limits | shared contract guards; sample ADR |
| [api-integration-expert](api-integration-expert/README.md) | open-meteo.com forecast, marine, terms; NWS API | client, parser, cache tested on **real captured responses** |
| [meteorology-risk-analyst](meteorology-risk-analyst/README.md) | NWS Melbourne, WPC/SPC, NWS training pages, Open-Meteo variable definitions, NWS TADD | scoring on the real Tampa fixture + golden cases |
| [pwa-mobile-expert](pwa-mobile-expert/README.md) | MDN (manifest, installable, service workers, caching), web.dev (installation, prompt, detection, caching), WebKit | manifest check; **service worker tested offline in Chromium**; install prompt |
| [ui-designer-apple-liquid-glass](ui-designer-apple-liquid-glass/README.md) (Sable) | Apple HIG: Materials (Liquid Glass), Color, Dark Mode, Typography, Accessibility | token contrast checks; glass tab bar with Reduce Transparency in Chromium |
| [ux-designer-apple-hig](ux-designer-apple-hig/README.md) (Wren) | Apple HIG: Tab bars, Sheets, Searching, Loading, Feedback, Alerts, Writing, Onboarding, Accessibility | copy-deck lint; flow and approve-sheet specs |
| [agent-console-engineer](agent-console-engineer/README.md) | Claude API (messages, models, streaming, tool use, errors), GitHub REST (contents, trees, commits, refs) | SSE parser on the docs' transcript; **real `@anthropic-ai/sdk` relay**; tool loop; atomic commit |
| [netlify-engineer](netlify-engineer/README.md) | Netlify docs: functions, limits, env vars, Blobs, headers, rate limiting, caching | `/api/alerts` function; `_headers` check; Blobs CAS |
| [security-expert](security-expert/README.md) | OWASP cheat sheets (passwords, sessions, CSRF, XSS, headers, LLM prompt injection), GitHub fine-grained PAT docs | scrypt; signed cookie + CSRF; path policy with attack cases |
| [qa-engineer](qa-engineer/README.md) | Playwright docs (emulation, mocking, network/SW, accessibility, locators) | mobile e2e with geolocation and mocks; axe WCAG scan |

## Run everything
```bash
./knowledge/run-examples.sh
```
Two suites use optional packages (`@anthropic-ai/sdk`, `@axe-core/playwright`). Install them in any folder and pass
`EXTRA_NODE_PATH=/that/folder/node_modules`; without them those tests are reported as skipped, not passed.
Last full run 2026-11-26 (Node v22.23.5, Playwright 1.63.0, SDK 1.14.0, axe 4.14.1): **80 passed, 0 failed, 0 skipped.**

## Facts discovered while verifying (now recorded in the notes)
- `@anthropic-ai/sdk` 1.14.0 authenticates with `authorization: Bearer <key>` and sends `anthropic-version: 2026-10-21`.
- Node's `crypto.scrypt` default `maxmem` (32 MiB) rejects OWASP's N=2^17 setting; pass `maxmem`.
- `@axe-core/playwright` refuses pages created with `browser.newPage()`; use `browser.newContext()`.
- Open-Meteo returned HTTP 503 `{"error":true,"reason":"The service is overloaded"}` once during capture; clients must retry and fall back to cache.
- A Tampa day with 93% rain probability had a 5 mm/h peak: probability is not intensity.
- web.dev's 2022 installation page says only Safari can add PWAs on iOS; MDN (current) lists Safari, Chrome, Edge, Firefox and Orion on iOS 16.4+.
