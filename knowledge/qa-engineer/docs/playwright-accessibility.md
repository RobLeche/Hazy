# Accessibility testing with axe

Source: https://playwright.dev/docs/accessibility-testing (docs/src/accessibility-testing-js.md, read 2026-11-26)

```ts
import AxeBuilder from '@axe-core/playwright';
const results = await new AxeBuilder({ page }).analyze();
expect(results.violations).toEqual([]);
```
- "`AxeBuilder.analyze()` will scan the page *in its current state* when you call it." To scan revealed UI, interact first
  (open the sheet, then analyze).
- `AxeBuilder.include(selector)` constrains the scan; `.withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa'])`
  restricts it to WCAG rules; `.disableRules([...])` for known issues (track them, don't hide them).
- Automated scans catch only part of WCAG; keep manual VoiceOver and TalkBack passes.
**Gotcha (observed):** `AxeBuilder.analyze()` throws "Please use browser.newContext()" for pages made with
`browser.newPage()`; create a context first. With `@playwright/test` fixtures this is automatic.

Verified here with `@axe-core/playwright` 4.14.1 / axe-core 4.14.1.
