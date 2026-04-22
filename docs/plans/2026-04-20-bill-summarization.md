# Bill Summarization Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task (or `subagent-driven-development` for same-session execution with per-task review). This plan slots alongside the GUI programme (Phases A/B/C/D) — see "Integration with other plans" below; do **not** modify the A/B/C/D plan files to absorb this work.

**Goal:** Turn any Utah bill (le.utah.gov HB/SB/SJR/HJR/appropriation) into a plain-language, version-aware, source-cited summary with TL;DR + key provisions + section breakdown + affected entities + fiscal impact + statute changes + political framing + red flags + FAQ — every claim linkable to the exact page/line of the original PDF, with adversarial critique and mandatory human review before publish.

**Architecture:** New structured-for-bills schema (`bills`, `bill_versions`, `bill_sections`, `bill_chunks`, `bill_claims`, `bill_summaries`, `bill_annotations`) parallel to the existing `rag_chunks` / `dossier_claims` stack. Structure-aware chunking splits on the bill's own section boundaries (falling back to page + heading detection on the PDF). A five-stage Sonar pipeline — **map → section → rollup → adversarial → synthesis** — with forced citation on every claim, chunk-FK integrity checks on insert, and a groundedness score at every stage. Scheduled scraper polls le.utah.gov during session; admin console gates every summary behind human review; operator UI ships a dedicated `/bills` hub with split-view (summary left, source PDF right), version diff, "Ask this bill" chat scoped to one version, operator annotations, and PDF export.

**Tech Stack:** Inherits the repo stack. Backend: `uv`, FastAPI, `pypdf` (already installed), `httpx` + `beautifulsoup4` + `lxml` for le.utah.gov HTML/PDF, Perplexity Sonar (`CORRELATION_MODEL` for map, `WRITER_MODEL` for section + rollup, `ADVERSARIAL_MODEL` for critique, all via existing `LLMService`), pgvector HNSW. Frontend (Phase 3 of this plan): existing console stack + `react-pdf` for PDF rendering + `react-diff-viewer-continued` for version diff.

**Read first (zero context):**
- `CLAUDE.md` — § AI & Intelligence Architecture, § Database, § Frontend
- `docs/plans/README.md`, `docs/plans/task_plan.md`, `docs/plans/findings.md`
- `docs/plans/00_task_plan.md` § Step 3 — retrieval/writer/adversarial pattern we're mirroring for bills
- `backend/briefing/services/intelligence/evidence_bundle.py`, `retrieval_stages.py`, `dossier_writer.py` — the pattern we clone
- `backend/briefing/services/extraction/opinions.py` — the PDF→chunks→embeddings path we parallel
- `backend/briefing/services/llm/adversarial_pipeline.py` — the adversarial critique pattern
- `supabase/migrations/20260420120000_entities_claims_vectors_graph.sql`, `20260420140000_rag_chunks_ann_match.sql` — schema precedent for HNSW ANN + match RPC

**Scope locks (from 2026-04-20 scoping):**
- Utah Legislature **only** for v1. No federal, no SLC/SLCO ordinances.
- **All versions tracked** (introduced, every substitute, enrolled, signed). Re-summarize each; UI shows diffs.
- **Human review required before publish** on every bill summary. No auto-publish, no GOP/opposition asymmetry on the review gate.
- Scheduled scrape is the primary ingest trigger. Admin manual upload is fallback (covered by existing Phase C.8 of the GUI plan — this plan extends it).
- Hybrid citation granularity: **atomic claims → chunk-level**, **summaries → section-level**.

---

## Integration with other plans

This plan runs as a **parallel programme** to the GUI programme (`task_plan.md` phases A–D). It does not edit any existing phase plan. Instead:

| This plan's phase | Depends on | Touches |
|---|---|---|
| **Phase 1 — Backend pipeline** (schema, ingest, chunk, embed, summarize, adversarial, synthesize) | Existing backend (LLM service, config, worker CLI) | `supabase/migrations/`, `backend/briefing/services/bills/`, `backend/briefing/worker/__main__.py`, `backend/briefing/api/routes/` |
| **Phase 2 — Admin workflow** | GUI Phase A exit gate (Clerk JWT + BFF + audit log) | Extends `/admin/bills` (mentioned in GUI Phase C.8 but no bill-specific detail there); does not edit the C.8 file itself |
| **Phase 3 — Operator surfaces** (`/bills` hub, detail split-view, version diff, Ask-this-bill, annotations, PDF export) | GUI Phase A exit gate + operator primitives from Phase B.2 | Adds routes under `console/src/app/(operator)/bills/*`; reuses primitives from Phase B.2; does not edit Phase B plan |

**Master tracker update:** add this programme as a row in `docs/plans/task_plan.md` § Phase Tracker (done at the end of Task 0).

---

## Phase 1 — Backend: Schema, Ingestion, Chunking, Summarization Pipeline

### Task 0: Wire this plan into the master tracker

**Files:**
- Modify: `docs/plans/README.md` — add row under "Active plans"
- Modify: `docs/plans/task_plan.md` — add programme row under "Phase Tracker"
- Modify: `docs/plans/progress.md` — append entry noting new programme

**Step 1:** `docs/plans/README.md` — under "Active plans — work from these" table, add:
```markdown
| `2026-04-20-bill-summarization.md` | active | **Bill programme** — three phases (backend pipeline, admin workflow, operator surfaces). Runs parallel to GUI Phases A–D. |
```

**Step 2:** `docs/plans/task_plan.md` — under "## Phase Tracker" add a second tracker section:
```markdown
## Bill Programme Tracker (parallel to GUI)

| Phase | Status | Depends on | Gate to next |
|---|---|---|---|
| **Bill P1 — Backend pipeline** | pending | nothing (standalone) | Ingestion + summarization + adversarial + synthesis produce a valid `bill_summaries` row for one real Utah bill end-to-end; pytest green |
| **Bill P2 — Admin workflow** | pending | Bill P1 + GUI Phase A | Admin can trigger ingest, review + publish a summary; audit-logged |
| **Bill P3 — Operator surfaces** | pending | Bill P2 + GUI Phase B.2 primitives | `/bills` hub + detail split-view + diff + Ask-this-bill + export all shipping; Playwright + axe green |
```

