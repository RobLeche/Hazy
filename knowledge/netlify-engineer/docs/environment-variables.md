# Environment variables

Sources (read 2026-11-26):
- Overview: https://docs.netlify.com/build/environment-variables/overview/
- Environment variables and functions: https://docs.netlify.com/build/functions/environment-variables/

## Scopes (quoted)
- **Builds**: site builds.
- **Functions**: "Functions, Edge Functions, Netlify Server, and On-demand Builders. You can use environment variables with this
  scope to securely provide sensitive values for your functions to use while they run – values such as API keys and tokens."
- **Runtime**: forms and signed proxy redirects.
- **Post processing**: snippet injection.

## Deploy contexts (quoted)
Production; Deploy Previews; Branch deploys; Preview server; Local development ("`Local development` environment variables
cannot be marked as secret").

## Reading in a function (docs example)
```ts
const value = process.env.MY_IMPORTANT_VARIABLE
```

## Hazy rules
- Secrets (`ANTHROPIC_API_KEY`, `GITHUB_TOKEN`, `SESSION_SECRET`, `CONSOLE_PASSWORD_HASH`) → **Functions scope only**, marked secret.
- Never use framework public prefixes (`VITE_`, `PUBLIC_`): bundlers inline them into browser JS.
- Read env vars **inside** the handler (not at module top level) so tests can set them, and so a missing var produces a clear 500.
