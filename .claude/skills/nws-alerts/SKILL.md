---
name: nws-alerts
description: "Fetch and present official National Weather Service alerts (flood and thunderstorm watches and warnings) for a point via api.weather.gov from a Netlify Function. Use when building the alerts endpoint or the override that puts NWS alerts above Hazy's own score."
metadata:
  owner: api-integration-expert
  shared_with: [meteorology-risk-analyst, netlify-engineer]
---
# NWS alerts

- Endpoint: `GET https://api.weather.gov/alerts/active?point={lat},{lon}` (GeoJSON).
- **The User-Agent header is required** (e.g. `Hazy (https://<site>.netlify.app, <contact>)` from the
  `NWS_USER_AGENT` env var). Browsers cannot set it, so call the NWS from the
  `/api/alerts` Netlify Function.
- No API key. Rate limit is "generous"; on error, retry after about 5 s; one retry max.
- Round lat/lon to 2 decimals; cache the response at the CDN for 120 s
  (`Netlify-CDN-Cache-Control: public, durable, max-age=120, stale-while-revalidate=60`).
- Return a trimmed list: `event, severity, urgency, headline, onset, ends, areaDesc, id`.
- Relevant events: Flash Flood Warning/Watch, Flood Warning/Watch/Advisory, Coastal Flood *,
  Severe Thunderstorm Warning/Watch, Tornado Warning/Watch, Hurricane/Tropical Storm *.
- **Override rule:** an active flood warning raises the displayed flood level to at least High; a watch
  raises it to at least Moderate, labelled "NWS alert".
- **Never cache alerts in the service worker.** Offline shows "Can't check alerts offline".
- US only. Outside the US, hide the alerts section rather than show "no alerts".
