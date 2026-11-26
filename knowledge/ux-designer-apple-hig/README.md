# Knowledge: ux-designer-apple-hig

Read **every file here before answering** and prefer it over memory (see the agent's "Before you answer" section).
Notes in `docs/` are taken from official documentation and link their sources; `examples/` are small, correct, tested worked examples.

## docs/
- [`hig-accessibility-interaction.md`](docs/hig-accessibility-interaction.md): Accessibility for interaction design. Sources: https://developer.apple.com/design/human-interface-guidelines/accessibility
- [`hig-feedback-loading-alerts.md`](docs/hig-feedback-loading-alerts.md): Feedback, loading and alerts. Sources: https://developer.apple.com/design/human-interface-guidelines/feedback, https://developer.apple.com/design/human-interface-guidelines/loading, https://developer.apple.com/design/human-interface-guidelines/alerts
- [`hig-navigation-tab-bars-sheets.md`](docs/hig-navigation-tab-bars-sheets.md): Navigation: tab bars, sheets, search. Sources: https://developer.apple.com/design/human-interface-guidelines/tab-bars, https://developer.apple.com/design/human-interface-guidelines/sheets, https://developer.apple.com/design/human-interface-guidelines/searching
- [`hig-writing-onboarding.md`](docs/hig-writing-onboarding.md): Writing and onboarding. Sources: https://developer.apple.com/design/human-interface-guidelines/writing, https://developer.apple.com/design/human-interface-guidelines/onboarding

## examples/
- [`approve-confirmation.md`](examples/approve-confirmation.md): Example 2 — Agent Console: proposal review → Approve & deploy
- [`copy-deck.json`](examples/copy-deck.json)
- [`copy-lint.ts`](examples/copy-lint.ts): Example 3 — Lint the copy deck against HIG writing rules + Hazy risk-communication rules. (tested by `copy-lint.test.ts`)
- [`outlook-flow.md`](examples/outlook-flow.md): Example 1 — Outlook flow with every state designed

## Verification
Run: `cd knowledge/ux-designer-apple-hig/examples && node --test *.test.ts` (Node ≥ 22.18; TypeScript runs via type stripping), or `./knowledge/run-examples.sh` from the repo root.
Last run 2026-11-26 (Node v22.23.5): **2 passed, 0 failed, 0 skipped.**
