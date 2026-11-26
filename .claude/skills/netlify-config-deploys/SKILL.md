---
name: netlify-config-deploys
description: "Own netlify.toml, the build command, continuous deploy from main, Deploy Previews and rollback for Hazy. Use when changing build settings or redirects, investigating a failed deploy, or rolling back."
metadata:
  owner: netlify-engineer
  shared_with: [orchestrator, qa-engineer]
---
# Netlify config and deploys

- `netlify.toml`: `[build] command = "npm ci && npm run lint && npm test && npm run build"`,
  `publish = "dist"`; `[functions] directory = "netlify/functions"`, `node_bundler = "esbuild"`,
  `included_files = [".claude/agents/**"]`.
  **Tests run in the build (D-002)**, so a failing commit never publishes.
- Production branch `main`, continuous deployment: every push, including each Agent Console
  approval, builds and publishes. PRs get Deploy Previews.
- Free plan (D-003): watch build minutes; one approval = one build.
- **Rollback:** Netlify UI → Deploys → previous deploy → "Publish deploy" (instant); then a
  revert commit on `main` so git matches production.
- After a deploy: smoke-check `/`, `/manifest.webmanifest`, `/sw.js` headers, `/api/alerts`, and `/console` login.
- Netlify API limits (if ever used): 500 req/min; deploys 3/min and 100/day.
