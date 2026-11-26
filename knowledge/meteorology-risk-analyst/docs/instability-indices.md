# Thunderstorm ingredients and instability indices

Sources (read 2026-11-26):
- NWS Louisville, environmental parameters and indices: https://www.weather.gov/lmk/indices
- NWS Houston training, "Thunderstorms" (J. Haby): https://www.weather.gov/source/zhu/ZHU_Training_Page/thunderstorm_stuff/Thunderstorms/thunderstorms.htm
- NWS Lincoln, CAPE: https://www.weather.gov/ilx/swop-severetopics-cape

## Ingredients (NWS Houston)
"There are three ingredients that must be present for a thunderstorm to occur. They are: MOISTURE, INSTABILITY, and
LIFTING." Wind shear is the fourth ingredient for **severe** storms. "Instability is often expressed using positive CAPE
or negative LI values." "Without a trigger mechanism, such as when a strong cap is present, storms may not form."

## CAPE (J/kg)
- NWS Lincoln: "CAPE values of less than 1000 J/kg represent weak instability" (range 0 to over 5,000).
- NWS Louisville: "CAPE = 1000 to 2500: Moderately unstable"; "CAPE above 3500–4000: Extremely unstable".
- NWS Houston: "CAPE of 1,500 J/kg is large with values above 2,500 J/kg being extremely large instability."

## Lifted index (LI)
NWS Houston: "LI values less than -4 are large with values less than -7 representing extreme instability."

## Convective inhibition (CIN, the "cap")
NWS Houston: "Low level stability is often referred to as negative CAPE, convective inhibition, or the cap";
"> 100 J/kg negative buoyancy is significant". In Open-Meteo, `convective_inhibition` is reported in J/kg.

## How Hazy uses them (thresholds in `src/lib/thresholds.ts`)
| CAPE | Points | LI | Points |
|---|---|---|---|
| < 500 | 0 | > −2 | 0 |
| 500–1,000 | +5 | −2 to −4 | +5 |
| 1,000–2,500 | +12 | < −4 | +10 |
| ≥ 2,500 | +20 | < −7 | +15 |
Subtract 10 when CIN is above 100 J/kg at the CAPE peak. Model `weather_code` 95 (+45) dominates because, per Open-Meteo,
models "derive thunderstorms from instability parameters".
