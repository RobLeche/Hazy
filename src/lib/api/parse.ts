// Edge parsers: unknown JSON from Open-Meteo -> typed, null-safe data (typescript-strict skill).
// Ported from knowledge/api-integration-expert/examples/parse-forecast.ts and cache-and-coastal.ts (tested).
// Rules: a missing or null upstream value stays null (never 0). Malformed structure throws ParseError.
// Times: Open-Meteo returns local wall-clock strings with no offset; utcMs = wall clock as UTC minus utc_offset_seconds.
// Open-Meteo applies ONE fixed utc_offset_seconds to the whole range and ignores DST changes inside it
// (https://open-meteo.com/en/docs), so hours after a DST switch can be off by one hour. Accepted for daily outlooks.

import type { HourPoint, MarineSummary, Place, RainSummary } from "../types.ts";
import { isHourPoint, isObject, isPlace } from "../types.ts";
import { findState } from "./usStates.ts";

export class ParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ParseError";
  }
}

const LOCAL_HOUR_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

type Columns = Record<string, unknown>;

/** Multi-location requests return a list; single ones an object. Normalise to an array of objects. */
export function normaliseLocations(raw: unknown): Record<string, unknown>[] {
  const list = Array.isArray(raw) ? raw : [raw];
  if (list.length === 0 || !list.every(isObject)) throw new ParseError("expected an object or a non-empty list of objects");
  return list;
}

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null; // null stays null, never 0
}

function column(block: Columns, name: string, i: number): number | null {
  const arr = block[name];
  return Array.isArray(arr) ? num(arr[i]) : null; // variable not requested or not returned -> null
}

function timesOf(block: unknown, what: string, re: RegExp): string[] {
  if (!isObject(block) || !Array.isArray(block.time) || !block.time.every((t) => typeof t === "string" && re.test(t))) {
    throw new ParseError(`${what}.time missing or malformed`);
  }
  return block.time as string[];
}

function offsetOf(r: Record<string, unknown>): number {
  const o = r.utc_offset_seconds;
  if (typeof o !== "number" || !Number.isFinite(o)) throw new ParseError("utc_offset_seconds missing");
  return o;
}

function pickLocation(raw: unknown, index: number): Record<string, unknown> {
  const loc = normaliseLocations(raw)[index];
  if (loc === undefined) throw new ParseError(`no location at index ${index}`);
  return loc;
}

/* ------------------------------ forecast ------------------------------ */

export interface DailyForecast {
  /** Local day "YYYY-MM-DD". */
  date: string;
  weatherCode: number | null;
  rain: RainSummary;
  precipitationHours: number | null;
  gustMaxKmh: number | null;
  uvMax: number | null;
}

export interface ParsedForecast {
  /** Grid-cell coordinates returned by Open-Meteo (not the request). */
  lat: number;
  lon: number;
  timezone: string;
  utcOffsetSeconds: number;
  /** Every hour in the response, including past_days, ascending. */
  hours: HourPoint[];
  /** Every day in the response, including past_days, ascending. */
  daily: DailyForecast[];
  /** Local date of `nowMs` in the place's zone; days before it are antecedent context only. */
  todayDate: string;
}

export interface ParseForecastOptions {
  /** Which location to take from a multi-location list. */
  index?: number;
  /** "Now" in epoch ms (injectable for tests). */
  nowMs?: number;
}

export function parseForecast(raw: unknown, opts: ParseForecastOptions = {}): ParsedForecast {
  const r = pickLocation(raw, opts.index ?? 0);
  const offset = offsetOf(r);
  const times = timesOf(r.hourly, "hourly", LOCAL_HOUR_RE);
  const h = r.hourly as Columns;

  const hours: HourPoint[] = times.map((t, i) => {
    const point: HourPoint = {
      localTime: t,
      utcMs: Date.parse(`${t}:00Z`) - offset * 1000,
      date: t.slice(0, 10),
      hour: Number(t.slice(11, 13)),
      precipitationMm: column(h, "precipitation", i), // covers the PRECEDING hour
      precipProbability: column(h, "precipitation_probability", i),
      weatherCode: column(h, "weather_code", i),
      cape: column(h, "cape", i),
      liftedIndex: column(h, "lifted_index", i),
      convectiveInhibition: column(h, "convective_inhibition", i),
      windGustsKmh: column(h, "wind_gusts_10m", i),
      uvIndex: column(h, "uv_index", i),
      soilMoisture0to1cm: column(h, "soil_moisture_0_to_1cm", i),
    };
    if (!isHourPoint(point)) throw new ParseError(`hourly row ${i} (${t}) failed validation`);
    return point;
  });

  const dailyTimes = r.daily === undefined ? [] : timesOf(r.daily, "daily", /^\d{4}-\d{2}-\d{2}$/);
  const d = (r.daily ?? {}) as Columns;
  const daily: DailyForecast[] = dailyTimes.map((date, i) => {
    const dayHours = hours.filter((p) => p.date === date);
    const rates = dayHours.map((p) => p.precipitationMm).filter((v): v is number => v !== null);
    return {
      date,
      weatherCode: column(d, "weather_code", i),
      rain: {
        totalMm: column(d, "precipitation_sum", i),
        maxRateMmH: rates.length > 0 ? Math.max(...rates) : null, // null when no hourly data, not 0
        probMax: column(d, "precipitation_probability_max", i),
      },
      precipitationHours: column(d, "precipitation_hours", i),
      gustMaxKmh: column(d, "wind_gusts_10m_max", i),
      uvMax: column(d, "uv_index_max", i),
    };
  });

  const nowMs = opts.nowMs ?? Date.now();
  const todayDate = new Date(nowMs + offset * 1000).toISOString().slice(0, 10);

  return {
    lat: num(r.latitude) ?? Number.NaN,
    lon: num(r.longitude) ?? Number.NaN,
    timezone: typeof r.timezone === "string" ? r.timezone : "GMT",
    utcOffsetSeconds: offset,
    hours,
    daily,
    todayDate,
  };
}

