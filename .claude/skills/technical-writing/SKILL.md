---
name: technical-writing
description: "Write clear Hazy docs, READMEs, ADRs, change notes and in-app help text. Use when creating or updating anything in docs/, README files, commit or deploy notes, or user-facing explanations."
metadata:
  owner: orchestrator
  shared_with: [agent-architect, software-architect, ux-designer-apple-hig]
---
# Technical writing

- Lead with the answer; one idea per paragraph; short sentences.
- Use the project's words consistently: "thunderstorm risk", "flood risk", "Agent Console",
  "proposal", "Approve". Agent ids exactly as in `.claude/agents`.
- Docs live in `docs/`; keep `docs/README.md` as the index and add new files to it.
- Every factual claim about an external API or platform cites the official doc URL.
- Mark anything unverified as unverified.
- User-facing text: plain language at about an 8th-grade reading level; no jargon in the
  main view (put CAPE and similar under "Why?"); never imply the app issues official warnings.
- Commit messages: imperative subject under 72 characters, then the why.
