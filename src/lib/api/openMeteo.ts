// Open-Meteo request builders and a typed, timeout-aware JSON fetcher.
// Ported from knowledge/api-integration-expert/examples/open-meteo-client.ts (tested), extended with flood and geocoding.
// Docs: https://open-meteo.com/en/docs , /en/docs/marine-weather-api , /en/docs/geocoding-api , /en/terms
// ADR 0004: the browser calls these four hosts directly (CORS unverified, see Handoff).
//
// Quota notes (quota-and-cost skill): every URL rounds coordinates to 2 decimals and passes an explicit
// forecast_days and timezone=auto. getJson makes at most 2 HTTP calls per request (one retry on 5xx/429).

import { findState } from "./usStates.ts";

export const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
export const MARINE_URL = "https://marine-api.open-meteo.com/v1/marine";
export const FLOOD_URL = "https://flood-api.open-meteo.com/v1/flood";
export const GEOCODING_URL = "https://geocoding-api.open-meteo.com/v1/search";

/** The only external hosts the browser may call (CSP connect-src, ADR 0004). */
export const OPEN_METEO_HOSTS = [
  "api.open-meteo.com", "marine-api.open-meteo.com", "flood-api.open-meteo.com", "geocoding-api.open-meteo.com",
] as const;

export const HOURLY_VARS = [
  "precipitation", "rain", "showers", "precipitation_probability", "weather_code", "cape",
  "lifted_index", "convective_inhibition", "wind_gusts_10m", "uv_index", "soil_moisture_0_to_1cm", "visibility",
] as const;
export const DAILY_VARS = [
  "weather_code", "precipitation_sum", "precipitation_hours", "precipitation_probability_max",
  "wind_gusts_10m_max", "uv_index_max",
] as const;
export const MARINE_HOURLY_VARS = ["wave_height", "sea_surface_temperature", "sea_level_height_msl"] as const;
export const MARINE_DAILY_VARS = ["wave_height_max"] as const;
/** Variable names from the flood note in docs/01 §2.3 (response shape not recorded yet: see parse.ts parseFlood). */
export const FLOOD_DAILY_VARS = ["river_discharge", "river_discharge_median", "river_discharge_p75", "river_discharge_max"] as const;

export const DEFAULT_FORECAST_DAYS = 7;
export const DEFAULT_PAST_DAYS = 2;
export const GEOCODING_COUNT = 10;
export const GEOCODING_MIN_CHARS = 2;

/** Round to 2 decimals (~1.1 km): stable cache keys and upstream coordinates. */
export const round2 = (n: number): number => Math.round(n * 100) / 100;

