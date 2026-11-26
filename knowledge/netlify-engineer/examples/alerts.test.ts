import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import handler, { config } from "./alerts.mts";

let seen: { url: string; ua: string | null } | null = null;
beforeEach(() => {
  process.env.NWS_USER_AGENT = "Hazy (https://hazy.netlify.app, ops@example.com)";
  globalThis.fetch = (async (url: string, init: RequestInit) => {
    seen = { url: String(url), ua: new Headers(init.headers).get("user-agent") };
    return Response.json({ features: [
      { properties: { id: "1", event: "Flash Flood Warning", severity: "Severe", urgency: "Immediate", headline: "FFW until 6 PM", onset: "", ends: "", areaDesc: "Hillsborough", extra: "dropped" } },
      { properties: { id: "2", event: "Small Craft Advisory", severity: "Minor" } },
    ] });
  }) as typeof fetch;
});

test("routes at /api/alerts (GET only)", () => assert.deepEqual(config, { path: "/api/alerts", method: ["GET"] }));

test("sends User-Agent, rounds the point, filters and trims, sets CDN cache headers", async () => {
  const res = await handler(new Request("https://x/api/alerts?lat=27.95123&lon=-82.45678"));
  assert.equal(res.status, 200);
  assert.equal(seen!.url, "https://api.weather.gov/alerts/active?point=27.95,-82.46");
  assert.match(seen!.ua!, /^Hazy /);
  assert.deepEqual(await res.json(), [{ id: "1", event: "Flash Flood Warning", severity: "Severe", urgency: "Immediate", headline: "FFW until 6 PM", onset: "", ends: "", areaDesc: "Hillsborough" }]);
  assert.match(res.headers.get("netlify-cdn-cache-control")!, /max-age=120/);
});

test("400 on bad coordinates; 500 if the env var is missing", async () => {
  assert.equal((await handler(new Request("https://x/api/alerts?lat=abc"))).status, 400);
  delete process.env.NWS_USER_AGENT;
  assert.equal((await handler(new Request("https://x/api/alerts?lat=1&lon=1"))).status, 500);
});

test("upstream failure → 502 with no-store (never cache errors)", async () => {
  globalThis.fetch = (async () => new Response("rate limited", { status: 429 })) as typeof fetch;
  const res = await handler(new Request("https://x/api/alerts?lat=27.95&lon=-82.46"));
  assert.equal(res.status, 502);
  assert.equal(res.headers.get("cache-control"), "no-store");
});
