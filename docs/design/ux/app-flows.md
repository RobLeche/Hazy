# Hazy app flows (v1)

Audience: Pip (builds it), Petra (tests it). Strings are never typed into code: import them from
[`copy-deck.json`](copy-deck.json) by key (written here as `copy:outlook.updated`).
Design basis: `knowledge/ux-designer-apple-hig/docs/*` and `examples/outlook-flow.md`.

The moment we design for: a stressed person, one hand, rain on the screen, weak signal. They need one answer
("are storms or flooding likely, and when?") in the first screenful, in plain words.

## 1. Structure

Bottom tab bar, always visible except under a sheet (HIG tab bars: do not hide or disable tabs).

| Tab | Purpose | Notes |
|---|---|---|
| Outlook | The selected place | Default tab. Badge dot only for an active NWS alert (`copy:tabs.alertBadgeSr` is its text). |
| Places | Search, recent, saved | Doubles as the search tab (HIG searching). |
| Settings | Units, appearance, install, About, Agent Console | |

```
Outlook ──tap a day──▶ Day detail (push, back label "Outlook")
   │ "Change place" ─────▶ Places tab (selected)
Places ──tap a result──▶ Outlook (that place, loading)
Settings ──"Agent Console"──▶ /console (see console-flows.md)
```

Routes: `/` Outlook, `/places`, `/settings`, `/day/:index`, `/console` (lazy-loaded). The selected place and
settings live in `localStorage`; no account.

Layout rules for every screen: design at 390x844, verify 320 px wide with no sideways scroll; respect safe areas;
content scrolls under the tab bar, which is a glass layer (visuals: Sable). Targets 44x44 px minimum.

## 2. Outlook

### 2.1 Layout, top to bottom

1. **Header**: place name as the page `h1` (e.g. "Tampa, Florida"), a **Change place** button (`copy:buttons.changePlace`)
   and a **Refresh** icon button (`aria-label` `copy:outlook.refreshSr`). Pull-to-refresh also works; the button is
   the visible alternative.
2. **Status area** (one persistent `role="status"` region, polite). Holds the offline or "couldn't update" banner when needed.
3. **NWS banner** (only when an alert is active). Pinned directly under the header, above the hero. See 2.4.
4. **Hero card**:
   - Headline (`h2`), built from `copy:headlines.*` (rule: the hazard with the higher level; ties go to thunder).
     Always starts with the hazard, never a percentage.
   - Two badges side by side: `copy:badges.thunder` and `copy:badges.flood`. Each is icon + text + colour. Their
     screen-reader text is `copy:badges.thunderSr` / `floodSr` ("Flood risk: Low").
   - One line of safety advice only when the hazard level is Likely or higher (thunder) or Moderate or higher (flood):
     `copy:advice.lightning`, `copy:advice.flood`. These are the only safety actions v1 uses.
   - Caption `copy:outlook.sourceLabel` ("Hazy outlook, not an official warning"), always present.
   - Update line: `copy:outlook.updated` (relative time) and below it `copy:outlook.placeLine` (place and the place's
     time zone, so a traveller is not misled).
   - If the NWS raised a level: chip `copy:badges.raisedByNws` next to the raised badge.
   - If scoring sets the severe flag: chip `copy:badges.severeChip`.
5. **Today by time** (optional in v1, only if scoring returns blocks): four rows (morning, afternoon, evening, overnight)
   with the same badges. Stacked list, never a horizontal strip (reflow at 320 px).
6. **Next days** (`h2` `copy:outlook.nextDaysSection`): up to 7 rows. Each row is one button: weekday, thunder badge, flood
   badge, chevron. Row `aria-label` is `copy:outlook.dayRowSr`. Opens Day detail (push).
7. **Why?** disclosure (`button` with `aria-expanded`, label `copy:why.title`). Opens plain reason sentences for today
   (from scoring, via Skye), then `copy:why.modelNote`, then a nested **Technical details** disclosure
   (`copy:why.technical*`). Jargon (CAPE, lifted index) appears only in that nested part.
