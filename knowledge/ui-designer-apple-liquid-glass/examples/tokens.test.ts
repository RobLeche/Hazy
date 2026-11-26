import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseColor as c, over, ratio, readTokens } from "./contrast.ts";

const css = readFileSync(new URL("./tokens.css", import.meta.url), "utf8");
const light = readTokens(css);
const dark = { ...light, ...readTokens(css, "@media (prefers-color-scheme: dark)") };

test("WCAG reference values: black/white 21:1, #777 on white ≈ 4.48 (fails 4.5)", () => {
  assert.equal(ratio(c("#000000"), c("#ffffff")), 21);
  assert.ok(ratio(c("#777777"), c("#ffffff")) < 4.5);
});

for (const [name, t] of [["light", light], ["dark", dark]] as const) {
  test(`${name}: label and secondary label ≥ 4.5:1 on surfaces`, () => {
    for (const bg of ["--surface", "--surface-grouped"]) {
      assert.ok(ratio(c(t["--label"]!), c(t[bg]!)) >= 4.5, `label on ${bg}`);
      assert.ok(ratio(c(t["--secondary-label"]!), c(t[bg]!)) >= 4.5, `secondary on ${bg}: ${ratio(c(t["--secondary-label"]!), c(t[bg]!))}`);
    }
  });
  test(`${name}: text on glass stays ≥ 4.5:1 over BOTH worst-case content colours (white and black)`, () => {
    for (const content of ["#ffffff", "#000000"]) {
      const glass = over(c(t["--glass-tint"]!), c(content));
      const r = ratio(c(t["--label"]!), glass);
      assert.ok(r >= 4.5, `${name} label on glass over ${content}: ${r}`);
    }
  });
}

test("risk badges: text ≥ 4.5:1 on its fill (theme-independent solid fills)", () => {
  for (const lvl of ["none", "low", "moderate", "high", "extreme"]) {
    const r = ratio(c(light[`--risk-${lvl}-fg`]!), c(light[`--risk-${lvl}-bg`]!));
    assert.ok(r >= 4.5, `${lvl}: ${r}`);
  }
});

test("Apple's 60%-alpha secondary gray would FAIL body-text contrast on white (why we darkened it)", () => {
  assert.ok(ratio(over(c("rgba(60,60,67,0.6)"), c("#ffffff")), c("#ffffff")) < 4.5);
});
