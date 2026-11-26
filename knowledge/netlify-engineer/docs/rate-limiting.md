# Rate limiting (Free plan)

Sources (read 2026-11-26):
- Rate limiting: https://docs.netlify.com/manage/security/secure-access-to-sites/rate-limiting/
- Functions API `rateLimit`: https://docs.netlify.com/build/functions/api/

## Code-based rule (docs example)
```ts
export const config: Config = {
  path: "/",
  rateLimit: { windowLimit: 100, windowSize: 60, aggregateBy: ["ip", "domain"] },
};
```
Properties: `action` (`'rate_limit'` or `'rewrite'`), `aggregateBy` (`'domain'`/`'ip'`), `to` (rewrite target),
`windowSize` (seconds; **maximum 180**), `windowLimit`. "rate limits for functions cannot be defined in the `netlify.toml`".

## Plan limits
Code-based rules: **Free/Starter/Personal: 2 per project**; Pro/Enterprise: 5; Enterprise with HP Edge: 100.
At most 2 rulesets per project (published and unpublished deploys).

## Netlify API (if ever used)
"up to 500 requests per minute"; deploys via API "up to 3 times per minute and up to 100 times per day".
