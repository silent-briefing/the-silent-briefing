# Findings.md - Silent Briefing Expansion Research

## Design System (@design/)
- **Product Vision**: "Silent Briefing" — Candidate (now Official/Judge) Intelligence Hub for Utah GOP campaigns, SLCO, State, Federal. Evidence-first, dossiers, claims, vetting. Phase 1 backend (existing plan), Phase 2+ dashboard/dossier/comparison UX.
- **Visuals**: Deep navy (`#000f22`), cream paper (`#fbf9f5`), crimson signal (`#b6191a` surgical), gold accents/pinstripes (`#d4af37`). Newsreader serif for headlines (editorial authority), Inter sans for UI. Tonal layering instead of borders ("No-Line Rule"). Lucide icons (1.5px stroke). Grayscale portraits that colorize on hover. Utah shield mark, SLCO map. No emojis. Authoritative, editorial copy voice — "dossier", "claim", "vetting", Utah-specific fixtures. Max content width 5xl for reading. OperatorConsole.jsx in ui_kits for Phase 2 reference.
- **Copy Rules**: Sentence case headlines, UPPERCASE tracked labels, specific vocabulary, no hype. Empty states like "No filings on record for this cycle."
- **Implications**: Any CMS/admin or frontend must be heavily customized or built to match this premium, print-like, intelligence-briefing aesthetic. Avoid shadcn/default SaaS looks. Extend the operator_console kit.

## Judicial Watch & Dossiers
- **Utah Supreme Court**: 7 justices. Mostly appointed by GOP gov, Senate confirmed, then retention elections (yes/no) every 10 years after initial 3yr. 2026 retention for Diana Hagen and Jill Pohlman.
- **Sources**:
  - Official: utcourts.gov/courts/sup/ — opinions (since 1996), oral arguments, dockets, justice biographies.
  - Ballotpedia: detailed election history, retention votes, bios.
  - vote.utah.gov for retention candidate filings (aligns with existing extraction).
  - Disclosures.utah.gov, legislative sites for related bills.
- **Dossier Requirements**: Always build/maintain dossiers for current elected/judges (even non-Republicans in non-election years). In election/retention years, include candidate challengers/info. Include analysis (LLM-powered from opinions, voting, bills, news). Cross-reference to bills sponsored/voted, related entities, media.
- **Expansion Scope**: Initial focus Federal (UT delegation?), State (Supreme Court, legislature, exec), Salt Lake City, Salt Lake County. Later: cities within SL County. All cross-referenced via entities graph (existing in plan).

## CMS & Data Management Needs
- **Requirements**: Easy manual updates to dossiers/claims without direct DB edits. Create new "pages" for candidates/officials/judges (or replace). Complete CMS for intelligence content. Support rich text for analysis, linked claims, provenance, media embeds (future Twitter feeds). Admin for non-devs (campaign staff). Versioning/audit for claims. Integrate with existing Supabase schema (races, candidates, entities, dossier_claims, rag_chunks).
- **"Palantir for Utah"**: Knowledge graph (existing entities + edges), semantic search (pgvector RAG), linked data (judge -> opinions -> bills -> issues -> coverage), dashboards, search across officials, dossiers as living documents. Twitter/X feed for latest posts/bills about subject (future phase - note X API v2 requires paid access, approval for elevated; alternatives like news APIs, Scraping).

## CMS Research & Recommendation (Updated 2026-04-19)
**Final Recommendation: Directus (primary choice).**

- **Directus + Supabase**: Official partner integration. Directus layers directly on your existing Supabase Postgres (no new DB, uses your schema/migrations/RLS out of the box). Provides instant no-code Studio (admin UI), dynamic REST + GraphQL APIs, hooks/flows/automations (perfect for "edit dossier → trigger correlation/LLM refresh/Palantir edge proposal"), fine-grained permissions that complement RLS, real-time, custom dashboards. Self-hosted via Docker (easy to add to your local Supabase compose). Define relationships via FKs in Supabase; Directus introspects them automatically. For "create/replace page": Collections for `officials` (judges/candidates with slug, status, rich JSONB or relational dossier blocks), `dossiers`, `claims`. Custom interfaces/panels can be built with your design system (CSS vars, React/Vue extensions for branded editorial look—tonal layering, gold pinstripes, Newsreader headlines, Lucide). Excellent for Palantir: relational exploration, custom flows for intelligent correlation, GraphQL perfect for frontend graph queries. Theming: CSS overrides + custom app layout to match `@design/` exactly (avoid default look).

- **Payload CMS alternative**: If you want more code-first modeling (define rich collections in TS with custom fields for dossier blocks, versioned content), excellent for branded admin (override React components to use your design system fully). Strong for complex "pages". Use if Directus theming feels limiting.

- **Others**: Supamode great lightweight admin overlay; avoid full custom or NextBlock for this complexity.

**Why Directus wins here**: Leverages your existing schema (races, candidates → officials, entities, dossier_claims, rag_chunks) without duplication. Instant admin for non-devs to manage dossiers/pages/claims. Flows for Palantir automation (LLM correlation on save). Self-hosted, customizable to your premium editorial design (no SaaS slop). "Pages" = Directus items with slug/publish status rendered dynamically in Next.js console (`/judicial/[slug]` or `/dossier/[slug]`). Accelerates without reinventing wheel while allowing full customization.

