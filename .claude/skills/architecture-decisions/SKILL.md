---
name: architecture-decisions
description: "Make and record Hazy architecture decisions (module boundaries, data contracts, repo layout) as short ADRs within the static-PWA-plus-Netlify-Functions constraint. Use when a change crosses modules, adds a dependency or touches a platform limit."
metadata:
  owner: software-architect
  shared_with: [orchestrator, security-expert, netlify-engineer]
---
# Architecture decisions

## Constraints (from docs/decisions.md)
- D-001: static front end + Netlify Functions only. No other servers or databases.
- D-002: Approve commits straight to `main`.
- D-003: Netlify Free plan (2 code-based rate-limit rules; 60 s sync and streaming; 15 min background).
- D-004: fine-grained PAT for GitHub.

## Reference architecture
`docs/03-architecture-netlify.md` (layout, endpoints, Blobs stores, env vars) and
`docs/04-agent-console-and-security.md` (console). Change those docs when the design changes.

## ADR format (`docs/adr/NNNN-title.md`)
```
# NNNN Title
Status: proposed | accepted | superseded by NNNN
Context: forces and constraints (link to decisions)
Decision: what we do
Consequences: what gets easier or harder, limits touched, follow-ups
```

## Review checklist
- Does it fit in a 60 s function, or does it need a background job?
- Where does state live (browser, SW cache, Blobs)? What is the consistency need?
- Does it add a dependency? Justify it (bundle size, supply chain).
- Is the scoring still a pure function in `src/lib/scoring.ts`?
- Does it change a security boundary? Then security-expert must review.
