# Prompting guidance for orchestration (Claude prompting best practices)

Source: https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices (read 2026-11-26)

- "Claude's latest models orchestrate subagents natively … recognize when tasks would benefit from delegating work to specialized
  subagents and do so proactively."
- "Watch for overuse … the model might spawn subagents for code exploration when a direct grep call is faster and sufficient."
- Sample guidance (quoted): "Use subagents when tasks can run in parallel, require isolated context, or involve independent workstreams
  that don't need to share state. For simple tasks, sequential operations, single-file edits, or tasks where you need to maintain
  context across steps, work directly rather than delegating."
- "Be clear and direct … Think of Claude as a brilliant but new employee who lacks context on your norms and workflows." Your task
  briefs to experts must carry that context.
- Balancing autonomy and safety (quoted sample): "take local, reversible actions like editing files or running tests, but for actions
  that are hard to reverse, affect shared systems, or could be destructive, ask the user before proceeding." Pushing to `main` is
  such an action: confirm with the lead.
