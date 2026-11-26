import { test } from "node:test";
import assert from "node:assert/strict";
import { scryptSync } from "node:crypto";
import { hashPassword, verifyPassword } from "./password-hash.ts";

test("hash uses OWASP minimum params and verifies", () => {
  const h = hashPassword("correct horse battery staple");
  assert.match(h, /^scrypt\$131072\$8\$1\$/);
  assert.equal(verifyPassword("correct horse battery staple", h), true);
  assert.equal(verifyPassword("wrong", h), false);
});

test("same password → different hashes (random salt)", () => {
  assert.notEqual(hashPassword("x"), hashPassword("x"));
});

test("Node's default maxmem is too small for N=2^17 (why we pass maxmem)", () => {
  assert.throws(() => scryptSync("x", "salt", 32, { N: 2 ** 17, r: 8, p: 1 }));
});

test("malformed stored value fails closed", () => assert.equal(verifyPassword("x", "plaintext"), false));
