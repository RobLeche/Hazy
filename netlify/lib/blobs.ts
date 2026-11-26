// Blobs helper: site-wide stores, strong-consistency reads and compare-and-swap (CAS) helpers.
// Ported from knowledge/netlify-engineer/examples/blobs-cas.ts. Sources: knowledge/netlify-engineer/docs/blobs.md
// Always getStore (site-wide), never getDeployStore: an approval triggers a deploy and state must survive it.
import { getStore } from "@netlify/blobs";

export type StoreName = "jobs" | "proposals" | "transcripts" | "quotas" | "audit" | "logins" | "sessions";

export interface WriteOutcome {
  modified: boolean;
  etag?: string | undefined;
}

export interface Entry<T> {
  data: T;
  etag: string;
}

/** Minimal slice of @netlify/blobs Store that Hazy uses. Tests inject an in-memory implementation. */
export interface BlobStore {
  setJSON(key: string, value: unknown, opts?: { onlyIfMatch?: string; onlyIfNew?: boolean }): Promise<WriteOutcome>;
  /** Implementations must honour consistency: "strong". Returns null when the key is missing. */
  getJSON(key: string): Promise<Entry<unknown> | null>;
  delete(key: string): Promise<void>;
}

/** Wrap a real @netlify/blobs store. Every read is strongly consistent (default is eventual, up to 60 s stale). */
export function openStore(name: StoreName): BlobStore {
  const store = getStore(name);
  return {
    async setJSON(key, value, opts = {}) {
      // The SDK types onlyIfNew and onlyIfMatch as mutually exclusive, so branch.
      const res =
        opts.onlyIfMatch !== undefined
          ? await store.setJSON(key, value, { onlyIfMatch: opts.onlyIfMatch })
          : opts.onlyIfNew === true
            ? await store.setJSON(key, value, { onlyIfNew: true })
            : await store.setJSON(key, value);
      return { modified: res.modified, etag: res.etag };
    },
    async getJSON(key) {
      const res = await store.getWithMetadata(key, { type: "json", consistency: "strong" });
      if (!res || res.etag === undefined) return null;
      return { data: res.data as unknown, etag: res.etag };
    },
    async delete(key) {
      await store.delete(key);
    },
  };
}

/** Strong read, typed through a caller-supplied guard (no unchecked casts of external data). */
export async function readStrong<T>(
  store: BlobStore,
  key: string,
  guard: (v: unknown) => v is T,
): Promise<Entry<T> | null> {
  const cur = await store.getJSON(key);
  if (!cur) return null;
  if (!guard(cur.data)) throw new Error(`blob ${key} failed validation`);
  return { data: cur.data, etag: cur.etag };
}

/** Create only if the key does not exist. Returns false when it already exists (idempotent retries). */
export async function createOnce(store: BlobStore, key: string, value: unknown): Promise<boolean> {
  const { modified } = await store.setJSON(key, value, { onlyIfNew: true });
  return modified;
}

export type UpdateResult<T> = { ok: true; value: T } | { ok: false; reason: "missing" | "rejected" | "conflict" };

/**
 * Read (strong) -> mutate -> write with onlyIfMatch. Retries on a lost race, up to `retries` extra attempts.
 * `mutate` returns the next value, or null to abort (e.g. state is not the expected one): reason "rejected".
 * Exactly one of several concurrent callers wins a state transition when mutate rejects the stale state.
 */
export async function updateCas<T>(
  store: BlobStore,
  key: string,
  guard: (v: unknown) => v is T,
  mutate: (current: T) => T | null,
  retries = 8,
): Promise<UpdateResult<T>> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const cur = await readStrong(store, key, guard);
    if (!cur) return { ok: false, reason: "missing" };
    const next = mutate(cur.data);
    if (next === null) return { ok: false, reason: "rejected" };
    const { modified } = await store.setJSON(key, next, { onlyIfMatch: cur.etag });
    if (modified) return { ok: true, value: next };
  }
  return { ok: false, reason: "conflict" };
}

/** Like updateCas, but creates `initial` when the key is missing (onlyIfNew), then retries as an update. */
export async function upsertCas<T>(
  store: BlobStore,
  key: string,
  guard: (v: unknown) => v is T,
  initial: T,
  mutate: (current: T) => T | null,
  retries = 8,
): Promise<UpdateResult<T>> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await updateCas(store, key, guard, mutate, 0);
    if (res.ok || res.reason === "rejected") return res;
    if (res.reason === "missing") {
      const next = mutate(initial);
      if (next === null) return { ok: false, reason: "rejected" };
      const { modified } = await store.setJSON(key, next, { onlyIfNew: true });
      if (modified) return { ok: true, value: next };
    }
  }
  return { ok: false, reason: "conflict" };
}

/** In-memory store with the same onlyIfNew / onlyIfMatch semantics (for tests and local use). */
export function memoryStore(): BlobStore {
  const m = new Map<string, { data: string; etag: string }>();
  let n = 0;
  return {
    async setJSON(key, value, opts = {}) {
      const cur = m.get(key);
      if (opts.onlyIfNew && cur) return { modified: false };
      if (opts.onlyIfMatch !== undefined && cur?.etag !== opts.onlyIfMatch) return { modified: false };
      const etag = `"${++n}"`;
      m.set(key, { data: JSON.stringify(value), etag });
      return { modified: true, etag };
    },
    async getJSON(key) {
      const c = m.get(key);
      return c ? { data: JSON.parse(c.data) as unknown, etag: c.etag } : null;
    },
    async delete(key) {
      m.delete(key);
    },
  };
}
