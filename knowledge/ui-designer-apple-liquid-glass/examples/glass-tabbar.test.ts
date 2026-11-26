// Example 2 — Proves the glass tab bar uses blur normally and drops to a solid surface under Reduce Transparency,
// using Chromium's media-feature emulation over CDP (Playwright has no reducedTransparency option).
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright");

let server: Server; let base = "";
before(async () => {
  server = createServer((req, res) => {
    const f = req.url === "/tokens.css" ? "tokens.css" : "glass-tabbar.html";
    res.writeHead(200, { "content-type": f.endsWith(".css") ? "text/css" : "text/html" });
    res.end(readFileSync(new URL(`./${f}`, import.meta.url)));
  }).listen(0);
  await new Promise((r) => server.once("listening", r));
  base = `http://localhost:${(server.address() as { port: number }).port}`;
});
after(() => server.close());

const tabbarStyle = (page: any) => page.locator("nav.tabbar").evaluate((el: Element) => {
  const s = getComputedStyle(el); return { filter: s.backdropFilter, bg: s.backgroundColor };
});

test("glass by default; solid under prefers-reduced-transparency; targets ≥ 44px", async () => {
  const browser = await chromium.launch();
  try {
    const page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
    await page.goto(base + "/");
    const normal = await tabbarStyle(page);
    assert.match(normal.filter, /blur\(20px\)/);
    assert.match(normal.bg, /rgba\(255, 255, 255, 0\.72\)/);
    const box = await page.getByRole("link", { name: "Places" }).boundingBox();
    assert.ok(box.width >= 44 && box.height >= 44);
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-transparency", value: "reduce" }] });
    const reduced = await tabbarStyle(page);
    assert.match(reduced.filter, /blur\(0px\)/);
    assert.equal(reduced.bg, "rgb(242, 242, 247)");
  } finally { await browser.close(); }
});
