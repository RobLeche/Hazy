import { describe, expect, it } from "vitest";
import { floodUrl, forecastUrl, geocodingUrl, getJson, marineUrl, OPEN_METEO_HOSTS, OpenMeteoError } from "../../../src/lib/api/openMeteo.ts";

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });

describe("URL builders", () => {
  it("forecast: host, rounded coords, timezone, explicit days, Skye's variables", () => {
    const u = new URL(forecastUrl(27.95123, -82.45678));
    expect(u.host).toBe("api.open-meteo.com");
    expect(u.searchParams.get("latitude")).toBe("27.95");
    expect(u.searchParams.get("longitude")).toBe("-82.46");
    expect(u.searchParams.get("timezone")).toBe("auto");
    expect(u.searchParams.get("forecast_days")).toBe("7");
    expect(u.searchParams.get("past_days")).toBe("2");
    const hourly = u.searchParams.get("hourly")!.split(",");
    for (const v of ["convective_inhibition", "soil_moisture_0_to_1cm", "cape", "lifted_index", "wind_gusts_10m", "weather_code"]) expect(hourly).toContain(v);
    expect(u.searchParams.has("temperature_unit")).toBe(false);
  });
  it("marine and flood always carry forecast_days and timezone", () => {
    for (const s of [marineUrl(27.6, -82.9), floodUrl(27.6, -82.9)]) {
      const u = new URL(s);
      expect(u.searchParams.get("forecast_days")).toBe("7");
      expect(u.searchParams.get("timezone")).toBe("auto");
      expect(OPEN_METEO_HOSTS).toContain(u.host);
    }
    expect(new URL(floodUrl(1, 1)).searchParams.get("daily")).toContain("river_discharge_p75");
  });
  it("rejects invalid coordinates and days", () => {
    expect(() => forecastUrl(123, 0)).toThrow(RangeError);
    expect(() => forecastUrl(Number.NaN, 0)).toThrow(RangeError);
    expect(() => forecastUrl(1, 1, 17)).toThrow(RangeError);
    expect(() => marineUrl(1, 1, 0)).toThrow(RangeError);
  });
  it("geocoding: count, language, countryCode=US and a state qualifier", () => {
    const u = new URL(geocodingUrl("Tampa", "Florida"));
    expect(u.host).toBe("geocoding-api.open-meteo.com");
    expect(u.searchParams.get("name")).toBe("Tampa, FL");
    expect(u.searchParams.get("count")).toBe("10");
    expect(u.searchParams.get("language")).toBe("en");
    expect(u.searchParams.get("countryCode")).toBe("US");
    expect(new URL(geocodingUrl("Miami", "fl")).searchParams.get("name")).toBe("Miami, FL");
    expect(new URL(geocodingUrl("Miami")).searchParams.get("name")).toBe("Miami");
  });
  it("geocoding: user commas cannot inject a second qualifier; 2-char minimum", () => {
    expect(new URL(geocodingUrl("Miami, TX", "FL")).searchParams.get("name")).toBe("Miami TX, FL");
    expect(() => geocodingUrl(" a ")).toThrow(RangeError);
  });
});

describe("getJson", () => {
  it("returns the body on 200", async () => {
    expect(await getJson("x", { fetchImpl: async () => json(200, { a: 1 }) })).toEqual({ a: 1 });
  });
  it("400 becomes a non-retryable typed error carrying the API reason", async () => {
    let calls = 0;
    const fetchImpl = async () => { calls++; return json(400, { error: true, reason: "bad variable tempeture_2m" }); };
    await expect(getJson("x", { fetchImpl })).rejects.toMatchObject({ name: "OpenMeteoError", status: 400, retryable: false, reason: "bad variable tempeture_2m" });
    expect(calls).toBe(1);
  });
  it("503 (observed for real) is retried once then succeeds", async () => {
    let calls = 0;
    const fetchImpl = async () => (++calls === 1 ? json(503, { error: true, reason: "The service is overloaded" }) : json(200, { ok: true }));
    expect(await getJson("x", { fetchImpl, retryDelayMs: 0 })).toEqual({ ok: true });
    expect(calls).toBe(2);
  });
  it("429 twice gives up after exactly two calls", async () => {
    let calls = 0;
    const fetchImpl = async () => { calls++; return json(429, { error: true, reason: "limit" }); };
    const err = await getJson("x", { fetchImpl, retryDelayMs: 0 }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(OpenMeteoError);
    expect((err as OpenMeteoError).retryable).toBe(true);
    expect(calls).toBe(2);
  });
  it("non-JSON error body still yields a typed error", async () => {
    const fetchImpl = async () => new Response("<html>oops</html>", { status: 502, statusText: "Bad Gateway" });
    await expect(getJson("x", { fetchImpl, retryDelayMs: 0 })).rejects.toMatchObject({ status: 502, reason: "Bad Gateway" });
  });
  it("timeout gives status 0 'timeout' and is not retried", async () => {
    let calls = 0;
    const fetchImpl = (_u: string, init?: RequestInit) => { calls++; return new Promise<Response>((_, rej) => init?.signal?.addEventListener("abort", () => rej(new Error("aborted")))); };
    await expect(getJson("x", { fetchImpl, timeoutMs: 10 })).rejects.toMatchObject({ status: 0, reason: "timeout", retryable: false });
    expect(calls).toBe(1);
  });
  it("caller abort and network failure are typed", async () => {
    const ac = new AbortController();
    const fetchImpl = (_u: string, init?: RequestInit) => new Promise<Response>((_, rej) => init?.signal?.addEventListener("abort", () => rej(new Error("aborted"))));
    const p = getJson("x", { fetchImpl, signal: ac.signal, timeoutMs: 1000 });
    ac.abort();
    await expect(p).rejects.toMatchObject({ status: 0, reason: "aborted" });
    await expect(getJson("x", { fetchImpl: async () => { throw new TypeError("Failed to fetch"); } })).rejects.toMatchObject({ status: 0, reason: "network" });
  });
});