8. **Marine card** (coastal places only): `copy:outlook.marineTitle`, waves, water temperature, `copy:outlook.marineNote`.
   Not coastal: the card is absent (no empty card, no explanation). If the marine request fails for a coastal place: a
   small line `copy:errors.marineUnavailable` inside the card slot; the rest of the screen is unaffected.
9. **Alerts section** (below the marine card, once scrolled): for US places with no alerts `copy:outlook.alertsNone`.
   For non-US places this section is hidden and Day detail shows `copy:outlook.outsideUsNote` (never a false "no alerts").
10. **Footer**: `copy:footer.warning` with "weather.gov" linked (`copy:footer.weatherGovUrl`), then `copy:footer.attribution`
    with "Open-Meteo.com" linked (`copy:footer.openMeteoUrl`). Same footer on Day detail.
11. **Install hint card** (2.7), when it applies, sits between Next days and Why?, never above the hero.

Day detail (push): `h1` weekday, same headline, badges, advice, Why? (open by default here), marine card if
coastal, alerts note for non-US, footer. Back button label is the previous screen's title ("Outlook").

### 2.2 States

| State | What the person sees | Copy | Status region |
|---|---|---|---|
| First run (no place) | Centered: title, one sentence, primary **Use my location**, secondary **Search places**. Tab bar visible. No tour. | `empty.firstRunTitle`, `empty.firstRunBody` | none |
| Loading, no cache | Skeleton hero and 3 skeleton day rows (no spinner). Header already shows the place name. | `status.loadingOutlook` (visually hidden) | announce once |
| Loading, with cache | Cached outlook at once. Update line reads "Updating…". No skeleton. | `outlook.updating` | silent unless user started it |
| Ready | Everything in 2.1. Update line shows relative time. | `outlook.updated` | after a user-started refresh: `outlook.updatedDone` |
| NWS warning active | Banner pinned above hero, tab badge dot. Hero unchanged except chips. | `banners.nws` | `role="alert"` once per alert ID |
| Offline, cache exists | Inline banner above hero. Alerts row says it cannot check. Update line keeps the cached time. | `banners.offline`, `errors.alertsOffline` | status |
| Offline, no cache | Message and **Try again**. Tabs still work (Places shows recent and saved). | `errors.outlookOfflineNoCache` | status |
| Error, cache exists | Cached outlook plus banner with **Try again**. | `banners.staleAfterError` | status |
| Error, no cache | Message with **Try again**. | `errors.outlookLoad` | status |
| Alerts failed, forecast fine | Forecast shows; alerts row shows the message with a link to weather.gov. | `errors.alertsLoad` | status |
| Location denied | On first run or after **Use my location**: message and **Search places**. No retry loop. | `errors.locationDenied` | status |
| Location unavailable (timeout, no GPS) | Same layout. | `errors.locationUnavailable` | status |
| Outside the US | Outlook works. Alerts section hidden. Day detail and a one-time inline note explain. | `empty.outsideUsTitle/Body`, `outlook.outsideUsNote` | none |
| Back online | Banner clears, outlook refreshes silently. | `banners.backOnline` | status |
| App update ready | Toast at the bottom above the tab bar with **Refresh**. | `banners.swUpdate`, `buttons.reloadApp` | status |

Rules behind the table:
- The offline banner is inline, never a modal alert (HIG alerts: "Avoid showing an alert when your app starts").
- Show the update time on every Ready, Offline and Error-with-cache state.
- Updates that happen in the background are silent for screen readers; only user-started actions (Refresh, pull,
  Try again, changing place) announce the result.
- Cached outlooks keep their original time. Never show an old outlook as if it were new.

### 2.3 Hero headline selection (for Pip)

Input: thunder level, flood level, time-of-day key. Pick the hazard with the higher rank; on a tie, thunder. Look up
`headlines.thunder[level]` or `headlines.flood[level]`, replace `{when}` from `headlines.when`. Rank order:
none < low/veryLow < possible/moderate < likely/high < veryLikely/extreme. The `when` key is the next block that is not
over (morning, afternoon, evening, night), or `today` for a whole-day view, or `tomorrow`. Skye reviews the final mapping.

