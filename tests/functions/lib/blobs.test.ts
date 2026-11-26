import { describe, expect, it } from "vitest";
import { createOnce, memoryStore, readStrong, updateCas, upsertCas } from "../../../netlify/lib/blobs.ts";

interface Proposal {
  status: "pending" | "approving";
}
const isProposal = (v: unknown): v is Proposal =>
  typeof v === "object" && v !== null && ((v as { status?: unknown }).status === "pending" || (v as { status?: unknown }).status === "approving");

describe("blobs CAS helpers", () => {
  it("createOnce refuses a second create (retried job)", async () => {
    const s = memoryStore();
    expect(await createOnce(s, "p1", { status: "pending" })).toBe(true);
    expect(await createOnce(s, "p1", { status: "pending" })).toBe(false);
  });

  it("double-click Approve: exactly one pending -> approving transition wins", async () => {
    const s = memoryStore();
    await createOnce(s, "p1", { status: "pending" });
    const claim = () => updateCas(s, "p1", isProposal, (p): Proposal | null => (p.status === "pending" ? { status: "approving" } : null));
    const results = await Promise.all([claim(), claim(), claim()]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect((await readStrong(s, "p1", isProposal))?.data.status).toBe("approving");
  });

  it("updateCas reports missing keys", async () => {
    const res = await updateCas(memoryStore(), "nope", isProposal, (p) => p);
    expect(res).toEqual({ ok: false, reason: "missing" });
  });

  it("readStrong throws when stored data fails the guard", async () => {
    const s = memoryStore();
    await s.setJSON("k", { status: "weird" });
    await expect(readStrong(s, "k", isProposal)).rejects.toThrow(/failed validation/);
  });

  it("upsertCas creates then updates, and concurrent upserts do not lose increments", async () => {
    const s = memoryStore();
    type C = { n: number };
    const isC = (v: unknown): v is C => typeof v === "object" && v !== null && typeof (v as { n?: unknown }).n === "number";
    await Promise.all(Array.from({ length: 8 }, () => upsertCas(s, "c", isC, { n: 0 }, (c) => ({ n: c.n + 1 }))));
    expect((await readStrong(s, "c", isC))?.data.n).toBe(8);
  });
});
