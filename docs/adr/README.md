# Architecture Decision Records

Hazy's design decisions, in the MADR format (https://github.com/adr/madr). Lead decisions (D-001 to D-005) live in
[../decisions.md](../decisions.md); ADRs record how we implement them. Owner: software-architect.

| ADR | Title | Status |
|---|---|---|
| [0001](0001-nws-alerts-via-netlify-function.md) | Fetch NWS alerts through a Netlify Function, cached at the CDN | accepted |
| [0002](0002-approve-commits-to-main-via-git-data-api.md) | Approve makes one atomic, fast-forward-only commit to `main` via the Git Data API | accepted |
| [0003](0003-blobs-state-with-cas.md) | Keep job and proposal state in site-wide Netlify Blobs, with strong reads and CAS | proposed |
| [0004](0004-browser-direct-open-meteo-with-sw-cache.md) | The browser calls Open-Meteo directly, with service-worker caching | proposed |

## Rules
* File name: `NNNN-short-title.md`. Never renumber; supersede instead (`status: superseded by NNNN`).
* Every ADR has a **Confirmation** section naming the test or check that proves it.
* Shared types for every contract named here live in `src/lib/types.ts`.
