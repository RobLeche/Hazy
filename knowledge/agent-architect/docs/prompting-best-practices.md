# Writing agent prompts that work (Claude prompting best practices)

Source: https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices (read 2026-11-26)

- **Be clear and direct** (quoted): "Think of Claude as a brilliant but new employee who lacks context on your norms and workflows. The
  more precisely you explain what you want, the better the result." Key test: "Show your prompt to a colleague with minimal context …
  If they'd be confused, Claude will be too."
- "Provide instructions as sequential steps using numbered lists or bullet points when the order or completeness of steps matters."
- **Add context / motivation**: explaining *why* a rule exists beats bare commands. The docs' example contrasts "NEVER use ellipses" with
  a reasoned version. In agent files, give the reason next to each rule (e.g. "no secrets in the bundle, because…").
- **Use examples effectively**: "Relevant", "Diverse", "Structured: Wrap examples in `<example>` tags." This is why each agent has a
  `knowledge/<agent>/examples/` folder.
- **Give Claude a role**: the first line of each agent body states who it is.
- **Subagent orchestration**: the latest models orchestrate natively; "Watch for overuse"; add guidance about when subagents are and
  aren't warranted (see the orchestrator's prompt).
- **Balancing autonomy and safety**: ask before "actions that are hard to reverse, affect shared systems, or could be destructive".
