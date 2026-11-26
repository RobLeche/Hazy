---
name: web-app-security
description: "Implement and review Hazy's web security: scrypt password hashing, HMAC-signed HttpOnly session cookies, CSRF and Origin checks, CSP, XSS-safe rendering and secret hygiene. Use when touching auth, sessions, cookies, headers, or how untrusted text is rendered."
metadata:
  owner: security-expert
  shared_with: [agent-console-engineer, netlify-engineer, qa-engineer]
---
# Web app security

## Password gate
- Store only `CONSOLE_PASSWORD_HASH` (scrypt with salt and params; `node:crypto`).
- Compare with `crypto.timingSafeEqual`; on failure return a generic message.
- Rate limit (Netlify rule) plus lockout (Blobs).

## Session
- Cookie `hazy_session=<base64url(payload)>.<HMAC-SHA256(SESSION_SECRET)>`, payload `{sid, exp}` (12 h).
- Attributes: `HttpOnly; Secure; SameSite=Strict; Path=/api`.
- Verify on every protected request: signature (timing-safe), expiry, and the sid not revoked (`logout` writes a revocation).

## CSRF
For every state-changing request: `SameSite=Strict`, plus an `Origin` that equals the site origin, plus
an `X-Hazy-CSRF` header equal to the per-session token (returned at login, kept in memory).

## Output safety
- Model, repo and API text is rendered as text or with a sanitising Markdown renderer
  (no raw HTML, no `javascript:` links). Never `innerHTML`.
- Strict CSP (headers-csp-cdn skill); no inline scripts.

## Secrets
- Never in logs, error bodies or the bundle; scrub `Authorization` headers from error dumps.
- Errors to clients: `{error, code}` only.
