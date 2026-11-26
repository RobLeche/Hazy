# XSS-safe rendering, CSP and security headers

Sources (read 2026-11-26):
- OWASP XSS Prevention Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html
- OWASP HTTP Headers Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html
- MDN, Content Security Policy guide: https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP

## Rendering untrusted text (model output, repo files, API text)
- OWASP: "When displaying text with JavaScript, assign it to the `textContent` property … This creates a text node."
- For HTML (Markdown output): "OWASP recommends DOMPurify for HTML Sanitization"; "You must regularly patch DOMPurify".
- Danger example called out: React's `dangerouslySetInnerHTML` without sanitizing.

## Header recommendations (OWASP, quoted values)
| Header | Value |
|---|---|
| X-Frame-Options | `DENY` (prefer CSP `frame-ancestors`) |
| X-XSS-Protection | `0` ("Do not set this header or explicitly turn it off") |
| X-Content-Type-Options | `nosniff` |
| Referrer-Policy | `strict-origin-when-cross-origin` |
| Cache-Control (sensitive) | `no-store` |
| Strict-Transport-Security | `max-age=63072000; includeSubDomains; preload` (read the warnings first) |
| Content-Security-Policy | "complex to configure and maintain"; disable inline JS |

## Netlify caveat (https://docs.netlify.com/manage/routing/headers/)
"Custom headers apply only to files Netlify serves from our own backing store … a function … custom headers won't be
applied to that content." So **every function must set its own** `Cache-Control: no-store` and security headers.
