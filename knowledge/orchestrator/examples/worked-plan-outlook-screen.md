# Example 2 — A good orchestrator plan: "Ship the Outlook screen with alerts"

## Goal and acceptance
- Outlook tab shows today's thunder and flood levels (text + icon), the headline, the update time, and an NWS banner when active.
- Works offline with the last forecast; alerts never stale.
- Constraints: D-001 (static + Functions), D-003 (Free plan).

## Waves (computed with plan-waves.ts; disjoint paths per wave)
| Wave | Agent | Task | Owns |
|---|---|---|---|
| 1 | ux-designer-apple-hig | Outlook flow + all states + copy | docs/design/ux/** |
| 1 | meteorology-risk-analyst | Scoring + thresholds + golden cases | src/lib/scoring.ts, thresholds.ts |
| 1 | api-integration-expert | Typed Open-Meteo client + fixtures | src/lib/api/**, tests/fixtures/** |
| 2 | netlify-engineer | /api/alerts function (User-Agent, CDN cache) | netlify/functions/alerts.mts |
| 2 | ui-designer-apple-liquid-glass | Tokens + RiskBadge spec | src/styles/tokens.css |
| 3 | pwa-mobile-expert | Outlook screen + SW rules | src/outlook/** |
| 3 | security-expert | Review alerts function | docs/threat-model.md |
| 4 | qa-engineer | Unit + e2e + axe; sign-off | tests/** |

## One brief, as sent (wave 1)
```
Task: Implement daily thunderstorm + flood scoring as a pure function.
Context: docs/01-use-case-and-risk-scoring.md §3; knowledge/meteorology-risk-analyst/; decisions D-001.
You own: src/lib/scoring.ts, src/lib/thresholds.ts. Do not edit outside them.
Done when: golden cases (dry day, summer storms, strong cap, 2 in/h burst) pass; nulls handled; reasons in plain words.
Return: summary, files changed, tests run, Handoff block.
```

## Report to the lead (after wave 4)
```
Goal: Outlook screen with alerts
Done: scoring, API client, alerts function, tokens, screen, tests (34 passing), security review APPROVE
Blocked: none
Decisions needed from lead: none
Next: Places tab search (Wren + api-integration-expert in parallel)
```
