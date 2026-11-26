---
status: accepted
date: 2026-11-26
decision-makers: lead, software-architect
consulted: api-integration-expert, netlify-engineer, security-expert
---
# 0001 Fetch NWS alerts through a Netlify Function, cached at the CDN

## Context and Problem Statement
Hazy must show official NWS flood and thunderstorm alerts above its own heuristic score (docs/01 §2.5, §3.4 override rule).
The NWS API asks every client to send a `User-Agent` that identifies the app and a contact, and browsers do not let JavaScript
set `User-Agent` (https://www.weather.gov/documentation/services-web-api). How should the PWA get alerts?

## Decision Drivers
* NWS requirement: identifying `User-Agent` with contact details.
* D-001: static front end plus Netlify Functions only. D-003: Free plan, so function invocations are a budget.
* Safety: alerts must never be shown stale as if current.
* The 60 s sync function limit (https://docs.netlify.com/build/functions/configuration/).

## Considered Options
* Browser calls api.weather.gov directly.
* Netlify Function `GET /api/alerts?lat=&lon=` with a short CDN cache.
* Netlify redirect proxy with a custom header in `netlify.toml`.

## Decision Outcome
Chosen option: "Netlify Function `/api/alerts` with a CDN cache", because it is the only option that reliably sets the
`User-Agent`, keeps the contact string server-side, and lets us trim, filter and cache responses per rounded point.

Contract:
* Request: `GET /api/alerts?lat=<n>&lon=<n>`. The function rounds to 2 decimals (~1 km), which also bounds the cache key space.
* Upstream: `https://api.weather.gov/alerts/active?point=<lat>,<lon>` with `User-Agent` from the `NWS_USER_AGENT` env var
  (Functions scope) and `Accept: application/geo+json`, behind an 8 s timeout.
* Response `200`: a JSON array of `NwsAlert` (`src/lib/types.ts`: `id, event, severity, urgency, headline, onset, ends, areaDesc`),
  filtered to flood, thunderstorm, tornado, hurricane and tropical storm events. Validate with `isAlertsResponse`.
* Headers on success: `Netlify-CDN-Cache-Control: public, durable, max-age=120, stale-while-revalidate=60` and
  `Cache-Control: public, max-age=0, must-revalidate`. Errors: `{ error, code }` with `Cache-Control: no-store`
  (`502` upstream error, `504` timeout, `400` bad coordinates, `500` missing env var).
* The function sets its own headers, because `_headers` does not apply to function responses
  (https://docs.netlify.com/manage/routing/headers/).
* Non-US places: the client does not call `/api/alerts` and sets `Outlook.alertsStatus = "not_us"`. A failed call sets
  `"unavailable"`, and the UI says alerts could not be checked (never "no alerts").

### Consequences
* Good, because the `User-Agent` requirement is met and the contact string never reaches the browser.
* Good, because a 120 s CDN cache per ~1 km point bounds NWS traffic and function invocations.
* Bad, because alerts can be up to about 3 minutes old (120 s plus 60 s stale-while-revalidate). Acceptable against the NWS update
  cadence, and the UI shows "Updated …".
* Bad, because each uncached point costs one function invocation (Free-plan usage; netlify-engineer reviews monthly).
* Neutral, because `severity` and `urgency` are kept as raw NWS strings. Their enum values were not re-verified for this ADR
  (unverified); api-integration-expert should confirm them from the NWS API schema before the UI branches on them.

### Confirmation
* `knowledge/netlify-engineer/examples/alerts.test.ts` patterns (User-Agent sent, rounding, CDN header, `no-store` on errors) are
  ported into the function's tests and run in `npm test` in the Netlify build.
* `isAlertsResponse` validates the response in the client.
* The service worker never caches `/api/alerts` (network-only, docs/02 table); covered by the pwa-mobile-expert offline test.

## Pros and Cons of the Options
### Browser calls api.weather.gov directly
* Good, because there is no function cost.
* Bad, because the `User-Agent` cannot be set, which violates the NWS requirement.
### Netlify Function with CDN cache
* Good, because it can filter, trim, time out and cache.
* Bad, because it is code to maintain and test.
### Netlify redirect proxy with custom header
* Neutral, because a proxy redirect can add headers, but it cannot filter or trim payloads, and upstream errors pass through
  without a safe cache policy.
