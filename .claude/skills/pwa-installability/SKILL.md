---
name: pwa-installability
description: "Make Hazy installable on Android and iPhone: web app manifest, icons, HTTPS, beforeinstallprompt, and the iOS Add to Home Screen hint. Use when editing the manifest, icons, install UI or testing installation."
metadata:
  owner: pwa-mobile-expert
  shared_with: [ux-designer-apple-hig, qa-engineer]
---
# PWA installability

Chromium requirements (MDN): `name`/`short_name`; `icons` with **192** and **512** px; `start_url`;
`display`/`display_override` (use `standalone`); `prefer_related_applications` false or absent; HTTPS.
Link the manifest on **every** page: `<link rel="manifest" href="/manifest.webmanifest">`.

- Add a maskable 512 icon and `apple-touch-icon` 180×180; `theme-color` meta for light and dark.
- Android: WebAPK install only in Chrome with Google Mobile Services and in Samsung Internet. Others make a shortcut.
  Custom button: catch `beforeinstallprompt`, `preventDefault()`, call `prompt()` on click.
- iOS: no install prompt API. Show a one-time, dismissible hint ("Share → Add to Home Screen")
  when on iOS and not `navigator.standalone`. Since iOS 16.4, Safari, Chrome, Edge, Firefox and Orion can all add.
- iOS Web Push only works for Home Screen apps (iOS 16.4+). It is a phase-2 feature.
- Verify in Chrome DevTools → Application → Manifest, and on real devices.
- Reference: `docs/02-pwa-installability.md`.
