import { test } from "node:test";
import assert from "node:assert/strict";
import { commitProposal, StaleBaseError, type FileChange } from "./github-commit.ts";

function fakeGitHub(state: { head: string; changedSinceBase?: string[] }) {
  const calls: { method: string; path: string; body?: any }[] = [];
  const fetch = async (url: string, init: RequestInit = {}) => {
    const path = url.replace("https://api.github.com/repos/RobLeche/Hazy", ""); const method = init.method ?? "GET";
    const body = init.body ? JSON.parse(String(init.body)) : undefined; calls.push({ method, path, body });
    const json = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status });
    if (method === "GET" && path === "/git/ref/heads/main") return json({ object: { sha: state.head } });
    if (method === "GET" && path.startsWith("/compare/")) return json({ files: (state.changedSinceBase ?? []).map((filename) => ({ filename })) });
    if (method === "GET" && path.startsWith("/git/commits/")) return json({ tree: { sha: "tree0" } });
    if (method === "POST" && path === "/git/trees") return json({ sha: "tree1" }, 201);
    if (method === "POST" && path === "/git/commits") return json({ sha: "commit1" }, 201);
    if (method === "PATCH" && path === "/git/refs/heads/main") return json({ object: { sha: body.sha } });
    return json({ message: "unexpected" }, 500);
  };
  return { fetch, calls };
}
const files: FileChange[] = [{ path: "src/lib/thresholds.ts", action: "update", content: "export const T = {}" }, { path: "src/old.ts", action: "delete" }];

test("happy path: exact call sequence, base_tree used, delete = sha:null, force:false", async () => {
  const gh = fakeGitHub({ head: "base1" });
  const r = await commitProposal({ repo: "RobLeche/Hazy", branch: "main", token: "t", baseSha: "base1", message: "agent(storm-scorer): tune\n\nProposal: p1", files, fetch: gh.fetch });
  assert.deepEqual(r, { commitSha: "commit1", parent: "base1" });
  assert.deepEqual(gh.calls.map((c) => `${c.method} ${c.path}`), ["GET /git/ref/heads/main", "GET /git/commits/base1", "POST /git/trees", "POST /git/commits", "PATCH /git/refs/heads/main"]);
  assert.equal(gh.calls[2]!.body.base_tree, "tree0");
  assert.deepEqual(gh.calls[2]!.body.tree[1], { path: "src/old.ts", mode: "100644", type: "blob", sha: null });
  assert.deepEqual(gh.calls[3]!.body.parents, ["base1"]);
  assert.equal(gh.calls[4]!.body.force, false);
});

test("main moved but touched different files → still commits on top of the new head", async () => {
  const gh = fakeGitHub({ head: "base2", changedSinceBase: ["docs/README.md"] });
  const r = await commitProposal({ repo: "RobLeche/Hazy", branch: "main", token: "t", baseSha: "base1", message: "m", files, fetch: gh.fetch });
  assert.equal(r.parent, "base2");
});

test("main moved and touched a proposed file → StaleBaseError, nothing written", async () => {
  const gh = fakeGitHub({ head: "base2", changedSinceBase: ["src/lib/thresholds.ts"] });
  await assert.rejects(commitProposal({ repo: "RobLeche/Hazy", branch: "main", token: "t", baseSha: "base1", message: "m", files, fetch: gh.fetch }), StaleBaseError);
  assert.ok(!gh.calls.some((c) => c.method !== "GET"));
});