**Step 3:** Append a one-line entry to `docs/plans/progress.md` referencing the new plan file.

**Step 4:** Commit: `docs: add bill summarization programme to plan tracker`.

---

### Task 1: Bill schema migration

**Files:**
- Create: `supabase/migrations/<timestamp>_bills_versions_chunks_claims_summaries.sql`
- Test: `backend/tests/test_rls_bills.py`

**Step 1:** Write migration with these tables + enums + indexes. RLS enabled on every table; policies follow `(select auth.uid())` + `(select (auth.jwt() ->> 'role'))` pattern from the existing `operator_rls` tranche.

```sql
-- Enums
create type bill_chamber as enum ('house', 'senate');
create type bill_type as enum ('hb', 'sb', 'hjr', 'sjr', 'hcr', 'scr', 'hr', 'sr', 'appropriation');
create type bill_status as enum (
  'introduced', 'in_committee', 'passed_committee', 'floor_debate',
  'passed_chamber', 'crossed_over', 'signed', 'vetoed', 'enrolled', 'failed', 'withdrawn'
);
create type bill_version_label as enum (
  'introduced', 'first_substitute', 'second_substitute', 'third_substitute',
  'fourth_substitute', 'fifth_substitute', 'enrolled', 'signed'
);
create type bill_claim_category as enum (
  'provision', 'amendment', 'repeal', 'new_section', 'definition',
  'fiscal', 'appropriation', 'effective_date', 'reference'
);
create type bill_summary_status as enum ('draft', 'pending_review', 'published', 'rejected', 'superseded');

-- bills: canonical identity (one row per bill across all versions)
create table public.bills (
  id uuid primary key default gen_random_uuid(),
  source_id text not null,              -- 'HB123' normalized uppercase no spaces
  session_year int not null,            -- 2026
  chamber bill_chamber not null,
  bill_type bill_type not null,
  title text not null,
  short_title text,
  sponsor_official_id uuid references public.officials(id) on delete set null,
  status bill_status not null default 'introduced',
  subject_alignment text check (subject_alignment in ('gop','opposition','neutral','nonpartisan')),
  introduced_date date,
  last_action_date date,
  last_action_text text,
  canonical_url text not null,
  fiscal_note_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_id, session_year)
);
create index bills_session_status_idx on public.bills (session_year, status);
create index bills_sponsor_idx on public.bills (sponsor_official_id) where sponsor_official_id is not null;

-- bill_versions: one row per version of a bill
create table public.bill_versions (
  id uuid primary key default gen_random_uuid(),
  bill_id uuid not null references public.bills(id) on delete cascade,
  version_label bill_version_label not null,
  version_order int not null,           -- monotonic: 1 = introduced, ...
  source_url text not null,
  pdf_url text,
  html_url text,
  fetched_at timestamptz not null default now(),
  content_hash text not null,           -- sha256 of normalized text
  line_count int,
  page_count int,
  created_at timestamptz not null default now(),
  unique (bill_id, version_label)
);
create index bill_versions_bill_order_idx on public.bill_versions (bill_id, version_order);

-- bill_sections: parsed section headers (from bill XML/HTML; fallback heuristic from PDF)
create table public.bill_sections (
  id uuid primary key default gen_random_uuid(),
  bill_version_id uuid not null references public.bill_versions(id) on delete cascade,
  section_number text,                  -- '1', '2', '§1', '10A-1-103', etc.
  heading text,
  order_index int not null,
  start_page int,
  end_page int,
  start_line int,
  end_line int,
  created_at timestamptz not null default now(),
  unique (bill_version_id, order_index)
);
create index bill_sections_version_idx on public.bill_sections (bill_version_id, order_index);

-- bill_chunks: embedded chunks used for RAG; separate from rag_chunks by design
create table public.bill_chunks (
  id uuid primary key default gen_random_uuid(),
  bill_version_id uuid not null references public.bill_versions(id) on delete cascade,
  bill_section_id uuid references public.bill_sections(id) on delete set null,
  chunk_index int not null,
  content text not null,
  embedding vector(1024),
  embedding_model_id text,
  start_page int,
  end_page int,
  start_line int,
  end_line int,
  content_hash text not null,
  created_at timestamptz not null default now(),
  unique (bill_version_id, chunk_index)
);
create index bill_chunks_version_idx on public.bill_chunks (bill_version_id, chunk_index);
create index bill_chunks_section_idx on public.bill_chunks (bill_section_id) where bill_section_id is not null;
create index bill_chunks_ann_idx on public.bill_chunks using hnsw (embedding vector_cosine_ops);

-- bill_claims: atomic, chunk-cited
create table public.bill_claims (
  id uuid primary key default gen_random_uuid(),
  bill_version_id uuid not null references public.bill_versions(id) on delete cascade,
  bill_chunk_id uuid not null references public.bill_chunks(id) on delete cascade,
  bill_section_id uuid references public.bill_sections(id) on delete set null,
  category bill_claim_category not null,
  atomic_claim text not null,
  plain_language text,
  source_quote text,
  source_page int,
  source_line_start int,
  source_line_end int,
  pipeline_stage text not null,
  model_id text,
  confidence numeric(4,3) check (confidence between 0 and 1),
  groundedness_score numeric(4,3) check (groundedness_score between 0 and 1),
  metadata jsonb not null default '{}'::jsonb,
  intelligence_run_id uuid references public.intelligence_runs(id) on delete set null,
  created_at timestamptz not null default now()
);
create index bill_claims_version_idx on public.bill_claims (bill_version_id);
create index bill_claims_chunk_idx on public.bill_claims (bill_chunk_id);

-- bill_summaries: one authoritative row per (version, status) workflow
create table public.bill_summaries (
  id uuid primary key default gen_random_uuid(),
  bill_version_id uuid not null references public.bill_versions(id) on delete cascade,
  status bill_summary_status not null default 'draft',
  tldr text,
  key_provisions jsonb not null default '[]'::jsonb,             -- [{text, section_id, page}]
  section_summaries jsonb not null default '[]'::jsonb,           -- [{section_id, plain_language, page_range}]
  affected_entities jsonb not null default '[]'::jsonb,
  fiscal_impact jsonb,
  changes_to_existing_law jsonb not null default '[]'::jsonb,
  political_framing jsonb,
  red_flags jsonb not null default '[]'::jsonb,
  faq jsonb not null default '[]'::jsonb,
  groundedness_score numeric(4,3),
  requires_human_review boolean not null default true,
  reviewed_by text,
  reviewed_at timestamptz,
  published_at timestamptz,
  review_note text,
  model_ids jsonb not null default '{}'::jsonb,
  intelligence_run_id uuid references public.intelligence_runs(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index bill_summaries_published_unique
  on public.bill_summaries (bill_version_id) where status = 'published';
create index bill_summaries_status_idx on public.bill_summaries (status, updated_at desc);

-- bill_annotations: operator/admin private notes anchored to sections
create table public.bill_annotations (
  id uuid primary key default gen_random_uuid(),
  bill_section_id uuid not null references public.bill_sections(id) on delete cascade,
  user_id text not null,                -- Clerk user id
  org_id text not null,
  body text not null,
  visibility text not null check (visibility in ('private','org','admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index bill_annotations_section_idx on public.bill_annotations (bill_section_id);
create index bill_annotations_user_idx on public.bill_annotations (user_id);

-- RLS
alter table public.bills enable row level security;
alter table public.bill_versions enable row level security;
alter table public.bill_sections enable row level security;
alter table public.bill_chunks enable row level security;
alter table public.bill_claims enable row level security;
alter table public.bill_summaries enable row level security;
alter table public.bill_annotations enable row level security;

-- authenticated can read bills / versions / sections
create policy bills_auth_read on public.bills for select to authenticated using (true);
create policy bill_versions_auth_read on public.bill_versions for select to authenticated using (true);
create policy bill_sections_auth_read on public.bill_sections for select to authenticated using (true);

-- bill_chunks: NO authenticated read (service_role only via RPC)
-- bill_claims: authenticated read only when parent summary is published
create policy bill_claims_auth_read on public.bill_claims for select to authenticated
  using (exists (
    select 1 from public.bill_summaries s
    where s.bill_version_id = bill_claims.bill_version_id and s.status = 'published'
  ));

-- bill_summaries: authenticated read only published
create policy bill_summaries_auth_read on public.bill_summaries for select to authenticated
  using (status = 'published');

-- bill_annotations: owner or same org (for visibility='org')
create policy bill_annotations_auth_read on public.bill_annotations for select to authenticated
  using (
    user_id = ((select auth.jwt()) ->> 'sub')
    or (visibility = 'org' and org_id = ((select auth.jwt()) ->> 'org_id'))
  );
create policy bill_annotations_owner_write on public.bill_annotations for all to authenticated
  using (user_id = ((select auth.jwt()) ->> 'sub'))
  with check (user_id = ((select auth.jwt()) ->> 'sub'));

-- ANN RPC: service_role only, scoped to one bill_version_id
create or replace function public.match_bill_chunks(
  p_bill_version_id uuid,
  p_query_embedding vector(1024),
  p_match_count int default 8
) returns table (
  id uuid,
  content text,
  start_page int,
  end_page int,
  start_line int,
  end_line int,
  similarity float
) language sql stable security invoker as $$
  select bc.id, bc.content, bc.start_page, bc.end_page, bc.start_line, bc.end_line,
         1 - (bc.embedding <=> p_query_embedding) as similarity
  from public.bill_chunks bc
  where bc.bill_version_id = p_bill_version_id and bc.embedding is not null
  order by bc.embedding <=> p_query_embedding
  limit greatest(1, least(p_match_count, 50))
$$;
revoke all on function public.match_bill_chunks(uuid, vector, int) from public;
grant execute on function public.match_bill_chunks(uuid, vector, int) to service_role;

-- audit_log trigger hook for admin-originated changes can be added in Bill P2
```

