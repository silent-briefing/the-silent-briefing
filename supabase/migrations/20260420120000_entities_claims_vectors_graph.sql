-- Phase 1.1: entity graph edges, claim vault, RAG chunks, intelligence run log.
-- rag_chunks.embedding is 1024-dim — must match the embedding API you wire in Phase 1.5.

CREATE TYPE public.edge_status AS ENUM ('proposed', 'accepted', 'rejected');

CREATE TABLE public.entity_edges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_entity_id uuid NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
  target_entity_id uuid NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
  relation text NOT NULL,
  confidence real,
  weight real,
  valid_from timestamptz,
  provenance jsonb NOT NULL DEFAULT '{}'::jsonb,
  status public.edge_status NOT NULL DEFAULT 'proposed',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT entity_edges_no_self CHECK (source_entity_id <> target_entity_id)
);

CREATE INDEX idx_entity_edges_source ON public.entity_edges(source_entity_id);
CREATE INDEX idx_entity_edges_target ON public.entity_edges(target_entity_id);
CREATE INDEX idx_entity_edges_relation ON public.entity_edges(relation);

CREATE TYPE public.pipeline_stage AS ENUM (
  'retrieval_sonar',
  'writer_sonar',
  'critique_sonar',
  'human_edit'
);

CREATE TABLE public.dossier_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid REFERENCES public.candidates(id) ON DELETE SET NULL,
  claim_text text NOT NULL,
  category text NOT NULL,
  sentiment text,
  source_url text,
  subject_entity_id uuid REFERENCES public.entities(id) ON DELETE SET NULL,
  object_entity_id uuid REFERENCES public.entities(id) ON DELETE SET NULL,
  pipeline_stage public.pipeline_stage NOT NULL DEFAULT 'retrieval_sonar',
  llm_provider text,
  model_id text,
  api_surface text,
  prompt_id text,
  prompt_version text,
  retrieved_at timestamptz,
  groundedness_score numeric(6,5),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_dossier_claims_candidate ON public.dossier_claims(candidate_id);
CREATE INDEX idx_dossier_claims_category ON public.dossier_claims(category);

CREATE TABLE public.rag_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content text NOT NULL,
  embedding vector(1024),
  embedding_model_id text,
  source_url text,
  source_type text NOT NULL DEFAULT 'page',
  chunk_index int NOT NULL DEFAULT 0,
  content_hash text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_rag_chunks_source_url ON public.rag_chunks(source_url);

CREATE TYPE public.intelligence_run_status AS ENUM (
  'queued',
  'running',
  'succeeded',
  'failed',
  'partial'
);

CREATE TABLE public.intelligence_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid REFERENCES public.candidates(id) ON DELETE SET NULL,
  model_id text,
  pipeline_stage text NOT NULL,
  status public.intelligence_run_status NOT NULL DEFAULT 'queued',
  error_message text,
  tokens_input int,
  tokens_output int,
  cost_usd numeric(12,6),
  raw_response jsonb,
  idempotency_key text UNIQUE,
  groundedness_score numeric(6,5),
  requires_human_review boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_intelligence_runs_candidate ON public.intelligence_runs(candidate_id);
CREATE INDEX idx_intelligence_runs_status ON public.intelligence_runs(status);

ALTER TABLE public.entity_edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dossier_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rag_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intelligence_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all_entity_edges" ON public.entity_edges
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_dossier_claims" ON public.dossier_claims
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_rag_chunks" ON public.rag_chunks
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_intelligence_runs" ON public.intelligence_runs
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE TRIGGER set_updated_at_entity_edges
  BEFORE UPDATE ON public.entity_edges
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at_dossier_claims
  BEFORE UPDATE ON public.dossier_claims
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at_rag_chunks
  BEFORE UPDATE ON public.rag_chunks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at_intelligence_runs
  BEFORE UPDATE ON public.intelligence_runs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

GRANT SELECT, INSERT, UPDATE, DELETE ON public.entity_edges TO directus_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dossier_claims TO directus_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rag_chunks TO directus_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.intelligence_runs TO directus_user;
