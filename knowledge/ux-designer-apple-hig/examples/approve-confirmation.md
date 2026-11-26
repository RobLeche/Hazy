# Example 2 — Agent Console: proposal review → Approve & deploy

Follows: hig-navigation-tab-bars-sheets.md (one sheet, Cancel paired), hig-feedback-loading-alerts.md (confirm significant
actions; explain failures), decisions D-002 (Approve commits straight to main).

## Proposal sheet
- Title: "Change from storm-scorer" · subtitle "3 files · +42 −7 · Proposal p_8f2c"
- Summary (agent's words, plain text)
- File list → tap a file for its diff (lines read "added" / "removed" by VoiceOver; +/− glyphs, not colour only)
- Footer: **Ask to revise** (secondary) · **Approve & deploy** (primary, accent fill). Top-left **Cancel**.

## Confirmation (the only modal alert in the app: irreversible, affects production)
```
Title:   Deploy these changes?
Message: This commits 3 files to main and publishes the live site in about 1–2 minutes.
         You can restore the previous deploy from Netlify.
Buttons: Cancel · Approve & deploy
```

## After approval
Inline status in the sheet: "Committed a1b2c3d · Deploy started" with links **View commit** and **Previous deploy**.

## Failure copy (direct, neutral, actionable)
| Case | Copy |
|---|---|
| Stale base (409) | "The code changed since this proposal. Ask storm-scorer to update it." + **Ask to revise** |
| Path refused | "This proposal edits files agents can't change: netlify.toml. Ask for a version without them." |
| Session expired | "Your session ended. Sign in again to approve." |
| Rate limited | "Too many requests. Try again in a minute." |
