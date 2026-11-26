# Knowledge: netlify-engineer

Read **every file here before answering** and prefer it over memory (see the agent's "Before you answer" section).
Notes in `docs/` are taken from official documentation and link their sources; `examples/` are small, correct, tested worked examples.

## docs/
- [`blobs.md`](docs/blobs.md): Netlify Blobs. Sources: https://docs.netlify.com/build/data-and-storage/netlify-blobs/
- [`environment-variables.md`](docs/environment-variables.md): Environment variables. Sources: https://docs.netlify.com/build/environment-variables/overview/, https://docs.netlify.com/build/functions/environment-variables/
- [`functions-limits-and-routing.md`](docs/functions-limits-and-routing.md): Netlify Functions: handler, routing, limits. Sources: https://docs.netlify.com/build/functions/overview/, https://docs.netlify.com/build/functions/get-started/, https://docs.netlify.com/build/functions/api/, https://docs.netlify.com/build/functions/configuration/
- [`headers-and-caching.md`](docs/headers-and-caching.md): Custom headers and CDN caching. Sources: https://docs.netlify.com/manage/routing/headers/, https://docs.netlify.com/build/caching/caching-overview/
- [`rate-limiting.md`](docs/rate-limiting.md): Rate limiting (Free plan). Sources: https://docs.netlify.com/manage/security/secure-access-to-sites/rate-limiting/, https://docs.netlify.com/build/functions/api/

## examples/
- [`alerts.mts`](examples/alerts.mts): Example 1 — netlify/functions/alerts.mts: NWS proxy with User-Agent, rounded coords, CDN caching, own headers. (tested by `alerts.test.ts`)
- [`blobs-cas.ts`](examples/blobs-cas.ts): Example 3 — Proposal state machine with Netlify Blobs conditional writes (onlyIfNew / onlyIfMatch) + strong reads. (tested by `blobs-cas.test.ts`)
- [`headers-check.ts`](examples/headers-check.ts) (tested by `headers-check.test.ts`)
- [`site/_headers`](examples/site/_headers): Example 2 — publish-dir `_headers` (CSP, HSTS, `sw.js` no-cache, immutable assets), checked by `headers-check.test.ts`

## Verification
Run: `cd knowledge/netlify-engineer/examples && node --test *.test.ts` (Node ≥ 22.18; TypeScript runs via type stripping), or `./knowledge/run-examples.sh` from the repo root.
Last run 2026-11-26 (Node v22.23.5): **9 passed, 0 failed, 0 skipped.**
