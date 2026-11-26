// Example 1 — scrypt password hashing with OWASP's minimum parameters (N=2^17, r=8, p=1), timing-safe verify.
// Source: docs/owasp-password-storage.md
import { scryptSync, randomBytes, timingSafeEqual } from "node:crypto";

const N = 2 ** 17, r = 8, p = 1, KEYLEN = 32;
const MAXMEM = 256 * 1024 * 1024; // needs > 128*N*r = 128 MiB; Node's default maxmem (32 MiB) would throw

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password.normalize("NFKC"), salt, KEYLEN, { N, r, p, maxmem: MAXMEM });
  return `scrypt$${N}$${r}$${p}$${salt.toString("base64")}$${hash.toString("base64")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [, n, rr, pp, saltB64, hashB64] = parts as [string, string, string, string, string, string];
  const expected = Buffer.from(hashB64, "base64");
  const actual = scryptSync(password.normalize("NFKC"), Buffer.from(saltB64, "base64"), expected.length,
    { N: Number(n), r: Number(rr), p: Number(pp), maxmem: MAXMEM });
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
