# Playwright emulation for a phone-first PWA

Source: https://playwright.dev/docs/emulation (text from github.com/microsoft/playwright docs/src/emulation.md, read 2026-11-26)
Installed here: Playwright 1.63.0 (device registry includes `iPhone 15/16/17`, `iPhone SE (3rd gen)`, `Pixel 7/8/9`, `Galaxy S24`).

## Devices (quoted)
"Playwright comes with a registry of device parameters using `playwright.devices` for selected desktop, tablet and mobile
devices. It can be used to simulate browser behavior for a specific device such as user agent, screen size, viewport and if it
has touch enabled."
```ts
// playwright.config.ts (docs pattern)
import { defineConfig, devices } from '@playwright/test';
export default defineConfig({ projects: [
  { name: 'iphone', use: { ...devices['iPhone 15'] } },
  { name: 'pixel',  use: { ...devices['Pixel 7'] } },
]});
```
Note: device descriptors set `defaultBrowserType`. iPhone profiles default to WebKit; with only Chromium installed, override
`browserName: 'chromium'`, or launch Chromium with the descriptor (as our example does). Real iOS behaviour still needs a device.

## Geolocation (docs)
```ts
use: { geolocation: { longitude: 12.492507, latitude: 41.889938 }, permissions: ['geolocation'] }
```
Change during a test with `context.setGeolocation({...})`.

## Offline (docs)
```ts
use: { offline: true }   // or at runtime: await context.setOffline(true)
```

## Color scheme and media (quoted)
"Emulate the users `\"colorScheme\"`. Supported values are 'light', 'dark', and 'no-preference'." The `"reducedMotion"`,
`"forcedColors"` and `"contrast"` options "emulate the `prefers-reduced-motion`, `forced-colors` and `prefers-contrast` media
features"; `page.emulateMedia()` changes them for one page.

## Locale and timezone
`use: { locale: 'en-US', timezoneId: 'America/New_York' }`. Hazy must also test `America/Chicago` (Pensacola).
