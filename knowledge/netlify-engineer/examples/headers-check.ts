// Parses _headers using the documented rules (path lines, indented headers, # comments, case-insensitive names,
// repeated names concatenate) so CI can assert required headers exist.
// Source: https://docs.netlify.com/manage/routing/headers/
export function parseHeaders(text: string): Map<string, Map<string, string>> {
  const rules = new Map<string, Map<string, string>>(); let current: Map<string, string> | null = null;
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim() || line.trim().startsWith("#")) continue;
    if (!/^\s/.test(line)) { current = new Map(); rules.set(line.trim(), current); continue; }
    if (!current) throw new Error(`header without path: ${line}`);
    const i = line.indexOf(":"); const name = line.slice(0, i).trim().toLowerCase(); const value = line.slice(i + 1).trim();
    current.set(name, current.has(name) ? `${current.get(name)},${value}` : value);
  }
  return rules;
}
