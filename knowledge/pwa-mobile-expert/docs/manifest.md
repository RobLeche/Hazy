# Web app manifest

Sources (read 2026-11-26):
- MDN, Web application manifest: https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Manifest
- MDN, Making PWAs installable: https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable
- web.dev, Installation prompt: https://web.dev/learn/pwa/installation-prompt

## Facts
- "A web application manifest contains a single JSON object where the top-level keys are called _members_."
  "All members are optional in the specification, but some applications require some members to be present."
- MDN notes that `dir`, `lang` and `iarc_rating_id` "are not implemented".
- Link it from **every page**: `<link rel="manifest" href="/manifest.webmanifest">` ("If the PWA has more than one
  page, every page must reference the manifest in this way").

## Chromium installability requirements (MDN)
- `name` or `short_name`
- `icons` containing a **192px and a 512px** icon
- `start_url`
- `display` and/or `display_override`
- `prefer_related_applications` false or absent
- served over **HTTPS** (or `localhost` / `127.0.0.1` during development)

## Promotional fields (web.dev)
"Some browsers enhance the installation prompt experience using the promotional fields in the manifest, including
`description`, `categories`, and `screenshots`." Chrome on Android uses `description` and `screenshots` for a richer
install sheet.

## Hazy values
`id: "/"`, `name: "Hazy — Storm & Flood Outlook"`, `short_name: "Hazy"`, `start_url: "/?source=pwa"`, `scope: "/"`,
`display: "standalone"`, theme and background colours from tokens, icons 192/512 plus maskable 512. See
`../examples/site/manifest.webmanifest`.
