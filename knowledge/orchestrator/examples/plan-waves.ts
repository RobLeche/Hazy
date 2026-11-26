// Example 1 — Turn a task list into parallel waves (sectioning), refusing plans where parallel tasks share files.
// Sources: docs/effective-agents-patterns.md (sectioning), docs/claude-code-subagents-delegation.md (parallel subagents)
export interface Task { id: string; agent: string; dependsOn: string[]; paths: string[] }

const overlaps = (a: string, b: string) => {
  const norm = (p: string) => p.replace(/\*\*$/, "");
  return norm(a).startsWith(norm(b)) || norm(b).startsWith(norm(a));
};

export function planWaves(tasks: Task[]): Task[][] {
  const byId = new Map(tasks.map((t) => [t.id, t]));
  for (const t of tasks) for (const d of t.dependsOn) if (!byId.has(d)) throw new Error(`${t.id} depends on unknown ${d}`);
  const done = new Set<string>(); const waves: Task[][] = [];
  while (done.size < tasks.length) {
    const ready = tasks.filter((t) => !done.has(t.id) && t.dependsOn.every((d) => done.has(d)));
    if (!ready.length) throw new Error("dependency cycle");
    // Split a ready set so no two tasks in one wave touch overlapping paths.
    const wave: Task[] = [];
    for (const t of ready) if (!wave.some((w) => w.paths.some((p) => t.paths.some((q) => overlaps(p, q))))) wave.push(t);
    waves.push(wave); wave.forEach((t) => done.add(t.id));
  }
  return waves;
}
