# Knowledge: software-architect

Read **every file here before answering** and prefer it over memory (see the agent's "Before you answer" section).
Notes in `docs/` are taken from official documentation and link their sources; `examples/` are small, correct, tested worked examples.

## docs/
- [`adr-madr.md`](docs/adr-madr.md): Architecture Decision Records (MADR template). Sources: https://github.com/adr/madr/blob/develop/template/adr-template.md, https://adr.github.io/
- [`platform-constraints.md`](docs/platform-constraints.md): Hard constraints the architecture must respect (with sources). Sources: https://docs.netlify.com/build/functions/configuration/, https://docs.netlify.com/build/functions/api/, https://docs.netlify.com/build/functions/background-functions/, https://docs.netlify.com/manage/routing/headers/

## examples/
- [`adr-0001-nws-alerts-via-function.md`](examples/adr-0001-nws-alerts-via-function.md): Fetch NWS alerts through a Netlify Function, cached at the CDN
- [`contracts.ts`](examples/contracts.ts): Example 2 — Shared contracts (src/lib/types.ts) with runtime guards at the trust boundary. (tested by `contracts.test.ts`)

## Verification
Run: `cd knowledge/software-architect/examples && node --test *.test.ts` (Node ≥ 22.18; TypeScript runs via type stripping), or `./knowledge/run-examples.sh` from the repo root.
Last run 2026-11-26 (Node v22.23.5): **2 passed, 0 failed, 0 skipped.**
