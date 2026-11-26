// Hazy scoring: pure thunderstorm and flood scores per day and per time block. No I/O, no clock, no network.
// Owner: meteorology-risk-analyst (Skye). Ported from knowledge/meteorology-risk-analyst/examples/scoring.ts (tested).
//
// Honest by design:
// - The labels borrow NWS names but are HEURISTICS from forecast numbers. They are not NWS probabilities and not a warning.
// - A null input skips its factor and adds a reason; null is never coerced to 0.
// - Reasons are plain language with no jargon and no units (the UI converts units; CAPE and lifted index numbers are
//   returned separately in `technical` for the nested "Technical details" part of Why?).
// - An active NWS flood warning or watch raises the flood level (wording.ts applyNwsOverride); it never lowers anything.
import type { DayRisk, FloodLevel, HourPoint, NwsAlert, ThunderLevel, TimeBlock } from "./types.ts";
import { TIME_BLOCKS } from "./types.ts";
import { THRESHOLDS, type PointTable } from "./thresholds.ts";
import { applyNwsOverride, type TimeWindow } from "./wording.ts";

/* ------------------------------------------------------------------ */
/* Inputs and outputs                                                  */
/* ------------------------------------------------------------------ */

/** Optional per-day values from the Open-Meteo daily arrays (and Marine / Flood APIs). Missing or null means unknown. */
export interface DailyPoint {
  /** Local day "YYYY-MM-DD". */
  date: string;
  /** `precipitation_sum`, mm. Preferred over the hourly sum for the day total. */
  precipitationSumMm?: number | null;
  /** `precipitation_probability_max`, %. */
  precipProbabilityMax?: number | null;
  /** `wind_gusts_10m_max`, km/h. */
  windGustsMaxKmh?: number | null;
  /** `uv_index_max`. */
  uvIndexMax?: number | null;
  /** Marine daily `wave_height_max`, m. */
  waveHeightMaxM?: number | null;
  /** Marine daily max `sea_surface_temperature`, C. */
  seaSurfaceTempC?: number | null;
  /** Flood API `river_discharge` and its climatology for that day, m3/s. All three needed for the river factor. */
  riverDischarge?: number | null;
  riverP75?: number | null;
  riverMax?: number | null;
}

export interface ScoreOptions {
  /** Observed rain over the 48 h before now, mm. Used for the FIRST output day; other days derive it from `hours`. */
  past48hMm?: number | null;
  /** Active NWS alerts for the point (already trimmed). Only flood warnings and watches change the output. */
  alerts?: readonly NwsAlert[];
  /** Local date "YYYY-MM-DD". Days before it (the past_days rows) are used as antecedent rain but not returned. */
  fromDate?: string;
}

/** Thunder and flood result for one time block of a day. */
export interface BlockRisk {
  block: TimeBlock;
  thunder: { score: number; level: ThunderLevel };
  flood: { score: number; level: FloodLevel };
}

/** Numbers for the "Technical details" disclosure only (jargon allowed there, nowhere else). */
export interface TechnicalDetails {
  capeMaxJkg: number | null;
  liftedIndexMin: number | null;
  peakRateMmH: number | null;
  totalMm: number | null;
}

export interface ScoredDay {
  risk: DayRisk;
  /** Blocks that have data, in morning, afternoon, evening, night order. */
  blocks: BlockRisk[];
  technical: TechnicalDetails;
}

/* ------------------------------------------------------------------ */
/* Small helpers                                                       */
/* ------------------------------------------------------------------ */

const fin = (v: number | null | undefined): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);
const maxOf = (xs: readonly (number | null)[]): number | null =>
  xs.reduce<number | null>((m, v) => (v === null ? m : m === null ? v : Math.max(m, v)), null);
const minOf = (xs: readonly (number | null)[]): number | null =>
  xs.reduce<number | null>((m, v) => (v === null ? m : m === null ? v : Math.min(m, v)), null);
/** Sum of the non-null values; null when every value is null. */
const sumOf = (xs: readonly (number | null)[]): number | null =>
  xs.reduce<number | null>((s, v) => (v === null ? s : (s ?? 0) + v), null);
const clampScore = (n: number): number => Math.max(0, Math.min(100, Math.round(n)));
const round1 = (n: number): number => Math.round(n * 10) / 10;
/** Points of the first row whose threshold the value reaches (>=). */
const band = (v: number, table: PointTable): number => table.find(([t]) => v >= t)?.[1] ?? 0;

const HOUR_MS = 3_600_000;

