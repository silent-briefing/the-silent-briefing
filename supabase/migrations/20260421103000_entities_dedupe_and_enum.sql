-- Step 2 / Task S1: faster entity lookup by normalized name; no unique constraint yet
-- (duplicates may exist; correlation + officials trigger can create overlapping rows).

CREATE INDEX IF NOT EXISTS idx_entities_type_canonical_norm
  ON public.entities (type, lower(trim(canonical_name)));

COMMENT ON INDEX idx_entities_type_canonical_norm IS
  'Dedupe-adjacent lookup for correlation and graph joins; not unique until data is cleaned.';
