# Fixtures (real API responses)

Captured on 2026-11-25 (local) from the live Open-Meteo APIs. Do not edit; record new ones instead.

| File | Request |
|---|---|
| `forecast-tampa-2026-11-25.json` | `https://api.open-meteo.com/v1/forecast?latitude=27.95&longitude=-82.46&hourly=precipitation,precipitation_probability,weather_code,cape,lifted_index,wind_gusts_10m&daily=weather_code,precipitation_sum,precipitation_probability_max,uv_index_max&timezone=auto&forecast_days=2` |
| `marine-tampa-bay-2026-11-25.json` | `https://marine-api.open-meteo.com/v1/marine?latitude=27.6&longitude=-82.9&hourly=wave_height,sea_surface_temperature&daily=wave_height_max&timezone=auto&forecast_days=2` |

Notice:
- The returned grid-cell coordinates differ from the requested ones (27.955584, -82.443985 vs 27.95, -82.46).
- `utc_offset_seconds: -18000` and `timezone_abbreviation: "GMT-5"`. The times are local wall-clock strings without an offset.
- `lifted_index` has an empty unit string.
- The first capture attempt returned HTTP 503 `{"error":true,"reason":"The service is overloaded"}`. Handle that case too.