interface Factor { weight: number; text: string }
/** Top reasons by weight (max `limit`), then the "unavailable" notes appended so a missing input is never silent. */
function pickReasons(factors: Factor[], unavailable: string[], fallback: string, limit = 3): string[] {
  const top = [...factors].sort((a, b) => b.weight - a.weight).map((f) => f.text);
  const room = Math.max(0, limit - unavailable.length);
  const out = [...top.slice(0, room), ...unavailable].slice(0, limit);
  return out.length > 0 ? out : [fallback];
}

export function blockOfHour(hour: number): TimeBlock {
  for (const b of TIME_BLOCKS) {
    const { from, to } = THRESHOLDS.blocks[b];
    if (from <= to ? hour >= from && hour <= to : hour >= from || hour <= to) return b;
  }
  return "night";
}

/* ------------------------------------------------------------------ */
/* Thunderstorm score                                                  */
/* ------------------------------------------------------------------ */

export interface ThunderScore {
  score: number;
  level: ThunderLevel;
  hail: boolean;
  reasons: string[];
  /** Hours with a thunder weather code (tie-break for the peak block). */
  stormHours: number;
  capeMax: number | null;
  liMin: number | null;
}

const thunderLevel = (score: number): ThunderLevel => {
  const m = THRESHOLDS.thunder.levelMin;
  return score >= m.veryLikely ? "very_likely" : score >= m.likely ? "likely" : score >= m.possible ? "possible" : score >= m.low ? "low" : "none";
};

export function thunderScore(hours: readonly HourPoint[]): ThunderScore {
  const T = THRESHOLDS.thunder;
  const factors: Factor[] = [];
  const unavailable: string[] = [];
  let s = 0;

  const codes = hours.map((h) => fin(h.weatherCode));
  const thunderCodes: readonly number[] = T.thunderCodes;
  const hailCodes: readonly number[] = T.hailCodes;
  const showerCodes: readonly number[] = T.showerCodes;
  const stormHours = codes.filter((c) => c !== null && thunderCodes.includes(c)).length;
  const hail = codes.some((c) => c !== null && hailCodes.includes(c));
  if (stormHours > 0) {
    s += T.codeThunderPts;
    factors.push({ weight: T.codeThunderPts, text: "The forecast model shows thunderstorms." });
  } else if (codes.some((c) => c !== null && showerCodes.includes(c))) {
    s += T.showerPts;
    factors.push({ weight: T.showerPts, text: "Showers are in the forecast." });
  }

  const prob = maxOf(hours.map((h) => fin(h.precipProbability)));
  if (prob !== null) {
    const pts = Math.min(T.probCapPts, prob * T.probFactor);
    s += pts;
    if (pts >= 12.5) factors.push({ weight: pts, text: "Rain is likely at some point." });
    else if (pts >= 5) factors.push({ weight: pts, text: "There is a chance of rain." });
  }

  const cape = maxOf(hours.map((h) => fin(h.cape)));
  const li = minOf(hours.map((h) => fin(h.liftedIndex)));
  const capePts = cape === null ? 0 : band(cape, T.capePts);
  const liPts = li === null ? 0 : (T.liftedIndexPts.find(([t]) => li < t)?.[1] ?? 0);
  s += capePts + liPts;
  const instability = capePts + liPts;
  if (instability >= 25) factors.push({ weight: instability, text: "The air looks very unstable, which fuels strong storms." });
  else if (instability >= 10) factors.push({ weight: instability, text: "The air looks unstable enough to fuel storms." });
  else if (instability > 0) factors.push({ weight: instability, text: "The air is a little unstable." });
  else if (cape !== null && cape < T.stableCapeJkg) factors.push({ weight: 0.5, text: "The air looks stable, which limits storms." });
  if (cape === null) unavailable.push("Instability data isn't available, so storm risk may be understated.");

  if (cape !== null) {
    const peak = hours.find((h) => fin(h.cape) === cape);
    const cin = peak === undefined ? null : fin(peak.convectiveInhibition);
    if (cin !== null && cin > T.cinStrongJkg) {
      s -= T.cinPenaltyPts;
      factors.push({ weight: 100, text: "A layer of warm air aloft may keep storms from forming." });
    }
  }

  const score = clampScore(s);
  return {
    score, level: thunderLevel(score), hail, stormHours, capeMax: cape, liMin: li,
    reasons: pickReasons(factors, unavailable, "No storm signals in the forecast."),
  };
}

/* ------------------------------------------------------------------ */
/* Flood score                                                         */
/* ------------------------------------------------------------------ */

export interface FloodInputs {
  hours: readonly HourPoint[];
  /** Day total in mm if known (daily `precipitation_sum`); else the hourly sum is used. */
  totalMm: number | null;
  /** Rain in the 48 h before the day starts, mm; null skips the wet-ground factor. */
  prior48Mm: number | null;
  river?: { discharge: number | null; p75: number | null; max: number | null };
}

