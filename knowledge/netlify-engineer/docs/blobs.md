# Netlify Blobs

Source: https://docs.netlify.com/build/data-and-storage/netlify-blobs/ (read 2026-11-26)

## API (quoted signatures)
- `getStore(name, { region, siteID, token })`: "Opens a site-wide store … persisted on new deploys, available on all deploy
  contexts". Use this for Hazy (state must survive the deploy an approval triggers).
- `getDeployStore(name, …)`: "scoped to a specific deploy".
- `await store.set(key, value, { metadata, onlyIfMatch, onlyIfNew })` and `setJSON(key, value, {…})`.
- `await store.get(key, { consistency, type })`, `getWithMetadata`, `delete(key)`, `list({ directories, paginate, prefix })`.
- Conditional write example from the docs: `const { modified } = await emails.set(key, value, { onlyIfMatch: etag })`, and if
  `!modified` then "Cached data is stale. Someone else must've updated the data!"

## Consistency (quoted)
"By default, the Netlify Blobs API uses an eventual consistency model … Updates and deletions are guaranteed to be propagated
to all edge locations within 60 seconds." "You can … opt-in to strong consistency … for an entire store or for individual read
operations. Netlify CLI always uses strong consistency."

## Limits (quoted)
Object ≤ 5 GB; metadata ≤ 2 KB; keys ≤ 600 bytes. "Local development with Netlify Dev uses a sandboxed local store … You
cannot read production data during local development."
