// Example 2 — Hazy service worker: precache shell, network-first forecast, network-only alerts.
// Sources: MDN Using Service Workers + MDN Caching guide (see ../../docs/service-worker-and-caching.md)
const VERSION = "v1";
const SHELL = `hazy-shell-${VERSION}`;
const DATA = "hazy-data";
const SHELL_ASSETS = ["/", "/index.html", "/app.js", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(SHELL).then((c) => c.addAll(SHELL_ASSETS)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith("hazy-shell-") && k !== SHELL).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

async function networkFirst(request, timeoutMs = 4000) {
  const cache = await caches.open(DATA);
  try {
    const res = await Promise.race([
      fetch(request),
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), timeoutMs)),
    ]);
    if (res.ok) await cache.put(request, res.clone());
    return res;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    return new Response(JSON.stringify({ offline: true }), { status: 503, headers: { "content-type": "application/json" } });
  }
}

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/alerts") || url.pathname.startsWith("/api/agent") || url.pathname.startsWith("/api/auth")) return; // network-only: browser default
  if (url.pathname.startsWith("/api/forecast")) { event.respondWith(networkFirst(event.request)); return; }
  event.respondWith(caches.match(event.request).then((hit) => hit ?? fetch(event.request))); // shell: cache-first
});

self.addEventListener("message", (event) => { if (event.data === "SKIP_WAITING") self.skipWaiting(); });