export interface FloodScore {
  score: number;
  level: FloodLevel;
  reasons: string[];
  peakRateMmH: number | null;
  totalMm: number | null;
}

const floodLevel = (score: number): FloodLevel => {
  const m = THRESHOLDS.flood.levelMin;
  return score >= m.extreme ? "extreme" : score >= m.high ? "high" : score >= m.moderate ? "moderate" : score >= m.low ? "low" : score >= m.veryLow ? "very_low" : "non_threatening";
};

/** Lowest score of a level, so a raised level and its score stay consistent. */
const FLOOD_MIN_SCORE: Record<FloodLevel, number> = {
  non_threatening: 0,
  very_low: THRESHOLDS.flood.levelMin.veryLow,
  low: THRESHOLDS.flood.levelMin.low,
  moderate: THRESHOLDS.flood.levelMin.moderate,
  high: THRESHOLDS.flood.levelMin.high,
  extreme: THRESHOLDS.flood.levelMin.extreme,
};

export function floodScore(inp: FloodInputs): FloodScore {
  const F = THRESHOLDS.flood;
  const factors: Factor[] = [];
  const unavailable: string[] = [];
  let s = 0;

  const rate = maxOf(inp.hours.map((h) => fin(h.precipitationMm)));
  const total = fin(inp.totalMm) ?? sumOf(inp.hours.map((h) => fin(h.precipitationMm)));
  if (rate === null && total === null) unavailable.push("Rain data isn't available, so flood risk may be understated.");

  const ratePts = rate === null ? 0 : band(rate, F.ratePts);
  s += ratePts;
  if (ratePts >= 25) factors.push({ weight: ratePts, text: "Very heavy rain could fall in a short time." });
  else if (ratePts > 0) factors.push({ weight: ratePts, text: "Heavy downpours are possible." });

  const totalPts = total === null ? 0 : band(total, F.totalPts);
  s += totalPts;
  if (totalPts >= 20) factors.push({ weight: totalPts, text: "A lot of rain is forecast for the day." });
  else if (totalPts > 0) factors.push({ weight: totalPts, text: "Steady rain adds up through the day." });

  // Wet ground: the larger of the antecedent factor and the 3-day total, never both (same water).
  if (inp.prior48Mm !== null) {
    const antecedent = inp.prior48Mm > F.antecedentMm ? F.antecedentPts : 0;
    const threeDay = band(inp.prior48Mm + (total ?? 0), F.threeDayPts);
    const wet = Math.max(antecedent, threeDay);
    s += wet;
    if (wet > 0) factors.push({ weight: wet, text: "The ground is already wet from recent rain." });
  }

  const r = inp.river;
  if (r && r.discharge !== null && r.p75 !== null && r.max !== null) {
    const pts = r.discharge >= r.max ? F.riverAtMaxPts : r.discharge > r.p75 ? F.riverAboveP75Pts : 0;
    s += pts;
    if (pts > 0) factors.push({ weight: pts, text: "A nearby river is running higher than usual." });
  }

  const score = clampScore(s);
  return {
    score, level: floodLevel(score), peakRateMmH: rate, totalMm: total === null ? null : round1(total),
    reasons: pickReasons(factors, unavailable, "No heavy rain is forecast."),
  };
}

/* ------------------------------------------------------------------ */
/* Chips                                                               */
/* ------------------------------------------------------------------ */

/** "Strong gusts or hail possible" chip: gusts of 93 km/h (58 mph) or more, or a hail weather code. */
export function hasSevereIngredients(day: { thunder: { hail: boolean }; gustMaxKmh: number | null }): boolean {
  return day.thunder.hail || (day.gustMaxKmh !== null && day.gustMaxKmh >= THRESHOLDS.severeGustKmh);
}

/* ------------------------------------------------------------------ */
/* Days                                                                */
/* ------------------------------------------------------------------ */

function dayWindow(hours: readonly HourPoint[]): TimeWindow {
  return { startMs: Math.min(...hours.map((h) => h.utcMs)), endMs: Math.max(...hours.map((h) => h.utcMs)) + HOUR_MS };
}

function raiseFlood(f: { score: number; level: FloodLevel }, alerts: readonly NwsAlert[], win: TimeWindow) {
  const o = applyNwsOverride(f.level, alerts, win);
  if (o.source === "hazy") return { score: f.score, level: f.level };
  return { score: Math.max(f.score, FLOOD_MIN_SCORE[o.level]), level: o.level, event: o.event };
}

/** Rain in [dayStart - 48 h, dayStart) from the hour rows; null if fewer than antecedentMinHours values exist. */
function derivePrior48(all: readonly HourPoint[], dayStartMs: number): number | null {
  const vals = all.filter((h) => h.utcMs >= dayStartMs - 48 * HOUR_MS && h.utcMs < dayStartMs).map((h) => fin(h.precipitationMm));
  const present = vals.filter((v) => v !== null).length;
  return present >= THRESHOLDS.flood.antecedentMinHours ? sumOf(vals) : null;
}

