---
name: accessibility-wcag
description: "Design and build Hazy to WCAG 2.2 AA: contrast (including text over glass), never colour alone, keyboard and focus, 24px+ targets, live regions, reflow at 320px and reduced motion. Use when designing, building or reviewing any UI, including the Agent Console chat and diff views."
metadata:
  owner: ux-designer-apple-hig
  shared_with: [ui-designer-apple-liquid-glass, pwa-mobile-expert, qa-engineer, agent-console-engineer]
---
# Accessibility (WCAG 2.2 AA)

| SC | Hazy rule |
|---|---|
| 1.4.1 Use of Color | Risk = icon + text label + colour |
| 1.4.3 Contrast | Text 4.5:1 (large 3:1), checked over glass in both themes |
| 1.4.11 Non-text Contrast | Borders, focus rings and chart lines 3:1 |
| 1.4.10 Reflow | 320 CSS px with no 2-D scroll (the hourly strip gets a list alternative) |
| 2.1.1 Keyboard | Everything operable by keyboard, including diff review and Approve |
| 2.4.7 Focus Visible | Visible focus ring; never remove the outline without a replacement |
| 2.5.8 Target Size | 24×24 minimum (we aim for 44×44) |
| 4.1.3 Status Messages | `role="status"` for loading, updated and offline; `role="alert"` once for NWS warnings |
| 2.2.1 Timing | Console session expiry warns and can be extended |
| 3.3.1 Error Identification | Errors described in text next to the field |

Extras: `lang="en"`; one `h1` per view; landmarks; streaming chat uses `aria-busy` and announces on
completion (not per token); diffs are announced as "added" and "removed", not just colour;
honour reduced motion, reduced transparency and 200% text.
