# Silent Briefing — Design System

**Product:** *Candidate Intelligence Hub* — an evidence-first Republican political intelligence backend for Utah and Salt Lake County campaigns. Think Secret Briefing for delegates: scraped from vote.utah.gov + SLCO Clerk, normalized in Supabase, enriched with two-stage LLM dossiers (Perplexity Sonar → Perplexity Agent), served via FastAPI.

**Phase 1** ships the **engine only** — dashboard / dossier / comparison UX lives here in wireframes and will land in Phase 2+.

**Creative North Star:** **The Silent Briefing.** Not a public government portal. A private, high-end intelligence hub for decision-makers. Premium convention program meets confidential dossier. We reject cluttered-bureaucracy federal cliché in favor of **editorial authority** — expansive whitespace, razor-sharp type, tonal-layering instead of boxes, a thin gold pinstripe for structure, crimson used surgically as signal.

---

## Index

| File / folder | What's inside |
|---|---|
| `README.md` | This file — product context, content fundamentals, visual foundations, iconography |
| `colors_and_type.css` | CSS variables for the entire palette, type scale, spacing, shadows, radii. Drop-in. |
| `fonts/` | Self-hosted Newsreader + Inter (WOFF2). Fallback to Google Fonts CDN if missing. |
| `assets/` | Logo marks, district SVG, texture patterns, favicons |
| `preview/` | Design-system tab cards (Type, Colors, Spacing, Components, Brand) |
| `ui_kits/operator_console/` | High-fidelity React recreation of the primary Phase 2 UX — dashboard, dossier, comparison matrix |
| `ui_kits/engine_ops/` | Operator UI for the Phase 1 backend — job queue, extraction health, data-quality review |
| `SKILL.md` | Agent Skill manifest (cross-compatible with Claude Code) |

## Sources consulted

- `wireframes/stitch/modern_federal/DESIGN.md` — authoritative creative direction ("Silent Briefing")
- `wireframes/studio/project_brief_candidate_intelligence_hub.html` — product & domain brief
- `wireframes/studio/src/{App.tsx,index.css}` — React 19 + Tailwind v4 reference implementation
- `wireframes/stitch/{main_dashboard,candidate_dossier,candidate_explorer,comparison_matrix}/code.html` — static-export layouts
- `wireframes/DESIGN_REVIEW.md` — reconciled drift notes

The reader is **not assumed** to have access to these; everything is transcribed and reinterpreted here.

---

## Content Fundamentals

Copy is the most-likely place to break the brand. The existing `App.tsx` drifted into spy-thriller fiction ("Sector 7," "Project Chimera," "Level 5 Clearance") — that **breaks the product promise** because this is a compliance-sensitive campaign tool, not a genre simulator. Use **Utah-shaped fixtures** always.

### Voice

- **Editorial, not enterprise.** This is a briefing, not a platform. Read like the opening page of a Sunday print supplement, not a SaaS onboarding.
- **Authoritative, not loud.** State facts; never exclaim. Avoid "powered by AI," "supercharged," "seamless," "unlock," "effortless."
- **Second person is rare.** Prefer headlines without a subject ("Morning brief," "Recent filings"), or third person ("Rep. Anderegg filed…"). Reserve "you" for direct commands in tooltips and empty states.
- **Singular headline voice per screen.** One serif headline sets the page's mood; everything else is plain.

### Casing & tracking

- **Serif headlines:** sentence case, italic used for emphasis, never ALL CAPS.
  - ✓ `The Salt Lake briefing: District 4 operational overview`
  - ✗ `THE SALT LAKE BRIEFING`
- **Metadata labels:** UPPERCASE, 0.2–0.3em letter-spacing, bold Inter, small (10–12px). Think dossier tab: `FILED ON`, `TRUST SCORE`, `COUNTY CLERK`.
- **Body:** sentence case, Oxford commas, tabular figures for scores / counts / dates.
- **Numbers:** always tabular. Percentages with `%` no space. Dates as `Oct 23, 2024 • 14:02 MT` or ISO `2024-10-23T14:02-06:00` in audit logs.

### Tone samples (use these as mental anchors)

| Good ✓ | Avoid ✗ |
|---|---|
| "Three new filings require review." | "🚨 3 URGENT alerts need your attention NOW!" |
| "Vetting status: pending — commercial-interest disclosure." | "Flagged for Level 4 clearance review." |
| "District 4 primary filing closes Friday." | "CRITICAL: Sector 4 window closing!" |
| "Source: vote.utah.gov filing record" | "Via our proprietary intel pipeline" |
| "No evidence of out-of-district residence." | "Subject appears clean." |
| "Claim: 'I voted no on HB 123.' Verified — roll-call 2023-02-14." | "True ✅" |

