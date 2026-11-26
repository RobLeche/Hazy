// Example 2 — NWS alert override + honest headline wording.
// Sources: docs/nws-risk-scales.md (NWS alerts are official), docs/safety-messaging.md (TADD wording)
import type { FloodLevel } from "./scoring.ts";

const ORDER: FloodLevel[] = ["non_threatening", "very_low", "low", "moderate", "high", "extreme"];
const atLeast = (a: FloodLevel, b: FloodLevel): FloodLevel => (ORDER.indexOf(a) >= ORDER.indexOf(b) ? a : b);

export interface NwsAlert { event: string }

export function applyNwsOverride(level: FloodLevel, alerts: NwsAlert[]): { level: FloodLevel; source: "hazy" | "nws"; label?: string } {
  const warn = alerts.find((a) => /Flash Flood Warning|Flood Warning/.test(a.event));
  if (warn) return { level: atLeast(level, "high"), source: "nws", label: warn.event };
  const watch = alerts.find((a) => /Flood Watch|Flash Flood Watch/.test(a.event));
  if (watch) return { level: atLeast(level, "moderate"), source: "nws", label: watch.event };
  return { level, source: "hazy" };
}

const WORD: Record<FloodLevel, string | null> = {
  non_threatening: null, very_low: "Flooding unlikely", low: "Minor flooding possible on low roads",
  moderate: "Flooding possible", high: "Flooding likely", extreme: "Dangerous flooding possible",
};

export function floodHeadline(level: FloodLevel, when: string, source: "hazy" | "nws", label?: string): string | null {
  if (source === "nws" && label) return `National Weather Service: ${label}`;
  const w = WORD[level];
  return w ? `${w} ${when}` : null;
}

export const TADD = "Turn Around Don't Drown®: it is never safe to drive or walk into flood waters. — National Weather Service";
