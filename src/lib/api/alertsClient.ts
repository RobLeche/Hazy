// Client for our own GET /api/alerts (ADR 0001; netlify/functions/alerts.mts). Never talks to api.weather.gov (the NWS needs a
// User-Agent that browsers cannot set). Alerts are never cached here or in the service worker (cache: "no-store").
//
// Contract (coordinator update): 200 -> bare NwsAlert[] (empty array = checked, no alerts). 404 with code NOT_US -> not_us.
// Any other non-200, invalid body, network error, timeout or offline -> "unavailable". Never "no alerts" on failure.
// UNVERIFIED: the real NWS response for a non-US point (not testable here); the function's NOT_US mapping is taken from the brief.

import type { AlertsStatus, NwsAlert, Place } from "../types.ts";
import { isAlertsResponse, isApiError } from "../types.ts";
import { round2 } from "./openMeteo.ts";

export interface AlertsResult {
  status: AlertsStatus;
  alerts: NwsAlert[];
}

export interface FetchAlertsOptions {
  /** ISO country when known (geocoding). Non-"US" short-circuits to not_us without a request. */
  countryCode?: string;
  fetchImpl?: (url: string, init?: RequestInit) => Promise<Response>;
  timeoutMs?: number;
  signal?: AbortSignal;
}

/**
 * US detection (documented choice): prefer `country_code` (geocoding results always have one). For a device location,
 * where there is no country code, use rough bounding boxes for CONUS, Alaska, Hawaii and Puerto Rico / USVI. The CONUS box
 * also covers southern Canada and northern Mexico, so a border-area false positive costs one /api/alerts call, which then
 * answers NOT_US or "unavailable" (the safe direction: the UI says alerts could not be checked, never "no alerts").
 * Guam, American Samoa and the western Aleutians (past 180 degrees) are not covered.
 */
const US_BOXES: readonly (readonly [latMin: number, latMax: number, lonMin: number, lonMax: number])[] = [
  [24.4, 49.5, -125.0, -66.9], // contiguous US
  [51.0, 71.5, -170.0, -129.9], // Alaska
  [18.8, 22.4, -160.6, -154.7], // Hawaii
  [17.6, 18.7, -67.4, -64.5], // Puerto Rico and US Virgin Islands
];

export function isLikelyUs(lat: number, lon: number): boolean {
  return US_BOXES.some(([a, b, c, d]) => lat >= a && lat <= b && lon >= c && lon <= d);
}

/** Device location as a Place. Reverse geocoding is unverified, so the name is generic. Coordinates are rounded for privacy. */
export function currentLocationPlace(lat: number, lon: number, name = "Current location", countryCode?: string): Place {
  const cc = countryCode !== undefined && /^[A-Z]{2}$/.test(countryCode) ? countryCode : isLikelyUs(lat, lon) ? "US" : "ZZ"; // ZZ = unknown, non-US
  return { name, country_code: cc, lat: round2(lat), lon: round2(lon), timezone: "auto" };
}

const unavailable = (): AlertsResult => ({ status: "unavailable", alerts: [] });

export async function fetchAlerts(lat: number, lon: number, opts: FetchAlertsOptions = {}): Promise<AlertsResult> {
  if (!(Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180)) return unavailable();
  if (opts.countryCode !== undefined ? opts.countryCode !== "US" : !isLikelyUs(lat, lon)) return { status: "not_us", alerts: [] };

  const fetchImpl = opts.fetchImpl ?? ((u, i) => fetch(u, i));
  const url = `/api/alerts?lat=${round2(lat)}&lon=${round2(lon)}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 10_000); // the function's own NWS timeout is 8 s
  const onAbort = () => ctrl.abort();
  opts.signal?.addEventListener("abort", onAbort, { once: true });
  try {
    const res = await fetchImpl(url, { signal: ctrl.signal, cache: "no-store" });
    let body: unknown = null;
    try { body = await res.json(); } catch { body = null; }
    if (res.status === 404 && isApiError(body) && body.code === "NOT_US") return { status: "not_us", alerts: [] };
    if (res.status !== 200 || !isAlertsResponse(body)) return unavailable();
    return { status: "ok", alerts: body };
  } catch {
    return unavailable(); // offline, network error, abort or timeout
  } finally {
    clearTimeout(timer);
    opts.signal?.removeEventListener("abort", onAbort);
  }
}
