# Open-Meteo Forecast API: what Hazy uses

Source: https://open-meteo.com/en/docs (read 2026-11-26)

## Endpoint
`GET https://api.open-meteo.com/v1/forecast`

## Required and key parameters
| Param | Notes (from the docs) |
|---|---|
| `latitude`, `longitude` | WGS84. "Multiple coordinates can be comma separated. E.g. `&latitude=52.52,48.85&longitude=13.41,2.35`. To return data for multiple locations the JSON output changes to a list of structures." |
| `hourly`, `daily`, `minutely_15`, `current` | Comma-separated variable lists |
| `forecast_days` | Default 7, maximum 16 |
| `past_days` | Default 0, maximum 92 (Hazy uses 2 for antecedent rain) |
| `forecast_hours` | "Similar to forecast_days, the number of timesteps of hourly and 15-minutely data can be controlled… the current hour or the current 15-minute time-step is used" as the reference |
| `start_date`, `end_date` | ISO 8601 dates (e.g. `2022-06-30`) |
| `models` | Default `auto`: "the best suitable weather models will be combined (`best_match`)" |
| `cell_selection` | `land` (default; "finds a suitable grid-cell on land with similar elevation… 90-meter digital elevation model"), `sea`, `nearest` |

## Variables Hazy requests
**Hourly:** `precipitation`, `rain`, `showers`, `precipitation_probability`, `weather_code`, `cape`,
`lifted_index`, `convective_inhibition`, `wind_gusts_10m`, `uv_index`, `soil_moisture_0_to_1cm`, `visibility`.
**Daily:** `weather_code`, `precipitation_sum`, `precipitation_hours`, `precipitation_probability_max`,
`wind_gusts_10m_max`, `uv_index_max`.
**15-minutely:** `lightning_potential`. The docs say 15-minutely data is "only available in Central Europe and North America.
Other regions use interpolated hourly data."

## Definitions that matter for scoring (quoted)
- `precipitation`: "Total precipitation (rain, showers, snow) sum of the preceding hour." So the value stamped
  `15:00` covers 14:00–15:00.
- `precipitation_probability`: "Probability of precipitation with more than 0.1 mm of the preceding hour.
  Probability is based on ensemble weather models with 0.25° (~27 km) resolution. 30 different simulations are computed."
- `weather_code`: WMO codes. 80/81/82 are slight, moderate and violent rain showers; **95 thunderstorm**; 96/99 thunderstorm with
  slight/heavy hail. "Codes 96 and 99 are only reported by models with an explicit hail forecast, such as DWD ICON or
  UKMO. All other models derive thunderstorms from instability parameters."

## Response shape (verified against our fixture)
```json
{ "latitude": 27.955584, "longitude": -82.443985, "elevation": 6.0, "generationtime_ms": 3.2,
  "utc_offset_seconds": -18000, "timezone": "America/New_York", "timezone_abbreviation": "GMT-5",
  "hourly_units": { "time": "iso8601", "precipitation": "mm", "cape": "J/kg", "lifted_index": "" },
  "hourly": { "time": ["2026-11-25T00:00", "..."], "precipitation": [0.0, "..."] },
  "daily_units": { "...": "..." }, "daily": { "time": ["2026-11-25", "2026-11-26"], "precipitation_sum": [17.6, 1.1] } }
```
- Arrays are parallel: `hourly.time[i]` goes with `hourly.<var>[i]`.
- The returned lat/lon is the **grid cell**, not your input.
- Values can be `null` (for example, a variable not available from the selected model). Never coerce null to 0.

## Model update frequency (from the docs)
GFS and RRFS: every hour. ICON: every 3 hours. IFS/AIFS: every 6 hours. UKMO: every hour. This is why caching a
forecast for about 15 minutes loses nothing.
