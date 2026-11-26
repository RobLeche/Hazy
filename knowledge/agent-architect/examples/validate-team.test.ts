import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { validateTeam, frontmatter } from "./validate-team.ts";

const repoRoot = fileURLToPath(new URL("../../../", import.meta.url));

test("the real Hazy team in this repo is consistent", () => {
  assert.deepEqual(validateTeam(repoRoot), []);
});

test("prose mentioning disable-model-invocation is not a false positive; frontmatter is", () => {
  assert.equal(frontmatter("---\nname: s\ndisable-model-invocation: true\n---\nx").fm["disable-model-invocation"], "true");
  assert.equal(frontmatter("---\nname: s\n---\nDo not set `disable-model-invocation: true`.").fm["disable-model-invocation"], undefined);
});

test("frontmatter parser reads lists and quoted strings", () => {
  const { fm } = frontmatter('---\nname: x\ndescription: "Use for y"\nskills:\n  - a\n  - b\n---\nbody');
  assert.deepEqual(fm, { name: "x", description: "Use for y", skills: ["a", "b"] });
});
