---
name: github-git-data-api
description: "Read repository files and make one atomic, fast-forward-only commit to main from a Netlify Function using the GitHub REST and Git Data APIs, with stale-base checks. Use when implementing read_file, list_files or the Approve commit."
metadata:
  owner: agent-console-engineer
  shared_with: [security-expert, netlify-engineer]
---
# GitHub REST and Git Data API

Headers: `Authorization: Bearer ${GITHUB_TOKEN}`, `Accept: application/vnd.github+json`,
`X-GitHub-Api-Version: <current>`, `User-Agent: hazy-console`.

## Read
- Tree: `GET /repos/{o}/{r}/git/trees/{sha}?recursive=1` (hide deny-listed paths).
- File: `GET /repos/{o}/{r}/contents/{path}?ref={sha}` (base64; files of 1 MB or less get full support;
  1–100 MB need the raw media type).

## Approve → commit (D-002: straight to `main`)
1. `GET /git/ref/heads/main` → `head`.
2. If `head !== proposal.baseSha`: `GET /compare/{baseSha}...{head}`; **409** if any proposed path changed.
3. `GET /git/commits/{head}` → `tree.sha`.
4. `POST /git/trees { base_tree, tree: [{path, mode:"100644", type:"blob", content}, {path, mode:"100644", type:"blob", sha:null} /* delete */] }`.
5. `POST /git/commits { message, tree, parents:[head] }`, with the message
   `agent(<agentId>): <summary>\n\nProposal: <id>\nApproved-via: Hazy Agent Console`.
6. `PATCH /git/refs/heads/main { sha, force:false }`. On 422 (not a fast-forward) re-check from step 1 once.

## Rules
- One commit per proposal (atomic). Avoid the Contents PUT/DELETE API for multi-file changes
  (one file per commit; parallel calls conflict).
- Never use `force: true`.
- Re-validate paths against the allow-list immediately before step 4.
- Contents writes need fine-grained "Contents: write"; `.github/workflows/*` would also need
  "Workflows", which we deliberately do not grant.
