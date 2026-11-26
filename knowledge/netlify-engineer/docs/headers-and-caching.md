# Custom headers and CDN caching

Sources (read 2026-11-26):
- Custom headers: https://docs.netlify.com/manage/routing/headers/
- Caching overview: https://docs.netlify.com/build/caching/caching-overview/

## `_headers` syntax (quoted rules)
- Path line, then header lines **indented** below it; "Any line beginning with `#` will be ignored as a comment";
  "Header field names are case insensitive."
- Wildcards `*` anywhere in a segment; placeholders `:name` only at the start of a segment; not both in one segment.
- Multi-value: repeat the header; Netlify concatenates (`cache-control: max-age=0,no-cache,…`).
- `netlify.toml` equivalent: `[[headers]] for = "/*"` with `[headers.values]`.

## Limitations (quoted, important)
- "Custom headers apply only to files Netlify serves from our own backing store. If you are proxying content … or dealing
  with a URL handled by a **function** … custom headers won't be applied to that content. In those cases … the function
  should return any required headers instead."
- Headers are global for all builds (not per deploy context) unless you use the documented workaround.
- Ignored names include `Content-Length`, `Content-Encoding`, `Date`, `Location`, `Server`, `Set-Cookie` ("may be overridden
  by Netlify cookie handling"), `Transfer-Encoding`.

## Caching function responses (docs example)
```ts
return new Response("Hello world", { headers: {
  "Netlify-CDN-Cache-Control": "public, durable, max-age=60, stale-while-revalidate=120" } });
```
Default for static assets: `Netlify-CDN-Cache-Control: public, s-maxage=31536000, must-revalidate` and
`Cache-Control: public, max-age=0, must-revalidate`.
