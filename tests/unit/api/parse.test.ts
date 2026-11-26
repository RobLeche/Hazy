import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { areaLine, groupByDay, hasUsableMarine, parseFlood, parseForecast, parseGeocoding, parseMarine, ParseError, pastRain, toMarineSummary } from "../../../src/lib/api/parse.ts";
import { isHourPoint, isPlace } from "../../../src/lib/types.ts";

const fx = (n: string): unknown => JSON.parse(readFileSync(new URL(`../../fixtures/open-meteo/${n}`, import.meta.url), "utf8"));
const forecast = fx("forecast-tampa-2026-11-25.json");
const NOW = Date.parse("2026-11-25T18:00:00Z"); // 13:00 local (UTC-5)

describe("parseForecast (real Tampa fixture)", () => {
  const f = parseForecast(forecast, { nowMs: NOW });
  it("produces valid HourPoints with local time and utcMs", () => {
    expect(f.hours).toHaveLength(48);
    expect(f.hours.every(isHourPoint)).toBe(true);
    const h = f.hours[15]!;
    expect(h.localTime).toBe("2026-11-25T15:00");
    expect(h.date).toBe("2026-11-25");
    expect(h.hour).toBe(15);
    expect(h.utcMs).toBe(Date.parse("2026-11-25T20:00:00Z"));
    expect(f.utcOffsetSeconds).toBe(-18000);
    expect(f.timezone).toBe("America/New_York");
    expect(f.lat).toBeCloseTo(27.955584);
  });
  it("variables absent from the old capture are null, never 0", () => {
    const h = f.hours[10]!;
    expect(h.convectiveInhibition).toBeNull();
    expect(h.soilMoisture0to1cm).toBeNull();
    expect(h.uvIndex).toBeNull();
    expect(h.precipitationMm).toBe(0.7);
  });
  it("daily aggregate matches the fixture and computes the max hourly rate", () => {
    expect(f.daily.map((d) => d.date)).toEqual(["2026-11-25", "2026-11-26"]);
    expect(f.daily[0]!.rain.totalMm).toBe(17.6);
    expect(f.daily[0]!.rain.maxRateMmH).toBe(5);
    expect(f.daily[0]!.precipitationHours).toBeNull(); // not requested in that capture
    expect(f.todayDate).toBe("2026-11-25");
  });
  it("todayDate follows the place's zone, not the device's", () => {
    expect(parseForecast(forecast, { nowMs: Date.parse("2026-11-26T03:00:00Z") }).todayDate).toBe("2026-11-25"); // 22:00 local
    expect(parseForecast(forecast, { nowMs: Date.parse("2026-11-26T05:00:00Z") }).todayDate).toBe("2026-11-26"); // 00:00 local
  });
  it("groupByDay groups by local date", () => {
    const g = groupByDay(f.hours);
    expect([...g.keys()]).toEqual(["2026-11-25", "2026-11-26"]);
    expect(g.get("2026-11-25")).toHaveLength(24);
  });
});

describe("parseForecast edge cases", () => {
  const base = (hourly: Record<string, unknown>, extra: Record<string, unknown> = {}) => ({
    utc_offset_seconds: -21600, timezone: "America/Chicago", latitude: 30.4, longitude: -87.2,
    hourly: { time: ["2026-07-01T14:00", "2026-07-01T15:00"], ...hourly }, ...extra,
  });
  it("full variable set, Central time, nulls preserved", () => {
    const f = parseForecast(base({
      precipitation: [0, 12.5], precipitation_probability: [20, null], weather_code: [3, 95], cape: [2500, null],
      lifted_index: [-5, null], convective_inhibition: [40, null], wind_gusts_10m: [30, 70], uv_index: [8, 6], soil_moisture_0_to_1cm: [0.4, null],
    }), { nowMs: 0 });
    const [a, b] = f.hours;
    expect(a!.utcMs).toBe(Date.parse("2026-07-01T20:00:00Z"));
    expect(a!.convectiveInhibition).toBe(40);
    expect(a!.soilMoisture0to1cm).toBe(0.4);
    expect(b!.cape).toBeNull();
    expect(b!.liftedIndex).toBeNull();
    expect(b!.precipProbability).toBeNull();
    expect(b!.weatherCode).toBe(95);
    expect(f.daily).toEqual([]); // no daily block requested
  });
  it("multi-location list shape is normalised; index selects", () => {
    const list = [base({ cape: [1, 2] }), base({ cape: [3, 4] })];
    expect(parseForecast(list).hours[0]!.cape).toBe(1);
    expect(parseForecast(list, { index: 1 }).hours[1]!.cape).toBe(4);
    expect(() => parseForecast(list, { index: 2 })).toThrow(ParseError);
  });
  it("maxRateMmH is null when every hourly precipitation is null", () => {
    const f = parseForecast(base({ precipitation: [null, null] }, { daily: { time: ["2026-07-01"], precipitation_sum: [null] } }));
    expect(f.daily[0]!.rain).toEqual({ totalMm: null, maxRateMmH: null, probMax: null });
  });
  it("malformed structure throws ParseError", () => {
    expect(() => parseForecast(null)).toThrow(ParseError);
    expect(() => parseForecast({ hourly: { time: [] } })).toThrow(ParseError); // no utc_offset_seconds
    expect(() => parseForecast({ utc_offset_seconds: 0, hourly: { time: ["2026-07-01"] } })).toThrow(ParseError);
    expect(() => parseForecast({ utc_offset_seconds: 0 })).toThrow(ParseError);
    expect(() => parseForecast([])).toThrow(ParseError);
  });
});

