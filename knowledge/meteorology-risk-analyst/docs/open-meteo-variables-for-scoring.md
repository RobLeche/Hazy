# Open-Meteo variable definitions that change how we score

Source: https://open-meteo.com/en/docs (read 2026-11-26)

- `precipitation`: "Total precipitation (rain, showers, snow) sum of the **preceding hour**." Max hourly precipitation =
  peak rain **rate** in mm/h. A value at 15:00 belongs to 14:00–15:00.
- `precipitation_probability`: "Probability of precipitation with more than 0.1 mm of the preceding hour …
  based on ensemble weather models with 0.25° (~27 km) resolution. 30 different simulations." It says nothing about
  intensity: 90% may mean drizzle. Never score floods on probability alone.
- `weather_code` (WMO): 51/53/55 drizzle; 61/63/65 rain; 80/81/82 slight, moderate and violent showers; **95 thunderstorm**;
  96/99 hail: "only reported by models with an explicit hail forecast, such as DWD ICON or UKMO."
- `lightning_potential` (15-minutely): "Only available in Central Europe and North America."
- Daily boundaries follow `timezone=auto` with a fixed `utc_offset_seconds` (DST changes inside the range are ignored).

## Real example (Tampa, 2026-11-25, our fixture)
Daily `precipitation_sum` 17.6 mm, but the peak hourly rate was only 5.0 mm/h; `precipitation_probability_max` 93%;
CAPE max 230 J/kg; LI min −0.8; no code 95. Reading: a wet, stable, stratiform rain day. **High rain probability with low
flood and low thunder risk.** This is exactly why probability must not drive the flood score.
