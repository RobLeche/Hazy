import { test } from "node:test";
import assert from "node:assert/strict";
import { issueSession, readSession, csrfOk } from "./session-csrf.ts";

const SECRET = "x".repeat(32); const ORIGIN = "https://hazy.netlify.app";
const cookieOf = (setCookie: string) => setCookie.split(";")[0]!;

test("cookie has the mandatory attributes and round-trips", () => {
  const s = issueSession(SECRET, 1000);
  assert.match(s.setCookie, /HttpOnly; Secure; SameSite=Strict; Path=\/api/);
  assert.equal(readSession(SECRET, cookieOf(s.setCookie), 2000)?.sid, s.payload.sid);
});

test("tampered payload, wrong secret and expired sessions are rejected", () => {
  const s = issueSession(SECRET, 1000); const c = cookieOf(s.setCookie);
  const [body, sig] = c.split("=")[1]!.split(".");
  const forged = Buffer.from(JSON.stringify({ sid: "attacker", exp: 9e15 })).toString("base64url");
  assert.equal(readSession(SECRET, `hazy_session=${forged}.${sig}`, 2000), null);
  assert.equal(readSession("y".repeat(32), c, 2000), null);
  assert.equal(readSession(SECRET, c, 1000 + 13 * 3600_000), null);
  assert.ok(body);
});

test("CSRF: same-origin + token passes; cross-site, foreign Origin or missing token fail", () => {
  const s = issueSession(SECRET);
  const req = (h: Record<string, string>) => new Request(`${ORIGIN}/api/proposals/p1/approve`, { method: "POST", headers: h });
  assert.equal(csrfOk(req({ "sec-fetch-site": "same-origin", "x-hazy-csrf": s.csrf }), SECRET, s.payload.sid, ORIGIN), true);
  assert.equal(csrfOk(req({ "sec-fetch-site": "cross-site", "x-hazy-csrf": s.csrf }), SECRET, s.payload.sid, ORIGIN), false);
  assert.equal(csrfOk(req({ origin: "https://evil.example", "x-hazy-csrf": s.csrf }), SECRET, s.payload.sid, ORIGIN), false);
  assert.equal(csrfOk(req({ origin: ORIGIN }), SECRET, s.payload.sid, ORIGIN), false);
  assert.equal(csrfOk(req({ origin: ORIGIN, "x-hazy-csrf": s.csrf }), SECRET, s.payload.sid, ORIGIN), true); // legacy browser fallback
});
