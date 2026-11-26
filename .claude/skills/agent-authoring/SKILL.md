---
name: agent-authoring
description: "Write and edit Claude Code subagent files (.claude/agents/*.md) and project skills (.claude/skills/*/SKILL.md) for the Hazy team. Use when creating, renaming, re-scoping or re-wiring an agent or skill."
metadata:
  owner: agent-architect
  shared_with: [orchestrator, agent-console-engineer]
---
# Agent and skill authoring

## Subagent file (`.claude/agents/<id>.md`)
Frontmatter fields (Claude Code docs; camelCase, exact spelling, unknown keys are silently ignored):
`name` (unique, no `:`), `description` (drives automatic delegation, so say **when** to use the agent),
`tools` (allow-list) / `disallowedTools`, `model` (`opus`|`sonnet`|`haiku`|`fable`|full ID|`inherit`),
`effort` (`low`…`max`), `skills` (list; the **full content** of each is injected at startup, max 32),
`permissionMode`, `maxTurns`, `memory`, `color`, `isolation: worktree`, `background`, `hooks`, `mcpServers`.

Hazy conventions:
- `personality:` is our own key. Claude Code ignores it; the Agent Console shows it.
- Only `orchestrator` lists the `Agent` tool. Experts omit it, so hand-offs go through the orchestrator.
- The body is the system prompt: role, responsibilities, owned paths, decisions in force,
  working method, output format with a `Handoff` block, definition of done.
- Keep the `skills` list to what the matrix in `docs/expert-roster.md` §3 says; every listed skill costs context.

## Skill file (`.claude/skills/<name>/SKILL.md`)
- Frontmatter: `name` (= directory name), `description` (key use case first; description plus
  `when_to_use` is truncated at 1,536 characters), optional `metadata` (we store `owner`, `shared_with`).
- Keep SKILL.md under 500 lines; move long reference material to sibling files and link them.
- Do not set `disable-model-invocation: true` on a skill that an agent preloads (it blocks preloading).
- Write rules and checklists, not essays; link to `docs/` for background.

## Change procedure
1. Update `docs/expert-roster.md` first (role, skills table, matrix).
2. Edit the agent and skill files to match; keep names identical everywhere.
3. Run the consistency check: every `skills:` entry exists as a directory; every skill has at
   least one agent; roster and files agree.
4. Changes to `.claude/**` are human-only commits (on the console deny-list).
