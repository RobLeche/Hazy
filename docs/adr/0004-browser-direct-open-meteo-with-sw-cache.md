---
status: proposed
date: 2026-11-26
decision-makers: lead, software-architect
consulted: api-integration-expert, pwa-mobile-expert, netlify-engineer, meteorology-risk-analyst
---
# 0004 The browser calls Open-Meteo directly, with service-worker caching; only NWS alerts go through a function

## Context and Problem Statement
The main view needs Open-Meteo forecast, marine, flood and geocoding data (docs/01 §2), scored into `DayRisk[]` by the pure
function in `src/lib/scoring.ts`. Open-Meteo needs no API key, its free tier is non-commercial with 600/min, 5,000/hour and
10,000/day limits, and it requires CC BY 4.0 attribution (https://open-meteo.com/en/terms). Should weather data come straight
from the browser, or through a Netlify Function?

## Decision Drivers
* D-001 and D-003: as few function invocations as possible on the Free plan.
* Open-Meteo quotas: calls through a server share one quota for every user (docs/01 §2.6, docs/03 §4).
* Offline: the last known outlook should still show, with its "Updated …" time (docs/02).
* Safety: alerts must never be stale (ADR 0001).
* Simplest thing that works: no proxy code unless it is needed.

## Considered Options
* A: Browser calls Open-Meteo directly; the service worker caches responses. Alerts via `/api/alerts` (ADR 0001).
* B: Everything through `/api/forecast`, cached at the CDN by rounded coordinates (docs/03 §4 option B).
* C: A, with B as an automatic fallback.

## Decision Outcome
Chosen option: "A", because it needs no function for weather, spreads the Open-Meteo limits across users' own IPs instead of
Netlify's egress IPs (docs/03 §4), and keeps scoring a pure shared module that runs in the browser.

Rules:
* Hosts: `api.open-meteo.com`, `marine-api.open-meteo.com`, `flood-api.open-meteo.com`, `geocoding-api.open-meteo.com`. These four,
  and nothing else external, are in the CSP `connect-src` (docs/03 §6; `public/_headers` is netlify-engineer's, human-only).
* Requests round `latitude`/`longitude` to 2 decimals (~1 km), always pass `timezone=auto` and an explicit `forecast_days`
  (the marine default is documented inconsistently, docs/01 §2.2), and keep metric units (scoring thresholds are metric).
  Rounding also raises service-worker cache hits for saved places.
* Service worker (docs/02 caching table): app shell precached and versioned; Open-Meteo forecast, marine and flood
  **network-first with a 4 s timeout, then cache**; geocoding **stale-while-revalidate**; `/api/alerts` **network-only** with a
  "can't check alerts offline" banner; console APIs never cached.
* The client validates parsed data at the edge (`isHourPoint`, `isDayRisk`, `isOutlook`) and never coerces `null` to 0.
* The UI shows "Weather data by Open-Meteo.com" (CC BY 4.0) and "Hazy is not a warning service" (CLAUDE.md).

### Consequences
* Good, because weather costs zero function invocations, and one user's heavy use cannot exhaust everyone's Open-Meteo quota.
* Good, because offline mode works from the service-worker cache without server state.
* Good, because there is no proxy code to secure or test.
* Bad, because every phone downloads the raw responses (larger than a trimmed, pre-scored payload). Keep the variable lists to
  what scoring needs (docs/01 §2.1).
* Bad, because we depend on Open-Meteo sending CORS headers to browsers. **Unverified** in the research pack (docs/README
  "Things not verified"). If it fails, write a new ADR that supersedes this one with option C (`/api/forecast` with
  `Netlify-CDN-Cache-Control: public, durable, max-age=900, stale-while-revalidate=300` per rounded point).
* Neutral, because Open-Meteo's time handling uses a fixed `utc_offset_seconds` and ignores DST changes within the range
  (https://open-meteo.com/en/docs); the parser computes `HourPoint.utcMs` from it, and the UI groups by local `date`.

### Confirmation
* api-integration-expert verifies CORS against the live API once (an `Access-Control-Allow-Origin` header on a forecast response)
  and records the result in its knowledge notes; until then this ADR stays `proposed`.
* Client tests assert request URLs: the four hosts only, rounded coordinates, explicit `forecast_days`
  (`knowledge/api-integration-expert/examples/open-meteo-client.test.ts` pattern).
* pwa-mobile-expert offline test: the outlook renders offline from cache with its "Updated …" time; `/api/alerts` is never served
  from cache.
* netlify-engineer header check: CSP `connect-src` lists exactly `'self'` plus the four Open-Meteo hosts.

## Pros and Cons of the Options
### A: browser-direct
* Good, because it is the simplest option and the cheapest on the Free plan.
* Bad, because it relies on CORS (unverified) and sends raw payloads to the phone.
### B: `/api/forecast` proxy
* Good, because one merged, trimmed, pre-scored payload is cached at the CDN; 1,000 users in one city cost one upstream call per
  15 minutes (docs/03 §4).
* Bad, because every user shares Netlify's egress quota (600/min, 10,000/day), and it adds a function per uncached point.
### C: A with B as fallback
* Good, because it is resilient.
* Bad, because it means two code paths to build and test before we know the second is needed.
