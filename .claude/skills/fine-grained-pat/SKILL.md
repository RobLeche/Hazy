---
name: fine-grained-pat
description: "Create, scope, store and rotate the fine-grained GitHub personal access token Hazy's Agent Console uses (one repo, Contents read/write only, no Workflows). Use when setting up or rotating GITHUB_TOKEN, or reviewing what the token can do."
metadata:
  owner: security-expert
  shared_with: [agent-console-engineer, netlify-engineer]
---
# Fine-grained PAT (D-004)

Create at GitHub → Settings → Developer settings → Fine-grained tokens:
- Resource owner: the repo owner. **Repository access: Only select repositories → RobLeche/Hazy.**
- Repository permissions: **Contents: Read and write**. Metadata: read-only (automatic). **Nothing else**:
  no Workflows, Actions, Administration, Secrets, Pull requests or Issues.
- Expiration: 90 days (allowed 1–366 days or none; never choose none).
- If an organisation owns the repo and requires approval, the token is `pending` (read-only) until approved.

Store: Netlify env var `GITHUB_TOKEN`, Functions scope, secret. Record the expiry in `docs/decisions.md`.

Rotate (before expiry, or immediately on suspicion): create the new token → update the env var →
trigger a redeploy → verify a read call → revoke the old token → update the expiry record.

What it cannot do (by design): edit workflows, change settings, read other private repos, or
create PRs. Tokens also always have read access to public repositories.
