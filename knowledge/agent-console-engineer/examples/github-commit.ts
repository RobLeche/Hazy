// Example 3 — Approve → ONE atomic, fast-forward-only commit to main via the Git Data API, with a stale-base check.
// Sources: docs/github-contents-and-git-data.md (trees: sha:null deletes; refs: force default false, 422 on non-FF).
export interface FileChange { path: string; action: "create" | "update" | "delete"; content?: string }
type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;

export class StaleBaseError extends Error { readonly paths: string[]; constructor(paths: string[]) { super(`stale base: ${paths.join(", ")}`); this.paths = paths; } }

export async function commitProposal(opts: { repo: string; branch: string; token: string; baseSha: string; message: string; files: FileChange[]; fetch: FetchLike }) {
  const api = `https://api.github.com/repos/${opts.repo}`;
  const gh = async (method: string, path: string, body?: unknown) => {
    const res = await opts.fetch(`${api}${path}`, {
      method,
      headers: { authorization: `Bearer ${opts.token}`, accept: "application/vnd.github+json", "x-github-api-version": "2022-11-28", "user-agent": "hazy-console", ...(body ? { "content-type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw Object.assign(new Error(`GitHub ${method} ${path} → ${res.status}`), { status: res.status });
    return res.json() as Promise<any>;
  };

  const head: string = (await gh("GET", `/git/ref/heads/${opts.branch}`)).object.sha;
  if (head !== opts.baseSha) {
    const cmp = await gh("GET", `/compare/${opts.baseSha}...${head}`);
    const changed = new Set<string>((cmp.files ?? []).map((f: { filename: string }) => f.filename));
    const overlap = opts.files.map((f) => f.path).filter((p) => changed.has(p));
    if (overlap.length) throw new StaleBaseError(overlap);
  }
  const baseTree: string = (await gh("GET", `/git/commits/${head}`)).tree.sha;
  const tree = await gh("POST", "/git/trees", {
    base_tree: baseTree,
    tree: opts.files.map((f) => f.action === "delete"
      ? { path: f.path, mode: "100644", type: "blob", sha: null }
      : { path: f.path, mode: "100644", type: "blob", content: f.content ?? "" }),
  });
  const commit = await gh("POST", "/git/commits", { message: opts.message, tree: tree.sha, parents: [head] });
  await gh("PATCH", `/git/refs/heads/${opts.branch}`, { sha: commit.sha, force: false });
  return { commitSha: commit.sha as string, parent: head };
}
