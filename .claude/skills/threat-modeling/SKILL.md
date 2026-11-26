---
name: threat-modeling
description: "Threat-model Hazy features (assets, attackers, abuse cases, mitigations), especially the Agent Console, secrets and the GitHub commit path. Use when designing a new endpoint, tool, data flow or permission, or before a release."
metadata:
  owner: security-expert
  shared_with: [software-architect, agent-console-engineer]
---
# Threat modelling

## Assets
`ANTHROPIC_API_KEY` (spend), `GITHUB_TOKEN` (write access to the repo, and so to production
via D-002), the console password and sessions, the production site's integrity, users' saved places.

## Method (per feature)
1. Draw the data flow: browser → function → external API → Blobs/GitHub.
2. STRIDE each hop: Spoofing, Tampering, Repudiation, Information disclosure, Denial of service, Elevation.
3. Add LLM-specific threats: prompt injection via repo files, user text or tool results; tool misuse;
   excessive agency; output-driven XSS.
4. For each threat: likelihood, impact, mitigation, test (to qa-engineer).
5. Record it in `docs/threat-model.md`; the baseline table is in `docs/04-agent-console-and-security.md` §3.

## Non-negotiables
- No secret ever reaches the browser.
- No commit without an authenticated human Approve.
- The allow-list is enforced server-side, twice (propose and approve).
- The console is unusable without a valid session.