### Domain vocabulary (use these — they are correct)

- **Candidate**, not "asset" or "operative"
- **Dossier**, not "profile"
- **Claim** (atomic, citable statement) — not "fact" or "datapoint"
- **Filing**, **disclosure**, **roll-call vote** — domain-real
- **Primary**, **general**, **convention**, **delegate** — Utah's GOP uses both convention and primary paths; both exist
- **Vetting**, not "clearance"
- **Source** (always cite): `vote.utah.gov`, `slco.org/clerk`, `disclosures.utah.gov`, `disclosure.saltlakecounty.gov`, **Ballotpedia** (never inline-link without attribution)
- **GOP vs opposition** framing is appropriate — the product openly routes differently for in-party vs opposition research. Don't hide this; label it.

### No emoji, no emoji replacements

Emoji are explicitly excluded. No 🔴 🚨 ⚠️ 📊 🇺🇸. Use the iconography system (see below). Unicode ornaments like `§`, `•`, `—`, `↗` are permitted in metadata; `•` is the canonical separator between label fragments.

### Empty states & microcopy

- Empty dossier section → italic serif: *"No filings on record for this cycle."*
- Loading → *"Extracting from vote.utah.gov…"* (always name the source)
- Error → `Source unreachable — last successful fetch: 14:02 MT` (show when, not why by default)

---

## Visual Foundations

### Colors

Four tokens do 95% of the work. Everything else is tonal surface layering.

| Token | Hex | Role |
|---|---|---|
| `--primary` | `#000f22` | Deep navy. Backgrounds of inverted surfaces, primary button fills, serif display on cream. **Not digital blue.** |
| `--primary-container` | `#0a2540` | Deep navy two steps lighter. Nav bars, hero band gradients paired with `--primary`. |
| `--secondary` | `#b6191a` | Crimson. **Signal only** — alerts, critical flags, deadline countdowns, destructive confirms. If more than ~5% of the viewport is crimson, you've over-used it. |
| `--tertiary` | `#d4af37` | Gold. **Structural accent** — pinstripes, featured-card top border, active-tab underlines, focus rings, the Utah shield mark. Never large fills. |
| `--background` / `--surface` | `#fbf9f5` | Cream. The "fine paper" feel that differentiates us from sterile digital white. |

**Tonal surface ladder** (for the No-Line Rule): layer rather than border.
- `--surface-container-lowest` `#ffffff`
- `--surface-container-low` `#f5f3ef`
- `--surface-container` `#efeeea`
- `--surface-container-high` `#eae8e4`
- `--surface-container-highest` `#e4e2de`

**Critical fix from DESIGN_REVIEW:** tertiary is unified on **`#d4af37`**. The `#735c00` olive that appeared in stitch tokens is removed.

### Typography

Two families. No third.

- **Newsreader** (variable, opsz 6–72, wght 200–800, italic) — serif, editorial, authoritative. Display sizes (28–96px). Italic carries emphasis.
- **Inter** (variable, wght 300–800) — sans-serif, the functional voice. Body (15–17px), labels (10–13px uppercase), UI controls.

