-- Phase 1.2: dossier_claims + intelligence_runs link to officials; auto-create entity rows for new officials.

ALTER TABLE public.dossier_claims
  ADD COLUMN official_id uuid REFERENCES public.officials(id) ON DELETE SET NULL;
ALTER TABLE public.intelligence_runs
  ADD COLUMN official_id uuid REFERENCES public.officials(id) ON DELETE SET NULL;

CREATE INDEX idx_dossier_claims_official ON public.dossier_claims(official_id);
CREATE INDEX idx_intelligence_runs_official ON public.intelligence_runs(official_id);

CREATE OR REPLACE FUNCTION public.ensure_official_entity()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  new_entity_id uuid;
BEGIN
  IF NEW.entity_id IS NOT NULL THEN
    RETURN NEW;
  END IF;
  INSERT INTO public.entities (type, canonical_name, metadata)
  VALUES (
    'person'::public.entity_type,
    NEW.full_name,
    jsonb_build_object(
      'source', 'officials_auto_entity',
      'slug', NEW.slug,
      'office_type', NEW.office_type::text
    )
  )
  RETURNING id INTO new_entity_id;
  NEW.entity_id := new_entity_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS officials_ensure_entity ON public.officials;
CREATE TRIGGER officials_ensure_entity
  BEFORE INSERT ON public.officials
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_official_entity();
