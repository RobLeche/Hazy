# Delegating to subagents in Claude Code

Source: https://code.claude.com/docs/en/sub-agents (read 2026-11-26)

## What subagents are for (quoted)
- "Use one when a side task would flood your main conversation with search results, logs, or file contents you won't reference
  again: the subagent does that work in its own context and returns only the summary."
- "Each subagent runs in its own context window with a custom system prompt, specific tool access, and independent permissions.
  It also sends its own requests, which count toward the same usage limits."
- "Claude automatically delegates tasks based on the task description in your request, the `description` field in subagent
  configurations, and current context."

## Parallel and chained work (quoted)
- **Parallel**: "For independent investigations, spawn multiple subagents to work simultaneously … Each subagent explores its area
  independently, then Claude synthesizes the findings."
- **Warning**: "Running many subagents that each return detailed results can consume significant context, and each subagent spends
  tokens of its own while it runs." → Ask experts for a summary plus file paths, not full file contents.
- **Chain**: "Each subagent completes its task and returns results to Claude, which then passes relevant context to the next subagent."
  This is exactly how Hazy hand-offs work.
- **Foreground vs background**: "Foreground subagents block the main conversation until complete." "Background subagents run
  concurrently." "With nothing configured, a subagent … that Claude spawns from your main conversation starts in the background."

## Running as the main agent (quoted)
- "When an agent runs as the main thread with `claude --agent`, it can spawn subagents using the Agent tool. To restrict which
  subagent types it can spawn, use `Agent(agent_type)` syntax in the `tools` field." The Task tool was renamed Agent in 2.1.63.
- "By default, a subagent can spawn subagents of its own, up to three layers below the main conversation." Hazy experts are not
  given the Agent tool, so only you delegate.

## Implications for you
1. Start Hazy work with `claude --agent orchestrator` (you are the main thread) or be invoked as a subagent.
2. Launch independent expert tasks in the same message → they run concurrently.
3. Keep briefs self-contained: an expert starts with its own prompt, CLAUDE.md and preloaded skills, **not** your conversation.
