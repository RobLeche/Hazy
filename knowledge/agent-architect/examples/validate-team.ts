// Example 1 — Validate the REAL team in this repo: agents ↔ skills ↔ knowledge folders stay consistent.
// Rules from docs/subagent-frontmatter.md and docs/skills-format.md, plus Hazy conventions (only orchestrator has Agent).
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const MODELS = new Set(["opus", "sonnet", "haiku", "fable", "inherit"]);
const COLORS = new Set(["red", "blue", "green", "yellow", "purple", "orange", "pink", "cyan"]);

export function frontmatter(md: string): { fm: Record<string, string | string[]>; body: string } {
  const m = md.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) throw new Error("missing frontmatter");
  const fm: Record<string, string | string[]> = {}; let listKey: string | null = null;
  for (const line of m[1]!.split("\n")) {
    const item = line.match(/^\s+-\s+(.*)$/);
    if (item && listKey) { (fm[listKey] as string[]).push(item[1]!.trim()); continue; }
    const kv = line.match(/^([A-Za-z_-]+):\s*(.*)$/);
    if (!kv) continue;
    listKey = null;
    if (kv[2] === "") { fm[kv[1]!] = []; listKey = kv[1]!; } else fm[kv[1]!] = kv[2]!.replace(/^"(.*)"$/, "$1");
  }
  return { fm, body: m[2]! };
}

export function validateTeam(root: string): string[] {
  const errs: string[] = [];
  const agentsDir = join(root, ".claude/agents"); const skillsDir = join(root, ".claude/skills");
  const skillNames = new Set(readdirSync(skillsDir));
  const used = new Set<string>(); const firstNames = new Set<string>();
  for (const file of readdirSync(agentsDir).filter((f) => f.endsWith(".md"))) {
    const id = file.replace(/\.md$/, "");
    const { fm, body } = frontmatter(readFileSync(join(agentsDir, file), "utf8"));
    if (fm.name !== id) errs.push(`${id}: name must equal file name`);
    if (!fm.description || String(fm.description).length < 40) errs.push(`${id}: description too short for delegation`);
    if (!MODELS.has(String(fm.model))) errs.push(`${id}: unknown model alias ${fm.model}`);
    if (fm.color && !COLORS.has(String(fm.color))) errs.push(`${id}: invalid color`);
    if (!fm.personality) errs.push(`${id}: personality missing (Agent Console shows it)`);
    if (!fm.firstName) errs.push(`${id}: firstName missing`);
    else if (firstNames.has(String(fm.firstName))) errs.push(`${id}: firstName ${fm.firstName} already used`); else firstNames.add(String(fm.firstName));
    if (!/^## Personality/m.test(body)) errs.push(`${id}: missing "## Personality" section`);
    if (fm.model === "opus" && fm.effort !== "high") errs.push(`${id}: opus agents run at effort high (Opus 5.5 defaults to medium)`);
    const tools = String(fm.tools ?? "").split(",").map((t) => t.trim());
    if (tools.includes("Agent") !== (id === "orchestrator")) errs.push(`${id}: only the orchestrator may have the Agent tool`);
    const skills = (fm.skills as string[]) ?? [];
    if (skills.length > 32) errs.push(`${id}: more than 32 skills (extra are not preloaded)`);
    for (const s of skills) { used.add(s); if (!skillNames.has(s)) errs.push(`${id}: skill ${s} does not exist`); }
    if (!/^## Before you answer/m.test(body)) errs.push(`${id}: missing "## Before you answer" section`);
    for (const sub of ["docs", "examples"]) {
      const d = join(root, "knowledge", id, sub);
      if (!existsSync(d) || readdirSync(d).length === 0) errs.push(`${id}: knowledge/${id}/${sub} missing or empty`);
    }
  }
  for (const s of skillNames) {
    const p = join(skillsDir, s, "SKILL.md");
    if (!existsSync(p)) { errs.push(`skill ${s}: SKILL.md missing`); continue; }
    const text = readFileSync(p, "utf8"); const { fm } = frontmatter(text);
    if (fm.name !== s) errs.push(`skill ${s}: name must equal directory`);
    if (String(fm.description ?? "").length > 1536) errs.push(`skill ${s}: description over 1,536 chars`);
    if (String(fm["disable-model-invocation"]) === "true") errs.push(`skill ${s}: cannot be preloaded`); // frontmatter only, not prose
    if (text.split("\n").length > 500) errs.push(`skill ${s}: over 500 lines`);
    if (!used.has(s)) errs.push(`skill ${s}: not wired to any agent`);
  }
  return errs;
}
