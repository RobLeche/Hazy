import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { thunder, flood, type Hour } from "./scoring.ts";

const fx = JSON.parse(readFileSync(new URL("./fixtures/forecast-tampa-2026-11-25.json", import.meta.url), "utf8"));
const h = fx.hourly;
const day1: Hour[] = h.time.slice(0, 24).map((t: string, i: number) => ({
  hour: Number(t.slice(11, 13)), precipMm: h.precipitation[i], prob: h.precipitation_probability[i],
  code: h.weather_code[i], cape: h.cape[i], li: h.lifted_index[i],
}));

test("REAL Tampa 2026-11-25: rainy (93%) but stable → thunder low, flood very low", () => {
  const th = thunder(day1);
  assert.equal(th.level, "low");          // 93% × 0.25 = 23; CAPE 230 and LI −0.8 add nothing
  const fl = flood(day1, null);
  assert.equal(fl.totalMm, 17.6);
  assert.equal(fl.peakRateMm, 5);
  assert.equal(fl.level, "non_threatening");
});

const summer = (over: Partial<Hour> = {}): Hour[] => Array.from({ length: 24 }, (_, hr) => ({
  hour: hr, precipMm: 0, prob: 20, code: 2, cape: 800, li: -1, ...((hr >= 15 && hr <= 18) ? over : {}),
}));

test("GOLDEN Florida summer afternoon: code 95, CAPE 3000, LI −6, 70% → very likely", () => {
  const th = thunder(summer({ code: 95, cape: 3000, li: -6, prob: 70 }));
  assert.equal(th.level, "very_likely");
  assert.ok(th.reasons.includes("Model forecasts thunderstorms"));
});

test("GOLDEN strong cap: CAPE 3000 but CIN 150 and no code 95 → at most possible", () => {
  const th = thunder(summer({ cape: 3000, li: -5, prob: 40, cin: 150 }));
  assert.ok(["low", "possible"].includes(th.level), th.level);
});

test("GOLDEN 52 mm/h burst after 60 mm in the past 48 h → flood high", () => {
  const hours = summer({ precipMm: 4 }); hours[16]!.precipMm = 52;
  assert.equal(flood(hours, 60).level, "high");
});

test("PROPERTY: adding rain never lowers the flood score", () => {
  for (let extra = 0; extra < 120; extra += 7) {
    const a = summer({ precipMm: 3 }); const b = summer({ precipMm: 3 + extra });
    assert.ok(flood(b, 0).score >= flood(a, 0).score);
  }
});

test("hail codes set hail=true", () => assert.equal(thunder(summer({ code: 99 })).hail, true));
