---
name: netlify-blobs
description: "Store Hazy's server state in Netlify Blobs (jobs, proposals, quotas, audit, transcripts) with the right consistency and conditional writes. Use when reading or writing @netlify/blobs from a function."
metadata:
  owner: agent-console-engineer
  shared_with: [netlify-engineer, software-architect]
---
# Netlify Blobs

```ts
import { getStore } from "@netlify/blobs";
const proposals = getStore("proposals");              // site-wide: survives deploys
await proposals.setJSON(id, data, { onlyIfNew: true });
const entry = await proposals.getWithMetadata(id, { type: "json", consistency: "strong" });
await proposals.setJSON(id, next, { onlyIfMatch: entry.etag });   // compare-and-swap
```

- Use **`getStore` (site-wide)**, not `getDeployStore`: an approval triggers a new deploy, and the state must survive it.
- Default reads are **eventually consistent** (up to 60 s to propagate). Use `consistency: "strong"`
  for job polling, proposal state and counters.
- State transitions use `onlyIfMatch` (ETag) so a double click or a retry cannot apply twice.
- Limits: key 600 bytes or less; metadata 2 KB or less. Keep values small; the transcript is JSON lines.
- Stores: `jobs`, `proposals`, `transcripts`, `quotas`, `audit`, `logins`.
- Local dev uses a sandboxed store; production data is not readable locally.
- Retention: a scheduled cleanup deletes transcripts older than 30 days.
