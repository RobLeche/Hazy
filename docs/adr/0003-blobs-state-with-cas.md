---
status: proposed
date: 2026-11-26
decision-makers: lead, software-architect
consulted: netlify-engineer, agent-console-engineer, security-expert
---
# 0003 Keep job and proposal state in site-wide Netlify Blobs, with strong reads and compare-and-swap

## Context and Problem Statement
The Agent Console has state that outlives one request: background jobs (`Job`) and proposals (`Proposal`, both in
`src/lib/types.ts`), plus transcripts, quotas and the audit log. Functions are stateless, Netlify retries background functions
after 1 and then 2 minutes on error (https://docs.netlify.com/build/functions/background-functions/), and a user can double-click
Approve. Where does this state live, and how do we stop a transition from applying twice?

## Decision Drivers
* D-001: no databases or other servers. State lives in Netlify Blobs.
* An approval triggers a deploy, so state must survive deploys.
* Blobs reads are eventually consistent (up to 60 s) unless `consistency: "strong"` is set
  (https://docs.netlify.com/build/data-and-storage/netlify-blobs/).
* Blobs supports conditional writes: `onlyIfNew` and `onlyIfMatch` (ETag) (same source). Key 600 bytes or less; metadata 2 KB or less.
* Background handlers must be idempotent (retries).

## Considered Options
* Site-wide `getStore` with strong reads and ETag compare-and-swap (CAS).
* `getDeployStore` (per-deploy stores).
* Site-wide `getStore` with default (eventual) reads and blind writes.
* An external database.

## Decision Outcome
Chosen option: "Site-wide `getStore` with strong reads and ETag CAS", because it is the only Blobs option that survives deploys
and makes every state transition happen at most once, without adding a server (D-001).

Rules:
* Stores (site-wide): `proposals/{proposalId}`, `jobs/{jobId}`, `transcripts/{conversationId}`, `quotas/…`, `audit/{ts}-{id}`,
  `logins/…`. IDs are random and short (well under the 600-byte key limit).
* Create with `onlyIfNew`. Every read that decides a transition, and every poll, uses `consistency: "strong"`.
* Every transition is read (strong) → check the current status → write with `onlyIfMatch: etag`. A lost race returns `409`
  (proposals) or exits quietly (jobs). netlify-engineer's `netlify/lib/blobs.ts` (`createOnce`, `readStrong`, `updateCas`)
  implements this; callers pass the guards from `src/lib/types.ts` (`isProposal`, `isJob`).

Proposal state machine (`ProposalStatus`):
```
pending ──CAS──► approving ──commit ok──► committed
   │                 └──commit failed──► pending  (lastError set)
   └──CAS──► rejected
```
* Stale-claim rule: a function cannot run longer than 60 s, so an `approving` proposal whose `decidedAt` is more than 90 s old is
  dead and may be re-claimed by CAS. Before committing again, the approver looks for a commit on `main` whose message has the
  trailer `Proposal: <id>` (ADR 0002). If found, it records `committed` with that SHA instead of committing twice. The stale-base
  check is a second guard.

Job state machine (`JobStatus`):
```
queued ──CAS (attempt+1)──► running ──► done | paused | failed
                              └─ error, attempt < 3 ──► retrying ──CAS (attempt+1)──► running
paused ──Continue──► queued
```
* The background function exits at once unless the status is `queued` or `retrying`. It claims the job by CAS to `running` and
  increments `attempt`.
* On a thrown error: if `attempt < 3`, set `retrying` and rethrow so Netlify retries; on the third attempt, set `failed`. Netlify
  stops after two retries, so `retrying` must never be the last state.
* Work to a ~13 min deadline (15 min limit), then save the transcript and set `paused`.
* A `running` job whose `updatedAt` is older than 15 minutes is dead; `GET /api/agent-jobs/:id` reports it as `failed`
  (lazy repair, CAS-guarded).
* Events: append compact `JobEvent`s every few seconds; keep the last 200 and cap `text` at 500 characters, so polls stay small.
  Full transcripts live in `transcripts/`, not in the job record.
* Jobs only create proposals; they never commit (docs/04 §6).

### Consequences
* Good, because a double click, a race or a Netlify retry cannot apply a transition twice.
* Good, because state survives the deploy that an approval causes.
* Good, because no new service or dependency is added beyond `@netlify/blobs`.
* Bad, because strong reads are slower than eventual reads; acceptable at console traffic (one owner, polls every 2–3 s).
* Bad, because Blobs has no transactions across keys. A proposal and its audit entry are written separately; the audit is
  append-only and best-effort, and the proposal record is the source of truth.
* Bad, because the stale-claim and lazy-repair rules are extra code paths that need tests.
* Follow-up: a scheduled cleanup deletes transcripts older than 30 days (docs/04 §9).

### Confirmation
* `knowledge/netlify-engineer/examples/blobs-cas.test.ts` (exactly one concurrent caller wins `pending → approving`) is ported to
  `tests/` and runs in `npm test`.
* qa-engineer adds tests: background handler exits on `running`, `done` and `failed`; sets `retrying` on attempts 1 and 2 and
  `failed` on attempt 3; stale `approving` re-claim finds the `Proposal: <id>` trailer and does not commit twice.
* Every Blobs read in `netlify/**` goes through a guard from `src/lib/types.ts` (security-expert review).

## Pros and Cons of the Options
### `getDeployStore`
* Bad, because the state disappears on the deploy that an approval triggers.
### Eventual reads and blind writes
* Bad, because a poll can read state up to 60 s old, and two approvers can both see `pending` and both commit.
### External database
* Good, because it has real transactions.
* Bad, because it breaks D-001 and adds a secret, a dependency and a vendor.
