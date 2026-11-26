---
name: headers-csp-cdn
description: "Configure Hazy's HTTP headers and caching on Netlify: Content-Security-Policy and security headers, Netlify-CDN-Cache-Control for function responses, and no-cache for sw.js. Use when editing _headers or netlify.toml headers, or a function's cache headers."
metadata:
  owner: netlify-engineer
  shared_with: [security-expert, pwa-mobile-expert]
---
# Headers, CSP and CDN caching

Baseline for `/*`:
```
Content-Security-Policy: default-src 'self'; connect-src 'self' https://api.open-meteo.com https://marine-api.open-meteo.com https://flood-api.open-meteo.com https://geocoding-api.open-meteo.com; img-src 'self' data:; script-src 'self'; style-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'
X-Content-Type-Options: nosniff
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: geolocation=(self), camera=(), microphone=()
Strict-Transport-Security: max-age=63072000; includeSubDomains
```
- `/sw.js`: `Cache-Control: no-cache`. Hashed assets: `Cache-Control: public, max-age=31536000, immutable`.
- Function responses that are safe to share: `Netlify-CDN-Cache-Control: public, durable, max-age=<s>, stale-while-revalidate=<s>`
  (alerts 120 s; forecast proxy, if used, 900 s), keyed by rounded coordinates in the URL.
- Authenticated `/api/agent*`, `/api/proposals*` and `/api/auth*`: `Cache-Control: no-store`.
- Any CSP change needs security-expert review.