describe("pastRain", () => {
  const mk = (vals: (number | null)[]) => parseForecast({
    utc_offset_seconds: 0, hourly: { time: vals.map((_, i) => `2026-07-01T${String(i).padStart(2, "0")}:00`), precipitation: vals },
  }).hours;
  it("sums the window ending now, skipping nulls", () => {
    const hours = mk([1, 2, 3, null, 4]);
    const r = pastRain(hours, Date.parse("2026-07-01T04:00:00Z"), 4, 0.5);
    expect(r.mm).toBe(2 + 3 + 4);
    expect(r.hoursWithData).toBe(3);
  });
  it("is null (not 0) when too little data", () => {
    expect(pastRain(mk([null, null, null, null]), Date.parse("2026-07-01T03:00:00Z"), 4).mm).toBeNull();
    expect(pastRain([], 0).mm).toBeNull();
  });
});

describe("marine", () => {
  const marine = fx("marine-tampa-bay-2026-11-25.json");
  it("real fixture: per-day max wave and SST", () => {
    const m = parseMarine(marine);
    expect(m.days).toHaveLength(2);
    expect(m.days[0]!.waveMaxM).toBe(0.78);
    expect(m.days[1]!.waveMaxM).toBe(2.14);
    expect(m.days[0]!.sstC).not.toBeNull();
    expect(hasUsableMarine(m)).toBe(true);
    expect(toMarineSummary(m.days[0])).toEqual({ waveMaxM: 0.78, sstC: m.days[0]!.sstC });
  });
  const inland = { utc_offset_seconds: 0, hourly: { time: ["2026-07-01T00:00", "2026-07-01T01:00"], wave_height: [null, null], sea_surface_temperature: [null, null] }, daily: { time: ["2026-07-01"], wave_height_max: [null] } };
  it("all-null (inland) is not usable and yields no summary", () => {
    const m = parseMarine(inland);
    expect(hasUsableMarine(m)).toBe(false);
    expect(m.days[0]).toEqual({ date: "2026-07-01", waveMaxM: null, sstC: null });
    expect(toMarineSummary(m.days[0])).toBeUndefined();
    expect(toMarineSummary(undefined)).toBeUndefined();
  });
  it("falls back to hourly max when the daily value is missing; empty hourly is unusable", () => {
    const m = parseMarine({ utc_offset_seconds: 0, hourly: { time: ["2026-07-01T00:00", "2026-07-01T01:00"], wave_height: [0.5, 0.9] } });
    expect(m.days[0]!.waveMaxM).toBe(0.9);
    expect(m.days[0]!.sstC).toBeNull();
    expect(hasUsableMarine({ days: [], hourCount: 0, waveHourCount: 0 })).toBe(false);
  });
});

describe("geocoding (SYNTHETIC fixture)", () => {
  const geo = fx("geocoding-tampa-fl.synthetic.json");
  it("maps to valid Places, drops invalid rows and other countries", () => {
    const p = parseGeocoding(geo);
    expect(p.map((x) => x.name)).toEqual(["Tampa", "Tampa", "Tampa Bay Estates"]);
    expect(p.every(isPlace)).toBe(true);
    expect(p[0]).toEqual({ name: "Tampa", admin1: "Florida", country_code: "US", lat: 27.94752, lon: -82.45843, timezone: "America/New_York" });
    expect("admin1" in p[2]!).toBe(false);
  });
  it("client-side state filter by name or code (fallback to the comma qualifier)", () => {
    expect(parseGeocoding(geo, { state: "Florida" }).map((x) => x.admin1)).toEqual(["Florida"]);
    expect(parseGeocoding(geo, { state: "KS" }).map((x) => x.admin1)).toEqual(["Kansas"]);
    expect(parseGeocoding(geo, { state: "Texas" })).toEqual([]);
  });
  it("no matches (no results key) is an empty list; non-object throws", () => {
    expect(parseGeocoding({ generationtime_ms: 0.3 })).toEqual([]);
    expect(() => parseGeocoding("x")).toThrow(ParseError);
    expect(parseGeocoding(geo, { countryCode: null }).some((x) => x.country_code === "MX")).toBe(true);
  });
  it("areaLine", () => {
    expect(areaLine({ admin1: "Florida", admin2: "Hillsborough County" })).toBe("Hillsborough County, Florida");
    expect(areaLine({ admin1: "Florida" })).toBe("Florida");
    expect(areaLine({})).toBe("");
  });
});

describe("flood (SYNTHETIC fixture, assumed shape)", () => {
  it("classifies each day and reports the worst; null discharge is unknown", () => {
    const f = parseFlood(fx("flood-synthetic.json"));
    expect(f.days.map((d) => d.signal)).toEqual(["normal", "above_p75", "at_max", "unknown"]);
    expect(f.worst).toBe("at_max");
  });
  it("missing statistics never read as normal", () => {
    const f = parseFlood({ daily: { time: ["2026-07-01"], river_discharge: [5] } });
    expect(f.days[0]!.signal).toBe("unknown");
    expect(f.worst).toBe("unknown");
  });
  it("no daily block throws", () => {
    expect(() => parseFlood({})).toThrow(ParseError);
  });
});
