# Architecture Decision Records (MADR template)

Sources (read 2026-11-26):
- MADR template: https://github.com/adr/madr/blob/develop/template/adr-template.md
- ADR community site: https://adr.github.io/

## MADR structure (verbatim headings)
Front matter (optional): `status` ("proposed | rejected | accepted | deprecated | … | superseded by ADR-0123"), `date`,
`decision-makers`, `consulted`, `informed`.
1. `# {short title, representative of solved problem and found solution}`
2. `## Context and Problem Statement`: "two to three sentences … You may want to articulate the problem in form of a question."
3. `## Decision Drivers` (optional)
4. `## Considered Options`
5. `## Decision Outcome`: "Chosen option: "{title}", because {justification …}"
   - `### Consequences`: "Good, because …" / "Bad, because …"
   - `### Confirmation`: "how the implementation / compliance of the ADR can/will be confirmed … automated or manual fitness function"
6. `## Pros and Cons of the Options` (optional), each "Good, because / Neutral, because / Bad, because".

## Hazy usage
- Files `docs/adr/NNNN-title.md`; lead decisions (D-001…) live in `docs/decisions.md` and ADRs reference them.
- Always fill **Confirmation** with a test or check (Hazy's fitness functions are `node --test` suites and the team validator).