**Step 2:** Apply: `.\scripts\dev-db-migrate.ps1` — expect success.

**Step 3:** Write `backend/tests/test_rls_bills.py` asserting the policy matrix (service_role full; authenticated read permitted on bills/versions/sections; denied on bill_chunks; bill_claims + bill_summaries gated by published summary; annotations owner/org scoped).

**Step 4:** `cd backend && uv run pytest tests/test_rls_bills.py -q` — expect pass.

**Step 5:** Commit: `feat(db): bills + versions + chunks + claims + summaries + annotations + match_bill_chunks`.

---

### Task 2: Config + LLM role wiring for bills

**Files:**
- Modify: `backend/briefing/config.py`

**Step 1:** Add settings (all optional with sensible defaults pointing at existing env keys):
```python
# Bill summarization
bill_chunk_target_tokens: int = 900          # ~3600 chars
bill_chunk_overlap_tokens: int = 120
bill_map_model: str = ""                     # falls back to correlation_model
bill_section_model: str = ""                 # falls back to writer_model
bill_rollup_model: str = ""                  # falls back to writer_model
bill_adversarial_model: str = ""             # falls back to adversarial_model
bill_min_groundedness: float = 0.75
le_utah_base_url: str = "https://le.utah.gov"
le_utah_session_url_template: str = "https://le.utah.gov/~{year}/bills/static/{bill_id}.html"
```

**Step 2:** Add helper `resolve_model(role: Literal["map","section","rollup","adversarial"]) -> str` that returns the bill-specific override if set, else the existing role default.

**Step 3:** Unit test `backend/tests/test_config_bills.py` — assert precedence.

**Step 4:** Commit: `feat(config): bill summarization model + chunking settings`.

---

### Task 3: le.utah.gov fetch + version discovery

**Files:**
- Create: `backend/briefing/services/bills/__init__.py`
- Create: `backend/briefing/services/bills/fetch.py`
- Test: `backend/tests/test_bills_fetch.py`
- Create: `backend/tests/fixtures/bills/hb0001_2026.html` (a minimal real-shape sample from le.utah.gov — record locally and trim; NO real secrets)

