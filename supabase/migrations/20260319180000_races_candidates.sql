-- Baseline election core + minimal entity graph root (required for officials.entity_id in later migration).
-- RLS: service_role policies only for backend workers; anon has no direct table access here.

CREATE TYPE public.entity_type AS ENUM (
  'person',
  'bill',
  'issue',
  'organization',
  'race'
);

CREATE TABLE public.entities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type public.entity_type NOT NULL,
  canonical_name text NOT NULL,
  external_ids jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.races (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  office_label text NOT NULL,
  district text NOT NULL DEFAULT '',
  jurisdiction text NOT NULL DEFAULT '',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (office_label, district, jurisdiction)
);

CREATE TABLE public.candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  race_id uuid NOT NULL REFERENCES public.races (id) ON DELETE CASCADE,
  dedupe_key text NOT NULL,
  full_name text NOT NULL,
  party text,
  office_sought text,
  incumbency text,
  district text,
  provenance jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (dedupe_key)
);

CREATE INDEX idx_candidates_race_id ON public.candidates (race_id);

ALTER TABLE public.entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.races ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all_entities"
  ON public.entities
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "service_role_all_races"
  ON public.races
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "service_role_all_candidates"
  ON public.candidates
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
