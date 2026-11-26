# Knowledge: api-integration-expert

Read **every file here before answering** and prefer it over memory (see the agent's "Before you answer" section).
Notes in `docs/` are taken from official documentation and link their sources; `examples/` are small, correct, tested worked examples.

## docs/
- [`nws-alerts.md`](docs/nws-alerts.md): NWS alerts API (official warnings overlay). Sources: https://www.weather.gov/documentation/services-web-api, https://api.weather.gov
- [`open-meteo-forecast.md`](docs/open-meteo-forecast.md): Open-Meteo Forecast API: what Hazy uses. Sources: https://open-meteo.com/en/docs
- [`open-meteo-marine.md`](docs/open-meteo-marine.md): Open-Meteo Marine API. Sources: https://open-meteo.com/en/docs/marine-weather-api
- [`units-timezones-errors-caching.md`](docs/units-timezones-errors-caching.md): Units, time zones, errors and caching. Sources: https://open-meteo.com/en/docs, https://open-meteo.com/en/terms

## examples/
- [`cache-and-coastal.ts`](examples/cache-and-coastal.ts): Example 3 — Cache key for proxy/CDN/SW caching, and the "is this place coastal?" check for the marine card. (tested by `cache-and-coastal.test.ts`)
- [`open-meteo-client.ts`](examples/open-meteo-client.ts): Example 1 — Build Open-Meteo requests and handle errors correctly. (tested by `open-meteo-client.test.ts`)
- [`parse-forecast.ts`](examples/parse-forecast.ts): Example 2 — Turn the parallel-array response into typed, null-safe rows grouped by local day. (tested by `parse-forecast.test.ts`)
- [`fixtures/`](examples/fixtures/): supporting files (fixtures or demo site)

## Verification
Run: `cd knowledge/api-integration-expert/examples && node --test *.test.ts` (Node ≥ 22.18; TypeScript runs via type stripping), or `./knowledge/run-examples.sh` from the repo root.
Last run 2026-11-26 (Node v22.23.5): **12 passed, 0 failed, 0 skipped.**
