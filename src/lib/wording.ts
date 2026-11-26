// Hazy risk wording: NWS override plus headline selection. Pure, no I/O.
// Owner: meteorology-risk-analyst (Skye); copy co-owned with ux-designer-apple-hig (Wren).
// Ported from knowledge/meteorology-risk-analyst/examples/nws-override-and-wording.ts.
//
// This module returns copy-deck KEYS (docs/design/ux/copy-deck.json) and `{when}` keys, never finished sentences,
// so Wren owns every word. `renderHeadline` is a tiny helper that does the {when} substitution against the deck.
// Hierarchy (risk-communication skill): NWS alerts are official and shown first; the Hazy outlook is a heuristic.
import type { FloodLevel, NwsAlert, ThunderLevel, TimeBlock } from "./types.ts";
import { FLOOD_LEVELS, TIME_BLOCKS } from "./types.ts";
import { THRESHOLDS } from "./thresholds.ts";

/* ------------------------------------------------------------------ */
/* NWS override (docs: nws-alerts skill)                               */
/* ------------------------------------------------------------------ */

const floodRank = (l: FloodLevel): number => FLOOD_LEVELS.indexOf(l);
const atLeast = (a: FloodLevel, b: FloodLevel): FloodLevel => (floodRank(a) >= floodRank(b) ? a : b);

const isIn = (list: readonly string[], v: string): boolean => list.includes(v);

/** Window of one local day, in epoch ms: [startMs, endMs). */
export interface TimeWindow { startMs: number; endMs: number }

/**
 * Does the alert's onset..ends overlap the window? A null onset means "already active", a null ends means "open ended".
 * An unparseable timestamp is treated as null (fail toward showing the official alert).
 */
export function alertOverlaps(alert: Pick<NwsAlert, "onset" | "ends">, win: TimeWindow): boolean {
  const onset = alert.onset === null ? Number.NaN : Date.parse(alert.onset);
  const ends = alert.ends === null ? Number.NaN : Date.parse(alert.ends);
  const startsBeforeWindowEnds = Number.isNaN(onset) || onset < win.endMs;
  const endsAfterWindowStarts = Number.isNaN(ends) || ends > win.startMs;
  return startsBeforeWindowEnds && endsAfterWindowStarts;
}

export interface OverrideResult {
  level: FloodLevel;
  /** "nws" only when the alert actually RAISED the level (the "Raised by a National Weather Service alert" chip). */
  source: "hazy" | "nws";
  /** NWS event name, set with source "nws". */
  event?: string;
}

/**
 * Warning raises the displayed flood level to at least High; a watch to at least Moderate. Never lowers a level.
 * Pass `window` to ignore alerts that do not touch that day. Other event types are not flood overrides.
 */
export function applyNwsOverride(level: FloodLevel, alerts: readonly Pick<NwsAlert, "event" | "onset" | "ends">[], window?: TimeWindow): OverrideResult {
  const live = window ? alerts.filter((a) => alertOverlaps(a, window)) : alerts;
  const warn = live.find((a) => isIn(THRESHOLDS.nws.floodWarningEvents, a.event));
  if (warn) {
    const raised = atLeast(level, THRESHOLDS.nws.warningMinLevel);
    return raised === level ? { level, source: "hazy" } : { level: raised, source: "nws", event: warn.event };
  }
  const watch = live.find((a) => isIn(THRESHOLDS.nws.floodWatchEvents, a.event));
  if (watch) {
    const raised = atLeast(level, THRESHOLDS.nws.watchMinLevel);
    return raised === level ? { level, source: "hazy" } : { level: raised, source: "nws", event: watch.event };
  }
  return { level, source: "hazy" };
}

/* ------------------------------------------------------------------ */
/* Copy-deck keys                                                      */
/* ------------------------------------------------------------------ */

/** Deck key spellings differ from the code enums (camelCase, "nonthreatening"). One explicit map, so a rename fails to compile. */
const THUNDER_KEY: Record<ThunderLevel, string> = {
  none: "none", low: "low", possible: "possible", likely: "likely", very_likely: "veryLikely",
};
const FLOOD_KEY: Record<FloodLevel, string> = {
  non_threatening: "nonthreatening", very_low: "veryLow", low: "low", moderate: "moderate", high: "high", extreme: "extreme",
};

/** Rank scale from app-flows.md 2.3: none < low/veryLow/low < possible/moderate < likely/high < veryLikely/extreme. */
const THUNDER_RANK: Record<ThunderLevel, number> = { none: 0, low: 1, possible: 2, likely: 3, very_likely: 4 };
const FLOOD_RANK: Record<FloodLevel, number> = { non_threatening: 0, very_low: 1, low: 1, moderate: 2, high: 3, extreme: 4 };

export const thunderRank = (l: ThunderLevel): number => THUNDER_RANK[l];
export const floodLevelRank = (l: FloodLevel): number => FLOOD_RANK[l];

export type Hazard = "thunder" | "flood";

/** Keys under `headlines.when` in the deck. "weekday" is NOT in the deck yet: see the handoff to Wren. */
export type WhenKey = TimeBlock | "today" | "tomorrow" | "weekday";

export const levelCopyKey = (hazard: Hazard, level: ThunderLevel | FloodLevel): string =>
  hazard === "thunder" ? `levels.thunder.${THUNDER_KEY[level as ThunderLevel]}` : `levels.flood.${FLOOD_KEY[level as FloodLevel]}`;

export const whenCopyKey = (when: WhenKey): string => `headlines.when.${when}`;