**`fetch.py` contract:**
```python
class BillVersionRef(BaseModel):
    version_label: BillVersionLabel
    version_order: int
    source_url: str
    pdf_url: str | None
    html_url: str | None

class BillIdentity(BaseModel):
    source_id: str             # 'HB0001' normalized
    session_year: int
    chamber: Chamber
    bill_type: BillType
    title: str
    short_title: str | None
    canonical_url: str
    sponsor_name: str | None    # for officials-lookup upstream
    status_text: str
    last_action_date: date | None
    last_action_text: str | None
    fiscal_note_url: str | None
    versions: list[BillVersionRef]

async def fetch_bill_identity(session_year: int, source_id: str, client: httpx.AsyncClient) -> BillIdentity: ...
```

**Step 1:** Write failing test that loads the local fixture and asserts `fetch_bill_identity` parses identity + at least 1 version.

**Step 2:** Implement with `httpx` + `BeautifulSoup`. Use `ResilientFetcher` pattern from `baseline.fetcher` for retries and artifacts.

**Step 3:** Run test: `cd backend && uv run pytest tests/test_bills_fetch.py -q`.

**Step 4:** Commit: `feat(bills): le.utah.gov identity + version discovery`.

---

### Task 4: PDF + HTML → section-aware text extraction

**Files:**
- Create: `backend/briefing/services/bills/extract_text.py`
- Test: `backend/tests/test_bills_extract_text.py`
- Fixture: `backend/tests/fixtures/bills/hb0001_2026_introduced.pdf` (small real bill; truncate to < 200KB if possible)

**Contract:**
```python
class ExtractedLine(BaseModel):
    page: int
    line: int                  # within-page line number
    text: str

class ExtractedSection(BaseModel):
    section_number: str | None
    heading: str | None
    order_index: int
    start_page: int
    end_page: int
    start_line: int
    end_line: int

class ExtractedText(BaseModel):
    lines: list[ExtractedLine]
    sections: list[ExtractedSection]
    page_count: int
    line_count: int
    content_hash: str

def extract_from_pdf(pdf_bytes: bytes) -> ExtractedText: ...
def extract_from_html(html: str) -> ExtractedText: ...
```

