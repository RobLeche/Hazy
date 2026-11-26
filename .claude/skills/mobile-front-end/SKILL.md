---
name: mobile-front-end
description: "Build Hazy's responsive, phone-first front end with semantic HTML, modern CSS and a small Vite/TypeScript build. Use when implementing screens, components, layout, safe areas or the Agent Console UI."
metadata:
  owner: pwa-mobile-expert
  shared_with: [ui-designer-apple-liquid-glass, ux-designer-apple-hig]
---
# Mobile front end

- Stack: Vite + TypeScript, vanilla or a light framework (Preact/Svelte); small bundles. The
  `/console` route is lazy-loaded so the weather app never downloads console code.
- Phone first: design at 390×844, verify 320 px wide (reflow), large phones, landscape and tablet.
- Use `viewport-fit=cover` and `env(safe-area-inset-*)` for the notch and home indicator.
- Semantic HTML first (`button`, `nav`, `main`, `h1`–`h3`, `ul`); ARIA only to fill gaps.
- Styles come from design tokens (`src/styles/tokens.css`); no hard-coded colours or spacing.
- Respect `prefers-color-scheme`, `prefers-reduced-motion` and `prefers-reduced-transparency`.
- Render model output and API text as text (`textContent`) or sanitised Markdown; never `innerHTML`.
- Touch targets 44×44 px or larger; no hover-only affordances.
- Use `fetch` with `AbortController` timeouts; show skeletons, not spinners, for the forecast.
