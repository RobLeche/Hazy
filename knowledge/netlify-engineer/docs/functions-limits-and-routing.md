# Netlify Functions: handler, routing, limits

Sources (read 2026-11-26):
- Functions overview: https://docs.netlify.com/build/functions/overview/
- Get started: https://docs.netlify.com/build/functions/get-started/
- Functions API reference: https://docs.netlify.com/build/functions/api/
- Configuration (limits): https://docs.netlify.com/build/functions/configuration/
- Background Functions: https://docs.netlify.com/build/functions/background-functions/

## Handler and routing (verbatim example from the docs)
```ts
import type { Config, Context } from "@netlify/functions"
export default async (req: Request, context: Context) => {
  return new Response("Hello, world!")
}
export const config: Config = {
  path: "/hello",
}
```
- Default directory `netlify/functions/`; file forms: `hello.mts`, `hello/hello.mts`, `hello/index.mts` (also `.mjs`).
- `config.rateLimit` lives in the same `config` object (see rate-limiting note).

## Limits (quoted)
| Setting | Value |
|---|---|
| Memory | 1024 MB default, configurable (`config.memory`, e.g. `"2gb"`) |
| Synchronous execution limit | **60 seconds, not configurable** |
| Streaming responses | "Streaming functions have a **60-second execution limit** and a **20 MB response size limit**." |
| Background functions | "run for up to **15 minutes**"; "an initial `202` success response"; "If function invocation returns an error, a retry happens after one minute. If it fails again, another retry happens two minutes later." |
| Background enablement | `config.background` (preferred) or the legacy `-background` filename suffix |
| Plans | Background Functions are available on Free, Personal, Pro (credit-based) and Enterprise |

## Streaming example shape (docs)
Return `new Response(readableStream, { headers: { "content-type": "text/event-stream" } })`.
