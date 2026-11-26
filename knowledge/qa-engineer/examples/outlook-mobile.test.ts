// Example 1 — Mobile e2e: device emulation, geolocation, API mocking with page.route, dark mode, role-based locators.
// Sources: docs/playwright-emulation.md, docs/playwright-network-and-service-workers.md, docs/assertions-and-locators.md
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
const { chromium, devices } = createRequire(import.meta.url)("playwright");

let server: Server; let base = "";
before(async () => {
  server = createServer((req, res) => { res.writeHead(200, { "content-type": "text/html" }); res.end(readFileSync(new URL("./site/outlook.html", import.meta.url))); }).listen(0);
  await new Promise((r) => server.once("listening", r));
  base = `http://localhost:${(server.address() as { port: number }).port}`;
});
after(() => server.close());

test("iPhone descriptor defaults to WebKit (so we override to Chromium here; real iOS needs a device)", () => {
  assert.equal(devices["iPhone 15"].defaultBrowserType, "webkit");
});

test("Use my location → mocked outlook shows place, headline and a TEXT risk label", async () => {
  const browser = await chromium.launch();
  const { defaultBrowserType, ...iphone } = devices["iPhone 15"];
  const ctx = await browser.newContext({ ...iphone, geolocation: { latitude: 27.9506, longitude: -82.4572 }, permissions: ["geolocation"],
    colorScheme: "dark", reducedMotion: "reduce", timezoneId: "America/New_York", serviceWorkers: "block" });
  const page = await ctx.newPage();
  const requested: string[] = [];
  await page.route("**/api/outlook?*", async (route) => { requested.push(route.request().url()); await route.fulfill({ json: { place: "Tampa, FL", headline: "Storms likely this afternoon", flood: "Moderate" } }); });
  await page.goto(base + "/");
  await page.getByRole("button", { name: "Use my location" }).tap();
  await page.getByRole("status").getByText("Tampa, FL: Storms likely this afternoon").waitFor();
  assert.equal(await page.locator("#flood").textContent(), "Flood: Moderate");       // label in text, not colour only
  assert.match(requested[0]!, /lat=27\.95&lon=-82\.46/);                              // rounded coords sent
  assert.equal(await page.evaluate(() => matchMedia("(prefers-color-scheme: dark)").matches), true);
  assert.equal(page.viewportSize()!.width, 393);
  await browser.close();
});

test("geolocation denied → helpful message, no request made", async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ permissions: [], serviceWorkers: "block" });
  const page = await ctx.newPage(); let called = false;
  await page.route("**/api/outlook?*", (r) => { called = true; return r.abort(); });
  await page.goto(base + "/");
  await page.getByRole("button", { name: "Use my location" }).click();
  await page.getByText("Location is off. Search for a place instead.").waitFor();
  assert.equal(called, false);
  await browser.close();
});
