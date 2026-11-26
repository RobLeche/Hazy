import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import handler, { config } from "../../../netlify/functions/alerts.mts";
import { isAlertsResponse } from "../../../src/lib/types.ts";

const UA = "Hazy (https://hazy.example.netlify.app, ops@example.com)";
const feature = (p: Record<string, unknown>) => ({ properties: p });
const ffw = feature({
  id: "urn:oid:1", event: "Flash Flood Warning", severity: "Severe", urgency: "Immediate",
  headline: "FFW until 6 PM", onset: "2026-06-01T12:00:00-04:00", ends: null, areaDesc: "Hillsborough", extra: "dropped",
});
const small = feature({ id: "urn:oid:2", event: "Small Craft Advisory", severity: "Minor" });

let fetchMock: ReturnType<typeof vi.fn>;
const call = (qs = "lat=27.95123&lon=-82.45678", init?: RequestInit) =>
  handler(new Request(`https://x/api/alerts?${qs}`, init));

beforeEach(() => {
  process.env.NWS_USER_AGENT = UA;
  fetchMock = vi.fn(async () => Response.json({ features: [ffw, small] }));
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  delete process.env.NWS_USER_AGENT;
});

describe("alerts function", () => {
  it("routes at /api/alerts, GET only", () => {
    expect(config).toEqual({ path: "/api/alerts", method: ["GET"] });
  });

  it("sends User-Agent, rounds the point, filters and trims, validates, sets headers", async () => {
    const res = await call();
    expect(res.status).toBe(200);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.weather.gov/alerts/active?point=27.95,-82.46");
    expect(new Headers(init.headers).get("user-agent")).toBe(UA);
    const body = await res.json();
    expect(isAlertsResponse(body)).toBe(true);
    expect(body).toEqual([{
      id: "urn:oid:1", event: "Flash Flood Warning", severity: "Severe", urgency: "Immediate",
      headline: "FFW until 6 PM", onset: "2026-06-01T12:00:00-04:00", ends: null, areaDesc: "Hillsborough",
    }]);
    expect(res.headers.get("netlify-cdn-cache-control")).toBe("public, durable, max-age=120, stale-while-revalidate=60");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
  });

  it("keeps flood, thunderstorm, tornado and tropical events only", async () => {
    const events = ["Flood Watch", "Coastal Flood Advisory", "Severe Thunderstorm Watch", "Tornado Warning",
      "Hurricane Watch", "Tropical Storm Warning", "Heat Advisory", "Dense Fog Advisory"];
    fetchMock.mockResolvedValueOnce(Response.json({ features: events.map((event, i) => feature({ id: `i${i}`, event, severity: "Moderate", urgency: "Expected", areaDesc: "A" })) }));
    const body = (await (await call()).json()) as { event: string }[];
    expect(body.map((a) => a.event)).toEqual(events.slice(0, 6));
  });

  it("normalises missing optional fields to null and drops entries that fail the guard", async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ features: [
      feature({ id: "ok", event: "Flood Watch", severity: "Minor", urgency: "Future", areaDesc: "X" }),
      feature({ event: "Flood Watch" }), // no id: dropped
      feature({ id: "badtime", event: "Flood Watch", onset: "not a date" }), // fails guard: dropped
      "junk", null,
    ] }));
    const body = (await (await call()).json()) as unknown[];
    expect(body).toEqual([{ id: "ok", event: "Flood Watch", severity: "Minor", urgency: "Future", headline: null, onset: null, ends: null, areaDesc: "X" }]);
  });

  it("returns an empty array (200, cacheable) when there are no features", async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ features: [] }));
    const res = await call();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
    expect(res.headers.get("netlify-cdn-cache-control")).toMatch(/max-age=120/);
  });

  it("405 for non-GET without calling NWS", async () => {
    const res = await call("lat=1&lon=1", { method: "POST" });
    expect(res.status).toBe(405);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each(["", "lat=abc&lon=1", "lat=1", "lat=&lon=1", "lat=91&lon=0", "lat=0&lon=181"])("400 on bad coordinates (%s)", async (qs) => {
    const res = await call(qs);
    expect(res.status).toBe(400);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("500 NO_UA when the env var is missing, never calling NWS", async () => {
    delete process.env.NWS_USER_AGENT;
    const res = await call();
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "server misconfigured", code: "NO_UA" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("502 with no-store on an upstream error", async () => {
    fetchMock.mockResolvedValueOnce(new Response("rate limited", { status: 429 }));
    const res = await call();
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ error: "alerts unavailable", code: "NWS_429" });
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(res.headers.get("netlify-cdn-cache-control")).toBeNull();
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
  });

  it.each([400, 404])("maps NWS %i (point outside coverage) to NOT_US, no-store", async (status) => {
    fetchMock.mockResolvedValueOnce(Response.json({ title: "Bad Request", status }, { status }));
    const res = await call("lat=51.5&lon=-0.12");
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "point outside NWS coverage", code: "NOT_US" });
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("502 on a non-JSON upstream body", async () => {
    fetchMock.mockResolvedValueOnce(new Response("<html>", { status: 200 }));
    const res = await call();
    expect(res.status).toBe(502);
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("504 after the 8 s timeout aborts the request", async () => {
    vi.useFakeTimers();
    fetchMock.mockImplementationOnce((_u: string, init: RequestInit) => new Promise((_res, rej) => {
      init.signal?.addEventListener("abort", () => rej(new DOMException("aborted", "AbortError")));
    }));
    const p = call();
    await vi.advanceTimersByTimeAsync(7999);
    let settled = false;
    void p.then(() => { settled = true; });
    await vi.advanceTimersByTimeAsync(0);
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    const res = await p;
    expect(res.status).toBe(504);
    expect(await res.json()).toEqual({ error: "alerts timeout", code: "NWS_TIMEOUT" });
    expect(res.headers.get("cache-control")).toBe("no-store");
  });

  it("never puts the User-Agent contact in a response body", async () => {
    fetchMock.mockResolvedValueOnce(new Response("x", { status: 500 }));
    expect(await (await call()).text()).not.toContain("ops@example.com");
  });
});
