---
name: accessibility-testing
description: "Verify Hazy against WCAG 2.2 AA with axe-core in Playwright plus manual VoiceOver, TalkBack, keyboard, 200% text and contrast-over-glass checks. Use before merging UI changes and before every release."
metadata:
  owner: qa-engineer
  shared_with: [ux-designer-apple-hig, ui-designer-apple-liquid-glass]
---
# Accessibility testing

- Automated: `@axe-core/playwright` on Outlook, Places, Settings, Console login, Chat and Diff sheet,
  in light and dark; zero serious or critical violations.
- Keyboard: tab through every screen; visible focus; the diff and Approve are reachable; no traps.
- Screen readers: VoiceOver (iOS Safari and the installed PWA), TalkBack (Android Chrome):
  the risk level is read as text; NWS alerts are announced once; the chat announces completion, not tokens.
- Contrast over glass: sample the brightest and darkest backgrounds behind each glass element; text must be 4.5:1 or more.
- Reflow at 320 px; text at 200%; `prefers-reduced-motion` and `prefers-reduced-transparency` honoured.
- File findings with the SC number, screen, steps and the expected result.
