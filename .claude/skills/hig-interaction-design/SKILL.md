---
name: hig-interaction-design
description: "Design Hazy's flows and interactions following Apple's Human Interface Guidelines: navigation, tab bars, sheets, search, gestures, and empty, loading and error states. Use when designing or reviewing a screen, a flow or interaction behaviour, including the Agent Console."
metadata:
  owner: ux-designer-apple-hig
  shared_with: [ui-designer-apple-liquid-glass, pwa-mobile-expert]
---
# HIG interaction design

## App structure
- Tab bar (bottom, 3 tabs): **Outlook** (selected place), **Places** (search + saved), **Settings**
  (units, theme, about/attribution). The Agent Console is reached from Settings → "Agent Console" (password).
- Outlook: today hero (thunder + flood level, headline, update time) → timeline of blocks →
  next days list → "Why?" disclosure → marine card (coastal only) → NWS alerts banner pinned on top when active.
- Search: a sheet with a search field, a state filter defaulting to Florida, "Use my location", and recent places.

## Patterns
- Clear hierarchy: one primary action per screen. Familiar controls; no custom gestures without a visible alternative.
- Sheets for focused tasks (search, proposal review); push navigation for drill-down (a day's detail).
- Feedback for every action within 100 ms; pull-to-refresh on Outlook.
- **States for every screen**: first run (no place), loading (skeleton), offline (cached + banner),
  error (what happened + retry), location denied (explain + search instead), no alerts.
- Destructive or irreversible actions (Approve & deploy) need a confirmation sheet that summarises the effect.
- Copy: short, specific, sentence case; buttons are verbs ("Approve & deploy", "Try again").

## Deliverables
Flow diagrams, annotated wireframes with states, a copy deck, and acceptance criteria per screen for
pwa-mobile-expert and qa-engineer.
