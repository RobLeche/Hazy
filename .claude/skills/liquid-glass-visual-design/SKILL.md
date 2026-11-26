---
name: liquid-glass-visual-design
description: "Define Hazy's Apple-style Liquid Glass look on the web: translucent layered materials, depth, light and dark appearances, type scale, iconography and motion, while keeping text legible. Use when designing or reviewing any visual: cards, badges, sheets, tab bar, icons, colours."
metadata:
  owner: ui-designer-apple-liquid-glass
  shared_with: [ux-designer-apple-hig, pwa-mobile-expert]
---
# Liquid Glass visual design (web)

## Principles
- **Content first**: weather data sits on the content layer; glass is for controls and navigation
  that float above it (tab bar, sheets, toolbars), not for every card.
- **Depth through layers**: translucent material with blur, a subtle specular edge highlight, a soft shadow.
- **Restraint**: one accent colour; hazard colours reserved for risk levels.
- **Adaptive**: designed for both light and dark appearances; accessibility settings honoured.

## CSS recipe
```css
.glass {
  background: color-mix(in srgb, var(--surface) 62%, transparent);
  backdrop-filter: blur(20px) saturate(160%);
  -webkit-backdrop-filter: blur(20px) saturate(160%);
  border: 1px solid color-mix(in srgb, white 28%, transparent);
  box-shadow: 0 8px 32px rgb(0 0 0 / .18), inset 0 1px 0 rgb(255 255 255 / .35);
  border-radius: var(--radius-l);
}
@media (prefers-reduced-transparency: reduce) { .glass { background: var(--surface); backdrop-filter: none; } }
@supports not (backdrop-filter: blur(1px)) { .glass { background: var(--surface); } }
```

## Legibility rules
- Text on glass must meet **4.5:1** against the worst-case background behind it. Add a tint or
  scrim layer when needed, and test over the brightest and darkest content.
- Risk badges are solid (not glass), with an icon + label, and contrast checked in both themes.
- Type: SF-style scale (Large Title 34, Title 28/22/20, Headline 17 semibold, Body 17, Callout 16,
  Subheadline 15, Footnote 13, Caption 12) in rem; support 200% text.
- Motion: springy but short (200–350 ms); none under `prefers-reduced-motion`.

## Deliverables
Tokens (`src/styles/tokens.css`), component specs (states, light/dark), an icon set, and contrast
evidence. Never use Apple trademarks or the SF Symbols artwork itself; draw original icons in that spirit.
