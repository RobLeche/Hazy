---
status: accepted
date: 2026-11-26
decision-makers: lead, software-architect
consulted: api-integration-expert, netlify-engineer, security-expert
---
# Fetch NWS alerts through a Netlify Function, cached at the CDN

## Context and Problem Statement
Hazy must show official NWS flood and thunderstorm alerts. The NWS API requires a `User-Agent` that identifies the app, and browsers
do not allow JavaScript to set `User-Agent`. How should the PWA get alerts?

## Decision Drivers
* NWS requirement: User-Agent (weather.gov API docs)
* D-001: static + Functions only; D-003: Free plan
* Alerts must never be stale (safety)

## Considered Options
* Browser calls api.weather.gov directly
* Netlify Function `/api/alerts` with a CDN cache
* Netlify redirect proxy with a custom header

## Decision Outcome
Chosen option: "Netlify Function `/api/alerts` with a CDN cache", because it is the only option that reliably sets the User-Agent and
lets us trim, filter and cache responses per rounded point.

### Consequences
* Good, because the User-Agent requirement is met and contact info stays server-side.
* Good, because a 120 s CDN cache per ~1 km point bounds NWS traffic.
* Bad, because alerts can be up to 2 minutes old; acceptable vs. NWS update cadence, documented in the UI ("Updated …").
* Bad, because it adds a function invocation per uncached point (Free-plan usage to monitor).

### Confirmation
`knowledge/netlify-engineer/examples/alerts.test.ts` (User-Agent sent, rounding, CDN header, no-store on errors) runs in `npm test`;
the service worker never caches `/api/alerts` (pwa-mobile-expert offline test).

## Pros and Cons of the Options
### Browser calls api.weather.gov directly
* Good, because no function cost.
* Bad, because the User-Agent cannot be set → violates the NWS requirement.
### Netlify redirect proxy with custom header
* Neutral, because proxy redirects can add headers (netlify.toml) but cannot filter or trim payloads, and errors are passed through uncached-unsafe.
