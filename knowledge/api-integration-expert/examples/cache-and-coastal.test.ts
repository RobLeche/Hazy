import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { cacheKey, hasUsableMarine, metersToFeet, cToF } from "./cache-and-coastal.ts";

const marine = JSON.parse(readFileSync(new URL("./fixtures/marine-tampa-bay-2026-11-25.json", import.meta.url), "utf8"));

test("nearby users share a cache key", () => {
  assert.equal(cacheKey("forecast", 27.9512, -82.4571, 7), cacheKey("forecast", 27.9549, -82.4649, 7));
  assert.equal(cacheKey("forecast", 27.95, -82.46, 7), "forecast:27.95,-82.46:d7");
});

test("real Tampa Bay marine fixture is usable; max wave 2.14 m ≈ 7.0 ft; SST 22.2 °C ≈ 72 °F", () => {
  assert.equal(hasUsableMarine(marine), true);
  assert.equal(metersToFeet(Math.max(...marine.daily.wave_height_max)), 7);
  assert.equal(cToF(22.2), 72);
});

test("inland-style response (all nulls) hides the marine card", () => {
  assert.equal(hasUsableMarine({ hourly: { wave_height: [null, null, null], sea_surface_temperature: [null, null, null] } }), false);
});
