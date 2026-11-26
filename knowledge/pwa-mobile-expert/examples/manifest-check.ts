// Example 1 — Check a manifest against MDN's Chromium installability requirements plus Hazy rules.
// Source: https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable

interface Icon { src: string; sizes?: string; type?: string; purpose?: string }
interface Manifest { name?: string; short_name?: string; icons?: Icon[]; start_url?: string; display?: string; display_override?: string[]; prefer_related_applications?: boolean; id?: string; scope?: string }

export function installProblems(m: Manifest): string[] {
  const p: string[] = [];
  if (!m.name && !m.short_name) p.push("name or short_name is required");
  const sizes = new Set((m.icons ?? []).flatMap((i) => (i.sizes ?? "").split(/\s+/)));
  if (!sizes.has("192x192")) p.push("icons must include 192x192");
  if (!sizes.has("512x512")) p.push("icons must include 512x512");
  if (!m.start_url) p.push("start_url is required");
  if (!m.display && !m.display_override?.length) p.push("display or display_override is required");
  if (m.prefer_related_applications === true) p.push("prefer_related_applications must be false or absent");
  // Hazy rules (web.dev: iOS supports only standalone; maskable icon for Android adaptive icons)
  if (m.display !== "standalone") p.push("Hazy: display must be 'standalone' (iOS falls back otherwise)");
  if (!(m.icons ?? []).some((i) => i.purpose?.split(" ").includes("maskable"))) p.push("Hazy: add a maskable icon");
  if (!m.id) p.push("Hazy: set an explicit id");
  return p;
}
