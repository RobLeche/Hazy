# Knowledge: pwa-mobile-expert

Read **every file here before answering** and prefer it over memory (see the agent's "Before you answer" section).
Notes in `docs/` are taken from official documentation and link their sources; `examples/` are small, correct, tested worked examples.

## docs/
- [`install-ios-android.md`](docs/install-ios-android.md): Installing on Android and iPhone. Sources: https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable, https://web.dev/learn/pwa/installation, https://web.dev/learn/pwa/detection, https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/
- [`manifest.md`](docs/manifest.md): Web app manifest. Sources: https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest, https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable, https://web.dev/learn/pwa/installation-prompt
- [`service-worker-and-caching.md`](docs/service-worker-and-caching.md): Service worker lifecycle and caching strategies. Sources: https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers, https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Caching, https://web.dev/learn/pwa/caching, https://web.dev/learn/pwa/update

## examples/
- [`offline-and-install.test.ts`](examples/offline-and-install.test.ts): Runs the example site in real Chromium (Playwright) to prove: SW precache + network-first works offline,
- [`manifest-check.ts`](examples/manifest-check.ts): Example 1 — Check a manifest against MDN's Chromium installability requirements plus Hazy rules. (tested by `manifest-check.test.ts`)
- [`site/sw.js`](examples/site/sw.js): Example 2 — the service worker (precache shell, network-first forecast, network-only alerts)
- [`site/app.js`](examples/site/app.js): Example 3 — `beforeinstallprompt` install button + offline-aware rendering
- [`site/`](examples/site/): the demo site the tests serve (`index.html`, `manifest.webmanifest`)

## Verification
Run: `cd knowledge/pwa-mobile-expert/examples && node --test *.test.ts` (Node ≥ 22.18; TypeScript runs via type stripping), or `./knowledge/run-examples.sh` from the repo root.
Last run 2026-11-26 (Node v22.23.5): **4 passed, 0 failed, 0 skipped.**
Uses Playwright with the pre-installed Chromium (verified with 1.63.0).