**Palantir-specific**: Use Directus flows + your backend services for automated edge creation/correlation. Custom dashboard views for "connected intelligence" reports.

(Updated from previous research with integration details: configure DB creds, storage driver, JWT; prioritize FK relationships; custom panels for dossier editor with provenance viewer.)

## Perplexity & AI Orchestration
- **Primary (v1)**: Perplexity **Sonar only** — one Chat Completions surface, multiple [Sonar model IDs](https://docs.perplexity.ai/docs/sonar/models) for cost/latency (e.g. `sonar` for volume, `sonar-pro` for drafting, `sonar-reasoning-pro` for critique / hard reasoning). **`RESEARCH_MODEL`** (default **`sonar-deep-research`**) is reserved for **research** and heavy evidence-gathering jobs, not routine correlation or drafting. Structured outputs / tools per current Sonar docs.
- **Abstraction**: `LLMService` with a **role → model_id** map (`CORRELATION_MODEL`, `WRITER_MODEL`, `ADVERSARIAL_MODEL`, `RESEARCH_MODEL`) and Sonar-only fallback chains. A non-Perplexity adapter is a deliberate future change, not a parallel multi-vendor default.
- **Adversarial for Reports**: Primary draft (**writer** tier) → critique (**stronger Sonar tier** + prompt: flaws vs Stage 1 evidence, missing cross-refs, unsupported claims) → synthesis. Same API family; separation is **model + prompt**, not vendor A vs vendor B. Research note: adversarial *steps* can still bias or miss errors; mitigate with strict grounding to Stage 1, citation checks, and human review in Directus/Console. Use the **cheapest** Sonar tier for bulk correlation/edge proposal.
- **X Integration**: Perplexity for related news/search + direct X API v2 (paid, elevated access) for latest posts about justice/candidate. Store as claims or in feed tab. Legal/ToS caution for scraping.

## Palantir Engineering Notes
- **Graph/Cross-References**: Everything linkable (judge ↔ opinion ↔ bill ↔ issue ↔ media/coverage ↔ candidate). Extend `entities` (`type: 'judge' | 'opinion' | 'bill' | ...`), `entity_edges` (relation types with confidence, provenance from LLM). 
- **Correlation Engine**: New service using cheap Perplexity Sonar/Reasoning calls on new content to propose edges ("analyze this opinion vs existing bills/entities; output structured relations with justification"). Batch, confidence threshold, human approval in CMS. Vector similarity (pgvector) + LLM for smart matching.
- **Intelligent Reporting**: Console "Briefings" that traverse graph (SQL/GraphQL), RAG relevant chunks, synthesize connected insights ("Justice Hagen's opinions strongly correlate to 4 SL County education bills—see 12 claims, 3 media mentions"). Adversarial-vetted. Main Supreme Court page: Justices grid with key metrics, top correlations, recent news/feed teaser. Deep views with interactive graph (nodes by type, gold for strong links).
- **Visualization**: React graph component in console (styled to design: navy/cream, gold edges, Lucide icons). Search surfaces connected entities intelligently.

**Updated Research**: Directus confirmed strong self-hosted partner for your stack (Docker, flows for automation). Perplexity Sonar Reasoning Pro ideal for correlation/critique. Adversarial patterns require grounding mitigations + human gate. All self-hosted where possible (Directus + Supabase local + Next + FastAPI).

**Key Discoveries (Updated)**:
- Directus enables rapid Palantir-like relational admin on your existing schema.
- Sonar Reasoning Pro + cheap correlation calls enable scalable "everything referenced" without high costs.
- Adversarial critique must be prompt-engineered for grounding or risks reducing accuracy.
- Supreme Court main page + deep linked dossiers with graph/feed is the canonical "Palantir" UX starting point.
- Clerk + Directus + your design system = production-ready operator console quickly.

## Other Insights
- **Twitter/X Feed**: X API expensive/restricted in 2026. Consider alternatives: official RSS if any, news APIs (Perplexity already used), or scheduled scrapes (with legal caution). Embed in dossier pages.
- **Cross-referencing**: Leverage existing entity_edges, rag_chunks, graph queries in Supabase. Add judicial-specific tables or extend entities (type: 'judge').
- **Frontend**: Build on existing design/ui_kits/operator_console. Add Judicial Watch section, Dossier viewer/editor, CMS admin routes protected by Clerk/Supabase auth. Use design system CSS everywhere.
- **Scope Phasing**: Keep backend Phase 1 (expand extraction/LLM for judges/opinions), then CMS/Admin UI, then full operator dashboard with feeds, graphs.

## Key Discoveries
- Retention elections mean focus on incumbents + occasional challengers.
- Official court site rich with opinions — prime for Sonar/LLM analysis in pipeline.
- Design is very specific — CMS UI must be custom-themed or use design system in a custom Next.js/React admin.
- Directus/Payload/Supamode reduce reinvention for data management.

**Updated:** 2026-04-19. Will expand with more targeted research (e.g. Directus + Supabase integration, Payload theming examples).

Next actions logged in progress.md and task_plan.md.