### 2.4 NWS banner

- Text: `banners.nws` with the NWS event name and end time in the place's time zone (e.g. "National Weather Service: Flash
  Flood Warning until 6 PM"). Colour and icon follow the alert's severity; the words carry the meaning.
- One banner: the most severe active alert; if there are more, add `banners.nwsMore` ("and 2 more").
- **View details** opens a push screen (not a modal): the alert's headline, area, expiry, description and instruction as
  plain text (`textContent` only), and `banners.nwsSource`.
- `role="alert"` is set once for a new alert ID. A refresh that returns the same alert ID does not re-announce. When the
  alert expires the banner is removed silently.
- Never summarise or reword NWS text. Never show an NWS alert as "Hazy" output.

### 2.5 Acceptance criteria: Outlook

| ID | Criterion |
|---|---|
| OUT-1 | First run shows only the title, one sentence and two buttons; no modal, no tour; tab bar visible. |
| OUT-2 | Risk level is always icon + text + colour; VoiceOver reads "Thunderstorm risk: Likely" and "Flood risk: Low". |
| OUT-3 | The headline starts with the hazard, is 40 characters or fewer, and contains no digits or "%". |
| OUT-4 | "Hazy outlook, not an official warning" is visible under the headline in every Ready, Offline and Error-with-cache state. |
| OUT-5 | An update line is visible in every Ready, Offline and Error-with-cache state, with the place's time zone name. |
| OUT-6 | Loading with no cache shows skeletons within 100 ms; loading with cache shows the cached outlook in the first paint. |
| OUT-7 | Offline with cache: the banner appears inline, no dialog, the cached time is shown, alerts row says it cannot check. |
| OUT-8 | An active alert: banner is above the hero, has `role="alert"`, is announced once per alert ID, and the Outlook tab shows a badge dot with a text alternative. |
| OUT-9 | The marine card exists only for coastal places; its absence leaves no gap or placeholder. |
| OUT-10 | Why? is a button with `aria-expanded`; CAPE and lifted index appear only inside Technical details. |
| OUT-11 | Non-US place: no "no alerts" text; the outside-US note is shown. |
| OUT-12 | Footer text matches `copy:footer.*`, links open in the same tab and are focusable; present on Outlook and Day detail. |
| OUT-13 | Refresh is possible by button and by pull; no gesture is the only way. |
| OUT-14 | No horizontal scroll at 320 px; text at 200% still shows headline, both badges and the update line without clipping. |
| OUT-15 | Location denied shows `errors.locationDenied` and **Search places**; no permission prompt appears until **Use my location** is tapped. |

### 2.6 Accessibility notes: Outlook

- Landmarks: `<header>`, `<main>`, `<nav aria-label="Main">` (tab bar), `<footer>`. One `h1` (place name). Hero headline `h2`,
  "Next days" `h2`.
- Tab bar: links with `aria-current="page"` on the active tab; 44x44 px each; the badge dot has `aria-label`/hidden text.
- Live regions: exactly one persistent `role="status"` (`aria-live="polite"`) for loading, updated and offline text; one
  container for `role="alert"` that is only populated when a new NWS alert ID appears. Do not put `aria-live` on the
  hero.
- Focus order: header (Change place, Refresh) → NWS banner (View details) → hero (not focusable; it is read in order) →
  Today rows → Next days rows → Install hint → Why? → Marine card → footer links → tab bar. After a place change, focus
  moves to the `h1`. After Try again succeeds, focus stays on the button's container, not on a removed node.
- Skeleton: `aria-busy="true"` on the hero container while loading with no cache; remove when ready. Shimmer stops under
  `prefers-reduced-motion`.
