# Service worker lifecycle and caching strategies

Sources (read 2026-11-26):
- MDN, Using Service Workers: https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers
- MDN, Caching (PWA guide): https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Caching
- web.dev, Caching: https://web.dev/learn/pwa/caching ; Update: https://web.dev/learn/pwa/update

## Lifecycle (MDN)
1. `navigator.serviceWorker.register('/sw.js')` needs HTTPS (or localhost); optional `scope`.
2. `install`: precache with `cache.addAll()` inside `event.waitUntil()`, so install fails if any asset fails.
3. `activate`: "clean up any old versions of its cache"; MDN says that at this point "no previous versions of
   the service worker are running".
4. `fetch`: `event.respondWith()` returns a cached or network response.
5. Updates: a changed SW "is installed in the background, but not yet activated". `skipWaiting()` activates without
   waiting; `clients.claim()` takes control of open pages.
6. MDN: "Service worker install time is not the same as PWA install time … Even if the user never installs your site
   as a PWA, its service worker will be installed and activated."

## Strategies (MDN Caching guide)
- **Cache first**: fast, but "once a response is in the cache, it is never refreshed until a new version of the service
  worker is installed."
- **Cache first with cache refresh**, a.k.a. **stale-while-revalidate**: serve the cache, always refetch to refresh.
- **Network first**: "try to retrieve the resource from the network. If the network request succeeds, we return the
  response and update the cache. If it fails, we try the cache."
- "A caching strategy balances offline operation, responsiveness, and freshness."

## Gotchas (web.dev Caching)
- Cache storage and eviction are **per origin, not per PWA**, so prefix cache names (`hazy-…`).
- Cross-origin opaque responses: `cache.add/addAll()` "will fail if those responses don't return with a 2xx status
  code … even successful downloads in the same operation" are discarded. Opaque sizes also distort quota.
- "The Cache Storage API doesn't update your assets if you change them on your server nor does it delete them."
- MDN: "the browser may evict an app's cached data if the limit is exceeded … In practice, eviction of cached data is
  a very rare event."

## Hazy mapping
| Resource | Strategy |
|---|---|
| App shell (hashed) | precache in `install` (`hazy-shell-<version>`) |
| Forecast JSON | network-first with timeout → cache |
| Geocoding | stale-while-revalidate |
| `/api/alerts`, `/api/agent*`, `/api/auth*` | network-only (never cached) |
