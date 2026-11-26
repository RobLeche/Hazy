// Example 3 — Proposal state machine with Netlify Blobs conditional writes (onlyIfNew / onlyIfMatch) + strong reads.
// Source: docs/blobs.md. The Store interface mirrors @netlify/blobs; tests use an in-memory fake with the same semantics.
export interface Store {
  setJSON(key: string, value: unknown, opts?: { onlyIfMatch?: string; onlyIfNew?: boolean }): Promise<{ modified: boolean; etag?: string }>;
  getWithMetadata(key: string, opts: { type: "json"; consistency?: "strong" | "eventual" }): Promise<{ data: any; etag: string } | null>;
}
export type Status = "pending" | "approving" | "committed" | "rejected";

export async function createProposal(store: Store, id: string, data: object) {
  const { modified } = await store.setJSON(id, { ...data, status: "pending" }, { onlyIfNew: true });
  if (!modified) throw new Error("proposal id already exists");
}

/** Exactly one concurrent caller wins pending → approving. Everyone else gets false. */
export async function claimForApproval(store: Store, id: string): Promise<boolean> {
  const cur = await store.getWithMetadata(id, { type: "json", consistency: "strong" });
  if (!cur || cur.data.status !== "pending") return false;
  const { modified } = await store.setJSON(id, { ...cur.data, status: "approving" }, { onlyIfMatch: cur.etag });
  return modified;
}

export function memoryStore(): Store {
  const m = new Map<string, { data: string; etag: string }>(); let n = 0;
  return {
    async setJSON(key, value, opts = {}) {
      const cur = m.get(key);
      if (opts.onlyIfNew && cur) return { modified: false };
      if (opts.onlyIfMatch !== undefined && cur?.etag !== opts.onlyIfMatch) return { modified: false };
      const etag = `"${++n}"`; m.set(key, { data: JSON.stringify(value), etag }); return { modified: true, etag };
    },
    async getWithMetadata(key) { const c = m.get(key); return c ? { data: JSON.parse(c.data), etag: c.etag } : null; },
  };
}
