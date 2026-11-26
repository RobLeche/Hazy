---
name: diff-review-ux
description: "Design the Agent Console proposal review: readable per-file diffs, Approve / Reject / Ask to revise, deploy-target confirmation and post-approval status. Use when designing or building the proposal review sheet or chat-side proposal cards."
metadata:
  owner: ux-designer-apple-hig
  shared_with: [agent-console-engineer, ui-designer-apple-liquid-glass]
---
# Diff review UX

- A proposal card in the chat: agent avatar and name, summary, file count, +/− lines, status pill.
- Tap → full-height sheet: summary; file list (path, action, +/−); per-file unified diff with line
  numbers; wraps on phones, with a monospace option.
- Accessibility: added and removed lines are prefixed with `+`/`−` and announced as
  "added"/"removed"; the colour is not the only cue; keyboard navigation between files.
- Actions (sticky footer): **Ask to revise** (opens a chat reply), **Reject**, **Approve & deploy** (primary).
- Approve confirmation sheet: "This commits N files to **main** and publishes to production in about 1–2 minutes."
  Show the agent, the proposal ID and a rollback note ("Previous deploy can be restored from Netlify").
- After approval: commit SHA link, "Deploy started" status, and the previous-deploy link for rollback.
- Error states: stale base (409) → "The code changed since this proposal. Ask the agent to update it.";
  path refused → list the refused paths with the reason.
