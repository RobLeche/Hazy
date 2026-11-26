# 01 — Use case, data sources and risk scoring

> Part of the Hazy research pack. See [README](README.md) for the index.
> Researched 2026-11-26 from the official docs linked under **Sources**.

## 1. The use case

A person in Florida (or any US state, or anywhere Open-Meteo covers) picks an
area, either by typing a place name or by using their location, and sees, for
**today and the next few days**:

- **Thunderstorm risk**: how likely storms are, and when in the day (Florida's
  summer storms cluster in the afternoon).
- **Flood risk**: heavy-rain and flash-flood potential, plus river and coastal
  signals where they apply.
- Supporting detail: rain totals, peak rain rate, wind gusts, UV index and, near
  the coast, wave height and sea temperature.

It answers "should I worry about storms or flooding today, tomorrow, this weekend?",
not "is there a warning right now?". Official warnings come from the National
Weather Service (NWS), and the app must say so (see §6).

### Who it is for

- Residents and commuters deciding whether to drive through low-lying streets.
- Beach-goers and boaters (waves, sea temperature, lightning).
- Outdoor workers and event planners (afternoon storm timing, UV, gusts).

### Non-goals

- Not a warning system. Never present an app score as an official alert.
- Not for navigation. The Marine API says plainly that it "is not suitable for coastal
  navigation and does not replace your nautical almanac".

## 2. Data sources (all free, no API key)

| Need | API | Base URL | Notes |
|---|---|---|---|
| Weather, rain, storms, UV, wind | Open-Meteo Forecast | `https://api.open-meteo.com/v1/forecast` | `forecast_days` default 7, max 16; `past_days` up to 92 |
| Waves, sea temperature, sea level | Open-Meteo Marine | `https://marine-api.open-meteo.com/v1/marine` | ~5–25 km models; unreliable inland |
| River flooding | Open-Meteo Flood (GloFAS v4) | `https://flood-api.open-meteo.com/v1/flood` | ~5 km cells; largest river within the cell only |
| Place search | Open-Meteo Geocoding | `https://geocoding-api.open-meteo.com/v1/search` | `name`, `count`, `language`, `countryCode` |
| Official alerts (US) | NWS API | `https://api.weather.gov/alerts/active?point={lat},{lon}` | No key, but a **User-Agent is required** |

### 2.1 Open-Meteo Forecast: variables to request

**Hourly** (verified names):

| Variable | Use |
|---|---|
| `precipitation`, `rain`, `showers` | Hourly totals give the peak rain *rate* (mm/h or in/h) |
| `precipitation_probability` | Chance of precipitation |
| `weather_code` | WMO code; **95 = thunderstorm**, 96/99 = thunderstorm with hail |
| `cape` | Convective Available Potential Energy (J/kg): storm fuel |
| `lifted_index` | Negative = unstable |
| `convective_inhibition` | The "cap"; large CIN suppresses storms |
| `wind_gusts_10m` | Gusts (storm outflow) |
| `uv_index` | UV |
| `soil_moisture_0_to_1cm` … `soil_moisture_27_to_81cm` | Antecedent wetness: wet soil means more runoff |
| `visibility` | Heavy-rain visibility |

**Daily**: `weather_code`, `precipitation_sum`, `precipitation_hours`,
`precipitation_probability_max`, `wind_gusts_10m_max`, `uv_index_max`.

**15-minutely**: `lightning_potential`. The docs say 15-minutely data is
"only available in Central Europe and North America. Other regions use interpolated
hourly data". It is a bonus signal in the US, not one to rely on everywhere.

**Query params**: `latitude`, `longitude` (comma-separated for several
locations; the JSON then becomes a list), `timezone` (use `auto`), `forecast_days`,
`past_days`, `models`, `timeformat`. For a US audience, also send
`temperature_unit=fahrenheit`, `wind_speed_unit=mph`, `precipitation_unit=inch`,
or keep metric internally and convert in the UI. **Recommendation: score in metric and
display in the user's chosen units**, so the thresholds below have one source of truth.

**WMO code caveat (from the docs)**: "Codes 96 and 99 are only reported by
models with an explicit hail forecast, such as DWD ICON or UKMO. All other models
derive thunderstorms from instability parameters." With the default US models,
expect code `95` and treat 96/99 as a bonus. Showers: 80 slight, 81 moderate,
82 violent.

Example request (Tampa, 7 days, plus 2 past days for antecedent rain):

