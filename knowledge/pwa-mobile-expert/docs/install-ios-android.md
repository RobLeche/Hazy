# Installing on Android and iPhone

Sources (read 2026-11-26):
- MDN, Making PWAs installable (current): https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable
- web.dev, Installation (updated 2022-02-23): https://web.dev/learn/pwa/installation
- web.dev, Detection: https://web.dev/learn/pwa/detection
- WebKit blog, Web Push for Web Apps on iOS and iPadOS: https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/

## Android
- MDN: "the only browsers that install PWAs as WebAPKs are: Chrome on devices with Google Mobile Services (GMS),
  and Samsung Internet on Samsung devices." Others (Firefox, Edge, Opera, Chrome without GMS) "add a browser-badged
  home-screen shortcut".
- Custom install UI via `beforeinstallprompt` (Chromium only): capture the event, `preventDefault()`, call `prompt()`
  from your button. web.dev: "You can only call `prompt()` on the deferred event once."
- `appinstalled` fires on Chromium "when the user accepts the dialog, and not after the WebAPK is minted"; use it to
  hide your install promo.

## iPhone / iPad
- MDN (current): "On iOS 16.4 and later, PWAs can be installed from the Share menu in Safari, Chrome, Edge, Firefox,
  and Orion." On 16.3 and earlier, Safari only. Triggering the install prompt "is not supported on iOS".
- web.dev (2022, **outdated on the browser list**): "A browser prompt to install your PWA doesn't exist on iOS and
  iPadOS"; "only the standalone display mode is supported. If you use minimal-ui mode, it will fall back to a browser
  shortcut; if you use fullscreen, it will fall back to standalone." Add `apple-touch-icon`; without it "the icon on
  the home screen will be a screenshot of your PWA".
- WebKit: Web Push works for **Home Screen web apps** on iOS/iPadOS 16.4+, with no Apple Developer Program needed.
- Conflict resolution: prefer MDN (current) for which browsers can add to the Home Screen; the web.dev fallbacks for
  display modes still apply.

## Detecting the installed experience (web.dev)
```js
const standalone = window.matchMedia('(display-mode: standalone)').matches
  || (navigator as any).standalone === true; // iOS Safari legacy flag
```
Use this to hide the install hint when running installed.
