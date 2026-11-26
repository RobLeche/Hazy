# Official NWS risk scales Hazy's labels borrow from

## NWS Melbourne (east-central Florida): "Flood Threat Defined"
Source: https://www.weather.gov/mlb/flashflood_threat (read 2026-11-26)

All levels are defined "within 12 miles of a location and within 6 hours of nearby heavy rain".
| Level | Likelihood of flooding rain | Estimated QPF/FFG ratio |
|---|---|---|
| Non-Threatening | n/a | n/a |
| Very Low | very low (2–5%) | 0.75–1.25 |
| Low | very low (2–5%) to low (6–15%) | 0.75–2.0 |
| Moderate | very low (2–5%) to moderate (16–25%) | 0.75 to above 2.0 |
| High | low (6–15%) to high (26–35%) | 0.75 to above 2.0 |
| Extreme | moderate (16%+) to very high (36%+) | 0.75 to above 2.0 |
QPF = quantitative precipitation forecast; FFG = flash flood guidance (rain needed to cause flooding). The level is
read from a likelihood × ratio matrix, which is why ranges overlap.

## WPC Excessive Rainfall Outlook (ERO)
Source: https://www.weather.gov/media/ewx/iwt/SPC_WPC_Differences.pdf and
https://www.wpc.ncep.noaa.gov/qpf/excessive_rainfall_outlook_ero.php (read 2026-11-26)

"WPC forecasts the probability that rainfall will exceed flash flood guidance (FFG) within 40 kilometers (25 miles)
of a point." Categories: **Marginal 5–10%**, **Slight 10–20%**, **Moderate 20–50%**, **High >50%**.

## SPC convective outlook (wording reference)
Source: same PDF. TSTM: "a 10% or greater probability of thunderstorms … No severe thunderstorms expected …
Lightning/flooding threats exist with all thunderstorms." 1 Marginal: isolated severe storms possible. 2 Slight:
scattered. 3 Enhanced: numerous. 4 Moderate: widespread severe storms likely. 5 High: widespread severe storms expected.

## Implications for Hazy
- The free APIs give no FFG, so Hazy's flood score is a **heuristic** built from rain rate, totals and wetness. Use the
  NWS **names**, never NWS **probabilities**.
- NWS alerts (api.weather.gov) override the app score.
