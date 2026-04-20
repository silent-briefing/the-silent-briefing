-- Step 2 / Task S5: Indexes for common filters and FK lookups.

CREATE INDEX IF NOT EXISTS idx_entity_edges_status_accepted
  ON public.entity_edges (status)
  WHERE status = 'accepted'::public.edge_status;

CREATE INDEX IF NOT EXISTS idx_intelligence_runs_human_review
  ON public.intelligence_runs (requires_human_review)
  WHERE requires_human_review = true;

-- official_id FK indexes: already idx_dossier_claims_official / idx_intelligence_runs_official (20260420120100)
