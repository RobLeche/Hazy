// Example 1 — Pure, explainable daily thunderstorm + flood scores (the shape src/lib/scoring.ts must keep).
// Thresholds: docs/instability-indices.md, docs/nws-risk-scales.md; definitions: docs/open-meteo-variables-for-scoring.md

export interface Hour { hour: number; precipMm: number | null; prob: number | null; code: number | null; cape: number | null; li: number | null; cin?: number | null }
export type ThunderLevel = "none" | "low" | "possible" | "likely" | "very_likely";
export type FloodLevel = "non_threatening" | "very_low" | "low" | "moderate" | "high" | "extreme";

export const T = {
  capePts: [[2500, 20], [1000, 12], [500, 5]] as const,
  liPts: [[-7, 15], [-4, 10], [-2, 5]] as const,
  ratePts: [[50, 40], [25, 25], [10, 10]] as const,   // mm/h  (2 in/h, 1 in/h, 0.4 in/h)
  totalPts: [[100, 30], [50, 20], [25, 10]] as const, // mm/day
  antecedentMm: 50, antecedentPts: 15,
};

const max = (xs: (number | null)[]) => xs.reduce<number | null>((m, v) => (v === null ? m : m === null ? v : Math.max(m, v)), null);
const min = (xs: (number | null)[]) => xs.reduce<number | null>((m, v) => (v === null ? m : m === null ? v : Math.min(m, v)), null);
const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));
const band = (v: number, table: readonly (readonly [number, number])[]) => table.find(([t]) => v >= t)?.[1] ?? 0;

export function thunder(hours: Hour[]) {
  const reasons: string[] = [];
  let s = 0;
  const codes = hours.map((h) => h.code);
  const hail = codes.some((c) => c === 96 || c === 99);
  if (codes.some((c) => c === 95 || c === 96 || c === 99)) { s += 45; reasons.push("Model forecasts thunderstorms"); }
  else if (codes.some((c) => c !== null && c >= 80 && c <= 82)) { s += 10; reasons.push("Showers forecast"); }
  const p = max(hours.map((h) => h.prob));
  if (p !== null) s += Math.min(25, p * 0.25);
  const cape = max(hours.map((h) => h.cape));
  if (cape === null) reasons.push("Instability data unavailable");
  else { const pts = band(cape, T.capePts); s += pts; if (pts) reasons.push(`CAPE ${cape} J/kg`); }
  const li = min(hours.map((h) => h.li));
  if (li !== null) { const pts = T.liPts.find(([t]) => li < t)?.[1] ?? 0; s += pts; if (pts) reasons.push(`Lifted index ${li}`); }
  const peak = hours.find((h) => h.cape === cape);
  if (peak?.cin != null && peak.cin > 100) { s -= 10; reasons.push("Strong cap may suppress storms"); }
  const score = clamp(s);
  const level: ThunderLevel = score >= 70 ? "very_likely" : score >= 50 ? "likely" : score >= 30 ? "possible" : score >= 15 ? "low" : "none";
  return { score, level, hail, reasons };
}

export function flood(hours: Hour[], past48hMm: number | null) {
  const reasons: string[] = [];
  let s = 0;
  const rate = max(hours.map((h) => h.precipMm)) ?? 0;
  const total = hours.reduce((a, h) => a + (h.precipMm ?? 0), 0);
  const r = band(rate, T.ratePts); s += r; if (r) reasons.push(`Peak rain ${rate} mm/h`);
  const t = band(total, T.totalPts); s += t; if (t) reasons.push(`${Math.round(total)} mm today`);
  if (past48hMm !== null && past48hMm > T.antecedentMm) { s += T.antecedentPts; reasons.push("Ground already wet"); }
  const score = clamp(s);
  const level: FloodLevel = score >= 85 ? "extreme" : score >= 65 ? "high" : score >= 45 ? "moderate" : score >= 25 ? "low" : score >= 10 ? "very_low" : "non_threatening";
  return { score, level, reasons, peakRateMm: rate, totalMm: Math.round(total * 10) / 10 };
}
