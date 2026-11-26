// Example 3 — Lint the copy deck against HIG writing rules + Hazy risk-communication rules.
// Sources: ../docs/hig-writing-onboarding.md (verbs on buttons, sentence case, plain language), hig-feedback-loading-alerts.md
const VERBS = new Set(["use", "search", "try", "approve", "ask", "cancel", "clear", "sign", "view", "restore", "save", "refresh", "install"]);
const JARGON = /\b(CAPE|lifted index|QPF|FFG|WMO|convective)\b/i;

export function lintButton(label: string): string[] {
  const p: string[] = []; const first = label.split(/\s+/)[0]!.toLowerCase();
  if (!VERBS.has(first)) p.push(`button should start with a verb: "${label}"`);
  if (label.split(/\s+/).slice(1).some((w) => /^[A-Z][a-z]/.test(w) && w !== "I")) p.push(`use sentence case: "${label}"`);
  if (label.length > 24) p.push(`button too long: "${label}"`);
  return p;
}
export function lintHeadline(h: string): string[] {
  const p: string[] = [];
  if (!/^(Storms|Flooding|Dangerous flooding|Thunderstorms|No (storms|flooding|thunderstorms))\b/.test(h)) p.push(`headline must start with the hazard: "${h}"`);
  if (/%|\d+ ?percent/i.test(h)) p.push(`no false precision: "${h}"`);
  if (JARGON.test(h)) p.push(`jargon in headline: "${h}"`);
  if (h.length > 40) p.push(`headline > 40 chars: "${h}"`);
  return p;
}
export function lintError(e: string): string[] {
  const p: string[] = [];
  if (!/[.]$/.test(e)) p.push(`error should be a full sentence: "${e}"`);
  if (/\b(you failed|invalid user|illegal)\b/i.test(e)) p.push(`accusatory tone: "${e}"`);
  return p;
}
