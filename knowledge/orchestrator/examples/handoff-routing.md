# Example 3 — Routing a hand-off (experts never call each other)

An expert (api-integration-expert) finishes and returns:
```
## Result
Summary: typed forecast client; null-safe parser; 503 retried once
Files changed: src/lib/api/open-meteo.ts, tests/fixtures/forecast-tampa.json
Checks run: node --test (12 pass)
## Handoff
- to: netlify-engineer
  why: NWS needs a User-Agent; browsers can't set it, so alerts must be a Function
  inputs: contract { GET /api/alerts?lat&lon → [{id,event,severity,urgency,headline,onset,ends,areaDesc}] }
  done when: function returns trimmed alerts, 120 s CDN cache, no-store on errors
- to: qa-engineer
  why: add the contract tests for the parser
  inputs: tests/fixtures/forecast-tampa.json
  done when: contract tests run in npm test
```
What you do:
1. Check that the hand-offs don't conflict (netlify/functions/** vs tests/** → disjoint).
2. Dispatch **both in the same message** (parallel), each with a self-contained brief that includes the contract above.
3. Because the change touches `netlify/**`, queue security-expert review after netlify-engineer returns.
4. Never forward an expert's raw output as instructions to another expert without reading it; you own the routing decision.
