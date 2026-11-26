# NWS alerts API (official warnings overlay)

Source: https://www.weather.gov/documentation/services-web-api (read 2026-11-26)

- Base URL `https://api.weather.gov`. No API key today (the page notes that this may change to an API key in the future).
- **User-Agent is required** to identify the application, e.g. `User-Agent: (myweatherapp.com, contact@myweatherapp.com)`.
  Browsers cannot set `User-Agent` from JavaScript, so Hazy calls this from a Netlify Function (`/api/alerts`).
- Alerts: `/alerts/active?point={lat},{lon}` or `/alerts/active?area={state}` (e.g. `area=FL`).
- Formats: GeoJSON (default), JSON-LD, DWML, OXML, CAP, ATOM.
- Rate limits: "reasonable rate limits in place to prevent abuse"; when exceeded, a request errors and "may be retried
  after the limit clears (typically within 5 seconds)". The docs note that proxies are more likely to hit the limit, so
  cache per rounded point (120 s).
- Coverage: United States only. Outside the US, hide the alerts section instead of saying "no alerts".
- Never cache alerts in the service worker. Stale warnings are dangerous.
