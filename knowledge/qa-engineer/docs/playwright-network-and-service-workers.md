# Mocking the network (and the service-worker gotcha)

Sources (read 2026-11-26):
- Mock APIs: https://playwright.dev/docs/mock (docs/src/mock.md)
- Network: https://playwright.dev/docs/network (docs/src/network.md)
- Test use options: https://playwright.dev/docs/test-use-options

## Mock an API (docs pattern)
```ts
await page.route('*/**/api/v1/fruits', async route => {
  const json = [{ name: 'Strawberry', id: 21 }];
  await route.fulfill({ json });
});
```
Modify a real response: `const response = await route.fetch(); await route.fulfill({ response, json })`.
Record/replay: `page.routeFromHAR('./hars/fruit.har', { url: '*/**/api/v1/fruits', update: false })`.

## Service workers vs routing (quoted)
"If you're using Playwright's native `BrowserContext.route` and `Page.route`, and it appears network events are missing,
disable Service Workers by setting `Browser.newContext.serviceWorkers` to `'block'`."
Mock Service Worker (MSW) "adds its own Service Worker that takes over the network requests, hence making them invisible to
`BrowserContext.route` and `Page.route`."
Test option: `serviceWorkers`: "Whether to allow sites to register Service workers, defaults to `'allow'`."

## Hazy rule of thumb
- UI tests that mock APIs: `serviceWorkers: 'block'` so `page.route` sees every request.
- Offline and update tests: allow SWs and use a real local server (see pwa-mobile-expert's offline example) instead of `page.route`.
