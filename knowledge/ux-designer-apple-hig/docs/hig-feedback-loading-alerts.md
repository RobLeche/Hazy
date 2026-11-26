# Feedback, loading and alerts

Sources (read 2026-11-26):
- Feedback: https://developer.apple.com/design/human-interface-guidelines/feedback
- Loading: https://developer.apple.com/design/human-interface-guidelines/loading
- Alerts: https://developer.apple.com/design/human-interface-guidelines/alerts

## Loading (quoted)
- "The best content-loading experience finishes before people become aware of it."
- "Show something as soon as possible … consider showing placeholder text, graphics, or animations." → skeleton cards plus the
  cached outlook first.
- "Clearly communicate that content is loading and how long it might take to complete."

## Feedback (quoted)
- "Make sure all feedback is accessible … using color, text, sound, and haptics."
- "Consider integrating status feedback into your interface" near the items it describes → "Updated 5 min ago" under the hero.
- "Use alerts to deliver critical — and ideally actionable — information … Alerts can lose their impact if you use them too often."
- "When it makes sense, confirm that a significant action or task has completed." → after Approve: "Deploy started".
- "Show people when a command can't be carried out and help them understand why."

## Alerts (quoted)
- "Use alerts sparingly." "Avoid using an alert merely to provide information."
- "Avoid displaying alerts for common, undoable actions."
- "**Avoid showing an alert when your app starts.** … If your app detects a problem at startup, like no network connection," show it
  in the interface instead. → The offline banner is inline, not a modal alert.
- "In all alert copy, be direct, and use a neutral, approachable tone … avoid being oblique or accusatory, or masking the severity."
- "Write a title that clearly and succinctly describes the situation."

## Hazy decisions
NWS warnings appear as a pinned inline banner (`role="alert"` announced once), not a modal. The only confirmation dialog is
"Approve & deploy" (irreversible, production).
