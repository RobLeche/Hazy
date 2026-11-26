// Example 3 — Cache key for proxy/CDN/SW caching, and the "is this place coastal?" check for the marine card.
// Docs: https://open-meteo.com/en/terms (shared quota) ; https://open-meteo.com/en/docs/marine-weather-api (inland unreliable)
import { round2 } from "./open-meteo-client.ts";

export function cacheKey(kind: "forecast" | "marine", lat: number, lon: number, days: number): string {
  return `${kind}:${round2(lat).toFixed(2)},${round2(lon).toFixed(2)}:d${days}`;
}

export const CDN_HEADERS = {
  forecast: "public, durable, max-age=900, stale-while-revalidate=300", // models update ≥ hourly
  alerts: "public, durable, max-age=120, stale-while-revalidate=60",
} as const;

interface MarineResponse { hourly: { wave_height: (number | null)[]; sea_surface_temperature: (number | null)[] } }

/** Show the marine card only if the model returned real values for most hours. */
export function hasUsableMarine(r: MarineResponse, minShare = 0.8): boolean {
  const w = r.hourly.wave_height;
  if (w.length === 0) return false;
  const ok = w.filter((v) => typeof v === "number").length;
  return ok / w.length >= minShare;
}

export const metersToFeet = (m: number): number => Math.round(m * 3.28084 * 10) / 10;
export const cToF = (c: number): number => Math.round((c * 9) / 5 + 32);
