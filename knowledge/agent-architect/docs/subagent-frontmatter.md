# Claude Code subagent files

Source: https://code.claude.com/docs/en/sub-agents (read 2026-11-26)

- Location: project `.claude/agents/` (user scope `~/.claude/agents/`). Markdown with YAML frontmatter; the body is the system prompt.
- Example from the docs:
```markdown
---
name: code-reviewer
description: Reviews code for quality and best practices
tools: Read, Glob, Grep
model: sonnet
---
You are a code reviewer. When invoked, analyze the code and provide specific, actionable feedback on quality, security, and best practices.
```

## Fields (from the docs' field table)
`name` (≤ 256 chars, no `:`, don't start with `-`), `description` ("When Claude should delegate to this subagent"), `tools`
(comma list or YAML list), `disallowedTools`, `model` (`sonnet`, `opus`, `haiku`, `fable`, a full ID such as `claude-opus-5-5`, or
`inherit`), `permissionMode`, `maxTurns`, `autoCompactWindow`, `skills` ("Skills to preload into the subagent's context at startup"),
`mcpServers`, `hooks`, `memory` (`user`/`project`/`local`), `background`, `omitClaudeMd`, `effort` (`low`…`max`), `isolation: worktree`,
`color` (red, blue, green, yellow, purple, orange, pink, cyan), `initialPrompt`, `experimental`.

## Behaviours that matter (quoted)
- Unknown keys: "Multi-word field names use camelCase and must match the table exactly: Claude Code ignores a field it doesn't
  recognize without reporting an error." → our `personality:` key is safe, but a typo like `allowed_tools` silently does nothing.
- `skills`: "The full content of each listed skill is injected into the subagent's context at startup, up to the first 32 distinct
  names in the list. Subagents can still invoke unlisted project, user, and plugin skills through the Skill tool."
- Nesting: "By default, a subagent can spawn subagents of its own, up to three layers below the main conversation." Listing `Agent`
  in `tools` enables it; omit it to prevent it (Hazy experts).
- `Agent(type1, type2)` allow-list syntax applies "only to an agent running as the main thread with `claude --agent`".
- Delegation is driven by "the task description in your request, the `description` field … and current context"; phrases like "use
  proactively" encourage it.
