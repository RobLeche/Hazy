# Locators and web-first assertions

Sources (read 2026-11-26): https://playwright.dev/docs/locators , https://playwright.dev/docs/test-assertions

- Prefer user-facing locators: `page.getByRole('button', { name: 'Approve & deploy' })`, `getByText`, `getByLabel`. These also
  double as accessibility checks (an unlabeled button can't be found by role and name).
- Web-first assertions retry until the timeout: `await expect(page.getByRole('status')).toHaveText(/Updated/)`. Avoid
  `waitForTimeout`.
- Test config: run with `--trace off` by default (trace on only to debug a failure).
