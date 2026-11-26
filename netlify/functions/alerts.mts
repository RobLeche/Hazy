// GET /api/alerts?lat=&lon= : NWS active alerts for one point (ADR 0001).
// Functions do not get `_headers`, so every response sets its own headers.
import type { Config } from "@netlify/functions";
import { isNwsAlert, isObject, type AlertsResponse, type NwsAlert } from "../../src/lib/types.ts";

const RELEVANT = /Flood|Thunderstorm|Tornado|Hurricane|Tropical Storm/;
const NWS_TIMEOUT_MS = 8000;

const BASE_HEADERS = { "X-Content-Type-Options": "nosniff" } as const;

function fail(status: number, code: string, error: string, extra: Record<string, string> = {}): Response {
  return Response.json({ error, code }, { status, headers: { ...BASE_HEADERS, ...extra, "Cache-Control": "no-store" } });
}

const strOrNull = (v: unknown): string | null => (typeof v === "string" && v.length > 0 ? v : null);

/** Trim one GeoJSON feature to NwsAlert; null if irrelevant or it fails the shared guard. */
function toAlert(feature: unknown): NwsAlert | null {
  if (!isObject(feature) || !isObject(feature.properties)) return null;
  const p = feature.properties;
  if (typeof p.event !== "string" || !RELEVANT.test(p.event)) return null;
  const alert = {
    id: p.id,
    event: p.event,
    severity: typeof p.severity === "string" ? p.severity : "Unknown",
    urgency: typeof p.urgency === "string" ? p.urgency : "Unknown",
    headline: strOrNull(p.headline),
    onset: strOrNull(p.onset),
    ends: strOrNull(p.ends),
    areaDesc: typeof p.areaDesc === "string" ? p.areaDesc : "",
  };
  return isNwsAlert(alert) ? alert : null;
}

export default async (req: Request): Promise<Response> => {
  if (req.method !== "GET") return fail(405, "METHOD_NOT_ALLOWED", "GET only", { Allow: "GET" });

  const ua = process.env.NWS_USER_AGENT; // read inside the handler, never logged
  if (!ua) return fail(500, "NO_UA", "server misconfigured");

  const params = new URL(req.url).searchParams;
  const rawLat = params.get("lat");
  const rawLon = params.get("lon");
  const lat = rawLat === null || rawLat.trim() === "" ? NaN : Number(rawLat);
  const lon = rawLon === null || rawLon.trim() === "" ? NaN : Number(rawLon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    return fail(400, "BAD_COORDS", "lat and lon required");
  }
  const point = `${lat.toFixed(2)},${lon.toFixed(2)}`; // ~1 km; bounds the cache key space

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), NWS_TIMEOUT_MS);
  try {
    const res = await fetch(`https://api.weather.gov/alerts/active?point=${point}`, {
      headers: { "User-Agent": ua, Accept: "application/geo+json" },
      signal: ctrl.signal,
    });
    // Outside NWS coverage. The exact NWS error shape is UNVERIFIED offline: we map by status only
    // (400/404; the point was already validated above). Client maps code NOT_US to alertsStatus "not_us".
    if (res.status === 400 || res.status === 404) return fail(404, "NOT_US", "point outside NWS coverage");
    if (!res.ok) return fail(502, `NWS_${res.status}`, "alerts unavailable");

    const body: unknown = await res.json();
    const features = isObject(body) && Array.isArray(body.features) ? (body.features as unknown[]) : [];
    const alerts: AlertsResponse = [];
    for (const f of features) {
      const a = toAlert(f);
      if (a) alerts.push(a);
    }
    return Response.json(alerts, {
      headers: {
        ...BASE_HEADERS,
        "Netlify-CDN-Cache-Control": "public, durable, max-age=120, stale-while-revalidate=60",
        "Cache-Control": "public, max-age=0, must-revalidate", // browsers and the SW always revalidate
      },
    });
  } catch (err) {
    if (ctrl.signal.aborted) return fail(504, "NWS_TIMEOUT", "alerts timeout");
    return fail(502, err instanceof SyntaxError ? "NWS_BAD_BODY" : "NWS_FETCH", "alerts unavailable");
  } finally {
    clearTimeout(timer);
  }
};

export const config: Config = { path: "/api/alerts", method: ["GET"] };
