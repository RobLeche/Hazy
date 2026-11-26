import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { toHourRows, groupByDay, type ForecastResponse } from "./parse-forecast.ts";

const fx = JSON.parse(readFileSync(new URL("./fixtures/forecast-tampa-2026-11-25.json", import.meta.url), "utf8")) as ForecastResponse;

test("real Tampa fixture: 48 hourly rows in 2 local days", () => {
  const days = groupByDay(toHourRows(fx));
  assert.deepEqual([...days.keys()], ["2026-11-25", "2026-11-26"]);
  assert.equal(days.get("2026-11-25")!.length, 24);
});

test("hourly precipitation sums to the API's daily precipitation_sum (17.6 mm on 2026-11-25)", () => {
  const day = groupByDay(toHourRows(fx)).get("2026-11-25")!;
  const sum = day.reduce((s, r) => s + (r.precipitationMm ?? 0), 0);
  assert.equal(Math.round(sum * 10) / 10, (fx.daily.precipitation_sum as number[])[0]);
});

test("local 00:00 in America/New_York (UTC-5) is 05:00Z", () => {
  const first = toHourRows(fx)[0]!;
  assert.equal(new Date(first.utcMs).toISOString(), "2026-11-25T05:00:00.000Z");
});

test("nulls stay null (no silent zeros)", () => {
  const copy = structuredClone(fx);
  (copy.hourly.cape as (number | null)[])[0] = null;
  assert.equal(toHourRows(copy)[0]!.cape, null);
});
