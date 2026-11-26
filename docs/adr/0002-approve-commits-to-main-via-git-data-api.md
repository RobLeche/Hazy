---
status: accepted
date: 2026-11-26
decision-makers: lead, software-architect
consulted: agent-console-engineer, security-expert, netlify-engineer
---
# 0002 Approve makes one atomic, fast-forward-only commit to `main` via the Git Data API

## Context and Problem Statement
D-002 says an Approve in the Agent Console commits straight to `main`, and Netlify's continuous deployment publishes it to
production. A proposal (`Proposal` in `src/lib/types.ts`) can touch up to 20 files, including deletes. How should
`POST /api/proposals/:id/approve` write those files to GitHub so that production never sees half a change?

## Decision Drivers
* D-002: approve goes to `main`, so every commit is a production deploy.
* D-004: fine-grained PAT, this repo only, **Contents: read/write** only (no Pull requests, no Workflows).
* D-003: each commit costs a Netlify build (Free-plan build minutes), so one proposal should mean one build.
* 60 s sync function limit, not configurable (https://docs.netlify.com/build/functions/configuration/).
* The Contents API writes one file per commit, and its calls must be serial
  (https://docs.github.com/en/rest/repos/contents); the Git Data API can build one commit from many files
  (https://docs.github.com/en/rest/git/trees).
* Safety: no double commit on a double click or retry; no overwrite of newer code.

## Considered Options
* Contents API: one `PUT` or `DELETE` per file.
* Git Data API: one tree, one commit, one fast-forward ref update.
* Commit to a branch and open a pull request, then merge.

## Decision Outcome
Chosen option: "Git Data API", because it is the only option that is atomic (all files or none), produces one build, and
works within the D-004 token permissions.

Steps (docs/04 §7.3; implementation owned by agent-console-engineer, policy by security-expert):
1. `requireSession`, CSRF token and `Origin` check.
2. CAS claim `pending → approving` in Blobs (ADR 0003). The loser of a race gets `409`.
3. Re-run `validateProposal` (path allow-list and deny-list, size caps, secret scan) in `netlify/lib/policy.ts`.
4. `GET /repos/{o}/{r}/git/ref/heads/main`. If head differs from `baseSha`, `GET /compare/{baseSha}...{head}` and refuse with `409`
   if any proposed path changed.
5. `GET /git/commits/{head}` → `tree.sha`; `POST /git/trees` with `base_tree` and one entry per file (`mode: "100644"`,
   `type: "blob"`, inline UTF-8 `content`; a delete is `sha: null`); `POST /git/commits` with
   `message: "agent(<agentId>): <summary>\n\nProposal: <id>\nApproved-by: console"` and `parents: [head]`
   (https://docs.github.com/en/rest/git/commits).
6. `PATCH /git/refs/heads/main` with `force: false` (fast-forward only; https://docs.github.com/en/rest/git/refs). On `422`,
   re-check the head once (step 4) and retry once.
7. Save `status: "committed"`, `commitSha`, `decidedAt`; append to the `audit` store. On any failure before step 6 succeeds,
   set `status: "pending"` with a safe `lastError`.

### Consequences
* Good, because production sees all of a proposal or none of it, and one approval costs one Netlify build.
* Good, because `force: false` plus the stale-base check means an approval can never overwrite a newer commit.
* Good, because about five GitHub calls fit comfortably in the 60 s limit; use a per-call timeout and a 45 s overall deadline.
* Good, because the `Proposal: <id>` trailer makes a lost status write recoverable (ADR 0003, stale-claim rule).
* Bad, because inline tree `content` is text only, so proposals are limited to UTF-8 text files (already a policy rule, docs/04 §7.1).
* Bad, because a bad change reaches production without a preview. Mitigations: `npm test` runs in the Netlify build so a failing
  commit never publishes (CLAUDE.md), the human reviews the diff, and rollback is Netlify "Publish deploy" on the previous deploy,
  then a revert commit (D-002).
* Follow-up: commits are attributed to the token owner (D-004); the trailer records the agent and proposal.

### Confirmation
* `knowledge/agent-console-engineer/examples/github-commit.test.ts` (one tree, one commit, `force: false`, delete as `sha: null`)
  is ported to the console's tests and runs in `npm test`.
* qa-engineer and security-expert tests: double-approve returns one commit and one `409`; stale base returns `409`;
  deny-listed path refused at approve time even if the stored proposal was tampered with (`isProposal` plus `validateProposal`).

## Pros and Cons of the Options
### Contents API, one call per file
* Good, because it is the simplest API.
* Bad, because a 20-file proposal is 20 commits and up to 20 builds, applied serially; a failure halfway leaves `main` half-changed
  and possibly deployed.
### Git Data API
* Good, because it is atomic and fast-forward-only.
* Bad, because it needs four or five calls and careful error handling.
### Branch plus pull request
* Good, because it would give a Deploy Preview before production.
* Bad, because D-002 rejected it, and the D-004 token has no Pull requests permission.