export interface PastRain {
  /** Sum over hours that have data, mm; null when fewer than `minShare` of the window's hours have data. */
  mm: number | null;
  hoursWithData: number;
  windowHours: number;
}

/**
 * Antecedent rain: sum of hourly `precipitation` in the window ending at `nowMs` (default 48 h). Each hour's value covers the
 * PRECEDING hour, so hours with utcMs in (now - window, now] are summed. Null-safe: missing hours are skipped, and the
 * result is null when too few hours have data (instead of reporting a misleading 0).
 */
export function pastRain(hours: readonly HourPoint[], nowMs: number, windowHours = 48, minShare = 0.5): PastRain {
  const start = nowMs - windowHours * 3_600_000;
  const inWindow = hours.filter((p) => p.utcMs > start && p.utcMs <= nowMs);
  const withData = inWindow.filter((p) => p.precipitationMm !== null);
  const enough = withData.length >= Math.ceil(windowHours * minShare);
  return {
    mm: enough ? withData.reduce((s, p) => s + (p.precipitationMm ?? 0), 0) : null,
    hoursWithData: withData.length,
    windowHours,
  };
}

/** Group hours by local date, preserving order. */
export function groupByDay(hours: readonly HourPoint[]): Map<string, HourPoint[]> {
  const m = new Map<string, HourPoint[]>();
  for (const p of hours) {
    const list = m.get(p.date);
    if (list) list.push(p);
    else m.set(p.date, [p]);
  }
  return m;
}

/* ------------------------------- marine ------------------------------- */

export interface MarineDay {
  date: string;
  /** Daily `wave_height_max` (m); falls back to the max of that day's hourly `wave_height`; null if neither. */
  waveMaxM: number | null;
  /** Max hourly `sea_surface_temperature` that day, °C. */
  sstC: number | null;
}

export interface ParsedMarine {
  days: MarineDay[];
  /** Hours returned / hours with a numeric wave_height, used by hasUsableMarine. */
  hourCount: number;
  waveHourCount: number;
}

const maxOf = (xs: (number | null)[]): number | null => {
  const v = xs.filter((x): x is number => x !== null);
  return v.length > 0 ? Math.max(...v) : null;
};

export function parseMarine(raw: unknown, index = 0): ParsedMarine {
  const r = pickLocation(raw, index);
  const times = timesOf(r.hourly, "hourly", LOCAL_HOUR_RE);
  const h = r.hourly as Columns;
  const waves = times.map((_, i) => column(h, "wave_height", i));
  const sst = times.map((_, i) => column(h, "sea_surface_temperature", i));

  const dailyTimes = r.daily === undefined ? [] : timesOf(r.daily, "daily", /^\d{4}-\d{2}-\d{2}$/);
  const d = (r.daily ?? {}) as Columns;
  const dates = dailyTimes.length > 0 ? dailyTimes : [...new Set(times.map((t) => t.slice(0, 10)))];
  const days: MarineDay[] = dates.map((date) => {
    const idx = times.flatMap((t, i) => (t.startsWith(date) ? [i] : []));
    const dailyIdx = dailyTimes.indexOf(date);
    const daily = dailyIdx >= 0 ? column(d, "wave_height_max", dailyIdx) : null;
    return {
      date,
      waveMaxM: daily ?? maxOf(idx.map((i) => waves[i] ?? null)),
      sstC: maxOf(idx.map((i) => sst[i] ?? null)),
    };
  });
  return { days, hourCount: times.length, waveHourCount: waves.filter((w) => w !== null).length };
}

