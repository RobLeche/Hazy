---
name: unit-contract-testing
description: "Write Hazy unit, property and contract tests with Vitest and recorded API fixtures, especially for scoring, parsing and the path policy. Use when adding or changing logic in src/lib or netlify/lib."
metadata:
  owner: qa-engineer
  shared_with: [meteorology-risk-analyst, api-integration-expert, agent-console-engineer]
---
# Unit and contract testing

- Vitest; tests next to the area in `tests/unit/**`; `npm test` runs in the Netlify build (D-002).
- **Scoring golden cases**: dry day; Florida summer afternoon storms (CAPE 3,000, LI −6, code 95
  15–18h, 70%) → likely or very likely, afternoon; 2 in/h after 60 mm the day before → flood high; high CAPE
  plus strong CIN with no 95 → at most possible; hail codes → `hail: true`; null CAPE → still scored, with a reason.
- **Property tests** (fast-check): scores within 0–100; more rain never lowers the flood score; dates match the input.
- **Contract tests**: parse recorded Open-Meteo, Marine, Flood, Geocoding and NWS responses from
  `tests/fixtures/`; handle the multi-location list shape and nulls.
- **Policy table test**: `src/ok.ts` allowed; `../netlify.toml`, `src/../netlify/x.ts`, `/etc/passwd`,
  `src\\..\\.github\\x`, `.claude/agents/x.md`, `package.json`, `public/_headers` refused.
- Timezones: Pensacola (Central) and Miami (Eastern) day boundaries.
- Coverage target: 90% or more on `src/lib/scoring.ts` and `netlify/lib/policy.ts`.