**Scale (use the named tokens, don't reinvent):**

| Token | Size / LH | Use |
|---|---|---|
| `--display-2xl` | 72px / 1.02 | One-per-page hero (landing, empty state) |
| `--display-lg` | 56px / 1.05 | Page title |
| `--headline-lg` | 40px / 1.1 | Section headline |
| `--headline-md` | 28px / 1.2 | Subsection |
| `--title-lg` | 20px / 1.3 | Card headings |
| `--body-lg` | 17px / 1.6 | Long-form report body |
| `--body` | 15px / 1.55 | Default UI body |
| `--body-sm` | 13px / 1.5 | Secondary, tables |
| `--label-md` | 12px / 1.2 / 0.2em tracking / UPPERCASE / 700 | Dossier metadata labels |
| `--label-sm` | 10px / 1.2 / 0.3em tracking / UPPERCASE / 700 | Microlabels, audit-log timestamps |

**Rules of thumb:** headlines sentence-case, italic for emphasis; labels always UPPERCASE + tracked; body never tracked. Tabular figures (`font-variant-numeric: tabular-nums`) for any cell containing a number that users will compare.

### Spacing

An 8-point system with a few breathing-room exceptions. Tokens in `colors_and_type.css` as `--space-1` (4px) → `--space-32` (128px). Section padding on landings should breathe at `--space-20` (80px) or `--space-24` (96px) — this is the "let the content breathe" directive.

### Radii

- `--radius-sm` 2px — pills, chips
- `--radius-md` 4px — inputs, small buttons. **This is the house default.**
- `--radius-lg` 8px — cards
- `--radius-xl` 12px — floating panels, modals
- No `rounded-full` on anything except avatar and status dot. The brand is **editorial**, not **friendly-app**.

### Shadows — ambient, tinted, never gray

Shadows use **tinted navy**, not gray, to maintain tonal harmony.

- `--shadow-sm` `0 1px 2px 0 rgba(0, 15, 34, 0.04)` — subtle lift on list rows
- `--shadow-md` `0 8px 24px -8px rgba(0, 15, 34, 0.08)` — cards
- `--shadow-lg` `0 24px 48px -16px rgba(0, 15, 34, 0.10)` — floating panels / dropdowns
- `--shadow-glow-gold` `0 0 12px rgba(212, 175, 55, 0.35)` — *only* on featured-card dots, active-state pinstripe, timeline nodes

### Borders — The No-Line Rule

From DESIGN.md, non-negotiable: **do not use 1px solid borders to section content.** Use background color shifts (`surface-container-low` on `surface`) or subtle tonal transitions. When a border is genuinely required (accessibility focus, form field underline), use:

- **Ghost border:** `1px solid rgba(0, 15, 34, 0.08)` — a *suggestion* of an edge
- **Gold pinstripe:** `1px solid var(--tertiary)` used as a vertical accent only — left-hand ruler on long-form article, left-accent on featured filings
- **Focus ring:** `2px solid var(--tertiary)` with `4px` outset offset — never default-blue

### Backgrounds, textures, imagery

- **Surface philosophy: layered paper.** Cream base; subtle tonal card layering.
- **Hero band:** linear-gradient `--primary` → `--primary-container`, 0 → 100%, diagonal 135°. Allowed once per page.
- **Pattern motifs (2% opacity max):**
  - Repeating 5-point star field on primary surfaces — patriotism without clipart
  - Subtle dot grid on empty data surfaces — `radial-gradient(circle, var(--primary) 1px, transparent 1px) 0 0 / 32px 32px` at 3% opacity
- **Imagery treatment:** candidate portraits are **grayscale by default**, colorize on hover (grayscale 0.6s ease). This keeps the dossier feel and signals "aggregated public record, not a glamour shot."
- **No stock-photo glossy imagery.** No AI-gen faces. Use real public-domain portraits when we have them; solid-cream placeholders with serif initials when we don't.
- **No flag clipart.** The Utah shield mark (custom SVG in `assets/shield.svg`) is the only patriotic asset.

### Glassmorphism (bounded)

From DESIGN.md: sticky headers and floating navigation use glass.
- `background: rgba(251, 249, 245, 0.80)` (cream 80% alpha)
- `backdrop-filter: blur(16px) saturate(1.2)`
- No border; no shadow. The blur alone creates the lift.
- On navy backgrounds: `background: rgba(10, 37, 64, 0.72)` + same blur.

### Interaction — hover, press, focus

- **Hover on list rows / cards:** `1px` left-accent appears in `--tertiary` (gold pinstripe emerges). No scale. No color-flip. Optional portrait `grayscale(0)` colorize.
- **Hover on buttons:** `brightness(1.08)` on filled; `background: rgba(0,15,34,0.04)` on ghost.
- **Press / active:** `brightness(0.94)`, no scale-down. No "button depressed" shadow.
- **Focus-visible (accessibility required):** 2px gold outline, 4px offset, `--radius-md`. Always visible on keyboard; invisible on mouse.
- **Disabled:** 40% opacity, cursor not-allowed. Never gray-out colors.

### Animation — economy

Three families. Anything else is ornament.

1. **Screen enter:** opacity 0 → 1 + y 20 → 0, 400ms `cubic-bezier(.2,.8,.2,1)`. On the root of each screen only.
2. **List row affordance:** hover lift via left-accent pinstripe, 200ms ease.
3. **Data reveal:** staggered opacity of list children, 60ms stagger, 300ms each. Max one staggered list per screen.

Easing always `cubic-bezier(.2,.8,.2,1)` (a firm decelerate). No spring physics on UI chrome. No parallax. No floating/bobbing. `prefers-reduced-motion` honored — swap for instant fade.

### Transparency & blur

- Only on sticky chrome (header, floating nav) and on modal scrims (`rgba(0,15,34,0.4)` + 4px blur).
- Never on cards, list rows, or primary surfaces.

### Protection gradients

When text overlays imagery, use a bottom-anchored **gradient protection**: `linear-gradient(to top, var(--primary) 0%, transparent 60%)`. Never use pill capsules behind text ("capsules" look SaaS-generic).

### Layout rules

- **Max content width** for reading views: `max-w-5xl` (1024px). Dossier body text: 65–75ch.
- **Asymmetry encouraged.** The comparison matrix's 1/4 + 3×1/4 grid, the dashboard's 8/12 + 4/12 split — both canonical.
- **No three-column box grid.** If a grid is required, bias uneven (8/4, 7/5) or use a bento-style staggered grid.
- **Fixed chrome:** side nav 256px (desktop) pinned left on navy; top header 64px pinned top on cream (glass). Bottom audit-log footer 32px pinned on navy with mono tracked microlabels.

### Cards — the house card

1. Background: `--surface-container-lowest` (`#ffffff`) on cream, OR `rgba(255,255,255,0.04)` on navy
2. Corner: `--radius-lg` (8px) — never pill, never sharp
3. Border: **none**. Use tonal layering instead.
4. Shadow: `--shadow-sm` at rest; `--shadow-md` on hover
5. Featured / Priority: **2px top border** in `--tertiary` — the only time we top-border
6. Hover: left-edge gold pinstripe animates in (0 → 2px width, 200ms)

### Use of color on imagery

Warm desaturated. All portraits grayscale at rest. All landscape / map imagery: filter `grayscale(1) contrast(1.15) brightness(0.95)`, with navy `rgba(0,15,34,0.2)` overlay. No oversaturated cool blues.

---

## Iconography

**Primary system: [Lucide](https://lucide.dev/)** (1.5px stroke, round joins, 24px default). Linked from CDN; all icons we use appear in `assets/icons/` as self-hosted SVG copies too.

Why Lucide: it matches the "1pt line-art" directive from DESIGN.md better than Material Symbols, pairs tonally with Newsreader serif, and is already imported in `studio/src/App.tsx`. **Material Symbols** (used in the stitch static exports) is **not adopted** — we standardize on Lucide everywhere.

### Rules

- **Stroke weight:** always 1.5px. Never filled except on the status dot primitive.
- **Color:** `--primary` (default), `--tertiary` for structural accents (calendar ticks, timeline nodes, pinstripe punctuation), `--secondary` only for alert / destructive icons.
- **Sizing:** 16px (inline), 20px (buttons), 24px (nav), 32px (empty states, hero). Never 18 or 22.
- **Pairing:** when paired with an UPPERCASE label, 1.25× the cap height; when inline with body, match body line-height.

### Canonical icons — the working set

| Concept | Lucide name |
|---|---|
| Nav — intelligence home | `shield` |
| Nav — candidates / delegates | `users` |
| Nav — dossiers / briefings | `file-text` |
| Nav — strategy / comparison | `git-compare` |
| Nav — archives | `archive` |
| Alert / flag | `alert-circle` |
| Status: vetted | `check-circle-2` |
| Status: pending | `clock` |
| Status: flagged | `alert-triangle` |
| Source link | `external-link` |
| Download | `download` |
| Share | `share-2` |
| Filter | `filter` |
| Search | `search` |
| Notification | `bell` |
| Menu | `menu` |
| Breadcrumb | `chevron-right` |
| Back | `arrow-left` |
| Trending | `trending-up` |
| Globe / geography | `globe` |
| Role / profession | `briefcase` |
| Secure / auth | `lock` |

### Emoji, unicode

**Zero emoji.** Unicode permitted as typography ornament: `•` (bullet), `—` (em dash), `§` (section), `↗` (external-link in metadata lines), `′` and `″` (feet/inches where needed, extremely rare).

### Logo / brand marks

- `assets/shield.svg` — Utah shield mark (stylized beehive in shield silhouette; gold on navy). The only "patriotic" iconography. Used as the square app mark and as an uppercase-typeset wordmark companion.
- `assets/wordmark.svg` — "THE SILENT BRIEFING" in Inter 700, 0.3em tracking, navy on cream.
- `assets/wordmark-gold.svg` — gold variant for use on navy.
- `assets/favicon.svg` — 32px square, shield mark on navy.

### Illustration / full-bleed

We do **not** use illustrations. If a full-bleed hero image is needed (comparison page, empty archive), use a **grayscale map of Salt Lake County** (`assets/slco-map.svg`) with navy overlay.

---

## SKILL.md

See `SKILL.md` for Agent-Skill-compatible manifest.