- Badges: never colour alone. Contrast 4.5:1 for text, 3:1 for icons and focus rings, in both themes (Sable owns the tokens).
- Honour `prefers-reduced-transparency`: glass becomes solid.

### 2.7 Install hints

| Platform | Condition | UI | Behaviour |
|---|---|---|---|
| iOS (Safari, Chrome, Edge, Firefox) | Not standalone (`navigator.standalone` false) and not dismissed | Card in Outlook (between Next days and Why?): `install.iosTitle`, `install.iosBody` with an inline Share glyph (`install.shareIconSr`), **Dismiss** | Shown after the first successful outlook, never on first run. One time: **Dismiss** is remembered permanently. |
| Android (Chrome, Samsung Internet) | `beforeinstallprompt` was caught and not installed | Same card: `install.androidTitle`, `install.androidBody`, primary **Install app**, **Dismiss**; plus the same **Install app** row in Settings → Install | `preventDefault()` on the event, call `prompt()` only on the tap. Dismiss hides the card but keeps the Settings row. |
| Installed or unsupported | `display-mode: standalone` or no prompt available | Nothing | The Settings → Install row is hidden. |

Acceptance: INS-1 the card never appears on first run or while loading; INS-2 **Dismiss** is 44x44 px and remembered; INS-3 the iOS
card tells how to install in two steps and does not use a button that cannot work; INS-4 no install UI when standalone.
Reference: `docs/02-pwa-installability.md`.

## 3. Places

### 3.1 Layout

1. `h1` "Places" (`copy:places.title`).
2. **Search field** (`type="search"`, visible label `copy:places.searchLabel`, placeholder `copy:places.searchPlaceholder`),
   with a **scope chip** beside or under it: `copy:places.scopeChip` = the state (default "Florida"). Chip is a button
   (**Choose state**; `aria-label` `copy:places.scopeSr`) that opens a list sheet of the 50 states and DC with the
   current state checked. The scope is always visible (HIG: "Clearly display the current scope of a search").
3. **Use my location** row (primary action when the field is empty).
4. **Recent** (`h2`): up to 8 places, newest first, with **Clear recent** at the section's right. Under it
   `copy:places.recentPrivacy`.
5. **Saved** (`h2`): rows. Empty text `copy:empty.savedNone`.

While typing (2 or more characters, 300 ms debounce) Recent and Saved are replaced by **Results** (`h2`). Each result row
shows the place name, then the area line (county and state if the geocoder returns them) and has a trailing
**Save place** button (`aria-label` `copy:places.saveSr`). A saved place shows **Remove place** instead
(`aria-label` `copy:places.removeSr`).

Tapping a row selects the place, adds it to Recent, switches to Outlook and starts loading.

### 3.2 States

| State | What the person sees | Copy |
|---|---|---|
| Idle, no recent or saved | Hint under the field, **Use my location** row | `empty.searchHint`, `empty.recentNone`, `empty.savedNone` |
| Searching | Results area shows "Searching…" (status), previous results stay until new ones arrive | `status.searching` |
| Results | List with Save place buttons | none |
| No results | Title, message naming the query and state, and a **Choose state** button | `empty.noResultsTitle`, `empty.noResults` |
| Search error | Message and **Try again** | `errors.searchLoad` |
| Offline | Search disabled with message; Recent and Saved still work and open cached outlooks | `errors.searchOffline` |
| Finding location | **Use my location** row shows "Finding your location…", other rows stay usable | `status.findingLocation` |
| Location denied | Inline under the row, with the field focused | `errors.locationDenied` |
| Location unavailable | Same | `errors.locationUnavailable` |
| Location outside the US | Place is selected as "Current location"; Outlook shows the outside-US note | `places.currentLocationName`, `empty.outsideUsBody` |
| Removed a saved place | Toast with **Undo** for 6 seconds, no confirmation dialog (it is undoable) | `status.removedPlace`, `buttons.undo` |
| Cleared recent | No confirmation (low stakes); status text announces | `status.clearedRecent` |

