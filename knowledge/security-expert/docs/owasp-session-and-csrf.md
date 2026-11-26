# Sessions and CSRF

Sources (read 2026-11-26, text from github.com/OWASP/CheatSheetSeries):
- Session Management Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html
- CSRF Prevention Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html

## Session identifiers (quoted)
- "Session identifiers must have at least `64 bits` of entropy"; generated with "a strong CSPRNG".
- Hazy uses 128-bit random `sid` (`crypto.randomBytes(16)`) inside an HMAC-signed cookie.

## Cookie attributes (quoted)
- `Secure`: "only send the cookie through an encrypted HTTPS (SSL/TLS) connection … mandatory".
- `HttpOnly`: "not to allow scripts … access the cookies via the DOM document.cookie object … mandatory to prevent
  session ID stealing through XSS attacks."
- `SameSite`: "`SameSite=Strict` excludes cross-site requests … Treat `SameSite` as defense in depth against CSRF."

## Timeouts (quoted)
"Common idle timeouts ranges are 2-5 minutes for high-value applications and 15-30 minutes for low risk applications.
… All sessions should implement an absolute timeout, regardless of session activity." The console can commit to production
(D-002), so treat it as high value: **idle 30 min, absolute 12 h**, and warn before expiry (WCAG 2.2.1).

## CSRF (quoted)
- Fetch Metadata: "Sec-Fetch-Site — the primary signal for CSRF protection." "By default, reject non-safe methods (POST / PUT /
  PATCH / DELETE) when `Sec-Fetch-Site: cross-site`." Support: "all modern browsers … Safari 16.4+".
- "a fallback to standard origin verification headers is a mandatory" part of a Fetch-Metadata policy.
- "If an API-driven site can't use `<form>` tags, consider using custom request headers."
- Naive double-submit cookie is "DISCOURAGED"; the signed (HMAC) variant is recommended.

## Hazy policy for state-changing console requests
1. `Sec-Fetch-Site` present → must be `same-origin`.
2. Else `Origin` must equal the site origin.
3. Plus the `X-Hazy-CSRF` header equal to the session's HMAC-derived token.
4. Cookie `SameSite=Strict` as defense in depth.
