# Example 3 — An agent regression scenario (agent-evaluation skill)

**Agent:** meteorology-risk-analyst · **Failure seen:** proposed raising the flood level when `precipitation_probability` was 93%
on a stratiform day (5 mm/h peak).

**Root cause:** the prompt didn't stress that probability ≠ intensity; the knowledge note existed but wasn't read.

**Fix (smallest):** added the "Before you answer" section (read knowledge first); the note
`knowledge/meteorology-risk-analyst/docs/open-meteo-variables-for-scoring.md` uses the real Tampa case.

**Scenario to re-run after any prompt change:**
```
Input: Tampa fixture 2026-11-25 (93% max probability, 17.6 mm/day, 5 mm/h peak, CAPE 230, LI −0.8)
Expected: thunder "low", flood "non_threatening"; reasons mention light rain rate; no percentage in headline.
Check: knowledge/meteorology-risk-analyst/examples/scoring.test.ts passes unchanged.
```
