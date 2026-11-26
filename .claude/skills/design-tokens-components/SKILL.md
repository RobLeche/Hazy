---
name: design-tokens-components
description: "Maintain Hazy's single source of design tokens (colour, spacing, radius, type, elevation, motion) and the reusable components built on them. Use when adding or changing a colour, spacing value or component (RiskBadge, OutlookCard, GlassSheet, TabBar)."
metadata:
  owner: ui-designer-apple-liquid-glass
  shared_with: [pwa-mobile-expert, ux-designer-apple-hig]
---
# Design tokens and components

- Tokens live in `src/styles/tokens.css` as CSS custom properties, with `:root` (light) and
  `[data-theme=dark]` / `@media (prefers-color-scheme: dark)` overrides.
- Categories: `--color-*` (surface, label, secondary-label, separator, accent, risk-none…risk-extreme),
  `--space-1…8` (4 px grid), `--radius-s/m/l/xl`, `--font-*` (type scale), `--shadow-*`, `--blur-*`,
  `--motion-duration-*`, `--motion-ease-*`.
- Risk colours: each level has a background, a foreground and an icon; each pair has its contrast
  ratio documented in a comment.
- Components (spec + implementation): `RiskBadge`, `OutlookCard`, `DayRow`, `TimelineBlock`,
  `AlertBanner`, `GlassSheet`, `TabBar`, `SearchField`, `Toast`, `DiffView`, `ChatBubble`.
  Each spec lists states (default, pressed, focus, disabled, loading) for light and dark.
- No raw hex values outside `tokens.css` (lint for it).
