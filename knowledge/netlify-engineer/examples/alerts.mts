// Example 1 — netlify/functions/alerts.mts: NWS proxy with User-Agent, rounded coords, CDN caching, own headers.
// Sources: docs/functions-limits-and-routing.md, docs/headers-and-caching.md (functions must set their own headers),
// docs/environment-variables.md; NWS API requires User-Agent (https://www.weather.gov/documentation/services-web-api).
interface Config { path: string; method?: string[] }

const RELEVANT = /Flood|Thunderstorm|Tornado|Hurricane|Tropical Storm/;

export default async (req: Request): Promise<Response> => {
  const ua = process.env.NWS_USER_AGENT; // read inside the handler
  if (!ua) return Response.json({ error: "server misconfigured", code: "NO_UA" }, { status: 500 });
  const url = new URL(req.url);
  const lat = Number(url.searchParams.get("lat")); const lon = Number(url.searchParams.get("lon"));
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    return Response.json({ error: "lat and lon required", code: "BAD_COORDS" }, { status: 400 });
  }
  const point = `${lat.toFixed(2)},${lon.toFixed(2)}`; // ~1 km; also bounds the cache key space
  const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(`https://api.weather.gov/alerts/active?point=${point}`, {
      headers: { "User-Agent": ua, Accept: "application/geo+json" }, signal: ctrl.signal,
    });
    if (!res.ok) return Response.json({ error: "alerts unavailable", code: `NWS_${res.status}` }, { status: 502, headers: { "Cache-Control": "no-store" } });
    const body = (await res.json()) as { features?: { properties: Record<string, string> }[] };
    const alerts = (body.features ?? []).map((f) => f.properties).filter((p) => RELEVANT.test(p.event ?? ""))
      .map(({ id, event, severity, urgency, headline, onset, ends, areaDesc }) => ({ id, event, severity, urgency, headline, onset, ends, areaDesc }));
    return Response.json(alerts, { headers: {
      "Netlify-CDN-Cache-Control": "public, durable, max-age=120, stale-while-revalidate=60",
      "Cache-Control": "public, max-age=0, must-revalidate", // browsers/SW always revalidate alerts
      "X-Content-Type-Options": "nosniff",
    } });
  } catch {
    return Response.json({ error: "alerts timeout", code: "NWS_TIMEOUT" }, { status: 504, headers: { "Cache-Control": "no-store" } });
  } finally { clearTimeout(t); }
};

export const config: Config = { path: "/api/alerts", method: ["GET"] };
