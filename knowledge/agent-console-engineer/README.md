# Knowledge: agent-console-engineer

Read **every file here before answering** and prefer it over memory (see the agent's "Before you answer" section).
Notes in `docs/` are taken from official documentation and link their sources; `examples/` are small, correct, tested worked examples.

## docs/
- [`claude-messages-and-models.md`](docs/claude-messages-and-models.md): Claude Messages API and models. Sources: https://platform.claude.com/docs/en/api/messages/create, https://platform.claude.com/docs/en/about-claude/models/overview, https://platform.claude.com/docs/en/api/errors
- [`claude-streaming.md`](docs/claude-streaming.md): Streaming (SSE). Sources: https://platform.claude.com/docs/en/build-with-claude/streaming
- [`claude-tool-use.md`](docs/claude-tool-use.md): Tool use: definitions, loop and result rules. Sources: https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview, https://platform.claude.com/docs/en/agents-and-tools/tool-use/implement-tool-use, https://platform.claude.com/docs/en/agents-and-tools/tool-use/handle-tool-calls
- [`github-contents-and-git-data.md`](docs/github-contents-and-git-data.md): GitHub REST: contents, trees, commits, refs (for the Approve commit). Sources: https://docs.github.com/en/rest/repos/contents, https://docs.github.com/en/rest/git/trees, https://docs.github.com/en/rest/git/commits, https://docs.github.com/en/rest/git/refs

## examples/
- [`github-commit.ts`](examples/github-commit.ts): Example 3 — Approve → ONE atomic, fast-forward-only commit to main via the Git Data API, with a stale-base check. (tested by `github-commit.test.ts`)
- [`sse.ts`](examples/sse.ts): Example 1a — Dependency-free SSE parser (used by the console UI to read our relay, and to inspect raw API streams). (tested by `sse.test.ts`)
- [`stream-relay.ts`](examples/stream-relay.ts): Example 1b — Netlify streaming function body: call Claude with the SDK, relay text deltas as our own SSE. (tested by `stream-relay.test.ts`)
- [`tool-loop.ts`](examples/tool-loop.ts): Example 2 — The agent tool loop with Hazy's limits: iteration cap, deadline, results-first, is_error. (tested by `tool-loop.test.ts`)
- [`fixtures/`](examples/fixtures/): supporting files (fixtures or demo site)

## Verification
Run: `cd knowledge/agent-console-engineer/examples && node --test *.test.ts` (Node ≥ 22.18; TypeScript runs via type stripping), or `./knowledge/run-examples.sh` from the repo root.
Last run 2026-11-26 (Node v22.23.5): **10 passed, 0 failed, 0 skipped.**
`stream-relay.test.ts` needs `@anthropic-ai/sdk` (verified with 1.14.0).
