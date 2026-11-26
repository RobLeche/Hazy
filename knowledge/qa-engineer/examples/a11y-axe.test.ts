// Example 2 — axe scan (WCAG 2.x A/AA tags) that passes on the good page and catches a contrast bug on a bad one.
// Source: docs/playwright-accessibility.md. Needs @axe-core/playwright (devDependency); skips if not installed.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
const req = createRequire(import.meta.url);
const { chromium } = req("playwright");
let AxeBuilder: any = null;
try { AxeBuilder = req("@axe-core/playwright").default; } catch { /* skip */ }
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];
const good = readFileSync(new URL("./site/outlook.html", import.meta.url), "utf8");

for (const scheme of ["light", "dark"] as const) {
  test(`outlook page has no WCAG A/AA violations (${scheme})`, { skip: !AxeBuilder && "install @axe-core/playwright" }, async () => {
    const browser = await chromium.launch();
    try {
      const page = await (await browser.newContext({ colorScheme: scheme })).newPage(); // axe requires newContext() pages
      await page.setContent(good);
      const r = await new AxeBuilder({ page }).withTags(TAGS).analyze();
      assert.deepEqual(r.violations.map((v: { id: string }) => v.id), []);
    } finally { await browser.close(); } // always close, or a failed assertion hangs the run
  });
}

test("a low-contrast badge is caught (color-contrast)", { skip: !AxeBuilder && "install @axe-core/playwright" }, async () => {
  const browser = await chromium.launch();
  try {
  const page = await (await browser.newContext()).newPage();
  await page.setContent(good.replace("--badge-fg:#ffffff", "--badge-fg:#e57373").replace('id="flood" hidden', 'id="flood"').replace('id="flood"></span>', 'id="flood">Flood: High</span>'));
  const r = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  assert.ok(r.violations.some((v: { id: string }) => v.id === "color-contrast"));
  } finally { await browser.close(); }
});
