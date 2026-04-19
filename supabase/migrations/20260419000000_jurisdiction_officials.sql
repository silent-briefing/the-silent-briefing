-- Enable pgvector if not already (from existing plan)
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm; -- for full-text similarity

-- Jurisdiction level
CREATE TYPE public.jurisdiction_level AS ENUM (
  'federal', 'state', 'county', 'city', 'district'
);

-- Office type
CREATE TYPE public.office_type AS ENUM (
  'senator', 'representative', 'governor', 'lt_governor', 'attorney_general',
  'mayor', 'city_council', 'county_commissioner', 'county_clerk', 'county_mayor',
  'state_supreme_justice', 'state_appellate_judge', 'state_district_judge',
  'federal_judge'
);

-- Jurisdictions (hierarchical)
CREATE TABLE public.jurisdictions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  level       public.jurisdiction_level NOT NULL,
  parent_id   uuid REFERENCES public.jurisdictions(id) ON DELETE SET NULL,
  state_code  text,          -- 'UT'
  fips_code   text,          -- federal FIPS for geo cross-ref
  slug        text UNIQUE NOT NULL,
  metadata    jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_jurisdictions_parent ON public.jurisdictions(parent_id);
CREATE INDEX idx_jurisdictions_level ON public.jurisdictions(level);
CREATE INDEX idx_jurisdictions_slug ON public.jurisdictions(slug);

-- Officials (canonical table for all elected people, judges, candidates)
CREATE TABLE public.officials (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id           uuid REFERENCES public.entities(id) ON DELETE SET NULL,
  full_name           text NOT NULL,
  slug                text UNIQUE NOT NULL,
  jurisdiction_id     uuid NOT NULL REFERENCES public.jurisdictions(id),
  office_type         public.office_type NOT NULL,
  party               text,           -- NULL for judges (non-partisan in Utah)
  subject_alignment   text CHECK (subject_alignment IN ('gop', 'opposition', 'neutral', 'nonpartisan')),
  term_start          date,
  term_end            date,
  retention_year      int,            -- for judges: year of next retention vote
  is_current          boolean NOT NULL DEFAULT true,
  photo_url           text,
  bio_summary         text,           -- short bio for cards/previews
  metadata            jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  deleted_at          timestamptz     -- soft delete
);

CREATE INDEX idx_officials_jurisdiction ON public.officials(jurisdiction_id);
CREATE INDEX idx_officials_office_type ON public.officials(office_type);
CREATE INDEX idx_officials_is_current ON public.officials(is_current) WHERE deleted_at IS NULL;
CREATE INDEX idx_officials_slug ON public.officials(slug);
CREATE INDEX idx_officials_entity ON public.officials(entity_id);
-- trigram for name search
CREATE INDEX idx_officials_name_trgm ON public.officials USING gin(full_name gin_trgm_ops);

-- Seed: Utah jurisdictions (canonical)
INSERT INTO public.jurisdictions (name, level, state_code, slug) VALUES
  ('United States', 'federal', 'US', 'us'),
  ('Utah', 'state', 'UT', 'ut'),
  ('Salt Lake County', 'county', 'UT', 'ut-slco'),
  ('Salt Lake City', 'city', 'UT', 'ut-slco-slc');

-- Set parent_id FK after insert
UPDATE public.jurisdictions SET parent_id = (SELECT id FROM public.jurisdictions WHERE slug = 'us')
  WHERE slug = 'ut';
UPDATE public.jurisdictions SET parent_id = (SELECT id FROM public.jurisdictions WHERE slug = 'ut')
  WHERE slug = 'ut-slco';
UPDATE public.jurisdictions SET parent_id = (SELECT id FROM public.jurisdictions WHERE slug = 'ut-slco')
  WHERE slug = 'ut-slco-slc';

-- RLS
ALTER TABLE public.jurisdictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.officials ENABLE ROW LEVEL SECURITY;

-- service_role sees all (bypasses RLS by default, but explicit for clarity)
CREATE POLICY "service_role_all_jurisdictions" ON public.jurisdictions
  TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all_officials" ON public.officials
  TO service_role USING (true) WITH CHECK (true);

-- anon: read published (non-deleted) only
CREATE POLICY "anon_read_jurisdictions" ON public.jurisdictions
  FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_officials" ON public.officials
  FOR SELECT TO anon USING (deleted_at IS NULL AND is_current = true);

-- Updated-at trigger (reuse or create a simple function)
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER set_updated_at_jurisdictions
  BEFORE UPDATE ON public.jurisdictions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_updated_at_officials
  BEFORE UPDATE ON public.officials
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