```
https://api.open-meteo.com/v1/forecast?latitude=27.95&longitude=-82.46
  &hourly=precipitation,precipitation_probability,weather_code,cape,lifted_index,
          convective_inhibition,wind_gusts_10m,uv_index,soil_moisture_0_to_1cm
  &daily=weather_code,precipitation_sum,precipitation_hours,
         precipitation_probability_max,wind_gusts_10m_max,uv_index_max
  &timezone=auto&forecast_days=7&past_days=2
```

### 2.2 Open-Meteo Marine

Hourly: `wave_height`, `wave_direction`, `wave_period`, `wave_peak_period`,
`wind_wave_*`, `swell_wave_*` (plus secondary and tertiary swell),
`sea_surface_temperature`, `sea_level_height_msl`, `ocean_current_velocity`,
`ocean_current_direction`, `invert_barometer_height`.
Daily: `wave_height_max`, `wind_wave_height_max`, `swell_wave_height_max`,
`wave_direction_dominant`, `wave_period_max`, and similar.

Caveats, quoted: "Accuracy at coastal areas is limited … may be completely
unreliable further inland." **Only show the marine card when the location is
coastal.** In practice, request it and hide it when the values are null, or when
the geocoder result is more than about 10–20 km from the coast (a heuristic to
tune). The docs state the `forecast_days` default inconsistently (5 in the table,
7 in the text), so **always pass `forecast_days` explicitly** (for example 7).

`sea_level_height_msl` includes tides. Combined with `invert_barometer_height`
(the pressure-driven rise), it is a rough coastal water-level signal. It is **not**
a storm-surge forecast; surge comes from NHC/NWS.

### 2.3 Open-Meteo Flood (river discharge)

Variables: `river_discharge`, `river_discharge_mean`, `river_discharge_median`,
`river_discharge_max`, `river_discharge_min`, `river_discharge_p25`,
`river_discharge_p75`. Model: GloFAS v4 at 0.05° (~5 km). Default 92 days,
up to 210.

Limitations (quoted): it "returns river discharge data from the largest river in
a 5 km area", and "the closest river might not be selected correctly. Varying
coordinates by 0.1° can help". **It does not model flash or urban flooding**,
which is Florida's main flood type. Use it as a secondary "river running high"
indicator: compare forecast `river_discharge` with `river_discharge_p75` and
`river_discharge_max` from the ensemble statistics.

### 2.4 Geocoding: "pick an area in Florida (or any other state)"

`GET /v1/search?name=Miami, FL&count=10&language=en&countryCode=US`. The docs
say you can "append a country or first-level administrative area after a comma to
narrow the results", and that admin1 abbreviations are accepted. Response fields include
`latitude`, `longitude`, `admin1` (state), `admin2` (county), `country_code`,
`timezone`, `population`, `postcodes`. Searches need at least 2 characters.

UX: a search box with a state selector that defaults to Florida (append
`, <state>` to the query), plus a "Use my location" button (Geolocation API,
which needs a user gesture and HTTPS), plus saved places (stored on the device).

### 2.5 NWS alerts (authoritative overlay, US only)

`GET https://api.weather.gov/alerts/active?point=27.95,-82.46` returns GeoJSON
by default. No key, but the NWS asks every client to send a `User-Agent` that
identifies the app and a contact. **Browsers cannot set `User-Agent`**, so call
the NWS from a Netlify Function (see [03](03-architecture-netlify.md)). The NWS
rate limit is "generous"; when exceeded, retry after about 5 seconds. Show
Flood Watch/Warning, Flash Flood Warning and Severe Thunderstorm Warning
prominently, above the app's own score.

### 2.6 Terms of use (important for architecture)

Open-Meteo's free tier is **non-commercial only**: no ads, no subscriptions.
Limits: **600/min, 5,000/hour, 10,000/day, 300,000/month**. Licence: **CC BY 4.0**,
so the UI must show an attribution such as "Weather data by Open-Meteo.com".
If calls go through a server, every user shares the server's quota, so cache
aggressively (see [03](03-architecture-netlify.md) §4).

## 3. Scoring design

### 3.1 Principles

1. **Anchor the labels to NWS vocabulary**, so users who know NWS products read
   the app correctly, but **never claim NWS probabilities**. The app's score is a
   heuristic.
2. **Score per day and per time block** (for example Morning, Afternoon,
   Evening, Night), because Florida storms are diurnal.