export interface HeadlineSelection {
  hazard: Hazard;
  /** e.g. "headlines.thunder.likely" */
  headlineKey: string;
  /** e.g. "headlines.when.afternoon" (fills {when}) */
  whenKey: string;
  when: WhenKey;
  /** Code-side level of the chosen hazard (for tests and badges). */
  level: ThunderLevel | FloodLevel;
}

/** Hazard with the higher rank; a tie goes to thunder; both none gives thunder.none (app-flows.md 2.3). */
export function selectHeadline(thunder: ThunderLevel, flood: FloodLevel, when: WhenKey): HeadlineSelection {
  const useFlood = FLOOD_RANK[flood] > THUNDER_RANK[thunder];
  return useFlood
    ? { hazard: "flood", headlineKey: `headlines.flood.${FLOOD_KEY[flood]}`, whenKey: whenCopyKey(when), when, level: flood }
    : { hazard: "thunder", headlineKey: `headlines.thunder.${THUNDER_KEY[thunder]}`, whenKey: whenCopyKey(when), when, level: thunder };
}

/** Block-level input for today's headline (the `blocks` of a scored day). */
export interface BlockLevels { block: TimeBlock; thunder: ThunderLevel; flood: FloodLevel }

export interface DayHeadlineInput {
  thunder: ThunderLevel;
  flood: FloodLevel;
  blocks: readonly BlockLevels[];
}

/** Is a block finished at this local hour? The block containing the hour is still current. Night runs to the end of the date. */
export function blockIsOver(block: TimeBlock, nowHour: number): boolean {
  if (block === "night") return false;
  return nowHour > THRESHOLDS.blocks[block].to;
}

/**
 * Decision for `{when}` (answers Wren, app-flows.md 2.3):
 * - today (dayOffset 0): the HAZARD is chosen from the blocks that are not over, and `{when}` is the block where the chosen
 *   hazard peaks (earliest on ties), so "Storms likely this afternoon" is always about a block that is still ahead or current.
 *   Both none: thunder.none with "today".
 * - dayOffset 1: whole-day levels with "tomorrow".
 * - dayOffset 2 or more: whole-day levels with "weekday" (the UI fills the weekday name; needs a deck key).
 * `nowHour` is the place's local hour 0-23; omit it to treat every block as still ahead.
 */
export function headlineForDay(day: DayHeadlineInput, ctx: { dayOffset: number; nowHour?: number }): HeadlineSelection {
  if (ctx.dayOffset === 1) return selectHeadline(day.thunder, day.flood, "tomorrow");
  if (ctx.dayOffset >= 2) return selectHeadline(day.thunder, day.flood, "weekday");
  const ahead = day.blocks.filter((b) => ctx.nowHour === undefined || !blockIsOver(b.block, ctx.nowHour));
  if (ahead.length === 0) return selectHeadline(day.thunder, day.flood, "today");
  const order = (b: BlockLevels) => TIME_BLOCKS.indexOf(b.block);
  const peak = <L>(rank: (b: BlockLevels) => number, level: (b: BlockLevels) => L): { rank: number; block: TimeBlock; level: L } | null => {
    let best: BlockLevels | null = null;
    for (const b of ahead) if (best === null || rank(b) > rank(best) || (rank(b) === rank(best) && order(b) < order(best))) best = b;
    return best === null ? null : { rank: rank(best), block: best.block, level: level(best) };
  };
  const t = peak((b) => THUNDER_RANK[b.thunder], (b) => b.thunder);
  const f = peak((b) => FLOOD_RANK[b.flood], (b) => b.flood);
  if (t === null || f === null) return selectHeadline(day.thunder, day.flood, "today");
  if (t.rank === 0 && f.rank === 0) return selectHeadline("none", "non_threatening", "today");
  return f.rank > t.rank ? selectHeadline("none", f.level, f.block) : selectHeadline(t.level, "non_threatening", t.block);
}

/** Copy-deck keys for the safety advice line(s): lightning at Likely or higher, flood at Moderate or higher. */
export function adviceKeys(thunder: ThunderLevel, flood: FloodLevel): string[] {
  const keys: string[] = [];
  if (THUNDER_RANK[thunder] >= THRESHOLDS.advice.lightningMinRank) keys.push("advice.lightning");
  if (FLOOD_RANK[flood] >= THRESHOLDS.advice.floodMinRank) keys.push("advice.flood");
  return keys;
}

/** Copy-deck keys for the hero chips. */
export function chipKeys(opts: { nwsRaised: boolean; severe: boolean }): string[] {
  const keys: string[] = [];
  if (opts.nwsRaised) keys.push("badges.raisedByNws");
  if (opts.severe) keys.push("badges.severeChip");
  return keys;
}

/** Minimal shape of the copy deck that `renderHeadline` reads (the real JSON satisfies it). */
export interface HeadlineDeck {
  headlines: { when: Record<string, string> } & Record<string, unknown>;
}

const lookup = (deck: unknown, dotted: string): string | undefined => {
  let cur: unknown = deck;
  for (const part of dotted.split(".")) {
    if (typeof cur !== "object" || cur === null) return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return typeof cur === "string" ? cur : undefined;
};

/**
 * Fill `{when}` from the deck. `weekdayName` is used when `when` is "weekday" and the deck has no such key:
 * the result then reads "<headline without {when}> on <weekdayName>". Returns null if a key is missing.
 */
export function renderHeadline(deck: HeadlineDeck, sel: HeadlineSelection, weekdayName?: string): string | null {
  const template = lookup(deck, sel.headlineKey);
  if (template === undefined) return null;
  let when = lookup(deck, sel.whenKey);
  if (when === undefined && sel.when === "weekday" && weekdayName !== undefined) when = `on ${weekdayName}`;
  if (when === undefined) return null;
  return template.replace("{when}", when);
}
