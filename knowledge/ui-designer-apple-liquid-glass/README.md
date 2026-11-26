# Knowledge: ui-designer-apple-liquid-glass

Read **every file here before answering** and prefer it over memory (see the agent's "Before you answer" section).
Notes in `docs/` are taken from official documentation and link their sources; `examples/` are small, correct, tested worked examples.

## docs/
- [`hig-accessibility-visual.md`](docs/hig-accessibility-visual.md): Accessibility requirements for visual design. Sources: https://developer.apple.com/design/human-interface-guidelines/accessibility
- [`hig-color-and-dark-mode.md`](docs/hig-color-and-dark-mode.md): Color and Dark Mode. Sources: https://developer.apple.com/design/human-interface-guidelines/color, https://developer.apple.com/design/human-interface-guidelines/dark-mode
- [`hig-materials-liquid-glass.md`](docs/hig-materials-liquid-glass.md): Materials and Liquid Glass. Sources: https://developer.apple.com/design/human-interface-guidelines/materials
- [`hig-typography.md`](docs/hig-typography.md): Typography. Sources: https://developer.apple.com/design/human-interface-guidelines/typography

## examples/
- [`glass-tabbar.test.ts`](examples/glass-tabbar.test.ts): Example 2 — Proves the glass tab bar uses blur normally and drops to a solid surface under Reduce Transparency,
- [`tokens.test.ts`](examples/tokens.test.ts): runnable example
- [`contrast.ts`](examples/contrast.ts)
- [`glass-tabbar.html`](examples/glass-tabbar.html) (tested by `glass-tabbar.test.ts`)
- [`tokens.css`](examples/tokens.css): Example 1 — Hazy design tokens: light, dark, increased contrast, reduced transparency. (tested by `tokens.test.ts`)

## Verification
Run: `cd knowledge/ui-designer-apple-liquid-glass/examples && node --test *.test.ts` (Node ≥ 22.18; TypeScript runs via type stripping), or `./knowledge/run-examples.sh` from the repo root.
Last run 2026-11-26 (Node v22.23.5): **8 passed, 0 failed, 0 skipped.**
`glass-tabbar.test.ts` uses Playwright + Chromium (CDP media emulation).
