# 05 — Testing and accessibility

> Part of the Hazy research pack. See [README](README.md) for the index.

## 1. Test pyramid

| Layer | Tool | What |
|---|---|---|
| Unit | **Vitest** | `scoring.ts` (thunder and flood scores, labels, reasons), unit conversion, WMO-code mapping, path allow-list validator, cookie signing/verification, frontmatter parser |
| Contract | Vitest + recorded fixtures | Recorded real Open-Meteo, Marine, Flood, Geocoding and NWS responses in `tests/fixtures/`; the app parses them without errors (null handling, multi-location list shape) |
| Function | Vitest calling the exported handler with `new Request(...)` | Status codes, auth, CSRF, rate-limit headers, SSE framing; **mock** Anthropic and GitHub with MSW (or `fetch` stubs) |
| End-to-end | **Playwright** (`--trace off` by default) | Mobile emulation (iPhone and Pixel profiles), search → outlook, offline mode, SW update toast, console login → chat → propose → approve against mocks |
| Accessibility | `@axe-core/playwright` + manual screen-reader passes | No automated WCAG violations; real VoiceOver and TalkBack runs before release |
| PWA | Manual on real devices + DevTools Application panel | Install on Android (WebAPK) and iOS (Add to Home Screen); offline launch |

### 1.1 Scoring tests (most important)

- **Golden cases** with hand-built hourly arrays:
  - Dry high-pressure day → thunder `none`, flood `non_threatening`.
  - Classic Florida summer afternoon (CAPE 3,000, LI −6, code 95 at 15:00–18:00,
    prob 70%) → thunder `likely` or `very_likely`, peak block `afternoon`.
  - 2 in/h for 2 hours after 60 mm the day before → flood `high`.
  - High CAPE with strong CIN and no code 95 → thunder at most `possible`.
  - Hail codes 96/99 → `hail: true`.
  - Missing variables (null CAPE outside model coverage) → score still computed,
    with a reason "instability data unavailable".
- **Property tests** (fast-check): scores stay within 0–100; adding rain never
  lowers the flood score; output dates match the input `daily.time`.
- **NWS override**: an active Flash Flood Warning raises the level to at least High.
- **Timezone**: use `timezone=auto`; test a location in Pensacola (Central time)
  and one in Miami (Eastern) so the day boundaries are right.

### 1.2 Security tests for the Agent Console

- Unauthenticated calls to every `/api/agent*` and `/api/proposals*` → 401.
- Forged or expired cookie → 401; tampered HMAC → 401.
- Approve without the CSRF header, or with a foreign `Origin` → 403.
- Path validator table test: `../netlify.toml`, `src/../netlify/x.ts`,
  `/etc/passwd`, `src\\..\\.github\\x`, `.claude/agents/x.md`,
  `package.json`, `public/_headers`, `src/ok.ts` (only the last is allowed).
- A secret pattern inside the proposed content → rejected.
- Double approve (two concurrent calls) → exactly one commit (mock GitHub, and
  assert the ref PATCH is called once).
- Stale base (`head ≠ baseSha` and a touched file changed) → 409, no commit.
- Background job retried after failure → no duplicate proposals (idempotency).
- Bundle check in CI: `grep -r "sk-ant-\|github_pat_" dist/` must find nothing,
  and no env var name with a public prefix exists.

### 1.3 End-to-end scenarios (Playwright)

1. Search "Tampa, FL" → pick a result → today card shows thunder and flood
   levels with text labels (mock the APIs with `page.route`).
2. "Use my location" with `context.grantPermissions(['geolocation'])` and
   `setGeolocation`.
3. Offline: load once, `context.setOffline(true)`, reload → the last forecast
   with its "Last updated" stamp and an offline banner; alerts say "can't check offline".
4. Service worker update: deploy v2 fixture → the "New version available" toast appears.
5. Console: wrong password → error message announced; right password → agent
   list renders name, model and personality; the chat streams; the agent calls
   `propose_change` (mocked Claude stream) → diff shown → Approve → mocked
   GitHub receives tree, commit and ref calls.
6. Viewports: 320×640 (WCAG reflow), 390×844, 412×915, and landscape.

### 1.4 CI

GitHub Actions or Netlify build: `npm run lint && npm test && npm run build`;
Playwright on PRs. Netlify **Deploy Previews** per PR are the place for manual
device checks. Lighthouse's PWA category was removed in recent Lighthouse versions
(not re-verified in this pack), so check installability manually in Chrome
DevTools → Application → Manifest.

## 2. Accessibility requirements (WCAG 2.2 AA)

| Criterion | Requirement for Hazy |
|---|---|
| **1.4.1 Use of Color** | Risk levels are never colour-only: every badge has a **text label** ("Flood: High") and an icon shape; charts have patterns or labels |
| **1.4.3 Contrast (Minimum)** | Text at least 4.5:1 (large text 3:1) in light **and** dark themes, including text on coloured risk badges |
| **1.4.11 Non-text Contrast** | Badge borders, focus rings, chart lines and toggles at least 3:1 against adjacent colours |
| **1.4.10 Reflow** | Works at 320 CSS px wide with no horizontal scrolling (the hourly strip may scroll horizontally because it is 2-D data, but give it a list/table alternative) |
| **2.1.1 Keyboard** | Search, results, day tabs, unit toggle, console chat, the diff viewer and Approve are all keyboard-operable |
| **2.4.7 Focus Visible** | A visible focus ring everywhere; never `outline: none` without a replacement |
| **2.5.8 Target Size (Minimum)** | Targets at least 24×24 CSS px (aim for 44×44 on mobile, per platform guidelines) |
| **4.1.3 Status Messages** | "Loading forecast", "Updated 5 min ago", "Offline", "Proposal approved, deploy started" via `role="status"` / `aria-live="polite"`; NWS warnings use `role="alert"` once |
| **2.2.1 Timing Adjustable** | The console session expiry warns before timing out and lets the user extend it; no auto-dismissing error toasts |
| **3.3.1 Error Identification** | Wrong password, a location not found, and rate limits are all described in text next to the field |

Additional practices:

- `<html lang="en">`, a logical heading order (one `h1` per view), landmarks
  (`header`, `main`, `nav`).
- **Streaming chat**: do not announce every token. Keep the streaming message
  `aria-busy="true"` and announce once when complete (or announce sentence
  chunks), and provide a "Stop" button.
- **Diffs**: a text representation with `+` and `-` prefixes and "added/removed"
  for screen readers, not colour alone.
- Respect `prefers-reduced-motion` (no animated radar loops by default) and
  `prefers-color-scheme`.
- Units: imperial by default in the US, with a toggle; always include the units
  in the text ("1.8 in").
- Plain language: "Flooding possible on roads this afternoon" next to the numbers.
  Avoid jargon (CAPE) in the main view and put it under "Why?".
- Timestamps in the local timezone of the *location*, labelled as such.
- Test with VoiceOver (iOS Safari, installed PWA) and TalkBack (Android Chrome),
  and with 200% text size (Dynamic Type / Android font scale).

## Sources

- WCAG 2.2 Quick Reference: https://www.w3.org/WAI/WCAG22/quickref/
- MDN, Service workers (offline testing context): https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers
- MDN, Making PWAs installable: https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable
- Netlify Functions API (handler shape used in function tests): https://docs.netlify.com/build/functions/api/
