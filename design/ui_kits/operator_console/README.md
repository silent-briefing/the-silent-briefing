# Operator Console — UI kit

High-fidelity recreation of the **delegate-facing Phase 2 UX** for the Silent Briefing. Three core screens:

- **Briefing** — morning summary with stats, priority dossiers, live extraction log
- **Dossier** — single candidate deep-dive with record-of-filing and claim verification
- **Comparison matrix** — tactical side-by-side on navy, for delegate war-rooming

Uses the tokens from `../../colors_and_type.css` and the shield asset from `../../assets/`. All copy is **Utah-shaped** — real districts (HD 32, SD 8, HD 45), real sources (`vote.utah.gov`, `slco.org/clerk`, `disclosures.utah.gov`), no spy-fi strings.

## Components

- `Sidebar`, `TopBar`, `Badge`, `Icon` — chrome + primitives
- `BriefingScreen`, `DossierScreen`, `ComparisonScreen` — canonical screens

## Run

Open `index.html` directly. React 18 + Babel standalone, no build step.
