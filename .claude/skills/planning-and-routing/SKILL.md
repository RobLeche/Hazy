---
name: planning-and-routing
description: "Break a Hazy goal into tasks, pick the right expert agent for each, run independent tasks in parallel and route hand-offs. Use when planning work, delegating to subagents, or deciding what runs next."
metadata:
  owner: orchestrator
  shared_with: [agent-architect, software-architect]
---
# Planning and routing

## Team map (who to call)
| Work | Agent |
|---|---|
| Design impact, boundaries, ADRs | software-architect |
| Open-Meteo / NWS requests and parsing | api-integration-expert |
| Thresholds, scores, risk wording | meteorology-risk-analyst |
| Manifest, service worker, front-end code | pwa-mobile-expert |
| Flows, copy, accessibility design | ux-designer-apple-hig (Wren) |
| Visual style, tokens, icons | ui-designer-apple-liquid-glass (Sable) |
| netlify.toml, Functions config, env, Blobs, deploys | netlify-engineer |
| Agent Console (Claude + GitHub) | agent-console-engineer |
| Threat model, security review | security-expert |
| Tests, release sign-off | qa-engineer |
| Creating or improving agents and skills | agent-architect |

## Procedure
1. Restate the goal and acceptance criteria in 2–4 bullets. Check `docs/decisions.md` for constraints.
2. Ask software-architect for design impact if the goal touches more than one area.
3. Split the work into tasks with: owner agent, inputs, output, acceptance, owned paths.
4. Build a dependency graph. **Every task without an unmet dependency runs in parallel**:
   issue all of those subagent calls in one message.
5. Give parallel tasks **disjoint file paths** (use the path ownership table in
   `docs/expert-roster.md` §4), so edits cannot collide.
6. Collect results. Each expert ends with a `Handoff` block or `Handoff: none`.
   Route each hand-off as a new task (again in parallel where possible).
7. Always finish with qa-engineer. Add security-expert review if anything touched
   auth, secrets, `netlify/**`, the allow-list, GitHub or Claude calls.
8. Report: done, blocked (and on whom or what), next steps.

## Task brief template (send to each expert)
```
Task: <one sentence>
Context: <links to docs/files, prior results>
You own: <paths>; do not edit outside them.
Done when: <acceptance criteria>
Return: summary, files changed, tests run, Handoff block.
```

## Rules
- Experts never call each other; all hand-offs come back through you.
- Do not do expert work yourself, except trivial glue (docs index, task lists).
- Do not run two tasks in parallel that edit the same file.
