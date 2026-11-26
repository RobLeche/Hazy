# Knowledge: orchestrator

Read **every file here before answering** and prefer it over memory (see the agent's "Before you answer" section).
Notes in `docs/` are taken from official documentation and link their sources; `examples/` are small, correct, tested worked examples.

## docs/
- [`claude-code-subagents-delegation.md`](docs/claude-code-subagents-delegation.md): Delegating to subagents in Claude Code. Sources: https://code.claude.com/docs/en/sub-agents
- [`effective-agents-patterns.md`](docs/effective-agents-patterns.md): Workflow patterns (Anthropic, "Building effective agents"). Sources: https://www.anthropic.com/engineering/building-effective-agents
- [`prompting-subagent-orchestration.md`](docs/prompting-subagent-orchestration.md): Prompting guidance for orchestration (Claude prompting best practices). Sources: https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices

## examples/
- [`handoff-routing.md`](examples/handoff-routing.md): Example 3 — Routing a hand-off (experts never call each other)
- [`plan-waves.ts`](examples/plan-waves.ts): Example 1 — Turn a task list into parallel waves (sectioning), refusing plans where parallel tasks share files. (tested by `plan-waves.test.ts`)
- [`worked-plan-outlook-screen.md`](examples/worked-plan-outlook-screen.md): Example 2 — A good orchestrator plan: "Ship the Outlook screen with alerts"

## Verification
Run: `cd knowledge/orchestrator/examples && node --test *.test.ts` (Node ≥ 22.18; TypeScript runs via type stripping), or `./knowledge/run-examples.sh` from the repo root.
Last run 2026-11-26 (Node v22.23.5): **3 passed, 0 failed, 0 skipped.**
