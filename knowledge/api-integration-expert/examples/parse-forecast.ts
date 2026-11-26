// Example 2 — Turn the parallel-array response into typed, null-safe rows grouped by local day.
// Docs: https://open-meteo.com/en/docs ("precipitation … sum of the preceding hour"; timezone/utc_offset_seconds)

export interface ForecastResponse {
  utc_offset_seconds: number;
  timezone: string;
  hourly: { time: string[] } & Record<string, (number | null)[] | string[]>;
  daily: { time: string[] } & Record<string, (number | null)[] | string[]>;
}

export interface HourRow {
  localTime: string;          // "2026-11-25T15:00" wall-clock in the location's zone (no offset!)
  utcMs: number;              // absolute instant, computed with utc_offset_seconds
  date: string;               // "2026-11-25" local day
  hour: number;               // 0..23 local
  precipitationMm: number | null; // covers the PRECEDING hour
  precipProbability: number | null;
  weatherCode: number | null;
  cape: number | null;
  liftedIndex: number | null;
}

function col(h: ForecastResponse["hourly"], name: string, i: number): number | null {
  const arr = h[name] as (number | null)[] | undefined;
  const v = arr?.[i];
  return typeof v === "number" && Number.isFinite(v) ? v : null; // never coerce null → 0
}

export function toHourRows(r: ForecastResponse): HourRow[] {
  return r.hourly.time.map((t, i) => {
    // Parse as UTC wall-clock, then subtract the offset to get the real instant.
    const utcMs = Date.parse(`${t}:00Z`) - r.utc_offset_seconds * 1000;
    return {
      localTime: t, utcMs, date: t.slice(0, 10), hour: Number(t.slice(11, 13)),
      precipitationMm: col(r.hourly, "precipitation", i),
      precipProbability: col(r.hourly, "precipitation_probability", i),
      weatherCode: col(r.hourly, "weather_code", i),
      cape: col(r.hourly, "cape", i),
      liftedIndex: col(r.hourly, "lifted_index", i),
    };
  });
}

export function groupByDay(rows: HourRow[]): Map<string, HourRow[]> {
  const m = new Map<string, HourRow[]>();
  for (const row of rows) m.set(row.date, [...(m.get(row.date) ?? []), row]);
  return m;
}
