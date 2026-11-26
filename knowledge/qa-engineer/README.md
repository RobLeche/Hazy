# Knowledge: qa-engineer

Read **every file here before answering** and prefer it over memory (see the agent's "Before you answer" section).
Notes in `docs/` are taken from official documentation and link their sources; `examples/` are small, correct, tested worked examples.

## docs/
- [`assertions-and-locators.md`](docs/assertions-and-locators.md): Locators and web-first assertions. Sources: https://playwright.dev/docs/locators, https://playwright.dev/docs/test-assertions
- [`playwright-accessibility.md`](docs/playwright-accessibility.md): Accessibility testing with axe. Sources: https://playwright.dev/docs/accessibility-testing
- [`playwright-emulation.md`](docs/playwright-emulation.md): Playwright emulation for a phone-first PWA. Sources: https://playwright.dev/docs/emulation
- [`playwright-network-and-service-workers.md`](docs/playwright-network-and-service-workers.md): Mocking the network (and the service-worker gotcha). Sources: https://playwright.dev/docs/mock, https://playwright.dev/docs/network, https://playwright.dev/docs/test-use-options

## examples/
- [`a11y-axe.test.ts`](examples/a11y-axe.test.ts): Example 2 — axe scan (WCAG 2.x A/AA tags) that passes on the good page and catches a contrast bug on a bad one.
- [`outlook-mobile.test.ts`](examples/outlook-mobile.test.ts): Example 1 — Mobile e2e: device emulation, geolocation, API mocking with page.route, dark mode, role-based locators.
- [`site/`](examples/site/): supporting files (fixtures or demo site)

## Verification
Run: `cd knowledge/qa-engineer/examples && node --test *.test.ts` (Node ≥ 22.18; TypeScript runs via type stripping), or `./knowledge/run-examples.sh` from the repo root.
Last run 2026-11-26 (Node v22.23.5): **6 passed, 0 failed, 0 skipped.**
`a11y-axe.test.ts` needs `@axe-core/playwright` (verified with 4.14.1). Playwright 1.63.0 with Chromium.
