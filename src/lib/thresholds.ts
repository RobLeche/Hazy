// Hazy scoring thresholds: the ONE config object read by src/lib/scoring.ts and src/lib/wording.ts.
// Owner: meteorology-risk-analyst (Skye). Pure data, no imports of runtime code.
//
// Every number is an UNCALIBRATED heuristic unless an official source is named beside it.
// Sources: knowledge/meteorology-risk-analyst/docs/instability-indices.md (NWS Houston, Louisville, Lincoln),
// nws-risk-scales.md (level names only, never NWS probabilities), open-meteo-variables-for-scoring.md.
// Changing a number means documenting the evidence (NOAA Atlas 14, past NWS warnings) in docs/scoring-calibration.md.

/** Rows are [threshold, points], listed from the highest threshold down. First row the value reaches wins. */
export type PointTable = readonly (readonly [number, number])[];

export const THRESHOLDS = {
  thunder: {
    /** Model weather_code 95/96/99 in any hour of the day or block. */
    codeThunderPts: 45,
    /** Codes 96 and 99 (hail). Open-Meteo says only some models report them. */
    hailCodes: [96, 99],
    thunderCodes: [95, 96, 99],
    /** Shower codes 80-82 only (no thunder code). */
    showerCodes: [80, 81, 82],
    showerPts: 10,
    /** precipitation_probability max x this factor, capped. Probability says nothing about intensity. */
    probFactor: 0.25,
    probCapPts: 25,
    /** CAPE max, J/kg. NWS Lincoln: under 1000 is weak; Louisville: 1000-2500 moderate; Houston: above 2500 extremely large. */
    capePts: [[2500, 20], [1000, 12], [500, 5]],
    /** Lifted index min. NWS Houston: below -4 large, below -7 extreme. Strictly "less than". */
    liftedIndexPts: [[-7, 15], [-4, 10], [-2, 5]],
    /** CIN above this at the hour of peak CAPE subtracts points (NWS Houston: > 100 J/kg is significant). */
    cinStrongJkg: 100,
    cinPenaltyPts: 10,
    /** Score bounds for the labels (score >= bound). */
    levelMin: { low: 15, possible: 30, likely: 50, veryLikely: 70 },
    /** Under this CAPE the air is called stable in the reasons (same cut as the first CAPE row). */
    stableCapeJkg: 500,
  },
  flood: {
    /** Peak hourly precipitation, mm/h (0.4, 1 and 2 in/h). */
    ratePts: [[50, 40], [25, 25], [10, 10]],
    /** Total for the day, mm. */
    totalPts: [[100, 30], [50, 20], [25, 10]],
    /** Rain in the 48 h before the day starts: above this wets the ground. */
    antecedentMm: 50,
    antecedentPts: 15,
    /**
     * Rain over the day plus the 48 h before it. Used as an ALTERNATIVE to the antecedent factor (the larger of the
     * two counts), so the same wet ground is never counted twice. Rows are [mm, points].
     */
    threeDayPts: [[200, 20], [100, 10]],
    /** Hours of observed or forecast rain needed before the 48 h sum is trusted (else null, factor skipped). */
    antecedentMinHours: 24,
    /** River discharge (GloFAS) relative to its own climatology. Secondary signal only. */
    riverAboveP75Pts: 5,
    riverAtMaxPts: 15,
    levelMin: { veryLow: 10, low: 25, moderate: 45, high: 65, extreme: 85 },
  },
  /** Chip "Strong gusts or hail possible": gusts of 93 km/h (58 mph, the NWS severe thunderstorm wind criterion) or hail. */
  severeGustKmh: 93,
  /** Local-hour blocks (inclusive). Night wraps midnight: 22-23 and 00-05 of the SAME calendar date. */
  blocks: {
    morning: { from: 6, to: 11 },
    afternoon: { from: 12, to: 17 },
    evening: { from: 18, to: 21 },
    night: { from: 22, to: 5 },
  },
  /** Safety advice shows from these levels up (copy-deck advice.*). Rank scale in wording.ts. */
  advice: { lightningMinRank: 3, floodMinRank: 2 },
  /** NWS events that raise the displayed flood level. Exact names; coastal flood is surge, not rain, so it is excluded. */
  nws: {
    floodWarningEvents: ["Flash Flood Warning", "Flood Warning"],
    floodWatchEvents: ["Flash Flood Watch", "Flood Watch"],
    warningMinLevel: "high",
    watchMinLevel: "moderate",
  },
} as const;

export type Thresholds = typeof THRESHOLDS;
