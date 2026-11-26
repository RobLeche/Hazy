import { test } from "node:test";
import assert from "node:assert/strict";
import { applyNwsOverride, floodHeadline } from "./nws-override-and-wording.ts";

test("Flash Flood Warning lifts a low score to high, sourced to NWS", () => {
  const r = applyNwsOverride("low", [{ event: "Flash Flood Warning" }]);
  assert.deepEqual(r, { level: "high", source: "nws", label: "Flash Flood Warning" });
  assert.equal(floodHeadline(r.level, "this afternoon", r.source, r.label), "National Weather Service: Flash Flood Warning");
});

test("Flood Watch never lowers an already-extreme score", () => {
  assert.equal(applyNwsOverride("extreme", [{ event: "Flood Watch" }]).level, "extreme");
});

test("Hazy headline uses likelihood words, no fake percentages", () => {
  const h = floodHeadline("moderate", "tonight", "hazy")!;
  assert.equal(h, "Flooding possible tonight");
  assert.doesNotMatch(h, /%/);
});
