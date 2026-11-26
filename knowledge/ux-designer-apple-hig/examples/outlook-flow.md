# Example 1 — Outlook flow with every state designed

Follows: hig-navigation-tab-bars-sheets.md, hig-feedback-loading-alerts.md, hig-writing-onboarding.md.

## Screens
```
[Tab: Outlook]──tap day──▶[Day detail (push)]
     │ tap "Change place"
     ▼
[Places sheet] search field (scope chip: "Florida ▾") · "Use my location" · Recent (Clear) · Saved
```

## Outlook: states
| State | What the person sees | Why (HIG) |
|---|---|---|
| First run (no place) | Title "Pick a place", buttons **Use my location** and **Search places** | Onboarding: teach by doing, no tour |
| Loading (cached exists) | Cached outlook immediately + "Updating…" under the time | Loading: show something ASAP |
| Loading (no cache) | Skeleton hero and 3 skeleton day rows | Loading: placeholders |
| Ready | Hero: "Storms likely this afternoon" · badges **Thunder: Likely** ⚡ / **Flood: Low** 💧 · "Updated 5 min ago · Tampa, FL" | Feedback near the item |
| NWS warning active | Pinned banner above the hero: "National Weather Service: Flash Flood Warning until 6 PM" › details; tab badge on Outlook | Alerts only for critical info; inline, not modal |
| Offline | Inline banner "You're offline. Showing the outlook from 9:40 AM." Alerts row: "Can't check alerts offline" | No alert at startup |
| Error, no cache | "Couldn't load the outlook." + **Try again** | Explain why + action |
| Location denied | "Location is off. Search for a place instead." + **Search places** | Help them recover |
| Outside the US | Alerts section hidden; note "Official alerts are available for US locations" in Day detail | Don't show "no alerts" falsely |

## Acceptance criteria (for pwa-mobile-expert and qa-engineer)
1. The risk level is always text + icon + colour; VoiceOver reads "Flood risk: Low".
2. The hero headline is ≤ 40 characters and starts with the hazard.
3. "Updated …" is visible on every ready or offline state.
4. NWS banner: `role="alert"`, announced once per new alert ID.
5. All targets ≥ 44×44 px; the tab bar is always visible except under the sheet.
