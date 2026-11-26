---
name: netlify-env-secrets
description: "Manage Hazy's Netlify environment variables and secrets: Functions-only scope, secret values, no public build prefixes, rotation. Use when adding, renaming or rotating ANTHROPIC_API_KEY, GITHUB_TOKEN, SESSION_SECRET, CONSOLE_PASSWORD_HASH or any env var."
metadata:
  owner: netlify-engineer
  shared_with: [security-expert, agent-console-engineer]
---
# Environment variables and secrets

| Var | Scope | Secret |
|---|---|---|
| `ANTHROPIC_API_KEY` | Functions | yes |
| `GITHUB_TOKEN` (fine-grained PAT, D-004) | Functions | yes |
| `SESSION_SECRET` (32+ random bytes) | Functions | yes |
| `CONSOLE_PASSWORD_HASH` (scrypt) | Functions | yes |
| `GITHUB_REPO=RobLeche/Hazy`, `GITHUB_BRANCH=main` | Functions | no |
| `NWS_USER_AGENT`, `AGENT_DAILY_TOKEN_BUDGET` | Functions | no |

## Rules
- Set them in the Netlify UI (Project configuration → Environment variables), scope **Functions**
  only for secrets, and mark them secret.
- **Never** give a secret a public prefix (`VITE_`, `PUBLIC_`, `NEXT_PUBLIC_`); build tools inline those into the bundle.
- Never commit `.env`; `.env.example` lists names only.
- Rotation: create new → update the env var → redeploy → revoke old. PAT expiry is recorded in `docs/decisions.md`.
- CI check: `grep -rE "sk-ant-|github_pat_|ghp_" dist/` must be empty.
