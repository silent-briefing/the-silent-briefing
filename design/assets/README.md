# Assets

Self-hosted brand and structural assets.

- `shield.svg` — Utah shield with gold beehive line art. Used as app-square mark and hero ornament.
- `favicon.svg` — 32px square, gold shield on navy.
- `wordmark.svg` — "THE SILENT BRIEFING" wordmark, navy on cream.
- `wordmark-gold.svg` — same, gold on navy.
- `slco-map.svg` — stylised Salt Lake County map, grayscale district boundaries, pinned indicators.

Everything is SVG. Fonts live in `../fonts/` (Newsreader + Inter, self-hostable WOFF2 when added — for now we rely on the Google Fonts CDN import inside `colors_and_type.css`). **⚠ Font substitution flag:** No self-hosted WOFF2 files are bundled yet — the system currently loads Newsreader + Inter from `fonts.googleapis.com`. For production deployment, drop the official WOFF2 subsets into `fonts/` and swap the `@import` in `colors_and_type.css` for a `@font-face` block.

No illustrations, no stock photos, no AI-generated imagery. Candidate portraits are always real public-record photos sourced at display time (graysale treatment applied via CSS).