/** Show the marine card only if the model returned real values for most hours (marine data is unreliable inland). */
export function hasUsableMarine(m: ParsedMarine, minShare = 0.8): boolean {
  return m.hourCount > 0 && m.waveHourCount / m.hourCount >= minShare;
}

/** Contract shape for DayRisk.marine: undefined (omitted) when both values are null. */
export function toMarineSummary(day: MarineDay | undefined): MarineSummary | undefined {
  if (!day || (day.waveMaxM === null && day.sstC === null)) return undefined;
  return { waveMaxM: day.waveMaxM, sstC: day.sstC };
}

/* ------------------------------ geocoding ------------------------------ */

export interface ParseGeocodingOptions {
  /** Keep only results whose `admin1` equals this state's name (fallback to the server-side comma qualifier). */
  state?: string | undefined;
  /** Restrict to this ISO country (default "US"; Places is US-only). Pass null to keep all countries. */
  countryCode?: string | null;
}

const norm = (s: string) => s.trim().toLowerCase();

/**
 * Geocoding response -> Place[]. A response with no matches has no `results` key (-> []). Rows that fail `isPlace` are
 * dropped. `coastal` is left unset (unknown). Order is the API's relevance order.
 */
export function parseGeocoding(raw: unknown, opts: ParseGeocodingOptions = {}): Place[] {
  if (!isObject(raw)) throw new ParseError("geocoding response is not an object");
  if (raw.results === undefined) return [];
  if (!Array.isArray(raw.results)) throw new ParseError("geocoding results is not a list");
  const country = opts.countryCode === undefined ? "US" : opts.countryCode;
  const places: Place[] = [];
  for (const item of raw.results) {
    if (!isObject(item)) continue;
    const cc = typeof item.country_code === "string" ? item.country_code.toUpperCase() : "";
    const place: Record<string, unknown> = {
      name: item.name,
      country_code: cc,
      lat: item.latitude,
      lon: item.longitude,
      timezone: item.timezone,
    };
    if (typeof item.admin1 === "string" && item.admin1 !== "") place.admin1 = item.admin1;
    if (!isPlace(place)) continue;
    if (country !== null && place.country_code !== country) continue;
    if (opts.state !== undefined && opts.state.trim() !== "") {
      const stateName = stateNameOf(opts.state);
      if (place.admin1 === undefined || norm(place.admin1) !== norm(stateName)) continue;
    }
    places.push(place);
  }
  return places;
}

function stateNameOf(s: string): string {
  return findState(s)?.name ?? s;
}

/** Display line under a result: "Hillsborough County, Florida" when the geocoder gives them. Pure helper for the UI. */
export function areaLine(item: { admin1?: string | undefined; admin2?: string | undefined }): string {
  return [item.admin2, item.admin1].filter((x): x is string => typeof x === "string" && x !== "").join(", ");
}

/* -------------------------------- flood -------------------------------- */

export const RIVER_SIGNALS = ["unknown", "normal", "above_p75", "at_max"] as const;
export type RiverSignal = (typeof RIVER_SIGNALS)[number];

export interface RiverDay {
  date: string;
  discharge: number | null;
  p75: number | null;
  max: number | null;
  signal: RiverSignal;
}

export interface ParsedFlood {
  days: RiverDay[];
  /** Highest signal over the days returned ("unknown" only if every day is unknown). */
  worst: RiverSignal;
}

/**
 * Flood API -> simple river signal per day. ASSUMPTION (no recorded response yet): `daily.time` plus parallel arrays named
 * `river_discharge`, `river_discharge_p75`, `river_discharge_max`, same convention as the forecast API. A non-object body
 * throws; missing arrays give "unknown", never "normal". Secondary signal only: it ignores flash and urban flooding.
 * `at_max` means discharge >= the `river_discharge_max` statistic; `above_p75` means discharge > `river_discharge_p75`.
 */
export function parseFlood(raw: unknown, index = 0): ParsedFlood {
  const r = pickLocation(raw, index);
  const dates = timesOf(r.daily, "daily", /^\d{4}-\d{2}-\d{2}$/);
  const d = r.daily as Columns;
  const days: RiverDay[] = dates.map((date, i) => {
    const discharge = column(d, "river_discharge", i);
    const p75 = column(d, "river_discharge_p75", i);
    const max = column(d, "river_discharge_max", i);
    let signal: RiverSignal = "unknown";
    if (discharge !== null) {
      if (max !== null && discharge >= max) signal = "at_max";
      else if (p75 !== null && discharge > p75) signal = "above_p75";
      else if (p75 !== null || max !== null) signal = "normal";
    }
    return { date, discharge, p75, max, signal };
  });
  const rank = (s: RiverSignal) => RIVER_SIGNALS.indexOf(s);
  const worst = days.reduce<RiverSignal>((w, x) => (rank(x.signal) > rank(w) ? x.signal : w), "unknown");
  return { days, worst };
}
