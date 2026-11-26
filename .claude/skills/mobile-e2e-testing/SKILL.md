---
name: mobile-e2e-testing
description: "Run Hazy end-to-end tests with Playwright on emulated phones: search, geolocation, offline, service-worker update and the console flow. Use when adding a user flow or verifying a release candidate."
metadata:
  owner: qa-engineer
  shared_with: [pwa-mobile-expert]
---
# Mobile end-to-end testing (Playwright)

- Projects: `devices['iPhone 15']`, `devices['Pixel 7']`, plus a 320×640 viewport. Run with `--trace off`
  unless debugging a failure.
- Mock upstream APIs with `page.route` (fixtures), so the tests are deterministic.
- Scenarios:
  1. Search "Tampa, FL" → outlook shows thunder and flood labels as **text**.
  2. `grantPermissions(['geolocation'])` + `setGeolocation` → "Use my location".
  3. Offline: load, `context.setOffline(true)`, reload → cached outlook + "Last updated" + offline banner;
     alerts say they can't be checked.
  4. SW update → the "New version available" toast.
  5. Console: wrong password → error text; login → agents list (name, model, personality); chat streams;
     mocked `propose_change` → diff sheet → Approve confirm → mocked GitHub calls made.
- Run on every PR against the Deploy Preview URL where possible; real-device checks for install (iOS and Android).
