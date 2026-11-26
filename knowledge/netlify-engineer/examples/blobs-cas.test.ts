import { test } from "node:test";
import assert from "node:assert/strict";
import { memoryStore, createProposal, claimForApproval } from "./blobs-cas.ts";

test("double-click Approve: exactly one claim succeeds", async () => {
  const s = memoryStore();
  await createProposal(s, "p1", { files: ["src/a.ts"] });
  const results = await Promise.all([claimForApproval(s, "p1"), claimForApproval(s, "p1"), claimForApproval(s, "p1")]);
  assert.equal(results.filter(Boolean).length, 1);
  assert.equal((await s.getWithMetadata("p1", { type: "json" }))!.data.status, "approving");
});

test("onlyIfNew prevents a retried background job from re-creating a proposal", async () => {
  const s = memoryStore();
  await createProposal(s, "p2", {});
  await assert.rejects(createProposal(s, "p2", {}), /already exists/);
});
