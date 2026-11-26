import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { lintButton, lintHeadline, lintError } from "./copy-lint.ts";

const deck = JSON.parse(readFileSync(new URL("./copy-deck.json", import.meta.url), "utf8"));

test("the shipped copy deck passes every rule", () => {
  const problems = [...deck.buttons.flatMap(lintButton), ...deck.headlines.flatMap(lintHeadline), ...deck.errors.flatMap(lintError)];
  assert.deepEqual(problems, []);
  assert.match(deck.footer, /not a warning service/);
  assert.match(deck.footer, /Open-Meteo\.com/);
});

test("bad copy is caught", () => {
  assert.equal(lintButton("OK").length, 1);
  assert.equal(lintButton("Approve And Deploy").length, 1);
  assert.ok(lintHeadline("73% chance of flooding").length >= 1);
  assert.ok(lintHeadline("High CAPE this afternoon").length >= 1);
  assert.equal(lintError("Invalid user input").length, 2);
});
