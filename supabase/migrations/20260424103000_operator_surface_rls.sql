-- Phase B.1: tighten operator-facing RLS + stub content tables (opinions, bills, media_coverage).

-- Published dossier lines only (no raw retrieval/critique in operator UI).
ALTER TABLE public.dossier_claims
  ADD COLUMN IF NOT EXISTS published boolean NOT NULL DEFAULT false;

DROP POLICY IF EXISTS "authenticated_read_dossier_claims_for_active_officials" ON public.dossier_claims;

CREATE POLICY "authenticated_read_published_dossier_claims"
  ON public.dossier_claims
  FOR SELECT
  TO authenticated
  USING (
    published = true
    AND pipeline_stage IN (
      'writer_sonar'::public.pipeline_stage,
      'human_edit'::public.pipeline_stage
    )
    AND (
      official_id IS NULL
      OR EXISTS (
        SELECT 1
        FROM public.officials o
        WHERE o.id = dossier_claims.official_id
          AND o.deleted_at IS NULL
      )
    )
  );

COMMENT ON POLICY "authenticated_read_published_dossier_claims" ON public.dossier_claims IS
  'Operator console: only published writer/human-edit claims tied to non-deleted officials (or orphan candidate rows).';

-- List/filter officials by jurisdiction + office + current flag (operator hubs).
CREATE INDEX IF NOT EXISTS idx_officials_jurisdiction_office_current
  ON public.officials (jurisdiction_id, office_type, is_current)
  WHERE deleted_at IS NULL;

-- ---------------------------------------------------------------------------
-- Content tables (minimal v1; expand in later phases)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.opinions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  title text NOT NULL,
  court text,
  published boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.bills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_number text NOT NULL,
  title text NOT NULL,
  published boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.media_coverage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  headline text NOT NULL,
  source_url text,
  published boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.opinions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_coverage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all_opinions" ON public.opinions
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_bills" ON public.bills
  FOR ALL TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_media_coverage" ON public.media_coverage
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "authenticated_read_published_opinions" ON public.opinions
  FOR SELECT TO authenticated
  USING (published = true);

CREATE POLICY "authenticated_read_published_bills" ON public.bills
  FOR SELECT TO authenticated
  USING (published = true);

CREATE POLICY "authenticated_read_published_media_coverage" ON public.media_coverage
  FOR SELECT TO authenticated
  USING (published = true);

CREATE TRIGGER set_updated_at_opinions
  BEFORE UPDATE ON public.opinions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at_bills
  BEFORE UPDATE ON public.bills
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_updated_at_media_coverage
  BEFORE UPDATE ON public.media_coverage
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

GRANT SELECT ON public.opinions TO authenticated;
GRANT SELECT ON public.bills TO authenticated;
GRANT SELECT ON public.media_coverage TO authenticated;
GRANT ALL ON public.opinions TO service_role;
GRANT ALL ON public.bills TO service_role;
GRANT ALL ON public.media_coverage TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.opinions TO directus_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bills TO directus_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.media_coverage TO directus_user;
