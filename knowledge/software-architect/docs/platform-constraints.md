# Hard constraints the architecture must respect (with sources)

| Constraint | Value | Source |
|---|---|---|
| Sync function limit | 60 s, not configurable | https://docs.netlify.com/build/functions/configuration/ |
| Streaming function | 60 s, 20 MB | https://docs.netlify.com/build/functions/api/ |
| Background function | 15 min; 202; retries after 1 and 2 min | https://docs.netlify.com/build/functions/background-functions/ |
| Function headers | `_headers` does not apply to function responses | https://docs.netlify.com/manage/routing/headers/ |
| Blobs consistency | eventual (≤ 60 s) unless `consistency: "strong"` | https://docs.netlify.com/build/data-and-storage/netlify-blobs/ |
| Rate-limit rules | Free plan: 2 code-based rules; window ≤ 180 s | https://docs.netlify.com/manage/security/secure-access-to-sites/rate-limiting/ |
| Open-Meteo free tier | non-commercial; 600/min, 5,000/h, 10,000/day; CC BY 4.0 | https://open-meteo.com/en/terms |
| Open-Meteo time | fixed `utc_offset_seconds`; DST in range ignored | https://open-meteo.com/en/docs |
| NWS | User-Agent required (so: server-side) | https://www.weather.gov/documentation/services-web-api |
| Claude | streaming for long outputs; forced `tool_choice` 400 on Opus/Sonnet 5.5 | https://platform.claude.com/docs/en/build-with-claude/streaming , …/tool-use/implement-tool-use |
| GitHub | Contents PUT is one file per commit and must be serial; Git Data API for atomic multi-file | https://docs.github.com/en/rest/repos/contents , /rest/git/trees |
| PWA install | manifest with 192 and 512 icons, start_url, display; HTTPS | https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable |

## Architecture consequences
1. Anything that might exceed ~45 s → background job + Blobs + polling.
2. Every function sets its own security and cache headers.
3. Reads that decide state transitions use strong consistency + ETag CAS.
4. Weather data: browser-direct or CDN-cached by rounded coordinates; scoring is a pure shared module.
5. Alerts and all Claude/GitHub calls: Functions only (secrets, User-Agent).
