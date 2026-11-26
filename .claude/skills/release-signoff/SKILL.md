---
name: release-signoff
description: "Decide whether a Hazy change is ready for production: gates passed, Deploy Preview checked on real devices, rollback ready. Use at the end of every milestone, before merging human PRs to main, and when reviewing what an approved agent commit shipped."
metadata:
  owner: qa-engineer
  shared_with: [orchestrator, netlify-engineer]
---
# Release sign-off

Checklist (post it in the orchestrator report):
- [ ] `npm ci && npm run lint && npm test && npm run build` green (it also runs in the Netlify build).
- [ ] Playwright mobile suite green; axe has no serious or critical issues.
- [ ] Security tests green if console, auth, policy, headers or functions changed; security-expert approved.
- [ ] Deploy Preview checked on one real iPhone and one real Android: install, offline, outlook, alerts.
- [ ] Lighthouse mobile: performance within budget; accessibility 95 or higher.
- [ ] Attribution "Weather data by Open-Meteo.com" visible; "not an official warning" footer present.
- [ ] Rollback ready: previous production deploy identified in Netlify.
- [ ] Docs updated (`docs/`, decision log if a decision changed).

Agent Console approvals go live immediately (D-002); after each one, smoke-check production and roll back if needed.
