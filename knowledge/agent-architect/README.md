# Knowledge: agent-architect

Read **every file here before answering** and prefer it over memory (see the agent's "Before you answer" section).
Notes in `docs/` are taken from official documentation and link their sources; `examples/` are small, correct, tested worked examples.

## docs/
- [`prompting-best-practices.md`](docs/prompting-best-practices.md): Writing agent prompts that work (Claude prompting best practices). Sources: https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices
- [`skills-format.md`](docs/skills-format.md): Claude Code skills (SKILL.md). Sources: https://code.claude.com/docs/en/skills
- [`subagent-frontmatter.md`](docs/subagent-frontmatter.md): Claude Code subagent files. Sources: https://code.claude.com/docs/en/sub-agents

## examples/
- [`eval-scenario.md`](examples/eval-scenario.md): Example 3 — An agent regression scenario (agent-evaluation skill)
- [`good-agent-annotated.md`](examples/good-agent-annotated.md): Example 2 — What a good Hazy agent file looks like (annotated)
- [`validate-team.ts`](examples/validate-team.ts): Example 1 — Validate the REAL team in this repo: agents ↔ skills ↔ knowledge folders stay consistent. (tested by `validate-team.test.ts`)

## Verification
Run: `cd knowledge/agent-architect/examples && node --test *.test.ts` (Node ≥ 22.18; TypeScript runs via type stripping), or `./knowledge/run-examples.sh` from the repo root.
Last run 2026-11-26 (Node v22.23.5): **3 passed, 0 failed, 0 skipped.**
