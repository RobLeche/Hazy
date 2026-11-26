---
name: agent-evaluation
description: "Review how Hazy agents performed, find failure patterns and turn them into prompt, tool or skill changes. Use after a milestone, after a bad hand-off, or when an agent repeatedly misses its brief."
metadata:
  owner: agent-architect
  shared_with: [orchestrator, qa-engineer]
---
# Agent evaluation

## Signals to collect
- Briefs vs results: did the agent meet the acceptance criteria the first time?
- Scope: did it edit outside its owned paths, or skip its Handoff block?
- Quality: did QA or security find bugs that the agent's own checklist should have caught?
- Cost and latency: turns used, unnecessary exploration, oversized outputs.

## Method
1. Pick 3–5 recent tasks per agent (from orchestrator reports).
2. For each miss, name the root cause: unclear description (wrong delegation), missing skill,
   wrong tool access, ambiguous output format, or wrong model/effort.
3. Propose the smallest fix: one sentence in the prompt, a checklist item in a skill,
   a tool added or removed, a model or effort change.
4. Write a regression scenario (a short task and the expected behaviour) and keep it in
   `docs/agent-evals.md`. Re-run the scenarios after changes.
5. Record the change and its reason in the commit message.

## Anti-patterns
- Piling on caps-lock rules ("ALWAYS", "NEVER"). Explain the reason instead.
- Duplicating skill content inside agent prompts.
- Growing an agent's skill list "just in case".