function checkCoords(lat: number, lon: number): void {
  if (!(Number.isFinite(lat) && Number.isFinite(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180)) {
    throw new RangeError("invalid coordinates");
  }
}

function checkDays(name: string, n: number, min: number, max: number): void {
  if (!Number.isInteger(n) || n < min || n > max) throw new RangeError(`${name} must be an integer ${min}..${max}`);
}

export function forecastUrl(lat: number, lon: number, forecastDays = DEFAULT_FORECAST_DAYS, pastDays = DEFAULT_PAST_DAYS): string {
  checkCoords(lat, lon);
  checkDays("forecast_days", forecastDays, 1, 16);
  checkDays("past_days", pastDays, 0, 92);
  const p = new URLSearchParams({
    latitude: String(round2(lat)),
    longitude: String(round2(lon)),
    hourly: HOURLY_VARS.join(","),
    daily: DAILY_VARS.join(","),
    timezone: "auto",
    forecast_days: String(forecastDays),
    past_days: String(pastDays), // antecedent rainfall
    // Units stay at the metric defaults (celsius, km/h, mm); the UI converts.
  });
  return `${FORECAST_URL}?${p}`;
}

export function marineUrl(lat: number, lon: number, forecastDays = DEFAULT_FORECAST_DAYS): string {
  checkCoords(lat, lon);
  checkDays("forecast_days", forecastDays, 1, 16);
  const p = new URLSearchParams({
    latitude: String(round2(lat)),
    longitude: String(round2(lon)),
    hourly: MARINE_HOURLY_VARS.join(","),
    daily: MARINE_DAILY_VARS.join(","),
    timezone: "auto",
    forecast_days: String(forecastDays), // ALWAYS explicit: the docs state the default as both 5 and 7
  });
  return `${MARINE_URL}?${p}`;
}

export function floodUrl(lat: number, lon: number, forecastDays = DEFAULT_FORECAST_DAYS): string {
  checkCoords(lat, lon);
  checkDays("forecast_days", forecastDays, 1, 16);
  const p = new URLSearchParams({
    latitude: String(round2(lat)),
    longitude: String(round2(lon)),
    daily: FLOOD_DAILY_VARS.join(","),
    timezone: "auto",
    forecast_days: String(forecastDays), // docs default is 92 days: never rely on it
  });
  return `${FLOOD_URL}?${p}`;
}

/**
 * Geocoding search. `state` (2-letter code or full name) is appended after a comma ("Tampa, FL"), which the docs say
 * narrows results by first-level admin area (docs/01 §2.4). Commas typed by the user are replaced with spaces so the
 * qualifier stays unambiguous. `countryCode=US` is always sent: the Places screen is US-only.
 */
export function geocodingUrl(query: string, state?: string, count = GEOCODING_COUNT): string {
  const q = query.replace(/,/g, " ").replace(/\s+/g, " ").trim();
  if (q.length < GEOCODING_MIN_CHARS) throw new RangeError(`query needs at least ${GEOCODING_MIN_CHARS} characters`);
  checkDays("count", count, 1, 100);
  let name = q;
  if (state !== undefined && state.trim() !== "") {
    const s = findState(state);
    name = `${q}, ${s ? s.code : state.trim()}`;
  }
  const p = new URLSearchParams({ name, count: String(count), language: "en", countryCode: "US" });
  return `${GEOCODING_URL}?${p}`;
}

export class OpenMeteoError extends Error {
  readonly status: number;
  readonly reason: string;
  readonly retryable: boolean;
  constructor(status: number, reason: string, retryable: boolean) {
    super(`Open-Meteo ${status}: ${reason}`);
    this.name = "OpenMeteoError";
    this.status = status;
    this.reason = reason;
    this.retryable = retryable;
  }
}

export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

export interface GetJsonOptions {
  fetchImpl?: FetchLike;
  timeoutMs?: number;
  /** Delay before the single retry. */
  retryDelayMs?: number;
  /** Caller abort (e.g. the previous search keystroke). An aborted call is never retried. */
  signal?: AbortSignal;
}

function reasonOf(body: unknown, fallback: string): string {
  if (typeof body === "object" && body !== null && "reason" in body) return String((body as { reason: unknown }).reason);
  return fallback;
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Fetch JSON with a timeout. Error bodies `{error:true, reason}` become typed errors. One retry on 5xx and 429 only;
 * timeouts and network failures are not retried (status 0, retryable false) so the worst case stays at 2 calls.
 * Status 0 reasons: "timeout", "aborted", "network".
 */
export async function getJson(url: string, opts: GetJsonOptions = {}): Promise<unknown> {
  const fetchImpl: FetchLike = opts.fetchImpl ?? ((u, i) => fetch(u, i));
  const timeoutMs = opts.timeoutMs ?? 4000;
  for (let attempt = 0; attempt < 2; attempt++) {
    const ctrl = new AbortController();
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; ctrl.abort(); }, timeoutMs);
    const onCallerAbort = () => ctrl.abort();
    opts.signal?.addEventListener("abort", onCallerAbort, { once: true });
    if (opts.signal?.aborted) ctrl.abort();
    try {
      let res: Response;
      let body: unknown = null;
      try {
        res = await fetchImpl(url, { signal: ctrl.signal });
        const text = await res.text();
        try { body = text === "" ? null : JSON.parse(text); } catch { body = null; }
      } catch (e) {
        if (e instanceof OpenMeteoError) throw e;
        throw new OpenMeteoError(0, timedOut ? "timeout" : ctrl.signal.aborted ? "aborted" : "network", false);
      }
      if (res.ok) {
        if (body === null) throw new OpenMeteoError(res.status, "response was not valid JSON", false);
        return body;
      }
      const retryable = res.status === 429 || res.status >= 500;
      if (!retryable || attempt === 1) throw new OpenMeteoError(res.status, reasonOf(body, res.statusText), retryable);
      await sleep((opts.retryDelayMs ?? 300) * (attempt + 1));
    } finally {
      clearTimeout(timer);
      opts.signal?.removeEventListener("abort", onCallerAbort);
    }
  }
  throw new Error("unreachable");
}