Notes: the geolocation permission prompt is requested only on tap. "Current location" is the name until a reverse lookup exists
(Open-Meteo geocoding is forward search; reverse naming is not in our notes, so unverified: see Handoff to Milo).
The state filter is applied to geocoding results by state name (approach to confirm with Milo).

### 3.3 Acceptance criteria: Places

| ID | Criterion |
|---|---|
| PLC-1 | The state chip always shows the scope and defaults to Florida; changing it re-runs the current query. |
| PLC-2 | Results appear after 2 characters and a 300 ms pause; at most one request is in flight (abort the previous). |
| PLC-3 | No-results state names the query and the state and offers **Choose state**. |
| PLC-4 | The geolocation prompt appears only after tapping **Use my location**. Denial shows `errors.locationDenied` and leaves the field usable. |
| PLC-5 | Recent holds at most 8 places, is de-duplicated, stays on device, and **Clear recent** empties it and announces the result. |
| PLC-6 | Save and Remove are real buttons with 44x44 px targets and place-specific accessible names; no swipe-only action. |
| PLC-7 | Remove shows an Undo toast for 6 seconds; no modal. |
| PLC-8 | Offline: Recent and Saved open their cached outlooks; search shows `errors.searchOffline`. |
| PLC-9 | Selecting a place moves focus to the Outlook `h1` and the tab bar shows Outlook selected. |

### 3.4 Accessibility notes: Places

- The search input has a visible `<label>`; results are a `<ul>`; the result count is announced through the status region
  ("5 places found" is not in the deck: if you want it, ask Wren for a string).
- Focus order: field → state chip → Use my location → Recent (Clear recent, rows) → Saved rows. Escape clears the field.
- The state sheet is a `role="dialog"` with a title, focus trapped, Escape closes, focus returns to the chip. One sheet at a time.
- Do not use `aria-live` on the results list itself.

## 4. Settings

| Row or section | Control | Notes |
|---|---|---|
| Units | Segmented radio group: `settings.unitsImperial` (default) / `settings.unitsMetric` | Applies at once to Outlook, Day detail, Marine card; stored locally. |
| Appearance | Radio group: `settings.appearanceSystem` (default) / Light / Dark | Default follows `prefers-color-scheme`. |
| Install | **Install app** button (Android only) or the iOS hint text | Hidden when installed. |
| About | Rows: `settings.aboutAttribution` (Open-Meteo link and CC BY 4.0 link), `settings.aboutAlerts`, `settings.aboutNonCommercial`, `settings.aboutDisclaimer`, `settings.versionLine` | Attribution lives here, not in onboarding (HIG onboarding). |
| Agent Console | Navigation row `settings.consoleRow` with `settings.consoleRowHelp`, chevron | Goes to `/console`. No password prompt here; login is on the console route. |

Acceptance:
- SET-1 changing units updates every number on Outlook without reload; the choice survives restart.
- SET-2 the About section shows "Weather data by Open-Meteo.com (CC BY 4.0)" with working links to open-meteo.com and the licence, and the "not a warning service" sentence.
- SET-3 the Agent Console row is a link with 44 px height and reads "Agent Console, for the project team, password needed".
- SET-4 radio groups are reachable by arrow keys; the selected value is announced.
- SET-5 Settings is `h1` "Settings", sections are `h2`.

## 5. Copy and tone notes for builders

- Buttons start with a verb, sentence case, 24 characters or fewer: enforced by `docs/design/ux/copy-deck.test.ts`.
- Do not put a number with "%" in any headline or badge. Show levels as words.
- Do not add a new string in code. Ask Wren, who adds it to the deck and lints it.
- The only modal dialog in the whole product is the console's "Deploy these changes?" confirmation. Everything in this file is inline.

## 6. Open questions (not blocking v1)

1. Reverse geocoding for "Use my location" naming (Milo).
2. How the app decides "outside the US" (for example the NWS points response): unverified; Milo to confirm from `nws-alerts`.
3. Whether scoring returns time-of-day blocks in v1 (Skye); if not, drop "Today by time".
