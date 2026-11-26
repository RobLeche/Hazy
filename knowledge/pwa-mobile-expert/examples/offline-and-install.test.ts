// Runs the example site in real Chromium (Playwright) to prove: SW precache + network-first works offline,
// alerts are never served stale, and the custom install button uses the deferred beforeinstallprompt.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
const { chromium } = createRequire(import.meta.url)("playwright"); // pre-installed browser

const dir = new URL("./site/", import.meta.url);
const types: Record<string, string> = { ".html": "text/html", ".js": "text/javascript", ".webmanifest": "application/manifest+json" };
let server: Server; let base = "";
before(async () => {
  server = createServer((req, res) => {
    const path = new URL(req.url!, "http://x").pathname;
    if (path === "/api/forecast") { res.writeHead(200, { "content-type": "application/json" }); return res.end(JSON.stringify({ headline: "Storms likely this afternoon", updated: "10:05" })); }
    if (path === "/api/alerts") { res.writeHead(200, { "content-type": "application/json" }); return res.end("[]"); }
    const file = path === "/" ? "index.html" : path.slice(1);
    try { res.writeHead(200, { "content-type": types[file.slice(file.lastIndexOf("."))] ?? "text/plain" }); res.end(readFileSync(new URL(file, dir))); }
    catch { res.writeHead(404); res.end(); }
  }).listen(0);
  await new Promise((r) => server.once("listening", r));
  base = `http://localhost:${(server.address() as { port: number }).port}`;
});
after(() => server.close());

test("offline: shell and last forecast come from the SW cache; alerts say they can't be checked", async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(base + "/");
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null || navigator.serviceWorker.ready.then(() => true));
  await page.reload(); // now controlled → forecast request goes through the SW and is cached
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
  await page.getByText("Storms likely this afternoon (updated 10:05)").waitFor();
  await ctx.setOffline(true);
  await page.reload();
  assert.equal(await page.locator("#forecast").textContent(), "Storms likely this afternoon (updated 10:05)");
  assert.equal(await page.locator("#alerts").textContent(), "Can't check alerts offline.");
  await browser.close();
});

test("install button appears on beforeinstallprompt and calls prompt() once", async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(base + "/");
  assert.equal(await page.locator("#install").isHidden(), true);
  await page.evaluate(() => {
    const e = new Event("beforeinstallprompt", { cancelable: true }) as Event & { prompt: () => void; userChoice: Promise<{ outcome: string }> };
    (window as unknown as { __prompts: number }).__prompts = 0;
    e.prompt = () => { (window as unknown as { __prompts: number }).__prompts++; };
    e.userChoice = Promise.resolve({ outcome: "accepted" });
    window.dispatchEvent(e);
  });
  await page.locator("#install").click();
  await page.waitForFunction(() => (window as unknown as { __installOutcome?: string }).__installOutcome === "accepted");
  assert.equal(await page.evaluate(() => (window as unknown as { __prompts: number }).__prompts), 1);
  assert.equal(await page.locator("#install").isHidden(), true);
  await browser.close();
});
