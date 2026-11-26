---
name: service-worker-offline
description: "Implement Hazy's service worker: app-shell precache, network-first forecast cache, never-stale alerts, versioned caches and the update toast. Use when editing src/sw.ts, caching rules or offline behaviour."
metadata:
  owner: pwa-mobile-expert
  shared_with: [api-integration-expert, netlify-engineer, qa-engineer]
---
# Service worker and offline

Lifecycle: register (HTTPS) → `install` (precache shell via `cache.addAll` inside `waitUntil`) →
`activate` (delete caches not matching the current version; optionally enable navigation preload) →
`fetch` (`respondWith`).

| Request | Strategy |
|---|---|
| App shell (hashed assets, icons) | precache `hazy-shell-<build>` |
| Forecast and marine JSON | network-first, 4 s timeout → cache; store with a timestamp; UI shows "Last updated" |
| Geocoding | stale-while-revalidate |
| `/api/alerts` | **network-only**; offline → "Can't check alerts offline" |
| `/api/agent*`, `/api/proposals*`, `/api/auth*` | never cached; bypass the SW |

## Rules
- A new SW waits; show a "New version available — Refresh" toast that calls `skipWaiting` on tap.
  Do not auto-reload (agent-approved deploys can ship often).
- `/sw.js` is served with `Cache-Control: no-cache` (netlify-engineer sets the header).
- Keep the cache bounded (e.g. the last 10 places); call `navigator.storage.persist()` where supported.
- Never cache responses with `Set-Cookie` or any authenticated response.
