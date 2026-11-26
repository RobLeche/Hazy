// Example 1 — Build Open-Meteo requests and handle errors correctly.
// Docs: https://open-meteo.com/en/docs (params, units, error object, 400) ; https://open-meteo.com/en/terms (limits)

export const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";
export const MARINE_URL = "https://marine-api.open-meteo.com/v1/marine";

export const HOURLY_VARS = [
  "precipitation", "rain", "showers", "precipitation_probability", "weather_code", "cape",
  "lifted_index", "convective_inhibition", "wind_gusts_10m", "uv_index", "soil_moisture_0_to_1cm", "visibility",
] as const;
export const DAILY_VARS = [
  "weather_code", "precipitation_sum", "precipitation_hours", "precipitation_probability_max",
  "wind_gusts_10m_max", "uv_index_max",
] as const;

/** Round to 2 decimals (~1.1 km): the cache key and upstream coordinates stay stable across nearby users. */
export const round2 = (n: number): number => Math.round(n * 100) / 100;

export function forecastUrl(lat: number, lon: number, forecastDays = 7, pastDays = 2): string {
  if (!(lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180)) throw new RangeError("invalid coordinates");
  const p = new URLSearchParams({
    latitude: String(round2(lat)),
    longitude: String(round2(lon)),
    hourly: HOURLY_VARS.join(","),
    daily: DAILY_VARS.join(","),
    timezone: "auto",                 // daily boundaries in the location's local day
    forecast_days: String(forecastDays), // max 16
    past_days: String(pastDays),         // antecedent rainfall
    // units left at metric defaults (celsius, kmh, mm); the UI converts.
  });
  return `${FORECAST_URL}?${p}`;
}

export function marineUrl(lat: number, lon: number, forecastDays = 7): string {
  const p = new URLSearchParams({
    latitude: String(round2(lat)), longitude: String(round2(lon)),
    hourly: "wave_height,sea_surface_temperature,sea_level_height_msl",
    daily: "wave_height_max",
    timezone: "auto",
    forecast_days: String(forecastDays), // ALWAYS explicit: docs disagree on the default (5 vs 7)
  });
  return `${MARINE_URL}?${p}`;
}

export class OpenMeteoError extends Error {
  readonly status: number;
  readonly reason: string;
  readonly retryable: boolean;
  constructor(status: number, reason: string, retryable: boolean) {
    super(`Open-Meteo ${status}: ${reason}`);
    this.status = status; this.reason = reason; this.retryable = retryable;
  }
}

type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

/** Fetch JSON with a timeout; turn {error:true, reason} bodies into typed errors; retry once on 5xx/429. */
export async function getJson<T>(url: string, fetchImpl: FetchLike = fetch, timeoutMs = 4000): Promise<T> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetchImpl(url, { signal: ctrl.signal });
      const body: unknown = await res.json();
      if (res.ok) return body as T;
      const reason = typeof body === "object" && body !== null && "reason" in body ? String((body as { reason: unknown }).reason) : res.statusText;
      const retryable = res.status === 429 || res.status >= 500;
      if (!retryable || attempt === 1) throw new OpenMeteoError(res.status, reason, retryable);
      await new Promise((r) => setTimeout(r, 300 * (attempt + 1)));
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error("unreachable");
}
