---
name: weather-risk-scoring
description: "Compute Hazy's thunderstorm and flood risk scores (0\u2013100, labels, reasons) from Open-Meteo data, and calibrate the thresholds. Use when editing src/lib/scoring.ts or thresholds, or when judging whether a score is meteorologically sound."
metadata:
  owner: meteorology-risk-analyst
  shared_with: [api-integration-expert, qa-engineer]
---
# Weather risk scoring

Source of truth: `docs/01-use-case-and-risk-scoring.md` §3. Code: `src/lib/scoring.ts`
(pure, no I/O) and thresholds in `src/lib/thresholds.ts` (one config object).

## Thunderstorm (per day and per block: morning, afternoon, evening, night)
- `weather_code` 95/96/99 in any hour: +45 (96/99 set hail). Codes 80–82 only: +10.
- `precipitation_probability` max × 0.25 (up to +25).
- CAPE max: 500–1,000 +5; 1,000–2,500 +12; 2,500 or more +20.
- Lifted index min: −2 to −4 +5; below −4 +10; below −7 +15.
- CIN above 100 J/kg at the CAPE peak: −10. `lightning_potential` above 0: +5.
- Labels: 0–14 none, 15–29 low, 30–49 possible, 50–69 likely, 70+ very likely.
- A "Severe ingredients" chip for gusts of 93 km/h (58 mph) or more, or hail.

## Flood (per day)
Rain rate (max hourly): 10–25 mm/h +10; 25–50 +25; 50+ +40. Daily total: 25–50 +10;
50–100 +20; 100+ +30. Antecedent (past 48 h over 50 mm, or wet topsoil): +15. 3-day total over 100 mm +10,
over 200 mm +20. River above p75 +5, at the ensemble max +15. Coastal water level in the top 10%: +10.
Labels: 0–9 non_threatening, 10–24 very_low, 25–44 low, 45–64 moderate, 65–84 high, 85+ extreme.

## Rules
- Clamp to 0–100. Each score returns its top 2–3 `reasons` in plain words.
- Null inputs: skip that factor and add a reason ("instability data unavailable").
- Labels borrow NWS names but are heuristics. Never present them as NWS probabilities.
- NWS alerts override (see the nws-alerts skill).
- Thresholds are uncalibrated. Calibration means comparing against NOAA Atlas 14
  (hdsc.nws.noaa.gov/pfds) and past NWS warnings for Florida cases, and documenting
  every threshold change in `docs/` with its evidence.