3. **Explainable**: every score lists the 2–3 factors that drove it ("CAPE
   2,800 J/kg + 70% rain chance in the afternoon").
4. **Pure function**: `score(forecastJson, marineJson?, floodJson?) -> DayRisk[]`,
   with no I/O. That makes it unit-testable (see [05](05-testing-and-accessibility.md)).
5. **Calibrate later**: thresholds live in one config file and are tuned against
   past events with `past_days` and archive data.

### 3.2 Reference scales from official sources

**NWS Melbourne (east-central Florida), "Flood Threat Defined"** uses six levels:
Non-Threatening, Very Low, Low, Moderate, High, Extreme. They are defined by the
likelihood of flooding rain "within 12 miles of a location and within 6 hours of
nearby heavy rain", from very low (2–5%) up to very high (36% or more), and by the
ratio of forecast rain to Flash Flood Guidance (QPF/FFG of 0.75–1.25, 1.25–2.0,
and above 2.0).

**WPC Excessive Rainfall Outlook (ERO)** gives the probability that rainfall
exceeds Flash Flood Guidance within 25 miles (40 km) of a point:
Marginal 5–10%, Slight 10–20%, Moderate 20–50%, High above 50%.

**SPC convective outlook** (for wording): TSTM (10% or more chance of
thunderstorms, no severe expected; "lightning/flooding threats exist with all
thunderstorms"), then 1-Marginal, 2-Slight, 3-Enhanced, 4-Moderate, 5-High.

**Instability rules of thumb (NWS training pages)**:
- CAPE below 1,000 J/kg is weak; 1,000–2,500 is moderately unstable; 1,500 is
  "large"; above 2,500 is "extremely large"; above 3,500–4,000 is extremely
  unstable (NWS Louisville and Houston pages differ slightly).
- Lifted index below −4 is large instability; below −7 is extreme.
- Large convective inhibition (the "cap") can stop storms even with high CAPE.
  Over 100 J/kg of negative buoyancy is "significant".

> The app cannot compute Flash Flood Guidance (FFG); it is an NWS River Forecast
> Center product that the free APIs do not expose. The scores below use rain
> totals and rates as a stand-in for QPF/FFG, which makes them heuristics.

### 3.3 Thunderstorm score (0–100 per day, and per time block)

| Factor (hourly, within the block) | Points |
|---|---|
| Any hour with `weather_code` 95/96/99 | +45 (96/99 also set `hail=true`) |
| `weather_code` 80–82 (showers) without 95 | +10 |
| max `precipitation_probability` | +0.25 × pct (up to +25) |
| max `cape`: below 500 → 0; 500–1,000 → +5; 1,000–2,500 → +12; 2,500 or more → +20 | up to +20 |
| min `lifted_index`: −2 to −4 → +5; below −4 → +10; below −7 → +15 | up to +15 |
| `convective_inhibition` above 100 J/kg in the same hour as the CAPE peak | −10 |
| `lightning_potential` (North America, 15-min) above 0 | +5 |

Clamp to 0–100. Labels: 0–14 **None**, 15–29 **Low**, 30–49 **Possible**,
50–69 **Likely**, 70 and up **Very likely**. Add a "Severe ingredients" chip when
gusts exceed 58 mph (93 km/h, the NWS severe-gust threshold) or hail codes appear.

### 3.4 Flood score (0–100 per day)

Florida flooding is mostly **flash and urban flooding from intense rain on
saturated ground**, plus coastal (tide) flooding and slow river flooding after
tropical systems. The score combines four components:

| Component | Signal | Points (heuristic, to be calibrated) |
|---|---|---|
| **Rain rate** | max hourly `precipitation` | 10–25 mm/h (0.4–1 in/h) → +10; 25–50 mm/h (1–2 in/h) → +25; 50 mm/h or more (2 in/h or more) → +40 |
| **Daily total** | `precipitation_sum` | 25–50 mm → +10; 50–100 mm (2–4 in) → +20; 100 mm or more (4 in or more) → +30 |
| **Antecedent wetness** | sum of the past 48 h (`past_days=2`) plus `soil_moisture_0_to_1cm` | past 48 h over 50 mm, or top-layer soil moisture above ~0.40 m³/m³ → +15 (soil saturation depends on soil type, so treat this as a relative signal) |
| **Multi-day** | rolling 3-day total (forecast) | over 100 mm (4 in) → +10; over 200 mm (8 in) → +20 |
| **River** (optional) | `river_discharge` vs `river_discharge_p75`, `river_discharge_max` | above p75 → +5; above the ensemble max of recent days, or rising sharply → +15 |
| **Coastal** (optional, coastal only) | `sea_level_height_msl` + `invert_barometer_height` daily max vs its 30-day median | top 10% of the window → +10 (king tides combined with rain mean flooded streets) |

Labels (mirroring NWS Melbourne's names, explicitly **not** its probabilities):
0–9 **Non-threatening**, 10–24 **Very low**, 25–44 **Low**, 45–64 **Moderate**,
65–84 **High**, 85 and up **Extreme**.

**Override rule:** if the NWS reports an active Flash Flood Warning, Flood
Warning or Flood Watch for the point, show that alert first and raise the
displayed level to at least High (warning) or Moderate (watch), labelled as
"NWS alert".

Why these thresholds: 1–2 in/h is the range where urban drainage in Florida
cities is commonly overwhelmed, and 2 in/h or more is a frequent trigger in NWS
flash-flood messaging. These figures are **not** from a single verified source
in this pack. The calibration task for the team is to compare the scores against
NOAA Atlas 14 precipitation frequency estimates
(https://hdsc.nws.noaa.gov/pfds/) for 1-hour and 24-hour, 2-year and 10-year
return periods at the selected location, and against past NWS warnings.

### 3.5 UV, wind and marine extras (informational, not scored)

- UV index categories (WHO/EPA): 0–2 Low, 3–5 Moderate, 6–7 High, 8–10 Very high,
  11 and up Extreme.
- Wave height: show the daily max; above ~1.5 m (5 ft) flag "rough surf"
  (a heuristic; rip-current risk comes from the NWS Surf Zone Forecast).
- Sea surface temperature: display only.

### 3.6 Output shape (contract for the frontend)

```ts
type Level = "none" | "low" | "possible" | "likely" | "very_likely";
type FloodLevel = "non_threatening" | "very_low" | "low" | "moderate" | "high" | "extreme";

interface DayRisk {
  date: string;                       // local, YYYY-MM-DD
  thunder: { score: number; level: Level; peakBlock?: "morning"|"afternoon"|"evening"|"night"; hail: boolean; reasons: string[] };
  flood:   { score: number; level: FloodLevel; reasons: string[]; nwsOverride?: string };
  rain:    { totalMm: number; maxRateMmH: number; probMax: number };
  uvMax: number; gustMaxKmh: number;
  marine?: { waveMaxM: number; sstC: number };
}
```

## 4. Open questions for the team

- Calibrating the thresholds against past Florida events (the 2023 Fort
  Lauderdale rainfall, and summer 2024 and 2025 flash floods). This needs the
  Open-Meteo historical/archive API, which is not researched here.
- Whether to pin `models` (for example `gfs_seamless` or `best_match`) for
  consistent CAPE and lifted-index fields.
- Wording review with a meteorologist before any public launch.

## Sources

- Open-Meteo Forecast API docs: https://open-meteo.com/en/docs
- Open-Meteo Marine API docs: https://open-meteo.com/en/docs/marine-weather-api
- Open-Meteo Flood API docs: https://open-meteo.com/en/docs/flood-api
- Open-Meteo Geocoding API docs: https://open-meteo.com/en/docs/geocoding-api
- Open-Meteo terms: https://open-meteo.com/en/terms
- NWS API: https://www.weather.gov/documentation/services-web-api
- NWS Melbourne, Flood Threat Defined: https://www.weather.gov/mlb/flashflood_threat
- NWS, SPC vs WPC risk categories (PDF): https://www.weather.gov/media/ewx/iwt/SPC_WPC_Differences.pdf
- WPC Excessive Rainfall Outlook: https://www.wpc.ncep.noaa.gov/qpf/excessive_rainfall_outlook_ero.php
- NWS Louisville, environmental parameters and indices: https://www.weather.gov/lmk/indices
- NWS Houston training, thunderstorm ingredients: https://www.weather.gov/source/zhu/ZHU_Training_Page/thunderstorm_stuff/Thunderstorms/thunderstorms.htm
- NWS Lincoln, CAPE: https://www.weather.gov/ilx/swop-severetopics-cape
- Directory where the API was found: https://mcp-api.netlify.app/ (a directory of free APIs and MCP servers; it does not document Open-Meteo itself)