const byTime = (a: HourPoint, b: HourPoint): number => a.utcMs - b.utcMs;

/**
 * Score every local day found in `hours` (ascending dates, from `opts.fromDate`), with blocks and technical details.
 * `hours` should include the past_days rows so antecedent rain can be derived. Input is not mutated.
 */
export function scoreDaysDetailed(hours: readonly HourPoint[], daily: readonly DailyPoint[] = [], opts: ScoreOptions = {}): ScoredDay[] {
  const sorted = [...hours].sort(byTime);
  const dates = [...new Set(sorted.map((h) => h.date))].sort();
  const wanted = opts.fromDate === undefined ? dates : dates.filter((d) => d >= (opts.fromDate as string));
  const dailyByDate = new Map(daily.map((d) => [d.date, d]));
  const alerts = opts.alerts ?? [];

  return wanted.map((date, idx): ScoredDay => {
    const dh = sorted.filter((h) => h.date === date);
    const win = dayWindow(dh);
    const dp = dailyByDate.get(date);
    const prior48 = idx === 0 && fin(opts.past48hMm) !== null ? fin(opts.past48hMm) : derivePrior48(sorted, win.startMs);
    const dailyTotal = fin(dp?.precipitationSumMm);

    const river = dp ? { discharge: fin(dp.riverDischarge), p75: fin(dp.riverP75), max: fin(dp.riverMax) } : undefined;
    const th = thunderScore(dh);
    const fl = floodScore({ hours: dh, totalMm: dailyTotal, prior48Mm: prior48, ...(river ? { river } : {}) });
    const raised = raiseFlood(fl, alerts, win);

    const blocks: BlockRisk[] = [];
    const blockStorm = new Map<TimeBlock, number>();
    for (const block of TIME_BLOCKS) {
      const bh = dh.filter((h) => blockOfHour(h.hour) === block);
      if (bh.length === 0) continue;
      const bt = thunderScore(bh);
      const bf = floodScore({ hours: bh, totalMm: null, prior48Mm: prior48, ...(river ? { river } : {}) });
      const bRaised = raiseFlood(bf, alerts, win);
      blockStorm.set(block, bt.stormHours);
      blocks.push({
        block,
        thunder: { score: bt.score, level: bt.level },
        flood: { score: bRaised.score, level: bRaised.level },
      });
    }

    // Peak block: highest thunder score; ties go to the block with more thunder-code hours, then the earlier block.
    let peak: BlockRisk | undefined;
    for (const b of blocks) {
      if (peak === undefined || b.thunder.score > peak.thunder.score
        || (b.thunder.score === peak.thunder.score && (blockStorm.get(b.block) ?? 0) > (blockStorm.get(peak.block) ?? 0))) peak = b;
    }

    const probMax = fin(dp?.precipProbabilityMax) ?? maxOf(dh.map((h) => fin(h.precipProbability)));
    const gust = fin(dp?.windGustsMaxKmh) ?? maxOf(dh.map((h) => fin(h.windGustsKmh)));
    const uv = fin(dp?.uvIndexMax) ?? maxOf(dh.map((h) => fin(h.uvIndex)));
    const wave = fin(dp?.waveHeightMaxM);
    const sst = fin(dp?.seaSurfaceTempC);

    const risk: DayRisk = {
      date,
      thunder: {
        score: th.score,
        level: th.level,
        ...(peak !== undefined && th.level !== "none" ? { peakBlock: peak.block } : {}),
        hail: th.hail,
        reasons: th.reasons,
      },
      flood: {
        score: raised.score,
        level: raised.level,
        reasons: fl.reasons,
        ...("event" in raised && raised.event !== undefined ? { nwsOverride: raised.event } : {}),
      },
      rain: { totalMm: fl.totalMm, maxRateMmH: fl.peakRateMmH, probMax },
      uvMax: uv,
      gustMaxKmh: gust,
      ...(wave !== null || sst !== null ? { marine: { waveMaxM: wave, sstC: sst } } : {}),
    };
    return {
      risk,
      blocks,
      technical: { capeMaxJkg: th.capeMax, liftedIndexMin: th.liMin, peakRateMmH: fl.peakRateMmH, totalMm: fl.totalMm },
    };
  });
}

/** Same as scoreDaysDetailed but only the `DayRisk[]` contract (src/lib/types.ts). */
export function scoreDays(hours: readonly HourPoint[], daily: readonly DailyPoint[] = [], opts: ScoreOptions = {}): DayRisk[] {
  return scoreDaysDetailed(hours, daily, opts).map((d) => d.risk);
}
