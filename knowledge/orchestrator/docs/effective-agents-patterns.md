# Workflow patterns (Anthropic, "Building effective agents")

Source: https://www.anthropic.com/engineering/building-effective-agents (read 2026-11-26)

## Start simple (quoted)
"we recommend finding the simplest solution possible, and only increasing complexity when needed. This might mean not building
agentic systems at all." Three principles: "Maintain simplicity in your agent's design. Prioritize transparency by explicitly
showing the agent's planning steps. Carefully craft your agent-computer interface (ACI)."

## Orchestrator-workers (quoted)
"a central LLM dynamically breaks down tasks, delegates them to worker LLMs, and synthesizes their results." Use it "for complex
tasks where you can't predict the subtasks needed (in coding, for example, the number of files that need to be changed …)". The
"key difference from parallelization is its flexibility — subtasks aren't pre-defined, but determined by the orchestrator."

## Parallelization (quoted)
- **Sectioning**: "Breaking a task into independent subtasks run in parallel."
- **Voting**: "Running the same task multiple times to get diverse outputs."
- "For complex tasks with multiple considerations, LLMs generally perform better when each consideration is handled by a separate
  LLM call." Example: "Reviewing a piece of code for vulnerabilities, where several different prompts review and flag the code."

## How Hazy applies them
- You = orchestrator-workers (subtasks decided per goal).
- Waves of independent tasks = sectioning.
- Final review = security-expert and qa-engineer reviewing the same change from different angles (voting-like).
- Transparency = always show the plan (waves, owners, paths) before dispatching.
