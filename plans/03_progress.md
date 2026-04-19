# Progress.md - Silent Briefing Plan Fleshing & Expansion

## Session Log

**2026-04-19 - Initial Planning Session**
- Read existing @plans/00_task_plan.md (backend Phase 1 focused on candidates, ETL, LLM dossiers, Supabase graph/vectors).
- Read planning-with-files and writing-plans skills.
- Read design/README.md — confirmed premium editorial design system (navy/cream/gold, Newsreader+Inter, no borders, specific voice, OperatorConsole UI kit).
- Web searched CMS options for Supabase + custom React admin: Supamode, Supabase CMS, NextBlock, recalled Directus/Payload as strong fits.
- Web searched Utah Supreme Court data: utcourts.gov for opinions/bios/dockets, Ballotpedia for elections/retention, focus on retention votes.
- Created findings.md with research synthesis (design implications, judicial sources, CMS recs, Palantir vision).
- Created this progress.md.
- **Current Phase**: Requirements & Discovery + Planning (fleshing out expanded task_plan).
- Updated findings with key discoveries on retention elections, official sources rich for LLM analysis, need for heavy UI customization to match design.

**Decisions so far (Updated with User Feedback)**:
- **CMS: Directus chosen** (self-hosted on your Supabase Postgres; introspects existing schema, instant admin + GraphQL/flows for "create/replace page", custom theming to `@design/`, automations for Palantir correlation on edits). Payload as strong alternative for more TS modeling. No full custom CMS.
- **Frontend**: Start fresh Next.js 15 app (app router). Use `design/` (CSS vars, assets, typography rules, OperatorConsole as style reference only—not direct copy). Build Judicial main page (justices grid with info/news teasers) + dynamic dossier pages with tabs (Analysis, Claims, Interactive Graph for cross-refs, X/Perplexity Feed). Strict `@design/` adherence (tonal layering, editorial copy, gold accents, Lucide, no defaults).
- **Auth**: Clerk (easier; use Clerk MCP/skills for setup, orgs for GOP teams if needed).
- **Focus**: Supreme Court first (main justices page + deep dossiers). Expand to full Federal/State/SLC/SLCO. **Always Palantir**: Heavy cross-referencing via graph (judge ↔ opinion ↔ bill ↔ issue ↔ coverage). Intelligent reporting via CorrelationEngine (cheap Perplexity calls for edge proposal) + graph traversal + RAG + adversarial-vetted synthesis. Interactive graph viz in console.
- **AI Provider**: Perplexity for *everything* (Sonar/Reasoning Pro for retrieval, correlation, grounding; Agent for drafting/analysis). Abstract `LLMService` for easy swap later. For final reports: Primary draft (Perplexity) → Adversarial critique (different pedigree/model e.g. Reasoning Pro with critique prompt or fallback Grok/Claude) → Synthesis. Sequential "debate" with grounding mitigations + human review in Directus/Console. Cheaper models for high-volume correlation to keep costs down. Research notes adversarial persuasion risks—counter with strict provenance/citation rules.
- **Feeds**: Both X API (for posts) + Perplexity (news/search related to subject). Store as claims or dedicated feed.
- **Self-hosted**: Directus + Supabase local (CLI/Docker), Next dev, FastAPI workers. Perplexity/Clerk/X hosted as needed.
- **"Pages"**: Dynamic routes in Next.js console (`/judicial/[slug]` or `/dossier/[slug]`), managed as items in Directus collections (slug, rich fields, publish status). CMS provides easy edit/create/replace that triggers backend refresh.
- **Phases**: Refined master plan now in 00_task_plan.md with new sections for Correlation/Palantir Engine, Directus CMS setup, Next.js Operator Console, Adversarial AI Pipeline. Original backend steps treated as foundational (complete or in-progress).
- **Graph/Correlation**: New service for LLM-driven edge extraction (cheap models), confidence scoring, manual approval. Enables "intelligent reporting" that surfaces connected insights across all referenced data.

**Current Phase**: Plan Refinement Complete → Ready for Implementation (Phase 1 extensions + CMS + Frontend).

**Next Steps**:
- Implement per refined plan in 00_task_plan.md (use subagent-driven-development or executing-plans skill).
- Setup: Clerk, Directus (Docker with Supabase), Next.js project with design system.
- Verify: Golden set of Supreme Court justices, test correlation on sample opinions, design fidelity in console.
- Log all in these files; re-read before major decisions.

**Test Results / Verification**: Plan now incorporates all feedback, research on Directus/Perplexity/adversarial, Palantir patterns. Ready for execution with evidence-based checks (e.g. after CMS setup, test create/replace flow; after frontend, screenshot vs design rules).

**Errors Encountered**: None. (User moved files to plans/ as preferred—updated there per instructions.)

**Test Results / Verification**: N/A (planning phase). Will verify plan completeness against requirements before claiming done.

**Errors Encountered**: None yet.
