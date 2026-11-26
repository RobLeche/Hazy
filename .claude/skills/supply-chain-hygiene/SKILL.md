---
name: supply-chain-hygiene
description: "Keep Hazy's dependencies minimal and safe: lockfile discipline, vetting new packages, npm ci in builds, and blocking agents from changing package manifests. Use when adding or upgrading a dependency or changing build scripts."
metadata:
  owner: security-expert
  shared_with: [netlify-engineer, software-architect]
---
# Supply-chain hygiene

- Prefer the platform (fetch, Web Crypto, `node:crypto`) over packages. Every new dependency needs a
  reason, its size, its maintainer health and its licence noted in the PR.
- Runtime deps (target): `@anthropic-ai/sdk`, `@netlify/functions`, `@netlify/blobs`, optionally `zod`.
- Commit the lockfile; builds use `npm ci`; no `postinstall` scripts from new deps without review.
- Run `npm audit --omit=dev` in CI; fix high and critical before release.
- Agents cannot change `package.json`, lockfiles, `scripts/**` or build config (deny-list). Dependency
  changes are human commits.
- Pin GitHub Actions (if any) to commit SHAs.
