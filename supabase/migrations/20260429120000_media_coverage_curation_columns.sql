-- Phase C.9: admin media curation — columns aligned with admin console + operator search.

ALTER TABLE public.media_coverage
  ADD COLUMN IF NOT EXISTS outlet text,
  ADD COLUMN IF NOT EXISTS published_at timestamptz,
  ADD COLUMN IF NOT EXISTS fetched_at timestamptz,
  ADD COLUMN IF NOT EXISTS summary text,
  ADD COLUMN IF NOT EXISTS created_by text,
  ADD COLUMN IF NOT EXISTS official_ids uuid[] NOT NULL DEFAULT '{}'::uuid[];

COMMENT ON COLUMN public.media_coverage.official_ids IS
  'Officials this story relates to (for admin filters and graph linking).';

CREATE UNIQUE INDEX IF NOT EXISTS idx_media_coverage_source_url_unique
  ON public.media_coverage (source_url)
  WHERE source_url IS NOT NULL AND btrim(source_url) <> '';
