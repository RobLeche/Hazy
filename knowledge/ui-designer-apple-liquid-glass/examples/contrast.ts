// WCAG 2.x contrast ratio + alpha compositing (to evaluate text on translucent glass over worst-case content).
// Formula: https://www.w3.org/TR/WCAG22/#dfn-relative-luminance ; thresholds: HIG accessibility table (4.5:1 / 3:1).
export type RGBA = [number, number, number, number];

export function parseColor(c: string): RGBA {
  const hex = c.trim().match(/^#([0-9a-f]{6})$/i);
  if (hex) { const n = parseInt(hex[1]!, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 1]; }
  const rgba = c.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+))?\s*\)$/i);
  if (rgba) return [Number(rgba[1]), Number(rgba[2]), Number(rgba[3]), rgba[4] === undefined ? 1 : Number(rgba[4])];
  throw new Error(`unsupported color ${c}`);
}

export function over(top: RGBA, bottom: RGBA): RGBA {
  const a = top[3];
  return [0, 1, 2].map((i) => Math.round(top[i]! * a + bottom[i]! * (1 - a))).concat(1) as RGBA;
}

const lin = (v: number) => { const s = v / 255; return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
export const luminance = ([r, g, b]: RGBA) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);

export function ratio(fg: RGBA, bg: RGBA): number {
  const [a, b] = [luminance(fg), luminance(bg)].sort((x, y) => y - x) as [number, number];
  return Math.round(((a + 0.05) / (b + 0.05)) * 100) / 100;
}

/** Read custom properties from a :root block (first match = light, or inside a given @media query). */
export function readTokens(css: string, media?: string): Record<string, string> {
  const block = media ? css.split(media)[1]!.split(/\n\}/)[0]! : css.split(/@media/)[0]!;
  return Object.fromEntries([...block.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((m) => [m[1]!, m[2]!.trim()]));
}
