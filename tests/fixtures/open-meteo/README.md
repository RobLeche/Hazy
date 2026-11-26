# Open-Meteo fixtures

| File | Provenance |
|---|---|
| `forecast-tampa-2026-11-25.json`, `marine-tampa-bay-2026-11-25.json` | REAL responses recorded 2026-11-25 (copied from `knowledge/api-integration-expert/examples/fixtures/`). Do not edit. The forecast fixture predates `convective_inhibition`, `uv_index` (hourly), `soil_moisture_0_to_1cm` and `past_days`, so parsers must return null for them. |
| `geocoding-tampa-fl.synthetic.json` | SYNTHETIC, hand-built from the documented field list. Not a recorded response. Replace with a real capture when network access exists. |
| `flood-synthetic.json` | SYNTHETIC. The flood response shape (daily parallel arrays) is assumed, not recorded. |
