import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { parseHeaders } from "./headers-check.ts";

const rules = parseHeaders(readFileSync(new URL("./site/_headers", import.meta.url), "utf8"));

test("site-wide security headers present", () => {
  const all = rules.get("/*")!;
  assert.match(all.get("content-security-policy")!, /frame-ancestors 'none'/);
  assert.match(all.get("content-security-policy")!, /connect-src 'self' https:\/\/api\.open-meteo\.com/);
  assert.equal(all.get("x-content-type-options"), "nosniff");
});

test("sw.js is no-cache; hashed assets immutable", () => {
  assert.equal(rules.get("/sw.js")!.get("cache-control"), "no-cache");
  assert.match(rules.get("/assets/*")!.get("cache-control")!, /immutable/);
});

test("repeated header names concatenate (documented multi-value behaviour)", () => {
  const r = parseHeaders("/*\n  cache-control: max-age=0\n  cache-control: no-cache\n");
  assert.equal(r.get("/*")!.get("cache-control"), "max-age=0,no-cache");
});
