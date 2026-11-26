# Units, time zones, errors and caching

Source: https://open-meteo.com/en/docs and https://open-meteo.com/en/terms (read 2026-11-26)

## Units (quoted defaults)
| Param | Default | Other values |
|---|---|---|
| `temperature_unit` | `celsius` | `fahrenheit` |
| `wind_speed_unit` | `kmh` | `ms`, `mph`, `kn` |
| `precipitation_unit` | `mm` | `inch` |
Hazy fetches **metric** and converts in the UI, so the scoring thresholds have one unit system.

## Time zones (quoted)
- `timezone`: default `GMT`. "`auto` resolves the time zone from the coordinates. The requested timezone's UTC offset
  at request time is returned as `utc_offset_seconds` and used for ISO 8601 timestamps and daily boundaries
  throughout the response. **Daylight saving time (DST) changes within the requested range are ignored.** For
  DST-aware local times, request `timeformat=unixtime` and convert using the returned timezone in your application."
- `timeformat`: `iso8601` (default) or `unixtime` ("seconds since 1970-01-01 00:00 UTC. To reproduce the API's
  dates and times, format them using utc_offset_seconds").
- Timestamps like `2026-11-25T15:00` have **no offset suffix**. Do not pass them to `new Date()` as-is (that parses
  them as device-local time). Parse them as wall-clock strings, or add `utc_offset_seconds`.
- DST matters: a 7-day forecast across a DST change (March and November in the US) will be off by one hour after
  the switch with `iso8601`. Accept that for daily outlooks, or use `unixtime` plus the `timezone` name.

## Errors (quoted)
"In case an error occurs, for example a URL parameter is not correctly specified, a JSON error object is returned
with a HTTP 400 status code:"
```json
{ "error": true, "reason": "Cannot initialize WeatherVariable from invalid String value tempeture_2m for key hourly" }
```
Observed while capturing fixtures: HTTP **503** `{"error":true,"reason":"The service is overloaded"}`. Retry once with
backoff, then serve the cached forecast with its age.

## Terms and limits (quoted from /en/terms)
- Free API: **non-commercial use only** ("Private or non-profit websites or apps that do not have subscriptions or
  advertising" qualify).
- "Less than 10'000 API calls per day, 5'000 per hour and 600 per minute"; monthly 300,000.
- Licence: **CC BY 4.0**, so show attribution ("Weather data by Open-Meteo.com").

## Caching strategy for Hazy (our design, derived from the facts above)
- Models update hourly at best, so a **15-minute** cache per place loses nothing.
- Cache key = rounded coordinates (2 decimals ≈ 1.1 km) + variable set + `forecast_days`. Rounding also merges
  nearby users onto one upstream call when proxied.
- Browser-direct calls count against each user's own IP limits; a Netlify proxy shares one quota, so it must cache
  at the CDN (`Netlify-CDN-Cache-Control: public, durable, max-age=900, stale-while-revalidate=300`).
- In the service worker, use network-first with a 4 s timeout, falling back to cache and showing the "Last updated" time.