Section detection heuristic for PDF: Utah bills place section markers as lines matching `^\s*Section\s+\d+\.?` or `^\s*§\s*\d+` or all-caps short headings < 60 chars. Prefer HTML extraction when `html_url` is available (it's structurally reliable); fall back to PDF.

**Step 1:** Failing test — fixture PDF produces ≥ 1 section and > 10 lines; content_hash deterministic.

**Step 2:** Implement with `pypdf` for PDF (already in deps) and `lxml` for HTML.

**Step 3:** Run: `cd backend && uv run pytest tests/test_bills_extract_text.py -q`.

**Step 4:** Commit: `feat(bills): PDF + HTML text and section extraction`.

---

### Task 5: Structure-aware chunker

**Files:**
- Create: `backend/briefing/services/bills/chunker.py`
- Test: `backend/tests/test_bills_chunker.py`

**Contract:**
```python
class ChunkCandidate(BaseModel):
    content: str
    start_page: int
    end_page: int
    start_line: int
    end_line: int
    section_order_index: int | None
    chunk_index: int
    content_hash: str

def chunk_extracted(
    extracted: ExtractedText,
    target_tokens: int,
    overlap_tokens: int,
) -> list[ChunkCandidate]: ...
```

Rules:
1. Never split a section mid-sentence; prefer to end on `.\n` or `;\n`.
2. Never merge across section boundaries (one chunk = one section or less).
3. Long sections split into N chunks with `overlap_tokens` word overlap.
4. Each chunk carries its page/line anchors (smallest page and line of first line; largest of last line).
5. Token estimate: `tiktoken`-free approximation — 4 chars ≈ 1 token, document that choice in a docstring.

**Step 1:** Failing test: a 3-section fixture produces ≥ 3 chunks, none crossing section boundaries; large section produces overlapping chunks with non-empty overlap text.

**Step 2:** Implement.

**Step 3:** Run test.

**Step 4:** Commit: `feat(bills): structure-aware chunker preserving section boundaries`.

---

### Task 6: Ingest pipeline + worker subcommand

**Files:**
- Create: `backend/briefing/services/bills/ingest.py`
- Modify: `backend/briefing/worker/__main__.py` — add `bill-ingestion` subcommand
- Modify: `backend/briefing/services/schedule_catalog.py` — register
- Test: `backend/tests/test_bills_ingest.py` (mock LLM service, real chunker, fake supabase upsert)

**Pipeline:**
1. `fetch_bill_identity(session, source_id)` → `BillIdentity`
2. Upsert `bills` row (match on `(source_id, session_year)`).
3. Resolve `sponsor_official_id` from `officials.full_name` normalized match (best-effort; leave NULL on miss).
4. For each version in `identity.versions`:
   - Skip if `bill_versions.content_hash` already matches a stored hash for that version_label.
   - Fetch PDF or HTML body via `ResilientFetcher`.
   - `extract_from_pdf` / `extract_from_html` → `ExtractedText`.
   - Insert `bill_versions` row.
   - Insert `bill_sections` rows from `ExtractedText.sections`.
   - `chunk_extracted(...)` → chunk candidates.
   - Batch-embed via existing Perplexity embeddings client (`LLMService.embed`); reject the batch if any embedding length ≠ 1024.
   - Insert `bill_chunks` rows with FK to their section (if any).
5. Emit `intelligence_runs` row per version with `pipeline_stage='bill_ingest'`.

**CLI:**
```
uv run python -m briefing.worker bill-ingestion \
  --session 2026 \
  --bill-id HB0001 \
  [--version enrolled] \
  [--dry-run]
```

**Step 1:** Failing test — given a mocked fetch returning the fixture + mocked embed client returning fixed vectors, the ingest function calls the expected Supabase upsert sequence and returns a summary `{"versions": N, "chunks": M}`.

**Step 2:** Implement.

**Step 3:** Run test + manual dry-run against one real bill (user-executed; document command in `docs/plans/progress.md`).

**Step 4:** Commit: `feat(bills): ingest pipeline + bill-ingestion worker`.

---

### Task 7: Map stage — atomic-claim extraction per chunk

**Files:**
- Create: `backend/briefing/services/bills/summarize_schemas.py` (all Pydantic + JSON Schema contracts for the 5-stage pipeline)
- Create: `backend/briefing/services/bills/stage_map.py`
- Test: `backend/tests/test_bills_stage_map.py`

**Schema (enforced via Sonar `response_format=json_schema`):**
```python
class MappedClaim(BaseModel):
    category: BillClaimCategory
    atomic_claim: str                  # one factual assertion
    plain_language: str | None         # plain-English restatement (optional; LLM will usually fill)
    source_quote: str                  # verbatim span from chunk (required; no paraphrase)
    # Page + line anchors are assigned from chunk metadata, NOT from model output,
    # to prevent the model from hallucinating positions.
    confidence: float = Field(ge=0, le=1)

class MappedChunkOutput(BaseModel):
    claims: list[MappedClaim]
```

**Process:**
1. For each `bill_chunks` row of the version: call Sonar with `bill_map_model` (cheap tier) and this schema.
2. Insert each output claim as `bill_claims` row with `pipeline_stage='bill_map'`, `source_page`/`source_line_*` copied from the chunk (the model cannot lie about position).
3. Validate `source_quote` is a substring of `chunk.content` (case-insensitive, whitespace-normalized); reject the claim on mismatch and log in `intelligence_runs.metadata.rejected_claims`.
4. Compute per-chunk `groundedness_score = passing_claims / total_proposed`.

**Anti-hallucination mechanics (critical):**
- Insert transaction **rejects** the row if `source_quote` normalization doesn't substring-match the chunk.
- Insert transaction **rejects** if category not in enum (enforced by PG + Pydantic).
- Logged rejections feed the admin review UI (Phase 2 of this plan).

**Step 1:** Failing test — given a chunk + mocked LLM returning 3 claims (2 valid, 1 with fabricated quote), the function returns 2 accepted, 1 rejected; assertion on rejection reason.

**Step 2:** Implement.

**Step 3:** Run test.

**Step 4:** Commit: `feat(bills): map stage — per-chunk atomic claim extraction with citation integrity check`.

---

### Task 8: Section stage — plain-language section summaries

**Files:**
- Create: `backend/briefing/services/bills/stage_section.py`
- Test: `backend/tests/test_bills_stage_section.py`

**Process:**
1. For each `bill_sections` row of the version, gather all `bill_claims` (map-stage) whose `bill_section_id` matches.
2. Call Sonar (`bill_section_model`, writer tier) with strict instruction: "Produce a plain-language summary of this section using ONLY the provided claims. Every sentence you output must cite at least one claim_id in square brackets like [c_abc]. Do not introduce facts not present in the claims."
3. Enforce schema:
```python
class SectionSummaryOutput(BaseModel):
    section_order_index: int
    plain_language: str                 # plain English
    cited_claim_ids: list[str]          # every claim_id you used
```
4. Validate every `[c_xxx]` token in `plain_language` corresponds to a real claim id that was supplied; reject and retry once with "you cited a claim id that wasn't provided; only use these ids: [...]" feedback.
5. Store outputs in memory (written to `bill_summaries.section_summaries` jsonb in Task 10).

**Step 1:** Failing test — given two mapped claims and a mocked LLM that returns one valid cite and one fabricated cite on first call, then a valid result on retry; assert retry occurred and result returned.

**Step 2:** Implement.

**Step 3:** Run test.

**Step 4:** Commit: `feat(bills): section stage — cited plain-language summaries with retry-on-hallucinated-cite`.

---

### Task 9: Rollup stage — TL;DR + provisions + affected entities + fiscal + statute changes + FAQ

**Files:**
- Create: `backend/briefing/services/bills/stage_rollup.py`
- Test: `backend/tests/test_bills_stage_rollup.py`

**Schema:**
```python
class Provision(BaseModel):
    text: str
    section_order_index: int
    cited_claim_ids: list[str]

class AffectedEntity(BaseModel):
    name: str                        # 'Utah State Board of Education'
    kind: str                        # 'agency'|'program'|'demographic'|'industry'|'local_government'
    impact: str
    cited_claim_ids: list[str]

class FiscalImpact(BaseModel):
    summary: str
    annual_cost_usd: int | None
    one_time_cost_usd: int | None
    revenue_impact_usd: int | None
    cited_claim_ids: list[str]

class StatuteChange(BaseModel):
    kind: Literal["amends","repeals","creates"]
    citation: str                    # 'Utah Code § 10A-1-103'
    description: str
    cited_claim_ids: list[str]

class FaqItem(BaseModel):
    question: str
    answer: str
    cited_claim_ids: list[str]

class RollupOutput(BaseModel):
    tldr: str                        # single paragraph, <= 120 words
    key_provisions: list[Provision]
    affected_entities: list[AffectedEntity]
    fiscal_impact: FiscalImpact | None
    changes_to_existing_law: list[StatuteChange]
    faq: list[FaqItem]
```

**Process:**
1. Input = section summaries (Task 8 output) + full claims list with `id`, `category`, `atomic_claim`.
2. Prompt explicitly forbids new facts. Output must cite claim_ids on every element.
3. Cite-integrity validation (same retry-once pattern as Task 8).
4. Political framing field is **not** filled here — it's an adversarial concern and lives in Task 10.

**Step 1:** Failing test with fixture inputs → expected rollup shape; hallucinated cite triggers retry.

**Step 2:** Implement.

**Step 3:** Run test.

**Step 4:** Commit: `feat(bills): rollup stage — cited multi-section composition`.

---

### Task 10: Adversarial + synthesis + draft summary row

**Files:**
- Create: `backend/briefing/services/bills/stage_adversarial.py`
- Create: `backend/briefing/services/bills/stage_synthesis.py`
- Create: `backend/briefing/services/bills/pipeline.py` (orchestrator that runs all five stages and writes the `bill_summaries` row)
- Modify: `backend/briefing/worker/__main__.py` — add `bill-summarize` subcommand
- Modify: `backend/briefing/services/schedule_catalog.py`
- Test: `backend/tests/test_bills_adversarial.py`, `test_bills_synthesis.py`, `test_bills_pipeline_integration.py`

**Adversarial schema:**
```python
class AdversarialFlag(BaseModel):
    target: Literal["tldr","provision","affected_entity","fiscal","statute_change","faq"]
    target_ref: str                      # index or cited_claim_id of thing being challenged
    challenge: str                       # "This provision claims X but the cited section only supports Y"
    severity: Literal["low","medium","high"]
    cited_claim_ids: list[str]

class RedFlag(BaseModel):
    category: Literal["hidden_provision","unfunded_mandate","ambiguity","delegation","opposition_attack_vector","preemption"]
    description: str
    cited_claim_ids: list[str]

class PoliticalFraming(BaseModel):
    gop_talking_points: list[str]        # each must cite claim_ids inline like [c_x]
    opposition_talking_points: list[str]
    cited_claim_ids: list[str]

class AdversarialOutput(BaseModel):
    flags: list[AdversarialFlag]
    red_flags: list[RedFlag]
    political_framing: PoliticalFraming
```

**Adversarial prompt rules:**
- Reviews rollup + section summaries + full claims list.
- "Your job is to find where the rollup overreaches, omits key context, or misrepresents a section. Also identify red flags a reader should know. Also produce grounded GOP + opposition talking points. Every claim you make cites a claim_id from the provided list. No new sources."
- Same cite-integrity retry.

**Synthesis:** merges rollup + adversarial. Each `AdversarialFlag` of severity `high` either (a) **amends** the corresponding rollup element inline (synthesis call chooses) or (b) leaves a visible `requires_human_review=true` marker on that element.

**Final write:** `bill_summaries` row with `status='pending_review'` (never auto-published per user decision), `groundedness_score = mean(all stage groundedness)`, `model_ids = {map: ..., section: ..., rollup: ..., adversarial: ..., synthesis: ...}`, `intelligence_run_id` linked.

**CLI:**
```
uv run python -m briefing.worker bill-summarize \
  --bill-version-id <uuid> \
  [--force]                  # re-run even if a non-rejected summary exists
```

**Step 1:** Failing integration test — given a small fixture bill version with pre-inserted chunks + claims + sections, run `pipeline.summarize_bill_version(version_id, mock_llm)` end to end; assert `bill_summaries` row with all fields populated, `status='pending_review'`, groundedness > 0, model_ids all set.

**Step 2:** Implement each stage file + orchestrator.

**Step 3:** Run full pytest.

**Step 4:** Commit: `feat(bills): adversarial + synthesis stages + full pipeline orchestrator`.

---

### Task 11: Scheduled scraper during session

**Files:**
- Create: `backend/briefing/services/bills/scheduler.py`
- Modify: `backend/briefing/worker/__main__.py` — add `bill-scrape-daily` subcommand
- Modify: `backend/briefing/services/schedule_catalog.py`
- Create: `.github/workflows/bill-scrape.yml`
- Test: `backend/tests/test_bills_scheduler.py`

**Logic:**
1. Fetch le.utah.gov session index for the current session year.
2. For each listed bill, compare `last_action_date` + `content_hash` against stored `bills` + `bill_versions`.
3. Enqueue `bill-ingestion` per changed bill; then enqueue `bill-summarize` per newly created version.
4. Between Jan 15 and Mar 15 (Utah session window), schedule daily at 06:00 MT; off-season, weekly Sunday.

**Env:** `BILL_SCRAPE_ENABLED=true|false` (default true). Respect `RETRY_AFTER` on 429.

**Step 1:** Failing test — given a mocked index returning 3 bills (1 new, 1 changed, 1 unchanged), scheduler returns `{"enqueued_ingests": 2, "skipped": 1}`.

**Step 2:** Implement + GitHub workflow (match the existing `baseline-extraction-smoke.yml` shape; `workflow_dispatch` + cron; `uv sync` + run the subcommand).

**Step 3:** Run test; dry-run locally.

**Step 4:** Commit: `feat(bills): daily scraper during session + GH workflow`.

---

### Task 12: BFF endpoints for bills (operator reads + admin workflow)

**Files:**
- Create: `backend/briefing/api/routes/bills.py` (operator reads)
- Create: `backend/briefing/api/routes/admin/bills.py` (admin workflow — depends on Phase A BFF skeleton from GUI plan)
- Test: `backend/tests/test_api_bills.py`, `test_api_admin_bills.py`

**Operator reads (authenticated, uses `service_role` server-side):**
- `GET /v1/console/bills?session=2026&status=enrolled&sponsor=slug&q=text` — list (paginated).
- `GET /v1/console/bills/{bill_id}` — identity + all versions + currently published summary for latest version.
- `GET /v1/console/bills/versions/{version_id}/summary` — full published `bill_summary`.
- `GET /v1/console/bills/versions/{version_id}/pdf-proxy` — signed URL (10-min TTL) for the source PDF to avoid CORS and rate-limit the operator browser against le.utah.gov.
- `POST /v1/console/bills/versions/{version_id}/ask` — "Ask this bill": embed query via existing Perplexity embeddings, `match_bill_chunks` top-k, call `WRITER_MODEL` with strict grounding prompt; return `{answer, citations: [{chunk_id, page, line_start, line_end, quote}]}`.

**Admin workflow (admin role only, via Clerk JWT verifier from GUI Phase A.8):**
- `POST /v1/admin/bills/ingest` — `{session, source_id}` → triggers ingestion job (returns run_id).
- `POST /v1/admin/bills/summarize` — `{bill_version_id, force?}` → triggers pipeline.
- `GET /v1/admin/bills/summaries/pending` — review queue.
- `POST /v1/admin/bills/summaries/{id}/publish` — flips `status='published'`, `reviewed_by`, `reviewed_at`, `published_at`. Writes `admin_audit_log`.
- `POST /v1/admin/bills/summaries/{id}/reject` — `{note}`; `status='rejected'`.
- `PATCH /v1/admin/bills/summaries/{id}` — edit any field; writes audit log.

**Step 1:** Failing tests per route with `respx` + Supabase mock. Ask-this-bill test mocks embedding client + match RPC + LLM.

**Step 2:** Implement.

**Step 3:** Run tests.

**Step 4:** Commit: `feat(api): bills operator BFF + admin BFF with human-review workflow`.

---

### Bill P1 exit gate

1. `.\scripts\dev-db-migrate.ps1` applies the bills schema cleanly.
2. `cd backend && uv run pytest` — all new bill tests plus the existing suite are green.
3. Manual smoke against one real Utah bill (user-operated):
   ```powershell
   uv run python -m briefing.worker bill-ingestion --session 2026 --bill-id HB0001
   # returns summary with >=1 version ingested, N chunks, M sections
   uv run python -m briefing.worker bill-summarize --bill-version-id <uuid>
   # writes bill_summaries row, status='pending_review', groundedness > 0.7
   ```
4. Every atomic claim has a chunk FK; every chunk has a section FK (or explicit null for unsectionable preamble); every rollup item cites claim_ids that resolve.
5. `docs/plans/progress.md` + `docs/plans/task_plan.md` Bill Programme Tracker updated: Bill P1 → complete.

---

## Phase 2 — Admin workflow (depends on GUI Phase A)

### Task 13: Admin `/admin/bills` list + detail + review

**Files:**
- Create: `console/src/app/(admin)/admin/bills/page.tsx` — TanStack Table (session, status, sponsor, last action, summary review status)
- Create: `console/src/app/(admin)/admin/bills/[bill_id]/page.tsx` — version picker + summary review split-view
- Create: `console/src/components/admin/bills/SummaryReviewPanel.tsx` — side-by-side: synthesis output (left) vs adversarial flags (right); inline edit; approve/reject/edit per field
- Create: `console/src/components/admin/bills/BillIngestDialog.tsx` — trigger ingestion by session + source_id
- Create: `console/src/components/admin/bills/GroundednessMeter.tsx` — cream→gold→crimson bands

**Rules:**
- Approving publishes the entire `bill_summaries` row; approving overrides `requires_human_review=false`.
- Editing any field updates `bill_summaries`; each edit audit-logged with before/after.
- Rejecting asks for a `review_note` (required, min 10 chars).
- Admin can re-trigger `bill-summarize --force` on a rejected summary.

**Step 1:** Build components with re-themed shadcn primitives from GUI Phase A.7.

**Step 2:** Playwright: ingest → wait for pipeline → review → edit one provision → publish → verify operator route shows edited version.

**Step 3:** Commit: `feat(admin): bills review + publish workflow`.

---

### Task 14: Admin `/admin/bills/ingest` + scheduler controls

**Files:**
- Create: `console/src/app/(admin)/admin/bills/ingest/page.tsx` — manual ingest form + schedule status
- Extends: `console/src/components/admin/settings/*` (from GUI Phase C.11) — `BILL_SCRAPE_ENABLED` toggle and session window overrides

**Step 1:** UI to trigger `POST /v1/admin/bills/ingest` and show run progress via `/v1/admin/runs/{id}` (from GUI Phase C.4).

**Step 2:** Commit: `feat(admin): bills manual ingest + scheduler controls`.

---

### Bill P2 exit gate

1. Admin can ingest, review, edit, approve, and reject a summary end-to-end.
2. Every mutation has an `admin_audit_log` row with accurate before/after.
3. Operator routes (Phase 3 tasks below) see only `status='published'` summaries and the published claim set.
4. Playwright + axe green on every admin/bills route.

---

## Phase 3 — Operator surfaces (depends on GUI Phase B.2 primitives)

### Task 15: Operator `/bills` hub

**Files:**
- Create: `console/src/app/(operator)/bills/page.tsx` — filter/search/list (session, status, sponsor, subject_alignment, text query)
- Create: `console/src/components/operator/bills/BillCard.tsx` — house-card per design (source_id + title + sponsor + status + TL;DR teaser)
- Create: `console/src/lib/queries/bills.ts`

**Step 1:** Virtualized list; URL-synced filters.

**Step 2:** Row hover = left gold pinstripe (per design).

**Step 3:** Commit: `feat(console): bills hub`.

---

### Task 16: Operator `/bills/[bill_id]` detail split-view

**Files:**
- Create: `console/src/app/(operator)/bills/[bill_id]/page.tsx`
- Create: `console/src/components/operator/bills/BillHeader.tsx` — source_id + title + sponsor link + status chip + version picker
- Create: `console/src/components/operator/bills/SummaryPane.tsx` — TL;DR + tabs (Provisions, Affected, Fiscal, Statute Changes, Framing, Red Flags, FAQ)
- Create: `console/src/components/operator/bills/SourcePane.tsx` — embeds PDF via `react-pdf` pointing at the BFF PDF proxy; lazy-loaded (client dynamic import to keep main bundle lean)
- Create: `console/src/components/operator/bills/SourceLink.tsx` — small primitive rendered next to every cited claim → click scrolls `SourcePane` to `page`
- Create: `console/src/lib/queries/bill-summary.ts`

**Layout:** asymmetric 7/5 split per design rules (no three-col box grid). Summary left, PDF right; collapsible on narrow screens.

**Citation interaction:** every provision/affected-entity/fiscal/etc. carries the `cited_claim_ids`; on click, the primitive resolves claim → chunk → page and scrolls the PDF pane. Highlight annotation overlay (`react-pdf` supports text-selection overlays).

**Step 1:** Build, wire queries.

**Step 2:** Playwright: open HB0001 → click a provision → assert PDF pane scrolled to expected page.

**Step 3:** Commit: `feat(console): bill detail split-view with source-linking`.

---

### Task 17: Version diff viewer

**Files:**
- Create: `console/src/app/(operator)/bills/[bill_id]/diff/page.tsx`
- Create: `console/src/components/operator/bills/VersionDiff.tsx` (uses `react-diff-viewer-continued`; navy/cream/gold themed)

**Step 1:** Two dropdowns (left version, right version). Diff fetches text from `bill_versions` join `bill_sections` (ordered). Section headings are diff anchors.

**Step 2:** Design: insertions on gold-tinted surface, deletions on crimson-tinted surface (one of the rare signal uses of crimson per `design/README.md`).

**Step 3:** Commit: `feat(console): bill version diff viewer`.

---

### Task 18: Ask-this-bill

**Files:**
- Create: `console/src/components/operator/bills/AskBillPanel.tsx` — chat-style; scoped to one `bill_version_id`
- Wires to: `POST /v1/console/bills/versions/{version_id}/ask` (Task 12)

**Rules:**
- Answer must cite; UI renders each citation as `SourceLink` → scrolls `SourcePane`.
- No history persistence in v1 (per YAGNI); component state only.
- Rate-limit client-side at 10/min.

**Step 1:** Build.

**Step 2:** Playwright: ask "what does this bill change?" → assert answer + ≥ 1 citation rendered.

**Step 3:** Commit: `feat(console): ask-this-bill RAG chat`.

---

### Task 19: Operator/admin annotations on sections

**Files:**
- Create: `console/src/components/operator/bills/AnnotationPin.tsx` + `AnnotationDrawer.tsx`
- Create: `backend/briefing/api/routes/bills_annotations.py` — authenticated CRUD gated by RLS
- Test: `backend/tests/test_api_bills_annotations.py`

**Rules:**
- `visibility='private'` (default) | `'org'` (shared with org members) | `'admin'` (admins only).
- Pinned to a `bill_section_id`; rendered as inline gold icon in SummaryPane at that section heading.

**Step 1:** Build + test.

**Step 2:** Commit: `feat(console,api): bill annotations (private/org/admin)`.

---

### Task 20: PDF export of published summary

**Files:**
- Create: `console/src/app/(operator)/bills/[bill_id]/export/page.tsx` — print-optimized route (no chrome; Newsreader/Inter; tabular figures; all citations as footnotes with URL + page)
- Create: `console/src/styles/print.css`
- Create: `backend/briefing/api/routes/bills_export.py` — `GET /v1/console/bills/versions/{id}/export.pdf` uses `weasyprint` (server-rendered PDF from the print route) — add `uv add weasyprint` or use headless Chromium via Playwright if weasyprint deps are heavy on Windows (evaluate during task)

**Step 1:** Print route renders to paper ≤ 8 pages for a typical bill summary; A4 + Letter supported.

**Step 2:** Export endpoint; cached by `(version_id, published_at)`.

**Step 3:** Playwright: export button → downloads non-empty PDF whose text includes the TL;DR and at least one citation URL.

**Step 4:** Commit: `feat(console,api): published-summary PDF export`.

---

### Task 21: Sponsor dossier tab integration

**Files:**
- Modify: `console/src/components/operator/dossier/DossierTabs.tsx` (from GUI Phase B.6) — add "Bills" tab
- Create: `console/src/components/operator/dossier/tabs/Bills.tsx` — lists bills where `bills.sponsor_official_id = official.id`, sorted by session desc then last_action_date desc

**Step 1:** Reuses `BillCard` primitive from Task 15.

**Step 2:** Commit: `feat(console): bills tab on official dossier`.

---

### Task 22: Accessibility + performance + docs

**Files:**
- Modify: `gui-ci.yml` — add `/bills`, `/bills/<id>` (seeded), `/bills/<id>/diff`, `/bills/<id>/export` to axe + Lighthouse routes
- Modify: `docs/plans/progress.md`, `docs/plans/task_plan.md` — Bill P3 → complete
- Modify: `CLAUDE.md` § AI & Intelligence Architecture — add "Bill summarization pipeline" subsection pointing at this plan

**Step 1:** Axe-clean all routes; Lighthouse budgets met.

**Step 2:** Commit: `chore(bills): a11y + perf sweep + docs`.

---

### Bill P3 exit gate

1. Operator can: list bills, filter, open detail, click a provision to jump source, diff two versions, ask a question and click a citation to jump source, leave an annotation, export a summary as PDF, and see a sponsor's bills on that sponsor's dossier.
2. Viewers can do all of the above except write annotations (blocked by RLS).
3. Admin-edited summaries are reflected within one reload.
4. Playwright + axe + Lighthouse green across all new routes.
5. Master tracker + progress log updated.

---

## Anti-hallucination checklist (recap — enforce in code review)

1. **Chunk positions are authoritative.** Page + line ranges on `bill_claims` come from the chunk, never the model output.
2. **`source_quote` must substring-match the chunk** (normalized case + whitespace). Insert rejected on mismatch.
3. **Every composition stage output cites claim_ids.** Cite-integrity validator rejects unknown ids; one retry with explicit feedback; then surface to admin review.
4. **No new URLs after ingest.** All compose-stage prompts explicitly forbid external sources; the grounded RAG (`match_bill_chunks`) is scoped to the current version only.
5. **Adversarial pass sees only what the writer saw** (same claims + same sections). Adversarial cannot invent evidence.
6. **Every bill is gated by human review** (`status='pending_review'` written, never `'published'` by the pipeline).
7. **Groundedness score** computed at every stage; the final `bill_summaries.groundedness_score` is the minimum across stages; summaries below `bill_min_groundedness` are surfaced first in the admin queue.
8. **Audit log** on every admin mutation (create/edit/publish/reject/re-run).
9. **Raw LLM responses stored in `intelligence_runs.raw_response`** for forensic review.
10. **Fixtures with hallucinated cites** in tests for Tasks 7–10 prove the rejection paths work.

---

## Open follow-ups (record in `findings.md` as decided)

- **Fiscal-note extraction:** Utah fiscal notes are separate PDFs. v1 parses the URL and stores it on `bills.fiscal_note_url`; v2 ingests the fiscal note as an additional `bill_versions`-like entity (track in a future plan).
- **Bill-to-entity-edge wiring:** currently the `changes_to_existing_law` items reference statute citations as text. A future task wires them into `entity_edges` when we model statutes as entities.
- **Cross-bill correlation:** "other bills that amend the same section" — deferred to a future correlation-pass extension.
- **Full-text federal + local coverage:** explicitly out of scope for v1; revisit after Utah pipeline is stable.

---

**Plan complete and saved to** `docs/plans/2026-04-20-bill-summarization.md`.

**Two execution options:**

1. **Subagent-driven (this session)** — fresh subagent per task; review between; use `superpowers:subagent-driven-development`. Recommended for Bill P1 (backend) because task-to-task DB schema + anti-hallucination contracts benefit from tight review.
2. **Parallel session** — open a new Cursor session in a git worktree; use `superpowers:executing-plans` with checkpoints between phases. Recommended for Bill P2 + P3 once P1 lands.

**Which approach?**
