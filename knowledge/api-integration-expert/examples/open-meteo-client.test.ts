import { test } from "node:test";
import assert from "node:assert/strict";
import { forecastUrl, marineUrl, getJson, OpenMeteoError } from "./open-meteo-client.ts";

test("forecast URL has rounded coords, auto timezone and explicit days", () => {
  const u = new URL(forecastUrl(27.95123, -82.45678));
  assert.equal(u.origin + u.pathname, "https://api.open-meteo.com/v1/forecast");
  assert.equal(u.searchParams.get("latitude"), "27.95");
  assert.equal(u.searchParams.get("longitude"), "-82.46");
  assert.equal(u.searchParams.get("timezone"), "auto");
  assert.equal(u.searchParams.get("past_days"), "2");
  assert.ok(u.searchParams.get("hourly")!.split(",").includes("cape"));
});

test("marine URL always sets forecast_days", () => {
  assert.equal(new URL(marineUrl(27.6, -82.9)).searchParams.get("forecast_days"), "7");
});

test("invalid coordinates are rejected before any request", () => {
  assert.throws(() => forecastUrl(123, 0), RangeError);
});

test("400 error object becomes a non-retryable OpenMeteoError with the API reason", async () => {
  let calls = 0;
  const fake = async () => { calls++; return new Response(JSON.stringify({ error: true, reason: "Cannot initialize WeatherVariable from invalid String value tempeture_2m for key hourly" }), { status: 400 }); };
  await assert.rejects(getJson("x", fake), (e: unknown) => e instanceof OpenMeteoError && e.status === 400 && !e.retryable && /tempeture_2m/.test(e.reason));
  assert.equal(calls, 1);
});

test("503 overloaded (observed for real) is retried once, then succeeds", async () => {
  let calls = 0;
  const fake = async () => (++calls === 1
    ? new Response(JSON.stringify({ error: true, reason: "The service is overloaded" }), { status: 503 })
    : new Response(JSON.stringify({ ok: 1 }), { status: 200 }));
  assert.deepEqual(await getJson<{ ok: number }>("x", fake), { ok: 1 });
  assert.equal(calls, 2);
});
