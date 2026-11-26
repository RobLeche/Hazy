import { describe, expect, it } from "vitest";
import { currentLocationPlace, fetchAlerts, isLikelyUs } from "../../../src/lib/api/alertsClient.ts";
import { isPlace } from "../../../src/lib/types.ts";

const alert = { id: "urn:1", event: "Flood Watch", severity: "Moderate", urgency: "Expected", headline: null, onset: "2026-11-25T12:00:00-05:00", ends: null, areaDesc: "Hillsborough" };
const res = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });
const mk = (r: () => Promise<Response>) => { const urls: string[] = []; return { urls, fetchImpl: async (u: string) => { urls.push(u); return r(); } }; };

describe("fetchAlerts", () => {
  it("200 with alerts -> ok; rounded coords; no-store", async () => {
    let init: RequestInit | undefined;
    const urls: string[] = [];
    const out = await fetchAlerts(27.95123, -82.45678, { fetchImpl: async (u, i) => { urls.push(u); init = i; return res(200, [alert]); } });
    expect(out).toEqual({ status: "ok", alerts: [alert] });
    expect(urls).toEqual(["/api/alerts?lat=27.95&lon=-82.46"]);
    expect(init?.cache).toBe("no-store");
  });
  it("200 empty array -> ok with no alerts (checked)", async () => {
    expect(await fetchAlerts(27.95, -82.46, mk(async () => res(200, []))))
      .toEqual({ status: "ok", alerts: [] });
  });
  it("404 NOT_US -> not_us", async () => {
    expect(await fetchAlerts(27.95, -82.46, mk(async () => res(404, { error: "x", code: "NOT_US" }))))
      .toEqual({ status: "not_us", alerts: [] });
  });
  it.each([
    [400, "BAD_COORDS"], [500, "NO_UA"], [502, "NWS_503"], [504, "NWS_TIMEOUT"], [502, "NWS_BAD_BODY"], [502, "NWS_FETCH"], [405, "METHOD_NOT_ALLOWED"], [404, "SOMETHING_ELSE"],
  ])("%i %s -> unavailable, never no-alerts", async (status, code) => {
    expect(await fetchAlerts(27.95, -82.46, mk(async () => res(status, { error: "x", code }))))
      .toEqual({ status: "unavailable", alerts: [] });
  });
  it("network error, offline, bad body, invalid alert shape -> unavailable", async () => {
    expect((await fetchAlerts(27.95, -82.46, mk(async () => { throw new TypeError("Failed to fetch"); }))).status).toBe("unavailable");
    expect((await fetchAlerts(27.95, -82.46, mk(async () => new Response("<html>", { status: 200 })))).status).toBe("unavailable");
    expect((await fetchAlerts(27.95, -82.46, mk(async () => res(200, [{ id: 1 }])))).status).toBe("unavailable");
    expect((await fetchAlerts(27.95, -82.46, mk(async () => res(200, { alerts: [] })))).status).toBe("unavailable");
  });
  it("timeout -> unavailable", async () => {
    const fetchImpl = (_u: string, init?: RequestInit) => new Promise<Response>((_, rej) => init?.signal?.addEventListener("abort", () => rej(new Error("a"))));
    expect((await fetchAlerts(27.95, -82.46, { fetchImpl, timeoutMs: 10 })).status).toBe("unavailable");
  });
  it("non-US country code or coordinates short-circuit without a request", async () => {
    const m = mk(async () => res(200, []));
    expect(await fetchAlerts(43.65, -79.38, { ...m, countryCode: "CA" })).toEqual({ status: "not_us", alerts: [] });
    expect(await fetchAlerts(51.5, -0.12, m)).toEqual({ status: "not_us", alerts: [] });
    expect(m.urls).toEqual([]);
    expect((await fetchAlerts(27.95, -82.46, { ...m, countryCode: "US" })).status).toBe("ok");
    expect(m.urls).toHaveLength(1);
  });
  it("invalid coordinates -> unavailable", async () => {
    expect((await fetchAlerts(Number.NaN, 0)).status).toBe("unavailable");
  });
});

describe("US detection and current location", () => {
  it("bounding boxes", () => {
    for (const [la, lo] of [[27.95, -82.46], [64.8, -147.7], [21.3, -157.9], [18.2, -66.5], [30.4, -87.2]] as const) expect(isLikelyUs(la, lo)).toBe(true);
    for (const [la, lo] of [[51.5, -0.12], [35.7, 139.7], [19.4, -99.1], [-33.9, 151.2]] as const) expect(isLikelyUs(la, lo)).toBe(false);
  });
  it("currentLocationPlace is a valid Place named generically, with rounded coordinates", () => {
    const us = currentLocationPlace(27.95123, -82.45678);
    expect(us).toEqual({ name: "Current location", country_code: "US", lat: 27.95, lon: -82.46, timezone: "auto" });
    expect(isPlace(us)).toBe(true);
    const abroad = currentLocationPlace(51.5, -0.12);
    expect(abroad.country_code).toBe("ZZ");
    expect(isPlace(abroad)).toBe(true);
    expect(currentLocationPlace(51.5, -0.12, "Position actuelle", "GB").country_code).toBe("GB");
  });
});
