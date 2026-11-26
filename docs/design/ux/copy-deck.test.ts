// Lints docs/design/ux/copy-deck.json with the rules in
// knowledge/ux-designer-apple-hig/examples/copy-lint.ts.
// Run: node --test docs/design/ux/copy-deck.test.ts   (Node >= 22.18)
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { lintButton, lintHeadline, lintError } from "../../../knowledge/ux-designer-apple-hig/examples/copy-lint.ts";

const deck = JSON.parse(readFileSync(new URL("./copy-deck.json", import.meta.url), "utf8"));

// copy-lint.ts has a closed verb list. These verbs are used by the v1 deck and are added here.
// Proposal: agent-architect adds them to VERBS in copy-lint.ts, then this list can go.
const EXTRA_VERBS = new Set(["change", "remove", "undo", "choose", "dismiss", "hide", "show", "stay", "send", "stop", "continue", "run", "reject", "go", "open"]);

function lintButtonV1(label: string): string[] {
  const first = label.split(/\s+/)[0]!.toLowerCase();
  return lintButton(label).filter((p) => !(p.startsWith("button should start with a verb") && EXTRA_VERBS.has(first)));
}

const strings = (o: unknown): string[] =>
  typeof o === "string" ? [o] : o && typeof o === "object" ? Object.values(o).flatMap(strings) : [];

test("every button passes", () => {
  assert.deepEqual(Object.values<string>(deck.buttons).flatMap(lintButtonV1), []);
});

test("every headline passes for every {when}", () => {
  const whens = Object.values<string>(deck.headlines.when);
  const templates = [...strings(deck.headlines.thunder), ...strings(deck.headlines.flood)];
  const filled = templates.flatMap((t) => whens.map((w) => t.replace("{when}", w)));
  assert.ok(filled.length > 0);
  assert.deepEqual(filled.flatMap(lintHeadline), []);
});

test("every error passes", () => {
  assert.deepEqual(Object.values<string>(deck.errors).flatMap(lintError), []);
});

test("jargon stays under why.technical*", () => {
  const jargon = /\b(CAPE|lifted index|QPF|FFG|WMO|convective)\b/i;
  const { why, _meta, ...rest } = deck;
  assert.ok(_meta);
  assert.deepEqual(strings(rest).filter((s) => jargon.test(s)), []);
  assert.ok(why.technicalTitle);
});

test("no percentages or alarmist words in user-facing strings", () => {
  const all = strings({ ...deck, _meta: undefined });
  assert.deepEqual(all.filter((s) => /\d+ ?%|percent|catastrophic/i.test(s)), []);
});

test("footer carries the required disclaimers", () => {
  assert.match(deck.footer.full, /not a warning service/);
  assert.match(deck.footer.full, /Open-Meteo\.com/);
});
