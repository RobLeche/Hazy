---
name: web-performance
description: "Keep Hazy fast on mid-range phones and slow networks: Core Web Vitals, bundle and font budgets, lazy loading and caching. Use when adding dependencies, images, fonts or new screens, or when a page feels slow."
metadata:
  owner: pwa-mobile-expert
  shared_with: [netlify-engineer, qa-engineer]
---
# Web performance

Budgets (mobile, 4G, mid-range phone): LCP 2.5 s or less, INP 200 ms or less, CLS 0.1 or less;
initial JS 70 KB gzipped or less (weather app); console route lazy-loaded.

- Prefer system fonts (`-apple-system, BlinkMacSystemFont, "SF Pro", system-ui`); no web-font
  download for v1.
- SVG icons inline or sprited; compress raster icons.
- Fetch forecast and alerts in parallel; render cached data first, then update.
- Avoid layout shift: reserve space for cards and skeletons.
- Glass effects (`backdrop-filter`) are expensive. Limit them to a few layers, and provide a solid
  fallback under `prefers-reduced-transparency` or on low-end devices.
- Check every PR's Deploy Preview with Lighthouse (performance and accessibility) and record the numbers.
