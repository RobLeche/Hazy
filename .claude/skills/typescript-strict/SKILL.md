---
name: typescript-strict
description: "Write Hazy code in strict TypeScript: shared types, pure functions, explicit null handling, no any. Use whenever writing or reviewing .ts/.mts code in src/, netlify/ or tests/."
metadata:
  owner: software-architect
  shared_with: [api-integration-expert, pwa-mobile-expert, agent-console-engineer, netlify-engineer, qa-engineer, meteorology-risk-analyst]
---
# Strict TypeScript

- `tsconfig`: `"strict": true`, `"noUncheckedIndexedAccess": true`, `"exactOptionalPropertyTypes": true`.
- No `any`. Use `unknown` plus a type guard at boundaries (API responses, request bodies, tool inputs).
- Validate external data at the edge (zod or hand-written guards), then pass typed data inward.
- Shared contracts live in `src/lib/types.ts` (`DayRisk`, `Proposal`, `AgentMeta`, `Job`) and are
  imported by both the front end and the functions. Never redefine them.
- Pure functions for logic (scoring, validation, diffing); I/O at the edges.
- Functions are ESM (`.mts`). No `__dirname`; use `import.meta.url` if needed.
- Use SDK types (`Anthropic.MessageParam`, etc.) instead of hand-rolled interfaces.
- Small modules; named exports; no default-export soup except Netlify handlers.
