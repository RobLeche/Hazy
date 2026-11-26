// Example 3 — The Agent Console path policy (allow/deny, traversal, limits, secret scan).
// Sources: docs/owasp-llm-prompt-injection.md (parameter validation, least privilege); docs/04 §7.1 in the repo.
const ALLOW = [/^src\//, /^public\//, /^tests\//, /^docs\//, /^index\.html$/];
const DENY = [/^netlify\//, /^netlify\.toml$/, /^public\/_headers$/, /^public\/_redirects$/, /^\.claude\//, /^\.github\//,
  /^package\.json$/, /lock/i, /^scripts\//, /^vite\.config\./, /^tsconfig.*\.json$/, /(^|\/)\.env/, /\.(pem|key)$/];
const SECRET_PATTERNS = [/sk-ant-[A-Za-z0-9_-]{10,}/, /github_pat_[A-Za-z0-9_]{20,}/, /ghp_[A-Za-z0-9]{20,}/, /-----BEGIN [A-Z ]*PRIVATE KEY-----/, /AKIA[0-9A-Z]{16}/];

export function normalizePath(p: string): string | null {
  if (!p || p.includes("\0") || p.includes("\\") || p.startsWith("/") || /^[a-zA-Z]:/.test(p)) return null;
  const segs = p.split("/");
  if (segs.some((s) => s === "" || s === "." || s === "..")) return null;
  return segs.join("/");
}

export interface Change { path: string; action: "create" | "update" | "delete"; content?: string }

export function validateProposal(files: Change[]): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  if (files.length === 0 || files.length > 20) errors.push("1–20 files per proposal");
  const bytes = files.reduce((n, f) => n + Buffer.byteLength(f.content ?? ""), 0);
  if (bytes > 200 * 1024) errors.push("proposal larger than 200 KB");
  for (const f of files) {
    const p = normalizePath(f.path);
    if (!p) { errors.push(`invalid path: ${JSON.stringify(f.path)}`); continue; }
    if (DENY.some((r) => r.test(p))) { errors.push(`path not allowed: ${p}`); continue; }
    if (!ALLOW.some((r) => r.test(p))) { errors.push(`path outside allow-list: ${p}`); continue; }
    if (f.content && SECRET_PATTERNS.some((r) => r.test(f.content!))) errors.push(`secret-like content in ${p}`);
  }
  return { ok: errors.length === 0, errors };
}
