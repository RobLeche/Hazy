---
name: open-meteo-apis
description: "Request and parse the Open-Meteo forecast, marine, flood and geocoding APIs for Hazy: exact variable names, units, nulls, multi-location responses, terms and attribution. Use when writing or testing any Open-Meteo call."
metadata:
  owner: api-integration-expert
  shared_with: [meteorology-risk-analyst, qa-engineer]
---
# Open-Meteo APIs

| API | Base URL |
|---|---|
| Forecast | `https://api.open-meteo.com/v1/forecast` |
| Marine | `https://marine-api.open-meteo.com/v1/marine` |
| Flood (GloFAS v4, ~5 km) | `https://flood-api.open-meteo.com/v1/flood` |
| Geocoding | `https://geocoding-api.open-meteo.com/v1/search` |

## Forecast variables we use
Hourly: `precipitation, rain, showers, precipitation_probability, weather_code, cape,
lifted_index, convective_inhibition, wind_gusts_10m, uv_index, soil_moisture_0_to_1cm, visibility`.
Daily: `weather_code, precipitation_sum, precipitation_hours, precipitation_probability_max,
wind_gusts_10m_max, uv_index_max`. 15-minutely: `lightning_potential` (North America and Central Europe only).
Params: `timezone=auto`, `forecast_days=7` (max 16), `past_days=2` (antecedent rain), units metric internally.

## Marine
`wave_height, wave_period, wave_direction, swell_wave_height, sea_surface_temperature,
sea_level_height_msl, invert_barometer_height`; daily `wave_height_max`. **Always pass
`forecast_days`** (the docs state 5 and 7 as the default). Unreliable inland and not for navigation;
hide the card when values are null or the location is not coastal.

## Flood
`river_discharge`, `river_discharge_median|mean|max|min|p25|p75`. Largest river within ~5 km;
not flash or urban flooding. A secondary signal only.

## Geocoding
`?name=Tampa, FL&count=10&language=en&countryCode=US` (a comma qualifier narrows by state).
Fields: `latitude, longitude, admin1, admin2, country_code, timezone, population`. Minimum 2 characters.

## Rules
- Multiple coordinates (comma-separated) return a **list**; normalise to an array.
- Every numeric field may be `null`: never coerce null to 0 in scoring.
- Free tier: non-commercial; 600/min, 5,000/h, 10,000/day, 300,000/month. Call from the browser
  (per-user quota) or cache server-side by coordinates rounded to 2 decimals.
- Show "Weather data by Open-Meteo.com" (CC BY 4.0) in the UI.
- Record real responses as fixtures in `tests/fixtures/open-meteo/`.
- Details: `docs/01-use-case-and-risk-scoring.md` §2.
