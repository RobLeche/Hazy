# Open-Meteo Marine API

Source: https://open-meteo.com/en/docs/marine-weather-api (read 2026-11-26)

## Endpoint
`GET https://marine-api.open-meteo.com/v1/marine`

## Variables
**Hourly:** `wave_height`, `wave_direction`, `wave_period`, `wave_peak_period`, `wind_wave_height`, `wind_wave_direction`,
`wind_wave_period`, `wind_wave_peak_period`, `swell_wave_height`, `swell_wave_direction`, `swell_wave_period`,
`swell_wave_peak_period`, `secondary_swell_wave_*`, `tertiary_swell_wave_*`, `sea_level_height_msl`,
`sea_surface_temperature`, `ocean_current_velocity`, `ocean_current_direction`, `invert_barometer_height`.
**Daily:** `wave_height_max`, `wind_wave_height_max`, `swell_wave_height_max`, `wave_direction_dominant`,
`wind_wave_direction_dominant`, `swell_wave_direction_dominant`, `wave_period_max`, `wind_wave_period_max`,
`swell_wave_period_max`, `wind_wave_peak_period_max`, `swell_wave_peak_period_max`.

## Models and resolution (from the docs)
MeteoFrance MFWAM 0.08° (~8 km); MeteoFrance SMOC currents and tides 0.08°; ECMWF WAM 9 km; NCEP GFS Wave 0.25° and
0.16°; DWD EWAM 0.05° (~5 km); DWD GWAM 0.25°; ERA5-Ocean 0.5°.

## Caveats (quoted)
- "Accuracy at coastal areas is limited. This is not suitable for coastal navigation and does not replace your
  nautical almanac. Use with caution!"
- "…while it can be reasonably accurate near unobstructed coasts, it may be completely unreliable further inland."
- `forecast_days`: the parameter table says default 5, while the text says 7; up to 8 or 16 are mentioned. **Always pass
  `forecast_days` explicitly.**

## Hazy rules
- Request marine data only for coastal places; hide the card when values are null.
- Units in our fixture: `wave_height` in m, `sea_surface_temperature` in °C. Convert to ft and °F in the UI if imperial.
- `sea_level_height_msl` includes tides; add `invert_barometer_height` for a pressure effect. This is **not** a
  storm-surge forecast.
