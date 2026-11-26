// Example 2 — HMAC-signed session cookie (HttpOnly; Secure; SameSite=Strict) + CSRF check for state-changing requests.
// Sources: docs/owasp-session-and-csrf.md
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const b64u = (b: Buffer | string) => Buffer.from(b).toString("base64url");
const mac = (secret: string, data: string) => createHmac("sha256", secret).update(data).digest();

export function issueSession(secret: string, now = Date.now(), absoluteMs = 12 * 3600_000) {
  const payload = { sid: randomBytes(16).toString("hex"), iat: now, exp: now + absoluteMs }; // 128-bit sid (≥ 64 bits required)
  const body = b64u(JSON.stringify(payload));
  const cookie = `${body}.${b64u(mac(secret, body))}`;
  const csrf = b64u(mac(secret, `csrf:${payload.sid}`));
  return {
    setCookie: `hazy_session=${cookie}; HttpOnly; Secure; SameSite=Strict; Path=/api; Max-Age=${Math.floor(absoluteMs / 1000)}`,
    csrf, payload,
  };
}

export function readSession(secret: string, cookieHeader: string | null, now = Date.now()) {
  const raw = cookieHeader?.split(/;\s*/).find((c) => c.startsWith("hazy_session="))?.slice("hazy_session=".length);
  if (!raw) return null;
  const [body, sig] = raw.split(".");
  if (!body || !sig) return null;
  const expected = mac(secret, body); const given = Buffer.from(sig, "base64url");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as { sid: string; exp: number };
  return payload.exp > now ? payload : null;
}

/** OWASP: Sec-Fetch-Site first, Origin fallback, plus a custom header bound to the session. */
export function csrfOk(req: Request, secret: string, sid: string, siteOrigin: string): boolean {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return true;
  const sfs = req.headers.get("sec-fetch-site");
  if (sfs !== null && sfs !== "same-origin") return false;
  if (sfs === null && req.headers.get("origin") !== siteOrigin) return false;
  const token = req.headers.get("x-hazy-csrf") ?? "";
  const expected = mac(secret, `csrf:${sid}`); const given = Buffer.from(token, "base64url");
  return given.length === expected.length && timingSafeEqual(given, expected);
}
