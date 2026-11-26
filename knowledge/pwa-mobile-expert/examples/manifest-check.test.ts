import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { installProblems } from "./manifest-check.ts";

const good = JSON.parse(readFileSync(new URL("./site/manifest.webmanifest", import.meta.url), "utf8"));

test("Hazy manifest passes every check", () => assert.deepEqual(installProblems(good), []));

test("missing 512 icon and minimal-ui are reported", () => {
  const bad = { ...good, display: "minimal-ui", icons: good.icons.filter((i: { sizes: string }) => i.sizes !== "512x512") };
  const p = installProblems(bad);
  assert.ok(p.includes("icons must include 512x512"));
  assert.ok(p.some((x) => x.startsWith("Hazy: display")));
});
