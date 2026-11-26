# 02 — Making it installable on iPhone and Android (PWA vs native wrapper)

> Part of the Hazy research pack. See [README](README.md) for the index.

## 1. Installability checklist (from MDN)

For Chromium browsers (Chrome, Edge, Samsung Internet) to offer install, the
web app manifest must have:

- `name` or `short_name`
- `icons` including a **192px** and a **512px** icon
- `start_url`
- `display` and/or `display_override` (use `standalone`)
- `prefer_related_applications` set to `false` or absent

It must also be served over **HTTPS** (Netlify does this by default), or from
`localhost` during development.

Every page must link the manifest: `<link rel="manifest" href="/manifest.webmanifest">`.

MDN notes that a service worker is "not a requirement for a PWA to be
installable", but we want one anyway for offline use (§3).

### Recommended `manifest.webmanifest`

```json
{
  "id": "/",
  "name": "Hazy — Storm & Flood Outlook",
  "short_name": "Hazy",
  "description": "Thunderstorm and flood outlook for today and the next few days.",
  "start_url": "/?source=pwa",
  "scope": "/",
  "display": "standalone",
  "background_color": "#0b1220",
  "theme_color": "#0b1220",
  "orientation": "portrait",
  "icons": [
    { "src": "/icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icons/maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ],
  "shortcuts": [
    { "name": "My location", "url": "/?loc=current" }
  ]
}
```

For iOS, also add to `<head>`: `<link rel="apple-touch-icon" href="/icons/apple-touch-icon-180.png">`
(180×180), plus `<meta name="theme-color">` and a `viewport` with
`viewport-fit=cover` for the notch area. Use `env(safe-area-inset-*)` in CSS.

## 2. Platform behaviour

### Android

- Only **Chrome on devices with Google Mobile Services** and **Samsung Internet
  on Samsung devices** install PWAs as **WebAPKs** (real app-drawer entries).
  Firefox, Edge, Opera and Chrome without GMS create a browser-badged shortcut instead.
- Custom install button: listen for `beforeinstallprompt`, call
  `preventDefault()`, keep the event, and call `prompt()` from your own button.

### iPhone / iPad

- iOS 16.4 and later: install from the **Share → Add to Home Screen** menu in
  Safari, Chrome, Edge, Firefox and Orion. iOS 16.3 and earlier: Safari only.
- **No `beforeinstallprompt` on iOS.** Show an instructional hint ("Tap Share,
  then Add to Home Screen") when `navigator.standalone` is false on iOS, at most
  once, and dismissible.
- **Web Push** works on iOS/iPadOS 16.4 and later **only for Home Screen web
  apps**, and no Apple Developer Program membership is needed (WebKit blog).
  **Declarative Web Push** arrived in iOS/iPadOS 18.4. The Badging API is granted
  together with notification permission.
- Without a manifest (or the web-app-capable meta tag) the site is saved as a
  plain bookmark that opens in the default browser.

### Desktop (nice to have)

Chromium installs on all desktop OSes. Safari 17 and later on macOS has
*Add to Dock*. Firefox desktop does not install PWAs from a manifest.

## 3. Offline and the service worker

Lifecycle (MDN, *Using Service Workers*): `register()` (HTTPS) → `install`
(precache the app shell with `cache.addAll` inside `event.waitUntil`) →
`activate` (delete old versioned caches; optionally enable navigation preload) →
`fetch` (`event.respondWith`). A new SW installs in the background and waits;
`skipWaiting()` and `clients.claim()` take over immediately. **Recommendation:**
show a "New version available, tap to refresh" toast instead of silently calling
`skipWaiting()`, because agent-approved deploys (see [04](04-agent-console-and-security.md))
may ship often.

Caching strategy per resource:

| Resource | Strategy | Why |
|---|---|---|
| App shell (HTML, CSS, JS, icons, fonts) | Precache at install, versioned (`hazy-shell-v{build}`) | Instant start, works offline |
| Forecast JSON (`/api/forecast?...` or Open-Meteo) | **Network-first, 4 s timeout → cache fallback**; show the "Last updated" time | Weather goes stale fast; offline still shows the last known outlook |
| Geocoding results | Stale-while-revalidate | Rarely change |
| NWS alerts | **Network-only**, plus a "can't check alerts offline" banner | Never show stale alerts as current |
| `/api/agent/*` | Never cached | Private, dynamic |

Use a build-generated precache manifest (for example Workbox `injectManifest`, or
a small hand-written SW with the build hash in the cache name). Set
`Cache-Control: no-cache` on `/sw.js` in Netlify `_headers` so updates are picked up.

Background features: **Periodic Background Sync** (refresh the forecast while
the app is closed) is Chromium-only and needs an installed app. Do not depend on
it. **Push** (for example "storms likely this afternoon") needs a server that
sends Web Push (VAPID). That is a phase-2 feature: a Netlify Scheduled Function
plus subscriptions stored in Netlify Blobs.

Storage note: browsers may evict site storage. WebKit has historically evicted
script-writable storage for sites the user has not used in a while (reportedly
after about 7 days for browser tabs, with Home Screen apps treated differently).
This is not re-verified in this pack, so treat cached data and saved places as
best-effort and keep them small. Call `navigator.storage.persist()` where supported.

## 4. When you would need Capacitor (a native wrapper) instead

Capacitor is "a cross-platform native runtime" that wraps a web app in a native
container with plugin access to native SDKs and publishes to the App Store and
Play Store. It needs Xcode on a Mac for iOS and Android Studio for Android.

**Stay a PWA (recommended for v1)** while the needs are: forecast display,
offline last-known data, install icon, and optional Web Push on iOS 16.4+ and
Android.

**Move to Capacitor (reusing the same web build) if you need**:

- **App Store / Play Store presence** (discoverability, "real app" trust).
- **Background location / geofenced alerts** ("warn me when a storm nears where I
  am now"), which the web cannot do in the background.
- **Reliable scheduled background refresh** on iOS (no Periodic Background Sync
  in WebKit).
- **Critical alerts / richer notifications**, home-screen **widgets**, Apple
  Watch, or CarPlay.
- Push to iOS users who will not "Add to Home Screen" (web push on iOS requires it).

Cost of Capacitor: developer accounts (Apple charges yearly), store review,
release management, and the Agent Console's "approve → redeploy" loop no longer
updates the native shell instantly (only web content, and store rules limit how
far that can go). Keep the agent-driven deploy loop for the web/PWA build.

A Trusted Web Activity (TWA, via Bubblewrap or PWABuilder) is a lighter
Android-only option to list the PWA on Play without a full wrapper. It is not
researched in depth here.

## Sources

- MDN, Making PWAs installable: https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable
- MDN, Offline and background operation: https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Offline_and_background_operation
- MDN, Using Service Workers: https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers
- WebKit, Web Push for Web Apps on iOS and iPadOS: https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/
- WebKit, Features in Safari 16.4: https://webkit.org/blog/13966/webkit-features-in-safari-16-4/
- WebKit, Features in Safari 18.4 (Declarative Web Push): https://webkit.org/blog/16574/webkit-features-in-safari-18-4/
- Capacitor docs: https://capacitorjs.com/docs
